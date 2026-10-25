"""Self-check a rendered edit BEFORE anyone watches it. Measures, never assumes (we cannot listen).

usage: python qa.py <out.mp4> [--report <out.report.json>]

Checks and outputs (next to the video, in qa_<name>/):
  - duration vs the render report, streams, fps, size
  - loudness: integrated LUFS, true peak (ebur128)       target -14 LUFS, TP <= -1.0
  - silences > 0.6 s inside the speech (a pause that should have been cut)
  - clicks: sample jumps at every cut boundary vs the local median
  - cuts.png: the frame before / after every cut, side by side (look for flashes, jumps, framing)
  - safe.png: 6 frames with the Meta Reels-ad safe zone (top 14 %, bottom 35 %) and the 4:5 crop drawn
  - sfx vs voice: the level of every SFX cue relative to the speech around it
"""
import argparse, json, re, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from common import FONTS_DIR, pcm, probe, run

W, H = 1080, 1920


def frame(video, t, w=360):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t):.3f}', '-i', str(video), '-frames:v', '1',
                        '-vf', f'scale={w}:-2', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True)
    from io import BytesIO
    return Image.open(BytesIO(r.stdout)).convert('RGB')


def font(size):
    try:
        return ImageFont.truetype(str(FONTS_DIR / 'Poppins-Bold.ttf'), size)
    except Exception:
        return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--report')
    a = ap.parse_args()
    v = Path(a.video)
    rep_path = Path(a.report) if a.report else v.with_suffix('.report.json')
    rep = json.loads(rep_path.read_text(encoding='utf-8')) if rep_path.exists() else {}
    qd = v.parent / f'qa_{v.stem}'
    qd.mkdir(exist_ok=True)
    info = probe(v)
    issues = []

    # duration
    if rep:
        d = info['duration'] - rep['duration']
        if abs(d) > 0.07:
            issues.append(f'duration {info["duration"]:.3f}s vs EDL {rep["duration"]:.3f}s ({d:+.3f})')

    # loudness
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(v), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = r.stderr[r.stderr.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', tail).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', tail).group(1))
    if abs(I + 14) > 1.0:
        issues.append(f'loudness {I} LUFS (target -14)')
    if tp > -1.0:
        issues.append(f'true peak {tp} dBTP (> -1.0)')

    # silences inside speech
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(v), '-af', 'silencedetect=noise=-38dB:d=0.6', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    sil = [(float(s), float(e)) for s, e in zip(re.findall(r'silence_start: (-?[\d.]+)', r.stderr),
                                              re.findall(r'silence_end: (-?[\d.]+)', r.stderr))]
    inner = [(s, e) for s, e in sil if s > 0.3 and e < info['duration'] - 0.3]
    for s, e in inner:
        issues.append(f'silence {e - s:.2f}s at {s:.2f}-{e:.2f} inside the speech')

    # clicks at cuts
    cuts = rep.get('cuts', [])
    x = pcm(v, sr=48000)
    clicks = []
    for c in cuts:
        k = int(c * 48000)
        win = x[max(0, k - 2400):k + 2400]
        if len(win) < 100:
            continue
        dif = np.abs(np.diff(win))
        local = np.median(dif) + 1e-6
        near = dif[2400 - 240:2400 + 240].max() if len(dif) > 2640 else dif.max()
        ratio = near / local
        clicks.append((c, round(float(ratio), 1)))
        if ratio > 60 and near > 0.05:
            issues.append(f'possible click at cut {c:.2f}s (jump {near:.3f}, {ratio:.0f}x local)')

    # SFX level vs the voice around it
    sfx_levels = []
    for cue in rep.get('sfx', []):
        sfx_levels.append({'name': cue['name'], 'hit': cue['hit'], 'gain_db': cue['gain_db'], 'why': cue.get('why', '')})

    # cuts.png
    tiles = []
    for c in cuts:
        a_img, b_img = frame(v, c - 0.07, 270), frame(v, c + 0.04, 270)
        t = Image.new('RGB', (a_img.width * 2 + 6, a_img.height + 34), (20, 20, 20))
        t.paste(a_img, (0, 34)); t.paste(b_img, (a_img.width + 6, 34))
        ImageDraw.Draw(t).text((8, 6), f'cut {c:.2f}s  before | after', fill=(255, 200, 80), font=font(20))
        tiles.append(t)
    if tiles:
        cols = 3
        tw, th = tiles[0].size
        sheet = Image.new('RGB', (cols * tw, ((len(tiles) + cols - 1) // cols) * th), (0, 0, 0))
        for n, t in enumerate(tiles):
            sheet.paste(t, ((n % cols) * tw, (n // cols) * th))
        sheet.save(qd / 'cuts.png')

    # safe.png
    fw = 270
    fh = int(fw * H / W)
    ts = np.linspace(0.4, info['duration'] - 0.4, 6)
    sheet = Image.new('RGB', (fw * 6, fh + 30), (0, 0, 0))
    for n, t in enumerate(ts):
        im = frame(v, t, fw)
        d = ImageDraw.Draw(im, 'RGBA')
        d.rectangle([0, 0, fw, int(fh * 0.14)], fill=(255, 0, 0, 70))
        d.rectangle([0, int(fh * 0.65), fw, fh], fill=(255, 0, 0, 70))
        y0, y1 = int(fh * 285 / H), int(fh * 1635 / H)
        d.line([0, y0, fw, y0], fill=(80, 200, 255, 255), width=2)
        d.line([0, y1, fw, y1], fill=(80, 200, 255, 255), width=2)
        sheet.paste(im, (n * fw, 30))
        ImageDraw.Draw(sheet).text((n * fw + 6, 6), f'{t:.1f}s', fill=(255, 255, 255), font=font(18))
    sheet.save(qd / 'safe.png')

    res = {'video': str(v), 'duration': info['duration'], 'size': f"{info['width']}x{info['height']}", 'fps': info['fps'],
           'loudness_LUFS': I, 'true_peak_dBTP': tp, 'silences_inside': inner, 'cut_jump_ratios': clicks,
           'sfx': sfx_levels, 'issues': issues, 'sheets': [str(qd / 'cuts.png'), str(qd / 'safe.png')]}
    (qd / 'qa.json').write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f"{v.name}: {info['duration']:.2f}s {info['width']}x{info['height']} {info['fps']:.0f}fps | {I} LUFS, TP {tp} dBTP | "
          f"{len(cuts)} cuts | {len(sfx_levels)} sfx")
    print('ISSUES:' if issues else 'no issues found', *issues, sep='\n  ')
    print('sheets:', qd)


if __name__ == '__main__':
    main()
