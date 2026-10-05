import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { post2029ReadingInternals } from "../src/lib/research/post2029ReadingProjection.js";

test("Bennett salt Golden reuses existing tree identities", () => {
  const { BENNETT_SALT_SLUG, BENNETT_SALT_REGIONS, buildBennettSaltExperience, buildBennettGoldenBody } = post2029ReadingInternals;
  assert.equal(BENNETT_SALT_SLUG, "bennett-melach-631-78");
  assert.equal(BENNETT_SALT_REGIONS.length, 3);
  const experience = buildBennettSaltExperience({ date: "2026-10-01T00:00:00.000Z" });
  assert.equal(experience.connections.find((row) => row.id === "bennett-631")?.href, "/sharshar-elections-redemption-hints-draft");
  assert.equal(experience.connections.find((row) => row.id === "dead-sea-133")?.href, "/yam-hamelach-tiferet-geula");
  assert.equal(experience.timeline.find((row) => row.id === "bennett-salt-event")?.temporalRole, "occurred");
  assert.equal(experience.trail.length, 3);
  assert.equal(experience.media.fullSource.href.includes("mako.co.il"), true);
  assert.deepEqual(experience.trail.map((row) => row.label), ["פוסט הבחירות", "631", "בנט"]);
  const body = buildBennettGoldenBody({ verified: true });
  assert.match(body, /נפתלי בנט/);
  assert.match(body, /הבחירות/);
  assert.match(body, /מלך ישראל/);
  assert.match(body, /22\.9\.2026/);
  assert.match(body, /24\.9\.2026/);
  assert.doesNotMatch(body, /מלח = 78|ברית מלח =|לחם =/);
});

test("Bennett salt exact slug redirects to Post 2029", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const match = (config.redirects || []).find((row) => row.source === "/bennett-melach-631-78");
  assert.ok(match);
  assert.equal(match.destination, "/post/bennett-melach-631-78");
  assert.equal(match.permanent, true);
});


test("Bennett Post Master v2 keeps story hierarchy and shared chrome", () => {
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/pages/post2029-reading.css", import.meta.url), "utf8");
  assert.match(page, /isBennettMaster\s*\?\s*\[631\]/));
  assert.match(page, /data-post-slug=\{post\.slug\}/);
  assert.match(page, /<PostTimeline2029 items=\{visibleTimeline\}/);
  assert.match(page, /status="פוסט"/);
  assert.match(css, /\.sod29-gematria-value/);
  assert.match(css, /\.sod29-gematria-line/);
  assert.match(css, /--s29-island-clearance/);
});
