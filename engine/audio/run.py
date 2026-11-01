"""Render a score: python3 engine/audio/run.py path/to/score.py

A score module defines TIMELINE (a JSON path, relative to the score), OUT, TARGET_LUFS, SEED and score(mix, timeline)."""

import importlib.util
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audio import synth  # noqa: E402
from audio.mix import Mix  # noqa: E402


def main(path):
    path = os.path.abspath(path)
    spec = importlib.util.spec_from_file_location("score", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    with open(os.path.join(os.path.dirname(path), mod.TIMELINE)) as f:
        tl = json.load(f)
    synth.seed(getattr(mod, "SEED", 1))
    mix = Mix(tl["duration"])
    mod.score(mix, tl)
    os.makedirs(os.path.dirname(os.path.abspath(mod.OUT)), exist_ok=True)
    lufs, peak = mix.render(mod.OUT, getattr(mod, "TARGET_LUFS", -14.0))
    print(f"{mod.OUT}: {tl['duration']:.2f} s, {lufs:.1f} LUFS, peak {peak:.1f} dBFS")


if __name__ == "__main__":
    main(sys.argv[1])
