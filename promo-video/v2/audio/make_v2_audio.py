"""Original V2 score and effects. No third-party recordings or commercial music."""
import math
import os
import struct
import wave

RATE = 48000
SECONDS = 60
N = RATE * SECONDS
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "v2", "audio")
os.makedirs(OUT, exist_ok=True)

def env(t, attack, decay):
    if t < 0: return 0.0
    return min(1.0, t / attack) * math.exp(-t / decay)

def kick(t):
    if not 0 <= t < .32: return 0.0
    f = 135 * math.exp(-t * 12) + 42
    return math.sin(math.tau * f * t) * math.exp(-t * 12)

def hat(t):
    if not 0 <= t < .055: return 0.0
    # deterministic bright noise-like cluster of inharmonic sines
    return sum(math.sin(math.tau * hz * t) for hz in (4811, 6247, 7531, 9137)) * .09 * math.exp(-t * 70)

def tone(t, hz, duration, amp=.1):
    if not 0 <= t < duration: return 0.0
    return amp * math.sin(math.tau * hz * t) * min(1, t / .01) * min(1, (duration - t) / .08)

def event(t, at, kind):
    x = t - at
    if kind == "impact":
        return .35 * kick(x) + tone(x, 220, .22, .12) + tone(x, 330, .18, .08)
    if kind == "click":
        return tone(x, 1450, .045, .12) + tone(x, 2250, .025, .05)
    if kind == "whoosh":
        if not 0 <= x < .38: return 0.0
        return sum(math.sin(math.tau * (180 + i * 190 + x * 1200) * x) for i in range(6)) * .012 * math.sin(math.pi * x / .38)
    if kind == "gnani":
        return tone(x, 440, .42, .13) + tone(x, 660, .42, .1) + tone(x, 880, .32, .07)
    return 0.0

def write(path, fn):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE)
        buf = bytearray()
        for i in range(N):
            t = i / RATE
            l, r = fn(t)
            buf.extend(struct.pack("<hh", int(max(-.92, min(.92, l)) * 32767), int(max(-.92, min(.92, r)) * 32767)))
        w.writeframes(buf)

def bed(t):
    # 108bpm pulse, kept understated so the actual product is primary.
    beat = 60 / 108
    section = 0 if t < 5 else 1 if t < 27 else 2 if t < 38 else 3 if t < 53 else 4
    density = (.16, .32, .27, .36, .22)[section]
    phase = t % beat
    v = density * kick(phase)
    if section > 0:
        eighth = (t - 5) % (beat / 2)
        v += density * .42 * hat(eighth)
    # warm, barely-moving chord bed in Twyn's low-energy opening regions.
    chord = (110, 138.59, 164.81, 220)[int(t / (beat * 8)) % 4]
    pad = sum(math.sin(math.tau * chord * ratio * t + j * .7) for j, ratio in enumerate((1, 1.5, 2.0))) * .018
    # restrained rhythmic arpeggio after creation begins
    arp = 0.0
    if t > 5:
        step = int((t - 5) / (beat / 2))
        note = (220, 277.18, 329.63, 440)[step % 4]
        arp = tone((t - 5) % (beat / 2), note, .19, .025 + density * .04)
    side = .7 + .3 * min(1, kick(phase) * 5)
    value = (v + pad + arp) * side
    return value * .72, value * .62

FX = [(0.12, "impact"), (4.9, "whoosh"), (7.75, "click"), (10.9, "click"), (16.2, "click"), (22.1, "click"), (26.95, "impact"), (31.6, "gnani"), (37.75, "whoosh"), (41.0, "click"), (47.7, "click"), (52.9, "impact"), (59.0, "impact")]

def effects(t):
    value = sum(event(t, at, kind) for at, kind in FX)
    return value, value * .9

write(os.path.join(OUT, "twyn-v2-bed.wav"), bed)
write(os.path.join(OUT, "twyn-v2-fx.wav"), effects)
print(OUT)
