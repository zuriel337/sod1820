import atlas from './assets/rubik-hebrew-700.json' with { type: 'json' };
import { buildLetterAnatomySpec } from './hebrewLetterAnatomy.js';

export const GLYPH_FONT = Object.freeze(atlas.font);
export function glyphGeometry(grapheme) {
  // Do not silently strip niqqud or substitute a final form. Unsupported graphemes
  // retain their exact accessible text and use the native text fallback.
  const glyph = atlas.glyphs[grapheme];
  return glyph ? { ...glyph, grapheme, font: GLYPH_FONT, coordinateSystem: 'font-y-up' } : null;
}
export function expressionOccurrences(text) {
  return [...new Intl.Segmenter('he', { granularity: 'grapheme' }).segment(String(text))]
    .filter(({ segment }) => /\p{Script=Hebrew}/u.test(segment))
    .map(({ segment, index }) => ({ id: `glyph:${index}:${segment}`, grapheme: segment, sourceIndex: index, geometry: glyphGeometry(segment), anatomy: buildLetterAnatomySpec(segment, { geometry: glyphGeometry(segment) }) }));
}
function inPolygon([x,y], points) {
  let inside = false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) {
    const [xi,yi]=points[i], [xj,yj]=points[j];
    if ((yi>y)!==(yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
// Even-odd topology preserves holes and disconnected components. The SVG renderer
// uses exact curves; these sampled outlines serve bounded CPU queries only.
export function containsInk(geometry, point) {
  if (!geometry) return false;
  return geometry.contours.reduce((inside, contour) => inPolygon(point, contour) ? !inside : inside, false);
}
export function boundaryAnchor(geometry, direction = [1,0]) {
  if (!geometry) return null;
  let best=null, projection=-Infinity;
  for (const contour of geometry.contours) for (const point of contour) {
    const dot=point[0]*direction[0]+point[1]*direction[1];
    if (dot>projection) { best=point; projection=dot; }
  }
  return best;
}
