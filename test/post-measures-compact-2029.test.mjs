import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { qualityStars, strengthValue } from "../src/lib/ratings2029.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const measures = read("src/components/experience2029/PostConvergenceMeasures2029.jsx");
const css = read("src/components/experience2029/postConvergenceMeasures2029.css");
const tabs = read("src/components/experience2029/PostAfterReadingTabs2029.jsx");
const page = read("src/pages/Post2029Page.jsx");

test("the public label is Convergences while the id and anchors are unchanged", () => {
  assert.match(tabs, /\{ id: "meeting", label: "התכנסויות", heading: "התכנסויות ועומק ההקשר" \}/);
  assert.match(tabs, /return "meeting"/);
  assert.match(tabs, /"#post-discovery-meeting"/);
  assert.match(tabs, /"#post-discovery-sources"/);
  assert.match(tabs, /"#post-connections"/);
  assert.doesNotMatch(tabs, /label: "מפגש"/);
});

test("four separate readings, no combined score or new formula", () => {
  for (const label of ["חוזק התכנסות", "איכות", "כיסוי מחקרי", "אימות חישוב"]) assert.ok(measures.includes(label));
  assert.match(measures, /strengthValue\(lead\?\.meterScore\)/);
  assert.match(measures, /qualityStars\(lead\?\.quality\)/);
  assert.match(measures, /בלי ציון מסכם/);
  assert.doesNotMatch(measures, /\.reduce\(|Math\.(round|max|min)\(.*coverage|total score|weighted/i);
  assert.doesNotMatch(measures, /convergence_meter\(|new ResearchProvider|\.insert\(|\.update\(|\.rpc\(/);
});

test("unknown data is never drawn as zero", () => {
  assert.deepEqual(strengthValue(null), { state: "unknown", value: null });
  assert.equal(qualityStars(0).state, "unrated");
  assert.equal(qualityStars(null).state, "unrated");
  assert.match(measures, /לא דורג/);
  assert.match(measures, /אין נתון/);
  assert.match(measures, /הפוסט עדיין לא מופה/);
  assert.match(measures, /coverage: "unmapped"/);
});

test("one bounded card read, the six dimensions come from the existing owner and open on click", () => {
  assert.equal((measures.match(/supabase\.from\(/g) || []).length, 1);
  assert.match(measures, /topic_cards_public/);
  assert.match(measures, /\.limit\(3\)/);
  assert.match(measures, /import \{ COVERAGE_LABEL, DIMENSIONS \} from "..\/..\/lib\/research\/contextDepthProjection2029.js"/);
  assert.match(measures, /aria-expanded=\{open\}/);
  assert.match(measures, /aria-controls=\{panelId\}/);
  assert.match(measures, /תגית וגוף הפוסט נספרים כקבוצה אחת/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /position:\s*(fixed|sticky)/);
});

test("the Post renders the measures once, above the menu for 5107 and in place for ordinary posts", () => {
  assert.equal((page.match(/\{postConvergenceContent\}/g) || []).length, 2);
  const tabsBranch = page.indexOf("electionsAfterPostEnabled && PostAfterReadingTabs2029");
  assert.ok(page.indexOf("{postConvergenceContent}", tabsBranch) < page.indexOf("<PostAfterReadingTabs2029 postId={post.id}"));
  assert.match(page, /depth=\{electionsAfterPostEnabled \? electionsReview\.model\?\.depth \|\| null : null\}/);
  assert.match(page, /discoveryLinks=\{electionsAfterPostEnabled\}/);
  const meeting = page.slice(page.indexOf("meeting={<>"), page.indexOf("sources={<>"));
  assert.doesNotMatch(meeting, /postConvergenceContent/);
  assert.ok(page.indexOf("const electionsAfterPostEnabled") < page.indexOf("const postConvergenceContent"));
});

test("shell-owned files are not part of this change", () => {
  for (const name of ["SystemFrame2029", "SurfaceContextRail2029", "CompanionPanel2029", "RazielOrb"]) assert.ok(!measures.includes(name) && !tabs.includes(name));
});
