// Every public Or HaGeula video can be shared to its OWN item address, through the one ShareActions (share_placement_law,
// canonical_ui_components_law). A share is recorded only when it happened (not on a cancelled sheet or a failed copy).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/PublicContinuity2029Page.jsx", "utf8");
const now = readFileSync("src/components/experience2029/NowPublications2029.jsx", "utf8");
const actions = readFileSync("src/components/ShareActions.jsx", "utf8");
const og = readFileSync("api/og.js", "utf8");

test("the Or HaGeula item page shares the exact item, with every approved channel", () => {
  assert.match(page, /import ShareActions from "\.\.\/components\/ShareActions\.jsx"/, "the one canonical share component");
  assert.match(page, /const orGeulaShareUrl = item => item\?\.href && \/\^\\\/or-geula\\\/video\\\/\[0-9a-f-\]\{36\}\$\/i\.test\(item\.href\) \? `\$\{SHARE_SITE\}\$\{item\.href\}` : null;/,
    "only an item's own canonical address, on the canonical site, is ever shared");
  assert.match(page, /<ShareActions force type=\{orGeulaHasVideo\(item\) \? "video" : "or-geula"\} url=\{orGeulaShareUrl\(item\)\}[^>]*channels=\{SHARE_CHANNELS\}/);
  assert.match(page, /link\.kind === "youtube" \|\| link\.kind === "vimeo"/, "a YouTube/Vimeo video is found by the canonical link detector");
  assert.match(page, /const SHARE_CHANNELS = \["native", "whatsapp", "telegram", "facebook", "copy"\]/);
  assert.doesNotMatch(page, /url=\{[^}]*(mediaHref|embed|youtube)/i, "never a media file or an embed address");
});

test("every video card in the collection has its own quiet share, outside the card link", () => {
  const grid = page.slice(page.indexOf('<ul className="continuity-source-grid">'));
  assert.match(grid, /<\/Link>\s*\{orGeulaHasVideo\(source\) && orGeulaShareUrl\(source\) \? <ShareActions force variant="icon" type="video" url=\{orGeulaShareUrl\(source\)\}/,
    "the share button sits beside the card link, never nested inside it");
});

test("Now shares an Or HaGeula video to the same item address, and nothing else changes", () => {
  assert.match(now, /video && !model\.unverified && model\.item\?\.channel === "or-geula" && model\.item\?\.sourceKind === "channel_update"/);
  assert.match(now, /`\$\{SHARE_SITE\}\/or-geula\/video\/\$\{match\[1\]\.toLowerCase\(\)\}`/);
  assert.match(now, /<ShareActions force compact type="video" url=\{orGeulaVideoShareUrl\(model\)\}/);
});

test("the shared address has its own preview: title, description and the thumbnail or the branded card; a private item is not found", () => {
  assert.match(og, /\/\^\\\/or-geula\\\/video\\\/\[\^\/\]\+\$\/\.test\(decodedKey\)/);
  assert.match(og, /image = result\.item\.posterHref \|\| image;/);
  assert.match(og, /if \(documentStatus === 404\) \{ title = 'הפריט לא נמצא/);
});

test("a share is recorded only after it happened: completed sheet, successful copy, shared or downloaded image", () => {
  assert.match(actions, /const shared = await nativeShare\(\{[^}]*\}\);\s*if \(shared\) logShare\("native"/);
  assert.match(actions, /const ok = await copyLink\(attributedShareUrl\(fullUrl, "copy"\)\);\s*setCopied\(ok\); setCopyFailed\(!ok\);\s*if \(ok\) \{ logShare\("copy"/);
  assert.match(actions, /await shareImageFile\(file, \{ title: text, text \}\); logShare\("image", resolved\);/);
  assert.match(actions, /if \(e && e\.name === "AbortError"\) \{ setImgBusy\(false\); return; \}/, "a cancelled image share is not recorded");
  assert.doesNotMatch(actions, /logShare\("native"[^;]*;\s*await nativeShare/, "never recorded before the sheet resolves");
});
