"""Pack every cached transcript into one phrase-level reading view: <edit-dir>/takes_packed.md

usage: python pack.py --edit-dir <dir> [--gap 0.5]

One line per phrase (a new phrase starts after any silence >= --gap seconds):
  w0012-0038 [002.52-005.36] Son las dos de la mañana y ...
The w-range is the word INDEX range in that source (spoken words only). EDL segments point at
word indices, never at times typed by hand: times are resolved in code (the one thing LLMs get wrong
is echoing exact timecodes). Silences >= 1.5 s are printed as their own line so restarts are visible.
Times are movie time (the audio stream offset is already applied).
"""
import argparse
from pathlib import Path
from common import load_transcript, words_of, events_of


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--edit-dir', required=True)
    ap.add_argument('--gap', type=float, default=0.5)
    a = ap.parse_args()
    ed = Path(a.edit_dir)
    lines = ['# Packed transcripts', '',
             f'Phrase = words with no silence >= {a.gap}s inside. `wA-B` = word indices for the EDL. '
             'Times in seconds, movie time.', '']
    for f in sorted((ed / 'transcripts').glob('*.json')):
        tr = load_transcript(ed, f.stem)
        ws = words_of(tr)
        evs = events_of(tr)
        dur = tr['meta'].get('duration', 0)
        phrases, cur = [], []
        for w in ws:
            if cur and w['s'] - cur[-1]['e'] >= a.gap:
                phrases.append(cur); cur = []
            cur.append(w)
        if cur:
            phrases.append(cur)
        lines.append(f'## {f.stem}  (duration {dur:.1f}s, {len(ws)} words, {len(phrases)} phrases)')
        prev_end = 0.0
        for p in phrases:
            gap = p[0]['s'] - prev_end
            if gap >= 1.5:
                lines.append(f'  ~~ {gap:.1f}s silence ~~')
            ev = [e['text'] for e in evs if p[0]['s'] - 0.3 <= e['s'] <= p[-1]['e'] + 0.3]
            text = ' '.join(w['text'] for w in p)
            lines.append(f"  w{p[0]['i']:04d}-{p[-1]['i']:04d} [{p[0]['s']:06.2f}-{p[-1]['e']:06.2f}] {text}"
                         + (f"  {' '.join(ev)}" if ev else ''))
            prev_end = p[-1]['e']
        lines.append('')
    out = ed / 'takes_packed.md'
    out.write_text('\n'.join(lines), encoding='utf-8')
    print(f'{out}  ({out.stat().st_size / 1024:.1f} KB)')


if __name__ == '__main__':
    main()
