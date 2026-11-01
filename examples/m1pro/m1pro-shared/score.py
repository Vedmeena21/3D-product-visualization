"""Score for the GravaStar Mercury M1 Pro film: a cool chord bed (Em9 at 92 bpm, shots cut on its bars) at full level
under the hook, with a low hit as it starts; held low through the dark title under a slow air sweep, a chime when the
shell lights, a riser into the walkthrough's first flick; soft ticks as the console builds; air on each cut; cloth
under every flick, a breath on each lift and a soft
set-down. The switch is the hero: slowed twentyfold its closing is a long, low snap with the music pulled back
around it; at full speed each closing is a sharp tick over a body thud, each opening a softer tick, panned to its
button. A tiny tick per wheel detent, a UI click on every button the operator presses, the layers lifting apart and
landing, and a last chord under the card.

    .venv/bin/python engine/run_sfx.py examples/m1pro/m1pro-shared/score.py

Every time comes from m1pro-film/timeline.json, which examples/m1pro/tools/timeline.mjs samples from film.js and model.js.
"""

import math
import os

from sfx.score_kit import airy, bed, chords, hiss, hz, thud
from sfx.synth import SR, blip, chime, click, impact, riser, whoosh

TIMELINE = "../m1pro-film/timeline.json"
OUT = os.path.join(os.environ.get("TEARDOWN_OUT", "teardown-out"), "m1pro-score.wav")
TARGET_LUFS = -14.0
SEED = 1600

BPM = 92
BAR = 4 * 60 / BPM
CHORDS = chords("Em9:E2 B2 D3 F#3 G3/E1", "Cmaj7:C2 G2 B2 E3 G3/C1", "Am9:A1 E2 G2 B2 C3/A0", "Bsus4:B1 F#2 A2 B2 E3/B0")
MOTIF = [(0.5, hz("B4")), (1.5, hz("D5")), (2.5, hz("F#5"))]


def ramp(t, a, b):
    return min(1.0, max(0.0, (t - a) / (b - a)))


def snap_slow(dur=0.9):
    """The switch closing, heard at a twentieth of its speed: a low knock with a long ring, a slow scrape into it."""
    n = int(dur * SR)
    out = []
    ph = 0.0
    for k in range(n):
        tt = k / SR
        f = 260 + 520 * math.exp(-tt / 0.05)
        ph += 2 * math.pi * f / SR
        s = math.sin(ph) * math.exp(-tt / 0.22) * 0.9
        s += math.sin(2 * math.pi * 1310 * tt) * math.exp(-tt / 0.09) * 0.35
        out.append(math.tanh(1.4 * s))
    return out


def score(mix, tl):
    dur = tl["duration"]
    left, right, low, drums = bed(dur, BPM, CHORDS, MOTIF, motif_voice="epiano", kicks=(0, 2.5), snares=(), hats=8, swing=0.0, keys_vel=0.65, keys_lp=3400, drums_from=0)
    # the bed's level: full under the hook, low through the dark title, full again from the reveal, pulled back
    # around the slowed click
    slow = [c["t"] for c in tl["closes"] if c["rate"] < 0.2] + [o["t"] for o in tl["opens"] if o["rate"] < 0.2]
    up = tl["studioUp"]
    down = tl["studioDown"]

    def gain(t):
        g = 1 - 0.62 * ramp(t, down, down + 1.0) * (1 - ramp(t, up, up + 1.6))
        if slow:
            a, b = min(slow) - 0.9, max(slow) + 0.5
            g *= 1 - 0.7 * ramp(t, a, a + 0.35) * (1 - ramp(t, b, b + 0.6))
        return g

    env = [gain(i / SR) for i in range(len(left))]
    mix.put_stereo(0, [x * g for x, g in zip(left, env)], [x * g for x, g in zip(right, env)], 0.11)
    mix.put(0, [x * g for x, g in zip(low, env)], 0.11)
    mix.put(0, [x * g for x, g in zip(drums, env)], 0.04)

    # the hook opens on a low hit under its first flick
    mix.put(tl["flicks"][0]["t"], impact(1.0), 0.06)
    # the title: the room goes dark, air across the skeleton, the shell lighting, a riser into the walkthrough
    mix.put(down - 0.1, whoosh(1.4, 2200, 260, peak=0.35), 0.03)
    sw = tl["sweep"]
    mix.put(sw["t"], whoosh(sw["dur"], 260, 2600, peak=0.55, q=0.7), 0.05)
    mix.put(tl["glowOn"], chime([hz("E5"), hz("B5"), hz("F#6")], dur=2.4, tau=0.9), 0.05)
    walk = next(f["t"] for f in tl["flicks"] if f["t"] > up)
    mix.put(walk - 2.2, riser(2.2, 220, 3600), 0.035)
    mix.put(walk, thud(70, 0.25, 0.8), 0.09)
    # the console building, panel by panel (the same stagger as console.js: 13 groups, lag 0.055, over 1.8 s)
    lag, groups = 0.055, 13
    for i in range(groups):
        x = (0.5 + lag * i) / (1 + lag * (groups - 1))
        # invert the smootherstep the reveal is eased with
        lo, hi = 0.0, 1.0
        for _ in range(30):
            mid = (lo + hi) / 2
            if mid * mid * mid * (mid * (mid * 6 - 15) + 10) < x:
                lo = mid
            else:
                hi = mid
        mix.put(up + 0.4 + 1.8 * lo, click(4600, 0.02), 0.022, pan=-0.5 if i % 2 else 0.5)
    # cuts and feature numbers
    for t in tl["cuts"]:
        mix.put(t - 0.25, whoosh(0.7, 500, 2200, peak=0.45), 0.018)
    for t in tl["bigs"]:
        mix.put(t + 0.05, blip(hz("B5"), dur=0.3, tau=0.08), 0.03)

    # cloth under the skates: band noise as long as the move, level with its size
    for f in tl["flicks"]:
        size = min(1.0, abs(float(f["mm"])) / 100.0)
        d = max(0.12, f["duration"])
        mix.put(f["t"], airy(d, 900, 2600, 0.5 + 0.5 * size), 0.035 * (0.3 + 0.7 * size))
    for t in tl["lifts"]:
        mix.put(t, hiss(0.25, 6000, 0.5), 0.012)
    for t in tl["setdowns"]:
        mix.put(t, thud(140, 0.035, 0.25), 0.07)
    # the switch: slowed, a long low snap; at speed, a sharp tick over a thud closing, a softer tick opening
    for c in tl["closes"]:
        pan = -0.35 if c["btn"] == "L" else 0.35
        if c["rate"] < 0.2:
            mix.put(c["t"] - 0.35, whoosh(0.4, 1800, 500, peak=0.85), 0.03, pan)
            mix.put(c["t"], snap_slow(), 0.2, pan)
        else:
            mix.put(c["t"], click(3400, 0.035), 0.16, pan)
            mix.put(c["t"], thud(210, 0.018, 0.12), 0.08, pan)
    for o in tl["opens"]:
        pan = -0.35 if o["btn"] == "L" else 0.35
        if o["rate"] < 0.2:
            mix.put(o["t"], snap_slow(0.6)[: int(0.6 * SR)], 0.1, pan)
        else:
            mix.put(o["t"], click(2900, 0.025), 0.09, pan)
    for t in tl["detents"]:
        mix.put(t, click(5200, 0.012), 0.05)
    for t in tl["presses"]:
        mix.put(t, click(2400, 0.025), 0.045)
    # apart and back: air up, seven small knocks as the layers go; air down, knocks as they land
    e_on, e_off = tl["explode"][0], tl["explode"][1]
    mix.put(e_on, whoosh(1.8, 300, 1800, peak=0.5), 0.03)
    mix.put(e_off, whoosh(1.8, 1800, 300, peak=0.5), 0.03)
    for i in range(7):
        mix.put(e_on + 0.12 + 0.22 * i, thud(120 + 30 * i, 0.03, 0.2), 0.03)
        mix.put(e_off + 1.9 - 0.18 * i, thud(300 - 25 * i, 0.03, 0.2), 0.035)
    # the card
    mix.put(tl["endcard"] - 0.2, chime([hz("E4"), hz("B4"), hz("D5"), hz("F#5")], dur=3.2, tau=1.2), 0.05)
