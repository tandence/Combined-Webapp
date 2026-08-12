"""Remove the multi-line Thoughts label from the original 3D PNG."""

from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "pain-jigsaw" / "assets" / "pieces-3d-png"
source = Image.open(ASSETS / "thoughts.png").convert("RGBA")
pixels = np.asarray(source).copy()
rgb = pixels[..., :3].astype(np.float64)

# The lettering occupies only this flat centre panel. Exclude the sockets,
# bevel and outer shadow, then replace the complete label area with the
# surrounding teal material before softly blending it into the source.
x1, y1, x2, y2 = 96, 108, 324, 282
top = rgb[y1 - 10:y1, x1:x2].mean(axis=0)
bottom = rgb[y2:y2 + 10, x1:x2].mean(axis=0)
height, width = y2 - y1, x2 - x1
fill = np.empty((height, width, 3), dtype=np.float64)
for row in range(height):
    t = (row + 1) / (height + 1)
    fill[row] = top * (1 - t) + bottom * t

repaired = pixels.copy()
repaired[y1:y2, x1:x2, :3] = np.clip(fill, 0, 255).astype(np.uint8)
base = Image.fromarray(repaired, "RGBA").filter(ImageFilter.GaussianBlur(radius=5))

# Composite the repaired centre over the untouched source with a broad,
# feathered edge. This removes any rectangular transition.
mask = Image.new("L", source.size, 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle((x1 + 8, y1 + 8, x2 - 8, y2 - 8), radius=18, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(radius=6))
result = Image.composite(base, source, mask)
result.save(ASSETS / "thoughts-clean.png", optimize=True)
