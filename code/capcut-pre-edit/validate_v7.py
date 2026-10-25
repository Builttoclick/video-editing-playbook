"""Validate the V7 CapCut 9.5 projects written by capcut_v7.py. usage: python validate_v7.py ["ADS V7 1020" "VSL V2 1020"]
Every compound: parent cut inside, inner = muted raw span + the DJI wav (synced within 2 ms of the plan, Reduce noise on) +
captions in Joaquín's style, wrapper identical to the parent-embedded inner; meta/virtual store/layout consistent; files exist."""
import json, os, re, sys
from pathlib import Path
from common import CAPCUT_DRAFTS, EDIT, PROJ
BASE = CAPCUT_DRAFTS; PH = "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"
WAV = str(PROJ / "AUDIO" / "DJI-MAC-20261020-202654-MAIN.wav")
DENOISE = "/Applications/CapCut.app/Contents/MacOS/../Resources/audiosami/unet_denoise_44k_music_model_v1.0.model"
plan = {p["file"]: p for p in json.load(open(EDIT / "plan.json"))}
names = sys.argv[1:] or ["ADS V7 1020", "VSL V2 1020"]
total = 0


def mi(d): return {m["id"]: (k, m) for k, v in d["materials"].items() if isinstance(v, list) for m in v}


for NAME in names:
    ROOT = BASE / NAME; errs = []; E = errs.append
    load = lambda *p: json.load(open(ROOT.joinpath(*p), encoding="utf-8"))
    proj = load("Timelines", "project.json"); layout = load("timeline_layout.json")
    ids = [t["id"] for t in proj["timelines"]]; tnames = [t["name"] for t in proj["timelines"]]
    if layout["dockItems"][0]["timelineIds"] != ids or layout["dockItems"][0]["timelineNames"] != tnames: E("layout/project mismatch")
    if len(ids) > 10: E("more than 10 timelines")
    if (ROOT / "draft_info.json").read_bytes() != (ROOT / "Timelines" / proj["main_timeline_id"] / "draft_info.json").read_bytes(): E("root != main")
    meta = load("draft_meta_info.json")
    m0 = {e["id"]: e for g in meta["draft_materials"] if g["type"] == 0 for e in g["value"]}
    for e in m0.values():
        if e["metetype"] != "none" and not os.path.exists(e["file_Path"]): E("meta file missing " + e["file_Path"])
    m18 = [e for g in meta["draft_materials"] if g["type"] == 18 for e in g["value"]]
    subs = sorted(os.listdir(ROOT / "subdraft"))
    if {re.search(r"subdraft/([^/]+)/", e["file_Path"]).group(1) for e in m18} != set(subs): E("meta18 ids != subdraft folders")
    vs_ids = {x["child_id"] for g in load("draft_virtual_store.json")["draft_virtual_store"] if g["type"] == 1 for x in g["value"]}
    if vs_ids != set(m0): E("virtual store != meta type 0")

    def check_inner(where, inner, fid, pentry):
        mats = mi(inner)
        allids = [m["id"] for v in inner["materials"].values() if isinstance(v, list) for m in v] + [t["id"] for t in inner["tracks"]] + [sg["id"] for t in inner["tracks"] for sg in t["segments"]]
        if len(allids) != len(set(allids)): E(where + ": duplicate ids inside inner")
        if inner["id"] != fid: E(where + ": inner id != folder id")
        D = inner["duration"]
        vt = [t for t in inner["tracks"] if t["type"] == "video"]; at = [t for t in inner["tracks"] if t["type"] == "audio"]; tt = [t for t in inner["tracks"] if t["type"] == "text"]
        if len(vt) != 1 or len(vt[0]["segments"]) != 1 or len(at) != 1 or len(at[0]["segments"]) != 1: E(where + ": inner track shape"); return None
        v = vt[0]["segments"][0]; vm = mats[v["material_id"]][1]
        if not os.path.exists(vm["path"]): E(where + ": raw missing " + vm["path"])
        if vm["local_material_id"] not in m0: E(where + ": raw not in the media panel")
        if v["target_timerange"] != {"start": 0, "duration": D}: E(where + ": inner video target != 0..D")
        if v["source_timerange"]["start"] < 0 or v["source_timerange"]["start"] + D > vm["duration"]: E(where + ": inner video source outside the raw")
        if v["volume"] != 0.0 or v["last_nonzero_volume"] != 1.0: E(where + ": phone audio not at 0")
        if (vm["width"], vm["height"]) != (2160, 3840): E(where + ": raw size")
        for r in v["extra_material_refs"] + at[0]["segments"][0]["extra_material_refs"]:
            if r not in mats: E(where + ": extra missing " + r)
        a = at[0]["segments"][0]; am = mats[a["material_id"]][1]
        if am["path"] != WAV or not os.path.exists(am["path"]): E(where + ": wav path " + am["path"])
        if am["type"] != "extract_music" or am["local_material_id"] not in m0: E(where + ": wav material shape")
        if a["target_timerange"] != {"start": 0, "duration": D}: E(where + ": wav target != 0..D")
        if a["source_timerange"]["start"] < 0 or a["source_timerange"]["start"] + D > am["duration"]: E(where + ": wav source outside the file")
        fx = {mats[r][0]: mats[r][1] for r in a["extra_material_refs"] if r in mats}
        dn = fx.get("realtime_denoises")
        if not dn or dn.get("is_denoise") is not True or dn.get("path") != DENOISE or not os.path.exists(dn["path"]): E(where + ": Reduce noise not on the wav")
        if [k for k in (mats[r][0] for r in a["extra_material_refs"])] != ["speeds", "placeholder_infos", "beats", "realtime_denoises", "sound_channel_mappings", "vocal_separations"]: E(where + ": wav extras order")
        if pentry:
            off_here = (a["source_timerange"]["start"] - v["source_timerange"]["start"]) / 1e6
            if abs(off_here - pentry["off"]) > 0.002: E(where + f": wav offset {off_here:.4f} vs plan {pentry['off']:.4f}")
        if not tt: E(where + ": no text track"); return (0, D)
        prev_end, n = -1, 0
        for sg in tt[0]["segments"]:
            k, m = mats.get(sg["material_id"], ("?", None))
            if k != "texts": E(where + ": text seg material missing"); continue
            st, du = sg["target_timerange"]["start"], sg["target_timerange"]["duration"]
            if st < prev_end: E(where + ": captions overlap at %d" % st)
            if st + du > D + 1: E(where + ": caption beyond D")
            prev_end = st + du
            c = json.loads(m["content"]); b = json.loads(m["base_content"])
            if c["styles"][0]["range"] != [0, len(c["text"])] or b["text"] != c["text"] or b["styles"][0]["range"] != [0, len(c["text"])]: E(where + ": style range/base mismatch %r" % c["text"])
            if [x for x in m["words"]["text"] if x != " "] != c["text"].split(" "): E(where + ": words != text %r" % c["text"])
            ws, we = m["words"]["start_time"], m["words"]["end_time"]
            if any(x > y for x, y in zip(ws, we)) or any(x > y for x, y in zip(ws, ws[1:])) or (we and we[-1] > du // 1000 + 1): E(where + ": word times off in %r" % c["text"])
            if re.search(r"[,;:]|\.(?!\d)|\s$|^\s", c["text"]): E(where + ": punctuation left in %r" % c["text"])
            if m["type"] != "subtitle" or m["letter_spacing"] != -0.05 or m["font_size"] != 30.0 or abs(sg["clip"]["transform"]["y"] + 0.56) > 1e-9 or "Poppins" not in m["fonts"][0]["title"] or m["italic_degree"] != 0:
                E(where + ": style off on %r" % c["text"])
            if m["recognize_task_id"] not in {x["id"] for x in inner["config"]["subtitle_taskinfo"]}: E(where + ": task id not in config")
            an = [mats[r][1] for r in sg["extra_material_refs"] if r in mats and mats[r][0] == "material_animations"]
            if len(an) != 1 or an[0]["animations"][0]["name"] != "Bounce Out": E(where + ": caption animation missing")
            n += 1
        cur = 0
        for f in inner["extra_info"]["subtitle_fragment_info_list"]:
            if f["start_time"] != cur: E(where + ": fragments not contiguous at %d" % f["start_time"])
            cur = f["end_time"]
        if cur != D: E(where + ": fragments end %d != D %d" % (cur, D))
        return (n, D)

    print(f"=== {NAME}: {len(tnames)} timelines, {len(subs)} subdrafts, {len(m18)} meta-18, {len([e for e in m0.values() if e['metetype'] != 'none'])} local files")
    compounds = caps_total = 0
    for tid, tname in zip(ids, tnames):
        d = load("Timelines", tid, "draft_info.json"); mats = mi(d)
        allids = [m["id"] for v in d["materials"].values() if isinstance(v, list) for m in v] + [t["id"] for t in d["tracks"]] + [sg["id"] for t in d["tracks"] for sg in t["segments"]]
        if len(allids) != len(set(allids)): E(tname + ": duplicate ids")
        mapped = {x["uuid"] for x in load("Timelines", tid, "common_attachment", "attachment_id_mapping.json")["id_mapping"]["mapping"]}
        tl = 0; caps_here = 0; markers = 0
        for track in d["tracks"]:
            pos = 0
            for sg in track["segments"]:
                if sg["id"] not in mapped: E(tname + ": segment not in attachment mapping")
                k, m = mats.get(sg["material_id"], ("?", None))
                if m is None: E(tname + ": material missing"); continue
                for r in sg["extra_material_refs"]:
                    if r not in mats: E(tname + ": extra ref missing " + r)
                if track["type"] == "audio":
                    if not os.path.exists(m["path"]): E(tname + ": sound file missing " + m["path"])
                    if sg["source_timerange"]["start"] + sg["source_timerange"]["duration"] > m["duration"]: E(tname + ": sound cut beyond its file " + m["name"])
                    continue
                if sg["target_timerange"]["start"] != pos: E(tname + ": gap at %d" % pos)
                pos += sg["target_timerange"]["duration"]
                if m.get("extra_type_option") != 2: E(tname + ": non-compound segment"); continue
                compounds += 1
                kinds = [mats[r][0] for r in sg["extra_material_refs"]]
                dms = [mats[r][1] for r in sg["extra_material_refs"] if mats[r][0] == "drafts"]
                if len(dms) != 1 or kinds.index("drafts") > 1: E(tname + ": drafts ref not first/unique")
                if "time_marks" in kinds:
                    tm = mats[sg["extra_material_refs"][kinds.index("time_marks")]][1]; bt = mats[sg["extra_material_refs"][kinds.index("beats")]][1]
                    if kinds[0] != "time_marks" or [x["time_range"]["start"] for x in tm["mark_items"]] != bt["user_beats"]: E(tname + ": markers/beats mismatch")
                    if any(x["time_range"]["start"] > m["duration"] for x in tm["mark_items"]): E(tname + ": marker beyond the compound")
                    markers += len(tm["mark_items"])
                dm = dms[0]; fid = dm["draft"]["id"]
                if fid not in subs: E(tname + ": subdraft folder missing " + fid)
                for key in ("draft_file_path", "draft_cover_path", "draft_config_path"):
                    if not dm[key].startswith(PH) or fid not in dm[key]: E(tname + ": bad " + key)
                src = sg["source_timerange"]
                if m["duration"] != dm["draft"]["duration"] or src["start"] < 0 or src["start"] + src["duration"] > m["duration"] or src["duration"] != sg["target_timerange"]["duration"]:
                    E(tname + ": cut outside the compound " + m["material_name"])
                pentry = next((p for p in plan.values() if m["material_name"].startswith(p["piece"] + " t" + str(p["take"]) + " ")), None)
                r = check_inner(tname + "/" + m["material_name"][:30], dm["draft"], fid, pentry)
                folder = ROOT / "subdraft" / fid
                for fn in ("draft_content.json", "sub_draft_config.json", "draft_cover.jpg"):
                    if not (folder / fn).exists(): E(tname + ": missing " + fn + " in " + fid)
                w = json.load(open(folder / "draft_content.json", encoding="utf-8")); cfg = json.load(open(folder / "sub_draft_config.json", encoding="utf-8"))
                if cfg["id"] != fid or cfg["project_id"] != fid or cfg["name"] != m["material_name"] or cfg["rough_cut_duration"] != m["duration"]: E(tname + ": sub_draft_config off " + fid)
                wd = w["materials"]["drafts"][0]
                if wd["id"] != dm["id"] or wd["combination_id"] != dm["combination_id"]: E(tname + ": wrapper drafts ids differ " + fid)
                if json.dumps(wd["draft"], sort_keys=True, ensure_ascii=False) != json.dumps(dm["draft"], sort_keys=True, ensure_ascii=False): E(tname + ": wrapper inner != parent inner " + fid)
                if not wd["draft_file_path"].startswith("##_subdraft_placeholder_"): E(tname + ": wrapper placeholder " + fid)
                if r: caps_total += r[0]; caps_here += r[0]
            if track["type"] == "video": tl = max(tl, pos)
        if d["duration"] < tl: E(tname + ": duration field %d < %d" % (d["duration"], tl))
        print(f"  {tname:14s} {d['duration'] / 1e6:8.2f}s  {sum(len(t['segments']) for t in d['tracks'])} segments  {caps_here} captions" + (f"  {markers} markers" if markers else ""))
    print(f"  compounds {compounds} | captions {caps_total}")
    print("  ALL CHECKS PASSED" if not errs else f"  ERRORS ({len(errs)}):")
    for e in errs[:40]: print("   -", e)
    total += len(errs)
sys.exit(1 if total else 0)
