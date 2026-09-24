import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile("src/pages/Home2029Page.jsx", "utf8");
const projection = await readFile("src/lib/research/home2029Projection.js", "utf8");
const timeFlow = await readFile("src/lib/timeFlow.js", "utf8");
const css = await readFile("src/components/experience2029/sod2029-closed.css", "utf8");
const curation = await readFile("src/components/experience2029/CurationMark2029.jsx", "utf8");

assert.match(home, /fetchHome2029Projection/);
assert.match(home, /מה מתגלה עכשיו/);
assert.match(home, /TemporalNowCard/);
assert.match(home, /TemporalTreasures/);
assert.match(home, /אוצרות שמאירים את העת/);
assert.match(home, /CurationMark2029/);
assert.ok(home.indexOf('id="global-now"') < home.indexOf('id="universal-entry"'), "Global Now must lead Home before search");
assert.match(home, /lens: item\.worldLens \|\| "time"/);
assert.match(home, /navigate\("\/world"\)/);
assert.doesNotMatch(home, /לא קביעה של תאריך עתידי/);

assert.match(projection, /getCurrentTemporalContext/);
assert.match(projection, /fetchCurationCatalog2029/);
assert.match(projection, /fn_method_value/);
assert.match(projection, /research_contributions/);
assert.match(projection, /gematria_words/);
assert.match(projection, /contains\("tags", \["אוצרות הגילוי"\]\)/);
assert.match(projection, /sourceCount < 2/);
assert.doesNotMatch(projection, /\b787\b/, "Global Now adapter must not hard-code current Hebrew-year gematria");
assert.doesNotMatch(projection, /\b1820\b/, "Temporal Treasure projection must resolve curated anchors dynamically");
assert.match(projection, /treasureAnchorMatch/);
assert.match(projection, /treasureCatalog/);

assert.match(timeFlow, /TEMPORAL_CONTEXT_VERSION/);
assert.match(timeFlow, /ISRAEL_TIME_ZONE/);
assert.match(timeFlow, /getCurrentTemporalContext/);
assert.match(css, /Home temporal Treasures/);
assert.match(curation, /data-curation-treasure-disclosure/);

console.log("PASS Home2029 temporal Treasures integration acceptance");
