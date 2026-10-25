"""Repair the stretches where Scribe looped a repeated phrase: a hallucinated duplicate squeezed into a few ms.

Detection: runs of >= 6 consecutive words spaced < 60 ms. Each run is widened to its cluster (no gap > 1.0 s on the
original timing), the DJI audio of the cluster (+0.8 s margins) is re-sent to Scribe as a short clip, and the cluster's
entries (words, spacings, audio events) are REPLACED by the new ones, times shifted back to movie time. Indices are
renumbered, so run this BEFORE writing any take selection. usage: python fix_bunched.py [--range TAKE T0 T1 ...]
"""
import json, os, sys, time
import numpy as np, soundfile as sf
from common import VIDEOS, EDIT, SCRATCH, SR
import transcribe as T

args = sys.argv[1:]
FORCE = {}
while "--range" in args:
    k = args.index("--range"); FORCE.setdefault(args[k + 1], []).append((float(args[k + 2]), float(args[k + 3]))); del args[k:k + 4]
T.key = os.environ["ELEVENLABS_API_KEY"]
dji = np.load(SCRATCH / "dji_main_16k.npy", mmap_mode="r")
sync = json.loads((EDIT / "sync.json").read_text())

for name in VIDEOS:
    p = EDIT / "transcripts" / f"{name}.json"
    d = json.loads(p.read_text())
    allw = d["words"]
    wpos = [k for k, w in enumerate(allw) if w["type"] == "word"]
    ws = [allw[k] for k in wpos]
    runs, i = [], 0
    while i < len(ws):
        j = i
        while j + 1 < len(ws) and (ws[j + 1]["start"] - ws[j]["start"]) < 0.06: j += 1
        if j - i + 1 >= 6: runs.append((i, j))
        i = j + 1
    clusters = []
    for t0f, t1f in FORCE.get(name, []):
        ks = [k for k, w in enumerate(ws) if t0f <= w["start"] <= t1f]
        if ks: clusters.append((ks[0], ks[-1]))
    if not runs and not clusters:
        print(name, "clean"); continue
    for a, b in runs:
        while a > 0 and ws[a]["start"] - ws[a - 1]["end"] < 1.0: a -= 1
        while b + 1 < len(ws) and ws[b + 1]["start"] - ws[b]["end"] < 1.0: b += 1
        if clusters and a <= clusters[-1][1]: clusters[-1] = (clusters[-1][0], max(b, clusters[-1][1]))
        else: clusters.append((a, b))
    off = sync[name]["coarse_lag_ms"] / 1000 - sync[name]["audio_start"]       # DJI = movie + off
    new_all = []; cur = 0
    for a, b in clusters:
        ka, kb = wpos[a], wpos[b]                                              # positions in allw
        t0 = max(0.0, ws[a]["start"] - 0.8); t1 = ws[b]["end"] + 0.8
        x = np.asarray(dji[int((t0 + off) * SR):int((t1 + off) * SR)])
        flac = SCRATCH / f"fix_{name}_{allw[ka]['i']}.flac"
        sf.write(flac, x, SR, subtype="PCM_16")
        resp = T.scribe(flac)
        new = [{"text": w.get("text", ""), "type": w.get("type"), "start": round(w.get("start", 0) + t0, 3), "end": round(w.get("end", 0) + t0, 3)}
               for w in resp.get("words", [])]
        old_txt = " ".join(w["text"] for w in allw[ka:kb + 1] if w["type"] == "word")
        new_txt = " ".join(w["text"] for w in new if w["type"] == "word")
        print(f"{name} cluster w{allw[ka]['i']}-{allw[kb]['i']} {ws[a]['start']:.2f}-{ws[b]['end']:.2f}s: {sum(1 for w in allw[ka:kb+1] if w['type']=='word')} words -> {sum(1 for w in new if w['type']=='word')} words")
        print("   OLD:", old_txt[:230]); print("   NEW:", new_txt[:230])
        new_all += allw[cur:ka] + new; cur = kb + 1
    new_all += allw[cur:]
    for k, w in enumerate(new_all): w["i"] = k
    d["words"] = new_all
    d["meta"]["bunched_fixed_at"] = time.strftime("%Y-%m-%d %H:%M"); d["meta"]["bunched_clusters"] = len(clusters)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1))
print("done")
