from openai import OpenAI
from dotenv import find_dotenv, load_dotenv

_ = load_dotenv(find_dotenv())

clint = OpenAI()

audio_file = open("your mp3 file", "rb")
text = clint.audio.transcriptions.create(
    model="whisper-1",
    file= audio_file
)
print(text)