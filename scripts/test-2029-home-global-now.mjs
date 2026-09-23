import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile("src/pages/Home2029Page.jsx", "utf8");
const projection = await readFile("src/lib/research/home2029Projection.js", "utf8");
const timeFlow = await readFile("src/lib/timeFlow.js", "utf8");
const css = await readFile("src/components/experience2029/sod2029-closed.css", "utf8");

assert.match(home, /fetchHome2029Projection/);
assert.match(home, /מה מתגלה עכשיו/);
assert.match(home, /TemporalNowCard/);
assert.ok(home.indexOf('id="global-now"') < home.indexOf('id="universal-entry"'), "Global Now must lead Home before search");
assert.match(home, /lens: item\.worldLens \|\| "time"/);
assert.match(home, /navigate\("\/world"\)/);

assert.match(projection, /getCurrentTemporalContext/);
assert.match(projection, /fn_method_value/);
assert.match(projection, /research_contributions/);
assert.match(projection, /\.eq\("status", "approved"\)/);
assert.match(projection, /\.eq\("space", "core"\)/);
assert.match(projection, /\.eq\("home_hidden", false\)/);
assert.match(projection, /sourceCount < 2/);
assert.doesNotMatch(projection, /\b787\b/, "Global Now adapter must not hard-code the current Hebrew-year gematria");
assert.match(projection, /whyNow/);

assert.match(timeFlow, /TEMPORAL_CONTEXT_VERSION/);
assert.match(timeFlow, /ISRAEL_TIME_ZONE/);
assert.match(timeFlow, /getCurrentTemporalContext/);
assert.match(css, /Home Global Now Golden/);

console.log("PASS Home2029 Global Now temporal Golden acceptance");
