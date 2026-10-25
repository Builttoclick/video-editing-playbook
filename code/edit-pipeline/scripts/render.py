"""Render an EDL (edit decision list) to a finished vertical video, and write the render report.

usage: python render.py <edl.json> [--preview] [--keep]

Pipeline (the order is load-bearing, see SKILL.md hard rules):
  1. resolve   word indices -> source times, refined on the waveform (never trust typed timecodes)
  2. tighten   internal pauses longer than `tighten.gap` are cut down to `tighten.keep`
  3. zoom plan snap zooms at every cut and at sentence starts, push-ins on chosen words, origin = the face
  4. extract   one exact-frame-count clip per piece (zoom, source-synced overlays, 30 ms audio fades)
  5. concat    lossless (-c copy)
  6. captions  ASS in OUTPUT time, burned LAST (after every overlay)
  7. sound     voice chain + SFX cues + ducked music -> two-pass loudnorm (-14 LUFS, -1.5 dBTP)
  8. encode    H.264 High, 1080x1920 (+ optional 4:5 crop), faststart; report json next to the output
"""
import argparse, json, math, re, shutil, subprocess, sys
from pathlib import Path
import numpy as np
from common import FONTS_DIR, SFX_DIR, probe, pcm, envelope_db, load_transcript, words_of, run, voice_ref_db

W, H = 1080, 1920
DEFAULTS = {
    'fps': 30, 'pad_in': 0.06, 'pad_out': 0.09,
    'tighten': {'gap': 0.45, 'keep': 0.16},
    'zoom': {'snap': [1.0, 1.1], 'punch': 1.12, 'inner_every': [2.4, 4.2], 'origin': 'face'},
    'captions': {'style': 'word', 'font': 'Poppins', 'size': 211, 'spacing': -6, 'y': 1515,
                 'color': '&H00FFFFFF', 'accent': '&H003CA6F5', 'keywords': [], 'pop': True},
    'loudness': {'I': -14.0, 'TP': -1.5, 'LRA': 11.0},
    'voice_fx': True,
    'hdr': 'mobius',
    'outputs': ['9x16'],
}


def deep(d, base):
    out = json.loads(json.dumps(base))
    for k, v in (d or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k].update(v)
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------- 1. resolve on the waveform
class Source:
    def __init__(self, key, path, edit_dir):
        self.key, self.path = key, Path(path)
        self.info = probe(self.path)
        tr = load_transcript(edit_dir, self.path.stem)
        self.words = words_of(tr)
        self._env = None
        self.face = None

    def env(self):
        if self._env is None:
            x = pcm(self.path)           # whole file, 16 kHz mono, container time
            self._env = envelope_db(x)   # 1 value per ms
        return self._env

    def _region(self, t, look, thr_db_over_floor, near):
        """The contiguous above-threshold region of the envelope that touches the window `near` around t.
        Returns (start_s, end_s) or None. Gaps under 25 ms are bridged (plosives, short stops)."""
        e = self.env()
        lo, hi = int(max(0.0, t - look) * 1000), int(min(len(e) / 1000, t + look) * 1000)
        w = e[lo:hi]
        if len(w) < 50:
            return None
        floor = float(np.percentile(w, 15))
        thr = min(floor + thr_db_over_floor, float(w.max()) - 16)
        act = w >= thr
        # close gaps < 25 ms
        idx = np.nonzero(act)[0]
        if not len(idx):
            return None
        for g0, g1 in zip(idx[:-1], idx[1:]):
            if 1 < g1 - g0 <= 25:
                act[g0:g1] = True
        a0, a1 = int((t + near[0]) * 1000) - lo, int((t + near[1]) * 1000) - lo
        a0, a1 = max(0, a0), min(len(act), a1)
        hits = np.nonzero(act[a0:a1])[0]
        if not len(hits):
            return None
        k = a0 + hits[0]
        s = k
        while s > 0 and act[s - 1]:
            s -= 1
        en = k
        while en < len(act) - 1 and act[en + 1]:
            en += 1
        return (lo + s) / 1000, (lo + en) / 1000

    def refine_in(self, t, lo):
        """Exact speech onset for a word that starts near t: start of the sound region touching t
        (never earlier than t - 0.30 or than `lo`, the previous word's end)."""
        r = self._region(t, 1.5, 12, (-0.03, 0.12))
        on = r[0] if r else t
        return max(on, t - 0.30, lo)

    def refine_out(self, t, hi):
        """Exact speech offset for a word that ends near t: end of the sound region touching t
        (never later than t + 0.25 or than `hi`, the next word's start). Breaths after a gap stay out."""
        r = self._region(t, 1.5, 10, (-0.12, 0.03))
        off = r[1] if r else t
        return min(off, t + 0.25, hi)


def face_center(src):
    """Face centre as fractions of the displayed frame (zoom origin). Falls back to (0.5, 0.42), the usual
    selfie framing. OpenCV 5 dropped the Haar cascades from the main module: set `origin` in the EDL instead."""
    try:
        import cv2
        if not hasattr(cv2, 'CascadeClassifier'):
            return 0.5, 0.42
        tmp = Path(src.path).with_suffix('.face.png')
        mid = src.info['duration'] / 2
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{mid:.2f}', '-i', str(src.path), '-frames:v', '1',
             '-vf', 'scale=540:-2', str(tmp)])
        img = cv2.imread(str(tmp)); tmp.unlink(missing_ok=True)
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cc = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = cc.detectMultiScale(g, 1.1, 5, minSize=(60, 60))
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            return round((x + w / 2) / g.shape[1], 3), round((y + h * 0.45) / g.shape[0], 3)
    except Exception as ex:
        print('  face detection skipped:', ex)
    return 0.5, 0.42


def resolve(edl, sources, cfg):
    """EDL segments -> pieces [{src, a, b, words:[...], beat, seg}] in source time, tightened."""
    fps = cfg['fps']
    pieces = []
    for si, seg in enumerate(edl['segments']):
        src = sources[seg['src']]
        ws = src.words
        if 'words' in seg:
            i, j = seg['words']
            kept = ws[i:j + 1]
        else:
            kept = [w for w in ws if w['e'] > seg['start'] and w['s'] < seg['end']]
        if not kept:
            raise SystemExit(f'segment {si}: no words in range')
        pin, pout = seg.get('pad_in', cfg['pad_in']), seg.get('pad_out', cfg['pad_out'])
        tig = seg.get('tighten', cfg['tighten'])
        # split at long internal pauses
        groups, cur = [], [kept[0]]
        for w in kept[1:]:
            if tig and w['s'] - cur[-1]['e'] > tig['gap']:
                groups.append(cur); cur = []
            cur.append(w)
        groups.append(cur)
        for gi, g in enumerate(groups):
            first, last = g[0], g[-1]
            prev_end = ws[first['i'] - 1]['e'] if first['i'] > 0 else 0.0
            next_start = ws[last['i'] + 1]['s'] if last['i'] + 1 < len(ws) else src.info['duration']
            on = src.refine_in(first['s'], prev_end + 0.02) if 'start' not in seg or gi else seg['start']
            off = src.refine_out(last['e'], next_start - 0.02) if 'end' not in seg or gi < len(groups) - 1 else seg['end']
            # inside a tightened segment the kept pause is shared: keep/2 on each side of the cut
            p_in = pin if gi == 0 else (tig['keep'] / 2 if tig else pin)
            p_out = pout if gi == len(groups) - 1 else (tig['keep'] / 2 if tig else pout)
            a = max(prev_end + 0.01, on - p_in, 0.0)
            b = min(next_start - 0.01, off + p_out, src.info['duration'] - 1 / fps)
            a = math.floor(a * fps) / fps
            n = max(1, round((b - a) * fps))
            pieces.append({'src': seg['src'], 'a': round(a, 4), 'n': n, 'b': round(a + n / fps, 4), 'seg': si,
                           'beat': seg.get('beat', ''), 'first_word': first['i'], 'last_word': last['i'],
                           'split': gi > 0})
    t = 0.0
    for p in pieces:
        p['out'] = round(t, 4)
        t += p['n'] / fps
    return pieces, t


# ---------------------------------------------------------------- 3. zoom plan
def zoom_plan(edl, pieces, sources, cfg):
    """Per piece: list of (local_t, zoom) steps and pushes [(local_t, dz, dur)]."""
    zc = cfg['zoom']
    snap = zc['snap']
    lo_hi = zc['inner_every']
    k = 0
    for pi, p in enumerate(pieces):
        seg = edl['segments'][p['seg']]
        ws = sources[p['src']].words
        steps = []
        if 'zoom' in seg and not p['split']:
            z = float(seg['zoom'])
        else:
            z = snap[k % len(snap)]
        k += 1
        steps.append((0.0, z))
        # inner snaps at sentence / clause starts inside long pieces, varied spacing (never a fixed metronome)
        if seg.get('inner_snaps', True) and p['n'] / cfg['fps'] > lo_hi[1]:
            last_t, want = 0.0, lo_hi[0] + (lo_hi[1] - lo_hi[0]) * ((pi * 7) % 5) / 4
            for w in ws[p['first_word'] + 1:p['last_word'] + 1]:
                prevw = ws[w['i'] - 1]
                gap = w['s'] - prevw['e']
                boundary = (re.search(r'[.,;:?!]$', prevw['text']) and gap >= 0.08) or gap >= 0.18
                lt = w['s'] - p['a'] - 0.03
                if boundary and lt - last_t >= want and (p['n'] / cfg['fps'] - lt) > 1.2:
                    z = snap[k % len(snap)]; k += 1
                    steps.append((round(lt, 3), z))
                    last_t, want = lt, lo_hi[0] + (lo_hi[1] - lo_hi[0]) * ((len(steps) * 3) % 5) / 4
        pushes = []
        for push in seg.get('push', []):
            wi = push['word']
            if p['first_word'] <= wi <= p['last_word']:
                lt = max(0.0, ws[wi]['s'] - p['a'] - 0.05)
                base = [z for t0, z in steps if t0 <= lt][-1]
                pushes.append((round(lt, 3), round(push.get('to', zc['punch']) - base, 3), push.get('dur', 0.5)))
        for wi in seg.get('punch', []):          # instant punch-in on a word (1.12 by default)
            if p['first_word'] <= wi <= p['last_word']:
                lt = max(0.0, ws[wi]['s'] - p['a'] - 0.03)
                steps.append((round(lt, 3), zc['punch']))
                steps.sort()
        p['steps'], p['pushes'] = steps, pushes
    return pieces


def zoom_expr(p):
    z0 = p['steps'][0][1]
    expr = f'{z0}'
    prev = z0
    for t0, z in p['steps'][1:]:
        expr += f'+{z - prev:.4f}*gte(t,{t0:.3f})'
        prev = z
    for t0, dz, d in p['pushes']:
        expr += f'+{dz:.4f}*(1-pow(1-clip((t-{t0:.3f})/{d:.3f},0,1),3))'
    return expr


# ---------------------------------------------------------------- 4. extract
def chroma_of(path):
    """Detect the key colour of an overlay from its first frame's corner."""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-frames:v', '1', '-vf', 'crop=8:8:0:0',
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    px = np.frombuffer(r.stdout, dtype=np.uint8).reshape(-1, 3).mean(axis=0)
    return '0x%02X%02X%02X' % tuple(int(round(c / 255)) * 255 for c in px)


def extract(p, sources, edl, cfg, work, preview):
    src = sources[p['src']]
    info = src.info
    s = max(W / info['width'], H / info['height'])
    w0, h0 = info['width'] * s, info['height'] * s
    cx, cy = src.face
    Z = zoom_expr(p)
    dur = p['n'] / cfg['fps']
    chain = ''
    if info.get('hdr'):          # iPhone HLG/PQ -> SDR BT.709 (Meta shows HDR washed out). Compared on 2026-09-24:
        tm = cfg.get('hdr', 'mobius')   # mobius = natural; hable = darker; direct = brightest, clips highlights
        if tm == 'direct':
            chain += 'zscale=t=bt709:p=bt709:m=bt709:r=tv,'
        else:
            chain += (f'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap={tm}:desat=0,'
                      'zscale=t=bt709:m=bt709:r=tv,')
    chain += (f"scale=w='2*trunc({w0:.1f}*({Z})/2)':h='2*trunc({h0:.1f}*({Z})/2)':eval=frame:flags=bicubic,"
              f"crop={W}:{H}:'(iw-{W})*{cx}':'(ih-{H})*{cy}',fps={cfg['fps']},format=yuv420p,setsar=1")
    inputs = ['-ss', f"{p['a']:.4f}", '-i', str(src.path)]
    fc = f'[0:v]{chain}[vz]'
    last = 'vz'
    for oi, ov in enumerate(edl.get('overlays', [])):
        if ov.get('follows') != p['src']:
            continue
        start_in_ov = p['a'] - ov['src_start']
        if start_in_ov + dur <= 0 or start_in_ov >= ov.get('duration', 1e9):
            continue
        inputs += ['-i', str(ov['file'])]
        idx = inputs.count('-i') - 1
        key = ov.get('chroma') or chroma_of(ov['file'])
        delay = max(0.0, -start_in_ov)
        fc += (f";[{idx}:v]trim=start={max(0.0, start_in_ov):.4f},setpts=PTS-STARTPTS+{delay:.4f}/TB,"
               f"scale={W}:{H},colorkey={key}:{ov.get('similarity', 0.32)}:{ov.get('blend', 0.08)}[ov{oi}];"
               f"[{last}][ov{oi}]overlay=eof_action=pass:format=auto[v{oi}]")
        last = f'v{oi}'
    fade = 0.03
    fc += (f";[0:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end={dur:.4f},apad=whole_dur={dur:.4f},"
           f"afade=t=in:st=0:d={fade},afade=t=out:st={dur - fade:.4f}:d={fade}[a]")
    out = work / f"piece_{p['idx']:03d}.mkv"
    cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', f'[{last}]', '-map', '[a]',
           '-frames:v', str(p['n']), '-c:v', 'libx264', '-preset', 'ultrafast' if preview else 'veryfast',
           '-crf', '20' if preview else '12', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', str(out)]
    run(cmd)
    return out


# ---------------------------------------------------------------- 6. captions
def ass_time(t):
    t = max(0.0, t)
    return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def caption_words(pieces, sources, cfg):
    """Words in OUTPUT time. A word is kept when >= 0.1 s (or half of it) lies inside a piece."""
    out = []
    for p in pieces:
        if p['src'] is None:
            continue
        ws = sources[p['src']].words
        for w in ws[max(0, p['first_word'] - 1):p['last_word'] + 2]:
            ov = min(w['e'], p['b']) - max(w['s'], p['a'])
            if ov >= min(0.1, (w['e'] - w['s']) / 2):
                s = max(w['s'], p['a']) - p['a'] + p['out']
                e = min(w['e'], p['b']) - p['a'] + p['out']
                if not out or s >= out[-1]['s'] + 0.001:
                    out.append({'text': w['text'], 's': round(s, 3), 'e': round(e, 3), 'src': p['src'], 'i': w['i'],
                                'pe': round(p['out'] + p['n'] / cfg['fps'], 4)})
    return out


def clean(txt):
    return re.sub(r'^[¿¡"«(]+|[.,;:?!"»)]+$', '', txt)


def word_time(words, ref, edge='s'):
    """Output time of a word given as [src_key, index]."""
    for w in words:
        if w['src'] == ref[0] and w['i'] == ref[1]:
            return w[edge]
    return None


def callout_events(edl, words, total, pieces):
    """Text callouts (badge / label) that land ON a word and leave after another word (or a duration).
    Styles: badge = navy text on the brand orange box; label = white text with shadow; dark = white on navy box."""
    ev, cues = [], []
    for co in edl.get('callouts', []):
        s = word_time(words, co['at_word'])
        if s is None:
            print('  callout skipped (word not in the cut):', co['text']); continue
        s = max(0.0, s + co.get('offset', -0.04))
        e = word_time(words, co['until_word'], 'e') + 0.25 if 'until_word' in co else s + co.get('dur', 1.8)
        piece_end = next((p['out'] + p['n'] / 30 for p in pieces if p['out'] <= s < p['out'] + p['n'] / 30), total)
        beat_end = piece_end
        for p in pieces:     # extend over later pieces of the same beat (tightening splits), never into the next beat
            if p['out'] >= piece_end - 1e-3 and p['beat'] == next(q['beat'] for q in pieces if q['out'] <= s < q['out'] + q['n'] / 30):
                beat_end = p['out'] + p['n'] / 30
            elif p['out'] >= piece_end - 1e-3:
                break
        e = min(e, beat_end - 0.03, total)
        y = co.get('y', 430)
        st = {'badge': 'Badge', 'label': 'Label', 'dark': 'Dark'}[co.get('style', 'badge')]
        anim = r'\fscx70\fscy70\t(0,120,\fscx104\fscy104)\t(120,200,\fscx100\fscy100)\fad(0,120)'
        ev.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e)},{st},,0,0,0,,{{\\an5\\pos({W // 2},{y}){anim}}}{co['text']}")
        if co.get('sfx', 'pop'):
            cues.append({'name': co.get('sfx', 'pop'), 'at': round(s, 3), 'why': f"callout «{co['text']}»"})
    return ev, cues


def write_ass(words, cfg, path, total, extra_events=()):
    c = cfg['captions']
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{c['font']},{c['size']},{c['color']},{c['color']},&H64000000,&H78000000,-1,0,0,0,100,100,{c['spacing']},0,1,0,3,5,40,40,0,1
Style: Badge,{c['font']},104,&H003D1B0B,&H003D1B0B,&H003CA6F5,&H00000000,-1,0,0,0,100,100,-2,0,3,20,0,5,60,60,0,1
Style: Dark,{c['font']},96,&H00FFFFFF,&H00FFFFFF,&H003D1B0B,&H00000000,-1,0,0,0,100,100,-2,0,3,20,0,5,60,60,0,1
Style: Label,{c['font']},84,&H00FFFFFF,&H00FFFFFF,&H64000000,&H78000000,-1,0,0,0,100,100,-1,0,1,0,3,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    kw = {k.lower() for k in c.get('keywords', [])}
    pop = r'{\fscx86\fscy86\t(0,90,\fscx100\fscy100)}' if c.get('pop') else ''
    pos = rf"{{\an5\pos({W // 2},{c['y']})\blur4}}"
    if c['style'] == 'word':
        for n, w in enumerate(words):
            nxt = words[n + 1]['s'] if n + 1 < len(words) else total
            end = nxt if nxt - w['e'] < 0.35 else w['e'] + 0.15
            end = min(max(end, w['s'] + 0.10), w['pe'] - 0.001)   # a caption never survives a cut
            txt = clean(w['text'])
            if not txt:
                continue
            col = rf"{{\c{c['accent']}}}" if txt.lower() in kw else ''
            ev.append(f"Dialogue: 0,{ass_time(w['s'])},{ass_time(min(end, total))},Cap,,0,0,0,,{pos}{pop}{col}{txt}")
    else:   # chunk: up to N words or punctuation, current word in accent
        n_max = int(c.get('chunk', 3))
        chunks, cur = [], []
        for n, w in enumerate(words):
            cur.append(w)
            gap = words[n + 1]['s'] - w['e'] if n + 1 < len(words) else 9
            if len(cur) >= n_max or re.search(r'[.,;:?!]$', w['text']) or gap > 0.3:
                chunks.append(cur); cur = []
        if cur:
            chunks.append(cur)
        for ch in chunks:
            for m, w in enumerate(ch):
                end = ch[m + 1]['s'] if m + 1 < len(ch) else max(w['e'] + 0.15, w['s'] + 0.2)
                end = min(end, w['pe'] - 0.001)
                parts = []
                for q, x in enumerate(ch):
                    t = clean(x['text'])
                    parts.append(rf"{{\c{c['accent']}}}{t}{{\c{c['color']}}}" if q == m else t)
                ev.append(f"Dialogue: 0,{ass_time(w['s'])},{ass_time(min(end, total))},Cap,,0,0,0,,{pos}{' '.join(parts)}")
    ev += list(extra_events)
    path.write_text(head + '\n'.join(ev) + '\n', encoding='utf-8')
    return len(ev)


# ---------------------------------------------------------------- 7. sound
def sfx_catalog():
    f = SFX_DIR / 'catalog.json'
    return {s['name']: s for s in json.loads(f.read_text(encoding='utf-8'))} if f.exists() else {}


def plan_sfx(edl, pieces, words, cfg, voice_ref):
    """Resolve the EDL's cue list to output times. `auto` adds a draft: whoosh on beat changes, a soft tap on
    snap zooms (spaced), and keyword cues. Every cue is tied to something visible or said.
    Levels are relative to the voice: gain = voice_ref - sfx ref_db + rel_db (rel_db from the catalog or the cue)."""
    cat = sfx_catalog()
    cues = []
    spec = edl.get('sfx', [])
    auto = spec == 'auto' or (isinstance(spec, dict) and spec.get('auto'))
    explicit = spec if isinstance(spec, list) else (spec.get('cues', []) if isinstance(spec, dict) else [])
    beats_at = []
    for n, p in enumerate(pieces):
        if n and p['beat'] != pieces[n - 1]['beat']:
            beats_at.append((p['out'], p['beat']))
    def word_out(src, i):
        for w in words:
            if w['src'] == src and w['i'] == i:
                return w['s']
        return None
    for c in explicit:
        t = c.get('at')
        if 'at_word' in c:
            t = word_out(*c['at_word'])
        elif 'at_beat' in c:
            t = next((b for b, name in beats_at if name == c['at_beat']), None)
        elif 'at_cut' in c:
            cuts = [p['out'] for p in pieces[1:]]
            t = cuts[c['at_cut']] if c['at_cut'] < len(cuts) else None
        if t is None:
            print('  sfx cue skipped (unresolved):', c); continue
        cues.append({'name': c['name'], 'hit': round(t + c.get('offset', 0.0), 3), 'rel_db': c.get('rel_db'), 'why': c.get('why', '')})
    if auto:
        for b, name in beats_at:
            if not any(abs(c['hit'] - b) < 0.5 for c in cues):
                cues.append({'name': 'whoosh_short', 'hit': b, 'rel_db': None, 'why': f'beat change -> {name}'})
        kws = (spec.get('words', {}) if isinstance(spec, dict) else {})
        done = set()
        for w in words:
            k = clean(w['text']).lower()
            if k in kws and k not in done:
                cues.append({'name': kws[k], 'hit': w['s'], 'rel_db': None, 'why': f'said "{k}"'})
                done.add(k)
        last = -9.0
        for p in pieces:
            for t0, z in p['steps']:
                t = p['out'] + t0
                if t < 0.3 or any(abs(t - c['hit']) < 1.0 for c in cues) or t - last < 1.8:
                    continue
                cues.append({'name': 'tap', 'hit': round(t, 3), 'rel_db': None, 'why': 'snap zoom'})
                last = t
    for c in cues:
        meta = cat.get(c['name'], {})
        c['file'] = str(SFX_DIR / meta.get('file', c['name'] + '.wav'))
        rel = c['rel_db'] if c['rel_db'] is not None else meta.get('rel_db', -14)
        c['gain_db'] = round(voice_ref - meta.get('ref_db', -14.0) + rel, 1)
        # "hit on the frame": the file starts `hit_ms` before the moment it should land
        c['start'] = round(max(0.0, c['hit'] - meta.get('hit_ms', 0) / 1000), 3)
    cues.sort(key=lambda c: c['start'])
    return cues


def loudnorm_two_pass(src_wav, dst_wav, L):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src_wav), '-af',
                        f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}:print_format=json", '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = json.loads(r.stderr[r.stderr.rfind('{'):r.stderr.rfind('}') + 1])
    af = (f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
          f"aresample=48000")
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(src_wav), '-af', af, '-c:a', 'pcm_s16le', str(dst_wav)])
    return m


def mix(base, cues, edl, cfg, work, total):
    inputs = ['-i', str(base)]
    voice = '[0:a]aresample=48000,aformat=channel_layouts=stereo'
    if cfg['voice_fx']:
        voice += ',highpass=f=80,acompressor=threshold=-22dB:ratio=2.5:attack=6:release=90:makeup=2'
    mus = edl.get('music')
    fc = voice + ('[vx];[vx]asplit=2[vm][vsc]' if mus else '[vm]')
    labels = ['[vm]']
    for n, c in enumerate(cues):
        inputs += ['-i', c['file']]
        ms = int(round(c['start'] * 1000))
        fc += (f";[{n + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume={c['gain_db']}dB,"
               f"adelay={ms}|{ms}[s{n}]")
        labels.append(f'[s{n}]')
    if mus:
        inputs += ['-i', str(mus['file'])]
        k = len(cues) + 1
        g = mus.get('gain_db', -18)
        fc += (f";[{k}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start={mus.get('start', 0)},"
               f"asetpts=PTS-STARTPTS,atrim=end={total:.3f},volume={g}dB,afade=t=in:d=0.4,"
               f"afade=t=out:st={max(0, total - mus.get('fade_out', 1.2)):.3f}:d={mus.get('fade_out', 1.2)}[mb];"
               f"[mb][vsc]sidechaincompress=threshold={mus.get('duck_threshold', 0.03)}:ratio={mus.get('duck_ratio', 8)}:"
               f"attack=15:release=350[md]")
        labels.append('[md]')
    fc += f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first[mix]"
    raw = work / 'mix_raw.wav'
    run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[mix]', '-t', f'{total:.4f}',
         '-c:a', 'pcm_s24le', str(raw)])
    final = work / 'mix.wav'
    m = loudnorm_two_pass(raw, final, cfg['loudness'])
    return final, m


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('edl')
    ap.add_argument('--preview', action='store_true', help='fast encode for a first look')
    ap.add_argument('--keep', action='store_true', help='keep the per-piece intermediates')
    a = ap.parse_args()
    edl_path = Path(a.edl).resolve()
    edl = json.loads(edl_path.read_text(encoding='utf-8'))
    cfg = deep({k: edl[k] for k in DEFAULTS if k in edl}, DEFAULTS)
    edit_dir = edl_path.parent.parent if edl_path.parent.name == 'edl' else edl_path.parent
    name = edl.get('name', edl_path.stem)
    work = edit_dir / 'render' / name
    work.mkdir(parents=True, exist_ok=True)
    out_dir = edit_dir / 'out'
    out_dir.mkdir(exist_ok=True)

    # modular ads: a segment can be {"piece": "N1"}; pieces.json holds the chosen takes of every hook/body/CTA once,
    # so each ad EDL is just a list of piece names (+ ad-level sfx/callouts/append)
    lib = edit_dir / 'pieces.json'
    if any('piece' in sg for sg in edl['segments']):
        pj = json.loads(lib.read_text(encoding='utf-8'))
        edl.setdefault('sources', {}).update(pj.get('sources', {}))
        segs = []
        for sg in edl['segments']:
            if 'piece' in sg:
                for ps in pj['pieces'][sg['piece']]['segments']:
                    segs.append(dict(ps, beat=ps.get('beat') or pj['pieces'][sg['piece']].get('beat') or sg['piece'], **{k: v for k, v in sg.items() if k != 'piece'}))
                edl.setdefault('callouts', []).extend(pj['pieces'][sg['piece']].get('callouts', []))
                edl.setdefault('overlays', []).extend(pj['pieces'][sg['piece']].get('overlays', []))
                if isinstance(edl.get('sfx'), dict):
                    edl['sfx'].setdefault('cues', []).extend(pj['pieces'][sg['piece']].get('sfx', []))
            else:
                segs.append(sg)
        edl['segments'] = segs
    sources = {k: Source(k, v, edit_dir) for k, v in edl['sources'].items()}
    for s in sources.values():
        s.face = tuple(edl.get('origin', {}).get(s.key, [])) or face_center(s)
    pieces, total = resolve(edl, sources, cfg)
    pieces = zoom_plan(edl, pieces, sources, cfg)
    for n, p in enumerate(pieces):
        p['idx'] = n
    print(f'{name}: {len(pieces)} pieces, {total:.2f} s')
    for p in pieces:
        ws = sources[p['src']].words
        txt = ' '.join(w['text'] for w in ws[p['first_word']:p['last_word'] + 1])
        print(f"  {p['out']:6.2f}  {p['src']:>6} {p['a']:7.3f}-{p['b']:7.3f}  z{p['steps']}{' push' if p['pushes'] else ''}  {txt[:70]}")

    for ov in edl.get('overlays', []):
        ov['duration'] = probe(ov['file'])['duration']
    files = [extract(p, sources, edl, cfg, work, a.preview) for p in pieces]
    # appended clips (end card / plate): full frame, their own audio or silence, a beat of their own
    for k, ap_ in enumerate(edl.get('append', [])):
        f = Path(ap_['file'] if isinstance(ap_, dict) else ap_)
        inf = probe(f)
        n = max(1, round(inf['duration'] * cfg['fps']))
        dur = n / cfg['fps']
        out_f = work / f'append_{k:02d}.mkv'
        has_a = 'a_start' in inf
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(f)]
        if not has_a:
            cmd += ['-f', 'lavfi', '-t', f'{dur:.4f}', '-i', 'anullsrc=r=48000:cl=stereo']
        fc = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
              f"fps={cfg['fps']},format=yuv420p,setsar=1[v];[{0 if has_a else 1}:a]aresample=48000,"
              f"aformat=channel_layouts=stereo,atrim=end={dur:.4f},apad=whole_dur={dur:.4f}[a]")
        run(cmd + ['-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-frames:v', str(n), '-c:v', 'libx264',
                   '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', str(out_f)])
        pieces.append({'idx': len(pieces), 'src': None, 'a': 0.0, 'b': 0.0, 'n': n, 'out': round(total, 4),
                       'beat': (ap_.get('beat') if isinstance(ap_, dict) else None) or 'END', 'first_word': -1,
                       'last_word': -2, 'steps': [], 'pushes': [], 'split': False, 'seg': -1})
        files.append(out_f)
        total += dur
    (work / 'concat.txt').write_text(''.join(f"file '{f.name}'\n" for f in files), encoding='utf-8')
    base = work / 'base.mkv'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy',
                    'base.mkv'], cwd=work, check=True)

    words = caption_words(pieces, sources, cfg)
    fonts = work / 'fonts'
    fonts.mkdir(exist_ok=True)
    for f in FONTS_DIR.glob('*.ttf'):
        shutil.copy2(f, fonts / f.name)
    co_events, co_cues = callout_events(edl, words, total, pieces)
    if edl.get('captions', True) is not False:
        n_caps = write_ass(words, cfg, work / 'captions.ass', total, co_events)
    else:
        n_caps = write_ass([], cfg, work / 'captions.ass', total, co_events) if co_events else 0

    vref = voice_ref_db(base)
    if co_cues and isinstance(edl.get('sfx'), (list, dict)):
        if isinstance(edl['sfx'], list):
            edl['sfx'] = edl['sfx'] + co_cues
        else:
            edl['sfx'].setdefault('cues', []).extend(co_cues)
    cues = plan_sfx(edl, pieces, words, cfg, vref)
    mixf, loud = mix(base, cues, edl, cfg, work, total)

    suffix = '_preview' if a.preview else ''
    out = out_dir / f'{name}{suffix}.mp4'
    vf = 'ass=captions.ass:fontsdir=fonts' if n_caps else 'null'
    enc = ['-c:v', 'libx264', '-preset', 'veryfast' if a.preview else 'medium', '-crf', '23' if a.preview else '17',
           '-maxrate', '20M', '-bufsize', '40M', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'base.mkv', '-i', 'mix.wav', '-vf', vf, '-map', '0:v', '-map', '1:a',
                    *enc, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', str(out)],
                   cwd=work, check=True)
    outs = [str(out)]
    if '4x5' in cfg['outputs']:
        o45 = out_dir / f'{name}{suffix}_4x5.mp4'
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-vf', f'crop={W}:1350:0:285', *enc, '-c:a', 'copy',
             '-movflags', '+faststart', str(o45)])
        outs.append(str(o45))

    report = {'name': name, 'edl': str(edl_path), 'outputs': outs, 'duration': round(total, 3),
              'loudness_in': {k: loud[k] for k in ('input_i', 'input_tp', 'input_lra')},
              'faces': {k: s.face for k, s in sources.items()},
              'pieces': [{k: p[k] for k in ('idx', 'src', 'a', 'b', 'n', 'out', 'beat', 'first_word', 'last_word', 'steps', 'pushes', 'split')} for p in pieces],
              'cuts': [p['out'] for p in pieces[1:]], 'captions': n_caps, 'sfx': cues,
              'words': words}
    (out_dir / f'{name}{suffix}.report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    if not a.keep:            # intermediates are derived data: the EDL + sources rebuild them
        for f in files + [work / 'base.mkv', work / 'mix_raw.wav', work / 'mix.wav']:
            f.unlink(missing_ok=True)
    print('\n'.join(outs))


if __name__ == '__main__':
    main()
