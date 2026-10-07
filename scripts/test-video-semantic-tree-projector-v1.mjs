import test from "node:test";
import assert from "node:assert/strict";
import {
  readVideoSemanticMap,
  contextualVideosFromMaps,
  videoUrlForAnchor,
} from "../src/lib/research/videoSemanticMap.js";
import {
  analyzeVideoSemanticMap,
  semanticMapRpcArgs,
} from "../supabase/functions/_shared/videoSemanticMap.js";

const row = {
  id: "ro-1",
  source_ref: "video:abc",
  meta: {
    ext: {
      video_semantic_map: {
        version: 1,
        map_key: "video:abc:sha256:test",
        video_public_id: "abc",
        video_key: "post:5112:test",
        media_url: "https://example.invalid/video.mp4",
        poster_url: "https://example.invalid/poster.jpg",
        mapping_basis: "timed_transcript",
        source_role: "representation",
        independent_evidence: false,
        anchors: [
          { id: "a718", start_sec: 123, end_sec: 188, labels: ["718", "חדשות", "שביעי באוקטובר"] },
          { id: "a1202", start_sec: 188, end_sec: 241, labels: ["1202", "התגלות משיח"] },
        ],
      },
    },
  },
};

test("reads only the bounded video semantic-map shape", () => {
  const map = readVideoSemanticMap(row);
  assert.equal(map.videoPublicId, "abc");
  assert.equal(map.independentEvidence, false);
  assert.equal(map.anchors.length, 2);
  assert.deepEqual(map.anchors[0].labels, ["718", "חדשות", "שביעי באוקטובר"]);
});

test("Projector selects a stored segment from context without rescanning media", () => {
  const map = readVideoSemanticMap(row);
  const hits = contextualVideosFromMaps([map], {
    dimensions: { surfaceFocus: { type: "number", id: "718", number: 718, label: "718" } },
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].anchor.id, "a718");
  assert.equal(videoUrlForAnchor(hits[0]), "https://example.invalid/video.mp4#t=123,188");
});

test("untimed map never invents a seek fragment", () => {
  const map = readVideoSemanticMap({
    id: "ro-2",
    source_ref: "video:def",
    meta: { ext: { video_semantic_map: {
      map_key: "video:def:test",
      media_url: "https://example.invalid/old.mp4",
      anchors: [{ id: "a73", ordinal: 1, labels: ["73", "חכמה"] }],
    } } },
  });
  const hit = contextualVideosFromMaps([map], {
    dimensions: { readingFocus: { label: "חכמה", number: 73 } },
  })[0];
  assert.equal(hit.anchor.startSec, null);
  assert.equal(videoUrlForAnchor(hit), "https://example.invalid/old.mp4");
});

test("grounded extractor keeps only exact source quotes and explicit time tokens", async () => {
  const source = "[00:02:03] חדשות שבע מאות שמונה עשרה. תאריך שש מאות שלושים ואחד.";
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      usage: { input_tokens: 10, output_tokens: 10 },
      content: [{ type: "text", text: JSON.stringify({
        anchors: [
          {
            id: "news",
            kind: "number",
            labels: ["חדשות", "718"],
            exact_quote: "חדשות שבע מאות שמונה עשרה",
            value: 718,
            source_role: "claim",
            start_timecode: "00:02:03",
          },
          {
            id: "hallucinated",
            kind: "person",
            labels: ["לא במקור"],
            exact_quote: "טקסט שלא קיים",
            value: null,
            source_role: "mention",
            start_timecode: "00:04:00",
          },
        ],
      }) }],
    }),
  });

  const result = await analyzeVideoSemanticMap({
    text: source,
    title: "בדיקה",
    videoKey: "video-1",
    mediaUrl: "https://example.invalid/v.mp4",
    anthropicKey: "test-key",
    fetchImpl: fakeFetch,
  });
  assert.equal(result.ok, true);
  assert.equal(result.map.anchors.length, 1);
  assert.equal(result.map.anchors[0].start_sec, 123);
  assert.equal(result.map.anchors[0].exact_quote, "חדשות שבע מאות שמונה עשרה");
  assert.match(result.map.map_key, /^video:video-1:sha256:/);
});

test("RPC envelope remains a private Research Intake map request, not a truth transition", async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify({
        anchors: [{
          id: "fz",
          kind: "event",
          labels: ["FZ1073"],
          exact_quote: "FZ1073",
          value: 1073,
          source_role: "mention",
          start_timecode: null,
        }],
      }) }],
    }),
  });
  const result = await analyzeVideoSemanticMap({
    text: "FZ1073",
    videoKey: "asset-1",
    mediaUrl: "https://example.invalid/a.mp4",
    anthropicKey: "test-key",
    fetchImpl: fakeFetch,
  });
  const args = semanticMapRpcArgs(result);
  assert.equal(args.p_source_ref, "video:asset-1");
  assert.equal(args.p_meta.ext.video_semantic_map.source_role, "representation");
  assert.equal(args.p_meta.ext.video_semantic_map.independent_evidence, false);
  assert.ok(!("status" in args));
  assert.ok(!("privacy_scope" in args));
});
