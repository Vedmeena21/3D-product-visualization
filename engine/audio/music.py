"""The bed under the video: chords, a few keys, a bass line and light drums, all generated."""

import numpy as np

from .synth import SR, hz, noise, band, t_axis


def chords(*specs):
    """chords("Em9:E2 B2 D3 F#3 G3/E1") -> [(name, [freqs], bass_freq)], one per bar."""
    out = []
    for s in specs:
        name, rest = s.split(":")
        notes, _, bass = rest.partition("/")
        out.append((name, [hz(n) for n in notes.split()], hz(bass) if bass else None))
    return out


def _pad_voice(f, dur, detune):
    t = t_axis(dur)
    x = np.zeros_like(t)
    for k, amp in ((1, 1.0), (2, 0.45), (3, 0.2), (4, 0.1)):
        x += amp * np.sin(2 * np.pi * f * k * (1 + detune) * t + k)
    a, r = min(1.2, dur * 0.4), min(1.5, dur * 0.4)
    return x * np.minimum(1, t / a) * np.minimum(1, (dur - t) / r)


def _epiano(f, dur, vel):
    t = t_axis(dur)
    mod = np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.12) * 1.4
    tone = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.7)
    tine = np.sin(2 * np.pi * f * 6.9 * t) * np.exp(-t / 0.04) * 0.15
    return (tone + tine) * vel * np.minimum(1, t / 0.002)


def _lowpass(x, fc):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(spec / (1 + (f / fc) ** 4), len(x))


def _add(buf, start, x, gain=1.0):
    s = int(start * SR)
    if s >= len(buf):
        return
    n = min(len(x), len(buf) - s)
    buf[s:s + n] += x[:n] * gain


def bed(dur, bpm, progression, motif, motif_voice="epiano", kicks=(0,), snares=(), hats=8, swing=0.0, keys_vel=0.7, keys_lp=4000, drums_from=0):
    """Returns (left, right, bass, drums), each as long as `dur` seconds.
    progression: from chords(); one chord per bar, repeating. motif: [(beat in bar, freq)], played every bar.
    kicks / snares: beats within the bar. hats: hits per bar. drums_from: first bar with drums."""
    n = int(dur * SR)
    beat = 60 / bpm
    bar = 4 * beat
    nbars = int(dur / bar) + 2
    L, R, bass, drums, keys = (np.zeros(n) for _ in range(5))
    for b in range(nbars):
        name, freqs, bf = progression[b % len(progression)]
        t0 = b * bar
        for i, f in enumerate(freqs):
            _add(L, t0, _pad_voice(f, bar + 1.5, 0.0009 * (1 + i % 3)), 0.07)
            _add(R, t0, _pad_voice(f, bar + 1.5, -0.0009 * (1 + i % 3)), 0.07)
        if bf:
            t = t_axis(bar + 0.3)
            _add(bass, t0, (np.sin(2 * np.pi * bf * t) + 0.3 * np.sin(2 * np.pi * bf * 2 * t)) * np.minimum(1, t / 0.02) * np.minimum(1, (bar + 0.3 - t) / 0.3), 0.25)
        for j, (bt, f) in enumerate(motif):
            _add(keys, t0 + bt * beat, _epiano(f, 1.6, keys_vel * (1 - 0.12 * j)), 0.16)
        if b >= drums_from:
            for k in kicks:
                t = t_axis(0.35)
                _add(drums, t0 + k * beat, np.sin(2 * np.pi * (46 * t + 70 * 0.04 * (1 - np.exp(-t / 0.04)))) * np.exp(-t / 0.12), 1.0)
            for s in snares:
                _add(drums, t0 + s * beat, band(noise(0.2), 900, 7000) * np.exp(-t_axis(0.2) / 0.05), 0.6)
            step = 4 / hats
            for h in range(hats):
                off = (swing * step * beat) if h % 2 else 0.0
                tt = t_axis(0.05)
                _add(drums, t0 + h * step * beat + off, band(noise(0.05), 7000, 20000) * np.exp(-tt / 0.012), 0.2 if h % 2 else 0.3)
    keys = _lowpass(keys, keys_lp)
    return (L + keys * 0.9)[:n], (R + keys * 1.1)[:n], bass[:n], drums[:n]
