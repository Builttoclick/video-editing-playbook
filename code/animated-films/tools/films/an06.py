"""AN-06 "Tu página antes de pagar": risk reversal with a demo. The video message in WhatsApp, the name typed, the
look at how they show up today, the video with the sketch, two buttons, the analysis that stays. Cues + events."""
from films.common import F, Sheet, head_frames, type_frames


def cues(copy):
    s = Sheet("an06", copy)
    f = s.f
    # 1. the video message arrives, the page builds itself inside it
    s.beat("hook", 0.1, 3.3)
    f["phone"] = {"in": F(0.3), "out": F(5.7)}
    f["videoMsg"] = F(0.9)
    f["play"] = F(2.2)
    f["preview"] = {"in": F(2.4), "out": F(3.8), "blocks": [F(2.5), F(2.65), F(2.8), F(2.95), F(3.1)]}
    # 2. you write the name; I look at how people find you today
    s.beat("name", 3.3, 5.6)
    f["nameTyped"] = type_frames(copy["business"], F(3.7))
    f["send"] = F(5.2)
    f["nameMsg"] = F(5.3)
    s.beat("look", 5.6, 9.5)
    f["cards"] = {"in": F(5.9), "out": F(9.5), "at": [F(6.0), F(6.5), F(7.0), F(7.4)]}
    f["lens"] = {"at": F(6.2), "dur": F(2.8)}
    # 3. the video: Joaquín's face, the sketch scrolling, name and photos
    s.beat("video", 9.6, 12.1)
    f["player"] = {"in": F(9.8), "out": F(19.2)}
    f["scroll"] = {"at": F(17.2), "dur": F(1.8), "px": 120}
    f["playerBlocks"] = [F(10.6), F(11.4), F(12.2), F(13.0), F(13.8)]
    f["lensStops"] = [F(6.2 + 2.8 / 3), F(6.2 + 2 * 2.8 / 3), F(9.0)]
    s.beat("show", 12.1, 15.3)
    s.beat("sketch", 15.3, 19.2)
    f["pointName"] = F(15.7)
    f["pointPhotos"] = F(16.9)
    # 4. two buttons; arrancamos: the price, the 14 days
    s.beat("like", 19.3, 20.9)
    f["buttons"] = {"in": F(19.5), "out": F(24.0)}
    f["tapYes"] = F(20.7)
    s.beat("price", 20.9, 23.8)
    f["priceChip"] = F(21.1)
    f["cal"] = {"in": F(21.4), "out": F(24.0), "tiles": [F(21.7 + i * 0.09) for i in range(14)]}
    # 5. si no: the video stays in the chat
    s.beat("keep", 23.9, 27.0)
    f["phone2"] = {"in": F(24.1), "out": F(27.2)}
    f["savedChip"] = F(25.1)
    # 6. why: sketch and live page side by side
    s.beat("why", 27.1, 28.6)
    s.beat("easier", 28.6, 32.4)
    f["pair"] = {"in": F(27.3), "out": F(32.6)}
    f["pairLive"] = F(29.2)
    f["pairCheck"] = F(31.0)
    f["board"] = F(32.8)
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
    ev.append(("videoMsg", "ding.wa", f["videoMsg"] + 1, 0))
    ev.append(("play", "tag", f["play"], 0))
    ev.append(("preview:in", "swish", f["preview"]["in"] + 3, 0, L["swish"] - 3))
    ev += [(f"preview:block:{i}", "pop", t + POP, i, L["pop"] - 3) for i, t in enumerate(f["preview"]["blocks"])]
    ev.append(("preview:out", "exit", f["preview"]["out"] + 4, 0, L["exit"] - 4))
    ev += [(f"namekey:{i}", "key", t, next(keys)) for i, t in enumerate(f["nameTyped"])]
    ev.append(("send", "send", f["send"] + 1, 0))
    ev.append(("phone:out", "exit", f["phone"]["out"] + 8, 0, L["exit"] - 3))
    ev += [(f"card:{i}", "land", t + POP, 0, L["land"] - 1) for i, t in enumerate(f["cards"]["at"])]
    ev.append(("lens", "zip", f["lens"]["at"] + f["lens"]["dur"] // 2, 0, L["zip"] - 2))
    ev += [(f"lens:stop:{i}", "tick", t + 2, i, L["tick"] + 5) for i, t in enumerate(f["lensStops"])]
    ev.append(("cards:out", "exit", f["cards"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("player:in", "land.big", f["player"]["in"] + 3, 0))
    ev += [(f"player:block:{i}", "pop", t + POP, i, L["pop"] - 3) for i, t in enumerate(f["playerBlocks"])]
    ev.append(("scroll", "scroll", f["scroll"]["at"] + 10, 0, L["scroll"] - 4))
    ev.append(("pointName", "chip", f["pointName"] + POP, 0))
    ev.append(("pointPhotos", "chip", f["pointPhotos"] + POP, 1))
    ev.append(("player:out", "exit", f["player"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("buttons:in", "pop", f["buttons"]["in"] + POP, 0))
    ev.append(("buttons:in2", "pop", f["buttons"]["in"] + 5, 1))
    ev.append(("tapYes", "tag", f["tapYes"], 0))
    ev.append(("priceChip", "hit", f["priceChip"] + 3, 0))
    cal = f["cal"]
    ev.append(("cal:in", "land.big", cal["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(cal["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", cal["tiles"][-1] + POP, 0))
    ev.append(("cal:out", "exit", cal["out"] + 6, 0, L["exit"] - 2.5))
    ev.append(("phone2:in", "land.big", f["phone2"]["in"] + POP, 0))
    ev.append(("savedChip", "chip", f["savedChip"] + POP, 2))
    ev.append(("phone2:out", "exit", f["phone2"]["out"] + 8, 0, L["exit"] - 3))
    ev.append(("pair:in", "land.big", f["pair"]["in"] + 3, 0))
    ev.append(("pairLive", "land", f["pairLive"] + POP, 0))
    ev.append(("pairCheck", "tag", f["pairCheck"] + POP, 0))
    ev.append(("pair:out", "exit", f["pair"]["out"] + 8, 0, L["exit"] - 2.5))
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
