import test from "node:test";
import assert from "node:assert/strict";
import { NOW_CHANNEL_COVERAGE_SCOPE, classifyStoredChannelMedia, projectNowChannelIntakeCoverage } from "../src/lib/research/nowChannelIntakeCoverage2029.js";

test("media classification does not make private/public attachment display authorized", () => {
  const cases = [
    ["https://example.org/p.jpg", "image"],
    ["https://example.org/v.mp4", "video"],
    ["https://example.org/a.ogg", "audio"],
    ["storage-object:private-id", "restricted_unknown"],
    ["http://example.org/a.jpg", "other"],
    [null, "text"],
  ];
  for (const [url, kind] of cases) {
    const result = classifyStoredChannelMedia({ url });
    assert.equal(result.kind, kind);
    assert.equal(result.publicDisplayAuthorized, false);
    assert.equal("url" in result, false);
  }
});

test("2029 Now reader is distinct from ingest and public database status", () => {
  const actual = projectNowChannelIntakeCoverage({
    sources: [
      { channel: "or-geula", display_name: "אור הגאולה", enabled: true, intake_mode: "story_first_selective", last_run_at: "2026-11-04T18:00:00Z" },
      { channel: "torat-haremez", display_name: "תורת הרמז", enabled: true, intake_mode: "research_first" },
    ],
    statusCounts: [
      { channel: "or-geula", status: "live", last7: 17, last30: 59 },
      { channel: "torat-haremez", status: "private", last7: 72, last30: 185 },
    ],
    mediaCounts: [{ channel: "or-geula", mediaKind: "image", last30: 17 }, { channel: "or-geula", mediaKind: "video", last30: 33 }],
    nowReaderChannels: ["or-geula"],
    asOf: "2026-11-05T01:00:00Z",
    audioIngestCapability: "not_supported_in_wa_channel_ingest",
  });
  assert.equal(actual.scope, NOW_CHANNEL_COVERAGE_SCOPE);
  assert.equal(actual.channelCount, 2);
  const or = actual.channels.find(c => c.channel === "or-geula");
  assert.equal(or.nowReaderAdmitted, true);
  assert.equal(or.last7.measuredTotal, 17);
  assert.equal(or.last30.measuredTotal, 59);
  assert.equal(or.mediaLast30.image, 17);
  assert.equal(or.mediaLast30.video, 33);
  assert.equal(or.last7PublicAppearanceVerified, false);
  assert.equal(or.approvedSeriesMembershipCount, null);
  assert.equal(or.sourceMediaPublicPermissionChanged, false);
  const torat = actual.channels.find(c => c.channel === "torat-haremez");
  assert.equal(torat.nowReaderAdmitted, false);
  assert.equal(torat.last7.privateStatus, 72);
  assert.equal(torat.last7.publicStatusLive, null);
  assert.equal(actual.unpublishedMediaAutomaticallyAuthorized, false);
  assert.equal(actual.privateSourceContentIncluded, false);
});

test("missing counts are unknown, never a false zero", () => {
  const result = projectNowChannelIntakeCoverage({ sources: [{ channel: "or-geula" }] });
  assert.equal(result.channels[0].last7.measuredTotal, null);
  assert.equal(result.channels[0].mediaLast30, null);
  assert.equal(result.channels[0].last7.publicStatusLive, null);
  assert.equal(result.channels[0].lastPollAt, null);
});

test("admin aggregate output contains no sender names, message bodies, private media refs or raw ids", () => {
  const result = projectNowChannelIntakeCoverage({
    sources: [{ channel: "or-geula", label: "אור הגאולה", chat_id: "secret-chat", admin_ids: ["private"] }],
    statusCounts: [{ channel: "or-geula", status: "private", last7: 3, last30: 7, body: "DO NOT EXPOSE" }],
  });
  const body = JSON.stringify(result);
  for (const secret of ["secret-chat", "DO NOT EXPOSE", "private-id", "admin_ids"]) assert.equal(body.includes(secret), false);
});
