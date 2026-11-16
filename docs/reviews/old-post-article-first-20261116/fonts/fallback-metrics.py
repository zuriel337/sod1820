import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
HEB = "בראשית ברא אלהים את השמים ואת הארץ והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים שלום רב לאוהבי תורתך ואין למו מכשול"
LAT = "0123456789 1820 5786 SOD 2029 (12.11.2026) 26 271 2701 631 66 - , . : % Hello World"
W = sys.argv[1]; LIB = "/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf"
lib = {"r": TTFont(LIB % "Regular"), "b": TTFont(LIB % "Bold")}
def adv(font, text):
    cmap = font.getBestCmap(); hmtx = font['hmtx']; upm = font['head'].unitsPerEm
    return sum(hmtx[cmap[ord(c)]][0] for c in text if ord(c) in cmap) / upm, sum(1 for c in text if ord(c) in cmap)
def vert(f):
    upm = f['head'].unitsPerEm; os2 = f['OS/2']; hhea = f['hhea']
    if os2.fsSelection & (1 << 7): return os2.sTypoAscender / upm, -os2.sTypoDescender / upm, os2.sTypoLineGap / upm
    return hhea.ascent / upm, -hhea.descent / upm, hhea.lineGap / upm
def line(label, f, text, base):
    a, n = adv(f, text); b, m = adv(lib[base], text); assert n == m, (label, n, m)
    s = a / b; asc, desc, gap = vert(f)
    print(f"{label:28} size-adjust:{s*100:.1f}%;ascent-override:{asc/s*100:.1f}%;descent-override:{desc/s*100:.1f}%;line-gap-override:{gap/s*100:.1f}%")
line("noto 400 / arial", TTFont(f"{W}/NotoSansHebrew-Regular.ttf"), HEB, "r")
line("noto 700 / arial bold", TTFont(f"{W}/NotoSansHebrew-Bold.ttf"), HEB, "b")
for name, path, text in [("rubik-hebrew", f"{W}/Rubik-Hebrew.woff2", HEB), ("rubik-latin", f"{W}/Rubik-Latin.woff2", LAT)]:
    for w, base in [(400, "r"), (500, "r"), (600, "b"), (700, "b"), (850, "b")]:
        line(f"{name} {w} / arial{' bold' if base == 'b' else ''}", instancer.instantiateVariableFont(TTFont(path), {"wght": w}), text, base)
f = TTFont(f"{W}/NotoSansHebrew-Regular.ttf"); c = f.getBestCmap()
cps = sorted(c); ranges = []; 
for cp in cps:
    if ranges and cp == ranges[-1][1] + 1: ranges[-1][1] = cp
    else: ranges.append([cp, cp])
print("noto coverage:", ",".join(f"U+{a:04X}" + (f"-{b:04X}" if b != a else "") for a, b in ranges))
