// Behaviour gate for the SEO decision of every route registered in src/App2029.jsx.
//
// scripts/test-2029-route-seo-decisions.mjs proves that each route is *registered* somewhere (api/og.js, route-legitimacy, a header,
// a page-level noindex, a preview flag). A registry hit does not prove what the server answers: /beit-midrash was registered by the
// page's own noindex while the server document said HTTP 404 "post not found". This gate asks the server instead.
//
// For every App2029 route there is exactly ONE explicit decision in DECISIONS below (a new route without one fails; a stale entry fails),
// and the production document handler - the function the platform runs for every public address
// (public-reading-deploy/api/public-document.js, which in turn runs api/og.js) - must answer exactly that decision:
//   status, X-Robots-Tag, canonical and title, under three synthetic data conditions (source unavailable, no rows, indexable RPC true/false).
// It also gates the home-only site identity (CLN-04: Google / Meta domain proofs and WebSite + Organization JSON-LD): the merged
// production document carries it exactly once on "/" and on no other address in any data condition, notably not on the /2029 alias
// that the document handler serves with the home route's metadata.
// No network, no browser, no secrets. It only IMPORTS those two files; it never edits or copies them. The table is not a baseline: it
// cannot approve a route automatically, and each entry is a product decision that someone reviewed.
//
// Needs the generated build receipt, so run `node scripts/build-public-reading-production.mjs` first (CI does). The Vercel rewrite layer and the
// Edge middleware are NOT exercised here: they are covered by scripts/test-route-legitimacy-2029.mjs and by the hosted acceptance after a publish.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
if (!fs.existsSync(path.join(root, "public-reading-deploy/.generated/protected-review-build.js"))) {
  throw new Error("run `node scripts/build-public-reading-production.mjs` first (the document handler needs its generated build receipt)");
}
const { publicReadingDocumentHandler } = await import(new URL("../public-reading-deploy/api/public-document.js", import.meta.url));
const { publicReadingPath, publicTemporarilyClosed, PUBLIC_TEMPORARILY_CLOSED_RETRY_AFTER } = await import(new URL("../src/lib/publicReadingRelease2029.js", import.meta.url));
const SITE = "https://sod1820.co.il";

// kind -> what the server must do
//   index       200, X-Robots-Tag "index, follow", canonical as given (default: the route itself)
//   noindex     200, X-Robots-Tag starts with "noindex", canonical as given
//   closed      200, "noindex, nofollow, noarchive", the release table says closed / service-closed
//   closed503   a feature area that is closed only until it reopens soon (publicTemporarilyClosed): 503 + Retry-After, X-Robots-Tag "index, follow"
//               (kept in the index on purpose, #1236); the only kind allowed to be indexable with a non-200 status
//   account     200, "noindex, nofollow, noarchive", the release table says account, canonical /login
//   missing     404, noindex
//   redirect    308 to `to`, then the target answers as `then`
//   item        one item of a collection: no rows -> 404 noindex; source unavailable -> 503 noindex (never an indexable error)
//   shape       the address is validated by its shape before any read: an invalid identifier is a noindex 404 in every data condition
//   collection  public even when empty: no rows -> 200 index; source unavailable -> 503 noindex
//   number      indexable RPC true -> 200 index; false or empty -> 200 "noindex, follow"; source unavailable -> 503 noindex
const DECISIONS = {
  "/": { kind: "index", canonical: "/" },
  "/2029": { kind: "index", canonical: "/", note: "alias of the home page" },
  "/post": { kind: "index" },
  "/2029/posts": { kind: "index", canonical: "/post", note: "alias" },
  "/posts": { kind: "redirect", to: "/post", then: { kind: "index", canonical: "/post" } },
  "/gallery": { kind: "index" },
  "/gematria": { kind: "index" },
  "/2029/gematria": { kind: "index", canonical: "/gematria", note: "alias" },
  "/2029/gematria/viral": { kind: "index", canonical: "/gematria", note: "alias" },
  "/2029/calculator": { kind: "index", canonical: "/gematria", note: "alias" },
  "/number": { kind: "index" },
  "/community": { kind: "index", canonical: "/community/chat", note: "#1234: the community address is the chat" },
  "/community/researchers": { kind: "index" },
  "/members": { kind: "index" },
  "/codes": { kind: "index" },
  "/code": { kind: "index", note: "#1237: the Bible code is open to the public in Classic mode" },
  "/els": { kind: "redirect", to: "/code", then: { kind: "index", canonical: "/code" }, note: "#1237: the old /els address continues at /code (308, the query is kept)" },
  "/world": { kind: "index" },
  "/books": { kind: "index" },

  "/community/calculator": { kind: "index", note: "#1234: the bare address is indexable again; addresses with query inputs stay out of the index (the sample probes the bare address)" },
  "/community/comments": { kind: "noindex" },
  "/community/chat": { kind: "index", note: "#1234: indexable again (it had been noindex since the 2029 cutover)" },
  "/contact": { kind: "noindex" },
  "/early-access": { kind: "noindex" },
  "/melech-hamisparim/718": { kind: "noindex" },
  "/forum": { kind: "redirect", to: "/community/chat", then: { kind: "index", canonical: "/community/chat" }, note: "the old forum continues in the community chat (#1236); the chat is indexable (#1234)" },
  "/beit-midrash": { kind: "noindex", note: "open to everyone, kept out of search by the owner's decision (same as the page's applySeo)" },
  "/beit-midrash/:method": { kind: "noindex", canonical: "/beit-midrash" },
  "/researcher/:slug": { kind: "noindex", note: "admin corpus projection; never reads the corpus server-side" },

  "/2029/preview": { kind: "closed" },
  "/2029/preview/follow-center": { kind: "closed" },
  "/2029/home-preview": { kind: "closed" },
  "/2029/kingdom": { kind: "closed" },
  "/2029/journey": { kind: "closed" },
  "/2029/control": { kind: "closed" },
  "/2029/me/:module": { kind: "closed" },
  "/research": { kind: "closed503", note: "#1236: closed only until it reopens soon: 503 + Retry-After, kept indexable" },
  "/heichal": { kind: "closed503", note: "#1236, same" },
  "/היכל": { kind: "closed503", canonical: "/heichal", note: "#1236, same (Hebrew alias)" },

  "/login": { kind: "account" },
  "/auth/callback": { kind: "account" },
  "/community/researcher/me": { kind: "account" },

  "/entity-hub-preview/:type/:key": { kind: "missing", note: "preview-only route compiled out of the public build" },

  "/verified": { kind: "collection" },
  "/or-geula": { kind: "collection" },
  "/number/:value": { kind: "number" },
  "/2029/number/:value": { kind: "number", canonical: "/number/x" },
  "/post/:slug": { kind: "item" },
  "/:slug": { kind: "item", note: "post slug address; unknown addresses end in a noindex 404" },
  "*": { kind: "item", note: "wildcard: unknown address" },
  "/tag/:slug": { kind: "item" },
  "/category/:slug": { kind: "item" },
  "/topic/:slug": { kind: "item" },
  "/codes/:slug": { kind: "item" },
  "/book/:slug": { kind: "item" },
  "/books/:slug": { kind: "redirect", to: "/book/x", then: { kind: "item" } },
  "/forum/:id": { kind: "shape", note: "the sample id is not a valid identifier, so no source is read" },
  "/or-geula/video/:id": { kind: "shape", note: "same" },
  "/video/:assetId": { kind: "shape", note: "same" },
  "/community/researcher/:slug": { kind: "item" },
};

// --- routes registered by the 2029 router --------------------------------------------------------------------------------
const app = fs.readFileSync(path.join(root, "src/App2029.jsx"), "utf8");
const routes = [...new Set([...app.matchAll(/<Route\b([\s\S]*?)(?:\/>|<\/Route>)/g)].map((m) => m[1].match(/path="([^"]+)"/)?.[1]).filter(Boolean))];
assert.ok(routes.length > 40, `expected the 2029 router to register its routes (found ${routes.length})`);
const undecided = routes.filter((r) => !(r in DECISIONS));
const stale = Object.keys(DECISIONS).filter((r) => !routes.includes(r));
assert.deepEqual(undecided, [], `routes in src/App2029.jsx without an explicit SEO decision in this gate:\n  ${undecided.join("\n  ")}\nAdd an entry (and make api/og.js / the release table answer it).`);
assert.deepEqual(stale, [], `decisions for routes that src/App2029.jsx no longer registers:\n  ${stale.join("\n  ")}`);

// --- ask the real document handler --------------------------------------------------------------------------------------
const sample = (r) => (r === "*" ? "/x" : r.replace(/:[A-Za-z]+/g, "x"));
const fetchFor = (mode) => async (url) => {
  if (mode === "down") throw new Error("source unavailable: " + url);
  const rpc = /\/rpc\/is_(?:number|phrase)_indexable/.test(String(url));
  return { ok: true, status: 200, headers: new Headers({ "content-range": "*/0" }), json: async () => (rpc ? mode === "indexable" : []), text: async () => "[]" };
};
const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: (origin) => origin === SITE,
  readDocument: async () => "<!doctype html><html><head><title>x</title></head><body></body></html>" });
// Home-only site identity of a merged document: verification metas (name=content) and the top-level JSON-LD types, malformed JSON-LD throws.
const identityOf = (html) => ({
  verification: [...html.matchAll(/<meta\b[^>]*name="(google-site-verification|facebook-domain-verification)"[^>]*content="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`),
  ldTypes: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    .flatMap((block) => (Array.isArray(block["@graph"]) ? block["@graph"] : [block])).map((node) => node["@type"]),
});
const HOME_IDENTITY = { verification: ["google-site-verification=kgWILoBLnsZrbYQ6ApBbxmc0VWFZatRVFttxsMGYKrY", "facebook-domain-verification=uvblasa08zc9m3xf1145ncc6zx4bz5"],
  ldTypes: ["WebSite", "Organization"] };
const NO_IDENTITY = { verification: [], ldTypes: [] };
async function ask(url, mode) {
  const res = { h: new Map(), statusCode: null, body: "", setHeader(k, v) { this.h.set(String(k).toLowerCase(), v); }, status(c) { this.statusCode = c; return this; }, send(b) { this.body = String(b); return this; } };
  const previous = globalThis.fetch;
  globalThis.fetch = fetchFor(mode);
  try { await handler({ method: "GET", url, headers: { host: "sod1820.co.il", "x-forwarded-proto": "https" }, query: {} }, res); }
  finally { globalThis.fetch = previous; }
  const canonical = (res.body.match(/rel="canonical" href="([^"]*)/) || [])[1];
  return { identity: identityOf(res.body), status: res.statusCode, robots: res.h.get("x-robots-tag") || "", location: res.h.get("location") || "", retryAfter: res.h.get("retry-after") || "",
    title: (res.body.match(/<title>([^<]*)/) || [])[1] || "", canonical: canonical === undefined ? null : (canonical.replace(SITE, "") || "/") };
}
const NOT_FOUND_TITLE = /(?:הפוסט|העמוד|האוסף|הפריט|הדיון|המקור) לא נמצא|אינו זמין/;
const results = new Map();
const failures = [];
const check = (label, cond, detail) => { if (!cond) failures.push(`${label}: ${detail}`); };
const NOINDEX_ALL = "noindex, nofollow, noarchive";

function expectDocument(label, a, d, route, mode) {
  const want = d.canonical ?? (route === "*" ? "/x" : sample(route));
  switch (d.kind) {
    case "index":
      check(label, a.status === 200 && a.robots === "index, follow", `want 200 "index, follow", got ${a.status} "${a.robots}"`);
      check(label, a.canonical === want, `canonical ${a.canonical} != ${want}`);
      check(label, a.title && !NOT_FOUND_TITLE.test(a.title), `title "${a.title}" is empty or a not-found title`);
      break;
    case "noindex":
      check(label, a.status === 200 && /^noindex/.test(a.robots), `want 200 noindex, got ${a.status} "${a.robots}"`);
      check(label, a.canonical === want, `canonical ${a.canonical} != ${want}`);
      check(label, a.title && !NOT_FOUND_TITLE.test(a.title), `title "${a.title}" is empty or a not-found title`);
      break;
    case "closed": case "account": {
      check(label, a.status === 200 && a.robots === NOINDEX_ALL, `want 200 "${NOINDEX_ALL}", got ${a.status} "${a.robots}"`);
      const state = publicReadingPath(sample(route), { search: "" });
      check(label, d.kind === "account" ? state === "account" : ["closed", "service-closed"].includes(state), `release table state "${state}" does not match decision "${d.kind}"`);
      check(label, a.canonical === (d.kind === "account" ? "/login" : want), `canonical ${a.canonical}`);
      break;
    }
    case "closed503": {
      check(label, a.status === 503 && a.robots === "index, follow", `want 503 "index, follow" (temporarily closed, kept indexable), got ${a.status} "${a.robots}"`);
      check(label, a.retryAfter === String(PUBLIC_TEMPORARILY_CLOSED_RETRY_AFTER), `want Retry-After ${PUBLIC_TEMPORARILY_CLOSED_RETRY_AFTER}, got "${a.retryAfter}"`);
      check(label, publicTemporarilyClosed(sample(route)) === true, `publicTemporarilyClosed(${sample(route)}) must be true for a closed503 decision`);
      check(label, a.canonical === want, `canonical ${a.canonical} != ${want}`);
      check(label, a.title && !NOT_FOUND_TITLE.test(a.title), `title "${a.title}" is empty or a not-found title`);
      break;
    }
    case "missing":
      check(label, a.status === 404 && a.robots === NOINDEX_ALL, `want 404 "${NOINDEX_ALL}", got ${a.status} "${a.robots}"`);
      break;
    case "item":
      if (mode === "down") check(label, a.status === 503 && a.robots === NOINDEX_ALL, `source down: want 503 noindex, got ${a.status} "${a.robots}"`);
      else check(label, a.status === 404 && a.robots === NOINDEX_ALL, `no rows: want 404 noindex, got ${a.status} "${a.robots}"`);
      break;
    case "shape":
      check(label, a.status === 404 && a.robots === NOINDEX_ALL, `invalid identifier: want 404 noindex in every data condition, got ${a.status} "${a.robots}"`);
      break;
    case "collection":
      if (mode === "down") check(label, a.status === 503 && a.robots === NOINDEX_ALL, `source down: want 503 noindex, got ${a.status} "${a.robots}"`);
      else { check(label, a.status === 200 && a.robots === "index, follow", `no rows: want 200 index, got ${a.status} "${a.robots}"`); check(label, a.canonical === want, `canonical ${a.canonical} != ${want}`); }
      break;
    case "number":
      if (mode === "down") check(label, a.status === 503 && a.robots === NOINDEX_ALL, `source down: want 503 noindex, got ${a.status} "${a.robots}"`);
      else if (mode === "indexable") check(label, a.status === 200 && a.robots === "index, follow", `indexable RPC true: want 200 index, got ${a.status} "${a.robots}"`);
      else check(label, a.status === 200 && a.robots === "noindex, follow", `indexable RPC false/empty: want 200 "noindex, follow", got ${a.status} "${a.robots}"`);
      break;
    default: assert.fail(`unknown decision kind ${d.kind} for ${route}`);
  }
}

const MODES = ["down", "empty", "indexable"];
for (const route of routes) {
  const d = DECISIONS[route];
  const url = sample(route);
  for (const mode of MODES) {
    // Only data-driven kinds change with the data condition; every other kind must answer the same in all three.
    if (mode === "indexable" && d.kind !== "number") continue;
    let a = await ask(url, mode);
    results.set(`${route} [${mode}]`, a);
    const label = `${route} [${mode}]`;
    if (d.kind === "redirect") {
      check(label, a.status === 308 && a.location === d.to, `want 308 -> ${d.to}, got ${a.status} -> ${a.location}`);
      a = await ask(d.to, mode);
      expectDocument(`${label} -> ${d.to}`, a, { ...d.then, canonical: d.then.canonical ?? d.to }, d.to.startsWith("/book/") ? "/book/:slug" : d.to, mode);
    } else expectDocument(label, a, d, route, mode);
    // Invariants that hold for every route and every data condition.
    const temporarilyClosed = d.kind === "closed503";   // the only kind that may be indexable with a non-200 status, and it must carry Retry-After (checked above)
    check(label, temporarilyClosed || !(a.status !== 200 && a.status !== 308 && !/^noindex/.test(a.robots)), `status ${a.status} must never be indexable ("${a.robots}")`);
    check(label, temporarilyClosed || !(/^index/.test(a.robots) && a.status !== 200), `an indexable robots decision needs status 200, got ${a.status}`);
    check(label, !(a.status === 200 && NOT_FOUND_TITLE.test(a.title)), `status 200 carries the not-found title "${a.title}"`);
    // CLN-04: the home-only site identity is on the home address (exactly once, exact tokens) and nowhere else. A redirect has no
    // document of its own; its target is judged. The /2029 alias shares the home metadata but is not the home address.
    const effective = d.kind === "redirect" ? d.to : url;
    const wantIdentity = effective === "/" ? HOME_IDENTITY : NO_IDENTITY;
    check(label, JSON.stringify(a.identity) === JSON.stringify(wantIdentity),
      `site identity ${JSON.stringify(a.identity)} != ${JSON.stringify(wantIdentity)} for ${effective}`);
  }
}
assert.deepEqual(failures, [], `route SEO behaviour differs from the explicit decisions:\n  ${failures.join("\n  ")}`);

if (process.env.SEO_BEHAVIOR_VERBOSE) for (const [k, a] of results) console.log(k.padEnd(44), String(a.status).padEnd(4), a.robots.padEnd(30), a.canonical ?? "-", a.location ? "-> " + a.location : "");
const counts = {};
for (const d of Object.values(DECISIONS)) counts[d.kind] = (counts[d.kind] || 0) + 1;
console.log(`2029 route SEO behaviour: PASS (${routes.length} routes, decisions ${JSON.stringify(counts)}; document handler answered ${results.size} probes)`);
