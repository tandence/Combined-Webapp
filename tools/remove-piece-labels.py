"""Create text-free subpage assets without changing the original 3D pieces."""

from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "pain-jigsaw" / "assets" / "pieces-3d-png"

# filename: (output stem, text RGB retained for documentation, label bounding box, legacy threshold)
PIECES = {
    "acceptance-final.png": ("acceptance-clean", (138, 74, 24), (125, 150, 295, 230), 105),
    "activity.png": ("activity-clean", (23, 76, 123), (115, 140, 305, 255), 105),
    "communication-final.png": ("communication-clean", (193, 47, 138), (85, 145, 335, 225), 125),
    "flare-final.png": ("flare-clean", (255, 255, 255), (120, 150, 300, 225), 140),
    "goals.png": ("goals-clean", (23, 76, 123), (105, 120, 315, 280), 110),
    "medication-final-v2.png": ("medication-clean", (157, 21, 21), (115, 150, 305, 225), 115),
    "movement-final.png": ("movement-clean", (157, 21, 21), (115, 150, 305, 225), 115),
    "nutrition.png": ("nutrition-clean", (193, 47, 138), (105, 130, 315, 265), 125),
    "reconnect.png": ("reconnect-clean", (138, 74, 24), (100, 110, 320, 295), 110),
    "relaxation.png": ("relaxation-clean", (138, 74, 24), (100, 130, 320, 265), 110),
    "sleep-final.png": ("sleep-clean", (23, 76, 123), (130, 150, 290, 225), 105),
    "thoughts.png": ("thoughts-clean", (255, 255, 255), (100, 115, 320, 285), 140),
    "toolbox.png": ("toolbox-clean", (23, 76, 123), (100, 120, 320, 280), 110),
    "understand-final-v2.png": ("understand-clean", (255, 255, 255), (100, 115, 320, 280), 140),
}


def dilate(mask: np.ndarray, rounds: int = 10) -> np.ndarray:
    result = mask.copy()
    for _ in range(rounds):
        expanded = result.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                expanded |= np.roll(np.roll(result, dy, axis=0), dx, axis=1)
        result = expanded
    return result


def keep_letter_components(candidate: np.ndarray) -> np.ndarray:
    """Keep small enclosed components; discard bevel/shadow regions reaching the ROI edge."""
    height, width = candidate.shape
    seen = np.zeros_like(candidate)
    kept = np.zeros_like(candidate)
    for start_y, start_x in zip(*np.where(candidate & ~seen)):
        stack = [(int(start_y), int(start_x))]
        component = []
        touches_edge = False
        seen[start_y, start_x] = True
        while stack:
            y, x = stack.pop()
            component.append((y, x))
            touches_edge |= y == 0 or x == 0 or y == height - 1 or x == width - 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width and candidate[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        if not touches_edge and 3 <= len(component) <= 1400:
            for y, x in component:
                kept[y, x] = True
    return kept


def diffuse_fill(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    out = rgb.astype(np.float64)
    remaining = mask.copy()
    known = ~remaining
    while remaining.any():
        sums = np.zeros_like(out)
        counts = np.zeros(remaining.shape, dtype=np.float64)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                neighbour_known = np.roll(np.roll(known, dy, axis=0), dx, axis=1)
                neighbour_rgb = np.roll(np.roll(out, dy, axis=0), dx, axis=1)
                sums += neighbour_rgb * neighbour_known[..., None]
                counts += neighbour_known
        frontier = remaining & (counts > 0)
        out[frontier] = sums[frontier] / counts[frontier, None]
        known[frontier] = True
        remaining[frontier] = False
    return np.clip(out, 0, 255).astype(np.uint8)


def repair_letters(pixels: np.ndarray, box: tuple[int, int, int, int], white_text: bool) -> tuple[np.ndarray, int]:
    x1, y1, x2, y2 = box
    rgb = pixels[..., :3].astype(np.float64)
    roi = rgb[y1:y2, x1:x2]
    luminance = .2126 * roi[..., 0] + .7152 * roi[..., 1] + .0722 * roi[..., 2]
    median = float(np.median(luminance))
    candidate = luminance > median + 18 if white_text else luminance < median - 18
    local_mask = keep_letter_components(candidate)
    mask = np.zeros(luminance.shape if False else pixels.shape[:2], dtype=bool)
    mask[y1:y2, x1:x2] = local_mask
    mask = dilate(mask, 10) & (pixels[..., 3] > 0)
    repaired = diffuse_fill(pixels[..., :3], mask)
    output = pixels.copy()
    output[mask, :3] = repaired[mask]
    return output, int(mask.sum())


for filename, (stem, target_rgb, box, _threshold) in PIECES.items():
    source = ASSETS / filename
    image = Image.open(source).convert("RGBA")
    pixels = np.asarray(image).copy()
    pixels, changed = repair_letters(pixels, box, target_rgb == (255, 255, 255))
    repaired_image = Image.fromarray(pixels, "RGBA")
    # A restrained blur inside the flat centre removes any anti-aliased label
    # residue. The feathered mask never reaches the silhouette or bevel.
    x1, y1, x2, y2 = box
    softened = repaired_image.filter(ImageFilter.GaussianBlur(radius=7))
    blend_mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(blend_mask)
    draw.rounded_rectangle((x1, y1, x2, y2), radius=12, fill=255)
    blend_mask = blend_mask.filter(ImageFilter.GaussianBlur(radius=5))
    repaired_image = Image.composite(softened, repaired_image, blend_mask)
    output = ASSETS / f"{stem}.png"
    repaired_image.save(output, optimize=True)
    print(f"{filename} -> {output.name}: repaired {changed} pixels")
