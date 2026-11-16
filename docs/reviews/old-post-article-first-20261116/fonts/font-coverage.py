import sys
from fontTools.ttLib import TTFont
SAMPLE = "בראשית ברא אלהים את השמים ואת הארץ והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים 0123456789 שלום רב לאוהבי תורתך"
def metrics(path):
    f = TTFont(path)
    cmap = f.getBestCmap(); hmtx = f['hmtx']; upm = f['head'].unitsPerEm
    os2 = f['OS/2']; hhea = f['hhea']
    widths = []; missing = 0
    for ch in SAMPLE:
        g = cmap.get(ord(ch))
        if g is None: missing += 1; continue
        widths.append(hmtx[g][0])
    avg = sum(widths) / len(widths) / upm if widths else None
    return dict(path=path.split('/')[-1], upm=upm, avg=avg, missing=missing, ascent=hhea.ascent/upm, descent=-hhea.descent/upm, lineGap=hhea.lineGap/upm,
                typoAsc=os2.sTypoAscender/upm, typoDesc=-os2.sTypoDescender/upm, winAsc=os2.usWinAscent/upm, winDesc=os2.usWinDescent/upm, useTypo=bool(os2.fsSelection & (1<<7)),
                hebrew=sum(1 for c in range(0x5D0,0x5EB) if c in cmap), niqqud=sum(1 for c in range(0x5B0,0x5C8) if c in cmap), digits=sum(1 for c in range(0x30,0x3A) if c in cmap))
for p in sys.argv[1:]:
    m = metrics(p); print({k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items()})
