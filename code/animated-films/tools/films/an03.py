"""AN-03 "El señor de Brasil": hook, story, offer. A globe, a ChatGPT box, the client's message, the page that
explains what, for whom and from where; then the offer. Cues (frames) + sound events."""
from films.common import F, Sheet, head_frames, type_frames


def cues(copy):
    s = Sheet("an03", copy)
    f = s.f
    # 1. the hook: the globe, Brazil, the question typed in Portuguese
    s.beat("hook", 0.1, 5.0)
    f["globe"] = {"in": F(0.2), "dim": F(12.8), "out": F(18.4)}
    f["pinBr"] = F(1.0)
    f["gpt"] = {"in": F(1.3), "out": F(12.6)}
    f["qTyped"] = type_frames(copy["gpt"]["question"], F(1.6))
    # 2. the answer, the route from Europe, the pin on Limpio
    s.beat("name", 5.0, 9.5)
    f["answer"] = F(5.2)
    f["aTyped"] = type_frames(copy["gpt"]["answer"], F(5.3), pattern=[1, 1, 2, 1, 1, 1, 2, 1, 1, 1], after_space=2)
    f["answerSub"] = F(6.6)
    f["route"] = {"at": F(6.7), "dur": F(1.8)}
    f["pinEu"] = F(6.6)
    f["pinPy"] = F(8.5)
    # 3. weeks later: the WhatsApp hops from Brazil to Limpio, then the client's message to us
    s.beat("weeks", 9.6, 13.0)
    f["hop"] = {"at": F(9.8), "dur": F(0.8)}
    f["hopLand"] = F(10.6)
    f["bubble"] = {"in": F(13.1), "out": F(18.2)}
    f["bubbleLines"] = [F(13.1), F(14.4), F(15.7)]
    f["badgePulse"] = [F(11.4), F(12.1)]
    # 4. why: the client's page, scanned, three callouts
    f["page"] = {"in": F(18.5), "out": F(30.5)}
    s.beat("why", 18.4, 19.9)
    s.beat("because", 19.9, 26.3)
    f["scan"] = {"at": F(20.3), "dur": F(1.6)}
    f["reads"] = [F(22.0), F(23.0), F(24.0)]
    # 5. nothing written: the empty page, the scan finds nothing
    s.beat("nothing", 26.3, 30.4)
    f["empty"] = F(26.5)
    f["scan2"] = {"at": F(26.9), "dur": F(1.4)}
    f["question"] = F(28.5)
    # 6. the offer: our page writes itself, Google and ChatGPT understand it; three designs; 14 days
    s.beat("we", 30.5, 35.5)
    f["ours"] = {"in": F(30.7), "out": F(35.6)}
    heads = copy["ours"]["headline"].split(" ")
    f["oursHead"] = [F(31.2) + i * 7 for i in range(len(heads))]
    subs = copy["ours"]["sub"].split(" ")
    f["oursSub"] = [F(32.6) + i * 3 for i in range(len(subs))]
    f["oursButton"] = F(33.6)
    f["engines"] = [F(33.9), F(34.6)]
    s.beat("designs", 35.5, 39.6)
    f["props"] = {"in": F(35.7), "cards": [F(35.75), F(35.9), F(36.05)], "pick": F(36.9), "out": F(37.7)}
    f["cal"] = {"in": F(37.9), "out": F(40.2), "tiles": [F(38.15 + i * 0.085) for i in range(14)]}
    f["board"] = F(40.0)
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
    keys = iter(range(10_000))
    ev.append(("globe:in", "land.big", f["globe"]["in"] + 12, 0, L["land.big"] - 4))
    ev.append(("pinBr", "pop", f["pinBr"] + POP, 0))
    ev.append(("gpt:in", "land.big", f["gpt"]["in"] + 8, 0))
    ev += [(f"qkey:{i}", "key", t, next(keys)) for i, t in enumerate(f["qTyped"])]
    ev.append(("answer", "tick", f["answer"] + 1, 0))
    ev += [(f"akey:{i}", "key", t, next(keys), L["key"] - 3) for i, t in enumerate(f["aTyped"])]
    ev.append(("answerSub", "text", f["answerSub"] + 1, 2))
    ev.append(("pinEu", "pop", f["pinEu"] + POP, 1))
    ev.append(("route", "whoosh.short", f["route"]["at"] + f["route"]["dur"] // 2, 0))
    ev.append(("pinPy", "tag", f["pinPy"] + POP, 0))
    ev.append(("hop", "swish", f["hop"]["at"] + 4, 0))
    ev.append(("hopLand", "ding.wa", f["hopLand"] + 1, 0))
    ev.append(("gpt:out", "exit", f["gpt"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("bubble:in", "ding.wa", f["bubble"]["in"] + 2, 0))
    ev += [(f"bubble:line:{i}", "text.long", t + 2, i) for i, t in enumerate(f["bubbleLines"][1:], 1)]
    ev += [(f"badge:pulse:{i}", "tick", t + 1, i, L["tick"] + 5) for i, t in enumerate(f["badgePulse"])]
    ev.append(("bubble:land", "land", f["bubble"]["in"] + 3, 0, L["land"] - 4))
    ev.append(("bubble:out", "exit", f["bubble"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("page:in", "land.big", f["page"]["in"] + 3, 0))
    ev.append(("scan", "zip", f["scan"]["at"] + f["scan"]["dur"] // 2, 0))
    ev += [(f"read:{i}", "chip", t + POP, i) for i, t in enumerate(f["reads"])]
    ev.append(("empty", "swish", f["empty"] + 4, 0, L["swish"] - 3))
    ev.append(("scan2", "zip", f["scan2"]["at"] + f["scan2"]["dur"] // 2, 0, L["zip"] - 2))
    ev.append(("question", "cross", f["question"] + POP, 0))
    ev.append(("page:out", "exit", f["page"]["out"] + 8, 0, L["exit"] - 2.5))
    ev.append(("ours:in", "land.big", f["ours"]["in"] + 3, 0))
    ev += [(f"ourshead:{i}", "key", t, next(keys)) for i, t in enumerate(f["oursHead"])]
    ev += [(f"ourssub:{i}", "key", t, next(keys), L["key"] - 4) for i, t in enumerate(f["oursSub"])]
    ev.append(("oursButton", "pop", f["oursButton"] + POP, 0))
    ev += [(f"engine:{i}", "chip", t + POP, i) for i, t in enumerate(f["engines"])]
    ev.append(("ours:out", "exit", f["ours"]["out"] + 8, 0, L["exit"] - 2.5))
    p = f["props"]
    ev.append(("props:fan", "whoosh.short", p["in"] + 6, 0))
    ev += [(f"props:card:{i}", "pop", t + POP, i) for i, t in enumerate(p["cards"])]
    ev.append(("props:pick", "tag", p["pick"] + POP, 0))
    ev.append(("props:out", "exit", p["out"] + 8, 0, L["exit"] - 2.5))
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(cal["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", cal["tiles"][-1] + POP, 0))
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
