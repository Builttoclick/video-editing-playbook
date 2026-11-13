"""AN-05 "La constructora barata": Joaquín's own analogy from the Looms. Two plots, two houses that look alike until
you move in; two pages that look alike until people come in. Ours on the LEFT, the cheap one on the RIGHT (Joaquín's rule).
Cues + sound events."""
from films.common import F, Sheet, head_frames


def cues(copy):
    s = Sheet("an05", copy)
    f = s.f
    # 1. the two price tags
    s.beat("hook", 0.1, 2.4)
    f["tagCheap"] = {"in": F(0.5), "out": F(7.0)}
    s.beat("mine", 2.4, 4.3)
    f["tagOurs"] = {"in": F(2.6), "out": F(7.0)}
    s.beat("explain", 4.3, 7.0)
    # 2. two plots; the plans on ours, the cheap one builds right away; both rise and finish alike
    s.beat("house", 7.0, 9.3)
    f["plots"] = {"in": F(5.0), "out": F(19.3)}
    f["plans"] = {"in": F(7.6), "out": F(9.2)}
    f["buildCheap"] = {"at": F(7.8), "dur": F(3.4)}
    f["buildOurs"] = {"at": F(9.3), "dur": F(2.6)}
    f["bricks"] = [F(7.9 + i * 0.22) for i in range(16)] + [F(9.4 + i * 0.17) for i in range(16)]
    s.beat("both", 9.3, 12.7)
    s.beat("outside", 12.7, 15.1)
    f["shine"] = [F(12.9), F(13.9)]
    f["slides"] = [F(19.8) + 40 * i for i in range(1, 5)]
    # 3. moving in: trucks park; the cheap one flickers, cracks, drips; ours lights up, the door shuts
    s.beat("move", 15.1, 17.3)
    f["trucks"] = [F(15.3), F(15.5)]
    f["lightsOurs"] = F(16.0)
    f["flicker"] = [F(16.2), F(16.35), F(16.6), F(16.7), F(17.1), F(17.5), F(17.62), F(18.1)]
    f["crack"] = {"at": F(16.9), "dur": F(0.8)}
    f["door"] = F(17.0)
    f["drip"] = [F(17.9), F(18.7)]
    # 4. the same with a page: the houses fold into phones; the template, visitors in and out, 0 messages
    s.beat("same", 19.0, 21.3)
    f["fold"] = F(19.4)
    f["phones"] = {"in": F(19.6), "out": F(38.6)}
    f["template"] = F(19.8)
    s.beat("cheap", 21.3, 24.5)
    s.beat("leave", 24.5, 27.7)
    f["visitors"] = [F(24.7), F(25.3), F(25.9)]
    f["visitorDur"] = F(1.6)
    # 5. ours starts with the plans: chips, the headline writes itself, the button, messages arrive
    s.beat("plans", 27.7, 29.9)
    f["blueprint"] = {"in": F(27.9), "out": F(33.2)}
    s.beat("interview", 29.9, 33.3)
    f["chips"] = [F(30.2), F(31.0)]
    s.beat("write", 33.3, 37.9)
    heads = copy["ours"]["headline"].split(" ")
    f["oursHead"] = [F(33.5) + i * 7 for i in range(len(heads))]
    f["oursButton"] = F(35.0)
    f["oursWa"] = F(35.3)
    f["msgs"] = [F(35.7), F(36.5), F(37.3)]
    # 6. three designs, 14 days
    s.beat("designs", 38.0, 41.8)
    f["props"] = {"in": F(38.2), "cards": [F(38.25), F(38.4), F(38.55)], "pick": F(39.3), "out": F(40.0)}
    f["cal"] = {"in": F(40.2), "out": F(42.2), "tiles": [F(40.4 + i * 0.085) for i in range(14)]}
    # 7. the moral, big
    s.beat("moral", 42.2, 44.7)
    f["moralLand"] = F(42.4)
    f["board"] = F(44.8)
    return s, f["board"] + 130


def events(c, copy, L):
    f, T = c["f"], c["text"]
    ev = []
    POP = 2
    for bid, t in T.items():
        rows = head_frames(copy["beats"][bid]["lines"], t["in"])
        for i, row in enumerate(rows):
            if row:
                ev.append((f"text:{bid}:{i}", "text.long" if len(row) >= 4 else "text", row[0] + 1, i))
    ev.append(("tagCheap", "land", f["tagCheap"]["in"] + 4, 0))
    ev.append(("tagOurs", "hit", f["tagOurs"]["in"] + 3, 0))
    ev.append(("tags:out", "exit", f["tagCheap"]["out"] + 6, 0, L["exit"] - 4))
    ev.append(("plots:in", "land.big", f["plots"]["in"] + 6, 0))
    ev.append(("label:ours", "chip", f["plots"]["in"] + 6 + POP, 0))
    ev.append(("label:cheap", "chip", f["plots"]["in"] + 10 + POP, 1))
    ev.append(("plans:in", "swish", f["plans"]["in"] + 3, 0, L["swish"] - 3))
    ev.append(("plans:out", "swish", f["plans"]["out"] + 3, 0, L["swish"] - 6))
    ev += [(f"brick:{i}", "tick", t + 1, i, L["tick"] + 4) for i, t in enumerate(f["bricks"])]
    ev.append(("cheap:done", "land", f["buildCheap"]["at"] + f["buildCheap"]["dur"] + 2, 0, L["land"] - 2))
    ev.append(("ours:done", "land", f["buildOurs"]["at"] + f["buildOurs"]["dur"] + 2, 0, L["land"] - 2))
    ev += [(f"shine:{i}", "chip", t + POP, i) for i, t in enumerate(f["shine"] + [t + 6 for t in f["shine"]])]
    ev += [(f"slide:{i}", "swish", t + 3, 0, L["swish"] - 7) for i, t in enumerate(f["slides"])]
    ev += [(f"truck:{i}", "land.big", t + 6, 0, L["land.big"] - 3) for i, t in enumerate(f["trucks"])]
    ev.append(("lightsOurs", "chip", f["lightsOurs"] + POP, 1))
    ev += [(f"flicker:{i}", "tick", t, i, L["tick"] + 6) for i, t in enumerate(f["flicker"])]
    ev.append(("crack", "crack", f["crack"]["at"] + 2, 0))
    ev.append(("door", "tock", f["door"] + 2, 0, L["tock"] - 3))
    ev += [(f"drip:{i}", "drip", t + 2, 0) for i, t in enumerate(f["drip"])]
    ev.append(("fold", "whoosh.short", f["fold"] + 6, 0))
    ev.append(("phones:in", "land.big", f["phones"]["in"] + 8, 0))
    ev.append(("template", "pop", f["template"] + 12, 0, L["pop"] - 3))
    for i, t in enumerate(f["visitors"]):
        ev.append((f"visitor:in:{i}", "tick", t + 2, i, L["tick"] + 4))
        ev.append((f"visitor:out:{i}", "swish", t + f["visitorDur"] - 4, 0, L["swish"] - 6))
    ev.append(("blueprint:in", "swish", f["blueprint"]["in"] + 3, 0, L["swish"] - 3))
    ev += [(f"chip:{i}", "chip", t + POP, i) for i, t in enumerate(f["chips"])]
    ev.append(("blueprint:out", "exit", f["blueprint"]["out"] + 4, 0, L["exit"] - 5))
    keys = iter(range(10_000))
    ev += [(f"head:{i}", "key", t, next(keys)) for i, t in enumerate(f["oursHead"])]
    ev.append(("oursButton", "pop", f["oursButton"] + POP, 0))
    ev.append(("oursWa", "pop", f["oursWa"] + POP, 1))
    ev += [(f"msg:{i}", "ding.wa", t + 1, 0) for i, t in enumerate(f["msgs"])]
    ev.append(("phones:out", "exit", f["phones"]["out"] + 8, 0, L["exit"] - 2.5))
    p = f["props"]
    ev.append(("props:fan", "whoosh.short", p["in"] + 6, 0))
    ev += [(f"props:card:{i}", "pop", t + POP, i) for i, t in enumerate(p["cards"])]
    ev.append(("props:pick", "tag", p["pick"] + POP, 0))
    ev.append(("props:out", "exit", p["out"] + 8, 0, L["exit"] - 2.5))
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(cal["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", cal["tiles"][-1] + POP, 0))
    ev.append(("cal:out", "exit", cal["out"] + 6, 0, L["exit"] - 2.5))
    ev.append(("moral", "land.big", f["moralLand"] + 4, 0))
    b = f["board"]
    ev.append(("board:swing", "whoosh.short", b + 6, 0, L["whoosh.short"] - 2))
    ev.append(("board:land", "land.big", b + 14, 0))
    ev.append(("end:price", "hit", b + 24 + 3, 0))
    ev.append(("end:line", "text.long", b + 8 + 1, 0))
    ev.append(("end:sub", "text", b + 40 + 1, 1))
    ev.append(("end:cta", "pop", b + 50 + POP, 0))
    ev.append(("end:arrow", "text", b + 62 + 1, 2))
    ev.append(("end:logo", "land", b + 72 + 4, 0, L["land"] - 3))
    return ev
