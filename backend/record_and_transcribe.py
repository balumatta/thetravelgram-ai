import sys
import tempfile
import os
import wave
import threading

import sounddevice as sd
import soundfile as sf
import numpy as np

from backend.helpers.stt.stt_provider import STTProviderFactory

STT_PROVIDER_TYPE = "faster_whisper"

STT_MODEL = STTProviderFactory.create_provider(
    provider_type=STT_PROVIDER_TYPE,
)

SAMPLE_RATE = 16000
CHANNELS = 1


def record_until_enter() -> np.ndarray:
    print("Recording... Press ENTER to stop.")
    frames = []
    stop_event = threading.Event()

    def callback(indata, frame_count, time_info, status):
        if not stop_event.is_set():
            frames.append(indata.copy())

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype="float32", callback=callback):
        input()
        stop_event.set()

    if not frames:
        return np.array([], dtype="float32")

    return np.concatenate(frames, axis=0)


def save_wav(audio: np.ndarray, filepath: str):
    sf.write(filepath, audio, SAMPLE_RATE)


def main():
    audio = record_until_enter()

    if audio.size == 0:
        print("No audio recorded.")
        sys.exit(1)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        save_wav(audio, tmp_path)
        print("Transcribing...")
        result = STT_MODEL.transcribe(tmp_path)
        print(f"\nDetected language: {result.language} ({result.language_probability * 100:.0f}%)\n")
        for seg in result.segments:
            print(f"[{seg.start:.1f}s -> {seg.end:.1f}s] {seg.text}")
        full_text = " ".join(seg.text for seg in result.segments)
        print(f"\nFull transcript:\n{full_text}")
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    main()
