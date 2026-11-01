"""One-shot sounds, all generated: each function returns a mono float array at SR."""

import numpy as np

SR = 48000
_rng = np.random.default_rng(1)


def seed(n):
    global _rng
    _rng = np.random.default_rng(n)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def noise(dur):
    return _rng.standard_normal(int(dur * SR))


def band(x, lo, hi, slope=0.15):
    """Keep lo..hi Hz of x (soft edges, in the FFT domain)."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.ones_like(f)
    if lo > 0:
        gain *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (1 / slope * 0.5 + 2))
    if hi < SR / 2:
        gain *= 1 / (1 + (f / hi) ** (1 / slope * 0.5 + 2))
    return np.fft.irfft(spec * gain, len(x))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x * (peak / m)


def hz(note):
    """'F#5' -> 739.99"""
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    s = 1 if "#" in note else -1 if note[1:2] == "b" else 0
    octave = int(note[-1])
    return 440.0 * 2 ** ((names[note[0]] + s + 12 * (octave + 1) - 69) / 12)


def click(freq=3000, dur=0.03):
    """A small hard tick: a burst of noise around freq on top of a short ring."""
    t = t_axis(dur)
    burst = band(noise(dur), freq * 0.6, freq * 1.8) * np.exp(-t / (dur * 0.18))
    ring = np.sin(2 * np.pi * freq * 0.5 * t) * np.exp(-t / (dur * 0.35)) * 0.4
    return norm(burst + ring, 0.9)


def thud(freq=100, dur=0.2, amp=0.5):
    """A body knock: a sine falling from 2x to 1x freq."""
    t = t_axis(dur)
    phase = 2 * np.pi * (freq * t + freq * 0.9 * 0.02 * (1 - np.exp(-t / 0.02)))
    return np.sin(phase) * np.exp(-t / (dur * 0.35)) * amp * 2


def hiss(dur=0.25, freq=6000, amp=0.5):
    t = t_axis(dur)
    env = np.sin(np.pi * np.minimum(t / dur, 1)) ** 2
    return band(noise(dur), freq * 0.5, SR / 2 - 1) * env * amp


def airy(dur, lo, hi, amp=0.5):
    """Band noise with a soft attack and release; cloth, air."""
    t = t_axis(dur)
    a = min(0.04, dur * 0.3)
    env = np.minimum(1, t / a) * np.minimum(1, (dur - t) / a)
    return norm(band(noise(dur), lo, hi), 1) * env * amp


def whoosh(dur, f0, f1, peak=0.4, q=1.0):
    """Noise whose band sweeps f0 -> f1 (exponentially), loudest at `peak` of the way through."""
    n = int(dur * SR)
    out = np.zeros(n + 2048)
    hop, size = 512, 1024
    win = np.hanning(size)
    src = _rng.standard_normal(n + 2048)
    for start in range(0, n, hop):
        u = start / max(n, 1)
        fc = f0 * (f1 / f0) ** u
        spec = np.fft.rfft(src[start:start + size] * win)
        f = np.fft.rfftfreq(size, 1 / SR)
        spec *= np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) * 1.6 * q) ** 2)
        out[start:start + size] += np.fft.irfft(spec, size) * win
    out = out[:n]
    u = np.arange(n) / n
    env = np.where(u < peak, (u / peak) ** 1.5, ((1 - u) / (1 - peak)) ** 1.5)
    return norm(out, 1) * env


def blip(freq, dur=0.3, tau=0.08):
    t = t_axis(dur)
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / tau) * np.minimum(1, t / 0.004) * 0.9


def chime(freqs, dur=2.4, tau=0.9):
    """Bell-like notes, struck a little apart; each has a slightly inharmonic overtone."""
    n = int(dur * SR)
    out = np.zeros(n)
    for i, f in enumerate(freqs):
        t = t_axis(dur - 0.09 * i)
        note = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (tau * 0.3))) * np.exp(-t / tau)
        note *= np.minimum(1, t / 0.003)
        s = int(0.09 * i * SR)
        out[s:s + len(note)] += note
    return norm(out, 0.9)


def impact(amp=1.0):
    """A low hit with a short bright edge."""
    t = t_axis(1.6)
    phase = 2 * np.pi * (38 * t + 52 * 0.07 * (1 - np.exp(-t / 0.07)))
    body = np.sin(phase) * np.exp(-t / 0.45)
    edge = band(noise(1.6), 200, 4000) * np.exp(-t / 0.025) * 0.5
    return np.tanh(1.6 * (body + edge)) * amp * 0.9


def riser(dur, f0, f1):
    """Rising noise and tone, swelling toward the end."""
    t = t_axis(dur)
    u = t / dur
    sweep = whoosh(dur, f0, f1, peak=0.97, q=0.8)
    f = f0 * (f1 / f0) ** u
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 2 * 0.25
    return sweep + tone
