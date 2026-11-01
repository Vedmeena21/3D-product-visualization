"""Place sounds on a stereo timeline, then master it to a loudness target."""

import subprocess
import re
import wave

import numpy as np

from .synth import SR


class Mix:
    def __init__(self, dur, tail=1.0):
        self.n = int((dur + tail) * SR)
        self.dur = dur
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def _add(self, t, x, gain, pl, pr):
        s = int(round(t * SR))
        a = max(0, -s)
        if s >= self.n or a >= len(x):
            return
        x = np.asarray(x, dtype=float)[a:]
        s = max(0, s)
        m = min(len(x), self.n - s)
        self.L[s:s + m] += x[:m] * gain * pl
        self.R[s:s + m] += x[:m] * gain * pr

    def put(self, t, x, gain=1.0, pan=0.0):
        """Mono sound at t seconds; pan -1 (left) .. 1 (right), equal power."""
        th = (pan + 1) * np.pi / 4
        self._add(t, x, gain, np.cos(th), np.sin(th))

    def put_stereo(self, t, left, right, gain=1.0):
        self._add(t, left, gain, 1.0, 0.0)
        self._add_r(t, right, gain)

    def _add_r(self, t, x, gain):
        s = int(round(t * SR))
        x = np.asarray(x, dtype=float)
        m = min(len(x), self.n - s)
        if 0 <= s < self.n:
            self.R[s:s + m] += x[:m] * gain

    def render(self, path, target_lufs=-14.0, ceiling_db=-2.0):
        """Write a 16-bit stereo WAV mastered to target_lufs, peaks held under ceiling_db."""
        n = int(self.dur * SR)
        y = np.stack([self.L[:n], self.R[:n]], axis=1)
        for _ in range(4):
            lufs = measure_lufs(y)
            y = y * 10 ** ((target_lufs - lufs) / 20)
            ceil = 10 ** (ceiling_db / 20)
            peak = np.max(np.abs(y))
            if peak <= ceil:
                break
            # soft-knee limiter above 70% of the ceiling, then measure again
            k = ceil * 0.7
            a = np.abs(y)
            y = np.where(a > k, np.sign(y) * (k + (ceil - k) * np.tanh((a - k) / (ceil - k))), y)
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
        return measure_lufs(y), 20 * np.log10(np.max(np.abs(y)))


def measure_lufs(y):
    """Integrated loudness (EBU R128) by way of ffmpeg's ebur128 filter."""
    raw = (np.clip(y, -1, 1) * 32767).astype("<i2").tobytes()
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", "ebur128", "-f", "null", "-"], input=raw, capture_output=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr.decode())
    return float(m[-1])
