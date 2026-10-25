"""Joaquín's caption text rules (read from Joaquín's V5 CapCut captions): phrases of 3 to 7 words, lowercase, no periods or commas,
¿? kept, numbers as digits, brand and place names capitalised. Poppins Bold has no glyph for the guaraní sign: bare numbers only."""
import re

KEEP = {"whatsapp": "WhatsApp", "google": "Google", "chatgpt": "ChatGPT", "instagram": "Instagram", "paraguay": "Paraguay",
        "brasil": "Brasil", "europa": "Europa", "luque": "Luque", "limpio": "Limpio", "internet": "Internet", "ia": "IA",
        "seo": "SEO", "joaquín": "Joaquín", "caballero": "Caballero", "caaguazú": "Caaguazú", "claude": "Claude"}
# (words as said, lowercase, no punctuation) -> caption text; applied longest first
NUMBERS = [
    ("tres de cada diez", "3 de cada 10"), ("tres de cada 10", "3 de cada 10"), ("setenta por ciento", "70%"), ("70 %", "70%"), ("cuarenta y tres", "43"), ("seis minutos", "6 minutos"),
    ("cinco minutos", "5 minutos"), ("tres segundos", "3 segundos"), ("tres propuestas", "3 propuestas"), ("dos minutos", "2 minutos"),
    ("dos cosas", "2 cosas"), ("tres diseños", "3 diseños"), ("cinco diferencias", "5 diferencias"), ("build2klik", "Built to Click"),
    ("ciento treinta y seis", "136"), ("ciento treinta", "130"),
    ("cuarenta y dos", "42"), ("nueve de cada diez", "9 de cada 10"), ("dos de la mañana", "2 de la mañana"),
    ("tres de la mañana", "3 de la mañana"), ("cuatro segundos", "4 segundos"), ("catorce días", "14 días"),
    ("día catorce", "día 14"), ("diecisiete años", "17 años"), ("tres meses", "3 meses"), ("dos semanas", "2 semanas"),
    ("doscientas", "200"), ("cincuenta", "50"), ("san lorenzo", "San Lorenzo"),
]
SPLIT_BEFORE = {"que", "y", "pero", "porque", "para", "si", "cuando", "donde", "con", "en", "a", "tu", "de", "hicieron",
                "también", "es", "no", "vas", "te", "vos"}
# a phrase never ends on these (they bind to the next word)
GLUE = {"lo", "al", "a", "de", "la", "el", "los", "las", "que", "y", "en", "un", "una", "mis", "tu", "tus", "su", "es", "con",
        "para", "por", "del", "yo", "te", "se", "le", "me", "no", "mi", "o", "más", "muy", "qué", "cómo", "este", "esta", "esa",
        "ese", "uno", "otro", "vos", "si", "donde", "cuando", "pero", "acá", "sola", "va", "voy", "vas", "puede", "ya", "todo",
        "todas", "todos", "casi", "solo", "le", "les", "eso", "base", "tiene"}
MAX_WORDS = 8
PAUSE = 0.40


def glue(t):
    b = bare(t["t"])
    return b in GLUE or b.replace(".", "").isdigit()


def bare(t):
    return re.sub(r"[¿?¡!.,;:\"'…“”()\-\u2014]", "", t.lower()).strip()


def tokens(words):
    """Scribe words (t, s, e) -> caption tokens (text, s, e, sentence_end, comma) with the number phrases merged."""
    out, i = [], 0
    while i < len(words):
        hit = None
        for said, shown in sorted(NUMBERS, key=lambda x: -len(x[0].split())):
            n = len(said.split())
            if [bare(w["t"]) for w in words[i:i + n]] == said.split():
                hit = (n, shown)
                break
        n, shown = hit if hit else (1, None)
        grp = words[i:i + n]
        raw_first, raw_last = grp[0]["t"], grp[-1]["t"]
        if shown is None:
            b = bare(raw_first)
            shown = KEEP.get(b, b)
        if raw_first.startswith("¿"):
            shown = "¿" + shown
        end = raw_last.rstrip()
        q = end.endswith("?")
        if q:
            shown += "?"
        out.append({"t": shown, "s": grp[0]["s"], "e": grp[-1]["e"], "end": end.endswith((".", "?", "!")) or end.endswith("..."),
                    "comma": end.endswith(",")})
        i += n
    return out


def chunks(words):
    """Group tokens into caption phrases: sentence ends always break, commas and pauses > 0.35 s break a phrase of 3+,
    anything over MAX_WORDS splits at the best point (longest pause, before a conjunction)."""
    toks = tokens(words)
    groups, cur = [], []
    nw = lambda g: sum(len(t["t"].split()) for t in g)
    for k, t in enumerate(toks):
        if cur:
            gap = t["s"] - cur[-1]["e"]
            if (cur[-1]["comma"] and nw(cur) >= 3) or (gap > PAUSE and nw(cur) >= 2 and not glue(cur[-1])):
                groups.append(cur); cur = []
        cur.append(t)
        if t["end"]:
            groups.append(cur); cur = []
    if cur:
        groups.append(cur)
    out = []
    for g in groups:
        while nw(g) > MAX_WORDS:
            best, score = None, -1e9
            for j in range(2, len(g) - 1):
                left = nw(g[:j])
                if left < 2 or nw(g[j:]) < 2:
                    continue
                sc = min(g[j]["s"] - g[j - 1]["e"], 0.5) * 10 + (1.0 if bare(g[j]["t"]) in SPLIT_BEFORE else 0) \
                    + (1.5 if g[j - 1]["comma"] else 0) - abs(left - nw(g) / 2) * 0.25
                if glue(g[j - 1]):
                    sc -= 6
                if left > MAX_WORDS:
                    sc -= 5
                if sc > score:
                    best, score = j, sc
            if best is None:
                break
            out.append(g[:best]); g = g[best:]
        out.append(g)
    return out
