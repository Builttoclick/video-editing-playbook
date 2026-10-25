"""CapCut 9.5 (Mac) projects for the V7.2 shoot of 2026-10-20, written straight from the raw files (no clip exports).

  ADS V7 1020   BANCO HOOKS, BANCO CUERPOS, BANCO CTAS (every take = a compound: raw MOV span with 1.5 s handles, phone
                audio at volume 0, the DJI wav synced inside, Reduce noise ON on the wav, Joaquín's captions) + SONIDOS (the
                sounds of past ads plus a folder of your own sound files, one after another, to copy from).
  VSL V2 1020   VSL RAW (the whole IMG_6245 as one compound, same recipe, a marker at every part's pick) + VSL ARMADO
                (the pick of every part, cut tight, in script order).

TEMPLATES, all written by CapCut Mac 9.5 itself (make your own: see code/capcut-pre-edit/README.md): `1020` (root
skeleton, compound parent/inner/wrapper, meta), `1021` (local wav/mp3 import, Reduce noise on an audio clip, marker,
raw 4K video import), `ADS V6 0924` (the ad caption style + Bounce Out, the library sounds). Paths are the real files;
nothing is copied or re-encoded. This is the script we ran for one shoot: a reference implementation, not a library.

usage: python capcut_v7.py            dry run (prints the plan)
       python capcut_v7.py --write    writes both project folders (CapCut must be closed)
"""
import copy, hashlib, json, math, os, secrets, shutil, subprocess, sys, time, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from common import PROJ, RAW, EDIT, CAPCUT_DRAFTS, BTC, VIDEOS, run, probe
from captions import chunks
import takes_example as sel

BASE = CAPCUT_DRAFTS
T20, T21, V6 = BASE / "1020", BASE / "1021", BASE / "ADS V6 0924"
PH = "##_draftpath_placeholder_0E685133-18CE-45ED-8CB8-2904A212EC80_##"
WAV = PROJ / "AUDIO" / "DJI-MAC-20261020-202654-MAIN.wav"
SFX_DIR = PROJ / "SFX"                                   # your own sound files (mp3/wav), optional
US, FPS = 1_000_000, 30
WRITE = "--write" in sys.argv
NOW_S, NOW_MS, NOW_US = int(time.time()), int(time.time() * 1000), int(time.time() * US)
CAP_Y = -0.56
PROJECT_ADS, PROJECT_VSL = "ADS V7 1020", "VSL V2 1020"
WOOSH_VOL = 0.6339091658592224          # Joaquín's 63 % on every transition woosh (V6, 07-oct)


def U(): return str(uuid.uuid4()).upper()
def u(): return str(uuid.uuid4())
def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def mi(d): return {m["id"]: (k, m) for k, v in d["materials"].items() if isinstance(v, list) for m in v}
def f_floor_us(t): return int(math.floor(t * FPS + 1e-6)) * US // FPS
def f_ceil_us(t): return int(math.ceil(t * FPS - 1e-6)) * US // FPS
def mat_dur_us(dur_s): return int(math.ceil(dur_s * FPS - 1e-9)) * US // FPS      # 9.5: material duration = ceil to a frame
def meta_dur_us(dur_s): return int(round(dur_s * 1000)) * 1000                     # 9.5: meta roughcut = ms exact
def md5(s): return hashlib.md5(s.encode("utf-8")).hexdigest()
def empty_materials(d): return {k: ([] if isinstance(v, list) else copy.deepcopy(v)) for k, v in d["materials"].items()}
def dur_of(path): return float(probe(path)["format"]["duration"])


# ---------------------------------------------------------------- templates
r20 = load(T20 / "draft_info.json"); m20 = mi(r20)
T_PSEG = next(s for s in r20["tracks"][0]["segments"] if m20[s["material_id"]][1].get("extra_type_option") == 2)
T_PMAT = m20[T_PSEG["material_id"]][1]
T_PEXTRAS = [m20[r] for r in T_PSEG["extra_material_refs"]]
assert T_PEXTRAS[0][0] == "drafts" and [k for k, _ in T_PEXTRAS] == ["drafts", "speeds", "placeholder_infos", "canvases", "sound_channel_mappings", "material_colors", "vocal_separations"]
T_DRAFTMAT = T_PEXTRAS[0][1]
T_INNER = T_DRAFTMAT["draft"]
T_TRACK = T_INNER["tracks"][0]
_fid = T_INNER["id"]
T_WRAPPER = load(T20 / "subdraft" / _fid / "draft_content.json")
T_SUBCFG = load(T20 / "subdraft" / _fid / "sub_draft_config.json")
T_META18 = next(e for g in load(T20 / "draft_meta_info.json")["draft_materials"] if g["type"] == 18 for e in g["value"])

r21 = load(T21 / "draft_info.json"); m21 = mi(r21)
T_RAWSEG = r21["tracks"][0]["segments"][0]
T_RAWMAT = m21[T_RAWSEG["material_id"]][1]
assert (T_RAWMAT["width"], T_RAWMAT["height"]) == (2160, 3840) and T_RAWMAT["category_name"] == "local"
_rx = [m21[r] for r in T_RAWSEG["extra_material_refs"]]
T_RAW_EXTRAS = [(k, m) for k, m in _rx if k not in ("time_marks", "beats")]      # speeds, placeholder_infos, canvases, sound_channel_mappings, material_colors, vocal_separations
T_TIMEMARKS = next(m for k, m in _rx if k == "time_marks")
T_BEATS_MARK = next(m for k, m in _rx if k == "beats")                             # the beats extra CapCut adds with user_beats when you press M
_asegs = [s for t in r21["tracks"] if t["type"] == "audio" for s in t["segments"]]
T_WAVSEG = next(s for s in _asegs if m21[s["material_id"]][1]["name"].endswith(".wav"))
T_WAVMAT = m21[T_WAVSEG["material_id"]][1]
T_WAV_EXTRAS = [m21[r] for r in T_WAVSEG["extra_material_refs"]]
assert [k for k, _ in T_WAV_EXTRAS] == ["speeds", "placeholder_infos", "beats", "realtime_denoises", "sound_channel_mappings", "vocal_separations"]
assert T_WAVMAT["type"] == "extract_music" and T_WAVMAT["category_name"] == "local"
T_MP3SEG = next(s for s in _asegs if m21[s["material_id"]][1]["name"].endswith(".mp3"))
T_MP3MAT = m21[T_MP3SEG["material_id"]][1]
T_MP3_EXTRAS = [m21[r] for r in T_MP3SEG["extra_material_refs"]]                   # speeds, placeholder_infos, beats, sound_channel_mappings, vocal_separations
T_ATRACK = next(t for t in r21["tracks"] if t["type"] == "audio")
meta21 = load(T21 / "draft_meta_info.json")
_m0 = [e for g in meta21["draft_materials"] if g["type"] == 0 for e in g["value"]]
T_META_NONE = next(e for e in _m0 if e["metetype"] == "none")
T_META_VIDEO = next(e for e in _m0 if e["metetype"] == "video")
T_META_MUSIC = next(e for e in _m0 if e["metetype"] == "music")
T21_TL = T21 / "Timelines" / load(T21 / "Timelines" / "project.json")["main_timeline_id"]

# Joaquín's ad captions: a V6 compound that holds texts (Mac paths already, saved by CapCut 9.5 on 07-oct)
for _sd in sorted((V6 / "subdraft").iterdir()):
    _w = load(_sd / "draft_content.json"); _in = _w["materials"]["drafts"][0]["draft"]
    if _in["materials"]["texts"] and any(t["type"] == "text" for t in _in["tracks"]):
        _im = mi(_in)
        T_TTRACK = next(t for t in _in["tracks"] if t["type"] == "text")
        T_TSEG = T_TTRACK["segments"][0]; T_TMAT = _im[T_TSEG["material_id"]][1]
        T_TANIM = next(_im[r][1] for r in T_TSEG["extra_material_refs"] if _im[r][0] == "material_animations")
        T_TASK = _in["config"]["subtitle_taskinfo"][0]
        break
assert T_TMAT["type"] == "subtitle" and T_TANIM["animations"][0]["name"] == "Bounce Out" and T_TMAT["font_size"] == 30.0 and T_TMAT["letter_spacing"] == -0.05
assert T_TMAT["italic_degree"] == 0 and "/Users/" in T_TMAT["fonts"][0]["path"]
T_BASE_FONT = "/Applications/CapCut.app/Contents/Resources/Font/SystemFont/en.ttf"

# the library sounds of Joaquín's V6 ads: material + the extras of one of their segments
LIB_NAMES = ["Woosh", "Deep woosh", "Mouse click 1", "Typing On Computer Keyboard Loopable", "Chain: iPhone-like notification sound ♫(1004784)"]
SOUND_TPL = {}
def _collect(d):
    mm = mi(d)
    for t in d["tracks"]:
        if t["type"] != "audio": continue
        for s in t["segments"]:
            k, m = mm[s["material_id"]]
            if m.get("name") in LIB_NAMES and m["name"] not in SOUND_TPL and os.path.exists(m["path"]):
                SOUND_TPL[m["name"]] = (m, [mm[r] for r in s["extra_material_refs"]])
    for dr in d["materials"].get("drafts", []): _collect(dr["draft"])
for _f in sorted((V6 / "Timelines").glob("*/draft_info.json")): _collect(load(_f))
assert set(SOUND_TPL) == set(LIB_NAMES), set(LIB_NAMES) - set(SOUND_TPL)

# ---------------------------------------------------------------- inputs
plan = {p["file"]: p for p in load(EDIT / "plan.json")}
by_piece = {}
for p in plan.values(): by_piece.setdefault(p["piece"], []).append(p)
for v in by_piece.values(): v.sort(key=lambda p: p["take"])
PICK = {k: [p for p in v if p["pick"]][0] for k, v in by_piece.items()}
LABEL = {piece: label for piece, label, _ in sel.PIECES}
TR = {n: load(EDIT / "transcripts" / f"{n}.json") for n in VIDEOS}
FILE_DUR = {n: dur_of(VIDEOS[n]["path"]) for n in VIDEOS}
WAV_DUR = dur_of(WAV)
SFX_FILES = sorted(SFX_DIR.glob("*.mp3"))
SFX_DUR = {f: dur_of(f) for f in SFX_FILES}
SYNC = load(EDIT / "sync.json")


def off_fit(video):
    """DJI = movie + off(t): robust line through the per-take offsets of that file (the clocks drift -10 ms / 1000 s)."""
    pts = [(p["k_start"] + p["dur"] / 2, p["off"]) for p in plan.values() if p["video"] == video]
    if len(pts) < 3:
        a0 = SYNC[video]["audio_start"]
        return lambda t, _o=(pts[0][1] if pts else SYNC[video]["coarse_lag_ms"] / 1000 - a0): _o
    t = np.array([x for x, _ in pts]); o = np.array([y for _, y in pts])
    for _ in range(3):
        b, a = np.polyfit(t, o, 1); r = o - (a + b * t)
        keep = np.abs(r) < max(0.0015, 3 * np.median(np.abs(r)) + 1e-9)
        t, o = t[keep], o[keep]
    b, a = np.polyfit(t, o, 1)
    return lambda tt, a=a, b=b: a + b * tt
OFF = {n: off_fit(n) for n in VIDEOS}


# ---------------------------------------------------------------- captions
def words_struct(timed):
    st, en, tx = [], [], []
    for i, (t, s, e) in enumerate(timed):
        if i: st.append(en[-1]); en.append(en[-1]); tx.append(" ")
        st.append(s); en.append(e); tx.append(t)
    return {"start_time": st, "end_time": en, "text": tx}


def caption_list(words, onset, offset, dur_us):
    """words: [{t, s, e}] in compound seconds -> [(start_us, end_us, text, [(word, s_ms, e_ms)])]."""
    ws = [dict(w) for w in words]
    if not ws: return []
    ws[0]["s"] = max(ws[0]["s"], onset); ws[0]["e"] = max(ws[0]["e"], ws[0]["s"] + 0.06)
    ws[-1]["e"] = min(ws[-1]["e"], offset + 0.03); ws[-1]["s"] = min(ws[-1]["s"], ws[-1]["e"] - 0.06)
    for a, b in zip(ws, ws[1:]):
        a["e"] = min(a["e"], b["s"]) if b["s"] > a["s"] else a["e"]
    caps = []
    for g in chunks(ws):
        st = f_floor_us(g[0]["s"]); en = f_ceil_us(g[-1]["e"] + 0.08)
        subs = []
        for t in g:
            parts = t["t"].split(" "); n = len(parts)
            for k, w in enumerate(parts):
                subs.append((w, t["s"] + (t["e"] - t["s"]) * k / n, t["s"] + (t["e"] - t["s"]) * (k + 1) / n))
        caps.append([st, en, " ".join(w for w, _, _ in subs), subs])
    for i in range(len(caps) - 1):
        nxt = caps[i + 1][0]
        if caps[i][1] > nxt or nxt - caps[i][1] < 0.25 * US: caps[i][1] = nxt
    caps[-1][1] = min(caps[-1][1], dur_us)
    out = []
    for st, en, text, subs in caps:
        if en <= st: continue
        timed = []
        for w, s, e in subs:
            s_ms = max(0, int(round(s * 1000 - st / 1000)))
            e_ms = min(max(s_ms, int(round(e * 1000 - st / 1000))), (en - st) // 1000)
            timed.append((w, s_ms, e_ms))
        out.append((st, en, text, timed))
    return out


def text_material(text, timed, task_id, group_id):
    m = copy.deepcopy(T_TMAT)
    m["id"] = U(); m["recognize_task_id"] = task_id; m["recognize_text"] = text; m["group_id"] = group_id
    c = json.loads(m["content"]); c["text"] = text; c["styles"][0]["range"] = [0, len(text)]
    m["content"] = json.dumps(c, ensure_ascii=False, separators=(",", ":"))
    b = json.loads(m["base_content"]); b["text"] = text; b["styles"][0]["range"] = [0, len(text)]; b["styles"][0]["font"]["path"] = T_BASE_FONT
    m["base_content"] = json.dumps(b, ensure_ascii=False, separators=(",", ":"))
    m["words"] = words_struct(timed); m["current_words"] = {"start_time": [], "end_time": [], "text": []}
    m["letter_spacing"] = -0.05; m["font_size"] = 30.0; m["text_size"] = 30; m["italic_degree"] = 0
    return m


def text_segment(mat_id, anim_id, start_us, dur_us, idx, track_idx):
    s = copy.deepcopy(T_TSEG)
    s["id"] = U(); s["material_id"] = mat_id; s["extra_material_refs"] = [anim_id]
    s["target_timerange"] = {"start": start_us, "duration": dur_us}; s["source_timerange"] = None
    s["render_index"] = 14000 + idx; s["track_render_index"] = track_idx
    s["clip"] = copy.deepcopy(T_TSEG["clip"]); s["clip"]["transform"] = {"x": 0.0, "y": CAP_Y}
    s["keyframe_refs"] = []; s["common_keyframes"] = []
    return s


def fragments(caps, dur_us, task_id):
    out, cur = [], 0
    for st, en, text, timed in caps:
        if st > cur: out.append({"start_time": cur, "end_time": st, "subtitle_cache_info": ""})
        w = words_struct(timed)
        sent = {"attribute": {"event": "speech"}, "bilingual_lan": "none", "end_time": en // 1000, "language_server_recognize": "es-MX",
                "language_user_select": "es-MX", "start_time": st // 1000, "task_id": task_id, "text": text, "translation_text": "",
                "words": [{"end_time": w["end_time"][i] + st // 1000, "start_time": w["start_time"][i] + st // 1000, "text": w["text"][i]} for i in range(len(w["text"]))]}
        out.append({"start_time": st, "end_time": en, "subtitle_cache_info": json.dumps({"sentence_list": [sent]}, ensure_ascii=False, separators=(",", ":"))})
        cur = en
    if cur < dur_us: out.append({"start_time": cur, "end_time": dur_us, "subtitle_cache_info": ""})
    return out


def new_track(tpl, typ):
    t = copy.deepcopy(tpl); t["id"] = U(); t["type"] = typ; t["segments"] = []; t["name"] = ""; t["is_default_name"] = True
    return t


def clone_extras(extras):
    out = []
    for k, m in extras:
        e = copy.deepcopy(m); e["id"] = U(); out.append((k, e))
    return out


# ---------------------------------------------------------------- a project
class Project:
    def __init__(self, name):
        self.name = name; self.dir = BASE / name
        self.meta_ids = {}                       # local file path -> lowercase id (the media panel)
        self.meta18, self.subdrafts = [], []

    def local(self, path):
        p = str(path)
        if p not in self.meta_ids: self.meta_ids[p] = u()
        return self.meta_ids[p]

    # --- the inner timeline of a compound: raw video (muted) + the DJI wav (synced, Reduce noise) + captions
    def inner(self, video, k_start, dur_s, words, name, fid, onset, offset):
        D = f_floor_us(dur_s)
        d = copy.deepcopy(T_INNER)
        d["id"] = fid; d["name"] = name; d["duration"] = D
        d["canvas_config"] = {"ratio": "9:16", "width": 1080, "height": 1920, "background": None}
        d["materials"] = empty_materials(T_INNER); d["keyframes"] = {k: [] for k in d["keyframes"]}; d["relationships"] = []
        task_id = secrets.token_hex(12) + "_8_0"; group_id = "es-MX_%d" % (NOW_MS + len(self.subdrafts))
        cfg = d["config"]; cfg["subtitle_taskinfo"] = [dict(T_TASK, id=task_id)]; cfg["combination_max_index"] = 1; cfg["sticker_max_index"] = 1
        # the raw video span, phone audio at volume 0 (one click brings it back)
        rp = str(VIDEOS[video]["path"])
        vm = copy.deepcopy(T_RAWMAT)
        vm.update({"id": U(), "unique_id": md5(rp), "path": rp, "material_name": Path(rp).name, "duration": mat_dur_us(FILE_DUR[video]),
                   "local_material_id": self.local(rp)})
        vs = copy.deepcopy(T_RAWSEG)
        vs.update({"id": U(), "material_id": vm["id"], "source_timerange": {"start": f_floor_us(k_start), "duration": D},
                   "target_timerange": {"start": 0, "duration": D}, "render_timerange": {"start": 0, "duration": 0},
                   "volume": 0.0, "last_nonzero_volume": 1.0, "render_index": 0, "track_render_index": 0, "keyframe_refs": [], "common_keyframes": [], "desc": ""})
        vx = clone_extras(T_RAW_EXTRAS); vs["extra_material_refs"] = [m["id"] for _, m in vx]
        d["materials"]["videos"].append(vm)
        for k, m in vx: d["materials"][k].append(m)
        # the DJI wav, cut to the same span, shifted by the measured sync offset
        off = OFF[video](k_start + dur_s / 2)
        am = copy.deepcopy(T_WAVMAT)
        am.update({"id": U(), "unique_id": md5(str(WAV)), "name": WAV.name, "path": str(WAV), "duration": mat_dur_us(WAV_DUR), "music_id": u(),
                   "local_material_id": self.local(WAV)})
        a_src = int(round((f_floor_us(k_start) / US + off) * US))
        assert 0 <= a_src and a_src + D <= am["duration"], (name, a_src, D)
        aseg = copy.deepcopy(T_WAVSEG)
        aseg.update({"id": U(), "material_id": am["id"], "source_timerange": {"start": a_src, "duration": D}, "target_timerange": {"start": 0, "duration": D},
                     "render_timerange": {"start": 0, "duration": 0}, "volume": 1.0, "last_nonzero_volume": 1.0, "render_index": 0, "track_render_index": 1,
                     "keyframe_refs": [], "common_keyframes": [], "desc": ""})
        ax = clone_extras(T_WAV_EXTRAS); aseg["extra_material_refs"] = [m["id"] for _, m in ax]
        d["materials"]["audios"].append(am)
        for k, m in ax: d["materials"][k].append(m)
        # captions
        caps = caption_list(words, onset, offset, D)
        tsegs = []
        if caps:
            max_dur = max(en - st for st, en, _, _ in caps)
            for i, (st, en, text, timed) in enumerate(caps):
                m = text_material(text, timed, task_id, group_id)
                an = copy.deepcopy(T_TANIM); an["id"] = U(); an["animations"][0]["start"] = 0; an["animations"][0]["duration"] = max_dur
                d["materials"]["texts"].append(m); d["materials"]["material_animations"].append(an)
                tsegs.append(text_segment(m["id"], an["id"], st, en - st, i, 2))
        vtrack = new_track(T_TRACK, "video"); vtrack["segments"] = [vs]
        atrack = new_track(T_ATRACK, "audio"); atrack["segments"] = [aseg]
        ttrack = new_track(T_TTRACK, "text"); ttrack["segments"] = tsegs
        d["tracks"] = [vtrack, atrack, ttrack]
        d["extra_info"] = {"text_to_video": None, "track_info": None, "subtitle_fragment_info_list": fragments(caps, D, task_id)}
        return d, caps, off

    # --- one compound on a timeline: parent segment (tight cut) + materials + the subdraft files
    def compound(self, video, k_start, dur_s, words, name, tl_pos, in_s, out_s, onset, offset, markers=None):
        fid = U()
        inner, caps, off = self.inner(video, k_start, dur_s, words, name, fid, onset, offset)
        D = inner["duration"]
        in_us = max(0, f_floor_us(in_s)); out_us = min(D, f_ceil_us(out_s)); seg_dur = out_us - in_us
        mat = copy.deepcopy(T_PMAT); mat.update({"id": U(), "duration": D, "material_name": name, "width": 1080, "height": 1920, "path": ""})
        dm = copy.deepcopy(T_DRAFTMAT)
        dm.update({"id": U(), "combination_id": U(), "draft": inner, "precompile_combination": False})
        for key, fn in (("draft_file_path", "draft_content.json"), ("draft_cover_path", "draft_cover.jpg"), ("draft_config_path", "sub_draft_config.json")):
            dm[key] = f"{PH}/subdraft/{fid}/{fn}"
        extras = [("drafts", dm)] + clone_extras(T_PEXTRAS[1:])
        if markers:
            tm = {"id": U(), "mark_items": [{"id": U(), "time_range": {"start": t_us, "duration": 0}, "color": "#00c1cd", "title": title} for t_us, title in markers]}
            bt = copy.deepcopy(T_BEATS_MARK); bt["id"] = U(); bt["user_beats"] = [t_us for t_us, _ in markers]
            kinds = [k for k, _ in extras]
            extras = [("time_marks", tm)] + extras[:kinds.index("material_colors")] + [("beats", bt)] + extras[kinds.index("material_colors"):]
        seg = copy.deepcopy(T_PSEG)
        seg.update({"id": U(), "material_id": mat["id"], "desc": "", "source_timerange": {"start": in_us, "duration": seg_dur},
                    "target_timerange": {"start": tl_pos, "duration": seg_dur}, "render_timerange": {"start": 0, "duration": 0},
                    "volume": 1.0, "last_nonzero_volume": 1.0, "speed": 1.0, "render_index": 0, "track_render_index": 0, "keyframe_refs": [], "common_keyframes": [],
                    "extra_material_refs": [m["id"] for _, m in extras]})
        # wrapper = the subdraft's own draft_content.json (9.5: fresh ids, a subdraft placeholder, the same inner and drafts ids)
        w = copy.deepcopy(T_WRAPPER); w["id"] = U(); w["name"] = ""
        w["materials"] = empty_materials(T_WRAPPER); w["keyframes"] = {k: [] for k in w["keyframes"]}
        ws = copy.deepcopy(T_WRAPPER["tracks"][0]["segments"][0]); ws["id"] = U()
        ws["source_timerange"] = {"start": 0, "duration": D}; ws["target_timerange"] = {"start": 0, "duration": D}
        wm = copy.deepcopy(mat); wm["id"] = U(); ws["material_id"] = wm["id"]; w["materials"]["videos"].append(wm)
        wdm = copy.deepcopy(dm); sph = f"##_subdraft_placeholder_{U()}_##"
        for key, fn in (("draft_file_path", "draft_content.json"), ("draft_cover_path", "draft_cover.jpg"), ("draft_config_path", "sub_draft_config.json")):
            wdm[key] = f"{sph}/{fn}"
        w["materials"]["drafts"].append(wdm)
        wx = clone_extras(T_PEXTRAS[1:])
        for k, m in wx: w["materials"][k].append(m)
        ws["extra_material_refs"] = [wdm["id"]] + [m["id"] for _, m in wx]
        wt = copy.deepcopy(T_WRAPPER["tracks"][0]); wt["id"] = U(); wt["segments"] = [ws]; w["tracks"] = [wt]
        cfg = dict(T_SUBCFG, id=fid, project_id=fid, name=name, create_time=NOW_S, import_time_ms=NOW_MS, rough_cut_duration=D, rough_cut_start=0)
        m18 = dict(copy.deepcopy(T_META18), id=U(), extra_info=name, file_Path=f"./subdraft/{fid}/sub_draft_config.json", duration=D,
                   create_time=NOW_S, import_time=NOW_S, import_time_ms=NOW_MS, roughcut_time_range={"duration": D, "start": 0})
        self.meta18.append(m18)
        self.subdrafts.append((fid, w, cfg, video, k_start + (in_us + seg_dur / 3) / US))
        return seg, mat, extras, seg_dur, caps, off, D

    def take_items(self, p, name, tl_pos, markers=None):
        return self.compound(p["video"], p["k_start"], p["dur"], p["words"], name, tl_pos, p["in"], p["out"],
                             p["onset"] - p["k_start"], p["offset"] - p["k_start"], markers)

    def skeleton(self, tid):
        d = copy.deepcopy(r20)
        d["id"] = tid; d["name"] = ""; d["materials"] = empty_materials(r20); d["keyframes"] = {k: [] for k in d["keyframes"]}
        d["canvas_config"] = {"ratio": "9:16", "width": 1080, "height": 1920, "background": None}
        d["config"]["subtitle_taskinfo"] = []; d["config"]["lyrics_taskinfo"] = []; d["relationships"] = []; d["group_container"] = None
        d["extra_info"] = {"text_to_video": None, "track_info": None, "subtitle_fragment_info_list": []}
        d["time_marks"] = None; d["tracks"] = []
        return d

    def timeline(self, tid, items, raw_whole=None):
        """items: [(plan entry, compound name)] back to back. raw_whole: (video, markers) for the one-compound VSL RAW timeline."""
        d = self.skeleton(tid)
        track = new_track(T_TRACK, "video")
        pos, rows = 0, []
        if raw_whole:
            video, markers = raw_whole
            allw = [w for w in TR[video]["words"] if w["type"] == "word"]
            dur_s = f_floor_us(FILE_DUR[video]) / US
            words = [{"t": w["text"], "s": w["start"], "e": w["end"]} for w in allw if w["end"] <= dur_s]
            name = f"VSL RAW - {Path(VIDEOS[video]['path']).name} completo"
            seg, mat, extras, seg_dur, caps, off, D = self.compound(video, 0.0, dur_s, words, name, 0, 0.0, dur_s, words[0]["s"], words[-1]["e"], markers)
            track["segments"].append(seg); d["materials"]["videos"].append(mat)
            for k, m in extras: d["materials"][k].append(m)
            rows.append({"name": name, "file": "RAW", "at": 0.0, "in": 0.0, "dur": round(seg_dur / US, 3), "clip": round(D / US, 3), "off_ms": round(off * 1000, 1),
                         "captions": len(caps), "markers": [(round(t / US, 3), ti) for t, ti in markers]})
            pos = seg_dur
        for p, name in items:
            seg, mat, extras, seg_dur, caps, off, D = self.take_items(p, name, pos)
            track["segments"].append(seg); d["materials"]["videos"].append(mat)
            for k, m in extras: d["materials"][k].append(m)
            rows.append({"name": name, "file": p["file"], "video": p["video"], "at": round(pos / US, 3), "in": round(seg["source_timerange"]["start"] / US, 3),
                         "dur": round(seg_dur / US, 3), "clip": round(D / US, 3), "k_start": p["k_start"], "off_ms": round(off * 1000, 1),
                         "captions": [t for _, _, t, _ in caps]})
            pos += seg_dur
        d["tracks"] = [track]; d["duration"] = pos
        d["config"]["combination_max_index"] = len(track["segments"]) + 1
        return d, rows

    def sounds_timeline(self, tid):
        """SONIDOS: the five library sounds of past ads, then the files in SFX_DIR, one after another with 1 s of air."""
        d = self.skeleton(tid)
        track = new_track(T_ATRACK, "audio")
        pos, rows = 0, []
        GAP = 1 * US
        for lib in LIB_NAMES:
            tm, tx = SOUND_TPL[lib]
            m = copy.deepcopy(tm); m["id"] = U()
            dur = min(m["duration"], 4 * US) if "Loopable" in lib else m["duration"]
            s = copy.deepcopy(T_MP3SEG)
            s.update({"id": U(), "material_id": m["id"], "source_timerange": {"start": 0, "duration": dur}, "target_timerange": {"start": pos, "duration": dur},
                      "render_timerange": {"start": 0, "duration": 0}, "volume": WOOSH_VOL if lib == "Woosh" else 1.0, "last_nonzero_volume": 1.0,
                      "render_index": 0, "track_render_index": 0, "keyframe_refs": [], "common_keyframes": [], "desc": ""})
            ex = clone_extras(tx); s["extra_material_refs"] = [x["id"] for _, x in ex]
            d["materials"]["audios"].append(m)
            for k, x in ex: d["materials"][k].append(x)
            track["segments"].append(s)
            rows.append({"name": m["name"], "at": round(pos / US, 3), "dur": round(dur / US, 3), "volume": s["volume"], "source": "CapCut library"})
            pos += dur + GAP
        for f in SFX_FILES:
            m = copy.deepcopy(T_MP3MAT)
            m.update({"id": U(), "unique_id": md5(str(f)), "name": f.name, "path": str(f), "duration": mat_dur_us(SFX_DUR[f]), "music_id": u(), "local_material_id": self.local(f)})
            dur = m["duration"]
            s = copy.deepcopy(T_MP3SEG)
            s.update({"id": U(), "material_id": m["id"], "source_timerange": {"start": 0, "duration": dur}, "target_timerange": {"start": pos, "duration": dur},
                      "render_timerange": {"start": 0, "duration": 0}, "volume": 1.0, "last_nonzero_volume": 1.0, "render_index": 0, "track_render_index": 0,
                      "keyframe_refs": [], "common_keyframes": [], "desc": ""})
            ex = clone_extras(T_MP3_EXTRAS); s["extra_material_refs"] = [x["id"] for _, x in ex]
            d["materials"]["audios"].append(m)
            for k, x in ex: d["materials"][k].append(x)
            track["segments"].append(s)
            rows.append({"name": f.name, "at": round(pos / US, 3), "dur": round(dur / US, 3), "volume": 1.0, "source": "BRANDING/SFX/jun-yuh-2026"})
            pos += dur + GAP
        d["tracks"] = [track]; d["duration"] = pos - GAP
        return d, rows

    # --- files
    def write(self, timelines):
        dst = self.dir
        if dst.exists(): shutil.rmtree(dst)
        for sub in ("adjust_mask", "common_attachment", "matting", "qr_upload", "Resources/combination", "Resources/audioAlg", "Resources/videoAlg", "smart_crop", "Timelines", "subdraft"):
            (dst / sub).mkdir(parents=True, exist_ok=True)
        def wj(rel, obj):
            (dst / rel).parent.mkdir(parents=True, exist_ok=True)
            (dst / rel).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        def cover(video, t, out, size):
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(VIDEOS[video]["path"]), "-frames:v", "1", "-vf", f"scale={size}", str(out)])
        with ThreadPoolExecutor(6) as ex:
            jobs = []
            for fid, w, cfg, video, t in self.subdrafts:
                wj(Path("subdraft") / fid / "draft_content.json", w)
                wj(Path("subdraft") / fid / "sub_draft_config.json", cfg)
                jobs.append(ex.submit(cover, video, t, dst / "subdraft" / fid / "draft_cover.jpg", "180:320"))
            for j in jobs: j.result()
        main_id = timelines[0][0]
        proj_tls = []
        for tid, tname, content, rows in timelines:
            tdir = Path("Timelines") / tid
            wj(tdir / "draft_info.json", content)
            segs = [s for t in content["tracks"] for s in t["segments"]]
            mapping = {"id_mapping": {"mapping": [{"short_id": str(1000 + i), "uuid": s["id"]} for i, s in enumerate(segs)], "next_index": 1000 + len(segs), "version": "1.0.0"}}
            wj(tdir / "common_attachment" / "attachment_id_mapping.json", mapping)
            for fn in os.listdir(T21_TL / "common_attachment"):
                if fn != "attachment_id_mapping.json": shutil.copy(T21_TL / "common_attachment" / fn, dst / tdir / "common_attachment" / fn)
            for fn in ("attachment_pc_common.json", "attachment_editing.json"):
                if (T21_TL / fn).exists(): shutil.copy(T21_TL / fn, dst / tdir / fn)
            proj_tls.append({"create_time": NOW_US, "id": tid, "is_marked_delete": False, "name": tname, "update_time": NOW_US})
            if tid == main_id:
                wj("draft_info.json", content)
                wj(Path("common_attachment") / "attachment_id_mapping.json", mapping)
        for fn in os.listdir(T21 / "common_attachment"):
            if fn != "attachment_id_mapping.json": shutil.copy(T21 / "common_attachment" / fn, dst / "common_attachment" / fn)
        tproj = load(T21 / "Timelines" / "project.json")
        wj(Path("Timelines") / "project.json", {"config": copy.deepcopy(tproj["config"]), "create_time": NOW_US, "id": U(), "main_timeline_id": main_id,
                                                "timelines": proj_tls, "update_time": NOW_US, "version": tproj.get("version", 0)})
        wj("timeline_layout.json", {"dockItems": [{"dockIndex": 0, "ratio": 1, "timelineIds": [t[0] for t in timelines], "timelineNames": [t[1] for t in timelines]}], "layoutOrientation": 1})
        # media panel: the raw files, the wav, the mp3s; one type-18 entry per compound
        meta = copy.deepcopy(meta21)
        meta["draft_materials"] = copy.deepcopy(load(T20 / "draft_meta_info.json")["draft_materials"])   # 1021 has no type-18 group (no compounds); 1020 has every group
        meta.update({"draft_fold_path": str(dst), "draft_id": U(), "draft_name": self.name, "draft_root_path": str(BASE), "draft_cover": "draft_cover.jpg",
                     "draft_materials_copied_info": [], "draft_segment_extra_info": [], "draft_new_version": "", "draft_removable_storage_device": "",
                     "tm_draft_create": NOW_US, "tm_draft_modified": NOW_US, "tm_draft_removed": 0, "tm_duration": timelines[0][2]["duration"]})
        none_e = dict(copy.deepcopy(T_META_NONE), id=u(), create_time=NOW_S, import_time=NOW_S, import_time_ms=NOW_US)
        files, size = [], 0
        for p, lid in self.meta_ids.items():
            P = Path(p); dur_s = dur_of(P); st = P.stat(); size += st.st_size
            if P.suffix.lower() in (".mov", ".mp4"):
                e = dict(copy.deepcopy(T_META_VIDEO), id=lid, extra_info=P.name, file_Path=p, duration=meta_dur_us(dur_s), width=2160, height=3840)
            else:
                e = dict(copy.deepcopy(T_META_MUSIC), id=lid, extra_info=P.name, file_Path=p, duration=meta_dur_us(dur_s), width=0, height=0)
            e.update({"create_time": int(st.st_mtime), "import_time": NOW_S, "import_time_ms": NOW_US, "roughcut_time_range": {"duration": e["duration"], "start": 0}, "md5": ""})
            files.append(e)
        for g in meta["draft_materials"]:
            g["value"] = [none_e] + files if g["type"] == 0 else (self.meta18 if g["type"] == 18 else [])
        meta["draft_timeline_materials_size_"] = size
        wj("draft_meta_info.json", meta)
        (dst / "draft_settings").write_text(f"[General]\ndraft_create_time={NOW_S}\ndraft_last_edit_time={NOW_S}\nreal_edit_keys=0\nreal_edit_seconds=0\n", encoding="utf-8")
        wj("draft_virtual_store.json", {"draft_materials": [], "draft_virtual_store": [
            {"type": 0, "value": [{"creation_time": 0, "display_name": "", "filter_type": 0, "id": "", "import_time": 0, "import_time_us": 0, "material_color_tag": "", "sort_sub_type": 0, "sort_type": 0, "subdraft_filter_type": 0}]},
            {"type": 1, "value": [{"child_id": e["id"], "parent_id": ""} for e in [none_e] + files]},
            {"type": 2, "value": []}]})
        wj("key_value.json", {})
        wj("performance_opt_info.json", {"manual_cancle_precombine_segs": None, "need_auto_precombine_segs": None})
        for fn in ("attachment_pc_common.json", "draft_agency_config.json"):
            shutil.copy(T21 / fn, dst / fn)
        (dst / "draft_biz_config.json").write_text("", encoding="utf-8")
        fid0, _, _, video0, t0 = self.subdrafts[0]
        cover(video0, t0, dst / "draft_cover.jpg", "540:960")


def name_of(p):
    return f"{p['piece']} t{p['take']}{' ★' if p['pick'] else ''} - {LABEL[p['piece']]}"


def build_ads():
    pr = Project(PROJECT_ADS); tls = []
    for tname, pieces in sel.BANKS:
        tid = U()
        content, rows = pr.timeline(tid, [(p, name_of(p)) for x in pieces for p in by_piece[x]])
        tls.append((tid, tname, content, rows))
    tid = U(); content, rows = pr.sounds_timeline(tid); tls.append((tid, "SONIDOS", content, rows))
    return pr, tls


def build_vsl():
    pr = Project(PROJECT_VSL); tls = []
    markers = []
    for x in sel.VSL_PARTS:
        p = PICK[x]
        markers.append((f_floor_us(p["onset"]), f"{x} ★ {LABEL[x].split(' - ', 1)[-1].strip()}"))
    tid = U(); content, rows = pr.timeline(tid, [], raw_whole=(sel.VSL_RAW_VIDEO, markers)); tls.append((tid, "VSL RAW", content, rows))
    tid = U(); content, rows = pr.timeline(tid, [(PICK[x], name_of(PICK[x])) for x in sel.VSL_PARTS]); tls.append((tid, "VSL ARMADO", content, rows))
    return pr, tls


projects = [build_ads(), build_vsl()]
report = {}
for pr, tls in projects:
    print(f"\n=== {pr.name}: {len(tls)} timelines, {len(pr.subdrafts)} compounds, {len(pr.meta_ids)} local files in the media panel")
    report[pr.name] = []
    for tid, tname, content, rows in tls:
        n = sum(len(t["segments"]) for t in content["tracks"])
        print(f"  {tname:14s} {content['duration'] / US:8.2f} s  {n} segments")
        report[pr.name].append({"timeline": tname, "id": tid, "dur_s": round(content["duration"] / US, 3), "rows": rows})
        for r in rows[:4] if tname != "SONIDOS" else rows:
            if "captions" in r and isinstance(r["captions"], list):
                print(f"      {r['at']:7.2f}  {r['name'][:46]:46s} in {r['in']:5.2f} dur {r['dur']:5.2f} of {r['clip']:6.2f}  off {r['off_ms']:+6.1f} ms | {' / '.join(r['captions'])[:80]}")
            else:
                print(f"      {r['at']:7.2f}  {r['name'][:46]:46s} dur {r['dur']:6.2f}  {r.get('source', '')} {('captions ' + str(r['captions'])) if 'captions' in r else ''} {('markers ' + str(len(r['markers']))) if 'markers' in r else ''}")
(EDIT / "capcut_result.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
print("\nreport:", EDIT / "capcut_result.json")
if not WRITE:
    print("DRY RUN: nothing written. Run with --write (CapCut closed).")
    sys.exit(0)
assert subprocess.run(["pgrep", "-x", "CapCut"], capture_output=True).returncode != 0, "CapCut is running: quit it first"
for pr, tls in projects:
    pr.write(tls)
    print("written:", pr.dir)
