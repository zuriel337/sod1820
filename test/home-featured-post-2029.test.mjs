import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { HOME_FEATURED_POST_2029, projectHomeFeaturedPost } from "../src/lib/research/homeFeaturedPost2029.js";

// ZURIEL 8.11.2026: one existing Post first on Home, linked to its own address, the tree note beneath it, the on-screen numbers labelled.
const row = (extra = {}) => ({ id: 5107, slug: "sharshar-elections-redemption-hints-draft", title: "הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר", image_url: "https://x.test/p.jpg", thumb_url: "https://x.test/t.jpg", tags: [], categories: ["בחירות"], home_hidden: false, source: "sod1820", wp_id: 5107, ...extra });

test("the card links to the existing Post itself (no copy), with the exact approved note and the on-screen numbers", () => {
  const card = projectHomeFeaturedPost(row());
  assert.equal(card.id, 5107); assert.match(card.href, /sharshar-elections-redemption-hints-draft/); assert.equal(card.poster, "https://x.test/t.jpg");
  assert.equal(card.note, "הבורא מדבר דרך כל המציאות. התיעוד הזה הוא חלק מעץ המציאות שנבנה בימים אלה — מערכת המחברת בין אירועים, מקורות, מספרים ורמזים. החיבורים המוצגים כאן הם חלק מתהליך הגילוי והם עשויים להתפתח ככל שיתגלו עוד חיבורים. זה רק חלק — היכנסו לפוסט לראות.");
  assert.deepEqual(HOME_FEATURED_POST_2029.numbers.map(item => item.value), ["14", "1,437", "140", "396", "78", "6:18", "14"]);
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
  assert.match(css, /\.h29-featured\.h29-skel \{ min-height: 544px; \}/, "height reserved while loading");
});

test("the whole message is ONE feed item for 'עכשיו': same post:<id> identity, headline + note + numbers + connections + interpretation as one body", async () => {
  const { featuredFeedItem, featuredBodyText } = await import("../src/lib/research/homeFeaturedPost2029.js");
  const { postRowToWorldUpdate } = await import("../src/lib/research/worldDiscoveryStream.js");
  const { mergeSystemFeedItems } = await import("../src/lib/systemFeed2029.js");
  const { nowModels } = await import("../src/lib/nowPublications2029.js");
  const { feedRows } = await import("../src/lib/systemFeed2029.js");
  const item = featuredFeedItem(row({ date: "2026-09-30T08:55:00Z", excerpt: "תקציר ישן" }), postRowToWorldUpdate);
  assert.equal(item.id, "post:5107"); assert.equal(item.label, HOME_FEATURED_POST_2029.headline);
  for (const part of ["הבורא מדבר דרך כל המציאות", "התיעוד הזה הוא חלק מעץ המציאות", "המסר:", "46 הוא היפוך של 64, דין", "מה שנראה דין מתגלה כרחמים", "סוד הבינה, 67", "1,437 (לייקים)", "618 = משיח צדקינו", "396 = הישועה = דויד בן ישי", "78 = מחל", "64 = דין", "פ״ז", "שרשר = 1000"]) assert.ok(item.fullText.includes(part), part);
  assert.equal(item.at, "2026-11-08T04:18:00.000Z");
  assert.equal(featuredFeedItem(row({ home_hidden: true }), postRowToWorldUpdate), null);
  // The stream's own item for the same Post can never make a second row: ours is listed first and wins.
  const streamItem = postRowToWorldUpdate(row({ date: "2026-11-07T00:00:00Z" }));
  const merged = mergeSystemFeedItems([item], [streamItem]);
  assert.equal(merged.length, 1); assert.equal(merged[0].label, HOME_FEATURED_POST_2029.headline);
  const [model] = nowModels(feedRows(merged, { now: Date.parse("2026-11-08T12:00:00Z"), limit: 10 }));
  assert.equal(model.title.startsWith("ממשלת אייזנקוט"), true); assert.ok(model.fullText.includes("חיבורים במספרים"));
  assert.ok(!featuredBodyText().includes("608"), "only what 618 is, not the other spelling");
  assert.equal(featuredBodyText().split("\n").length, 5);
});

test("language (public_language_revelation_geula_law): discovery/hint voice, no research voice, the owner's framing kept as framing; the video sits where earlier post videos live", async () => {
  const { existsSync } = await import("node:fs");
  const all = [HOME_FEATURED_POST_2029.note, HOME_FEATURED_POST_2029.messageTitle, ...HOME_FEATURED_POST_2029.message, HOME_FEATURED_POST_2029.connectionsTitle, HOME_FEATURED_POST_2029.connectionsFootnote, HOME_FEATURED_POST_2029.numbersTitle].join(" ");
  assert.doesNotMatch(all, /מחקר|ממצא/, "'מחקר' is not the public default voice");
  assert.match(HOME_FEATURED_POST_2029.message[0], /כביכול.*כביכול/, "the bloc numbers are the owner's framing, not stated as fact");
  assert.ok(HOME_FEATURED_POST_2029.message.some(line => line.includes("46") && line.includes("64") && line.includes("67")));
  assert.doesNotMatch(all, /הוכיח|ודאי|בוודאות|המשיח הוא/, "no certainty, no messianic identification of a person");
  for (const path of [HOME_FEATURED_POST_2029.video.src, HOME_FEATURED_POST_2029.video.poster]) assert.ok(existsSync(new URL("../public" + path, import.meta.url)), path);
});

test("the latest-ciphers area is hidden by a switch (code and tests kept) until ZURIEL handles it", async () => {
  const { HOME_SECTIONS_2029 } = await import("../src/lib/research/homeSections2029.js");
  assert.equal(HOME_SECTIONS_2029.ciphers, false);
  const home = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
  assert.match(home, /\{HOME_SECTIONS_2029\.ciphers \? <Section label="הצפנים האחרונים בתורה">/);
});

test("no single stray numbers, and Home shows words only: the numbers live inside the Post (the feed body keeps them)", async () => {
  assert.ok(!HOME_FEATURED_POST_2029.numbers.some(item => item.value === "6"), "the lone '6' (friends badge) was removed at the owner's request");
  const home = await readFile(new URL("../src/components/experience2029/HomeFeaturedPost2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(home, /post\.numbers|post\.connections/, "the Home card renders no number strip and no connections");
  assert.match(home, /data-home-featured-note="true"/);
  assert.equal((HOME_FEATURED_POST_2029.note.match(/בבנייה|נבנה/g) || []).length, 1, "'under construction' is said once, not twice");
  assert.match(HOME_FEATURED_POST_2029.note, /^הבורא מדבר דרך כל המציאות\./); assert.match(HOME_FEATURED_POST_2029.note, /רק חלק/);
  assert.doesNotMatch(home, /bridge/, "no second line");
});
