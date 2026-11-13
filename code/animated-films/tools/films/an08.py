"""AN-08 "El turno de noche": a number of our own and a day in the life. The sky crosses to night, the shop
closes, the page in the window stays lit, someone writes at 02:14, the owner reads it in the morning. Cues + events."""
from films.common import F, Sheet, head_frames


def cues(copy):
    s = Sheet("an08", copy)
    f = s.f
    # 1. the number: ten people, four of them gold, while the sky goes to night
    s.beat("hook", 0.1, 4.6)
    f["sky"] = {"in": F(0.2), "night": [F(2.0), F(4.6)], "dawn": [F(18.3), F(20.1)], "cycle": {"at": F(29.1), "dur": F(4.0)}, "out": F(37.7)}
    f["people"] = [F(0.6 + i * 0.09) for i in range(10)]
    f["goldPeople"] = [F(1.8 + i * 0.22) for i in range(4)]
    f["stat"] = {"in": F(1.7), "out": F(4.7)}
    # 2. sunday nap, tuesday 2 am: the clock, the shutter, the lit page in the window
    s.beat("sunday", 4.7, 6.6)
    f["clock"] = {"in": F(4.9), "out": F(9.4), "spin1": [F(5.0), F(5.9)], "spin2": [F(6.8), F(7.8)]}
    s.beat("tuesday", 6.6, 9.4)
    f["shop"] = {"in": F(6.9), "out": F(18.1)}
    f["shutter"] = {"at": F(7.4), "dur": F(0.8)}
    f["lamps"] = F(8.0)
    f["pageLit"] = F(8.5)
    # 3. you are asleep; the page keeps working; a visitor at 02:14 taps WhatsApp; the owner's phone, silent
    s.beat("asleep", 9.5, 11.5)
    f["nightstand"] = {"in": F(9.7), "out": F(18.1)}
    s.beat("working", 11.5, 15.4)
    f["visitor"] = {"at": F(11.7), "dur": F(1.2)}
    f["reads"] = [F(13.0), F(13.9)]
    s.beat("touch", 15.4, 17.9)
    f["tapWa"] = F(16.0)
    f["silentNotif"] = F(16.6)
    f["nightClock"] = F(16.8)
    # 4. morning: the sky brightens, the phone shows the messages
    s.beat("morning", 18.1, 21.0)
    f["phone"] = {"in": F(19.1), "out": F(22.6)}
    f["msgs"] = [F(19.9), F(20.8), F(21.7)]
    # 5. the offer: 14 days, the steps, 24 h
    s.beat("we", 22.7, 25.3)
    f["cal"] = {"in": F(22.9), "out": F(33.1), "tiles": [F(23.4 + i * 0.2) for i in range(14)]}
    s.beat("process", 25.3, 30.7)
    f["steps"] = [F(25.5), F(26.5), F(27.5)]
    f["badge"] = F(28.9)
    f["cycleTicks"] = [F(29.1 + i * 1.0) for i in range(4)]
    # 6. write, even at 2 am: the clock at 02:00, then 07:30 and Joaquín's reply
    s.beat("write", 30.8, 32.8)
    f["clock2"] = {"in": F(33.0), "out": F(37.7), "spin": [F(34.5), F(35.7)]}
    s.beat("even", 32.8, 36.9)
    f["dots"] = F(35.9)
    f["reply"] = F(36.5)
    f["board"] = F(37.8)
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
    ev.append(("sky:in", "land.big", f["sky"]["in"] + 4, 0, L["land.big"] - 5))
    ev += [(f"person:{i}", "tick", t + 1, i, L["tick"] + 4) for i, t in enumerate(f["people"])]
    ev += [(f"gold:{i}", "chip", t + POP, i) for i, t in enumerate(f["goldPeople"])]
    ev.append(("stat", "land.big", f["stat"]["in"] + POP, 0))
    ev.append(("stat:out", "exit", f["stat"]["out"] + 6, 0, L["exit"] - 4))
    ev.append(("clock:in", "land", f["clock"]["in"] + POP, 0))
    for j, (a, b) in enumerate([f["clock"]["spin1"], f["clock"]["spin2"]]):
        n = 8
        ev += [(f"clock:{j}:{i}", "clock", a + round(i * (b - a) / n), i) for i in range(n)]
    ev.append(("clock:out", "exit", f["clock"]["out"] + 6, 0, L["exit"] - 4))
    ev.append(("shop:in", "land.big", f["shop"]["in"] + 3, 0))
    ev.append(("shutter", "shutter", f["shutter"]["at"] + f["shutter"]["dur"] // 2, 0))
    ev.append(("shutter:stop", "land.big", f["shutter"]["at"] + f["shutter"]["dur"], 0))
    ev.append(("lamps", "tick", f["lamps"] + 1, 0, L["tick"] + 6))
    ev.append(("pageLit", "pop", f["pageLit"] + POP, 0))
    ev.append(("nightstand", "land", f["nightstand"]["in"] + POP, 0, L["land"] - 2))
    ev.append(("visitor", "swish", f["visitor"]["at"] + 6, 0, L["swish"] - 4))
    ev += [(f"read:{i}", "chip", t + POP, i) for i, t in enumerate(f["reads"])]
    ev.append(("tapWa", "tag", f["tapWa"], 0))
    ev.append(("nightClock", "tick", f["nightClock"] + 1, 1, L["tick"] + 4))
    ev.append(("shop:out", "exit", f["shop"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("dawn", "swell", f["sky"]["dawn"][1], 0))
    ev.append(("phone:in", "land.big", f["phone"]["in"] + 3, 0))
    ev += [(f"msg:{i}", "ding.wa", t + 1, 0) for i, t in enumerate(f["msgs"])]
    ev.append(("phone:out", "exit", f["phone"]["out"] + 8, 0, L["exit"] - 3))
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(cal["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", cal["tiles"][-1] + POP, 0))
    ev += [(f"step:{i}", "chip", t + POP, i) for i, t in enumerate(f["steps"])]
    ev.append(("badge", "pop", f["badge"] + POP, 0))
    ev += [(f"cycle:{i}", "tick", t + 1, i, L["tick"] + 3) for i, t in enumerate(f["cycleTicks"])]
    ev.append(("cal:out", "exit", cal["out"] + 6, 0, L["exit"] - 2.5))
    ev.append(("clock2:in", "land", f["clock2"]["in"] + POP, 0))
    a, b = f["clock2"]["spin"]
    ev += [(f"clock2:{i}", "clock", a + round(i * (b - a) / 8), i) for i in range(8)]
    ev += [(f"dots:{i}", "tick", f["dots"] + w, i) for i, w in enumerate([1, 6, 11])]
    ev.append(("reply", "ding.wa", f["reply"] + 1, 0))
    ev.append(("clock2:out", "exit", f["clock2"]["out"] + 6, 0, L["exit"] - 4))
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
