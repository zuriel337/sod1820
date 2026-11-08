import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HOME_FEATURED_POST_2029, projectHomeFeaturedPost } from "../src/lib/research/homeFeaturedPost2029.js";

// ZURIEL 8.11.2026: one existing Post first on Home, linked to its own address, the tree note beneath it, the on-screen numbers labelled.
const row = (extra = {}) => ({ id: 5107, slug: "sharshar-elections-redemption-hints-draft", title: "הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר", image_url: "https://x.test/p.jpg", thumb_url: "https://x.test/t.jpg", tags: [], categories: ["בחירות"], home_hidden: false, source: "sod1820", wp_id: 5107, ...extra });

test("the card links to the existing Post itself (no copy), with the exact approved note and the on-screen numbers", () => {
  const card = projectHomeFeaturedPost(row());
  assert.equal(card.id, 5107); assert.match(card.href, /sharshar-elections-redemption-hints-draft/); assert.equal(card.poster, "https://x.test/t.jpg");
  assert.equal(card.note, "התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך המחקר והם עשויים להתפתח ככל שיתווספו ממצאים.");
  assert.deepEqual(HOME_FEATURED_POST_2029.numbers.map(item => item.value), ["14", "1,437", "140", "396", "78", "6", "6:18", "14"]);
  assert.ok(HOME_FEATURED_POST_2029.numbers.every(item => item.label), "every number says what it is");
});

test("a different, hidden or suppressed Post is never featured; nothing is invented", () => {
  assert.equal(projectHomeFeaturedPost(row({ id: 5108 })), null);
  assert.equal(projectHomeFeaturedPost(row({ home_hidden: true })), null);
  assert.equal(projectHomeFeaturedPost(row({ tags: ["טיוטה"] })), null);
  assert.equal(projectHomeFeaturedPost(row({ slug: null })), null);
  assert.equal(projectHomeFeaturedPost(row({ title: "  " })), null);
  assert.equal(projectHomeFeaturedPost(null), null);
});

test("Home: the featured card is the first area (before the ELS entry); its Post is excluded from the strips so it appears once", async () => {
  const home = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
  const body = home.slice(home.indexOf('data-experience-capability="home-composition"'));
  assert.ok(body.indexOf("<HomeFeaturedPost2029") > 0 && body.indexOf("<HomeFeaturedPost2029") < body.indexOf("elsEntry ? <Reveal"));
  assert.match(home, /featured\.post\?\.href,/); assert.match(home, /featured\.post\?\.slug,/);
  const css = await readFile(new URL("../src/components/experience2029/homeComposition2029.css", import.meta.url), "utf8");
  assert.match(css, /\.h29-featured\.h29-skel \{ min-height: 381px; \}/, "height reserved while loading");
});
