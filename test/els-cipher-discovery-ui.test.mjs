import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ADVANCED = new URL("../src/components/experience2029/ElsAdvancedSearch2029.jsx", import.meta.url);
const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);
const SWITCH = new URL("../src/components/experience2029/ElsMatrixProfileSwitch.jsx", import.meta.url);

test("Cipher Discovery is story-first, pair-first and keeps manual controls optional", async () => {
  const source = await readFile(ADVANCED, "utf8");
  assert.match(source, /prepareElsCipherDiscoveryPlan/);
  assert.match(source, /data-els-cipher-discovery="v1"/);
  assert.match(source, /ספרו מה אתם רוצים למצוא/);
  assert.match(source, /מצא ציר ושני ממצאים מתחברים/);
  assert.match(source, /דיוק ידני · רשות/);
  assert.match(source, /רזיאל עדיין אינו מופעל/);
  assert.match(source, /discoveryGoal: briefPlan\.goal/);
  assert.doesNotMatch(source, /בנה תוכנית ציר והקשר/);
});

test("Classic keeps its original clean labels and exposes no cross-search control", async () => {
  const source = await readFile(NATIVE, "utf8");
  assert.match(source, /const crossSearchOpen = researchProfile && crossOpen/);
  assert.match(source, /researchProfile \? <>[\s\S]*הצלבה בין צירים/);
  assert.match(source, /\["findings", "סריקה וממצאים", "els"\]/);
  assert.match(source, /\["results", "תוצאות", "posts"\]/);
  assert.match(source, /visibleTool === "results" \? "תוצאות החיפוש" : "סריקה וממצאים"/);
  assert.match(source, /researchProfile \? "מצב קלאסי" : "כל הכלים"/);
});

test("Cipher Discovery stays clean until a bounded plan starts and Classic remains available", async () => {
  const [page, profileSwitch] = await Promise.all([readFile(PAGE, "utf8"), readFile(SWITCH, "utf8")]);
  assert.match(profileSwitch, /label: "גילוי צופן"/);
  assert.match(page, /const discoveryWorkspaceReady = !researchProfile/);
  assert.match(page, /hidden=\{!discoveryWorkspaceReady\}/);
  assert.match(page, /!directSavedOpen && !researchProfile \? <ElsRecentCiphers2029/);
  assert.match(page, /researchProfile && discoveryWorkspaceReady \? <ElsResearchBarConnected/);
});
