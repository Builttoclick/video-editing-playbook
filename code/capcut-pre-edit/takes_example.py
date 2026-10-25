"""Take selection: the one file a person (or the LLM reading LINES.md) writes by hand. Everything else is code.

Each take: (video, lo, hi, start_anchor, end_anchor, opts).
  video          the phone file (RAW/<video>.MOV), as named in common.TAKE_FILES
  lo, hi         word indices from LINES.md that bracket this attempt (the [123-456] after each line)
  start_anchor   the first words of the take, normalized (lowercase, no punctuation, accents kept)
  end_anchor     the last words of the take
  opts           {"start": "last"} or {"end": "last"} picks the last occurrence inside [lo, hi] instead of the first;
                 {"plus": n} adds n words after the end anchor; {"note": "..."} is for the human reading the bank.

The resolver (plan.py) finds start_anchor inside [lo, hi], then end_anchor after it. Anchors, not timecodes: the LLM
never types a time, it copies words it can see, and the code resolves them to the waveform.

Order inside a piece = recording order. The LAST take of each piece is the pick (marked with a star in CapCut), because
people warm up and the later takes are usually the better ones. Keep the last 2 or 3 complete takes per piece.

This example is a short excerpt of a real shoot (Spanish, Paraguay). Replace it with your own.
"""
V = "IMG_6244"   # the file with every ad piece
W = "IMG_6245"   # the file with the VSL

HOOKS = [
    ("H7", "Las 2 de la mañana", [
        (V, 2768, 2816, "son las dos de la mañana", "durmiendo contigo", {}),
        (V, 2896, 2944, "son las dos de la mañana", "durmiendo contigo", {}),
        (V, 2948, 2996, "son las dos de la mañana", "durmiendo contigo", {"note": "dogs bark right after"}),
    ]),
    ("H13", "Si estás viendo esto", [
        (V, 3565, 3609, "si estás viendo esto", "lo que vos vendés", {}),
        (V, 3611, 3645, "si estás viendo esto", "lo que vos vendés", {}),
        (V, 3669, 3703, "si estás viendo esto", "lo que vos vendés", {}),
    ]),
]

CUERPOS = [
    ("AL1", "A-largo 1 - Mirá cómo compra la gente", [
        (V, 440, 526, "mirá cómo compra la gente", "qué es lo que pasa ahí", {}),
        (V, 552, 634, "mirá cómo compra la gente", "qué es lo que pasa ahí", {}),
        (V, 636, 722, "mirá cómo compra la gente", "qué es lo que pasa ahí", {}),
    ]),
    ("B4", "B 4 - El día 14, todo a tu nombre", [
        (V, 2256, 2312, "y en el día catorce", "a tu nombre", {}),
        (V, 2338, 2394, "y en el día catorce", "a tu nombre", {}),
    ]),
]

CTAS = [
    ("C-WA1", "C-WA1 - Te muestro las páginas", [
        (V, 4573, 4621, "escribime por whatsapp", "para tu negocio", {}),
        (V, 4623, 4671, "escribime por whatsapp", "para tu negocio", {}),
    ]),
]

# A VSL: one pick per part, recorded as one long take. Same format.
VSL = [
    ("P1", "VSL 1 - Apertura", [(W, 690, 792, "qué tal yo soy joaquín", "te escribe al final", {})]),
    ("P2b", "VSL 2b - Mis páginas también son lindas, pero", [(W, 1262, 1326, "está bien mis páginas también", "ya por whatsapp", {})]),
    ("P8b", "VSL 8b - Demo + video análisis", [(W, 4535, 4615, "voy a hacer un demo", "para tu negocio", {"end": "last"})]),
    ("P8d", "VSL 8d - Llená el formulario", [(W, 4793, 4813, "llená el formulario", "espero tu contacto", {})]),
]

PIECES = HOOKS + CUERPOS + CTAS + VSL
PICK = {}                                   # 1-based take per piece; default = the last one

# the bank timelines of the ads project (max 10 timelines per project) + the sounds timeline
BANKS = [
    ("BANCO HOOKS", [p for p, _, _ in HOOKS]),
    ("BANCO CUERPOS", [p for p, _, _ in CUERPOS]),
    ("BANCO CTAS", [p for p, _, _ in CTAS]),
]
# the VSL project: the whole raw clip as one compound (VSL RAW) + the assembled pick (VSL ARMADO)
VSL_RAW_VIDEO = W
VSL_PARTS = [p for p, _, _ in VSL]
