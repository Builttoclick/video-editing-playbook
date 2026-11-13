"""AN-04 "Los 14 días": the process revealed, the price first; a calendar you watch fill. Cues + sound events."""
from films.common import F, Sheet, head_frames, type_frames


def cues(copy):
    s = Sheet("an04", copy)
    f = s.f
    # 1. the price, then the calendar drops under it
    s.beat("cost", 0.1, 1.9)
    f["price"] = {"in": F(1.9), "out": F(4.9)}
    s.beat("ready", 2.5, 4.9)
    f["cal"] = {"in": F(3.3), "up": [F(5.0), F(5.6)], "out": F(30.6), "tiles": []}
    s.beat("show", 4.9, 7.3)
    # 2. day 1: the call, three questions
    s.beat("day1", 7.3, 8.9)
    tiles = [F(7.5)]
    f["callCard"] = {"in": F(7.7), "out": F(12.9)}
    s.beat("call", 8.9, 12.9)
    f["callChips"] = [F(9.3), F(10.1), F(11.0)]
    # 3. days 2-5: the texts, with the search ghosted behind
    s.beat("texts", 12.9, 17.4)
    tiles += [F(13.1 + i * 0.25) for i in range(4)]
    f["bar"] = {"in": F(13.0), "out": F(17.3)}
    f["barTyped"] = type_frames(copy["query"], F(13.2), pattern=[1, 1, 2, 1, 1, 2, 1, 1, 1, 2], after_space=2)
    f["page"] = {"in": F(13.4), "out": F(17.3)}
    heads = copy["page"]["headline"].split(" ")
    f["pageHead"] = [F(14.4) + i * 7 for i in range(len(heads))]
    subs = copy["page"]["sub"].split(" ")
    f["pageSub"] = [F(15.5) + i * 3 for i in range(len(subs))]
    f["pageButton"] = F(16.5)
    # 4. days 6-7: three designs
    s.beat("designs", 17.4, 21.6)
    tiles += [F(17.6), F(17.9)]
    f["props"] = {"in": F(17.8), "cards": [F(17.9), F(18.1), F(18.3)], "pick": F(19.7), "out": F(21.4)}
    # 5. days 8-13: eight pages stack, domain, mail, Google
    s.beat("build", 21.6, 26.2)
    tiles += [F(21.8 + i * 0.25) for i in range(6)]
    f["pages"] = {"in": F(21.9), "out": F(26.1), "cards": [F(22.0 + i * 0.17) for i in range(8)]}
    f["connect"] = [F(24.0), F(24.5), F(25.0)]
    # 6. day 14: in the air, every button opens WhatsApp
    s.beat("day14", 26.2, 30.6)
    tiles += [F(26.5)]
    f["cal"]["tiles"] = tiles
    f["live"] = {"in": F(26.7), "out": F(30.5)}
    f["tapWa"] = F(28.1)
    f["msgs"] = [F(28.8), F(29.7)]
    # 7. you and us
    s.beat("you", 30.6, 34.8)
    f["cols"] = {"in": F(30.8), "out": F(35.0)}
    f["youItems"] = [F(31.1), F(31.5)]
    f["weItems"] = [F(31.8 + i * 0.26) for i in range(6)]
    f["board"] = F(35.2)
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
    ev.append(("price", "hit", f["price"]["in"] + 3, 0))
    ev.append(("price:out", "exit", f["price"]["out"] + 6, 0, L["exit"] - 4))
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev.append(("cal:up", "swish", cal["up"][0] + 4, 0, L["swish"] - 4))
    for i, t in enumerate(cal["tiles"]):
        ev.append((f"cal:tile:{i}", "tag" if i == 13 else "tick", t + (POP if i == 13 else 1), i))
    ev.append(("cal:out", "exit", cal["out"] + 6, 0, L["exit"] - 2.5))
    ev.append(("call:in", "land", f["callCard"]["in"] + POP, 0))
    ev.append(("call:ring", "ding.wa", f["callCard"]["in"] + 6, 0, L["ding.wa"] - 3))
    ev += [(f"callchip:{i}", "chip", t + POP, i) for i, t in enumerate(f["callChips"])]
    ev.append(("call:out", "exit", f["callCard"]["out"] + 6, 0, L["exit"] - 3))
    ev.append(("bar:in", "land", f["bar"]["in"] + POP, 0, L["land"] - 2))
    ev += [(f"barkey:{i}", "key", t, next(keys), L["key"] - 3) for i, t in enumerate(f["barTyped"])]
    ev.append(("page:in", "land.big", f["page"]["in"] + 3, 0))
    ev += [(f"pagehead:{i}", "key", t, next(keys)) for i, t in enumerate(f["pageHead"])]
    ev += [(f"pagesub:{i}", "key", t, next(keys), L["key"] - 4) for i, t in enumerate(f["pageSub"])]
    ev.append(("pageButton", "pop", f["pageButton"] + POP, 0))
    ev.append(("page:out", "exit", f["page"]["out"] + 8, 0, L["exit"] - 2.5))
    p = f["props"]
    ev.append(("props:fan", "whoosh.short", p["in"] + 6, 0))
    ev += [(f"props:card:{i}", "pop", t + POP, i) for i, t in enumerate(p["cards"])]
    ev.append(("props:pick", "tag", p["pick"] + POP, 0))
    ev.append(("props:out", "exit", p["out"] + 8, 0, L["exit"] - 2.5))
    ev += [(f"pagecard:{i}", "pop", t + POP, i) for i, t in enumerate(f["pages"]["cards"])]
    ev += [(f"connect:{i}", "chip", t + POP, i) for i, t in enumerate(f["connect"])]
    ev.append(("pages:out", "exit", f["pages"]["out"] + 8, 0, L["exit"] - 2.5))
    ev.append(("live:in", "land.big", f["live"]["in"] + 3, 0))
    ev.append(("tapWa", "tag", f["tapWa"], 0))
    ev += [(f"msg:{i}", "ding.wa", t + 1, 0) for i, t in enumerate(f["msgs"])]
    ev.append(("live:out", "exit", f["live"]["out"] + 8, 0, L["exit"] - 2.5))
    ev.append(("cols:in", "land.big", f["cols"]["in"] + POP, 0))
    ev += [(f"you:{i}", "chip", t + POP, i) for i, t in enumerate(f["youItems"])]
    ev += [(f"we:{i}", "chip", t + POP, i + 2) for i, t in enumerate(f["weItems"])]
    ev.append(("cols:out", "exit", f["cols"]["out"] + 8, 0, L["exit"] - 2.5))
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
