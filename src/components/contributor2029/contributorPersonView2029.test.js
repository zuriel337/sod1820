import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { publicContributorPerson2029 } from "./publicContributorPerson2029.js";
import { contributorPersonView2029, initialsOf } from "./contributorPersonView2029.js";

const coverage = (count) => ({ count, complete: true, availability: "ok" });
const generic = () => ({ canonicalHref: "/community/researcher/2042", profile: { name: "שם ציבורי", avatar: null, role: "חוקר" },
  items: [{ type: "findings", id: "candidate" }], publicationCoverage: { posts: coverage(7), ciphers: { count: 6, complete: false, availability: "ok" }, contributions: coverage(32) } });
const view = (kind, options = {}) => contributorPersonView2029(publicContributorPerson2029(generic(), { kind, ...options.projection }), { name: "שם ציבורי", ...options.view });

test("language follows canonical capability: community, writer, researcher; no invented labels", () => {
  assert.deepEqual(view("community").labels, ["חבר קהילה"]);
  assert.deepEqual(view("contributor").labels, ["חבר קהילה"]);
  assert.deepEqual(view("author").labels, ["כותב"]);
  assert.deepEqual(view("writer").labels, ["כותב"]);
  assert.deepEqual(view("researcher").labels, ["חוקר"]);
  assert.equal(view("community").mode, "community");
  assert.deepEqual([view("community"), view("author"), view("researcher")].map((person) => person.aboutLabel), ["על האדם", "על הכותב", "על החוקר"]);
  assert.equal(view("author").mode, "writer");
  assert.equal(view("researcher").mode, "researcher");
  assert.match(view("community").boundary, /^מה שהאדם כתב והעלה/);
  assert.equal(view("author").eyebrow, "כותב");
  assert.equal(view(null).labels[0], "חבר קהילה", "unknown kind gets no capability");
});

test("only measured values are shown, as exact numbers, with a Hebrew scope and source", () => {
  const person = view("author");
  const items = person.measured.flatMap((group) => group.items);
  assert.deepEqual(items.map((item) => [item.key, item.value]), [["contributionRows", 32], ["publications", 7]]);
  assert.ok(items.every((item) => item.explain && item.source && /[א-ת]/.test(item.explain)));
  assert.ok(!JSON.stringify(person.measured).includes("not_measured"));
  assert.deepEqual(person.summary.map((item) => item.key), ["contributionRows", "publications"]);
});

test("unmeasured stays separate, with a reason, and is never zero", () => {
  const person = view("author");
  const keys = person.unmeasured.map((item) => item.key);
  for (const expected of ["activity.activeDays", "tenure.tenureDays", "communityImpact.likesReceived", "contribution.cipherRecords", "humanCuration"]) assert.ok(keys.includes(expected), expected);
  assert.ok(person.unmeasured.every((item) => /[א-ת]/.test(item.reason)));
  assert.ok(!person.measured.flatMap((group) => group.items).some((item) => item.key === "activeDays" || item.key === "tenureDays"));
  assert.equal(JSON.stringify(person).includes('"value":0'), false);
});

test("a measured zero is kept, an unmeasured family is not", () => {
  const source = generic(); source.publicationCoverage.posts = coverage(0);
  const person = contributorPersonView2029(publicContributorPerson2029(source, { kind: "author" }), { name: "א" });
  const publications = person.measured.flatMap((group) => group.items).find((item) => item.key === "publications");
  assert.equal(publications.value, 0);
  assert.equal(publications.valueText, "0");
  assert.ok(!person.unmeasured.some((item) => item.key === "publication.publications"));
  assert.ok(!person.summary.some((item) => item.key === "publications"), "the compact strip omits zero; the panel keeps the measured zero");
});

test("research standing: not applicable for a community member, unmeasured for a researcher, and a level only from the adapter", () => {
  assert.ok(!view("community").unmeasured.some((item) => item.key === "researchStanding"), "community member is not called a researcher");
  assert.equal(view("community").standing, null);
  const researcher = view("researcher");
  assert.ok(researcher.unmeasured.some((item) => item.key === "researchStanding"));
  assert.equal(researcher.standing, null, "no level is invented");
  // Legacy rank, XP, role text and rank previews cannot create a standing or a label.
  const projection = publicContributorPerson2029({ ...generic(), rankPreview: { state: "ready", level: 5, label: "חוקר היכל" } }, { kind: "author" });
  const person = contributorPersonView2029({ ...projection, xp: 9000, level: 5 }, { name: "א" });
  assert.equal(person.standing, null);
  assert.ok(!JSON.stringify(person).includes("חוקר היכל"));
  // A level supplied by an authorized evidence adapter for a researcher is passed through, untouched.
  const authorized = publicContributorPerson2029(generic(), { kind: "researcher" });
  authorized.axes.find((axis) => axis.key === "researchStanding").level = "R3";
  assert.deepEqual(contributorPersonView2029(authorized, { name: "א" }).standing, { level: "R3" });
  // ...but never for someone without the researcher capability.
  const notResearcher = publicContributorPerson2029(generic(), { kind: "author" });
  notResearcher.axes.find((axis) => axis.key === "researchStanding").level = "R3";
  assert.equal(contributorPersonView2029(notResearcher, { name: "א" }).standing, null);
});

test("account registration is labelled as registration, not as community tenure", () => {
  const joined = "2026-06-17T05:53:18.284Z";
  const person = view("author", { view: { overview: { state: "ready", joinedAt: joined } } });
  assert.equal(person.registeredAt, joined);
  assert.match(person.registrationNote, /אינה ותק בקהילה/);
  assert.ok(person.unmeasured.some((item) => item.key === "tenure.tenureDays"), "historical tenure stays unmeasured");
  assert.equal(view("author").registeredAt, null);
  assert.equal(view("author", { view: { overview: { state: "loading" } } }).registeredAt, null);
});

test("the unresolved Person binding is stated and is not shown as a completed identity merge", () => {
  assert.match(view("author").binding, /טרם הושלם|עדיין לא הושלם/);
  const projection = publicContributorPerson2029(generic(), { kind: "author" });
  assert.equal(contributorPersonView2029({ ...projection, personBinding: "resolved" }, { name: "א" }).binding, "");
});

test("public writing days explain their scope and never call public activity a private login", () => {
  const projection = publicContributorPerson2029(generic(), { kind: "author" });
  const activity = projection.axes.find((axis) => axis.key === "activity");
  activity.measures.activeDays = { state: "measured", value: 2, source: "public_community_author_summary" };
  activity.lastPublicActivityAt = "2026-10-25T20:00:00Z";
  const person = contributorPersonView2029(projection);
  const item = person.measured.flatMap((group) => group.items).find((measure) => measure.key === "activeDays");
  assert.equal(item.label, "ימי כתיבה ציבורית");
  assert.equal(item.value, 2);
  assert.match(item.explain, /לפי שעון ישראל/);
  assert.match(item.explain, /פעילות ציבורית אחרונה:/);
  assert.match(item.explain, /אינו מועד החיבור האחרון/);
  assert.ok(person.unmeasured.some((measure) => measure.key === "tenure.tenureDays"));
});

test("the presentation model has no rank, score, percentage or threshold vocabulary", () => {
  const code = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, "");
  const source = code("./contributorPersonView2029.js") + code("./ContributorPersonMedallion2029.jsx");
  assert.doesNotMatch(source, /research_level_of|rankPreview|fetchPublicContributorRank|xp\b|percent|threshold|score\s*[:=]/i);
  assert.doesNotMatch(source, /מתוך <bdi className="pc-number">5/, "the legacy five-level display is gone");
  assert.equal(contributorPersonView2029(null), null);
  assert.equal(contributorPersonView2029({}), null);
});

test("initials are one or two letters, ignoring parenthetical text and non-letters", () => {
  assert.equal(initialsOf("יניב לוי"), "יל");
  assert.equal(initialsOf("אריאל בן משה"), "אמ");
  assert.equal(initialsOf("צבי (OPOC)"), "צ");
  assert.equal(initialsOf("Johel TV"), "JT");
  assert.equal(initialsOf("  "), "✦");
  assert.equal(initialsOf(null), "✦");
  assert.equal(initialsOf("123 !!"), "✦");
});
