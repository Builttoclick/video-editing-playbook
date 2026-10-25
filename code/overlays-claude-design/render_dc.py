"""Render Claude Design's CODE bundle of the overlays (ENTREGA/DC-v2/<piece>.dc.html, its animations-v3 engine)
locally, frame-exact, straight to ProRes 4444 with a REAL alpha channel.

No magenta, no chroma key, no coloured rim: the stage background (#FF00FF in overlay-kit's Root) is overridden to
transparent with a CSS !important rule, headless Edge is told the page's default background is transparent, and
Page.captureScreenshot (PNG) then carries alpha. Every PNG is piped to ffmpeg (image2pipe -> prores_ks 4444, 16-bit
alpha, tagged BT.709); nothing touches the disk but the .mov. Same seek protocol as
VIDEOS/tools/claude-design/render_design_video.py: CustomEvent 'data-om-seek-to-time-frame' {time, sync:true} on
svg[data-om-exportable-video-with-duration-secs], two rAFs, screenshot the svg rect.

Design built the 28 pieces as code (zip of 05-oct-2026 22:52: .dc.html + animations-v3.jsx + overlay-kit.jsx +
piezas/*.jsx + assets/) instead of exporting video. Frames = round(duration * 30), duration = the engine's own attribute
(= the sum of OM_SCENES durations in the page).

NEVER attach a second DevTools client (another websocket on the worker's port) while a render runs: when that client
disconnects, Chrome drops the default-background override of the page and every later frame comes out on opaque white
(05-oct-2026: one diagnostic connection at 23:06 spoiled all four workers at once). The script now re-applies the
override before every capture and refuses a piece whose first or last frame (outside the window) is not empty.

usage: python _render_dc.py [piece ...] [--workers 4]   default: every DC-v2/*.dc.html -> ENTREGA/PRORES/<piece>.mov
       python _render_dc.py N1 --test                     probe PNGs into ENTREGA/_qa/test/ + alpha stats + speed, no .mov
"""
import argparse, base64, ctypes, io, json, os, queue, re, shutil, subprocess, sys, tempfile, threading, time, urllib.parse, urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from websocket import create_connection

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)
HERE = os.path.dirname(os.path.abspath(__file__))
DC = os.path.join(HERE, "ENTREGA", "DC-v2")
OUT = os.path.join(HERE, "ENTREGA", "PRORES")
QA = os.path.join(HERE, "ENTREGA", "_qa", "test")
if os.name == "nt":
    FF, FP = shutil.which("ffmpeg") or "ffmpeg.exe", shutil.which("ffprobe") or "ffprobe.exe"
else:                                                            # the Mac (07-oct-2026): Homebrew's ffmpeg has prores_ks
    FF, FP = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg", shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
EDGE = os.environ.get("CHROME") or (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" if os.name == "nt" else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")  # any Chromium build; set CHROME to override
SCRATCH = os.path.join(os.environ.get("TEMP") or tempfile.gettempdir(), "dc-render")
HEADLESS = ("old", "new") if os.name == "nt" else ("new",)      # some Mac builds have no old headless mode
W, H, FPS = 1080, 1920, 30
PORT = 8766

SETUP_JS = r"""
(async () => {
  const svg = document.querySelector('svg[data-om-exportable-video-with-duration-secs]');
  if (!document.getElementById('btc-alpha')) {
    const st = document.createElement('style'); st.id = 'btc-alpha';
    st.textContent = 'html,body,[data-om-starter]{background:transparent!important}'
      + 'svg[data-om-exportable-video-with-duration-secs]{box-shadow:none!important}'
      + 'svg[data-om-exportable-video-with-duration-secs]>foreignObject>div{background:transparent!important}';
    document.head.appendChild(st);
  }
  const sample = 'Las 2 de la manana - negocio cerca de mi - 0123456789 AEIOU';
  await Promise.all([600, 700, 800].map(w => document.fonts.load(w + ' 40px Poppins', sample))
    .concat([400, 500].map(w => document.fonts.load(w + ' 40px Roboto', sample))));
  await document.fonts.ready;
  const dur = parseFloat(svg.getAttribute('data-om-exportable-video-with-duration-secs'));
  window.__imgs = async () => {
    const pend = [...document.images].filter(i => !i.complete);
    await Promise.all(pend.map(i => new Promise(r => { i.addEventListener('load', r, {once: true}); i.addEventListener('error', r, {once: true}); })
      .then(() => i.decode().catch(() => {}))));
    return pend.length;
  };
  window.__seek = (t) => new Promise(res => {
    svg.dispatchEvent(new CustomEvent('data-om-seek-to-time-frame', { detail: { time: t, sync: true } }));
    requestAnimationFrame(() => requestAnimationFrame(() => res(true)));
  });
  window.__frame = async (t) => { await window.__seek(t); if (await window.__imgs()) await window.__seek(t); return true; };
  // warm-up: mount everything once, so every asset is fetched (overlay-kit turns them into data URLs) and shaped
  for (let t = 0; t <= dur; t += 0.2) await window.__frame(t);
  await document.fonts.ready;
  await window.__frame(0);
  const r = svg.getBoundingClientRect();
  const faces = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.weight);
  const broken = [...document.images].filter(i => !i.naturalWidth).map(i => i.src.slice(0, 90));
  return JSON.stringify({ rect: [r.x, r.y, r.width, r.height], dur, fonts: [...new Set(faces)], imgs: document.images.length, broken: [...new Set(broken)] });
})()
"""


class Quiet(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".jsx": "text/javascript", ".js": "text/javascript"}

    def log_message(self, *a):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 128


class CDP:
    def __init__(self, url):
        self.ws = create_connection(url, timeout=180, suppress_origin=True)
        self.i = 0

    def call(self, method, params=None):
        self.i += 1
        self.ws.send(json.dumps({"id": self.i, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.i:
                if "error" in msg:
                    raise RuntimeError("%s: %s" % (method, msg["error"]))
                return msg.get("result", {})

    def js(self, expr, wait=False):
        r = self.call("Runtime.evaluate", {"expression": expr, "awaitPromise": wait, "returnByValue": True})
        if "exceptionDetails" in r:
            raise RuntimeError("JS error: " + json.dumps(r["exceptionDetails"])[:800])
        return r.get("result", {}).get("value")


def launch_edge(k):
    port = 9330 + k
    prof = os.path.join(SCRATCH, "edge_prof_%d" % k)
    for mode in HEADLESS:
        args = [EDGE, "--headless=%s" % mode, "--remote-debugging-port=%d" % port, "--remote-allow-origins=*",
                "--user-data-dir=%s" % prof, "--window-size=%d,%d" % (W, H + 45), "--hide-scrollbars", "--mute-audio",
                "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync",
                "--disable-component-update", "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
                "--disable-backgrounding-occluded-windows", "--disable-checker-imaging", "--force-device-scale-factor=1", "about:blank"]
        proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % port, timeout=2) as r:
                    pages = [t for t in json.load(r) if t.get("type") == "page"]
                if pages:
                    return proc, pages[0]["webSocketDebuggerUrl"], mode
            except Exception:
                pass
            time.sleep(0.3)
        proc.kill()
    raise RuntimeError("worker %d: DevTools never came up" % k)


def open_piece(c, piece):
    """Navigate the worker's page to one piece, set it up, return its info (rect, dur, fonts, broken imgs)."""
    c.call("Emulation.setDeviceMetricsOverride", {"width": W, "height": H + 45, "deviceScaleFactor": 1, "mobile": False})
    c.call("Emulation.setDefaultBackgroundColorOverride", TRANSPARENT)
    c.call("Page.navigate", {"url": "http://127.0.0.1:%d/%s" % (PORT, urllib.parse.quote(piece + ".dc.html"))})
    t0 = time.time()
    while True:
        try:
            if c.js("location.href.startsWith('http') && !!document.querySelector('svg[data-om-exportable-video-with-duration-secs]')"):
                break
        except RuntimeError:
            pass
        if time.time() - t0 > 90:
            raise RuntimeError("%s: stage never mounted" % piece)
        time.sleep(0.25)
    info = json.loads(c.js(SETUP_JS, wait=True))
    x, y, w, h = info["rect"]
    if [w, h] != [W, H] or not float(x).is_integer() or not float(y).is_integer() or info["broken"]:
        raise RuntimeError("%s: bad setup %s" % (piece, info))
    return info


TRANSPARENT = {"color": {"r": 0, "g": 0, "b": 0, "a": 0}}


def shot(c, origin, n):
    c.js("window.__frame(%d/%d)" % (n, FPS), wait=True)
    c.call("Emulation.setDefaultBackgroundColorOverride", TRANSPARENT)     # cheap, and it is what keeps the alpha
    r = c.call("Page.captureScreenshot", {"format": "png", "optimizeForSpeed": True,
                                          "clip": {"x": origin[0], "y": origin[1], "width": W, "height": H, "scale": 1}})
    return base64.b64decode(r["data"])


def count_frames(path):
    out = subprocess.run([FP, "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                          "stream=codec_name,pix_fmt,width,height,nb_read_frames", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return out


def render_piece(c, piece, log):
    info = open_piece(c, piece)
    n = int(round(info["dur"] * FPS))
    dst = os.path.join(OUT, piece + ".mov")
    tmp = dst + ".part.mov"
    if os.path.isfile(dst):
        facts = count_frames(dst)
        if facts and int(facts.split(",")[-1]) == n:
            log("%-4s already rendered (%d frames), skipped" % (piece, n))
            return n
    enc = subprocess.Popen([FF, "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le",
                            "-c:v", "prores_ks", "-profile:v", "4444", "-alpha_bits", "16", "-vendor", "apl0",
                            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
                            "-r", str(FPS), tmp], stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    t0 = time.time()
    origin = info["rect"][:2]
    ends = {}
    for k in range(n):
        png = shot(c, origin, k)
        if k in (0, n - 1):
            ends[k] = png
        enc.stdin.write(png)
    enc.stdin.close()
    from PIL import Image
    for k, png in ends.items():
        al = Image.open(io.BytesIO(png)).convert("RGBA").getchannel("A")
        if al.getextrema()[1] != 0:
            enc.wait()
            os.remove(tmp)
            raise RuntimeError("%s: frame %d (outside the window) is not empty: the background went opaque, render again" % (piece, k))
    err = enc.stderr.read().decode("utf-8", "replace")
    enc.wait()
    if enc.returncode:
        raise RuntimeError("%s: ffmpeg %d %s" % (piece, enc.returncode, err[-400:]))
    facts = count_frames(tmp)
    got = int(facts.split(",")[-1])
    if got != n:
        raise RuntimeError("%s: %d frames encoded, %d expected (%s)" % (piece, got, n, facts))
    os.replace(tmp, dst)
    dt = time.time() - t0
    log("%-4s %d frames (%.3f s) in %.0f s = %.1f fps -> %s (%.0f MB), fonts %d, imgs %d" % (
        piece, n, info["dur"], dt, n / dt, os.path.relpath(dst, HERE), os.path.getsize(dst) / 1e6, len(info["fonts"]), info["imgs"]))
    return n


def close(proc, c):
    try:
        c.call("Browser.close")
    except Exception:
        pass
    try:
        proc.wait(10)
    except Exception:
        proc.kill()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pieces", nargs="*")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--test", action="store_true")
    a = ap.parse_args()
    pieces = a.pieces or sorted(os.path.splitext(os.path.splitext(f)[0])[0] for f in os.listdir(DC) if f.endswith(".dc.html"))
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SCRATCH, exist_ok=True)
    if os.name == "nt":
        k32 = ctypes.windll.kernel32
        k32.SetPriorityClass(k32.GetCurrentProcess(), 0x80)
    httpd = Server(("127.0.0.1", PORT), partial(Quiet, directory=DC))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    lock = threading.Lock()

    def log(s):
        with lock:
            print(time.strftime("%H:%M:%S"), s)

    if a.test:
        os.makedirs(QA, exist_ok=True)
        piece = pieces[0]
        proc, ws, mode = launch_edge(0)
        c = CDP(ws)
        t0 = time.time()
        info = open_piece(c, piece)
        log("setup %.1f s (%s headless) %s" % (time.time() - t0, mode, info))
        src = open(os.path.join(DC, "piezas", piece + ".jsx"), encoding="utf-8").read()
        m = re.search(r"PIEZA_INFO(?:\.%s|\['%s'\]) = \{ a: ([\d.]+), b: ([\d.]+) \}" % (re.escape(piece), re.escape(piece)), src)
        a_, b_ = float(m.group(1)), float(m.group(2))
        times = [0.5, a_ - 0.034, a_ + 0.3, a_ + (b_ - a_) * 0.25, a_ + (b_ - a_) * 0.5, a_ + (b_ - a_) * 0.75, b_ - 0.4, b_ - 0.034, b_ + 0.5]
        origin = info["rect"][:2]
        from PIL import Image
        import numpy as np
        for t in times:
            n = int(round(t * FPS))
            png = shot(c, origin, n)
            p = os.path.join(QA, "%s_f%04d_%.2fs.png" % (piece, n, t))
            open(p, "wb").write(png)
            im = np.asarray(Image.open(io.BytesIO(png)).convert("RGBA"))
            al = im[..., 3]
            vis = al > 0
            mag = vis & (im[..., 0] > 200) & (im[..., 1] < 80) & (im[..., 2] > 200)
            log("t=%6.2f f%04d  alpha0 %5.1f%%  alpha255 %5.1f%%  partial %5.1f%%  magenta px %d  %s" % (
                t, n, 100 * (al == 0).mean(), 100 * (al == 255).mean(), 100 * ((al > 0) & (al < 255)).mean(), int(mag.sum()), os.path.basename(p)))
        t1 = time.time()
        seq = list(range(int(round(a_ * FPS)) + 10, int(round(a_ * FPS)) + 55))
        for n in seq:
            shot(c, origin, n)
        dt = time.time() - t1
        log("1 worker: %d frames in %.1f s = %.1f fps" % (len(seq), dt, len(seq) / dt))
        close(proc, c)
        return

    q = queue.Queue()
    for p in pieces:
        q.put(p)
    k = max(1, min(a.workers, len(pieces)))
    results, errors = {}, []

    def work(i):
        try:
            proc, ws, mode = launch_edge(i)
        except Exception as e:
            errors.append("boot %d: %s" % (i, e)); return
        c = CDP(ws)
        log("worker %d up (%s headless)" % (i, mode))
        gen = 0
        while True:
            try:
                piece = q.get_nowait()
            except queue.Empty:
                break
            for attempt in range(3):
                try:
                    results[piece] = render_piece(c, piece, log)
                    break
                except Exception as e:
                    log("worker %d: %s failed (attempt %d): %s" % (i, piece, attempt + 1, str(e)[:160]))
                    close(proc, c)
                    gen += 1
                    try:
                        proc, ws, mode = launch_edge(i + 10 * gen)     # fresh browser, fresh port
                        c = CDP(ws)
                        log("worker %d relaunched (%s headless)" % (i, mode))
                    except Exception as e2:
                        errors.append("worker %d relaunch: %s" % (i, e2)); log("worker %d: relaunch failed: %s" % (i, e2)); return
            else:
                errors.append("%s: failed 3 times" % piece)
        close(proc, c)

    t0 = time.time()
    ths = [threading.Thread(target=work, args=(i,)) for i in range(k)]
    for t in ths:
        t.start()
    for t in ths:
        t.join()
    tot = sum(results.values())
    log("done: %d/%d pieces, %d frames in %.0f s (%.1f fps overall), errors: %s" % (len(results), len(pieces), tot, time.time() - t0, tot / max(time.time() - t0, 1), errors or "none"))
    if errors or len(results) != len(pieces):
        sys.exit(1)


if __name__ == "__main__":
    main()
