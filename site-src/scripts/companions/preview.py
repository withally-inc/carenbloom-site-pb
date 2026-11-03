"""Contact sheet: the lemon, the raspberry and the bird at their 2x frames, on paper."""
import sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
rows = [('assets-src/lemon-rotation-sprite.png', 360), ('public/img/companions/raspberry-264.webp', 264), ('public/img/companions/bird-240.webp', 240)]
W = 3600
H = sum(f for _, f in rows) + 40 * len(rows)
sheet = Image.new('RGBA', (W, H), (244, 246, 248, 255))
y = 20
for p, f in rows:
    im = Image.open(ROOT / p).convert('RGBA')
    sheet.alpha_composite(im, (0, y))
    y += f + 40
scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1
sheet = sheet.convert('RGB')
if scale != 1:
    sheet = sheet.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
sheet.save(out)
