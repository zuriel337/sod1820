import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphGeometry, containsInk, boundaryAnchor, expressionOccurrences, GLYPH_FONT } from './glyphGeometry.js';

test('font provenance is pinned and all 27 Hebrew forms have finite, bounded outlines',()=>{
  assert.match(GLYPH_FONT.sha256,/^[a-f0-9]{64}$/);
  assert.match(GLYPH_FONT.source,/bd8f81ddb5c74d5c8897b36ad88b440266245103/);
  for(const ch of 'אבגדהוזחטיךכלםמןנסעףפץצקרשת') {
    const g=glyphGeometry(ch),[x0,y0,x1,y1]=g.bounds;
    assert.ok(g.path && x1>x0 && y1>y0);
    for(const c of g.contours) for(const [x,y] of c) assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=x0-.01&&x<=x1+.01&&y>=y0-.01&&y<=y1+.01);
  }
});
test('mem hole stays empty, outer ink is selectable and outside bounds is empty',()=>{
  const g=glyphGeometry('ם'),[x0,y0,x1,y1]=g.bounds;
  assert.equal(containsInk(g,[(x0+x1)/2,(y0+y1)/2]),false);
  assert.equal(containsInk(g,[x0+(x1-x0)*.08,(y0+y1)/2]),true);
  assert.equal(containsInk(g,[x1+100,y1+100]),false);
});
test('he has disconnected components, final forms do not substitute base glyphs',()=>{
  assert.equal(glyphGeometry('ה').contours.length,2);
  assert.notEqual(glyphGeometry('ך').path,glyphGeometry('כ').path);
  assert.notEqual(glyphGeometry('ם').path,glyphGeometry('מ').path);
});
test('occurrence IDs preserve UTF16 source offsets and marked graphemes are not stripped',()=>{
  const rows=expressionOccurrences('א א אָ ך');
  assert.deepEqual(rows.map(x=>x.sourceIndex),[0,2,4,7]);
  assert.equal(new Set(rows.map(x=>x.id)).size,4);
  assert.equal(rows[2].grapheme,'אָ');
  assert.equal(rows[2].geometry,null);
  assert.equal(rows[3].anatomy.glyph_ref.kind,'font_outline');
  assert.equal(glyphGeometry('A'),null);
});
test('anchors are contour points at the requested extreme, not rectangle corners',()=>{
  for(const ch of 'אםהך') {
    const g=glyphGeometry(ch),anchor=boundaryAnchor(g,[0,-1]);
    assert.ok(g.contours.some(c=>c.some(p=>p[0]===anchor[0]&&p[1]===anchor[1])));
    assert.ok(Math.abs(anchor[1]-g.bounds[1])<.01);
  }
});
