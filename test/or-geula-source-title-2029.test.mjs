// #1448 (ZURIEL 24.11.2026): "אור הגאולה" titles come from the source; without one the item is HELD, never given a placeholder.
import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId, firstLink, isMeaningfulTitle, captionTitle, captionDescription, orGeulaItemKind,
  resolveOrGeulaTitle, youtubeOEmbedUrl, readYouTubeOEmbed } from "../supabase/functions/_shared/orGeulaSourceTitle.js";

test("YouTube ids from watch, short links, Shorts, live, embed and mobile addresses", () => {
  for (const [text, id] of [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["צפו https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/AbCdEfGhIjK", "AbCdEfGhIjK"],
    ["https://m.youtube.com/watch?feature=share&v=AbCdEfGhIjK", "AbCdEfGhIjK"],
    ["https://www.youtube.com/live/AbCdEfGhIjK?x=1", "AbCdEfGhIjK"],
    ["https://www.youtube-nocookie.com/embed/AbCdEfGhIjK", "AbCdEfGhIjK"],
  ]) assert.equal(youtubeVideoId(text), id, text);
  assert.equal(youtubeVideoId("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(youtubeVideoId("אין כאן קישור"), null);
});

test("a URL, a short fragment or a placeholder is never a title", () => {
  for (const bad of ["https://youtu", "https://youtu.be/dQw4w9WgXcQ", "www.example.org/a", "example.org/page", "סרטון", "🎬 עדכון וידאו",
    "📷 עדכון", "עדכון", "קישור", "[קישור]", "[קישור] [קישור]", "אור הגאולה — סרטון", "", "  ", "🙏🙏", "abc"]) assert.equal(isMeaningfulTitle(bad), false, bad);
  for (const good of ["סוד הגאולה בשנת התשפ״ו", "Messiah and the year 5786", "רמזי הגאולה במספר 1820"]) assert.equal(isMeaningfulTitle(good), true, good);
});

test("caption titles drop links and decoration and keep Hebrew/RTL words", () => {
  assert.equal(captionTitle("🎬 *רמז מדהים בפרשת השבוע* https://youtu.be/dQw4w9WgXcQ\nעוד פרטים בהמשך"), "רמז מדהים בפרשת השבוע");
  assert.equal(captionTitle("https://example.org/only-a-link"), null);
  assert.equal(captionTitle("🎬 עדכון וידאו"), null);
  const long = captionTitle("א".repeat(5) + " " + "ב ".repeat(80));
  assert.ok(long.length <= 91 && long.endsWith("…"));
  assert.equal(captionDescription("שלום https://x.org ועוד מילים"), "שלום ועוד מילים");
});

test("the item kind comes from the source fields", () => {
  assert.equal(orGeulaItemKind({ image_url: "https://x.supabase.co/a.mp4" }), "local_video");
  assert.equal(orGeulaItemKind({ text: "https://youtu.be/dQw4w9WgXcQ" }), "youtube");
  assert.equal(orGeulaItemKind({ image_url: "https://x.supabase.co/a.jpg", text: "" }), "image");
  assert.equal(orGeulaItemKind({ text: "קראו https://news.example.org/a" }), "link");
  assert.equal(orGeulaItemKind({ text: "רק טקסט" }), "text");
  assert.equal(firstLink("ראו https://youtu.be/dQw4w9WgXcQ וגם https://news.example.org/a."), "https://news.example.org/a");
});

test("title decision: existing → YouTube → caption → link → HELD", () => {
  assert.deepEqual(resolveOrGeulaTitle({ seoTitle: "כותרת קיימת וטובה", youtubeTitle: "Other" }), { title: "כותרת קיימת וטובה", source: "existing", held: false });
  assert.deepEqual(resolveOrGeulaTitle({ seoTitle: "https://youtu", youtubeTitle: "The official YouTube title", text: "כיתוב" }),
    { title: "The official YouTube title", source: "youtube_oembed", held: false });
  assert.equal(resolveOrGeulaTitle({ text: "🎬 עדכון וידאו", youtubeTitle: null }).held, true, "YouTube without metadata and without caption");
  assert.deepEqual(resolveOrGeulaTitle({ text: "📷 עדכון" }), { title: null, source: null, held: true }, "image without text");
  assert.equal(resolveOrGeulaTitle({ text: "שיעור על סוד הגאולה" }).source, "caption", "WhatsApp body");
  assert.equal(resolveOrGeulaTitle({ text: "https://news.example.org/a", linkTitle: "כתבה על הגאולה" }).source, "link_og");
  assert.equal(resolveOrGeulaTitle({ text: "https://news.example.org/a", linkTitle: null }).held, true, "broken or unread link");
});

test("YouTube oEmbed is read only from the fixed host and fails closed", async () => {
  assert.equal(youtubeOEmbedUrl("../etc"), null);
  assert.match(youtubeOEmbedUrl("dQw4w9WgXcQ"), /^https:\/\/www\.youtube\.com\/oembed\?format=json&url=https%3A%2F%2Fwww\.youtube\.com%2Fwatch%3Fv%3DdQw4w9WgXcQ$/);
  const seen = [];
  const ok = await readYouTubeOEmbed("dQw4w9WgXcQ", { fetchImpl: async (url, init) => { seen.push([url, init.redirect]);
    return { ok: true, json: async () => ({ title: "  Official title  ", thumbnail_url: "https://i.ytimg.com/vi/x/hqdefault.jpg", author_name: "Channel" }) }; } });
  assert.deepEqual(ok, { title: "Official title", thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg", authorName: "Channel" });
  assert.equal(seen[0][1], "error", "no redirect is followed");
  assert.equal(await readYouTubeOEmbed("dQw4w9WgXcQ", { fetchImpl: async () => ({ ok: false }) }), null, "private or removed video");
  assert.equal(await readYouTubeOEmbed("dQw4w9WgXcQ", { fetchImpl: async () => { throw new Error("blocked"); } }), null);
  const odd = await readYouTubeOEmbed("dQw4w9WgXcQ", { fetchImpl: async () => ({ ok: true, json: async () => ({ title: "T", thumbnail_url: "https://evil.example/x.jpg" }) }) });
  assert.equal(odd.thumbnailUrl, null, "a thumbnail outside i.ytimg.com is not trusted");
});

test("a new item is titled from its source at intake, without overwriting what it already has", async () => {
  const { orGeulaIntakeUpdate } = await import("../supabase/functions/_shared/orGeulaSourceTitle.js");
  const yt = async () => ({ ok: true, json: async () => ({ title: "שיעור על הגאולה", thumbnail_url: "https://i.ytimg.com/vi/a/hq.jpg" }) });
  const now = () => "2026-11-24T00:00:00.000Z";
  assert.equal(await orGeulaIntakeUpdate({ channel: "torat-haremez", text: "x" }), null, "other channels are untouched");
  assert.equal(await orGeulaIntakeUpdate({ channel: "or-geula", seo_title: "כותרת קיימת וטובה" }), null, "an existing title stays");
  const a = await orGeulaIntakeUpdate({ channel: "or-geula", text: "https://youtube.com/shorts/AbCdEfGhIjK" }, { fetchImpl: yt, now });
  assert.deepEqual(a.update, { seo_title: "שיעור על הגאולה", enrichment_status: "source_title", enrichment_source: "youtube_oembed", enriched_at: now(), thumb_url: "https://i.ytimg.com/vi/a/hq.jpg" });
  const b = await orGeulaIntakeUpdate({ channel: "or-geula", text: "https://youtu.be/AbCdEfGhIjK", thumb_url: "https://keep/me.jpg" }, { fetchImpl: async () => ({ ok: false }) });
  assert.deepEqual(b.update, { enrichment_status: "seo_held", enrichment_source: "youtube_metadata_unavailable" }, "YouTube without metadata is held");
  const c = await orGeulaIntakeUpdate({ channel: "or-geula", text: "📷 עדכון", image_url: "https://x/a.jpg" });
  assert.equal(c.update.enrichment_status, "seo_held", "an image without text is held");
  const d = await orGeulaIntakeUpdate({ channel: "or-geula", text: "סוד המספר 1820 בפרשה", image_url: "https://x/a.jpg" }, { now });
  assert.equal(d.update.seo_title, "סוד המספר 1820 בפרשה");
});

test("a self-hosted video keeps its pending status for the existing enrichment; only a source title is added", async () => {
  const { orGeulaIntakeUpdate } = await import("../supabase/functions/_shared/orGeulaSourceTitle.js");
  const titled = await orGeulaIntakeUpdate({ channel: "or-geula", text: "שיעור מיוחד על סוד הגאולה", image_url: "https://x/a.mp4" });
  assert.deepEqual(titled.update, { seo_title: "שיעור מיוחד על סוד הגאולה" });
  const bare = await orGeulaIntakeUpdate({ channel: "or-geula", text: "🎬 עדכון וידאו", image_url: "https://x/a.mp4" });
  assert.equal(bare.update, null, "nothing to write: wa-video-enrich decides, without AI unless allowed");
  assert.equal(bare.decision.held, true);
});

test("sitemap: an Or HaGeula video page needs a source title; other video pages keep their rules", async () => {
  const { orGeulaSitemapAdmits } = await import("../src/lib/orGeulaSourceTitle2029.js");
  const page = "https://sod1820.co.il/or-geula/video/8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d7e";
  assert.equal(orGeulaSitemapAdmits(page, "שיעור על סוד הגאולה"), true);
  for (const placeholder of ["סרטון", "https://youtu", "🎬 עדכון וידאו", ""]) assert.equal(orGeulaSitemapAdmits(page, placeholder), false, placeholder);
  assert.equal(orGeulaSitemapAdmits("https://sod1820.co.il/post/x", "סרטון"), true, "not an Or HaGeula page");
  // The unified projection lists channel videos at /video/<public_id>: the gate follows the source, not the address.
  const watch = "https://sod1820.co.il/video/ef9a65edcd3256d3e417abbb8e1057e8";
  for (const live of ["https://youtu", "🙏"]) assert.equal(orGeulaSitemapAdmits(watch, live, "channel_update"), false, live);
  assert.equal(orGeulaSitemapAdmits(watch, "שיעור על סוד הגאולה", "channel_update"), true);
  assert.equal(orGeulaSitemapAdmits(watch, "🙏", "post"), true, "a post video keeps the post rules");
  const { readFileSync } = await import("node:fs");
  const sitemap = readFileSync(new URL("../api/sitemap.js", import.meta.url), "utf8");
  assert.match(sitemap, /if \(!orGeulaSitemapAdmits\(pageUrl, v\.title, v\.primary_source_type\)\) continue;/);
  assert.match(sitemap, /last_seen_at,primary_source_type'/, "the source type is read in every profile");
});

test("page and share card: a source title is shown and indexed; without one the item is readable and held", async () => {
  const { publicOrGeulaItem2029 } = await import("../src/lib/publicContinuityReaders2029.js");
  const base = { id: "8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d7e", channel: "or-geula", status: "live", page_only: false, expires_at: null,
    created_at: "2026-11-20T10:00:00Z", credit: "אור הגאולה", image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/a.jpg", thumb_url: null };
  const titled = publicOrGeulaItem2029({ ...base, seo_title: null, text: "רמז מדהים בפרשת השבוע https://youtu.be/dQw4w9WgXcQ" }, { now: Date.parse("2026-11-24T00:00:00Z") });
  assert.equal(titled.seoHeld, false);
  assert.equal(titled.title, "רמז מדהים בפרשת השבוע");
  assert.equal(titled.seoDescription, "רמז מדהים בפרשת השבוע");
  const held = publicOrGeulaItem2029({ ...base, seo_title: "https://youtu", text: "📷 עדכון" }, { now: Date.parse("2026-11-24T00:00:00Z") });
  assert.equal(held.seoHeld, true, "a URL seo_title and a placeholder caption are not a source title");
  assert.ok(held.href.startsWith("/or-geula/video/"), "the item stays addressable and readable");
  const { readFileSync } = await import("node:fs");
  const og = readFileSync(new URL("../api/og.js", import.meta.url), "utf8");
  assert.match(og, /if \(result\.item\.seoHeld\) robots = 'noindex, follow';/);
  assert.match(og, /result\.item\.seoHeld \? `אור הגאולה · \$\{SITE_NAME\}`/, "no placeholder title is published for a held item");
});

test("watch page /video/<id>: a channel video without a source title stays readable and is not offered for indexing", async () => {
  const { fetchPublicVideo2029, publicVideoSitemapAssets2029 } = await import("../src/lib/research/publicVideo2029Reading.js");
  const ID = "ef9a65edcd3256d3e417abbb8e1057e8", SOURCE = "9d4e6b80-f52b-4461-9231-ca30f37f0db9", NOW = Date.parse("2026-11-24T00:00:00Z");
  const MEDIA = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/fixture.mp4";
  const asset = { public_id: ID, primary_source_type: "channel_update", primary_source_id: SOURCE, media_url: MEDIA, video_kind: "selfhost", google_indexable: true };
  const source = patch => ({ id: SOURCE, status: "live", page_only: false, expires_at: null, created_at: "2026-11-20T10:00:00Z",
    credit: "אור הגאולה", image_url: MEDIA, thumb_url: null, ...patch });
  const read = row => async table => table === "video_media_assets_v1" ? [asset] : [row];
  const live = await fetchPublicVideo2029(ID, { now: NOW, readRows: read(source({ seo_title: "https://youtu", text: "https://youtu.be/AbCdEfGhIjK" })) });
  assert.ok(live, "the page still opens");
  assert.equal(live.google_indexable, false, "a URL title is not indexed");
  const caption = await fetchPublicVideo2029(ID, { now: NOW, readRows: read(source({ seo_title: "https://youtu", text: "שיעור מיוחד על סוד הגאולה" })) });
  assert.equal(caption.title, "שיעור מיוחד על סוד הגאולה", "the caption replaces a URL seo_title");
  assert.equal(caption.google_indexable, true);
  const listed = await publicVideoSitemapAssets2029([asset], { now: NOW, readRows: async () => [source({ seo_title: "🙏", text: "🙏" })] });
  assert.equal(listed[0].primary_source_type, "channel_update", "the sitemap gate receives the source type");
  assert.equal(listed[0].google_indexable, false);
});

test("Open Index Law: a titled Or HaGeula image or text item is listed in the sitemap; a held item or a self-hosted video is not", async () => {
  const { loadPublicOrGeulaCollection2029 } = await import("../src/lib/publicContinuityReaders2029.js");
  const base = { channel: "or-geula", status: "live", page_only: false, expires_at: null, created_at: "2026-11-20T10:00:00Z", credit: "אור הגאולה", thumb_url: null };
  const media = name => `https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/${name}`;
  const rows = [
    { ...base, id: "8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d71", seo_title: null, text: "תמונה מהכותל בערב שבת", image_url: media("a.jpg") },
    { ...base, id: "8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d72", seo_title: null, text: "📷 עדכון", image_url: media("b.jpg") },
    { ...base, id: "8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d73", seo_title: "שיעור על סוד הגאולה", text: "🎬 עדכון וידאו", image_url: media("c.mp4") },
  ];
  const page = await loadPublicOrGeulaCollection2029({ page: 1, now: Date.parse("2026-11-24T00:00:00Z"), readRows: async () => rows });
  const listed = page.items.filter(item => !item.seoHeld && item.mediaKind !== "video").map(item => item.href);
  assert.deepEqual(listed, ["/or-geula/video/8a5c3d1e-0b4f-4c2a-9d1e-2f3a4b5c6d71"]);
  const { readFileSync } = await import("node:fs");
  const sitemap = readFileSync(new URL("../api/sitemap.js", import.meta.url), "utf8");
  assert.match(sitemap, /loadPublicOrGeulaCollection2029\(\{ page, readRows \}\)/);
  assert.match(sitemap, /if \(item\.seoHeld \|\| item\.mediaKind === 'video'\) continue;/);
  const law = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8");
  assert.match(law, /## חוק אינדוקס פתוח \(Open Index Law — ZURIEL, 24\.11\.2026\)/);
});
