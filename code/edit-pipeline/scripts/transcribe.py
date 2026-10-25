"""Word-level transcripts with ElevenLabs Scribe, cached per source.

usage: python transcribe.py <video|audio|folder> [...] --edit-dir <dir> [--workers 4] [--force]

Writes <edit-dir>/transcripts/<stem>.json = {"meta": {...probe, size, mtime}, "response": <Scribe JSON>}.
Verbatim (fillers kept), audio events tagged, no language_code (auto-detect keeps Joaquín's English words English).
A source is re-sent only if its size or mtime changed, or with --force.
"""
import argparse, json, os, subprocess, tempfile, time, urllib.request, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from common import probe, eleven_key, run

MEDIA = ('.mov', '.mp4', '.m4v', '.mkv', '.avi', '.mts', '.m4a', '.mp3', '.wav', '.aac', '.flac', '.ogg', '.oga')


def scribe(key, audio_path):
    boundary = uuid.uuid4().hex
    fields = {'model_id': 'scribe_v2', 'timestamps_granularity': 'word', 'tag_audio_events': 'true',
              'diarize': 'false'}
    body = b''
    for k, v in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{Path(audio_path).name}"\r\n'
             f'Content-Type: application/octet-stream\r\n\r\n').encode() + Path(audio_path).read_bytes() + b'\r\n'
    body += f'--{boundary}--\r\n'.encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=body, method='POST', headers={
        'xi-api-key': key, 'Content-Type': f'multipart/form-data; boundary={boundary}'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=900) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')[:300]
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(5 * (attempt + 1)); continue
            raise RuntimeError(f'Scribe HTTP {e.code}: {msg}')


def one(src, out_dir, key, force):
    src = Path(src)
    st = src.stat()
    out = out_dir / f'{src.stem}.json'
    if out.exists() and not force:
        meta = json.loads(out.read_text(encoding='utf-8')).get('meta', {})
        if meta.get('size') == st.st_size and meta.get('mtime') == int(st.st_mtime):
            return f'cached   {src.name}'
    info = probe(src)
    with tempfile.TemporaryDirectory() as td:
        aud = Path(td) / (src.stem + '.flac')
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', str(aud)])
        t0 = time.time()
        resp = scribe(key, aud)
    meta = dict(info, size=st.st_size, mtime=int(st.st_mtime), transcribed=time.strftime('%Y-%m-%d %H:%M'),
                model='scribe_v2', seconds=round(time.time() - t0, 1))
    out.write_text(json.dumps({'meta': meta, 'response': resp}, ensure_ascii=False, indent=1), encoding='utf-8')
    n = sum(1 for w in resp.get('words', []) if w.get('type') == 'word')
    return f'scribed  {src.name}  {info["duration"]:.1f}s  {n} words  lang={resp.get("language_code")}  {meta["seconds"]}s'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inputs', nargs='+')
    ap.add_argument('--edit-dir', required=True)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    files = []
    for p in map(Path, a.inputs):
        if p.is_dir():
            files += sorted(f for f in p.iterdir() if f.suffix.lower() in MEDIA)
        else:
            files.append(p)
    out_dir = Path(a.edit_dir) / 'transcripts'
    out_dir.mkdir(parents=True, exist_ok=True)
    name, key, left = eleven_key()
    total = sum(probe(f)['duration'] for f in files)
    print(f'ElevenLabs account: {name} ({left} credits left), {len(files)} files, {total:.0f} s of audio (~{int(total)} credits)')
    with ThreadPoolExecutor(a.workers) as ex:
        for line in ex.map(lambda f: one(f, out_dir, key, a.force), files):
            print(line, flush=True)


if __name__ == '__main__':
    main()
