// A link to a group message that has only an image or video (no text) must open it in the World (ZURIEL 25.11.2026: "a click on a message of Tzvi reaches the
// World and nothing opens"). The World gave an anchor and an openable card only to a message with text, so the newest image messages went to a page where the
// target did not exist. Live check before the fix: text messages opened and scrolled into view, image-only messages (e8bfbd34, 9d09aa2e, 52fdbd76) did not.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/research/WorldPublicUpdates2029.jsx", import.meta.url), "utf8");

test("a group message with media and no text still gets the anchor and the openable card", () => {
  assert.match(src, /sourceKind !== "group_message" \|\| \(!item\.fullText && !item\.media\)\) return null/, "the anchor needs text OR media");
  assert.doesNotMatch(src, /sourceKind !== "group_message" \|\| !item\.fullText\) return null/, "text-only gate is gone");
  assert.match(src, /import \{ GroupMessageText, GroupSourceMedia \} from "\.\/GroupSourceMeta2029\.jsx"/);
  assert.match(src, /<GroupSourceMedia item=\{item\} \/>/, "the card shows the image or video");
  assert.match(src, /\{item\.fullText \? <p><GroupMessageText text=\{item\.fullText\} \/><\/p> : null\}/, "empty text renders nothing");
  assert.match(src, /item\.fullText && item\.fullText\.length >= 1200/, "the length note does not read a missing text");
});

test("the card still opens by its hash and keeps its id", () => {
  assert.match(src, /id=\{groupSourceAnchor\(item\)\}/);
  assert.match(src, /open=\{selectedSourceHash === `#\$\{groupSourceAnchor\(item\)\}` \|\| undefined\}/);
  assert.match(src, /const selected = filtered\.find\(/, "a target outside the first page is still added to the list");
});
