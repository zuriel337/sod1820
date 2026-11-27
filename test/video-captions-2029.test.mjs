import test from "node:test";
import assert from "node:assert/strict";
import { videoCaptionCandidates2029 } from "../src/lib/research/videoCaptions2029.js";

const S = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/";

test("a canonical video has its captions beside it, Hebrew first", () => {
  const got = videoCaptionCandidates2029({ mediaHref: `${S}media/sod1820/2029/video/2026/11/e28bfb09-0465-5c9e-b272-3f0d2dafbe35/original.mp4` });
  assert.deepEqual(got.map(c => c.lang), ["he", "ar", "en"]);
  assert.equal(got[0].src, `${S}media/sod1820/2029/video/2026/11/e28bfb09-0465-5c9e-b272-3f0d2dafbe35/captions/he.vtt`);
  assert.equal(got[0].label, "עברית");
});

test("a channel video stored elsewhere uses its occurrence folder by UTC month", () => {
  const got = videoCaptionCandidates2029({
    mediaHref: `${S}gallery/sod1820/broadcasts/AC2D3225813DF715A9288E77497D293E.mp4`,
    occurrenceId: "247325D5-4dc0-41b2-a941-9374e1107139", at: "2026-07-27T15:46:46Z",
  });
  assert.equal(got[0].src, `${S}media/sod1820/2029/video/2026/07/orgeula-247325d5-4dc0-41b2-a941-9374e1107139/captions/he.vtt`);
});

test("no captions for non-video, foreign, rendition or unidentified media", () => {
  assert.deepEqual(videoCaptionCandidates2029({ mediaHref: `${S}media/sod1820/2029/image/2026/11/x/original.jpg` }), []);
  assert.deepEqual(videoCaptionCandidates2029({ mediaHref: "https://example.com/a.mp4" }), []);
  assert.deepEqual(videoCaptionCandidates2029({ mediaHref: `${S}gallery/sod1820/broadcasts/x.mp4` }), []);
  assert.deepEqual(videoCaptionCandidates2029({ mediaHref: `${S}gallery/sod1820/broadcasts/x.mp4`, occurrenceId: "not-a-uuid", at: "2026-07-01" }), []);
  assert.deepEqual(videoCaptionCandidates2029({}), []);
});
