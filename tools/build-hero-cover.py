"""Build the hero cover art from the supplied desk-scene GIF.

The source is a flat illustration on a solid blue backdrop, which fights the
site's red/black language. So the scene is reduced to luminance, its backdrop
crushed to pure black, and the tones remapped through a red duotone ramp keyed
to the brand red. The page then composites it with `mix-blend-mode: screen`:
black drops out, and what remains reads as a red light-plate rather than a
pasted-in rectangle. Keeping the frames opaque also lets the encoder diff them,
which is what holds the animation near 300KB.

Outputs (into images/): an animated WebP (primary), an animated GIF (fallback
for browsers without WebP), and a still frame for prefers-reduced-motion.

Usage:  python3 tools/build-hero-cover.py path/to/source.gif
Needs:  pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else "hero-cover-source.gif"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "images")
BG = np.array([0, 111, 207], dtype=np.float32)   # the illustration's blue backdrop
TOL = 62                                          # distance that still counts as backdrop
FLOOR = 26                                        # crush source grain back to true black

# Duotone ramp. The exponents do two jobs: red climbs ahead of green and blue
# so midtones land on the brand red, and all three stay steep enough that the
# scene's large flat fills (the desk) drop back while the linework and the
# figure keep their brightness.
_l = np.linspace(0.0, 1.0, 256)
LUT = np.stack([
    255.0 * _l ** 1.90,
    255.0 * _l ** 4.20 * 0.62,
    255.0 * _l ** 4.80 * 0.46,
], axis=-1).astype(np.uint8)


def plate(step, w, h):
    """Duotoned frames on a pure-black field, sampled every `step` frames."""
    src, out, i = Image.open(SRC), [], 0
    while True:
        try:
            src.seek(i)
        except EOFError:
            break
        if i % step == 0:
            rgb = np.asarray(src.convert("RGB"), dtype=np.float32)
            backdrop = np.sqrt(((rgb - BG) ** 2).sum(-1)) < TOL
            lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
            lum[backdrop] = 0.0
            lum[lum < FLOOR] = 0.0
            frame = Image.fromarray(lum.astype(np.uint8), "L").resize((w, h), Image.LANCZOS)
            out.append(Image.fromarray(LUT[np.asarray(frame)], "RGB"))
        i += 1
    return out


main = plate(2, 640, 480)          # 12.5fps, 8.1s loop
main[0].save(f"{OUT}/hero-cover.webp", save_all=True, append_images=main[1:],
             duration=80, loop=0, quality=68, method=5, minimize_size=True)

fallback = [f.convert("P", palette=Image.ADAPTIVE, colors=48)
            for f in plate(3, 480, 360)]
fallback[0].save(f"{OUT}/hero-cover.gif", save_all=True, append_images=fallback[1:],
                 duration=120, loop=0, optimize=True)

main[0].save(f"{OUT}/hero-cover-still.webp", quality=82, method=5)
main[0].save(f"{OUT}/hero-cover-still.png", optimize=True)
print("built", len(main), "frames")
