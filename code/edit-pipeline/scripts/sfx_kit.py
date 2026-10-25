"""Synthesize the house SFX kit (no samples, no licences) into assets/sfx/ + catalog.json.

usage: python sfx_kit.py            (re-run any time; deterministic)

Every sound is built from noise, sines and filters, so there is never a licence question in a paid ad.
catalog.json per sound: duration, hit_ms (where the transient/peak lands: the file starts that much before
the event), ref_db (loudest 100 ms RMS, dBFS), rel_db (default level relative to the voice), what it is for.
render.py places a cue at: gain = voice_ref - ref_db + rel_db.
"""
import json, math, wave
from pathlib import Path
import numpy as np

SR = 48000
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sfx'
rng = np.random.default_rng(7)


def t_axis(d):
    return np.arange(int(d * SR)) / SR


def svf_band(x, fc, q=0.7):
    """Chamberlin state-variable band-pass with a per-sample centre frequency (Hz array)."""
    low = band = 0.0
    out = np.empty_like(x)
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    damp = 1 / q
    for n in range(len(x)):
        high = x[n] - low - damp * band
        band += f[n] * high
        low += f[n] * band
        out[n] = band
    return out


def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR)
    y = np.empty_like(x); prev = 0.0
    for n in range(len(x)):
        prev = (1 - a) * x[n] + a * prev
        y[n] = prev
    return y


def pan(mono, pos):
    """Equal-power pan; pos in -1..1 (scalar or array)."""
    pos = np.broadcast_to(np.asarray(pos, dtype=float), mono.shape)
    ang = (pos + 1) * np.pi / 4
    return np.stack([mono * np.cos(ang), mono * np.sin(ang)], axis=1)


def glide(f0, f1, d, curve=1.0):
    t = t_axis(d)
    f = f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env_exp(d, tau):
    return np.exp(-t_axis(d) / tau)


def fade_edges(x, a=0.002, b=0.01):
    n_a, n_b = int(a * SR), int(b * SR)
    x = x.copy()
    if n_a:
        x[:n_a] *= np.linspace(0, 1, n_a)[:, None] if x.ndim == 2 else np.linspace(0, 1, n_a)
    if n_b:
        x[-n_b:] *= np.linspace(1, 0, n_b)[:, None] if x.ndim == 2 else np.linspace(1, 0, n_b)
    return x


# ---------------------------------------------------------------- the sounds
def whoosh(d=0.6, f_lo=260, f_hi=2600, peak=0.62, width=0.9):
    t = t_axis(d); x = t / d
    rise = np.clip(x / peak, 0, 1) ** 2.2
    fall = np.exp(-np.clip(x - peak, 0, None) / (0.16 * (1 - peak) + 1e-3))
    env = rise * np.where(x <= peak, 1, fall)
    fc = f_lo + (f_hi - f_lo) * np.where(x <= peak, (x / peak) ** 1.5, np.exp(-(x - peak) * 6))
    noise = rng.standard_normal(len(t))
    y = svf_band(noise, fc, q=1.4) * env
    air = svf_band(rng.standard_normal(len(t)), fc * 2.2, q=2.5) * env * 0.35
    return pan(y + air, np.linspace(-width, width, len(t)))


def swoosh_up(d=0.42):
    t = t_axis(d); x = t / d
    env = x ** 1.8 * np.exp(-np.clip(x - 0.88, 0, None) * 40)
    fc = 380 * (4200 / 380) ** x
    y = svf_band(rng.standard_normal(len(t)), fc, q=1.6) * env
    return pan(y, np.linspace(-0.4, 0.5, len(t)))


def swipe(d=0.22):
    t = t_axis(d); x = t / d
    env = np.sin(np.pi * x) ** 1.4
    fc = 1500 + 3600 * x
    y = svf_band(rng.standard_normal(len(t)), fc, q=1.8) * env
    return pan(y, np.linspace(0.3, -0.3, len(t)))


def riser(d=1.6):
    t = t_axis(d); x = t / d
    env = (np.exp(3.2 * x) - 1) / (math.e ** 3.2 - 1)
    fc = 180 * (6500 / 180) ** (x ** 1.3)
    noise = svf_band(rng.standard_normal(len(t)), fc, q=1.1)
    tone = 0.18 * (glide(140, 880, d, 1.6) + 0.6 * glide(141.5, 887, d, 1.6))
    y = (noise + tone) * env
    y[-int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))
    return pan(y, np.linspace(-0.2, 0.2, len(t)))


def impact(d=1.1, sub_from=92, sub_to=36, tau=0.30, tail=0.34):
    t = t_axis(d)
    sub = glide(sub_from, sub_to, 0.3, 0.5)
    sub = np.concatenate([sub, np.sin(2 * np.pi * sub_to * t_axis(d - 0.3) + 0.5)])[:len(t)] * env_exp(d, tau)
    click = np.zeros(len(t)); n = int(0.008 * SR)
    click[:n] = rng.standard_normal(n) * np.linspace(1, 0, n)
    thump = svf_band(rng.standard_normal(len(t)), np.full(len(t), 320.0), q=0.9) * env_exp(d, 0.05)
    l = onepole_lp(rng.standard_normal(len(t)), 900) * env_exp(d, tail) * 0.55
    r = onepole_lp(rng.standard_normal(len(t)), 900) * env_exp(d, tail) * 0.55
    mono = sub * 1.0 + click * 0.35 + thump * 0.6
    return np.stack([mono + l, mono + r], axis=1)


def thud():
    return impact(d=0.32, sub_from=120, sub_to=60, tau=0.07, tail=0.06)


def pop(d=0.10):
    y = glide(920, 340, d, 0.7) * env_exp(d, 0.02)
    n = int(0.003 * SR); y[:n] += rng.standard_normal(n) * 0.3
    return pan(y, 0.0)


def tap(d=0.06):
    return pan(glide(1300, 720, d, 0.6) * env_exp(d, 0.011) * 0.8, 0.0)


def click(d=0.045):
    e = env_exp(d, 0.005)
    noise = rng.standard_normal(len(e)) * e
    body = 0.45 * np.sin(2 * np.pi * 1400 * t_axis(d)) * e
    y = noise + body
    y = y - onepole_lp(y, 2500)
    return pan(y, 0.0)


def tick(d=0.025):
    e = env_exp(d, 0.003)
    y = rng.standard_normal(len(e)) * e
    return pan(y - onepole_lp(y, 3500), 0.0)


def bell(f, d, taus=(0.55, 0.28, 0.12), ratios=(1, 2.76, 5.40), amps=(1, 0.45, 0.2)):
    t = t_axis(d)
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau) for r, a, tau in zip(ratios, amps, taus))
    att = int(0.003 * SR); y[:att] *= np.linspace(0, 1, att)
    return y


def ding(d=0.8):
    return pan(bell(1568, d), 0.0)


def notify(d=0.6):
    """Generic two-note message chime (not any app's real sound)."""
    a = bell(1046.5, 0.45, taus=(0.10, 0.06, 0.04))
    a[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))     # no hard stop inside the chime
    b = bell(1568.0, d - 0.11, taus=(0.16, 0.08, 0.04))
    y = np.zeros(int(d * SR)); y[:len(a)] += a; y[int(0.11 * SR):int(0.11 * SR) + len(b)] += b
    return pan(y, 0.0)


def shutter(d=0.26):
    y = np.zeros(int(d * SR))
    for at, amp in ((0.0, 1.0), (0.075, 0.8)):
        n = int(0.03 * SR); s = int(at * SR)
        burst = svf_band(rng.standard_normal(n), np.full(n, 4200.0), q=0.8) * env_exp(0.03, 0.006)
        mech = 0.5 * np.sin(2 * np.pi * 210 * t_axis(0.03)) * env_exp(0.03, 0.01)
        y[s:s + n] += amp * (burst + mech)
    return pan(y, 0.0)


KIT = [
    # name, builder, hit_ms, rel_db (vs voice), use
    ('tap', tap, 2, -20, 'snap zoom / tiny UI landing; the quietest cue, barely felt'),
    ('pop', pop, 3, -12, 'a text card, chip, number or emoji appearing'),
    ('click', click, 1, -14, 'a click or button press on screen'),
    ('tick', tick, 1, -18, 'typing (every ~7 characters) or a list item'),
    ('swipe', swipe, 110, -14, 'a list line or screen sliding in'),
    ('whoosh_short', lambda: whoosh(0.36, 300, 2800, 0.6), 216, -12, 'the cut between two beats (hook->body->CTA)'),
    ('whoosh', whoosh, 372, -11, 'a big transition, a full-screen card in or out'),
    ('swoosh_up', swoosh_up, 370, -13, 'a push-in or an element rising into frame'),
    ('riser', riser, 1600, -13, 'the 1.6 s BEFORE a reveal: its end lands on the reveal'),
    ('impact', impact, 5, -8, 'the reveal itself: price, key number, the big claim (max 1-2 per ad)'),
    ('thud', thud, 4, -10, 'a stamp, a strike-through, a hard stop'),
    ('ding', ding, 3, -11, 'a win: a result, a check mark, "listo"'),
    ('notify', notify, 3, -9, 'a message arriving: WhatsApp, "te escriben", a lead'),
    ('shutter', shutter, 2, -12, 'a photo or screenshot appearing'),
]


def write_wav(path, y):
    y = np.clip(y, -1, 1)
    pcm16 = (y * 32767).astype('<i2')
    with wave.open(str(path), 'w') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm16.tobytes())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cat = []
    for name, fn, hit_ms, rel, use in KIT:
        y = fn()
        if y.ndim == 1:
            y = pan(y, 0.0)
        y = fade_edges(y)
        y = y / (np.abs(y).max() + 1e-9) * 10 ** (-1 / 20)      # peak -1 dBFS
        mono = y.mean(axis=1)
        win = int(0.1 * SR)
        c = np.cumsum(np.concatenate([[0], mono.astype('float64') ** 2]))
        if len(mono) > win:
            rms = np.sqrt((c[win:] - c[:-win]) / win).max()
        else:
            rms = np.sqrt((mono ** 2).mean())
        ref_db = round(20 * math.log10(rms + 1e-9), 2)
        f = OUT / f'{name}.wav'
        write_wav(f, y)
        cat.append({'name': name, 'file': f.name, 'duration': round(len(y) / SR, 3), 'hit_ms': hit_ms,
                    'ref_db': ref_db, 'rel_db': rel, 'use': use, 'source': 'synthesized by sfx_kit.py, no licence needed'})
        print(f'{name:13s} {len(y) / SR:5.2f}s  hit {hit_ms:4d} ms  ref {ref_db:6.1f} dBFS  rel {rel:4d}')
    (OUT / 'catalog.json').write_text(json.dumps(cat, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
