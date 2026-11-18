// What a share-card request may ask for, and how long its answer may be kept (ZURIEL 18.11.2026, branch only).
//
// /api/card is a pure function of its query string, drawn by api/card.js. Every producer on the site (api/og.js cardUrl and its
// hand-built addresses, src/lib/thumbResolve.js, src/lib/research/postPreviewUnits2029.js, src/lib/research/worldFindingShare.js,
// src/pages/CommunityCalculatorPage.jsx) uses only the keys below. Anything else is not a card the site builds: it is refused with a
// tiny 400 before any font, logo, database or render work, and never cached, so arbitrary parameters cannot create unbounded renders
// or cache entries.
//
// Cache classes (the successful canonical GET only; every refusal and error stays no-store, as before):
//   - "query" cards draw only what their query says (a title, a word, an expression with its value, a unit with its numbers): the same
//     address is the same picture for as long as the renderer is the same deployment. Kept 7 days at the CDN (+1 day stale while
//     revalidating). A changed post title changes the address og.js emits, so it is a new card, not a stale one.
//   - "number" cards (n alone, no w/sub/v) also read the published phrases equal to n from the database (api/card.js topPhrases):
//     unchanged 1 hour (+1 day stale while revalidating), so a newly published or unpublished phrase reaches the card within the hour.
// A card never carries private data: the query is public text the page already shows, and the phrase read is the public, verified,
// published, visibility-tier-1 set.

export const CARD_KEYS = Object.freeze(['n', 'w', 't', 'sub', 'cap', 'sig', 'v', 'nums', 'format']);
const TEXT_KEYS = new Set(['w', 't', 'sub', 'cap']);
// Raw (decoded) length bound per text value, before api/card.js trims it to CARD_TEXT_MAX (240) drawable code points.
export const CARD_RAW_TEXT_MAX = 600;
export const CARD_QUERY_MAX = 4096;

export const CARD_CACHE = Object.freeze({
  query: 'public, s-maxage=604800, stale-while-revalidate=86400',
  number: 'public, s-maxage=3600, stale-while-revalidate=86400',
});

const VALID = {
  // The renderer reads only plain digits; other numeric forms (a sign) are drawn as no number, so they are accepted, not refused.
  n: (v) => /^-?\d{1,12}$/.test(v),
  v: (v) => v === 'unit',
  format: (v) => v === 'story',
  // The renderer special-cases gem/els/finding; thumbResolve.js also sends sod1820/orgeula/video, drawn with the default signature.
  sig: (v) => /^[a-z0-9_-]{1,16}$/.test(v),
  // The renderer keeps at most five values of 1-6 digits; a longer list is trimmed there, not refused here.
  nums: (v) => /^[0-9, ]{0,96}$/.test(v),
};

/** → { ok: true, cacheClass: "query" | "number" } or { ok: false, reason } for a request that is not a site card. */
export function cardRequestPolicy(url) {
  const u = url instanceof URL ? url : new URL(url);
  if (u.search.length > CARD_QUERY_MAX) return { ok: false, reason: 'query too long' };
  const seen = new Set();
  for (const [key, value] of u.searchParams) {
    if (!CARD_KEYS.includes(key)) return { ok: false, reason: `unknown parameter ${key.slice(0, 32)}` };
    if (seen.has(key)) return { ok: false, reason: `repeated parameter ${key}` };
    seen.add(key);
    if (TEXT_KEYS.has(key)) { if (value.length > CARD_RAW_TEXT_MAX) return { ok: false, reason: `${key} too long` }; continue; }
    if (!VALID[key](value)) return { ok: false, reason: `invalid ${key}` };
  }
  const p = u.searchParams;
  const numberCard = p.has('n') && !p.has('w') && !p.has('sub') && p.get('v') !== 'unit';
  return { ok: true, cacheClass: numberCard ? 'number' : 'query' };
}
