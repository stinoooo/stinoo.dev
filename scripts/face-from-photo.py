#!/usr/bin/env python3
"""Turns a still photo (my profile picture) into a short looping clip for the intro's face layer.

The intro draws a face out of code glyphs from a video (see build-face.py). I only have a photo,
so this takes the cut-out from scripts/cutout.py, puts me on black, and moves the camera
very slightly (a slow push-in and a small sway) so the tracking points have something to follow.
The clip loops seamlessly: every motion is one full sine period.

  python scripts/cutout.py --input ../stinoooo/assets/stino.png
  python scripts/face-from-photo.py --input assets/me-cutout.png --out face-src.mp4
  python scripts/build-face.py --input face-src.mp4 --out . --seconds 6 --gamma 0.8 --clahe 2

Needs opencv-python-headless and numpy; ffmpeg on PATH.
"""
import argparse, math, os, subprocess, tempfile
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", default="face-src.mp4")
ap.add_argument("--crop", default="560x768+110+0", help="WxH+X+Y of the head and shoulders, about 0.73 aspect")
ap.add_argument("--seconds", type=float, default=6.0)
ap.add_argument("--fps", type=int, default=25)
a = ap.parse_args()

img = cv2.imread(a.input, cv2.IMREAD_UNCHANGED)
if img.shape[2] != 4:
    raise SystemExit("expects the RGBA cut-out from scripts/cutout.py")
w, rest = a.crop.split("x")
h, x, y = rest.replace("+", " ").split()
w, h, x, y = int(w), int(h), int(x), int(y)
img = img[y : y + h, x : x + w]
H, W = img.shape[:2]
# me on black: the face layer draws brightness, so the background has to be empty
alpha = img[:, :, 3:4].astype(np.float32) / 255
cut = (img[:, :, :3].astype(np.float32) * alpha).astype(np.uint8)
cv2.imwrite(os.path.splitext(a.out)[0] + "-still.png", cut)

# A slow push-in and a small sway, both one full period over the clip, so it loops.
tmp = tempfile.mkdtemp(prefix="facephoto_")
frames = int(a.seconds * a.fps)
for k in range(frames):
    t = k / frames
    zoom = 1.035 + 0.035 * math.sin(2 * math.pi * t)
    angle = 1.1 * math.sin(2 * math.pi * t + 0.6)
    dx = 5 * math.sin(2 * math.pi * t + 1.3)
    dy = 3 * math.sin(4 * math.pi * t)
    m = cv2.getRotationMatrix2D((W / 2, H * 0.45), angle, zoom)
    m[0, 2] += dx
    m[1, 2] += dy
    frame = cv2.warpAffine(cut, m, (W, H), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0))
    cv2.imwrite(os.path.join(tmp, f"{k:04d}.png"), frame)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(a.fps), "-i", os.path.join(tmp, "%04d.png"),
                "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", a.out], check=True)
print(f"wrote {a.out} ({frames} frames, {W}x{H})")
