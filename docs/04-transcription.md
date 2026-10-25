# 4. Transcription

Everything downstream reads the transcript, so it has to be **verbatim, word level, and in the right clock**.

## Why ElevenLabs Scribe

We used local Whisper (faster-whisper, large-v3-turbo) for months and switched for good:

- **Speed:** a 44-minute file came back in 59 s; 21 short takes sent in parallel took 6.5 s in total. Local Whisper on
  a laptop CPU took 12 to 20 minutes for half an hour of audio.
- **Code-switching:** Joaquín mixes Spanish and English all the time ("landing page", "trust bar", brand names).
  Scribe v2 with automatic language detection keeps the English words in English instead of translating or mangling
  them.
- **Verbatim:** fillers, restarts and audio events (laughter, a cough, a dog) stay in. For cutting that is what you
  want: a cleaned-up transcript hides exactly the things you cut out.
- **Every word has a start and an end.**

## The call

```
POST https://api.elevenlabs.io/v1/speech-to-text
header  xi-api-key: <key>
form    file=<audio>, model_id=scribe_v2, timestamps_granularity=word, tag_audio_events=true, diarize=false
```

- **Do not send `language_code`.** Forcing Spanish is what breaks the English words. Auto-detect returned Spanish with
  0.987 probability on a 27-minute mixed recording and still wrote the English parts in English.
- `diarize=false` for one speaker. With diarization on, a cough can become "speaker 2". Only label speakers when two
  voices each hold at least 10 % of the audio.
- **Send the clean mic, cut to the take**, not the phone audio: we cut the mic recording to each take's span (plus a
  margin), send it as 16 kHz FLAC, and store every word back in the **take's own movie time**
  (`t_movie = t_segment + segment_start - offset`). Then every later step can talk about one clock.
- Cache per source (size + mtime). Never re-transcribe an unchanged file.

What we store per take:

```json
{"meta": {"take": "IMG_6244", "off": 1033.687, "model": "scribe_v2", "language": "spa", "...": "..."},
 "words": [{"i": 0, "text": "Son", "start": 12.402, "end": 12.561, "type": "word"}, "..."],
 "response": {"...": "the raw Scribe JSON, untouched"}}
```

Code: [`code/capcut-pre-edit/transcribe.py`](../code/capcut-pre-edit/transcribe.py) (per take, mic audio, parallel) and
[`code/edit-pipeline/scripts/transcribe.py`](../code/edit-pipeline/scripts/transcribe.py) (any file or folder, cached).
Both read the key from `ELEVENLABS_API_KEY`.

## Cost

Scribe bills by audio length. What we measured, against the account's own counters:

| Plan | Credits per audio hour | So |
|---|---|---|
| Starter (paid, about US$5 to 6 a month) | ~1,100 | about 50 hours of audio per month on the Starter allowance |
| Free | ~4,000 | a 3 h 21 min file costs more than a whole free month (10,000 credits) |

Two habits that save credits:
- **Trim dead air before transcribing** when the times only need to match the trimmed file: 11 to 21 % fewer seconds.
- **Check the balance first** and remember that a subscription with a failed payment still reports its credits but
  answers 401 `payment_issue` on speech-to-text. A balance check does not prove a key works.

## The five ways Scribe lies about time

The words are almost always right. The times are not always right, and every one of these bit us:

1. **Glued silence.** A long silence gets glued onto the first word after it. We saw a first word last 5.3 s, and once
   a single "Un" spanning 16 s. Never trust the first word's start after a pause: the waveform onset is the truth
   ([06](06-cut-points.md)).
2. **Stretched last word.** The last word of a take gets stretched over the silence that follows. Cap it (we use
   0.9 s) and find the real end on the waveform.
3. **Late starts.** On one file every word start ran about 0.15 s late against the sound. Always keep at least 0.25 s
   of pre-roll before a first word you did not check on the waveform.
4. **Looped phrases.** When the same line is said two or three times in a row, Scribe can emit a hallucinated extra
   copy squeezed into 50 to 100 ms (25 words inside 80 ms). It happened six times in one shoot.
   - Detect: runs of 6 or more words whose starts are less than 60 ms apart.
   - Repair: widen the run to its cluster (no gap over 1 s), re-send only that cluster's audio (+0.8 s margins) as its
     own request, **replace** the cluster's entries with the new ones, renumber the indices.
   - Never try to re-time the old words: the first attempt did and spread bogus times onto the neighbours.
   - Run it **before** anyone writes a take selection, because the indices change.
   - Code: [`fix_bunched.py`](../code/capcut-pre-edit/fix_bunched.py).
5. **Numbers and names.** It writes "veinte" or "20" as it likes, and mangles brands (our own name came back as
   "Build2Klik"). Fine for cutting, wrong for captions: captions go through a small dictionary of the words this
   speaker says (numbers as digits, brand names, place names), see [09](09-captions.md).

## The reading view

The JSON is for code. For reading, every transcript becomes timed lines:

```
## IMG_6245
02:02.90-02:24.48 [622-800] ¿Qué tal? Yo soy Joaquín Caballero, de Build2Klik, y en este par de minutos te voy a
explicar cuáles son las diferencias entre... ¿Qué tal? Yo soy Joaquín Caballero, de Build2Klik, y en este... ¿Qué tal?
Yo soy Joaquín Caballero, de Build2Klik, y en este par de minutos te voy a explicar cuál es la diferencia entre una
página web promedio paraguaya y una página web que yo hago. Son varias diferencias, pero todo se nota en la cantidad de
gente que te escribe al final. [susurra] Que te escriba
```

That is a real line from the VSL take (wrapped here): three attempts with no pause long enough to split them, the
brand misheard as "Build2Klik", and an audio event at the end (a whisper). The pick is the third attempt, words 690 to
792, written down as two anchors: "qué tal yo soy joaquín" ... "te escribe al final".

- A new line after any pause over 0.6 s, times as mm:ss in the take's clock, **word indices in brackets**. The indices
  are how a choice is written down ([05](05-choosing-takes.md)).
- The render path uses a packed variant (`takes_packed.md`, from `pack.py`): `w0012-0038 [002.52-005.36] ...`, with
  every silence of 1.5 s or more printed as its own line, because that is where the speaker stopped and restarted.
