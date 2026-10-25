# 16. Ad and VSL craft

The editing is in service of a sale. This is what we learned about the shape of the videos themselves, from our own
ad account and from the research behind the tools.

## The shape of one ad

| Part | Length | Rule |
|---|---|---|
| Hook | 3 to 6 s | one sentence, starts on the first syllable, text on screen within 0.5 s |
| Body | 10 to 25 s | one story, with a turn every 6 s or so |
| Call to action | 5 to 8 s | one instruction ("Escribime por WhatsApp") and what they get |
| End plate | about 3 s | the closing card |

Shorter won for us: the 21 to 24 s combinations beat the 35 to 38 s ones (two bodies glued together) in the same test.

## Pacing numbers worth knowing

From the sourced reference cards in [OpenMontage](https://github.com/calesthio/OpenMontage), platform documentation and
large retention studies (2025 and 2026):

- a visual change every 1 to 3 s (a cut, a snap zoom, a card or a caption change all count); no static hold over 3 s;
- pattern interrupts every 2 to 4 s: about 58 % average retention against about 41 % for a static talking head;
- speech at 180 to 200 words per minute: 15 s is 35 to 40 words, 30 s is 70 to 80;
- the scroll decision takes about 1.7 s: the first frame is already the speaker talking, no logo, no silent lead-in;
- 3-second retention under 60 % gets minimal distribution; 70 to 85 % is the target.

## The hook

- Start on the first syllable: trim the pre-roll to the onset, never on a breath or a smile.
- Text on screen in the first half second that states the hook, readable with the sound off.
- The first snap or push lands on the hook's payoff word.
- One sound on the first visual event is enough. No riser into frame 1.

## Overlays: how many and where

- Show what the speaker just made the viewer imagine, **on the word**: a number becomes a big number, a list fills in
  item by item, a claim becomes a badge, a brand becomes its logo chip, "no es X" becomes X struck through.
- If a sentence answers none of these, leave it alone: the silence in the band is what makes the next card land.
- About one card every 2 to 4 s in the hook, then one per beat; 3 to 6 per minute in an explainer, 3 to 5 s each.
- One thing per zone at a time; nothing in the first half second of a sentence; gone 0.3 s after it; never across a
  beat cut; never over the face (unless it is a capture that needs the room, briefly).
- Entrances ease out, never linear, and land on the payoff word. Anything readable holds at least 1 s.
- Overlays above the head beat overlays low in our one clean test ([10](10-overlays-claude-design.md)).

## Measuring a hook fairly

The raw "3-second play rate" on our account mostly said **where Meta showed the ad**, not how good the hook was:
around 17 % in the Facebook feed, 22 to 24 % in Reels, 7 % in Instagram stories, and 76 to 96 % in Audience Network,
which is junk traffic. So:

- **hook rate** = 3-second plays / impressions, at ad level, **Audience Network removed, adjusted for placement**, only
  with 1,000 impressions or more, grouped by the spoken line and the take;
- **hold rate** = ThruPlays / 3-second plays;
- and the one that pays: **leads that wrote back**, not clicks.

What the study of every ad we ever ran said:

- **"Someone is searching for what you sell, right now"** won on both hook rate and money: 31 to 33 % in its first
  version, 27 % as the late-night scene ("Son las dos de la mañana y ahora mismo hay alguien buscando exactamente lo
  que vos vendés"), and it brought paying clients in every version.
- **Price-first hooks hook low** (about 13 %) **and bring the most leads that write back**: the price filters in the
  first second. Judge them on leads, never on hook rate.
- **A high hook rate alone does not sell**: a statistic hook at 29 % brought zero leads; a hook about ChatGPT hooked
  34.5 % with the weakest results after it.
- **The best body** was the process told as a story in days ("the first day... the day 14"). A list of features never
  brought a lead.
- **The same words can hook 27 % one month and 19 % the next** with a different take. Test takes, not only scripts.
- **Format matters:** the best local-SEO hooks were selfies walking outdoors in daylight; the website ads were seated
  in a dark room. Same words in both formats is a cheap test.

## Structures worth stealing

From people who run this kind of ad well (studied in October):

- **The street proof:** in front of a real shop, search for what it sells, show that it does not come up.
- **The price skit:** a short scene where someone asks "¿por qué tan caro?" (why so expensive?) and the answer is the
  pitch. Write it from your own lines; never copy someone's script.
- **Trade openers:** the first words name the viewer's trade.
- **Retargeting the people who watched**, with a different hook ("ya me viste", you already saw me).

## The VSL

A VSL (video sales letter) here is the 2 to 3 minute video on the landing page, the one in [`examples/`](../examples).

- **It must not repeat the ads or the page.** The first version did ("estamos repitiendo lo que dice en la web, en los
  anuncios") and was thrown out. The viewer already saw the ad and is on the page; a third time gives them nothing to
  decide on. It needs its own frame.
- **The frame Joaquín chose: the average page and ours, one difference per part.** Why the average page is made (to
  please the client, to look nice) against why ours is (so people understand and write); the template against three
  real design proposals; on the internet against found on Google (and in ChatGPT); a programmer against someone who
  knows ads, funnels, SEO and sales; "answers when they can" against a measured reply time; then what happens if you
  fill in the form.
- **No price in the video.** The price lives on the page.
- **Fresh proof, not the ads' proof**, re-pulled from the clients' analytics and anonymous: a client's city and trade,
  never the name or the logo. A claim like the reply time must be measurable and checked (is it the human reply, or an
  automatic greeting?).
- **The close is the form under the video**, and the graphic on screen copies the form's exact labels in the order they
  are said.
- **The average page sits on the right, ours on the left**, because that is where the hands point when the comparison
  is said.
- **Invented examples read high-end** (a construction company, an accounting firm), because the example tells the
  viewer who the service is for.

## "Made with AI" explainers

When someone shows a video "made fully with AI" that has interface, text and numbers in it, it is almost always coded
motion graphics plus a voice (recorded, or synthesized with word timestamps), not generative video
([11](11-motion-graphics-in-code.md)). Generative platforms are for cinematic B-roll, product shots and avatar ads;
they garble text and every fix is a new generation.

## The visual line

- Poppins Bold with tight tracking (-1), white or a strong metallic gold as the protagonist, navy surfaces; Montserrat
  Bold as a secondary.
- Clean and premium; animations good and subtle. **If an effect is noticeable, it is too strong.** A little glow, never
  a lot.
- Talking head with overlays on top beats B-roll for this kind of ad; a full-screen board when a part needs graphic
  room.
- Icons: Iconify's Solar Bold Duotone (CC BY 4.0), never the default icon set every template uses.
