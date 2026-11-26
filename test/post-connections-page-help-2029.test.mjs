import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Post public connections: the canonical graph for any Post, only when real, lazy, compact", () => {
  const component = read("../src/components/experience2029/PostConnections2029.jsx");
  assert.match(component, /if \(!rows\.length\) return null/, "nothing when the Post has no real connection");
  assert.match(component, /aria-label="חיבורים נוספים"/, "the rail's own name for the list");
  assert.match(component, /className="k29-cat"/, "the Post's own chip language");
  assert.match(component, /id=\{postConnectionAnchor2029\(item\)\}/, "each chip has its own address");
  assert.match(component, /import\("\.\.\/\.\.\/lib\/research\/postGraphConnections2029\.js"\)/, "a Post without authored connections reads the canonical graph, through the one reader module");
  assert.doesNotMatch(component, /supabase|fetch\(/, "no read of its own in the component");
  assert.match(component, /POST_CONNECTIONS_VISIBLE_2029 = 4/);
  assert.match(component, /עוד \{hidden\.length\}/, "a long list shows the first four and \"עוד N\"");
  assert.match(component, /aria-expanded="false" onClick=\{\(\) => setOpen\(true\)\}/);
  const reader = read("../src/lib/research/postGraphConnections2029.js");
  assert.match(reader, /fetchCanonicalGraphEntityFindings/, "the one existing graph reader");
  assert.match(reader, /resolvePostExperienceConnections/, "the one access-controlled admission resolver");
  assert.doesNotMatch(reader, /\.(insert|update|upsert|delete|rpc)\(/, "reading only");
  const page = read("../src/pages/Post2029Page.jsx");
  assert.match(page, /const PostConnections2029 = toolOnApproach2029\(\(\) => import\("\.\.\/components\/experience2029\/PostConnections2029\.jsx"\)/, "loaded when near, never statically");
  assert.doesNotMatch(page, /^import PostConnections2029/m);
  assert.match(page, /publicSurfaceFindingsFromConnections\(experience\.connections\)/, "pilot Posts: the same admitted-links projection the context rail uses");
  assert.match(page, /!projection\.draft && !projection\.privateStage && !projection\.previewSnapshot\s*\? <PostConnections2029 post=\{projection\.sourcePost\}/, "every public Post, never a draft");
  assert.match(page, /eager=\{Boolean\(connectionsHashId\)/, "an address that points here loads it at once");
  // The research panels are not back: the disclosure stays admin-only.
  assert.match(page, /isAdmin === true && !bennettTimeline \? <details className="sod29-post-admin-row">/);
});

test("Addresses: the public block and the admin tool never share an id; the old research addresses stay the admin tool's", () => {
  const page = read("../src/pages/Post2029Page.jsx");
  const component = read("../src/components/experience2029/PostConnections2029.jsx");
  assert.match(component, /POST_CONNECTIONS_ANCHOR_2029 = "post-public-connections"/);
  const admin = page.slice(page.indexOf("const researchDisclosure"), page.indexOf("const researchDisclosure") + 6000);
  const adminIds = new Set([...admin.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  assert.ok(adminIds.has("post-connections") && adminIds.has("post-research"), "the admin tool keeps its addresses");
  for (const id of ["post-public-connections"]) assert.ok(!adminIds.has(id), `${id} is not an admin id`);
  assert.doesNotMatch(component, /id="post-connections"/, "the public block does not reuse the admin id");
  assert.match(page, /const legacyAlias = isAdmin !== true && \(id === "post-connections" \|\| id === "source-region-post-connections"\)/, "for everyone else the old addresses land on the public block");
  const css = read("../src/pages/post2029-reading.css");
  assert.match(css, /\.post-connections \.k29-cat\{min-height:44px;/, "every chip is a 44px target");
  assert.match(css, /\.post-connections \.k29-cats\{display:flex;flex-wrap:wrap;gap:0 6px/, "rows touch, they do not overlap");
  assert.match(css, /\.post-connections \.k29-cat::before\{content:"";position:absolute;inset:6px 0;/, "the pill is 32px inside the 44px target");
});

test("Exact return: a connection returns to ITSELF; the old region address lands on the connections", () => {
  const page = read("../src/pages/Post2029Page.jsx");
  assert.match(page, /const locator = `#post-connection-\$\{finding\.id\}`/);
  assert.match(page, /entityType: "post_connection"/);
  assert.match(page, /returnTo: exactTarget \? exactReturnForConnection\(exactTarget\) : exactReturnForRegion\(connectionRegion \|\| activeFocus\)/);
  assert.match(page, /legacyAlias \? "post-public-connections" : id/, "the old return address still resolves");
  assert.match(page, /block: "center", behavior: "instant"[\s\S]*ResizeObserver/, "lands and stays while the page settles");
  assert.match(page, /\["wheel", "touchstart", "pointerdown", "keydown"\]/, "released at the reader's first input");
});

test("ONE page-help action: the same label, box, corner and behaviour on every surface; it never explains a finding", () => {
  const mark = read("../src/components/experience2029/LearnMark2029.jsx");
  assert.match(mark, /export const PAGE_HELP_LABEL = "מה זה\?"/);
  assert.match(mark, /event\.key === "Escape"[\s\S]*document\.addEventListener\("keydown", onKey\)/, "Escape closes wherever the focus is");
  assert.match(read("../src/components/experience2029/RoyalIntro2029.jsx"), /event\.key === "Escape"[\s\S]*document\.addEventListener\("keydown", onKey\)/, "the Hall intro closes the same way");
  assert.match(mark, /trigger\.current\?\.focus\(\)/, "focus returns to the button");
  assert.match(mark, /סגירת ההסבר/, "the same close button as the Hall intro");
  const css = read("../src/components/experience2029/learnMark2029.css");
  assert.match(css, /\.sod29-learn-mark\.scope-surface \.sod29-learn-mark-trigger\{[^}]*border:0;background:none;font-size:var\(--s29-type-micro,14px\)/, "quiet 14px text button (no pill)");
  assert.match(css, /\.sod29-learn-mark\.scope-surface \.sod29-learn-mark-disclosure\{position:absolute/, "opens over the page, no layout push");
  const intro = read("../src/components/experience2029/RoyalIntro2029.jsx");
  assert.match(intro, /\? מה זה\?/, "the Hall intro uses the same label");
  assert.match(intro, /minHeight: 44/);
  const post = read("../src/pages/post2029-reading.css");
  assert.match(post, /\.sod29-orientation-host\{position:absolute;inset-block-start:13px;inset-inline-end:15px/, "the Hall's corner (14px/16px) inside the Post's 1px border");
  const doc = read("../src/lib/research/postArticleDocument2029.js");
  assert.match(doc, /<span class="sod29-learn-mark-label">מה זה\?<\/span>/, "the first document draws the same label");
  assert.doesNotMatch(doc, /איך זה עובד/, "no second label for the same action");
  // "Why is this finding shown" is a different action: it never borrows the page-help label.
  for (const file of ["../src/components/research/WorldSourceConnections.jsx", "../src/pages/World2029Page.jsx", "../src/components/experience2029/PostConnections2029.jsx"]) {
    assert.doesNotMatch(read(file), /PAGE_HELP_LABEL|"\? מה זה\?"/, `${file} must not use the page-help label for a finding`);
  }
});
