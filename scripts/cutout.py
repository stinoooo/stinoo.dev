#!/usr/bin/env python3
"""Cuts me out of my profile picture: writes assets/me-cutout.png (RGBA, transparent background).

Two segmentation models, each good at half the job: isnet-general-use keeps the spiky tips of my
hair, birefnet-portrait keeps the shoulders and shirt clean. The head area takes the union of both
masks, the rest uses birefnet only.

  python scripts/cutout.py --input ../stinoooo/assets/stino.png
Needs rembg[cpu] and Pillow; the models download on first run (about 1 GB).
"""
import argparse
import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", default="assets/me-cutout.png")
ap.add_argument("--head", type=float, default=0.55, help="fraction of the height, from the top, that counts as head")
a = ap.parse_args()

src = Image.open(a.input).convert("RGB")
masks = {}
for name in ("birefnet-portrait", "isnet-general-use"):
    cut = remove(src, session=new_session(name), post_process_mask=False)
    masks[name] = np.asarray(cut.split()[3], dtype=np.float32)

body = masks["birefnet-portrait"]
hair = masks["isnet-general-use"]
h = body.shape[0]
rows = np.arange(h)[:, None]
# blend from the union at the top to birefnet alone below the head, over 6% of the height
t = np.clip((rows / h - a.head) / 0.06, 0, 1)
alpha = np.maximum(body, hair) * (1 - t) + body * t
mask = Image.fromarray(alpha.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
out = src.copy()
out.putalpha(mask)
out.save(a.out)
print(f"wrote {a.out} {out.size}")
