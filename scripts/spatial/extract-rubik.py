"""Generate faithful display outlines; font binary stays outside the repository.
Run: python scripts/spatial/extract-rubik.py /path/to/Rubik.ttf
Requires fonttools==4.61.1. Source is pinned in generated metadata.
"""
import hashlib, json, sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.basePen import BasePen
SOURCE = 'https://raw.githubusercontent.com/google/fonts/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/rubik/Rubik%5Bwght%5D.ttf'
raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != '1b3a7437ba2af80e465e773ed60c5036d1ba6ace492d89046dbcf18fb31e4e88':
    raise SystemExit('Source hash mismatch; do not relabel another font as approved Rubik.')
font = instantiateVariableFont(TTFont(sys.argv[1]), {'wght':700}, inplace=False)
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
class Flatten(BasePen):
    def __init__(self):
        super().__init__(glyphs); self.contours=[]; self.points=[]
    def _moveTo(self,p): self.points=[p]
    def _lineTo(self,p): self.points.append(p)
    def _qCurveToOne(self,p1,p2):
        p0=self._getCurrentPoint()
        for i in range(1,33):
            t=i/32; u=1-t
            self.points.append(tuple(u*u*p0[k]+2*u*t*p1[k]+t*t*p2[k] for k in (0,1)))
    def _curveToOne(self,p1,p2,p3):
        p0=self._getCurrentPoint()
        for i in range(1,33):
            t=i/32; u=1-t
            self.points.append(tuple(u**3*p0[k]+3*u*u*t*p1[k]+3*u*t*t*p2[k]+t**3*p3[k] for k in (0,1)))
    def _closePath(self): self.contours.append([[round(x,4),round(y,4)] for x,y in self.points]); self.points=[]
    def _endPath(self): self._closePath()
result={'font':{'family':'Rubik','weight':700,'unitsPerEm':font['head'].unitsPerEm,'source':SOURCE,'sha256':hashlib.sha256(raw).hexdigest(),'license':'OFL-1.1','generator':'fonttools 4.61.1 / extract-rubik.py'},'glyphs':{}}
for ch in 'אבגדהוזחטיךכלםמןנסעףפץצקרשת':
    name=cmap[ord(ch)]; glyph=glyphs[name]
    svg=SVGPathPen(glyphs); bounds=BoundsPen(glyphs); flat=Flatten()
    glyph.draw(svg); glyph.draw(bounds); glyph.draw(flat)
    result['glyphs'][ch]={'glyphId':font.getGlyphID(name),'path':svg.getCommands(),'bounds':list(bounds.bounds),'advance':glyph.width,'contours':flat.contours}
Path('src/lib/spatial/assets/rubik-hebrew-700.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('Generated',len(result['glyphs']),'glyphs from',result['font']['sha256'])
# Lightweight icon derivative: avoid importing the full geometry atlas into chrome.
g = result['glyphs']['א']
x0,y0,x1,y1 = g['bounds']; scale=16/max(x1-x0,y1-y0)
transform=f'matrix({scale:.9f} 0 0 {-scale:.9f} {12-(x0+x1)/2*scale:.9f} {12+(y0+y1)/2*scale:.9f})'
Path('src/components/experience2029/hebrewIconPaths.js').write_text('// Derived from the same pinned Rubik 700 outline as Spatial Glyph Scene.\n// Source/hash/OFL: src/lib/spatial/assets/rubik-hebrew-700.json and public/legal/rubik-outline-OFL.txt.\nexport const ALEF_ICON_PATH = '+json.dumps(g['path'])+';\nexport const ALEF_ICON_TRANSFORM = '+json.dumps(transform)+';\n')
