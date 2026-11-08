// /api/card — text that is safe to hand to the renderer.
//
// Why this exists. The card is drawn by @vercel/og (satori) with ONE embedded font (Heebo 800). For every character that
// font has no glyph for, satori asks @vercel/og to load a fallback font at render time: a fonts.googleapis.com CSS request
// plus a font-file request (symbols, math, CJK, Arabic...) or a twemoji request (emoji). Those requests carry no timeout.
// Production logged "Failed to load dynamic font for ∩⊂ ... Status: 400" and five "Task timed out after 300 seconds"
// errors on this route. The card must therefore never ask for a glyph the embedded font cannot draw.
//
// The allowed set is not a hand-written list. It is read from the cmap of the very font file that is embedded, so it cannot
// drift from the font: a different font file changes the allowed set with it.
//
// The file name starts with an underscore so Vercel does not publish it as a function.

// What stands in for a run of characters the font cannot draw: a neutral separator the card already uses elsewhere
// ("a · b"). It never invents letters or digits. When the font lacks it too, the run becomes a plain space.
export const CARD_REPLACEMENT = String.fromCodePoint(0x00b7);

// Upper bound for any single query-provided text, in code points. Far above every title the site builds (callers
// pre-shorten them) and only there so one request cannot ask satori to lay out a multi-kilobyte string.
export const CARD_TEXT_MAX = 240;

// What the font can draw when its cmap cannot be read: printable ASCII plus the Hebrew letters.
const fallbackHas = (cp) => (cp >= 0x20 && cp <= 0x7e) || (cp >= 0x05d0 && cp <= 0x05ea);

const hasIn = (ranges) => (cp) => {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [first, last] = ranges[mid];
    if (cp < first) hi = mid - 1;
    else if (cp > last) lo = mid + 1;
    else return true;
  }
  return false;
};

// Reads the Unicode cmap of a TrueType font (format 4 = BMP, format 12 = full range) into a predicate over code points.
// Returns the conservative fallback (and says so once, the caller memoises the result) when the table is missing or
// unreadable; never throws.
export function glyphCoverage(fontBytes) {
  const conservative = () => {
    console.error('api/card: the font cmap could not be read; only ASCII and Hebrew letters are allowed on the card');
    return fallbackHas;
  };
  try {
    const bytes = ArrayBuffer.isView(fontBytes) ? new Uint8Array(fontBytes.buffer, fontBytes.byteOffset, fontBytes.byteLength) : new Uint8Array(fontBytes);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tables = dv.getUint16(4);
    let cmap = -1;
    for (let i = 0; i < tables; i++) {
      const rec = 12 + i * 16;
      if (String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3]) === 'cmap') cmap = dv.getUint32(rec + 8);
    }
    if (cmap < 0) return conservative();
    const found = []; // [first, last] code points that map to a real glyph (index 0 is .notdef)
    const count = dv.getUint16(cmap + 2);
    for (let i = 0; i < count; i++) {
      const rec = cmap + 4 + i * 8;
      const platform = dv.getUint16(rec);
      const encoding = dv.getUint16(rec + 2);
      if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
      const sub = cmap + dv.getUint32(rec + 4);
      const format = dv.getUint16(sub);
      if (format === 4) {
        const segs = dv.getUint16(sub + 6) / 2;
        const endCodes = sub + 14;
        const startCodes = endCodes + segs * 2 + 2;
        const idDeltas = startCodes + segs * 2;
        const idRangeOffsets = idDeltas + segs * 2;
        for (let s = 0; s < segs; s++) {
          const end = dv.getUint16(endCodes + s * 2);
          const start = dv.getUint16(startCodes + s * 2);
          const delta = dv.getInt16(idDeltas + s * 2);
          const rangeOffset = dv.getUint16(idRangeOffsets + s * 2);
          if (start === 0xffff) continue;
          for (let cp = start; cp <= end; cp++) {
            let glyph;
            if (rangeOffset === 0) glyph = (cp + delta) & 0xffff;
            else {
              const raw = dv.getUint16(idRangeOffsets + s * 2 + rangeOffset + (cp - start) * 2);
              glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
            }
            if (glyph !== 0) found.push([cp, cp]);
          }
        }
      } else if (format === 12) {
        const groups = dv.getUint32(sub + 12);
        for (let g = 0; g < groups; g++) {
          const at = sub + 16 + g * 12;
          if (dv.getUint32(at + 8) !== 0) found.push([dv.getUint32(at), dv.getUint32(at + 4)]);
        }
      }
    }
    if (!found.length) return conservative();
    found.sort((a, b) => a[0] - b[0]);
    const merged = [found[0].slice()];
    for (const [first, last] of found.slice(1)) {
      const tail = merged[merged.length - 1];
      if (first <= tail[1] + 1) tail[1] = Math.max(tail[1], last);
      else merged.push([first, last]);
    }
    return hasIn(merged);
  } catch {
    return conservative();
  }
}

// Characters with no glyph of their own that the font does not have either (soft hyphen, zero-width space, bidi
// isolates, variation selectors, BOM) are dropped outright instead of turning into a visible separator. The ones the
// font does have (ZWNJ, ZWJ, LRM, RLM) are kept as they always were.
const invisible = (cp) => cp === 0x00ad || cp === 0x061c || cp === 0x180e || (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2060 && cp <= 0x206f) || (cp >= 0xfe00 && cp <= 0xfe0f) || cp === 0xfeff;
// Controls and every space-like character: they become one ordinary space.
const blank = (cp) => cp <= 0x20 || (cp >= 0x7f && cp <= 0xa0) || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x2028 || cp === 0x2029 || cp === 0x202f || cp === 0x205f || cp === 0x3000;

const SPACE = ' ';
const GAP = {}; // marks a run of characters the font cannot draw

// `raw` is a query value; `has(codePoint)` says whether the embedded font can draw it. The result holds only characters
// the font can draw (plus the replacement separator), at most `max` code points, no leading/trailing/double spaces, and
// is '' when nothing drawable is left.
export function cardText(raw, has, max = CARD_TEXT_MAX) {
  if (raw == null) return '';
  const pieces = [];
  const push = (piece) => {
    const last = pieces[pieces.length - 1];
    if (piece === SPACE && (last === SPACE || last === undefined)) return;
    if (piece === GAP && last === GAP) return;
    pieces.push(piece);
  };
  for (const ch of String(raw)) {
    if (pieces.length >= max) break;
    const cp = ch.codePointAt(0);
    if (blank(cp)) push(SPACE);
    else if (has(cp)) push(ch);
    else if (!invisible(cp)) {
      // A character the font lacks may still have a compatibility form it does have (full-width letters, ligatures,
      // enclosed digits). Characters the font has are never rewritten, so existing cards render exactly as before.
      const folded = Array.from(ch.normalize('NFKC'));
      if (folded.length && folded.every((c) => has(c.codePointAt(0)) && !blank(c.codePointAt(0)))) folded.forEach(push);
      else push(GAP);
    }
  }
  const edge = (piece) => piece === SPACE || piece === GAP;
  while (pieces.length && edge(pieces[0])) pieces.shift();
  while (pieces.length && edge(pieces[pieces.length - 1])) pieces.pop();
  const gap = has(CARD_REPLACEMENT.codePointAt(0)) ? CARD_REPLACEMENT : SPACE;
  const text = pieces.map((piece) => (piece === GAP ? gap : piece)).join('');
  return gap === SPACE ? text.replace(/ {2,}/g, SPACE) : text;
}
