import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Community chat layout stability (ZURIEL 18.11.2026, "אחרי זה תתחיל עם צ'אט הקהילה").
// Field RUM: about one /community/chat visit in five crossed CLS 0.1. Lab on the live chat found three causes:
// the pinned strip appeared after load (+58 px above the composer and the feed), the two-reply previews of root
// messages grew 200-460 px when the reader reached them (asked only 200 px ahead), and the guest newsletter panel
// opened at the frame panel's size and grew when its own code and stylesheet arrived.
// Local A/B on identical public builds (n=3, load + gradual scroll + the 30 s invitation): phone worst window
// 0.355-0.672 -> 0.089, desktop 0.185-0.218 -> 0.032-0.035; load 0.055 -> 0.019 (phone), 0.028 -> 0.010 (desktop).
const live = readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
const pins = readFileSync(new URL("../src/components/community2029/CommunityTreeHints2029.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/pages/community2029.css", import.meta.url), "utf8");
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

test("the two-reply preview is asked far enough ahead to land below the screen", () => {
  assert.match(live, /if \(previewInRange\.current\) show\(\);[\s\S]{0,400}\}, \{ rootMargin: "1500px 0px" \}\);/);
  assert.doesNotMatch(live, /if \(previewInRange\.current\) show\(\);\s*\}, \{ rootMargin: "200px" \}\);/);
});

test("the pinned strip keeps its place while it loads and disappears only when there is nothing to pin", () => {
  assert.match(live, /const \[treeHints, setTreeHints\] = useState\(null\);/);
  assert.match(live, /setTreeHints\(items \|\| \[\]\)/);
  assert.match(live, /\.catch\(\(\) => \{ if \(live\) setTreeHints\(\[\]\);/);
  assert.match(live, /new Set\(\(treeHints \|\| \[\]\)\.map\(item => item\.id\)\)/);
  assert.match(pins, /if \(hints === null\) return <section className="sod29-tree-pins is-pending" aria-hidden="true" data-tree-pins="pending" \/>;/);
  assert.match(css, /\.sod29-tree-pins\.is-pending\{min-height:46px;box-sizing:border-box;border-color:transparent;background:transparent\}/);
});

test("the guest newsletter invitation opens only after its code and stylesheet are loaded, at its final size", () => {
  assert.match(frame, /const loadGuestNewsletterInvite2029 = \(\) => import\("\.\/GuestNewsletterInvite2029\.jsx"\)\.then\(/);
  assert.match(frame, /onOpen: \(\) => \{ loadGuestNewsletterInvite2029\(\)\.then\(\(\) => openTransient\(TRANSIENT\.NEWSLETTER\), \(\) => openTransient\(TRANSIENT\.NEWSLETTER\)\); \},/);
  assert.match(frame, /const Loaded = guestNewsletterInviteLoaded2029; return Loaded \? <Loaded \{\.\.\.props\} \/> : <GuestNewsletterInviteLazy2029 \{\.\.\.props\} \/>;/);
  // No new static import into the always-loaded frame (Speed Law): the invitation stays a dynamic import.
  assert.doesNotMatch(frame, /^import .*GuestNewsletterInvite2029\.jsx/m);
});
