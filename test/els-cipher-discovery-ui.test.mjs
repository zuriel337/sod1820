import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ADVANCED = new URL("../src/components/experience2029/ElsAdvancedSearch2029.jsx", import.meta.url);
const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);
const SWITCH = new URL("../src/components/experience2029/ElsMatrixProfileSwitch.jsx", import.meta.url);
const APP = new URL("../src/App2029.jsx", import.meta.url);

test("restored Research brief stays explicit, local and bounded", async () => {
  const source = await readFile(ADVANCED, "utf8");
  assert.match(source, /prepareElsResearchBrief/);
  assert.doesNotMatch(source, /prepareElsCipherDiscoveryPlan/);
  assert.match(source, /מחקר דילוגים/);
  assert.match(source, /בנה תוכנית ציר והקשר/);
  assert.match(source, /מצא את הציר ובנה סביבו חבילת מחקר/);
  assert.match(source, /הסיפור נשאר בזיכרון המסך בלבד/);
  assert.match(source, /רק הציר ומונחי ההקשר שבחרתם נשלחים בלחיצה מפורשת/);
  assert.doesNotMatch(source, /discoveryGoal: briefPlan\.goal/);
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

test("the restored workspace remains visible while Research-only tools stay gated", async () => {
  const [page, profileSwitch, app] = await Promise.all([
    readFile(PAGE, "utf8"),
    readFile(SWITCH, "utf8"),
    readFile(APP, "utf8"),
  ]);
  assert.match(profileSwitch, /label: "מחקר"/);
  assert.match(profileSwitch, /label: "קלאסי"/);
  assert.doesNotMatch(page, /discoveryWorkspaceReady/);
  assert.match(page, /!directSavedOpen \? <ElsRecentCiphers2029/);
  assert.match(page, /data-els-research-tools="brief-visible-v1" hidden=\{!researchProfile \|\| directSavedOpen\}/);
  assert.match(page, /researchProfile \? <ElsResearchBarConnected/);
  assert.match(app, /function ElsAddressAlias2029\(\)[\s\S]*?return <Els2029Page \/>/);
  assert.doesNotMatch(app, /function ElsAddressAlias2029\(\)[\s\S]*?<Navigate replace to=\{`\/code/);
});
