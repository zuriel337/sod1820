// 2029 share alignment (ZURIEL 18.11.2026, branch only). See docs/reviews/share-card-bignum-20261118/SHARE_ALIGNMENT_REVIEW_2029.md.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nativeShareOutcome, pageOwnShareTitle } from "../src/lib/share.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

async function withNavigator(nav, fn) {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
  try { return await fn(); } finally { if (desc) Object.defineProperty(globalThis, "navigator", desc); else delete globalThis.navigator; }
}

test("system share reports what really happened: shared, cancelled, failed or unsupported — opening is never success", async () => {
  assert.equal(await withNavigator({ share: async () => {} }, () => nativeShareOutcome({ url: "https://sod1820.co.il/" })), "shared");
  const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
  assert.equal(await withNavigator({ share: async () => { throw abort; } }, () => nativeShareOutcome({ url: "x" })), "cancelled");
  assert.equal(await withNavigator({ share: async () => { throw new TypeError("not allowed"); } }, () => nativeShareOutcome({ url: "x" })), "failed");
  assert.equal(await withNavigator({}, () => nativeShareOutcome({ url: "x" })), "unsupported");
});

function doc(title, canonical) {
  return { title, querySelector: () => (canonical ? { href: canonical } : null) };
}

test("the share text is the page's own title only once that page applied it; a previous page's title never travels", () => {
  const here = { pathname: "/number/358" };
  assert.equal(pageOwnShareTitle(here, doc("358 · דף המספר · SOD1820", "https://sod1820.co.il/number/358")), "358 · דף המספר · SOD1820");
  assert.equal(pageOwnShareTitle(here, doc("פוסט ישן · SOD1820", "https://sod1820.co.il/some-old-post")), "SOD1820", "stale title from the previous route");
  assert.equal(pageOwnShareTitle(here, doc("כותרת", null)), "SOD1820", "no canonical yet");
  // An old post read at /post/<slug> whose canonical is the root address is the same item.
  assert.equal(pageOwnShareTitle({ pathname: "/post/%D7%A9%D7%9C%D7%95%D7%9D" }, doc("שלום · SOD1820", "https://sod1820.co.il/%D7%A9%D7%9C%D7%95%D7%9D")), "שלום · SOD1820");
});

test("ShareActions: a failed sheet falls back to copy and says so; an image share keeps its link", () => {
  const actions = read("src/components/ShareActions.jsx");
  assert.match(actions, /const text = title \|\| pageOwnShareTitle\(/);
  assert.match(actions, /"השיתוף לא נפתח\. הקישור הועתק\."/);
  assert.match(actions, /"השיתוף לא נפתח\. אפשר להעתיק את הקישור\."/);
  assert.doesNotMatch(actions, /שותף בהצלחה/, "no 'shared successfully' message: the page cannot know");
  assert.match(actions, /shareImageFile\(file, \{ title: text, text, url: attributedShareUrl\(fullUrl, "native"\) \}\)/);
});

test("frame: the inspect panel shares the same sanitized public link as the More panel, and nothing on a private page", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /\{shareHref \? <div className="sod29-canonical-share" data-share-owner="ShareActions">/);
  assert.match(frame, /<ShareActions\s+type=\{target\.type \|\| "page"\}\s+url=\{shareHref\}/);
  assert.doesNotMatch(frame, /title=\{`SOD1820 · \$\{publicContextLabel\(target\.label\)/, "the text no longer names a different item than the link");
  assert.match(frame, /onNeedHelp=\{openIssueReport\} shareHref=\{shareHref\} \/>/);
  assert.match(frame, /share=\{shareHref \? \{ href: shareHref, type: surface === "post" \? "post" : "page", surface \} : null\}/, "no static shell title (פוסט / SOD1820) as share text");
});

test("gallery applies its own title and canonical at /gallery (same as the server), not the previous page's", () => {
  const gallery = read("src/pages/Gallery2029Page.jsx");
  assert.match(gallery, /if \(location\.pathname !== "\/gallery"\) return;\s*applySeo\(\{ title: "גלריות ומקורות"/);
  assert.match(gallery, /path: "\/gallery"/);
  assert.match(gallery, /follow: true/);
  const og = read("api/og.js");
  assert.match(og, /title = 'גלריות ומקורות · ' \+ SITE_NAME;/, "the server title the client mirrors");
});
