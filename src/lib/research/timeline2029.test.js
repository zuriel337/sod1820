// node --test src/lib/research/timeline2029.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIMELINE_PUBLIC_LABEL, TIMELINE_CURRENT_LABEL, formatBilingualDate, formatGregorianDate,
  buildPublicTimeline, publicSourceLabel, numberTimelineToRows, hebrewDayNumeral, normalizeNumberTimelineTitle,
} from "./timeline2029.js";
import { projectPost2029Experience } from "./post2029ExperienceProjection.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("shared public name is exactly ציר הזמן and discovery naming is gone", () => {
  assert.equal(TIMELINE_PUBLIC_LABEL, "ציר הזמן");
  const post = read("../../components/experience2029/PostTimeline2029.jsx");
  const num = read("../../components/number2029/NumberLivingWorld2029.jsx");
  assert.ok(post.includes("TIMELINE_PUBLIC_LABEL") || post.includes("Timeline2029"));
  assert.ok(!num.includes("ציר הגילוי"));
  assert.ok(!post.includes("ציר הגילוי"));
  assert.ok(!num.includes("ציר ההתגלות"));
});

test("reverse chronology (newest first)", () => {
  const rows = buildPublicTimeline([
    { id: "a", date: "2026-09-22", temporalRole: "published" },
    { id: "c", date: "2026-10-01", temporalRole: "published" },
    { id: "b", date: "2026-09-24", temporalRole: "occurred" },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["c", "b", "a"]);
});

test("bilingual date: Hebrew + DD.MM.YYYY", () => {
  const d = formatBilingualDate("2026-10-01");
  assert.equal(d.gregorian, "01.10.2026");
  assert.match(d.hebrew, /תשרי/);
  assert.equal(formatGregorianDate("2026-09-24T23:30:00Z"), "24.09.2026");
  assert.equal(formatBilingualDate("not-a-date"), null);
  assert.ok(read("../../components/experience2029/Timeline2029.jsx").includes('dir="ltr"'));
});

test("current marker", () => {
  const rows = buildPublicTimeline(
    [{ id: "x", date: "2026-10-01", href: "/post/p" }, { id: "y", date: "2026-09-01", href: "/post/q" }],
    { currentHref: "/post/p" },
  );
  assert.equal(rows[0].isCurrent, true);
  assert.equal(rows[1].isCurrent, false);
  assert.equal(TIMELINE_CURRENT_LABEL, "אתה נמצא כאן");
});

test("internal source labels are not public", () => {
  assert.equal(publicSourceLabel("POST"), null);
  assert.equal(publicSourceLabel("SOD1820"), null);
  assert.equal(publicSourceLabel("N12 / TOI"), "N12 · TOI");
});

test("Bennett timeline: current row marked, no internal labels, newest first", () => {
  const src = read("./post2029ReadingProjection.js");
  assert.ok(!/sourceLabel: "(POST|SOD1820)"/.test(src));
  const exp = projectPost2029Experience({ _experience: { timeline: [
    { id: "a", label: "A", date: "2026-09-22", temporalRole: "published", sourceLabel: "POST" },
    { id: "b", label: "B", date: "2026-10-01", temporalRole: "published", current: true },
  ] } });
  const rows = buildPublicTimeline(exp.timeline);
  assert.deepEqual(rows.map((r) => r.id), ["b", "a"]);
  assert.equal(rows.filter((r) => r.isCurrent).length, 1);
  assert.equal(rows[0].isCurrent, true);
  assert.equal(rows[1].sourceLabel, null);
});

test("Number and Post share one component, format, and role semantics", () => {
  const rows = numberTimelineToRows(
    [{ id: "1", at: "2026-08-01T10:00:00Z", label: "A" }, { id: "2", at: "2026-09-01T10:00:00Z", label: "B" }],
  );
  assert.deepEqual(rows.map((r) => r.id), ["2", "1"]);
  assert.equal(rows[0].temporalRole, "admitted");
  assert.equal(rows[0].dates.gregorian, "01.09.2026");
  assert.ok(read("../../components/number2029/NumberLivingWorld2029.jsx").includes("Timeline2029"));
  assert.ok(read("../../components/experience2029/PostTimeline2029.jsx").includes("Timeline2029"));
});

test("shared Hebrew day formatter: gematria day + month, DD.MM.YYYY alongside", () => {
  assert.equal(hebrewDayNumeral(26), "כ״ו");
  assert.equal(hebrewDayNumeral(15), "ט״ו");
  assert.equal(hebrewDayNumeral(16), "ט״ז");
  assert.equal(hebrewDayNumeral(30), "ל׳");
  assert.equal(hebrewDayNumeral(1), "א׳");
  const d = formatBilingualDate("2026-09-08");
  assert.equal(d.hebrew, "כ״ו באלול");
  assert.equal(d.gregorian, "08.09.2026");
});

test("Number rows: technical labels normalized at projection, no plumbing note", () => {
  assert.equal(normalizeNumberTimelineTitle("research-object candidate"), "פריט במחקר");
  assert.equal(normalizeNumberTimelineTitle("FAMILY / SYSTEM-METHOD"), "פריט במחקר");
  assert.equal(normalizeNumberTimelineTitle("nodes:abc_123"), "פריט במחקר");
  assert.equal(normalizeNumberTimelineTitle("  פרשת  כי תבוא "), "פרשת כי תבוא");
  const rows = numberTimelineToRows([{ id: "1", at: "2026-09-08", label: "Engine facts" }]);
  assert.equal(rows[0].label, "פריט במחקר");
  assert.equal(rows[0].note, null);
  const num = read("../../components/number2029/NumberLivingWorld2029.jsx");
  assert.ok(!/note: \[canonicalFindingKindPublicLabel/.test(num));
  assert.ok(read("../../components/experience2029/Timeline2029.jsx").includes("timeline2029.css"));
});
