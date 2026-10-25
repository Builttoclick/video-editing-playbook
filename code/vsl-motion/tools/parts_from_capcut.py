"""Read the assembled VSL timeline (CapCut Mac 9.5) and write src/data/parts.json for the parts in IDS:
compound duration, raw/wav spans, the visible window and every caption word in compound time.
Read-only on the CapCut project.

usage: python3 tools/parts_from_capcut.py "<path to Timelines/<timeline id>/draft_info.json>"
"""
import json, sys
from pathlib import Path

P = Path(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
IDS = ["P1", "P2a", "P2b", "P2c", "P3a", "P3b", "P3c", "P4a", "P4b", "P4c", "P5a", "P5b", "P5c", "P6a", "P6b", "P6c", "P6d",
       "P8a", "P8b", "P8c", "P8d"]
d = json.loads(P.read_text())
mats = d["materials"]
drafts = {m["id"]: m for m in mats["drafts"]}
videos = {m["id"]: m for m in mats["videos"]}
parts = []
for s in d["tracks"][0]["segments"]:
    v = videos[s["material_id"]]
    pid = v["material_name"].split(" ")[0]
    if pid not in IDS:
        continue
    inner = drafts[s["extra_material_refs"][0]]["draft"]
    im = inner["materials"]
    vseg = next(t for t in inner["tracks"] if t["type"] == "video")["segments"][0]
    aseg = next(t for t in inner["tracks"] if t["type"] == "audio")["segments"][0]
    texts = {m["id"]: m for m in im["texts"]}
    words = []
    for t in inner["tracks"]:
        if t["type"] != "text":
            continue
        for seg in t["segments"]:
            m = texts[seg["material_id"]]
            cs = seg["target_timerange"]["start"] / 1e6
            w = m["words"]
            for wt, ws, we in zip(w["text"], w["start_time"], w["end_time"]):
                if wt.strip():
                    words.append({"w": wt.strip(), "t0": round(cs + ws / 1000, 3), "t1": round(cs + we / 1000, 3)})
    words.sort(key=lambda x: x["t0"])
    st, tt = s["source_timerange"], s["target_timerange"]
    seg = {"win": [st["start"] / 1e6, (st["start"] + st["duration"]) / 1e6], "timeline": [tt["start"] / 1e6, (tt["start"] + tt["duration"]) / 1e6]}
    prev = next((q for q in parts if q["id"] == pid), None)
    if prev:  # the same compound cut twice on the timeline (P8a): one overlay, two visible windows
        prev["segs"].append(seg)
        prev["win"] = [min(prev["win"][0], seg["win"][0]), max(prev["win"][1], seg["win"][1])]
        prev["timeline"] = [prev["timeline"][0], seg["timeline"][1]]
        continue
    parts.append({
        "id": pid,
        "name": v["material_name"],
        "dur": inner["duration"] / 1e6,
        "frames": round(inner["duration"] / 1e6 * 30),
        "raw_start": vseg["source_timerange"]["start"] / 1e6,
        "wav_start": aseg["source_timerange"]["start"] / 1e6,
        "win": [st["start"] / 1e6, (st["start"] + st["duration"]) / 1e6],
        "timeline": [tt["start"] / 1e6, (tt["start"] + tt["duration"]) / 1e6],
        "gain": s.get("volume", 1.0),
        "segs": [seg],
        "words": words,
    })
out = Path(__file__).resolve().parents[1] / "src/data/parts.json"
out.write_text(json.dumps(parts, ensure_ascii=False, indent=1))
for p in parts:
    print(p["id"], p["dur"], p["frames"], "raw", p["raw_start"], "win", [round(x, 3) for x in p["win"]], "tl", [round(x, 3) for x in p["timeline"]], len(p["words"]), "words",
          "" if len(p["segs"]) == 1 else f"({len(p['segs'])} pieces: " + ", ".join(f"{a:.3f}-{b:.3f}" for a, b in (q["win"] for q in p["segs"])) + ")")
