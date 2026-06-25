import os
import sys
import tempfile
import threading
import queue

import numpy as np
import sounddevice as sd
import soundfile as sf

from backend.helpers.stt.stt_provider import STTProviderFactory

STT_PROVIDER_TYPE = "faster_whisper"
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_SECONDS = 5

STT_MODEL = STTProviderFactory.create_provider(provider_type=STT_PROVIDER_TYPE)

audio_queue: queue.Queue = queue.Queue()


def audio_callback(indata, frames, time_info, status):
    audio_queue.put(indata.copy())


def transcribe_chunk(audio: np.ndarray) -> str:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        sf.write(tmp_path, audio, SAMPLE_RATE)
        result = STT_MODEL.transcribe(tmp_path, vad_filter=True)
        return " ".join(seg.text for seg in result.segments)
    finally:
        os.unlink(tmp_path)


def main():
    chunk_frames = int(SAMPLE_RATE * CHUNK_SECONDS)
    buffer = []
    buffer_len = 0

    print("Listening... Speak now. Press Ctrl+C to stop.\n")

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="float32", callback=audio_callback):
        try:
            while True:
                chunk = audio_queue.get()
                buffer.append(chunk)
                buffer_len += len(chunk)

                if buffer_len >= chunk_frames:
                    audio = np.concatenate(buffer, axis=0)
                    buffer = []
                    buffer_len = 0

                    text = transcribe_chunk(audio)
                    if text.strip():
                        print(text, flush=True)
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
