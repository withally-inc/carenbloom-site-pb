"""Outline wordmark C ("Care & Bloom") to SVG path data.

PP Mori SemiBold for "Care", spaces and "Bloom"; Newsreader italic 400 for "&" at 1.08em.
Tracking -0.02em (CSS letter-spacing, applied after every character), GPOS pair kerning applied.
Output: scripts/brand/wordmark.json (units: 1000 per em of the Mori font-size, y down, baseline at 0).
Run with: python3 -I scripts/brand/outline.py [opsz]
"""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MORI = os.path.join(ROOT, 'public/fonts/PPMori-Semibold.otf')
NEWS = os.path.join(HERE, 'Newsreader-Italic-VF.ttf')
OPSZ = float(sys.argv[1]) if len(sys.argv) > 1 else 36
TRACK = -0.02   # em
AMP_SCALE = 1.08


def pair_kern(font, left, right):
    """Sum of GPOS PairPos XAdvance for (left, right) glyph names, kern feature only."""
    if 'GPOS' not in font:
        return 0
    gpos = font['GPOS'].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'kern':
            lookups.update(fr.Feature.LookupListIndex)
    total = 0
    for li in sorted(lookups):
        lk = gpos.LookupList.Lookup[li]
        subs = lk.SubTable
        if lk.LookupType == 9:
            subs = [s.ExtSubTable for s in subs]
        for st in subs:
            if getattr(st, 'LookupType', 2) != 2 and lk.LookupType not in (2, 9):
                continue
            if not hasattr(st, 'Format') or not hasattr(st, 'Coverage'):
                continue
            if left not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                idx = st.Coverage.glyphs.index(left)
                for rec in st.PairSet[idx].PairValueRecord:
                    if rec.SecondGlyph == right:
                        v = rec.Value1
                        total += getattr(v, 'XAdvance', 0) or 0
                        break
                else:
                    continue
                break
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs.get(left, 0)
                c2 = st.ClassDef2.classDefs.get(right, 0)
                v = st.Class1Record[c1].Class2Record[c2].Value1
                x = getattr(v, 'XAdvance', 0) or 0
                if x:
                    total += x
                    break
    return total


def glyph_path(font, gname, scale, dx):
    gs = font.getGlyphSet()
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    # font units y-up -> svg y-down, baseline at 0
    tp = TransformPen(pen, (scale, 0, 0, -scale, dx, 0))
    gs[gname].draw(tp)
    return pen.getCommands()


def bounds(font, gname, scale, dx):
    from fontTools.pens.boundsPen import BoundsPen
    gs = font.getGlyphSet()
    bp = BoundsPen(gs)
    gs[gname].draw(bp)
    if not bp.bounds:
        return None
    x0, y0, x1, y1 = bp.bounds
    return [dx + x0 * scale, -y1 * scale, dx + x1 * scale, -y0 * scale]


mori = TTFont(MORI)
news = instantiateVariableFont(TTFont(NEWS), {'wght': 400, 'opsz': OPSZ})
m_upm = mori['head'].unitsPerEm
n_upm = news['head'].unitsPerEm
m_cmap = mori.getBestCmap()
n_cmap = news.getBestCmap()

text = 'Care & Bloom'
x = 0.0
paths = []
boxes = []
prev = None
for ch in text:
    if ch == '&':
        font, cmap, scale = news, n_cmap, 1000 * AMP_SCALE / n_upm
        size = AMP_SCALE
    else:
        font, cmap, scale = mori, m_cmap, 1000 / m_upm
        size = 1.0
    g = cmap[ord(ch)]
    if prev and prev[0] is font:
        x += pair_kern(font, prev[1], g) * scale
    d = glyph_path(font, g, scale, x)
    b = bounds(font, g, scale, x)
    if d:
        paths.append({'ch': ch, 'd': d, 'font': 'news' if font is news else 'mori'})
    if b:
        boxes.append(b)
    adv = font['hmtx'][g][0] * scale
    x += adv + TRACK * 1000  # letter-spacing is inherited as an absolute length from the parent
    prev = (font, g)

x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
out = {
    'opsz': OPSZ,
    'capHeight': mori['OS/2'].sCapHeight * 1000 / m_upm,
    'xHeight': mori['OS/2'].sxHeight * 1000 / m_upm,
    'ink': [x0, y0, x1, y1],
    'paths': paths,
}
json.dump(out, open(os.path.join(HERE, 'wordmark.json'), 'w'), indent=1)
print('opsz', OPSZ, 'ink bbox', [round(v, 1) for v in out['ink']], 'cap', out['capHeight'])
# debug kerning
for a, b in [('C', 'a'), ('a', 'r'), ('r', 'e'), ('B', 'l'), ('l', 'o'), ('o', 'o'), ('o', 'm')]:
    print(a + b, pair_kern(mori, m_cmap[ord(a)], m_cmap[ord(b)]))
