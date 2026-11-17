import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homePinnedLeadEarlyWanted } from "../src/lib/homeAtmospherePreload2029.js";
import { preloadPinnedCover2029, startHomePinnedLeadEarly2029, HOME_PINNED_COVER_MARK } from "../src/lib/homePinnedLeadEarly2029.js";
import { pinnedCatalogCover2029, pinCoverSet, PIN_COVER_SIZES, PIN_COVER_WIDTHS, PIN_COVER_QUALITY } from "../src/components/experience2029/homePinnedCover2029.js";
import { seriesLatestMember2029 } from "../src/lib/nowPublications2029.js";
import { fetchContentSeriesCatalog2029, resetSharedCatalogRead2029 } from "../src/lib/research/contentSeries2029Projection.js";
import { CONTENT_SERIES_2029 } from "../src/lib/research/contentSeries2029Identity.js";

// HOME_PINNED_LEAD_EARLY_20261117 (ZURIEL 17.11.2026, "מאשר, תתחיל בסעיף 2"; test branch). The Home's pinned card waited for a chain: the entry,
// then the Home component, then the series catalog read, then its cover. The entry now starts the SAME catalog read at once and, when it
// answers, asks for the card's own cover copies. One read (shared), one image download (the same src/srcset/sizes), no change for other pages.

const COVER = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/post-5107-cover/reading-v2.jpg";
const primaryKey = CONTENT_SERIES_2029.find(spec => spec.priorityLane === "primary").key;
const seriesWith = items => [{ key: "other", priorityLane: "secondary", items: [{ id: "1", coverUrl: COVER.replace("5107", "1") }] },
  { key: primaryKey, priorityLane: "primary", items }];

function fakeDocument() {
  const head = { children: [], appendChild(node) { this.children.push(node); return node; } };
  return {
    head,
    createElement(tag) {
      const attributes = new Map();
      return { tagName: tag.toUpperCase(), rel: "", as: "", href: "", setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; }, attributes };
    },
    querySelector(selector) {
      return selector === `link[rel="preload"][${HOME_PINNED_COVER_MARK}]`
        ? head.children.find(node => node.rel === "preload" && node.getAttribute(HOME_PINNED_COVER_MARK) !== null) || null : null;
    },
  };
}

test("the early start runs only where the Home renders on the public release", () => {
  for (const pathname of ["/", "/2029", "/2029/"]) assert.equal(homePinnedLeadEarlyWanted({ release: true, pathname }), true, pathname);
  for (const pathname of ["/world", "/post/x", "/community/chat", "/2029/posts", "/gematria"]) assert.equal(homePinnedLeadEarlyWanted({ release: true, pathname }), false, pathname);
  assert.equal(homePinnedLeadEarlyWanted({ release: false, pathname: "/" }), false, "not the public release");
  assert.equal(homePinnedLeadEarlyWanted({ release: true, pathname: "/", search: "?p=36971" }), false, "a WordPress ?p= address opens a Post");
  assert.equal(homePinnedLeadEarlyWanted({ release: true, pathname: "/", search: "?fbclid=abc" }), true);
});

test("the early cover is the card's cover: the same member, src, srcset and sizes", () => {
  const items = [
    { id: "4000", coverUrl: COVER.replace("5107", "4000"), publishedAt: "2026-09-01T00:00:00Z" },
    { id: "5107", coverUrl: COVER, publishedAt: "2026-10-12T00:00:00Z" },
  ];
  const cover = pinnedCatalogCover2029(seriesWith(items));
  const member = seriesLatestMember2029(items);
  assert.equal(cover.memberId, member.id, "the same member as the card (seriesLatestMember2029)");
  assert.equal(cover.src, member.coverUrl);
  assert.equal(cover.srcSet, pinCoverSet(member.coverUrl));
  assert.equal(cover.sizes, PIN_COVER_SIZES);
  assert.match(cover.srcSet, new RegExp(`render/image/public/.+width=${PIN_COVER_WIDTHS[0]}&quality=${PIN_COVER_QUALITY}&resize=contain ${PIN_COVER_WIDTHS[0]}w, .+width=${PIN_COVER_WIDTHS[1]}&quality=${PIN_COVER_QUALITY}&resize=contain ${PIN_COVER_WIDTHS[1]}w$`));
  assert.equal(pinnedCatalogCover2029(seriesWith([{ id: "9", coverUrl: null }])), null, "no cover: nothing to ask for");
  assert.equal(pinnedCatalogCover2029([]), null);
  assert.equal(pinnedCatalogCover2029(null), null);
});

test("the card itself renders from the same helper (one definition)", () => {
  const card = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
  assert.match(card, /import \{ pinCoverSet, PIN_COVER_SIZES \} from "\.\/homePinnedCover2029\.js";/);
  assert.match(card, /srcSet=\{set \|\| undefined\} sizes=\{set \? PIN_COVER_SIZES : undefined\}/);
  assert.doesNotMatch(card, /const pinCoverSet\s*=|const PIN_COVER_WIDTHS\s*=/, "no second copy of the cover rule");
  assert.match(card, /fetchContentSeriesCatalog2029\(\{ homeOnly: true, homeDisplay: true, signal: controller\.signal \}\)/, "the Home's own read options");
  const early = readFileSync(new URL("../src/lib/homePinnedLeadEarly2029.js", import.meta.url), "utf8");
  assert.match(early, /read\(\{ homeOnly: true, homeDisplay: true \}\)/, "the early start reads with the same options, so it is the same shared read");
});

test("one preload link for the cover, with the card's srcset and sizes; idempotent", () => {
  const doc = fakeDocument();
  const cover = { src: COVER, srcSet: pinCoverSet(COVER), sizes: PIN_COVER_SIZES, memberId: "5107" };
  const link = preloadPinnedCover2029(cover, { doc });
  assert.equal(link.rel, "preload");
  assert.equal(link.as, "image");
  assert.equal(link.href, COVER);
  assert.equal(link.getAttribute("imagesrcset"), cover.srcSet);
  assert.equal(link.getAttribute("imagesizes"), PIN_COVER_SIZES);
  assert.equal(link.getAttribute("fetchpriority"), "high");
  assert.equal(link.getAttribute(HOME_PINNED_COVER_MARK), "5107");
  assert.equal(preloadPinnedCover2029(cover, { doc }), link, "a second call reuses the first link");
  assert.equal(doc.head.children.length, 1);
  assert.equal(preloadPinnedCover2029(null, { doc }), null);
  assert.equal(preloadPinnedCover2029({ src: COVER }, { doc: null }), null);
});

test("the early start reads with the Home's options and preloads the cover; a failed read changes nothing", async () => {
  const doc = fakeDocument();
  const calls = [];
  const items = [{ id: "5107", coverUrl: COVER, publishedAt: "2026-10-12T00:00:00Z" }];
  const link = await startHomePinnedLeadEarly2029({ doc, read: async options => { calls.push(options); return { series: seriesWith(items) }; } });
  assert.deepEqual(calls, [{ homeOnly: true, homeDisplay: true }]);
  assert.equal(link.href, COVER);
  const failing = fakeDocument();
  assert.equal(await startHomePinnedLeadEarly2029({ doc: failing, read: async () => { throw new Error("offline"); } }), null);
  assert.equal(failing.head.children.length, 0);
});

test("the early read and the Home's later read are ONE network read (the catalog's shared read)", async () => {
  resetSharedCatalogRead2029();
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input) => {
    const url = String(input?.url || input);
    requests.push(url);
    return new Response("[]", { status: 200, headers: { "content-type": "application/json", "content-range": "0-0/0" } });
  };
  try {
    const early = fetchContentSeriesCatalog2029({ homeOnly: true, homeDisplay: true });
    const controller = new AbortController();
    const home = fetchContentSeriesCatalog2029({ homeOnly: true, homeDisplay: true, signal: controller.signal });
    await Promise.all([early, home]);
    const postsReads = requests.filter(url => url.includes("/rest/v1/posts"));
    assert.equal(postsReads.length, CONTENT_SERIES_2029.length, `one read per series, not two (${postsReads.length})`);
    await fetchContentSeriesCatalog2029({ homeOnly: true, homeDisplay: true });
    assert.equal(requests.filter(url => url.includes("/rest/v1/posts")).length, CONTENT_SERIES_2029.length, "within the minute the Home reuses it");
  } finally {
    globalThis.fetch = original;
    resetSharedCatalogRead2029();
  }
});

test("the entry reaches the early start through the Home route module only (no new code for other pages)", () => {
  const entry = readFileSync(new URL("../src/lib/homeAtmospherePreload2029.js", import.meta.url), "utf8");
  assert.match(entry, /import\("\.\.\/pages\/Home2029Page\.jsx"\)\.then\(module => module\.startHomePinnedLeadEarly2029\?\.\(\)\)\.catch\(\(\) => \{\}\)/);
  assert.doesNotMatch(entry, /^import .*homePinnedLeadEarly2029/m, "no static import into the entry");
  const page = readFileSync(new URL("../src/pages/Home2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /export \{ startHomePinnedLeadEarly2029 \} from "\.\.\/lib\/homePinnedLeadEarly2029\.js";/);
});
