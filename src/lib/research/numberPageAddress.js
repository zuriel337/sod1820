// One owner of the public Number / expression address: /number/<address>.
// An address is a number (digits) or an expression (any text, kept exactly as it was written). The compatibility prefix
// /2029/number is only used outside the public release; in the public release every internal link, the server redirect and the
// client router use /number. Pure functions shared by the server (api/, public-reading-deploy/) and the browser.
//
// ZURIEL 11.11.2026: public addresses have no /2029; old /2029/number/<address> links stay valid through one permanent
// redirect; a number with leading zeros goes to the canonical number without them (the real zero stays); an expression address is
// never replaced by the number it computes to.

const PUBLIC_RELEASE = import.meta.env?.VITE_PUBLIC_FOUNDATION_PREVIEW === "true"
  || import.meta.env?.VITE_PUBLIC_READING_RELEASE === "public-reading-20261101";

export const NUMBER_PAGE_PUBLIC_BASE = "/number";
export const NUMBER_PAGE_COMPATIBILITY_BASE = "/2029/number";
// The base internal links use in this build.
export const NUMBER_PAGE_BASE = PUBLIC_RELEASE ? NUMBER_PAGE_PUBLIC_BASE : NUMBER_PAGE_COMPATIBILITY_BASE;
export const numberPageUsesPublicBase = () => PUBLIC_RELEASE;

// A number page path in either form, with an address after it.
export const isNumberPagePath = (pathname) => /^\/(?:2029\/)?number\/[^/?#]+/.test(String(pathname || ""));

// The canonical forms live with the route policy (src/lib/publicReadingRelease2029.js) so the server redirect, the client router and
// the link helper cannot drift. Re-exported here for the number surfaces.
export { canonicalNumericAddress, canonicalNumberSegment, canonicalNumberPagePath } from "../publicReadingRelease2029.js";
import { canonicalNumericAddress } from "../publicReadingRelease2029.js";

// The canonical decoded address: numbers lose leading zeros, expressions are returned unchanged.
export const canonicalNumberAddress = (address) => /^\d+$/.test(String(address ?? "")) ? canonicalNumericAddress(address) : String(address ?? "");

// An internal link to a number or an expression, in this build's base.
export const numberPageHref = (address) => `${NUMBER_PAGE_BASE}/${encodeURIComponent(canonicalNumberAddress(address))}`;

// N14 (ZURIEL 12.11.2026): the public address of a number or an expression, whatever the build. Used by every producer whose
// link leaves the browser build: the Edge functions (ai-analyze, wa-raziel) have no Vite flags, so the build base above would be
// the compatibility prefix there. Same normalisation and encoding as numberPageHref; only the base is fixed.
export const publicNumberPageHref = (address) => `${NUMBER_PAGE_PUBLIC_BASE}/${encodeURIComponent(canonicalNumberAddress(address))}`;

// The in-app route for a number-page href written in either spelling: the same address (and query/fragment) in this build's base.
// Renders a stored or newly produced link without rewriting it: /number/<a> and /2029/number/<a> lead to the same page in every
// build. Anything that is not a number-page path is returned unchanged.
export function numberPageRouteHref(href) {
  const match = /^\/(?:2029\/)?number\/([^/?#]+)([?#].*)?$/.exec(String(href ?? ""));
  return match ? `${NUMBER_PAGE_BASE}/${match[1]}${match[2] || ""}` : href;
}
