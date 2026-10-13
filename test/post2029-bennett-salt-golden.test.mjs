import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { post2029ReadingInternals } from "../src/lib/research/post2029ReadingProjection.js";

test("Bennett salt Golden reuses existing tree identities", () => {
  const { BENNETT_SALT_SLUG, BENNETT_SALT_REGIONS, buildBennettSaltExperience, buildBennettGoldenBody } = post2029ReadingInternals;
  assert.equal(BENNETT_SALT_SLUG, "bennett-melach-631-78");
  assert.equal(BENNETT_SALT_REGIONS.length, 7);
  const experience = buildBennettSaltExperience({ date: "2026-10-01T00:00:00.000Z" });
  assert.equal(experience.connections.find((row) => row.id === "bennett-631")?.href, "/post/sharshar-elections-redemption-hints-draft");
  assert.equal(experience.connections.find((row) => row.id === "dead-sea-133")?.href, "/post/yam-hamelach-tiferet-geula");
  assert.equal(experience.timeline.find((row) => row.id === "bennett-salt-event")?.temporalRole, "occurred");
  assert.equal(experience.trail.length, 3);
  assert.equal(experience.media.fullSource.href.includes("mako.co.il"), true);
  assert.deepEqual(experience.trail.map((row) => row.label), ["פוסט הבחירות", "631", "בנט"]);
  const body = buildBennettGoldenBody({ verified: true });
  assert.match(body, /נפתלי בנט/);
  assert.match(body, /הבחירות/);
  assert.match(body, /מלך ישראל/);
  assert.match(body, /24\.9\.2026/);
  assert.doesNotMatch(body, /sod29-gematria-hero/);
  assert.equal((body.match(/data-focus-part="expression"/g) || []).length, 3);
  assert.equal((body.match(/data-focus-part="result"/g) || []).length, 3);
  const visible = body.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /מלח = 78|ברית מלח|לחם|78|ים המלח|Golden|POST|SOD1820|debug/i);
});

test("Bennett salt exact slug redirects to Post 2029", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const match = (config.redirects || []).find((row) => row.source === "/bennett-melach-631-78");
  assert.ok(match);
  assert.equal(match.destination, "/post/bennett-melach-631-78");
  assert.equal(match.permanent, true);
});

test("the full authored Bennett source remains available without certifying its saved result attributes", () => {
  const original = '<p class="sod29-gematria-line">מלח = <button data-contextual-number-focus="true" data-expression="מלח" data-method="רגיל" data-result="78">78</button></p><a href="https://example.com/source">מקור מלא</a>';
  const html = post2029ReadingInternals.buildBennettGoldenBody({ verified: false }, original);
  assert.match(html, /<details class="sod29-original-post">/);
  assert.match(html, /class="sod29-gematria-expression" data-gem="מלח">מלח<\/button>/);
  assert.match(html, /data-method="רגיל"[^>]*data-gem="מלח">78<\/button>/);
  assert.doesNotMatch(html, /data-contextual-number-focus="true"/);
  assert.match(html, /<a href="https:\/\/example.com\/source">מקור מלא<\/a>/);
});


test("Bennett Post Master v2 keeps story hierarchy and shared chrome", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/pages/post2029-reading.css", import.meta.url), "utf8");
  assert.match(page, /isBennettMaster\s*\?\s*\[631\]/);
  assert.match(page, /data-post-slug=\{post\.slug\}/);
  assert.match(page, /<PostTimeline2029 items=\{visibleTimeline\}/);
  assert.match(page, /status="פוסט"/);
  assert.match(css, /\.sod29-gematria-value/);
  assert.match(css, /\.sod29-gematria-line/);
  assert.match(css, /--s29-island-clearance/);
});


test("Bennett public Golden: media-first, secondary findings in sidecar, chain trail, no internal labels", async () => {
  const { buildBennettSaltExperience, buildBennettGoldenBody } = post2029ReadingInternals;
  const { projectPost2029Experience } = await import("../src/lib/research/post2029ExperienceProjection.js");
  const exp = projectPost2029Experience({ _experience: buildBennettSaltExperience({}) });
  assert.equal(exp.media.sourceCard.outlet, "N12");
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.ok(page.indexOf("<PostEvidenceMedia2029") < page.indexOf('className="sod29-reading-source"'));
  assert.match(page, /surfaceFindings/);
  const secondary = exp.connections.filter((c) => c.id !== "bennett-631").map((c) => c.id);
  for (const id of ["salt-78", "dead-sea-133", "brit-melach-690"]) assert.ok(secondary.includes(id));
  assert.equal(secondary.includes("bread-78"), false);
  assert.deepEqual(exp.trail.map((t) => t.label), ["פוסט הבחירות", "631", "בנט"]);
  assert.equal(exp.trail.at(-1).active, true);
  const body = buildBennettGoldenBody({ verified: true });
  assert.doesNotMatch(body, /sod29-bennett-time-bridge|is-chain|is-chronology/);
  const { projectionLabel } = { projectionLabel: readFileSync(new URL("../src/lib/research/post2029ReadingProjection.js", import.meta.url), "utf8") };
  assert.doesNotMatch(projectionLabel, /Golden 2029/);
});

test("the saved Bennett story keeps source order: Dead Sea, incident, covenant/David, salt = 78 with the state age, then 631", () => {
  const source = `<section dir="rtl"><section id="bennett-dead-sea-sequence"><h2 id="bennett-sequence-title">יומיים אחרי ים המלח — המלח מופיע שוב</h2><p>x</p></section>
<section class="sod29-bennet-section is-centered"><h2>האירוע</h2><p>e</p></section>
<section class="sod29-bennet-section is-centered"><h2 data-source-heading="true">הרמז המרכזי — מלח</h2><button data-contextual-number-focus="true" data-expression="מלח" data-result="78">78</button></section>
<section id="bennett-israel-78"><h2 id="bennett-israel-78-title">מלח = 78 — וישראל בת 78</h2><p>y</p></section>
<section class="sod29-bennet-section"><h2 data-source-heading="true">ברית מלח</h2><blockquote>פסוק</blockquote></section>
<section class="sod29-bennet-section is-centered"><h2 data-source-heading="true">בנט בתוך עץ הבחירות</h2></section></section>`;
  const html = post2029ReadingInternals.markBennettStory(source);
  const at = (text) => html.indexOf(text);
  assert.ok(at("יומיים אחרי ים המלח") < at(">האירוע<") && at(">האירוע<") < at(">ברית מלח<") && at(">ברית מלח<") < at("הרמז המרכזי — מלח"));
  assert.ok(at("הרמז המרכזי — מלח") < at("וישראל בת 78") && at("וישראל בת 78") < at("בנט בתוך עץ הבחירות"));
  assert.match(html, /<h2 data-source-heading="true" id="bennett-israel-78-title">|<h2 data-source-heading="true"[^>]*>\s*מלח = 78 — וישראל בת 78/);
  assert.doesNotMatch(html, /data-contextual-number-focus/);
  assert.match(html, /data-gem="מלח"/);
  assert.equal((html.match(/פסוק/g) || []).length, 1);
  assert.equal(post2029ReadingInternals.markBennettStory(html), html);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), /לחם/);
});

test("only engine-verified saved equalities keep the contextual focus interaction", () => {
  const source = '<section><p><button type="button" data-contextual-number-focus="true" data-expression="נפתלי בנט" data-result="631">631</button> <button type="button" data-contextual-number-focus="true" data-expression="מלח" data-result="79">79</button></p></section>';
  const html = post2029ReadingInternals.markBennettStory(source, new Set(["נפתלי בנט|631"]));
  assert.match(html, /data-contextual-number-focus="true"[^>]*data-expression="נפתלי בנט"/);
  assert.match(html, /data-expression="מלח"[^>]*data-gem="מלח"/);
  assert.equal((html.match(/data-contextual-number-focus/g) || []).length, 1);
});
