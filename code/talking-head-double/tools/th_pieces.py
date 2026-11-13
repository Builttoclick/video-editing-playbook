"""The talking-head timeline for the Remotion layers: src/data/th.json from the edit-pipeline render report.

    python3 tools/th_pieces.py

Each piece: its beat (Q* = Joaquín plays the client, A* = himself, VISTO / END = the appended clips), its output frame
range, and every word it keeps with its time in OUTPUT seconds (word time in the source minus the piece's in-point,
plus the piece's start), so a graphic can hang off a word the way our earlier coded ads do.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDIT = ROOT / "RAW/edit"
sys.path.insert(0, os.environ.get("EDIT_PIPELINE", str(ROOT.parent / "edit-pipeline/scripts")))  # this repo's code/edit-pipeline
from common import load_transcript, words_of  # noqa: E402

FPS = 30


def main():
    rep = json.loads((EDIT / "out/AN-01-TH.report.json").read_text(encoding="utf-8"))
    edl = json.loads((EDIT / "edl/AN-01-TH.json").read_text(encoding="utf-8"))
    words = {k: words_of(load_transcript(EDIT, Path(v).stem)) for k, v in edl["sources"].items()}
    out = []
    for p in rep["pieces"]:
        f0 = int(round(p["out"] * FPS))
        piece = {"id": f"{p['beat']}-{p['idx']}", "beat": p["beat"], "role": "client" if p["beat"].startswith("Q") else "me",
                 "f0": f0, "n": p["n"], "f1": f0 + p["n"], "a": p["a"], "b": p["b"], "words": []}
        if p["src"]:
            ws = words[p["src"]]
            end = p["out"] + p["n"] / FPS
            for w in ws[p["first_word"]:p["last_word"] + 1]:
                t = p["out"] + (w["s"] - p["a"])
                if end - t < 0.15:  # a word the cut barely touches (A1's "¿Por": Scribe starts it on the pause): not in this piece
                    continue
                piece["words"].append({"text": w["text"], "t": round(t, 3), "f": int(round(t * FPS)), "e": round(p["out"] + (w["e"] - p["a"]), 3)})
        out.append(piece)
    total = int(round(rep["pieces"][-1]["out"] * FPS)) + rep["pieces"][-1]["n"]
    data = {"fps": FPS, "frames": total, "pieces": out}
    (ROOT / "src/data/th.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    for p in out:
        print(f"{p['f0']:5d}-{p['f1']:5d} {p['beat']:6s} {p['role']:6s} " + " ".join(w["text"] for w in p["words"])[:80])
    print("frames:", total, f"({total / FPS:.1f} s)")


if __name__ == "__main__":
    main()
