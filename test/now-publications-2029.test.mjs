import test from "node:test";
import assert from "node:assert/strict";
import { cleanNowText, shortNowTitle, nowRowModel, nowModels, availableNowLenses, defaultNowLens, collapseSourceRuns, latestRunAt, buildNowEntries, isRabbiBoxModel, nowTodayBand, nowLensCounts, nowExcerpt, nowSecondaryChoices, filterNowModels, nowSeriesHref, nowSeriesLabel, nowSourceChoices, filterNowBySource, nowPinnedMessage, nowPinUntilLabel } from "../src/lib/nowPublications2029.js";
import { feedRows, mergeSystemFeedItems } from "../src/lib/systemFeed2029.js";
import { redactGroupText, groupRowToWorldUpdate } from "../src/lib/research/worldGroupSource.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { approvedSeriesToSystemItem, publicChannelToSystemItem, seriesCatalogToSystemItems } from "../src/lib/research/systemFeedPublicSources2029.js";

const MP4 = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/clip.mp4";
const post = (id, o = {}) => ({ id, slug: `p${id}`, title: `פוסט ${id}`, excerpt: "", author: "כותב", source: "wordpress", link: null, wp_id: id, categories: [], tags: [], home_hidden: false, date: `2026-11-0${id}T10:00:00Z`, modified: `2026-11-0${id}T10:00:00Z`, created_at: "2026-10-01T00:00:00Z", ...o });
const rows = items => feedRows(items, { now: Date.parse("2026-11-04"), limit: 160, caps: { post: 40, group: 40, gallery: 10, "channel:or-geula": 12, "channel:reality-code": 12 } });

test("raw MP4/storage addresses never reach reading text; titles are short and cut at a word", () => {
  assert.equal(cleanNowText(`צפו ${MP4} עכשיו`), "צפו עכשיו");
  assert.equal(cleanNowText(`${MP4}`), "");
  const long = "מילה ".repeat(60).trim();
  const short = shortNowTitle(long, 40);
  assert.ok(short.length <= 41 && short.endsWith("…") && !/\s…$/.test(short));
  assert.equal(shortNowTitle("שלום https://sod1820.co.il/post/x [קישור] עולם"), "שלום עולם");
  assert.equal(shortNowTitle("שורה ראשונה\nשורה שניה"), "שורה ראשונה");
});

test("public redaction keeps dates and exact public links but still hides phones, e-mail and foreign/credentialed links", () => {
  assert.equal(redactGroupText("ב-03.11.2026 וגם 2026-11-03 וגם 3/11"), "ב-03.11.2026 וגם 2026-11-03 וגם 3/11");
  assert.equal(redactGroupText("ראו https://sod1820.co.il/post/abc."), "ראו https://sod1820.co.il/post/abc.");
  assert.equal(redactGroupText("https://www.youtube.com/watch?v=abc&t=5"), "https://www.youtube.com/watch?v=abc&t=5");
  for (const text of ["https://example.com/x", "https://chat.whatsapp.com/INVITE", "https://sod1820.co.il/x?token=1", "https://user:pw@sod1820.co.il/", "www.sod1820.co.il/x"]) assert.equal(redactGroupText(text), "[קישור]", text);
  assert.equal(redactGroupText("050-123-4567"), "[מספר]");
  assert.equal(redactGroupText("0501234567 ב 3.11.2026"), "[מספר] ב 3.11.2026");
  assert.equal(redactGroupText("+972 50 123 4567"), "[מספר]");
  assert.equal(redactGroupText("a@b.com"), "[דוא״ל]");
  assert.equal(redactGroupText("050-03.11.2026"), "[מספר]", "a phone glued to a date-like tail stays hidden");
});

test("unverified source rows: opening words, source, time, 'מקור · טרם נבדק' and the exact raw source anchor", () => {
  const g = groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: `פתיחה ארוכה מאוד ${"מילה ".repeat(40)}`, created_at: "2026-11-03T08:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
  const [model] = nowModels(rows([g]));
  assert.equal(model.typeLabel, "מקור · טרם נבדק"); assert.equal(model.unverified, true);
  assert.ok(model.title.length <= 85 && model.title.startsWith("פתיחה ארוכה מאוד"));
  assert.deepEqual(model.byline, ["קבוצת מקור", "צבי"], "the group (source) is named; the live reader returns no channel yet, so the neutral label");
  assert.equal(model.href, "/world#group-source-20000000-0000-4000-8000-000000000001");
  assert.ok(model.canExpand && model.fullText.length > model.title.length);
  assert.equal(model.lenses.has("series"), false, "no series/tree attribution is implied");
});

test("series, messages and hints are separate lenses; series is not inferred from author or channel name", () => {
  const items = [
    postRowToWorldUpdate(post(1, { author: "בדרך לנצח", categories: ["מימד חמש", "וידאו"] })),
    postRowToWorldUpdate(post(2, { author: "אלון לוי", tags: ["מה קורה הבורא"] })),
    postRowToWorldUpdate(post(3, { author: "אחר", tags: ["מה קורה הבורא"] })),        // wrong author: not a member
    postRowToWorldUpdate(post(4, { categories: ["סוד החשמל"] })),
    postRowToWorldUpdate(post(5, { categories: ["מסרים"] })),
    postRowToWorldUpdate(post(6, { categories: ["רמזים חזקים"] })),
    postRowToWorldUpdate(post(7, { categories: ["רמזים מצדיקים"] })),
    postRowToWorldUpdate(post(8, { author: "בדרך לנצח" })),                              // author alone is not membership
    publicChannelToSystemItem({ id: "30000000-0000-4000-8000-000000000003", channel: "reality-code", status: "live", page_only: false, created_at: "2026-11-02T10:00:00Z", text: "קוד" }),
    publicChannelToSystemItem({ id: "30000000-0000-4000-8000-000000000002", channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-02T09:00:00Z", text: "אור" }),
  ];
  const models = nowModels(rows(items)); const by = id => models.find(m => m.id === id);
  assert.equal(by("post:1").seriesKey, "dimension-five"); assert.equal(by("post:1").video, true);
  assert.equal(by("post:2").seriesKey, "mah-kore-habora");
  assert.equal(by("post:3").seriesKey, null); assert.equal(by("post:8").seriesKey, null);
  assert.equal(by("post:4").seriesKey, "sod-hashmal");
  assert.equal(by("post:5").seriesKey, null); assert.ok(by("post:5").lenses.has("messages"));
  assert.equal(by("post:7").seriesKey, "messages-from-righteous"); assert.equal(by("post:7").seriesLabel, "מסרים");
  assert.ok(by("post:6").lenses.has("hints")); assert.ok(by("channel:30000000-0000-4000-8000-000000000003").lenses.has("hints"));
  const orGeula = by("channel:30000000-0000-4000-8000-000000000002");
  assert.equal(orGeula.seriesKey, null, "channel name alone never joins a series"); assert.equal(orGeula.lenses.has("messages"), true, "Or HaGeula belongs to the messages path (ZURIEL 5.11.2026), as a lens only");
  assert.deepEqual(availableNowLenses(models).map(l => l.id), ["all", "messages", "reality", "series", "hints"], "all first (the opening lens), then the primary sources → messages → reality, then series/hints");
  // ZURIEL 6.11.2026: the window opens on "all" (time order), whatever lenses have rows; it no longer opens on the first populated primary lens.
  assert.equal(defaultNowLens(models), "all"); assert.equal(defaultNowLens([by("post:8")]), "all"); assert.equal(defaultNowLens([]), "all");
  // Counts are entries already loaded per lens, derived from the same filter the chips apply (never a separate tally).
  const counts = nowLensCounts(models);
  assert.equal(counts.all, models.length);
  for (const lens of availableNowLenses(models)) assert.equal(counts[lens.id], filterNowModels(models, { lens: lens.id }).length, `count matches the filter for ${lens.id}`);
  assert.equal(counts.messages, 3); assert.equal(counts.reality, 1);
  assert.equal(nowLensCounts([]).all, 0); assert.equal(nowLensCounts(null).series, 0);
  assert.equal(filterNowModels(models, { lens: "reality" }).length, 1);
  assert.deepEqual(availableNowLenses([by("post:8")]).map(l => l.id), ["all"], "lenses appear only when they have rows");
  assert.equal(filterNowModels(models, { lens: "messages" }).length, 3);
  assert.equal(filterNowModels(models, { series: "dimension-five" }).length, 1);
  assert.equal(filterNowModels(models, { media: "video" }).length, 1);
  assert.equal(filterNowModels(models, { lens: "hints", source: "קוד המציאות" }).length, 1);
  assert.deepEqual(nowSecondaryChoices(models).series.map(s => s.id).sort(), ["dimension-five", "mah-kore-habora", "messages-from-righteous", "sod-hashmal"]);
  assert.equal(nowSeriesHref(by("post:2")), "/2029/posts?series=mah-kore-habora");
  assert.equal(nowSeriesLabel("messages-from-righteous", "מסרים"), "מסרים");
});

test("'הכול' is chronological newest first, with a stable tie-break", () => {
  const models = nowModels(rows([1, 3, 2].map(id => postRowToWorldUpdate(post(id)))));
  assert.deepEqual(models.map(m => m.id), ["post:3", "post:2", "post:1"]);
});

test("one publication = one row: the approved Or HaGeula video enriches the same channel row (no second notice)", () => {
  const id = "9d4e6b80-f52b-4461-9231-ca30f37f0db9";
  const channel = publicChannelToSystemItem({ id, channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-03T09:49:00Z", text: "מסר מאור הגאולה", image_url: MP4 });
  const approved = approvedSeriesToSystemItem({ sourceRef: `channel_updates:${id}`, kind: "channel_update", title: "מסר מאור הגאולה", excerpt: "מסר מאור הגאולה", channel: "or-geula",
    publishedAt: "2026-11-03T09:49:00Z", mediaUrl: MP4, imageUrl: MP4.replace("clip.mp4", "t.png"), href: "/video/25e378462b55298219e5f7562698bfa7" }, { key: "messages-from-righteous", label: "מסרים" });
  assert.equal(approved.id, channel.id);
  const merged = mergeSystemFeedItems([approved], [channel]);
  assert.equal(merged.length, 1);
  const [model] = nowModels(rows(merged));
  assert.equal(model.seriesKey, "messages-from-righteous"); assert.deepEqual(model.byline, ["מסרים", "אור הגאולה"]);
  assert.equal(model.video, true); assert.equal(model.href, "/video/25e378462b55298219e5f7562698bfa7");
  assert.equal(model.typeLabel, "סרטון");
  assert.ok(!/\.mp4/.test(model.title + model.fullText));
  assert.equal(approvedSeriesToSystemItem({ ...approved, sourceRef: "channel_updates:bad" }, { key: "x" }), null);
});

test("no activity/personal features are modelled as active: the projection exposes no follow/timeline/meter fields", () => {
  const [model] = nowModels(rows([postRowToWorldUpdate(post(1))]));
  assert.deepEqual(Object.keys(model).filter(k => /follow|timeline|meter|personal|activity/i.test(k)), []);
});

test("series previews (same Home reader) keep every approved series present even when the shared recent window is full", () => {
  const recent = Array.from({ length: 45 }, (_, i) => postRowToWorldUpdate(post(1 + (i % 9), { id: 100 + i, slug: `r${i}`, date: `2026-11-03T${String(i % 24).padStart(2, "0")}:00:00Z`, modified: "2026-11-03T12:00:00Z" })));
  const catalog = { series: [{ key: "messages-from-righteous", label: "מסרים", items: [
    { kind: "post", id: "9001", title: "מסר ישן", excerpt: "תקציר", author: "כותב", publishedAt: "2026-10-01T10:00:00Z", href: "/old-message", sourceRef: "posts:9001", imageUrl: "https://example.test/t.webp" },
    { kind: "channel_update", id: "x", title: "לא פוסט", publishedAt: "2026-10-02T10:00:00Z", href: "/video/abc", sourceRef: "channel_updates:x" },
    { kind: "post", id: "9002", title: "ללא קישור", publishedAt: "2026-10-02T10:00:00Z", href: "", sourceRef: "posts:9002" },
  ] }] };
  const extra = seriesCatalogToSystemItems(catalog);
  assert.deepEqual(extra.map(i => i.id), ["post:9001"], "posts only, with an exact internal destination");
  const models = nowModels(rows(mergeSystemFeedItems(recent, extra)));
  const old = models.find(m => m.id === "post:9001");
  assert.ok(old, "an old series post survives the post-bucket cap");
  assert.equal(old.seriesKey, "messages-from-righteous"); assert.equal(old.seriesLabel, "מסרים"); assert.ok(old.lenses.has("messages"));
  assert.equal(old.thumb, "https://example.test/t.webp");
  // the same post arriving from the stream stays ONE row (stream copy wins, same identity)
  const dup = mergeSystemFeedItems([postRowToWorldUpdate(post(1, { id: 9001, slug: "old-message", categories: ["רמזים מצדיקים"] }))], extra);
  assert.equal(dup.length, 1);
  assert.equal(nowModels(rows(dup))[0].seriesKey, "messages-from-righteous");
});

test("the words of the message are shown with its media; unverified source rows stay two lines", () => {
  const gen = nowExcerpt({ unverified: false, title: "מסר מאור הגאולה", fullText: "מילות המסר עצמן שנמשכות הלאה", summary: "" });
  assert.equal(gen.excerpt, "מילות המסר עצמן שנמשכות הלאה"); assert.equal(gen.excerptIsLead, false);
  const lead = nowExcerpt({ unverified: false, title: "פתיחה של המסר…", fullText: "פתיחה של המסר ועוד המשך ארוך", summary: "" });
  assert.equal(lead.excerptIsLead, true, "text that starts with the title replaces it, no repetition");
  assert.deepEqual(nowExcerpt({ unverified: true, title: "t", fullText: "ארוך מאוד", summary: "" }), { excerpt: "", excerptIsLead: false });
  assert.equal(nowExcerpt({ unverified: false, title: "קצר", fullText: "קצר", summary: "" }).excerpt, "");
  const id = "9d4e6b80-f52b-4461-9231-ca30f37f0db9";
  const ch = publicChannelToSystemItem({ id, channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-03T09:49:00Z", text: "הגאולה קרובה ויש להתחזק בכל יום", image_url: MP4 });
  const [m] = nowModels(rows([ch])); assert.equal(m.previewKind, "video");
  const [img] = nowModels(rows([publicChannelToSystemItem({ id, channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-03T09:49:00Z", text: "טקסט", image_url: MP4.replace("clip.mp4", "i.jpg") })])); assert.equal(img.previewKind, "image");
  const zvi = groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: "פתיחה ".repeat(40), created_at: "2026-11-03T08:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
  assert.equal(nowModels(rows([zvi]))[0].previewKind, null);
});

test("collapseSourceRuns: only consecutive unverified rows of one source collapse; order and rows are kept, nothing merged", () => {
  const m = (id, unverified, sourceName = "צבי") => ({ id, unverified, sourceName });
  const flat = es => es.flatMap(e => e.kind === "run" ? e.models.map(x => x.id) : [e.model.id]);
  const input = [m("a", true), m("b", true), m("c", true), m("d", false, "אור"), m("e", true), m("f", true), m("g", true, "מקור אחר"), m("h", true, "מקור אחר"), m("i", true, "מקור אחר")];
  const out = collapseSourceRuns(input);
  assert.deepEqual(flat(out), input.map(x => x.id), "same rows, same order");
  assert.deepEqual(out.map(e => e.kind), ["run", "row", "run", "run"]);
  assert.equal(out[0].models.length, 3); assert.equal(out[0].sourceName, "צבי"); assert.equal(out[3].sourceName, "מקור אחר"); assert.equal(out[2].models.length, 2);
  assert.deepEqual(collapseSourceRuns([m("a", true), m("b", true)]).map(e => e.kind), ["run"], "two consecutive rows already collapse");
  assert.deepEqual(collapseSourceRuns([m("a", true), m("d", false), m("b", true)]).map(e => e.kind), ["row", "row", "row"], "a single row never collapses");
  assert.deepEqual(collapseSourceRuns(null), []);
});

test("source logos mark OUR material only: system-byline posts, Or HaGeula, ELS findings; third-party series and named writers get none", () => {
  const sys = nowModels(rows([postRowToWorldUpdate(post(1, { author: "מערכת כי לה׳ המלוכה" }))]))[0];
  assert.equal(sys.logo?.label, "כי לה׳ המלוכה");
  const alon = nowModels(rows([postRowToWorldUpdate(post(2, { author: "אלון לוי", tags: ["מה קורה הבורא"] }))]))[0];
  assert.equal(alon.seriesKey, "mah-kore-habora"); assert.equal(alon.logo, null);
  const named = nowModels(rows([postRowToWorldUpdate(post(3, { author: "כותב" }))]))[0];
  assert.equal(named.logo, null);
  const orGeula = nowModels(rows([publicChannelToSystemItem({ id: "10000000-0000-4000-8000-000000000009", channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-03T09:49:00Z", text: "מסר" })]))[0];
  assert.equal(orGeula.logo?.label, "אור הגאולה");
  const zvi = groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000002", body: "הודעה", created_at: "2026-11-03T08:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" });
  assert.equal(nowModels(rows([zvi]))[0].logo, null);
});

test("a collapsed run reports its newest valid time, whatever the row order, and none when no row is dated", () => {
  const m = at => ({ at });
  assert.equal(latestRunAt([m("2026-11-03T08:00:00Z"), m("2026-11-03T10:00:00Z"), m("2026-11-02T10:00:00Z")]), "2026-11-03T10:00:00.000Z");
  assert.equal(latestRunAt([m(null), m("not a date"), m("2026-11-03T08:00:00Z")]), "2026-11-03T08:00:00.000Z");
  assert.equal(latestRunAt([m(null), m(undefined)]), null);
  assert.equal(latestRunAt(null), null);
});

test("Or HaGeula rabbi box: 'רב'/'הרב' as a word goes in; other updates and other channels stay out; the box sits at its newest member", () => {
  const or = (id, text, at, extra = {}) => ({ id, title: text, fullText: text, summary: "", at, unverified: false, item: { sourceKind: "channel_update", channel: "or-geula" }, row: {}, ...extra });
  const yes = ["קריאת קודש של הרב אלבז", "אזהרת הרב שמואל אליהו!", "דברי רב מופלא", "מהרב לעם", "והרב אמר", "לרב יש מסר", "שהרב כתב", "ברב עם"];
  const no = ["בגין ז'ל נאום", "ארבעה מסרים", "שרב כבד", "תרבות", "הרבה מאוד", "כרב"];
  for (const t of yes) assert.equal(isRabbiBoxModel(or("x", t, "2026-11-01")), true, t);
  for (const t of no) assert.equal(isRabbiBoxModel(or("x", t, "2026-11-01")), false, t);
  assert.equal(isRabbiBoxModel({ ...or("x", "הרב אלבז", "2026-11-01"), item: { sourceKind: "channel_update", channel: "site-news" } }), false, "only the Or HaGeula channel");
  assert.equal(isRabbiBoxModel({ ...or("x", "הרב אלבז", "2026-11-01"), unverified: true }), false);
  const models = [or("a", "סרטון פשוט", "2026-11-08T10:00:00Z"), or("b", "קריאת הרב אלבז", "2026-11-08T09:00:00Z"), or("c", "עוד סרטון", "2026-11-07T10:00:00Z"), or("d", "הרב אליהו מזהיר", "2026-11-06T10:00:00Z"), or("e", "סרטון אחרון", "2026-11-05T10:00:00Z")];
  const entries = buildNowEntries(models);
  assert.deepEqual(entries.map(e => e.kind === "box" ? "box" : e.kind === "run" ? "run" : e.model.id), ["a", "box", "c", "e"], "the box sits at its newest member, others keep their order");
  assert.deepEqual(entries[1].models.map(m => m.id), ["b", "d"]);
  assert.equal(entries[1].latest, "2026-11-08T09:00:00.000Z");
  // a new update with the word lifts the whole box to the top
  const lifted = buildNowEntries([or("n", "הרב חדש", "2026-11-09T10:00:00Z"), ...models]);
  assert.equal(lifted[0].kind, "box"); assert.deepEqual(lifted[0].models.map(m => m.id), ["n", "b", "d"]);
  // no member: no box, nothing else changes
  assert.deepEqual(buildNowEntries([models[0], models[2]]).map(e => e.model.id), ["a", "c"]);
  assert.equal(buildNowEntries(models, { rabbiBox: false }).some(e => e.kind === "box"), false);
});

test("a pinned item (the Home featured post) stays first in the Now window whatever its time", () => {
  const mk = (id, at, pinned) => ({ id, title: "כותרת " + id, at, item: { sourceKind: "post", label: "כותרת " + id, pinned }, href: "/post/" + id });
  const models = nowModels([mk("a", "2026-11-10T10:00:00Z"), mk("b", "2026-11-01T10:00:00Z", true), mk("c", "2026-11-09T10:00:00Z")]);
  assert.deepEqual(models.map(x => x.id), ["b", "a", "c"]);
  assert.equal(models[0].pinned, true); assert.equal(models[1].pinned, false);
});

test("an owner-flagged update carries a dot label; rows without the flag carry none", () => {
  const mk = (id, extra = {}) => ({ id, title: "כותרת " + id, at: "2026-11-10T10:00:00Z", item: { sourceKind: "post", label: "כותרת " + id, ...extra }, href: "/post/" + id });
  const [a, b, c] = nowModels([mk("a", { liveDot: "עדכון חדש בפוסט" }), mk("b"), mk("c", { liveDot: "" })]);
  assert.equal(a.dot, "עדכון חדש בפוסט"); assert.equal(b.dot, null); assert.equal(c.dot, null);
});

test("the update-of-the-day band carries the whole update, shows for exactly its days (Asia/Jerusalem), then disappears; no band, no output", () => {
  const band = { from: "2026-11-10", days: 3, title: "עדכון היום", groups: [{ value: 1234, phrases: ["א", "ב"] }, { value: 1011, phrases: ["ג"], numberOnly: ["ג"] }], statement: "משפט" };
  const models = [{ item: { band } }, { item: {} }];
  const at = iso => Date.parse(iso);
  assert.equal(nowTodayBand(models, at("2026-11-09T21:59:00Z")), null, "before the first Israeli day (23:59 on 9.11)");
  const first = nowTodayBand(models, at("2026-11-09T22:01:00Z"));
  assert.deepEqual(first.groups.map(g => g.value), [1234, 1011]); assert.deepEqual(first.groups[0].phrases, ["א", "ב"]); assert.deepEqual(first.groups[1].numberOnly, ["ג"]); assert.equal(first.statement, "משפט");
  assert.ok(nowTodayBand(models, at("2026-11-12T20:00:00Z")), "last day, 12.11 evening");
  assert.equal(nowTodayBand(models, at("2026-11-12T22:30:00Z")), null, "00:30 on 13.11 Israel time: gone");
  assert.equal(nowTodayBand([{ item: {} }], at("2026-11-11T10:00:00Z")), null);
  assert.equal(nowTodayBand(null), null);
  for (const bad of [{ ...band, days: 0 }, { ...band, from: "10.11.2026" }, { ...band, groups: [] }, { ...band, groups: [{ value: "1011", phrases: ["ג"] }] }]) assert.equal(nowTodayBand([{ item: { band: bad } }], at("2026-11-11T10:00:00Z")), null);
});

// ── "עכשיו · המרכז" (ZURIEL 11.11.2026): one pin of at most 72 hours, one source picker by a stable key ─────────────────────────────
test("the pin is a window: while open the pinned row stays first and carries the central message; once expired it returns to its place by time", () => {
  const central = { title: "כותרת המסר", groups: [{ value: 1234, phrases: ["ממשלת משיח בן דוד"], numberOnly: [] }] };
  const mk = (id, at, extra = {}) => ({ id, title: "כותרת " + id, at, item: { sourceKind: "post", label: "כותרת " + id, ...extra }, href: "/post/" + id });
  const pinned = { pinned: true, pinUntil: "2026-11-14T08:00:00.000Z", central, liveDot: "עדכון חדש בפוסט" };
  const open = nowModels([mk("a", "2026-11-10T10:00:00Z"), mk("b", "2026-11-01T10:00:00Z", pinned)], Date.parse("2026-11-12T00:00:00Z"));
  assert.deepEqual(open.map(x => x.id), ["b", "a"]);
  const message = nowPinnedMessage(open, Date.parse("2026-11-12T00:00:00Z"));
  assert.equal(message.model.id, "b"); assert.equal(message.central.title, "כותרת המסר"); assert.equal(message.href, "/post/b");
  assert.equal(nowPinnedMessage(open, Date.parse("2026-11-14T08:00:00Z")), null, "no pinned card at or after the expiry");
  const expired = nowModels([mk("a", "2026-11-10T10:00:00Z"), mk("b", "2026-11-01T10:00:00Z", pinned)], Date.parse("2026-11-15T00:00:00Z"));
  assert.deepEqual(expired.map(x => x.id), ["a", "b"]); assert.equal(expired[1].pinned, false); assert.equal(expired[1].dot, null, "no 'new' flag after the pin");
  assert.equal(nowPinUntilLabel("2026-11-14T08:00:00.000Z"), "עד 14.11 · 10:00", "Israel time");
});

test("source picker: a stable key per source kind (group / channel / series / the site), never the display name or a category; known groups always listed", () => {
  const groupRow = groupRowToWorldUpdate({ id: "20000000-0000-4000-8000-000000000001", body: "הודעת מקור", created_at: "2026-11-03T10:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique", group_channel: "torat-haremez" });
  const channel = { id: "channel:00000000-0000-4000-8000-0000000000aa", kind: "update", title: "עדכון", at: "2026-11-03T09:00:00Z", item: { sourceKind: "channel_update", channel: "or-geula", sourceLabel: "אור הגאולה", label: "עדכון" }, href: null };
  const sitePost = { id: "post:9", kind: "update", title: "פוסט", at: "2026-11-03T08:00:00Z", item: { sourceKind: "post", label: "פוסט", categories: ["תיעוד אירועים"], tags: [], author: "SOD1820" }, href: "/post/p9" };
  const models = nowModels([...rows([groupRow].filter(Boolean)), channel, sitePost]);
  const byId = Object.fromEntries(models.map(model => [model.id, model.sourceKey]));
  assert.equal(byId["channel:00000000-0000-4000-8000-0000000000aa"], "channel:or-geula");
  assert.equal(byId["post:9"], "site:posts", "a Post outside a series is the site's publication; its category never becomes the source");
  const groupKey = models.find(model => model.unverified)?.sourceKey;
  assert.match(groupKey, /^group:/);
  const choices = nowSourceChoices(models);
  assert.deepEqual(choices.slice(0, 2).map(item => item.kind), ["group", "group"], "groups first");
  assert.ok(choices.some(item => item.id === "group:ki-la-hamelucha-gematria" && item.count === 0 && item.label === "כי לה׳ המלוכה — גימטריות"));
  assert.equal(choices.find(item => item.id === "channel:or-geula").kindLabel, "ערוץ");
  assert.equal(choices.find(item => item.id === "site:posts").label, "פרסומי האתר");
  assert.deepEqual(filterNowBySource(models, "channel:or-geula").map(model => model.id), ["channel:00000000-0000-4000-8000-0000000000aa"]);
  assert.equal(filterNowBySource(models, "").length, models.length);
});
