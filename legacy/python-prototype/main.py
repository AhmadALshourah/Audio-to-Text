import sys
import os
from pathlib import Path
from openai import OpenAI
from dotenv import find_dotenv, load_dotenv

_ = load_dotenv(find_dotenv())

SUPPORTED_FORMATS = {".mp3", ".wav", ".m4a", ".flac", ".ogg"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB (Whisper limit)


def validate_audio_file(file_path: str) -> Path:
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if path.suffix.lower() not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported format: {path.suffix}. Supported: {SUPPORTED_FORMATS}"
        )

    if path.stat().st_size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {path.stat().st_size / 1024 / 1024:.1f}MB (max 25MB)"
        )

    return path


def transcribe_audio(file_path: str) -> str:
    try:
        file_path = validate_audio_file(file_path)
        client = OpenAI()

        with open(file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )

        return transcript.text

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Transcription failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <audio_file_path>")
        print(f"Supported formats: {SUPPORTED_FORMATS}")
        sys.exit(1)

    audio_file_path = sys.argv[1]
    result = transcribe_audio(audio_file_path)
    print(result)