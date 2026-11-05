import assert from "node:assert/strict";
import test from "node:test";
import { avatarThumb, displayAvatarUrl } from "./avatar.js";
import { resolveAuthor } from "./authors.js";

const OBJECT = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/avatars/person-1.gif";
const RENDER = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/render/image/public/gallery/avatars/person-1.gif";

test("a public storage image becomes a small contained rendition (animation is kept by the render endpoint)", () => {
  const out = new URL(avatarThumb(OBJECT));
  assert.equal(`${out.origin}${out.pathname}`, RENDER);
  assert.equal(out.searchParams.get("width"), "160");
  assert.equal(out.searchParams.get("height"), "160");
  // The no-crop law: the whole image is kept, the avatar slot's own object-fit crops for display.
  assert.equal(out.searchParams.get("resize"), "contain");
  assert.equal(out.searchParams.get("quality"), "70");
  assert.equal(new URL(avatarThumb(OBJECT, 96, 60)).searchParams.get("width"), "96");
});

test("an existing query is kept and the rendition parameters are added", () => {
  const out = new URL(avatarThumb(`${OBJECT}?t=1793502472060`));
  assert.equal(out.searchParams.get("t"), "1793502472060");
  assert.equal(out.searchParams.get("width"), "160");
});

test("anything that is not a public https object of Supabase Storage is returned untouched", () => {
  for (const value of [
    "/community-avatars/090688eb8d8b7febc9c3.jpg",
    "/logo.png",
    "https://example.com/storage/v1/object/public/gallery/a.gif",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/render/image/public/gallery/avatars/person-1.gif?width=96",
    "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/sign/gallery/avatars/person-1.gif",
    "http://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/avatars/person-1.gif",
    "not a url",
    "",
  ]) assert.equal(avatarThumb(value), value, value);
  assert.equal(avatarThumb(null), null);
  assert.equal(avatarThumb(undefined), undefined);
});

test("displayAvatarUrl keeps its validation and only returns a rendition when a size is asked for", () => {
  assert.equal(displayAvatarUrl(OBJECT), OBJECT);
  assert.equal(displayAvatarUrl(` ${OBJECT} `), OBJECT);
  assert.equal(new URL(displayAvatarUrl(OBJECT, { size: 160 })).pathname, new URL(RENDER).pathname);
  for (const unsafe of ["javascript:alert(1)", "data:image/svg+xml,<svg/>", "http://example.com/a.png", "https://user:pw@example.com/a.png", "https://example.com:8443/a.png", "/local.png", "", null, undefined, 5]) {
    assert.equal(displayAvatarUrl(unsafe), null, String(unsafe));
    assert.equal(displayAvatarUrl(unsafe, { size: 160 }), null, String(unsafe));
  }
  assert.equal(displayAvatarUrl("https://example.com/a.png", { size: 160 }), "https://example.com/a.png");
});

test("the writer registry serves the animated author avatar as a rendition instead of the 700 KB original", () => {
  const author = resolveAuthor("בדרך לנצח");
  const url = new URL(author.avatar);
  assert.match(url.pathname, /^\/storage\/v1\/render\/image\/public\/gallery\/sod1820\/authors\/baderech-lanetzach\.gif$/);
  assert.equal(url.searchParams.get("width"), "160");
  assert.equal(resolveAuthor("המערכת").avatar, "/logo.png");
});
