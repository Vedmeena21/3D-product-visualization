# Sound

The score is Python (numpy) and is built from the video's own cue times, so slow motion keeps its sound in sync.

```bash
node examples/m1pro/tools/timeline.mjs                               # writes timeline.json
python3 engine/audio/run.py examples/m1pro/m1pro-shared/score.py     # writes out/m1pro-score.wav
```

## A score file

A score module defines `TIMELINE` (path to the JSON, relative to the file), `OUT`, `TARGET_LUFS`, `SEED` and `score(mix, timeline)`.

```python
def score(mix, tl):
    mix.put(tl["flicks"][0]["t"], impact(1.0), 0.06)
    for c in tl["closes"]:
        mix.put(c["t"], click(3400, 0.035), 0.16, pan=-0.35)
```

## Mixer

| Call | Does |
|---|---|
| `mix.put(t, samples, gain, pan)` | place a mono sound at `t` seconds; `pan` from −1 (left) to 1 (right) |
| `mix.put_stereo(t, left, right, gain)` | place a stereo pair |
| `mix.render(path, target_lufs)` | master to the loudness target (ffmpeg's EBU R128 meter), soft-limit the peaks, write 16-bit WAV |

## Sounds (`engine/audio/synth.py`)

`click` · `thud` · `hiss` · `airy` · `whoosh` · `blip` · `chime` · `impact` · `riser`, plus `hz("F#5")` for note names and `seed(n)` so a render is repeatable.

## Music bed (`engine/audio/music.py`)

`chords("Em9:E2 B2 D3 F#3 G3/E1", ...)` describes one chord per bar, with an optional bass note after `/`.
`bed(dur, bpm, progression, motif, kicks, snares, hats, swing, keys_vel, keys_lp, drums_from)` returns `(left, right, bass, drums)`, each as long as `dur`, so you can mix them with their own levels and ducking.
