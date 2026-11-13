"""AN-07 "La prueba de los tres segundos": a test the viewer runs on their own phone. Cues + sound events."""
from films.common import F, Sheet, head_frames, type_frames


def cues(copy):
    s = Sheet("an07", copy)
    f = s.f
    # 1. the test: Google, the first result, a cluttered page, count to three
    s.beat("hook", 0.1, 1.9)
    s.beat("test", 1.9, 6.7)
    f["phone"] = {"in": F(1.9), "out": F(27.8)}
    f["bar"] = F(2.1)
    f["typed"] = type_frames(copy["query"], F(2.4))
    f["suggest"] = [f["typed"][-1] + 6 + i * 5 for i in range(len(copy["suggestions"]))]
    f["enter"] = F(5.0)
    f["results"] = [f["enter"] + 6, f["enter"] + 11, f["enter"] + 16]
    f["tap1"] = F(6.2)
    f["page1"] = {"in": F(6.5), "load": 14}
    f["count"] = [F(7.6), F(8.6), F(9.6)]
    f["slides"] = [f["page1"]["in"] + 40 * k for k in (7, 8)]
    # 2. two questions, two crosses, the thumb hunting
    s.beat("q1", 10.2, 12.4)
    f["cross1"] = F(11.6)
    s.beat("q2", 12.4, 14.6)
    f["hunt"] = [F(12.7), F(13.3), F(13.9)]
    f["cross2"] = F(14.2)
    # 3. people do this every day: back, the list, the next one
    s.beat("people", 14.6, 17.8)
    s.beat("back", 17.8, 22.2)
    f["tapBack"] = F(18.4)
    f["list2"] = F(18.7)
    f["tap2"] = F(19.9)
    f["page2"] = {"in": F(20.2)}
    # 4. now yours; if you have none, you know who gets the message
    s.beat("yours", 22.2, 24.4)
    f["yoursCard"] = {"in": F(22.4), "out": F(27.8)}
    s.beat("none", 24.4, 27.8)
    f["competitorMsg"] = F(26.2)
    # 5. our page: the headline writes itself, one second, the button follows the scroll
    s.beat("ours", 27.9, 32.0)
    f["ours"] = {"in": F(28.0), "out": F(40.1)}
    heads = copy["ourPage"]["headline"].split(" ")
    f["oursHead"] = [F(28.5) + i * 7 for i in range(len(heads))]
    subs = copy["ourPage"]["sub"].split(" ")
    f["oursSub"] = [F(29.7) + i * 3 for i in range(len(subs))]
    f["timer"] = F(31.0)
    s.beat("button", 32.0, 36.1)
    f["scroll"] = {"at": F(32.3), "dur": F(2.4), "px": 420}
    f["tapWa"] = F(35.1)
    # 6. everything for this: people understand fast and write
    s.beat("all", 36.1, 40.7)
    f["msgs"] = [F(36.6), F(37.5), F(38.4)]
    f["board"] = F(41.0)
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
    ev.append(("phone:in", "land.big", f["phone"]["in"] + POP, 0))
    ev.append(("bar", "land", f["bar"] + POP, 0))
    ev += [(f"key:{i}", "key", t, next(keys)) for i, t in enumerate(f["typed"])]
    ev += [(f"sugg:{i}", "tick", t, i) for i, t in enumerate(f["suggest"])]
    ev.append(("enter", "key.return", f["enter"] + 1, 0))
    ev += [(f"result:{i}", "pop", t + POP, i) for i, t in enumerate(f["results"])]
    ev.append(("tap1", "tag", f["tap1"], 0))
    ev.append(("page1:load", "pop", f["page1"]["in"] + f["page1"]["load"] + 2, 0, L["pop"] - 3))
    ev += [(f"count:{i}", "land.big", t + POP, 0) for i, t in enumerate(f["count"])]
    ev.append(("cross1", "cross", f["cross1"] + POP, 0))
    ev += [(f"hunt:{i}", "tick", t + 1, i, L["tick"] + 5) for i, t in enumerate(f["hunt"])]
    ev.append(("cross2", "cross", f["cross2"] + POP, 0))
    ev += [(f"slide:{i}", "swish", t + 3, 0, L["swish"] - 7) for i, t in enumerate(f["slides"])]
    ev.append(("tapBack", "tag", f["tapBack"], 0))
    ev.append(("list2", "swish", f["list2"] + 3, 0, L["swish"] - 3))
    ev.append(("tap2", "tag", f["tap2"], 0))
    ev.append(("page2:in", "pop", f["page2"]["in"] + 4, 1, L["pop"] - 2))
    ev.append(("yoursCard", "land", f["yoursCard"]["in"] + POP, 0))
    ev.append(("competitorMsg", "ding.wa", f["competitorMsg"] + 1, 0))
    ev.append(("phone:out", "exit", f["phone"]["out"] + 8, 0, L["exit"] - 2.5))
    ev.append(("ours:in", "land.big", f["ours"]["in"] + 3, 0))
    ev += [(f"ourshead:{i}", "key", t, next(keys)) for i, t in enumerate(f["oursHead"])]
    ev += [(f"ourssub:{i}", "key", t, next(keys), L["key"] - 4) for i, t in enumerate(f["oursSub"])]
    ev.append(("timer", "chip", f["timer"] + POP, 0))
    ev.append(("scroll", "scroll", f["scroll"]["at"] + 8, 0))
    ev.append(("tapWa", "tag", f["tapWa"], 0))
    ev += [(f"msg:{i}", "ding.wa", t + 1, 0) for i, t in enumerate(f["msgs"])]
    ev.append(("ours:out", "exit", f["ours"]["out"] + 8, 0, L["exit"] - 2.5))
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
