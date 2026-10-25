"""Audio QA of the tight cuts on the DJI track: level of the 40 ms right after each in-point and right before each out-point,
against the speech level of the take. An edge within 20 dB of the speech means a word may be clipped."""
import json
import numpy as np
from common import EDIT, SCRATCH, SR
res = json.load(open(EDIT / "capcut_result.json")); plan = {p["file"]: p for p in json.load(open(EDIT / "plan.json"))}
dji = np.load(SCRATCH / "dji_main_16k.npy", mmap_mode="r")
def lvl(t0, t1):
    x = np.asarray(dji[int(t0 * SR):int(t1 * SR)], dtype=np.float64); return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9) if len(x) else -120
seen, bad = set(), 0
for proj, tls in res.items():
    for tl in tls:
        for r in tl["rows"]:
            f = r.get("file")
            if f not in plan or f in seen: continue
            seen.add(f); p = plan[f]
            base = p["k_start"] + p["off"]                       # DJI time of the compound's start
            sp = np.concatenate([np.asarray(dji[int((base + w["s"]) * SR):int((base + w["e"]) * SR)]) for w in p["words"] if w["e"] > w["s"]])
            speech = 20 * np.log10(np.sqrt(np.mean(sp.astype(np.float64) ** 2)) + 1e-9)
            a, b = base + r["in"], base + r["in"] + r["dur"]
            head, tail = lvl(a, a + 0.04), lvl(b - 0.04, b)
            flag = (" HEAD" if head > speech - 20 else "") + (" TAIL" if tail > speech - 20 else "")
            bad += bool(flag)
            print(f"{f:14s} speech {speech:6.1f} dB  in-edge {head:6.1f}  out-edge {tail:6.1f}{flag}")
print(f"\n{len(seen)} takes checked, {bad} flagged")
