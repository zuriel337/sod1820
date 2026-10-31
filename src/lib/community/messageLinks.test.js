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
