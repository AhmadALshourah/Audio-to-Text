# Python Prototype (Legacy)

This is the original single-file proof-of-concept that transcribes an audio
file via the OpenAI Whisper API.

It has been **superseded** by the TypeScript monorepo (see the project root).
The transcription logic is being rewritten in Node.js (in `apps/worker`) so the
whole stack shares one language.

Kept here purely for reference / history.

## Usage (if you still want to run it)

```bash
cd legacy/python-prototype
python -m venv .venv
# activate the venv, then:
pip install -r requirements.txt
python main.py path/to/audio.mp3
```
