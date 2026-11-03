import math
import os
import struct
import wave

RATE = 48000
SECONDS = 60
N = RATE * SECONDS
out = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "twyn-score.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)

def tone(t, hz, attack=0.008, release=0.15):
    if t < 0 or t > release:
        return 0.0
    env = min(1.0, t / attack) * min(1.0, (release - t) / max(release * .15, 0.001))
    return math.sin(2 * math.pi * hz * t) * env

def kick(t):
    if t < 0 or t > .22:
        return 0.0
    f = 110 * math.exp(-t * 18) + 42
    return math.sin(2 * math.pi * f * t) * math.exp(-t * 18)

markers = [0, 4, 10, 25, 38, 52]
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE)
    frames = bytearray()
    for i in range(N):
        t = i / RATE
        pad = .035 * math.sin(2 * math.pi * (110 + 2 * math.sin(t / 3)) * t)
        pad += .022 * math.sin(2 * math.pi * 220 * t) * (0.5 + 0.5 * math.sin(t / 5))
        beat = .0
        for m in markers:
            beat += .15 * kick(t - m)
        if t > 4:
            beat += .035 * tone((t - 4) % .75, 880, .004, .07)
        if any(abs(t - m) < .02 for m in markers[1:]):
            beat += .06 * tone(min(abs(t - m) for m in markers[1:]), 660, .002, .12)
        val = max(-.25, min(.25, pad + beat))
        sample = int(val * 32767)
        frames += struct.pack("<hh", sample, sample)
    w.writeframes(frames)
print(out)
