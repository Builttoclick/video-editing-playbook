"""Shared helpers for the video-edit skill: paths, ffprobe, ElevenLabs key choice, audio envelopes."""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
FONTS_DIR = SKILL_DIR / 'assets' / 'fonts'
SFX_DIR = SKILL_DIR / 'assets' / 'sfx'
# Optional: a JSON file with several ElevenLabs accounts, {"cuentas": {"name": {"api_key": "..."}}}.
# The script picks the one with the most credits left. Without it, ELEVENLABS_API_KEY is used.
KEYS_FILE = Path(os.environ['ELEVENLABS_KEYS_FILE']) if os.environ.get('ELEVENLABS_KEYS_FILE') else None
FPS = 30

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def run(cmd, check=True, capture=True):
    r = subprocess.run(cmd, capture_output=capture, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode != 0:
        raise RuntimeError(f"command failed ({r.returncode}): {' '.join(map(str, cmd))[:400]}\n{(r.stderr or '')[-2000:]}")
    return r


def probe(path):
    """Duration, display size (rotation applied), fps, rotation, stream start times, HDR flag."""
    r = run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)])
    j = json.loads(r.stdout)
    v = next((s for s in j['streams'] if s['codec_type'] == 'video'), None)
    a = next((s for s in j['streams'] if s['codec_type'] == 'audio'), None)
    info = {'path': str(path), 'duration': float(j['format'].get('duration', 0))}
    if v:
        rot = 0
        for sd in v.get('side_data_list', []) or []:
            if 'rotation' in sd:
                rot = int(float(sd['rotation']))
        w, h = int(v['width']), int(v['height'])
        if abs(rot) in (90, 270):
            w, h = h, w
        num, den = (v.get('r_frame_rate') or '30/1').split('/')
        info.update(width=w, height=h, rotation=rot, fps=float(num) / float(den or 1),
                    vcodec=v.get('codec_name'), pix_fmt=v.get('pix_fmt'),
                    transfer=v.get('color_transfer'), primaries=v.get('color_primaries'),
                    v_start=float(v.get('start_time') or 0))
        info['hdr'] = info['transfer'] in ('arib-std-b67', 'smpte2084')
    if a:
        info.update(a_start=float(a.get('start_time') or 0), sample_rate=int(a.get('sample_rate') or 48000),
                    channels=int(a.get('channels') or 1))
    # word times from an extracted audio file are relative to the first audio sample;
    # the container timeline (what -ss seeks) is shifted by the audio stream's start_time.
    info['audio_offset'] = round(info.get('a_start', 0) - info.get('v_start', 0), 4) if v and a else 0.0
    return info


def eleven_key():
    """The ElevenLabs key with the most credits left, else the env key.

    Every account whose balance can be read counts. A past_due
    subscription still reports its credits but answers 401 payment_issue on speech-to-text, so skip it."""
    best, best_left = None, -1
    try:
        accts = json.loads(KEYS_FILE.read_text(encoding='utf-8'))['cuentas']
    except Exception:
        accts = {}
    for name, a in accts.items():
        key = a.get('api_key')
        if not key:
            continue
        try:
            req = urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription', headers={'xi-api-key': key})
            with urllib.request.urlopen(req, timeout=20) as r:
                s = json.load(r)
            left = int(s.get('character_limit', 0)) - int(s.get('character_count', 0))
        except Exception:
            continue
        if s.get('status') in ('past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'canceled'):
            continue
        if left > best_left:
            best, best_left = (name, key), left
    if best:
        return best[0], best[1], best_left
    env = os.environ.get('ELEVENLABS_API_KEY')
    if env:
        return 'env', env, -1
    raise SystemExit('No ElevenLabs key found: export ELEVENLABS_API_KEY=... (or point ELEVENLABS_KEYS_FILE at a keys JSON)')


def pcm(path, start=0.0, dur=None, sr=16000):
    """Mono float32 samples of a file's first audio stream from `start` (container time)."""
    import numpy as np
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{max(0.0, start):.3f}', '-i', str(path)]
    if dur is not None:
        cmd += ['-t', f'{dur:.3f}']
    cmd += ['-vn', '-ac', '1', '-ar', str(sr), '-f', 's16le', '-']
    r = subprocess.run(cmd, capture_output=True)
    return np.frombuffer(r.stdout, dtype='<i2').astype('float32') / 32768.0


def envelope_db(x, sr=16000, hop_ms=1, win_ms=10):
    """RMS envelope in dBFS, one value per hop."""
    import numpy as np
    hop, win = int(sr * hop_ms / 1000), int(sr * win_ms / 1000)
    if len(x) < win:
        return np.full(1, -100.0)
    c = np.cumsum(np.concatenate([[0.0], x.astype('float64') ** 2]))
    n = (len(x) - win) // hop + 1
    idx = np.arange(n) * hop
    rms = np.sqrt((c[idx + win] - c[idx]) / win)
    return 20 * np.log10(np.maximum(rms, 1e-5))


def voice_ref_db(path):
    """Typical speech level of a file: median 100 ms RMS (dBFS) over the windows where someone is talking."""
    import numpy as np
    x = pcm(path)
    win = 1600
    n = len(x) // win
    if n < 3:
        return -20.0
    rms = np.sqrt((x[:n * win].reshape(n, win).astype('float64') ** 2).mean(axis=1))
    db = 20 * np.log10(np.maximum(rms, 1e-6))
    floor = np.percentile(db, 10)
    active = db[db > floor + 15]
    return float(np.median(active)) if len(active) else float(np.median(db))


def load_transcript(edit_dir, stem):
    return json.loads((Path(edit_dir) / 'transcripts' / f'{stem}.json').read_text(encoding='utf-8'))


def words_of(tr):
    """Spoken words only (no spacing tokens), in movie time (audio offset applied), with their index."""
    off = tr.get('meta', {}).get('audio_offset', 0.0)
    out = []
    for w in tr['response'].get('words', []):
        if w.get('type') != 'word':
            continue
        out.append({'i': len(out), 'text': w['text'], 's': round(w['start'] + off, 3), 'e': round(w['end'] + off, 3)})
    return out


def events_of(tr):
    off = tr.get('meta', {}).get('audio_offset', 0.0)
    return [{'text': w['text'], 's': round(w['start'] + off, 3), 'e': round(w['end'] + off, 3)}
            for w in tr['response'].get('words', []) if w.get('type') == 'audio_event']
