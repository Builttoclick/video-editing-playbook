"""Make a script-written CapCut draft openable on the Mac: media in ~/Documents -> APFS clones in ~/Movies.

CapCut Mac is an App Store (sandboxed) app: it reads ~/Movies on its own, anything else only through its own file
dialog (bookmarks in User Data/Config/com.lemon.lvoverseas.bookmark.plist). A draft written by a script that points at
~/Documents/... opens with "Couldn't find some of the imported media files" (seen on 23-oct-2026).

    python3 relink_movies.py "VSL V2 1020" "ADS V7 1020"           dry run, counts only
    python3 relink_movies.py "VSL V2 1020" "ADS V7 1020" --write   backup, clone media, rewrite paths, validate

Run it with CapCut quit, right after capcut_vN.py --write. Clones (cp -c) cost no disk; they do NOT follow later
changes to the original (re-export a wav in Documents -> delete its clone and run this again).
"""
import datetime, json, os, re, subprocess, sys

HOME = os.path.expanduser("~")
DRAFTS = f"{HOME}/Movies/CapCut/User Data/Projects/com.lveditor.draft"
OLD = os.environ.get("RELINK_FROM", f"{HOME}/Documents/")      # where the script-written draft points today
NEW = os.environ.get("RELINK_TO", f"{HOME}/Movies/MEDIA/")      # a folder under ~/Movies (CapCut can read it)
BACKUP = f"{NEW}_draft-backups/{datetime.date.today()}"
PROJECTS = [a for a in sys.argv[1:] if not a.startswith("--")]
WRITE = "--write" in sys.argv
RX = re.compile(re.escape(OLD.encode()) + rb'[^"\x00-\x1f]*')

if not PROJECTS:
    sys.exit(__doc__)
if WRITE and subprocess.run(["pgrep", "-x", "CapCut"], capture_output=True).returncode == 0:
    sys.exit("CapCut is running: quit it first (it rewrites the draft on close)")

def files_of(proj):
    for root, _, fs in os.walk(os.path.join(DRAFTS, proj)):
        for f in fs:
            yield os.path.join(root, f)

# 1. every Documents path the drafts use
paths = set()
for proj in PROJECTS:
    if not os.path.isdir(os.path.join(DRAFTS, proj)):
        sys.exit(f"no such project: {proj}")
    for p in files_of(proj):
        paths.update(m.group(0) for m in RX.finditer(open(p, "rb").read()))
print(f"{len(paths)} media paths under {OLD}")
missing = [p.decode() for p in paths if not os.path.isfile(p.decode())]
if missing:
    sys.exit(f"MISSING on disk, stopping: {missing}")

if WRITE:
    # 2. backup (APFS clone, outside the drafts root so CapCut never lists it as a project)
    os.makedirs(BACKUP, exist_ok=True)
    for proj in PROJECTS:
        dst = os.path.join(BACKUP, proj)
        if not os.path.exists(dst):
            subprocess.run(["cp", "-cR", os.path.join(DRAFTS, proj), dst], check=True)
    print("backup ->", BACKUP)

    # 3. clone the media into the ~/Movies folder, same relative path
    for p in sorted(paths):
        src = p.decode(); dst = src.replace(OLD, NEW, 1)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst):
            subprocess.run(["cp", "-cp", src, dst], check=True)
        assert os.path.getsize(src) == os.path.getsize(dst), dst
        print("clone ok", dst.replace(HOME, "~"))

# 4. rewrite every occurrence, validate JSON
for proj in PROJECTS:
    n_proj = 0
    for p in files_of(proj):
        raw = open(p, "rb").read()
        n = sum(raw.count(x) for x in paths)
        if not n:
            continue
        new = raw
        for x in paths:
            new = new.replace(x, x.replace(OLD.encode(), NEW.encode(), 1))
        try:
            json.loads(raw); was_json = True
        except Exception:
            was_json = False
        if was_json:
            json.loads(new)  # raises if the rewrite broke it
        if WRITE:
            tmp = p + ".relink-tmp"
            with open(tmp, "wb") as fh:
                fh.write(new)
            os.chmod(tmp, os.stat(p).st_mode)
            os.replace(tmp, p)
        n_proj += n
    print(f"{proj}: {n_proj} path occurrences {'rewritten' if WRITE else 'to rewrite'}")

# 5. nothing left pointing at Documents
if WRITE:
    left = [p for proj in PROJECTS for p in files_of(proj) if OLD.encode() in open(p, "rb").read()]
    print("files still pointing at Documents:", left or "none")
