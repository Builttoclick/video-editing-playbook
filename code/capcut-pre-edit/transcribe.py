"""Scribe v2 (word timestamps) on the DJI main channel, one request per take, in parallel.

The audio sent is the DJI recording cut to each take's span; words come back in segment time and are
stored with movie time (the take's own clock) = t_seg + seg_start - off, off = DJI - movie (coarse sync).
Writes edit/transcripts/<take>.json = {meta, response, words:[{i,text,start,end,type}] in MOVIE time}.
"""
import json, sys, time, uuid, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np, soundfile as sf
import os
from common import VIDEOS, EDIT, SCRATCH, SR

ACCOUNT = "env"
key = os.environ["ELEVENLABS_API_KEY"]
sync = json.loads((EDIT / "sync.json").read_text(encoding="utf-8"))
dji = np.load(SCRATCH / "dji_main_16k.npy")
OUT = EDIT / "transcripts"
OUT.mkdir(parents=True, exist_ok=True)


def scribe(path):
    boundary = uuid.uuid4().hex
    fields = {"model_id": "scribe_v2", "timestamps_granularity": "word", "tag_audio_events": "true", "diarize": "false"}
    body = b""
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
             f"Content-Type: application/octet-stream\r\n\r\n").encode() + path.read_bytes() + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=1200) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(8 * (attempt + 1)); continue
            raise RuntimeError(f"Scribe HTTP {e.code}: {msg}")


def one(name):
    out = OUT / f"{name}.json"
    if out.exists():
        return f"cached {name}"
    s = sync[name]
    off = s["coarse_lag_ms"] / 1000 - s["audio_start"]           # DJI = movie + off
    seg0 = max(0.0, off)
    seg1 = min(len(dji) / SR, off + s["dur"] + s["audio_start"])
    x = dji[int(seg0 * SR):int(seg1 * SR)]
    flac = SCRATCH / f"{name}_dji.flac"
    sf.write(flac, x, SR, subtype="PCM_16")
    t0 = time.time()
    resp = scribe(flac)
    words = []
    for i, w in enumerate(resp.get("words", [])):
        words.append({"i": i, "text": w.get("text", ""), "type": w.get("type"),
                      "start": round(w.get("start", 0) + seg0 - off, 3), "end": round(w.get("end", 0) + seg0 - off, 3)})
    meta = {"take": name, "off": off, "seg0_dji": seg0, "seg1_dji": seg1, "seconds_audio": round(len(x) / SR, 1),
            "scribe_s": round(time.time() - t0, 1), "account": ACCOUNT, "model": "scribe_v2",
            "language": resp.get("language_code"), "transcribed": time.strftime("%Y-%m-%d %H:%M")}
    out.write_text(json.dumps({"meta": meta, "words": words, "response": resp}, ensure_ascii=False, indent=1), encoding="utf-8")
    n = sum(1 for w in words if w["type"] == "word")
    return f"scribed {name}: {meta['seconds_audio']} s audio, {n} words, lang {meta['language']}, {meta['scribe_s']} s"


if __name__ == "__main__":
    with ThreadPoolExecutor(6) as ex:
        for line in ex.map(one, list(VIDEOS)):
            print(line, flush=True)
