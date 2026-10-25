"""Put the finished overlays INSIDE their compounds in VSL ARMADO (CapCut project "VSL V2 1020", Mac 9.5).

Each out/ENTREGA/<part>.mov is cloned (APFS, zero disk) to
~/Movies/VSL-MEDIA/VSL-MOTION/<part>-motion-vN.mov (CapCut Mac is sandboxed: media must
live under ~/Movies) and placed at 00:00 on its own top video track inside the part's compound, whole length (= the
take with its handles), so it stays on the words if Joaquín re-trims or drags the edges. Joaquín's captions keep rendering on top.
The segment/material/extras format is cloned from an overlay CapCut 9.5 itself saved in "ADS V6 0924" (C1 t3, flag 2).

CapCut must be QUIT (Cmd+Q). Dry run by default; --write applies, after an APFS-clone backup of the whole project to
~/Movies/VSL-MEDIA/_draft-backups/<date>/<project> <stamp>/ (outside com.lveditor.draft, so CapCut never lists it).
Re-running puts in the next version (vN+1) and removes the previous overlay track of that part.

usage: python3 tools/place_capcut.py [P1 P2a ...] [--write]
"""
import copy
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
DRAFTS = Path.home() / "Movies/CapCut/User Data/Projects/com.lveditor.draft"
PROJ = DRAFTS / "VSL V2 1020"            # your VSL project (the timeline with the parts as compounds)
TEMPLATE_PROJ = DRAFTS / "ADS V6 0924"   # any project where CapCut itself saved an overlay track inside a compound
MEDIA = Path.home() / "Movies/VSL-MEDIA/VSL-MOTION"
BACKUPS = Path.home() / "Movies/VSL-MEDIA/_draft-backups"
MIRRORS = ("draft_info.json", "draft_info.json.bak", "template-2.tmp")
EXTRA_KINDS = ["speeds", "placeholder_infos", "canvases", "sound_channel_mappings", "material_colors", "vocal_separations"]
WRITE = "--write" in sys.argv
WANT = [a for a in sys.argv[1:] if not a.startswith("--")] or ["P1", "P2a", "P2b", "P2c", "P3a", "P3b", "P3c", "P4a"]
FFPROBE = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"


def U():
    return str(uuid.uuid4()).upper()


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, o):
    data = json.dumps(o, ensure_ascii=False, separators=(",", ":"))  # the whole content exists before the file opens
    tmp = str(p) + ".btc-tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(data)
    os.replace(tmp, p)


def guard():
    r = subprocess.run(["pgrep", "-f", "CapCut.app/Contents/MacOS"], capture_output=True, text=True)
    if r.stdout.strip():
        raise SystemExit("CapCut is running: quit it with Cmd+Q (closing the window is not enough), then run again.")


def probe(path):
    out = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True).stdout
    j = json.loads(out)
    st = j["streams"][0]
    return int(st["width"]), int(st["height"]), int(st.get("nb_frames", 0)), float(j["format"]["duration"])


def template():
    """An overlay segment + its material + extras exactly as CapCut 9.5 wrote them."""
    pj = load(TEMPLATE_PROJ / "Timelines/project.json")
    for tl in pj["timelines"]:
        d = load(TEMPLATE_PROJ / "Timelines" / tl["id"] / "draft_info.json")
        for dm in d["materials"].get("drafts", []):
            inner = dm["draft"]
            for tr in inner["tracks"]:
                if tr["type"] == "video" and tr.get("flag") == 2 and tr["segments"]:
                    seg = tr["segments"][0]
                    byid = {m["id"]: (k, m) for k, v in inner["materials"].items() if isinstance(v, list)
                            for m in v if isinstance(m, dict) and "id" in m}
                    extras = {byid[r][0]: byid[r][1] for r in seg["extra_material_refs"]}
                    return tr, seg, byid[seg["material_id"]][1], extras
    raise SystemExit("no overlay template found in ADS V6 0924")


T_TRACK, T_SEG, T_MAT, T_EXTRAS = template()
assert sorted(T_EXTRAS) == sorted(EXTRA_KINDS), T_EXTRAS.keys()


def build(pid, path, dur_us, w, h, meta_id):
    mat = copy.deepcopy(T_MAT)
    mat.update(id=U(), unique_id=uuid.uuid4().hex, path=str(path), material_name=path.name, duration=dur_us, width=w, height=h,
               has_audio=False, local_material_id=meta_id, category_name="local")
    extras = {}
    for k in EXTRA_KINDS:
        e = copy.deepcopy(T_EXTRAS[k])
        e["id"] = U()
        extras[k] = e
    seg = copy.deepcopy(T_SEG)
    seg.update(id=U(), material_id=mat["id"], desc=f"{pid} motion", source_timerange={"start": 0, "duration": dur_us},
               target_timerange={"start": 0, "duration": dur_us}, extra_material_refs=[extras[k]["id"] for k in EXTRA_KINDS],
               volume=1.0, last_nonzero_volume=1.0, keyframe_refs=[], common_keyframes=[], visible=True)
    seg["clip"] = {"scale": {"x": 1.0, "y": 1.0}, "rotation": 0.0, "transform": {"x": 0.0, "y": 0.0},
                   "flip": {"vertical": False, "horizontal": False}, "alpha": 1.0}
    tr = copy.deepcopy(T_TRACK)
    tr.update(id=U(), segments=[seg], name="", is_default_name=True, flag=2, attribute=0)
    return mat, extras, seg, tr


def insert(inner, pid, built):
    """Drop any previous motion track of this part, then add the new one on top."""
    mats = inner["materials"]
    old_ids = {m["id"] for m in mats.get("videos", []) if re.match(rf"^{re.escape(pid)}-motion-v\d+\.mov$", m.get("material_name", ""))}
    removed = 0
    if old_ids:
        keep = []
        for tr in inner["tracks"]:
            if tr["type"] == "video" and tr.get("flag") == 2 and any(s["material_id"] in old_ids for s in tr["segments"]):
                for s in tr["segments"]:
                    for k in EXTRA_KINDS:
                        mats[k] = [e for e in mats.get(k, []) if e["id"] not in s["extra_material_refs"]]
                removed += 1
                continue
            keep.append(tr)
        inner["tracks"] = keep
        mats["videos"] = [m for m in mats["videos"] if m["id"] not in old_ids]
    mat, extras, seg, tr = copy.deepcopy(built)
    seg["track_render_index"] = sum(1 for t in inner["tracks"] if t["type"] in ("video", "text", "sticker", "effect", "filter"))
    seg["render_index"] = 1
    mats.setdefault("videos", []).append(mat)
    for k, e in extras.items():
        mats.setdefault(k, []).append(e)
    inner["tracks"].append(tr)
    return removed


def main():
    guard()
    pj = load(PROJ / "Timelines/project.json")
    armado = next(t for t in pj["timelines"] if t["name"] == "VSL ARMADO")["id"]
    tdir = PROJ / "Timelines" / armado
    files = [tdir / n for n in MIRRORS if (tdir / n).exists()]
    main_d = load(files[0])
    vids = {m["id"]: m for m in main_d["materials"]["videos"]}
    # part -> (drafts entry id, inner draft id) from the live timeline
    where = {}
    for s in main_d["tracks"][0]["segments"]:
        pid = vids[s["material_id"]]["material_name"].split(" ")[0]
        if pid in WANT and pid not in where:
            did = s["extra_material_refs"][0]
            inner = next(d for d in main_d["materials"]["drafts"] if d["id"] == did)["draft"]
            where[pid] = (did, inner["id"], inner["duration"])
    missing = [p for p in WANT if p not in where]
    if missing:
        raise SystemExit(f"parts not on VSL ARMADO: {missing}")

    # version: one more than what is in the media folder
    MEDIA.mkdir(parents=True, exist_ok=True)
    vers = [int(m.group(1)) for f in os.listdir(MEDIA) for m in [re.match(r"^\w+-motion-v(\d+)\.mov$", f)] if m]
    ver = max(vers, default=0) + 1
    built, metas = {}, []
    for pid in WANT:
        src = HERE / f"out/ENTREGA/{pid}.mov"
        w, h, n, secs = probe(src)
        dst = MEDIA / f"{pid}-motion-v{ver}.mov"
        dur_us = min(int(secs * 1000) * 1000, where[pid][2])
        meta_id = str(uuid.uuid4())
        built[pid] = build(pid, dst, dur_us, w, h, meta_id)
        metas.append((meta_id, dst, dur_us, w, h))
        print(f"{pid}: {src.name} {w}x{h} {n} frames {secs:.3f}s -> {dst.name}, inside compound {where[pid][1]} ({where[pid][2] / 1e6:.3f}s)")
    if not WRITE:
        print(f"\ndry run: would write {len(files)} timeline files + {len(WANT)} wrappers + meta. Add --write.")
        return

    stamp = time.strftime("%Y-%m-%d")
    bk = BACKUPS / stamp / f"VSL V2 1020 {time.strftime('%H%M%S')}"
    bk.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", "-cR", str(PROJ), str(bk)], check=True)
    print("backup:", bk)
    for pid in WANT:
        subprocess.run(["cp", "-c", str(HERE / f"out/ENTREGA/{pid}.mov"), str(MEDIA / f"{pid}-motion-v{ver}.mov")], check=True)

    for f in files:
        d = load(f)
        for pid in WANT:
            did = where[pid][0]
            entry = next(x for x in d["materials"]["drafts"] if x["id"] == did)
            r = insert(entry["draft"], pid, built[pid])
            if r:
                print(f"  {f.name}: {pid} replaced {r} old motion track(s)")
        save(f, d)
    for pid in WANT:
        wp = PROJ / "subdraft" / where[pid][1] / "draft_content.json"
        if wp.exists():
            w = load(wp)
            for x in w["materials"].get("drafts", []):
                if x["id"] == where[pid][0]:
                    insert(x["draft"], pid, built[pid])
            save(wp, w)
        else:
            print("  (no wrapper file for", pid, ")")

    meta = load(PROJ / "draft_meta_info.json")
    grp = next(g for g in meta["draft_materials"] if g["type"] == 0)
    tmpl = next(e for e in grp["value"] if e.get("metetype") == "video")
    now = time.time()
    oldpat = re.compile(r"/(?:%s)-motion-v\d+\.mov$" % "|".join(map(re.escape, WANT)))
    gone = {e["id"] for e in grp["value"] if oldpat.search(e.get("file_Path", ""))}
    grp["value"] = [e for e in grp["value"] if e["id"] not in gone]
    for meta_id, dst, dur_us, w, h in metas:
        e = copy.deepcopy(tmpl)
        e.update(id=meta_id, file_Path=str(dst), extra_info=dst.name, duration=dur_us, width=w, height=h, create_time=int(now),
                 import_time=int(now), import_time_ms=int(now * 1e6), md5="", metetype="video",
                 roughcut_time_range={"duration": dur_us, "start": 0}, sub_time_range={"duration": -1, "start": -1}, type=0)
        grp["value"].append(e)
    save(PROJ / "draft_meta_info.json", meta)
    vs = load(PROJ / "draft_virtual_store.json")
    g1 = next(g for g in vs["draft_virtual_store"] if g["type"] == 1)
    g1["value"] = [c for c in g1["value"] if c.get("child_id") not in gone] + [{"child_id": m[0], "parent_id": ""} for m in metas]
    save(PROJ / "draft_virtual_store.json", vs)

    # validate: re-read every file written
    for f in files:
        d = load(f)
        for pid in WANT:
            inner = next(x for x in d["materials"]["drafts"] if x["id"] == where[pid][0])["draft"]
            ov = [t for t in inner["tracks"] if t["type"] == "video" and t.get("flag") == 2]
            names = [m["material_name"] for m in inner["materials"]["videos"] if "-motion-" in m["material_name"]]
            ids = [m["id"] for k, v in inner["materials"].items() if isinstance(v, list) for m in v if isinstance(m, dict) and "id" in m]
            assert len(ids) == len(set(ids)), f"duplicate ids in {pid}"
            assert len(ov) == 1 and names == [f"{pid}-motion-v{ver}.mov"], (pid, len(ov), names)
            assert os.path.exists(next(m for m in inner["materials"]["videos"] if "-motion-" in m["material_name"])["path"])
        print("ok ", f.relative_to(PROJ))
    print(f"placed v{ver} in {len(WANT)} compounds")


if __name__ == "__main__":
    main()
