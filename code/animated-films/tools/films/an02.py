"""AN-02 "Ahora mismo": PAS told from the phone of the person searching. Cues (frames) + sound events."""
from films.common import F, Sheet, head_frames, type_frames


def cues(copy):
    s = Sheet("an02", copy)
    f = s.f
    # 1. the hook: the searcher's phone, Google typing the query, suggestions dropping
    s.beat("hook", 0.1, 3.9)
    f["phone"] = {"in": F(0.3)}
    f["bar"] = F(0.6)
    typed = type_frames(copy["query"], F(1.0))
    f["typed"] = typed
    f["suggest"] = [typed[-1] + 7 + i * 5 for i in range(len(copy["suggestions"]))]
    f["enter"] = F(3.8)
    f["results"] = [f["enter"] + 6, f["enter"] + 11, f["enter"] + 16]
    f["tap1"] = F(4.8)
    # 2. the page opens: nav, hero, tiles, services, button; three things understood in three seconds
    s.beat("enter", 3.9, 5.9)
    f["site"] = {"in": F(5.05), "blocks": [F(5.05), F(5.2), F(5.35), F(5.5), F(5.65)]}
    s.beat("three", 5.7, 10.3)
    f["check"] = [F(6.3), F(7.4), F(8.7)]
    f["tapWa"] = F(9.2)
    # 3. WhatsApp: the message types itself and leaves
    f["chat"] = {"in": F(9.6)}
    s.beat("other", 10.3, 12.7)
    f["msgTyped"] = type_frames(copy["chat"]["message"], F(10.2))
    f["send"] = F(12.3)
    f["msg"] = F(12.4)
    f["phone"]["out"] = F(12.8)
    # 4. pull back: two phones, the other one lights up, the searcher dissolves
    f["two"] = {"in": F(12.8), "out": F(21.8)}
    f["badge1"] = F(13.4)
    f["person"] = {"in": F(13.2), "gone": F(14.3)}
    s.beat("never", 13.0, 15.9)
    # 5. every day: three vignettes, a message flies from each, then a burst
    s.beat("daily", 15.9, 17.6)
    s.beat("while", 17.6, 21.7)
    f["vignettes"] = [F(17.7), F(18.8), F(19.9)]
    f["flyLen"] = 12
    f["dots"] = [F(18.2), F(19.3), F(20.4)]
    burst, t = [], F(20.95)
    for gap in [5, 5, 4, 4, 3, 3, 3, 3]:
        burst.append(t)
        t += gap
    f["burst"] = burst
    # 6. why: the other's page, the scan, three lines light up
    f["page"] = {"in": F(21.9), "out": F(27.8)}
    s.beat("why", 21.9, 23.9)
    f["scan"] = {"at": F(22.5), "dur": F(1.6)}
    s.beat("because", 23.9, 28.0)
    f["reads"] = [F(24.3), F(25.2), F(26.1)]
    # 7. the 14 days: the strip, its tiles, the four steps
    s.beat("we", 28.1, 30.7)
    f["cal"] = {"in": F(28.3), "out": F(36.0), "tiles": [F(28.8 + i * 0.235) for i in range(14)]}
    s.beat("process", 30.7, 36.0)
    f["steps"] = [F(29.0), F(30.6), F(32.3), F(34.0)]
    f["pulse"] = [F(33.2), F(35.2)]
    # 8. callback: the same search, the message lands on YOUR phone
    f["back"] = {"in": F(36.2), "out": F(40.6)}
    s.beat("next", 36.3, 40.0)
    f["backTyped"] = type_frames(copy["query"], F(36.6), pattern=[1, 1, 2, 1, 1, 2, 1, 1, 1, 2], after_space=2)
    f["backFly"] = F(38.0)
    f["backLand"] = F(38.5)
    # 9. end card
    f["board"] = F(40.4)
    frames = f["board"] + 130
    return s, frames


def events(c, copy, L):
    """(id, role, frame, pick[, loudness]) for tools/sound.py; L = the LOUD ladder."""
    f, T = c["f"], c["text"]
    ev = []
    POP = 2
    # one soft air swish per headline line as its first word rises (Joaquín's v4 rule for text that moves)
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
    ev += [(f"site:block:{i}", "pop", t + POP, i, L["pop"] - 3) for i, t in enumerate(f["site"]["blocks"])]
    ev += [(f"check:{i}", "chip", t + POP, i) for i, t in enumerate(f["check"])]
    ev.append(("tapWa", "tag", f["tapWa"], 0))
    ev.append(("chat:in", "swish", f["chat"]["in"] + 3, 0, L["swish"] - 3))
    ev += [(f"msgkey:{i}", "key", t, next(keys)) for i, t in enumerate(f["msgTyped"])]
    ev.append(("send", "send", f["send"] + 1, 0))
    ev.append(("msg", "ding.wa", f["msg"] + 1, 0))
    # two phones
    ev.append(("two:in", "whoosh.short", f["two"]["in"] + 5, 0, L["whoosh.short"] - 2))
    ev.append(("two:land", "land.big", f["two"]["in"] + 4, 0))
    ev.append(("badge1", "pop", f["badge1"] + POP, 1))
    ev.append(("person:in", "pop", f["person"]["in"] + POP, 2, L["pop"] - 3))
    ev.append(("person:gone", "exit", f["person"]["gone"] + 10, 0, L["exit"] - 4))
    for i, t in enumerate(f["vignettes"]):
        ev.append((f"vig:{i}", "land", t + POP, 0))
    for i, t in enumerate(f["dots"]):
        ev.append((f"dot:fly:{i}", "swish", t + 4, 0, L["swish"] - 4))
        ev.append((f"dot:land:{i}", "ding.wa", t + f["flyLen"], 0))
    for i, t in enumerate(f["burst"]):
        ev.append((f"burst:{i}", "flood", t + f["flyLen"], 0, L["flood"] - 0.5 * i))
    # the other's page
    ev.append(("page:in", "land.big", f["page"]["in"] + 3, 0))
    ev.append(("scan", "zip", f["scan"]["at"] + f["scan"]["dur"] // 2, 0))
    ev += [(f"read:{i}", "chip", t + POP, i) for i, t in enumerate(f["reads"])]
    ev.append(("page:out", "exit", f["page"]["out"] + 8, 0, L["exit"] - 2.5))
    # the 14 days
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(cal["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", cal["tiles"][-1] + POP, 0))
    ev += [(f"step:{i}", "chip", t + POP, i) for i, t in enumerate(f["steps"])]
    ev += [(f"pulse:{i}", "tick", t + 2, i, L["tick"] + 3) for i, t in enumerate(f["pulse"])]
    ev.append(("cal:out", "exit", cal["out"] + 6, 0, L["exit"] - 2.5))
    # callback
    ev.append(("back:in", "land.big", f["back"]["in"] + 4, 0))
    ev += [(f"backkey:{i}", "key", t, next(keys), L["key"] - 2) for i, t in enumerate(f["backTyped"])]
    ev.append(("back:fly", "swish", f["backFly"] + 4, 0))
    ev.append(("back:land", "ding.wa", f["backLand"] + 1, 0))
    # end card
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
