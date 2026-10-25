# 5. Choosing takes

This is the editorial core, and it is judgment, not code. The model reads the whole timed transcript the way an
editor reads a script with the director's notes, and writes its choices down as words.

How good is it? On the first long-form run (44 minutes of raw recording into a 5:09 cut plus 39 s of hooks), the
take selection matched the one Joaquín had made by hand the night before, without seeing it.

## What a recording looks like from the inside

Everyone records the same way: say a line, dislike it, say it again, keep going when it lands, restart the whole thing
once warm. A shoot is the script read two or three times over, with the fluent versions near the end. The timed
transcript ([04](04-transcription.md)) is a map of that.

## The procedure

1. **Get the script that was meant to be said** (for ads, the shoot's script with its pieces: hooks, bodies, closings).
   Number every piece and sentence. No script? Rebuild it from the fullest take.
2. **Read every line of the transcript once, start to end.** List the verbal slips while reading: a wrong number, a
   word the speaker trips on, "okay otra vez", talk to someone off camera, a sentence that never ends.
3. **Tag every phrase** with the piece and sentence it is a take of, or `x` (a restart, backstage talk). A silence of
   1.5 s or more before a phrase usually means a restart.
4. **Pick per sentence:**
   - it says the **meaning** of the script. The live wording usually beats the written one, and it wins;
   - fluent, no stumble inside the sentence, no filler that would have to be cut;
   - **later over earlier**, all else equal (people warm up). A later take with a stumble inside the sentence loses to
     an earlier clean one;
   - **a run of several sentences in one breath is one segment**: one cut instead of four, and the delivery stays
     continuous;
   - if two takes read the same, look at one frame of each (`ffmpeg -ss T -i take.MOV -frames:v 1 x.png`) and take
     the livelier face.
5. **Splices** from another attempt are fine for a one-liner that landed only once, if the framing and the light match.
   A snap zoom at the cut hides small differences; a change in the light does not.
6. **Trim inside a take** when a line restates itself ("para que encuentren, para que te encuentren"): end on the first
   clean version.
7. **Never invent.** A line the speaker did not say in any take does not go in: not as a caption, not as a card. If
   the script had a line nobody delivered, say so in the hand-over.
8. **Assemble by beat, not by file order** (hook, problem, proof, call to action, or the script's own order).
9. **After three beats, look back.** An earlier pick that is said better later gets swapped.

## For the CapCut banks: keep 2 or 3, star the last

When the pre-edit goes to CapCut, the model does not make the final call on ads. It keeps **the last 2 or 3 complete
takes of every piece** ("las tomas que sí se terminaron de hablar", the takes that were finished) in a bank timeline,
in recording order, and marks the last one with a star. Joaquín picks inside CapCut, where the face, the energy and the
breath are visible. For the VSL it keeps one pick per part plus a marker at that pick on the whole raw take.

## Writing it down: anchors, not times

A choice is written as **word anchors inside a word-index range**, never as times
([`takes_example.py`](../code/capcut-pre-edit/takes_example.py)):

```python
("H7", "Las 2 de la mañana", [
    (V, 2768, 2816, "son las dos de la mañana", "durmiendo contigo", {}),
    (V, 2896, 2944, "son las dos de la mañana", "durmiendo contigo", {}),
    (V, 2948, 2996, "son las dos de la mañana", "durmiendo contigo", {"note": "dogs bark right after"}),
]),
```

`(file, lo, hi, start_anchor, end_anchor, options)`: the resolver finds the start anchor inside word indices
`[lo, hi]`, then the end anchor after it. Options pick the last occurrence instead of the first, add words after the
anchor, or carry a note for the human. The model only ever copies words it can see. Code turns them into times
([06](06-cut-points.md)).

The finished-render path writes the same thing as an edit decision list with `"words": [i, j]` ([13](13-finished-render.md)).

## Write down what was left out

Every pre-edit ships with a README the model writes for the editor:

- for each piece, the chosen take and why, and one line for each rejected take;
- **discarded takes that carry unique content** (a better line that was said only once, a version with a different
  ending), with their time in the raw file, so they can be rescued in seconds. A real example: "P2a also exists clean
  at 03:08 ('...y eso está bien, pero eso no importa tanto')";
- **what changed against the script**: a hook that came out in another shape, parts that were never recorded, a new
  closing line that appeared on the day. The editor should never discover that by watching.
