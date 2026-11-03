"""Companion sprites in the lemon's halftone (docs/FOUNDATION.md, Companions).

    python3 -I scripts/companions/build.py            # all companions
    python3 -I scripts/companions/build.py raspberry  # one

Source photos live in scripts/companions/src/ (Gemini, isolated on flat white: gen.mjs).
Each source is cut out of its ground, toned like the lemon, rotated or posed per frame in
continuous tone, and only then screened, so the dot screen never turns with the subject
(the lemon's dots stay put while the fruit turns under them).

The screen is the lemon's, measured from assets-src/lemon-rotation-sprite.png: a 45 degree
clustered-dot screen on the lattice (2,2) (2,-2) at 2x (8 pixels per cell, dots grow from a
2x2 seed), black dots on an opaque white body, antialiased alpha only at the silhouette.
Frames are built at 2x the CSS size so the dots match the lemon's on screen exactly;
the 1x strip is a box downsample of the 2x one, as lemon-sprite-180 is.

Output: public/img/companions/<name>-<2x>.webp and <name>-<1x>.webp, one row of frames.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'scripts/companions/src'
OUT = ROOT / 'public/img/companions'

# ---------- the lemon's screen ----------
def screen(h, w):
    """threshold per pixel in (0,1): the lemon's 45 degree clustered-dot screen"""
    centres = [(0.5, 2.5), (2.5, 0.5), (2.5, 4.5), (-1.5, 0.5), (-1.5, 4.5), (0.5, -1.5), (4.5, 2.5)]
    tile = np.zeros((4, 4))
    # rank each pixel of the 4x4 tile within its own cell by distance to the cell's centre
    owner, dist = {}, {}
    for y in range(4):
        for x in range(4):
            d = [((y - cy) ** 2 + (x - cx) ** 2, i) for i, (cy, cx) in enumerate(centres)]
            dd, i = min(d)
            # fold mirrored centres onto the two real cells
            cell = 0 if centres[i] in [(0.5, 2.5), (4.5, 2.5), (0.5, -1.5)] else 1
            owner[(y, x)] = cell
            dist[(y, x)] = dd + 0.001 * (y * 4 + x)
    for cell in (0, 1):
        px = sorted([p for p in owner if owner[p] == cell], key=lambda p: dist[p])
        for r, p in enumerate(px):
            tile[p] = (r + 0.5) / len(px)
    return np.tile(tile, (h // 4 + 1, w // 4 + 1))[:h, :w]

# ---------- cut-out ----------
def largest_component(mask):
    """keep the largest 4-connected blob of a small boolean mask (no scipy)"""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    best, best_n, n = 0, 0, 0
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or lab[sy, sx]:
                continue
            n += 1
            stack, count = [(sy, sx)], 0
            lab[sy, sx] = n
            while stack:
                y, x = stack.pop()
                count += 1
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
            if count > best_n:
                best, best_n = n, count
    return lab == best

def cutout(img, lo=10, hi=34, floor=None, chroma=False):
    """alpha from the distance to the flat ground.
    chroma: judge by colourfulness, so a grey cast shadow is ground, not subject.
    floor: drop everything below this fraction of the height (a perch rod under the feet)."""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    k = 24
    corners = np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    if chroma:
        c = a.max(axis=2) - a.min(axis=2)
        d = np.maximum(c - (bg.max() - bg.min()), (bg.mean() - a.mean(axis=2)) - 60)
    else:
        d = np.abs(a - bg).max(axis=2)
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    if floor is not None:
        alpha[int(floor * h):] = 0
    # one subject: the largest blob, its holes filled (judged on a 256px copy)
    s = 256
    small = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((s, s), Image.BILINEAR)) > 100
    keep = largest_component(small)
    inside = ~largest_component(~keep)
    up = np.asarray(Image.fromarray((inside * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32) / 255
    near = np.asarray(Image.fromarray((up * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    core = up > 0.98
    return np.where(near, np.maximum(alpha, core), 0).astype(np.float32)

def _box(x, r, axis):
    r = max(1, int(r))
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(x, pad, mode='edge'), axis=axis)
    hi = np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)

def blur(x, r):
    """near-gaussian blur (three box passes per axis) of a float array, sigma about r"""
    br = r * 0.85
    for _ in range(3):
        x = _box(_box(x, br, 0), br, 1)
    return x

def light(alpha, frame, L=(-0.5, -0.62, 0.6)):
    """diffuse light on a rounded body whose outline is alpha, lit from the upper left like the lemon"""
    b = blur(alpha, frame * 0.11)
    gy, gx = np.gradient(b)
    k = frame * 0.11 * 2.2
    nx, ny = -gx * k, -gy * k
    m = np.minimum(1, np.hypot(nx, ny))
    ang = np.arctan2(ny, nx)
    nx, ny = m * np.cos(ang), m * np.sin(ang)
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    l = np.array(L) / np.linalg.norm(L)
    return np.clip(nx * l[0] + ny * l[1] + nz * l[2], 0, 1)

# ---------- tone ----------
def tone(img, alpha, coverage=0.48, gamma=1.0, clip_hi=99.0, contrast=1.0):
    """ink amount 0..1 inside the subject, stretched like the lemon (white highlights, black core shadows)"""
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    ink = 1 - lum
    m = alpha > 0.5
    lo, hi = np.percentile(ink[m], [3, clip_hi])
    ink = np.clip((ink - lo) / max(hi - lo, 1e-3), 0, 1) ** gamma
    if contrast != 1:
        # an S-curve round the middle: highlights go white, the core shadow goes solid
        ink = np.clip(0.5 + (ink - 0.5) * contrast, 0, 1)
    # shift so the mean ink inside equals the target coverage (the lemon sits at .34 to .75)
    for _ in range(30):
        mean = ink[m].mean()
        if abs(mean - coverage) < 0.005:
            break
        g = np.log(coverage) / np.log(max(mean, 1e-3))
        ink = np.clip(ink, 0, 1) ** g
    return ink

# ---------- frame ----------
def place(ink, alpha, box, frame, fill=0.78, angle=0.0, flip=False, shift=(0, 0)):
    """crop the subject to its box, rotate in continuous tone, fit into a square frame"""
    x0, y0, x1, y1 = box
    side = int(max(x1 - x0, y1 - y0) * 1.5)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    big = Image.new('F', (side, side), 0)
    bga = Image.new('F', (side, side), 0)
    crop = (int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))
    big.paste(Image.fromarray(ink).crop(crop), (0, 0))
    bga.paste(Image.fromarray(alpha).crop(crop), (0, 0))
    if flip:
        big, bga = big.transpose(Image.FLIP_LEFT_RIGHT), bga.transpose(Image.FLIP_LEFT_RIGHT)
    if angle:
        big = big.rotate(angle, Image.BICUBIC)
        bga = bga.rotate(angle, Image.BICUBIC)
    scale = frame * fill / max(x1 - x0, y1 - y0)
    out = int(round(side * scale))
    big = big.resize((out, out), Image.LANCZOS)
    bga = bga.resize((out, out), Image.LANCZOS)
    fi = Image.new('F', (frame, frame), 0)
    fa = Image.new('F', (frame, frame), 0)
    off = ((frame - out) // 2 + shift[0], (frame - out) // 2 + shift[1])
    fi.paste(big, off)
    fa.paste(bga, off)
    return np.asarray(fi), np.clip(np.asarray(fa), 0, 1)

VIOLET_DOT = (0xD9, 0xD2, 0xF5)  # lavender mist, tunable (violet theme)

def erode(alpha):
    """pull the silhouette in by one 2x pixel: no white hairline round a dark rim on a photo"""
    a = np.pad(alpha, 1, mode='edge')
    return np.minimum.reduce([a[1:-1, 1:-1], a[:-2, 1:-1], a[2:, 1:-1], a[1:-1, :-2], a[1:-1, 2:]])

def halftone(ink, alpha):
    """the paper print: black dots on an opaque white body"""
    alpha = erode(alpha)
    h, w = ink.shape
    dots = ink > screen(h, w)
    rgb = np.where(dots[..., None], 0, 255).astype(np.uint8).repeat(3, axis=2)
    a = (np.clip(alpha, 0, 1) * 255).round().astype(np.uint8)
    return np.dstack([rgb, a])

def halftone_violet(ink, alpha):
    """the violet theme's print, matched to lemon-sprite-violet-360: the same dots in
    lavender mist at 60% opacity, the body a 10% veil of the same colour"""
    alpha = erode(alpha)
    h, w = ink.shape
    dots = ink > screen(h, w)
    rgb = np.empty((h, w, 3), np.uint8)
    rgb[:] = VIOLET_DOT
    a = (np.clip(alpha, 0, 1) * np.where(dots, 0.6, 0.1) * 255).round().astype(np.uint8)
    return np.dstack([rgb, a])

def prints(pairs):
    return [halftone(v, a) for v, a in pairs], [halftone_violet(v, a) for v, a in pairs]

def bbox(alpha, thr=0.5):
    ys, xs = np.where(alpha > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def write(name, frames, size, violet=None):
    if violet is not None:
        write(name + '-violet', violet, size)
    OUT.mkdir(parents=True, exist_ok=True)
    n, f2 = len(frames), frames[0].shape[0]
    strip = Image.new('RGBA', (f2 * n, f2), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        strip.paste(Image.fromarray(fr, 'RGBA'), (i * f2, 0))
    p2 = OUT / f'{name}-{f2}.webp'
    strip.save(p2, 'WEBP', lossless=True, quality=100, method=6)
    small = strip.resize((size * n, size), Image.BOX)
    p1 = OUT / f'{name}-{size}.webp'
    small.save(p1, 'WEBP', lossless=True, quality=100, method=6)
    print(f'{name}: {n} frames, {p2.name} {p2.stat().st_size // 1024} KB, {p1.name} {p1.stat().st_size // 1024} KB')

# ---------- companions ----------
def sharpen(img):
    return img.filter(ImageFilter.UnsharpMask(radius=3, percent=90, threshold=2))

def lit_frames(ink, alpha, box, frame, angles, fill, detail_gain=1.0, base=0.9, dark=0.92, coverage=None, flip=False):
    """The lemon's trick, generalised: the light stays, the subject turns under it.
    The photo's own shading (low frequencies) is replaced by one fixed light from the
    upper left on the turned outline; only the surface detail (drupelets, feathers) turns."""
    m = (alpha > 0.5).astype(np.float64)
    low = blur(ink * m, 18) / np.maximum(blur(m, 18), 1e-3)
    detail = (ink - low) * m
    out = []
    for ang in angles:
        d, a = place(detail, alpha, box, frame, fill=fill, angle=ang, flip=flip)
        diff = light(a, frame)
        shade = dark * (1 - diff) ** 1.25 + (1 - base) * 0.0
        v = np.clip(shade + d * detail_gain, 0, 1)
        out.append((v, a))
    return out

def raspberry():
    """the raspberry rolls: ten in-plane turns of 36 degrees, one per tenth of its circumference"""
    img = sharpen(Image.open(SRC / 'raspberry-b.png'))
    alpha = cutout(img, lo=14, hi=40, chroma=True)
    ink = tone(img, alpha, coverage=0.5)
    box = bbox(alpha)
    size = 132
    frames, violet = prints(lit_frames(ink, alpha, box, size * 2, [-36 * i for i in range(10)], fill=0.72, detail_gain=1.35, dark=0.86))
    cov = np.mean([((f[..., 0] < 128) & (f[..., 3] > 128)).sum() / (f[..., 3] > 128).sum() for f in frames])
    print(f'raspberry ink coverage {cov:.2f} (lemon .34 to .75, mean .52)')
    write('raspberry', frames, size, violet)

def bird():
    """the bird: 0 perched, 1 crouched (about to hop), 2 wings up, 3 wings level, 4 wings down.
    Facing right; the engine mirrors it to face left. Shared box and baseline so poses register."""
    poses = [('bird-perch.png', 0.80), ('bird-hop.png', 0.80), ('bird-up.png', None), ('bird-glide.png', None), ('bird-down.png', None)]
    size = 150
    F = size * 2
    cut = []
    for f, floor in poses:
        img = sharpen(Image.open(SRC / f))
        alpha = cutout(img, floor=floor)
        ink = tone(img, alpha, coverage=0.54, gamma=1.0, clip_hi=99.5, contrast=1.7)
        cut.append((ink, alpha))
    # one scale for every pose, from the perched bird's body length, so wings never shrink the bird
    bx = bbox(cut[0][1])
    body = bx[2] - bx[0]
    pairs = []
    fill = 0.7
    FEET = 0.80  # perched frames stand on this line of the frame (the engine perches by it)
    for i, (ink, alpha) in enumerate(cut):
        b = bbox(alpha)
        ys, xs = np.where(alpha > 0.5)
        cx, cy = xs.mean(), ys.mean()
        side = body
        if i < 2:  # perched and crouched: feet on one line, so the crouch sinks instead of jumping
            cy = b[3] - (FEET - 0.5) * side / fill
        box = (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)
        pairs.append(place(ink, alpha, tuple(map(int, box)), F, fill=fill))
    frames, violet = prints(pairs)
    write('bird', frames, size, violet)

if __name__ == '__main__':
    want = sys.argv[1:] or ['raspberry', 'bird']
    for n in want:
        globals()[n]()
