import test from "node:test";
import assert from "node:assert/strict";
import { cleanNowText, shortNowTitle, nowRowModel, nowModels, availableNowLenses, nowExcerpt, nowSecondaryChoices, filterNowModels, nowSeriesHref, nowSeriesLabel } from "../src/lib/nowPublications2029.js";
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
  assert.deepEqual(model.byline, ["צבי"]);
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
  assert.equal(orGeula.seriesKey, null, "channel name alone never joins a series"); assert.equal(orGeula.lenses.has("messages"), false);
  assert.deepEqual(availableNowLenses(models).map(l => l.id), ["all", "series", "messages", "hints"]);
  assert.deepEqual(availableNowLenses([by("post:8")]).map(l => l.id), ["all"], "lenses appear only when they have rows");
  assert.equal(filterNowModels(models, { lens: "messages" }).length, 2);
  assert.equal(filterNowModels(models, { series: "dimension-five" }).length, 1);
  assert.equal(filterNowModels(models, { media: "video" }).length, 1);
  assert.equal(filterNowModels(models, { lens: "hints", source: "קוד המציאות" }).length, 1);
  assert.deepEqual(nowSecondaryChoices(models).series.map(s => s.id).sort(), ["dimension-five", "mah-kore-habora", "messages-from-righteous", "sod-hashmal"]);
  assert.equal(nowSeriesHref(by("post:2")), "/2029/posts?series=mah-kore-habora");
  assert.equal(nowSeriesLabel("messages-from-righteous", "מסרים מצדיקים"), "מסרים");
});

test("'הכול' is chronological newest first, with a stable tie-break", () => {
  const models = nowModels(rows([1, 3, 2].map(id => postRowToWorldUpdate(post(id)))));
  assert.deepEqual(models.map(m => m.id), ["post:3", "post:2", "post:1"]);
});

test("one publication = one row: the approved Or HaGeula video enriches the same channel row (no second notice)", () => {
  const id = "9d4e6b80-f52b-4461-9231-ca30f37f0db9";
  const channel = publicChannelToSystemItem({ id, channel: "or-geula", status: "live", page_only: false, created_at: "2026-11-03T09:49:00Z", text: "מסר מאור הגאולה", image_url: MP4 });
  const approved = approvedSeriesToSystemItem({ sourceRef: `channel_updates:${id}`, kind: "channel_update", title: "מסר מאור הגאולה", excerpt: "מסר מאור הגאולה", channel: "or-geula",
    publishedAt: "2026-11-03T09:49:00Z", mediaUrl: MP4, imageUrl: MP4.replace("clip.mp4", "t.png"), href: "/video/25e378462b55298219e5f7562698bfa7" }, { key: "messages-from-righteous", label: "מסרים מצדיקים" });
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
  const catalog = { series: [{ key: "messages-from-righteous", label: "מסרים מצדיקים", items: [
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
