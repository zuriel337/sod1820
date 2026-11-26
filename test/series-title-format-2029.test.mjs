// Series title format — ZURIEL 25.11.2026: "<content title> | מה קורה הבורא", like "… | מימד חמש".
import assert from "node:assert/strict";
import { seriesContentTitle, seriesTitle, seriesTitleViolation, SERIES_TITLE_FORMATS } from "../src/lib/research/contentSeriesTitle2029.js";
import { preflightPost } from "../supabase/functions/_shared/postPublishPreflight.js";

const K = "mah-kore-habora";
const alon = (title, extra = {}) => ({ title, author: "אלון לוי", tags: ["מה קורה הבורא"], categories: [], ...extra });

// 1. The old shape is rewritten: label prefix and writer segment removed, series name at the end.
assert.equal(
  seriesTitle("מה קורה הבורא — פלישת חיות הבר: צבוע במודיעין | אלון לוי", K),
  "פלישת חיות הבר: צבוע במודיעין | מה קורה הבורא",
);
assert.equal(seriesTitle("מלי וליאל יהלומי — הקוד הנסתר | אלון לוי", K), "מלי וליאל יהלומי — הקוד הנסתר | מה קורה הבורא", "an inner — dash is content");
assert.equal(seriesTitle("מכתב אהבה מהבורא | אלון לוי · 78 = מחל", K), "מכתב אהבה מהבורא · 78 = מחל | מה קורה הבורא");
assert.equal(seriesTitle("צרפת ונבואת עובדיה | מה קורה הבורא", K), "צרפת ונבואת עובדיה | מה קורה הבורא", "idempotent");
assert.equal(seriesContentTitle("מה קורה הבורא: צרפת | מה קורה הבורא", K), "צרפת");

// 2. Violation: only series Posts, only a wrong title.
assert.equal(seriesTitleViolation(alon("צרפת, 17 באוקטובר ונבואת עובדיה | מה קורה הבורא")), null);
assert.deepEqual(seriesTitleViolation(alon("מה קורה הבורא — צרפת | אלון לוי")), { seriesKey: K, title: "מה קורה הבורא — צרפת | אלון לוי", expected: "צרפת | מה קורה הבורא" });
assert.ok(seriesTitleViolation(alon("צרפת | אלון לוי", { tags: [] })), "every Post of the exact author is in the series, with or without the tag");
assert.equal(seriesTitleViolation({ title: "מה קורה הבורא — משהו", author: "מישהו אחר", tags: [], categories: [] }), null, "not a series Post");
assert.equal(seriesTitleViolation({ title: "כדור הארץ מתפצל | מימד חמש", author: "בדרך לנצח", tags: [], categories: ["מימד חמש"] }), null, "no rule for other series");
assert.deepEqual(Object.keys(SERIES_TITLE_FORMATS), [K], "a new series title rule is a ZURIEL decision");

// 3. The publishing preflight blocks the old shape and accepts the new one.
const run = (title) => preflightPost({
  supabaseUrl: "https://example.supabase.co",
  intent: { kind: "text", title, slug: "s", content: "<p>x</p>", categories: [], tags: ["מה קורה הבורא"], author: "אלון לוי", release_authorized: true, release_authorization_state: "ZURIEL_HUMAN_GATE_RELEASE" },
  facts: { taxonomy: { categories: new Set(), tags: new Set(["מה קורה הבורא"]) }, existing_slugs: new Set() },
});
const bad = run("מה קורה הבורא — פלישת חיות הבר | אלון לוי");
assert.equal(bad.state, "BLOCKED");
assert.ok(bad.blockers.some((b) => b.code === "SERIES_TITLE_FORMAT" && b.detail.includes("«פלישת חיות הבר | מה קורה הבורא»")), JSON.stringify(bad.blockers));
assert.equal(run("פלישת חיות הבר | מה קורה הבורא").state, "READY");

console.log("series-title-format-2029: ok");
