import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/pages/HomeNewPage.jsx", "utf8");
const supabase = readFileSync("src/lib/supabase.js", "utf8");

assert.match(supabase, /export async function getRecentPublishedGematria/);
assert.match(supabase, /from\("gematria_words"\)/);
assert.match(supabase, /\.eq\("is_verified", true\)/);
assert.match(supabase, /\.eq\("is_published", true\)/);
assert.match(supabase, /\.order\("created_at", \{ ascending: false/);

assert.match(home, /getRecentPublishedGematria/);
assert.match(home, /גימטריות אחרונות שנוספו/);
assert.match(home, /\/number\/\$\{encodeURIComponent\(row\.ragil\)\}/);
assert.match(home, /row\.phrase/);
assert.match(home, /row\.ragil/);

console.log("Legacy Home recent gematria projection: PASS");
