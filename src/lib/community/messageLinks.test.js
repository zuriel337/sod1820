import test from "node:test";
import assert from "node:assert/strict";
import { describeMessageLink, messageLinkPreviews, splitMessageLinks } from "./messageLinks.js";

const id = "Jp0pxGofPjQ";
test("recognizes supported YouTube forms without passing query input to embeds", () => {
  for (const url of [`https://youtu.be/${id}?t=42`, `https://www.youtube.com/watch?feature=share&v=${id}&autoplay=1`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) {
    const link = describeMessageLink(url);
    assert.equal(link.kind, "youtube");
    assert.equal(link.embed, `https://www.youtube-nocookie.com/embed/${id}?rel=0`);
  }
  assert.equal(describeMessageLink("https://vimeo.com/123456789").embed, "https://player.vimeo.com/video/123456789");
});
test("rejects unsafe URLs and never embeds lookalike or malformed video URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,<script>", "https://secret:password@youtube.com/watch?v=" + id]) assert.equal(describeMessageLink(url), null);
  for (const url of [`https://youtube.com.evil.test/watch?v=${id}`, `https://evilyoutu.be/${id}`, `https://evil.test/youtube.com/watch?v=${id}`, `https://youtube.com:8443/watch?v=${id}`, `https://youtube.com/watch?v=${id}TOOLONG`, `https://youtu.be/${id}/extra`, "https://vimeo.com/123/evil"]) {
    assert.equal(describeMessageLink(url).kind, "link");
    assert.equal(describeMessageLink(url).embed, undefined);
  }
});
test("preserves escaped prose and URL punctuation, deduplicates and bounds previews", () => {
  const text = `ראו (https://youtu.be/${id}). <img src=x> https://www.youtube.com/watch?v=${id} https://example.com/path_(x) https://vimeo.com/123 https://fourth.test/`;
  const parts = splitMessageLinks(text);
  assert.equal(parts.map((part) => part.text).join(""), text);
  assert.equal(parts.find((part) => part.link).link.href, `https://youtu.be/${id}`);
  const previews = messageLinkPreviews(parts);
  assert.equal(previews.length, 3);
  assert.deepEqual(previews.map((link) => link.kind), ["youtube", "link", "vimeo"]);
  assert.equal(previews[1].href, "https://example.com/path_(x)");
});
test("previews only files uploaded to the Community gallery path", () => {
  const base = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/community/46a7a3ae-cd08-4441-893a-5ef57cda9a9e";
  assert.equal(describeMessageLink(`${base}.gif`).kind, "image");
  assert.equal(describeMessageLink(`${base}.pdf`).kind, "file");
  assert.equal(describeMessageLink(`${base}.html`).kind, "link");
  assert.equal(describeMessageLink(`${base}.svg`).kind, "link");
  assert.equal(describeMessageLink("https://other.example/storage/v1/object/public/gallery/community/46a7a3ae-cd08-4441-893a-5ef57cda9a9e.gif").kind, "link");
});

test("native video and account-scoped attachments stay within the existing public Community origin", () => {
  const base="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/community/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  for(const extension of ['mp4','webm','mov'])assert.equal(describeMessageLink(base+'.'+extension).kind,'video');
  assert.equal(describeMessageLink(base+'.png').kind,'image');
  assert.equal(describeMessageLink(base+'.pdf').kind,'file');
  assert.equal(describeMessageLink(base.replace('community/','private/')+'.mp4').kind,'link');
  assert.equal(describeMessageLink(base.replace('linswmnnkjxvweumprav.supabase.co','untrusted.example')+'.mp4').kind,'link');
  assert.equal(describeMessageLink(base.replace('.supabase.co/','.supabase.co:8443/')+'.mp4').kind,'link');
  assert.equal(describeMessageLink(base+'.html').kind,'link');
});

test("original extensionless OpenWeb attachments render as images without rewriting the public source", () => {
  const original = "https://images.spot.im/v1/lgckojucbf0se4mwhbfk";
  const link = describeMessageLink(original);
  assert.equal(link.kind, "image"); assert.equal(link.source, "openweb"); assert.equal(link.href, original);
  assert.equal(link.embed, undefined);
  const parts = splitMessageLinks(`תמונה מהצ׳אט הישן:\n${original}\n${original}`);
  assert.equal(messageLinkPreviews(parts).length, 1);
  assert.equal(messageLinkPreviews(parts)[0].kind, "image");
  assert.equal(describeMessageLink("https://images.spot.im/v1/p/uploads/image_01.jpg").kind, "image");
  assert.equal(describeMessageLink("https://images.spot.im/v1/abc-def_123.gif").kind, "image");
});

test("legacy image support does not turn unrelated, credentialed, signed or executable URLs into image previews", () => {
  for (const url of ["http://images.spot.im/v1/abc", "https://images.spot.im.evil.test/v1/abc",
    "https://evil.test/v1/abc", "https://images.spot.im:8443/v1/abc", "https://images.spot.im/v1/abc?token=private",
    "https://images.spot.im/v1/abc#fragment", "https://images.spot.im/v1/abc.svg", "https://images.spot.im/v1/abc.html",
    "https://images.spot.im/v1/../api/users", "https://images.spot.im/v1/a%2Fb", "https://images.spot.im/v1//abc",
    "https://images.spot.im/v1/" ]) assert.equal(describeMessageLink(url).kind, "link", url);
  assert.equal(describeMessageLink("https://name:password@images.spot.im/v1/abc"), null);
});

test("external video: one detector feeds every surface; click-to-load nocookie player, refusal signal, no look-alikes", async () => {
  const { externalVideoLinksFromText, externalVideoLinksFromHtml, externalVideoEmbedSrc, externalVideoRefusal } = await import("./messageLinks.js");
  const id = "dQw4w9WgXcQ";
  const forms = [`https://www.youtube.com/watch?v=${id}&t=30`, `https://youtu.be/${id}?si=x`, `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`];
  for (const url of forms) assert.deepEqual(externalVideoLinksFromText(`צפו כאן ${url} תודה`).map(link => [link.kind, link.id]), [["youtube", id]], url);
  assert.equal(externalVideoLinksFromText(`${forms[0]} ${forms[1]} ${forms[3]}`).length, 1, "the same video once");
  for (const url of ["https://youtube.com.evil.test/watch?v=" + id, "https://evil.test/youtube.com/watch?v=" + id, `https://www.youtube.com/watch?v=${id}X`,
    "javascript:alert(1)", `https://user:pw@www.youtube.com/watch?v=${id}`, "https://music.youtube.com/watch?v=" + id]) assert.deepEqual(externalVideoLinksFromText(url), [], url);
  const html = `<p>x</p><iframe src="https://www.youtube.com/embed/${id}?feature=oembed"></iframe><a href="https://youtu.be/${id}">y</a> https://www.youtube.com/shorts/abcdefghijk`;
  assert.deepEqual(externalVideoLinksFromHtml(html).map(link => link.id), [id, "abcdefghijk"]);
  // The fallback "watch on YouTube" goes to the watch page even when the post embedded an iframe address.
  assert.deepEqual(externalVideoLinksFromHtml(html).map(link => link.watch), [`https://www.youtube.com/watch?v=${id}`, "https://www.youtube.com/watch?v=abcdefghijk"]);
  assert.equal(externalVideoLinksFromText("https://vimeo.com/76979871")[0].watch, "https://vimeo.com/76979871");
  const [link] = externalVideoLinksFromText(forms[0]);
  const src = new URL(externalVideoEmbedSrc(link, "https://sod1820.co.il"));
  assert.equal(src.origin, "https://www.youtube-nocookie.com"); assert.equal(src.pathname, `/embed/${id}`);
  assert.equal(src.searchParams.get("enablejsapi"), "1"); assert.equal(src.searchParams.get("origin"), "https://sod1820.co.il"); assert.equal(src.searchParams.get("rel"), "0");
  assert.equal(new URL(externalVideoEmbedSrc(link, "javascript:x")).searchParams.has("origin"), false);
  assert.equal(externalVideoEmbedSrc({ kind: "youtube", id: "bad" }, ""), null);
  assert.equal(externalVideoEmbedSrc({ kind: "vimeo", id: "123" }, ""), "https://player.vimeo.com/video/123?autoplay=1");
  for (const code of [100, 101, 150, 153]) assert.equal(externalVideoRefusal(JSON.stringify({ event: "onError", info: code })), code);
  for (const data of [JSON.stringify({ event: "onError", info: 2 }), JSON.stringify({ event: "infoDelivery", info: {} }), "not json", { event: "onError", info: 5 }])
    assert.equal(externalVideoRefusal(data), null);
});

test("external video wiring: Community, Now, Or HaGeula, World and the projector share the one card; heavy player only after a click", async () => {
  const { readFileSync } = await import("node:fs");
  const read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
  const card = read("src/components/experience2029/ExternalVideoFacade2029.jsx");
  assert.match(card, /state === "idle" \? <button type="button" className="sod29-external-video-cover"/);
  assert.ok(card.indexOf("<iframe") > card.indexOf('state === "idle"'), "the iframe exists only after the idle cover");
  assert.match(card, /event\.origin !== provider\.origin \|\| event\.source !== frame\.current\?\.contentWindow/);
  assert.match(card, /setState\("refused"\)/); assert.match(card, /צפייה ב־\{provider\.name\} ↗/);
  assert.doesNotMatch(card, /\bfetch\(|storage\.from|createSignedUrl|\.upload\(/, "the card never downloads, stores or copies a video");
  for (const path of ["src/components/community2029/CommunityMessageContent.jsx", "src/components/experience2029/NowPublications2029.jsx",
    "src/pages/PublicContinuity2029Page.jsx", "src/components/research/WorldPublicUpdates2029.jsx", "src/components/experience2029/ProjectorMediaCards2029.jsx"]) {
    const source = read(path);
    assert.match(source, /import ExternalVideoFacade2029 from "[./]+(?:components\/)?(?:experience2029\/)?ExternalVideoFacade2029\.jsx"/, path);
    assert.doesNotMatch(source, /youtube-nocookie\.com\/embed/, `${path} builds no player address of its own`);
  }
  assert.match(read("src/components/experience2029/NowPublications2029.jsx"), /!model\.unverified \? externalVideoLinksFromText/);
  assert.match(read("src/components/research/WorldPublicUpdates2029.jsx"), /!groupSourceAnchor\(item\) \? externalVideoLinksFromText/);
  assert.match(read("src/components/experience2029/ProjectorMediaCards2029.jsx"), /reading\.isPublicPostReadingSource\(post\)/);
});
