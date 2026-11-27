#!/usr/bin/env python3
"""Draws site/portrait.json: my profile picture as colored ASCII for the about page.

Reads the still that face-from-photo.py writes (the cut-out on black), so the background stays empty.
Each cell keeps the photo's own color; brightness picks the glyph.

  python scripts/portrait-art.py --input face-src-still.png
Needs opencv-python-headless and numpy.
"""
import argparse, json
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", default="site/portrait.json")
ap.add_argument("--cols", type=int, default=76)
a = ap.parse_args()

RAMP = " .:-=+*cs#%@"
img = cv2.imread(a.input)
h, w = img.shape[:2]
rows = int(a.cols * h / w * 0.5)  # glyphs are about twice as tall as wide
small = cv2.resize(img, (a.cols, rows), interpolation=cv2.INTER_AREA)
lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB)
L = lab[:, :, 0].astype(np.float32) / 255
lit = L[L > 0.04]
lo, hi = (np.percentile(lit, 2), np.percentile(lit, 99)) if lit.size else (0, 1)

out = []
for y in range(rows):
    chars, colors = [], []
    for x in range(a.cols):
        v = L[y, x]
        if v <= 0.04:
            chars.append(" ")
            colors.append("000")
            continue
        t = min(1.0, max(0.0, (v - lo) / (hi - lo))) ** 0.8
        chars.append(RAMP[1 + min(len(RAMP) - 2, int(t * (len(RAMP) - 1)))])
        b, g, r = (int(c) for c in small[y, x])
        # lift the color a little so dark cells still read on a dark page
        m = max(r, g, b, 1)
        k = max(1.0, 110 / m)
        r, g, b = (min(255, int(c * k)) for c in (r, g, b))
        colors.append("".join(f"{c >> 4:x}" for c in (r, g, b)))
    out.append(["".join(chars).rstrip(), "".join(colors)])

json.dump({"cols": a.cols, "rows": out}, open(a.out, "w"), separators=(",", ":"))
print(f"wrote {a.out}: {a.cols}x{rows}")
