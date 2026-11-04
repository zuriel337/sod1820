import test from "node:test";
import assert from "node:assert/strict";
import { NOW_ATTENTION_SCOPE, projectNowAttention } from "../src/lib/nowAttentionSnapshot2029.js";

const publication = (id, at, more = {}) => ({
  id, at, sourceName: "זרם המציאות", media: "text", unverified: false, ...more,
});

test("Now snapshot counts only already-loaded public rows, not whole-site activity", () => {
  const rows = [
    publication("post:1", "2026-11-03T22:30:00Z", { media: "video", sourceName: "מימד חמש" }),
    publication("post:2", "2026-11-04T11:00:00Z", { media: "image", sourceName: "מימד חמש" }),
    publication("group:3", "2026-11-02T09:00:00Z", { unverified: true, sourceName: "צבי" }),
    publication("post:4", null, { media: "text", sourceName: "" }),
  ];
  const snapshot = projectNowAttention(rows, {
    sourceStates: [{ status: "read" }, { status: "measured_empty" }],
    detailsRequested: true,
  });
  assert.equal(snapshot.scope, NOW_ATTENTION_SCOPE);
  assert.deepEqual(snapshot.activity, {
    sampledPublicEntries: 4,
    datedEntries: 3,
    untimedEntries: 1,
    unverifiedSourceEntries: 1,
    namedPublicSources: 2,
    media: { video: 1, image: 1, text: 2 },
  });
  assert.equal(snapshot.readerCoverage.state, "measured_window");
  assert.equal(snapshot.readerCoverage.sitewideCoverageKnown, false);
  assert.deepEqual(snapshot.publicationTimeline.days.map(group => [group.day, group.entries]), [
    ["2026-11-04", 2], // 22:30Z on Nov 3 is Nov 4 in Jerusalem.
    ["2026-11-02", 1],
  ]);
  assert.equal(snapshot.publicationTimeline.meaning, "publication_or_source_arrival_time_only");
  assert.equal(snapshot.connectionStrength, null);
  assert.equal(snapshot.personalizedAttention, null);
});

test("no source read must never be reported as complete or as zero site activity", () => {
  const noData = projectNowAttention([], { detailsRequested: false });
  assert.equal(noData.readerCoverage.state, "not_requested");
  assert.equal(noData.readerCoverage.sitewideCoverageKnown, false);
  assert.equal(noData.activity.sampledPublicEntries, 0);
  assert.equal(projectNowAttention([], { detailsRequested: true }).readerCoverage.state, "unknown");
  assert.equal(projectNowAttention([], { detailsRequested: true, loading: true }).readerCoverage.state, "loading");
  assert.equal(projectNowAttention([], { detailsRequested: true, error: true }).readerCoverage.state, "unavailable");
  const measuredEmpty = projectNowAttention([], {
    detailsRequested: true, sourceStates: [{ status: "measured_empty" }],
  });
  assert.equal(measuredEmpty.readerCoverage.state, "measured_window");
  assert.equal(measuredEmpty.readerCoverage.sitewideCoverageKnown, false);
});

test("failed or access-filtered sources remain partial/unavailable, not false empty", () => {
  const opts = {
    detailsRequested: true,
    sourceStates: [{ status: "read" }, { status: "failed" }, { status: "access_filtered" }],
    unavailableSources: ["group-arrival-reader"],
  };
  const partial = projectNowAttention([publication("post:x", "2026-11-04T10:00:00Z")], opts);
  assert.equal(partial.readerCoverage.state, "partial");
  assert.equal(partial.readerCoverage.failedOrFilteredReaders, 2);
  assert.equal(partial.readerCoverage.unavailableStreamSources, 1);
  assert.equal(partial.readerCoverage.countedReaders, 3);
  assert.equal(projectNowAttention([], opts).readerCoverage.state, "unavailable");
});

test("repeat IDs and explicitly private rows are not admitted into the derived snapshot", () => {
  const rows = [
    publication("post:1", "2026-11-04T10:00:00Z"),
    publication("post:1", "2026-11-04T11:00:00Z"),
    publication("private:2", "2026-11-04T11:00:00Z", { item: { privacy_scope: "private" } }),
    publication("private:3", "2026-11-04T11:00:00Z", { item: { visibility: "private" } }),
    publication("post:4", "not-a-date", { media: "not-a-medium" }),
    { id: null, at: "2026-11-04T11:00:00Z" },
  ];
  const snapshot = projectNowAttention(rows);
  assert.equal(snapshot.activity.sampledPublicEntries, 2);
  assert.equal(snapshot.activity.untimedEntries, 1);
  assert.deepEqual(snapshot.publicationTimeline.days[0].publicIds, ["post:1"]);
  assert.deepEqual(snapshot.activity.media, { video: 0, image: 0, text: 2 });
});

test("publication timeline is bounded without rewriting source IDs or inventing missing dates", () => {
  const rows = Array.from({ length: 6 }, (_, n) => publication(
    "post:" + n,
    new Date(Date.UTC(2026, 10, n + 1, 12)).toISOString(),
  ));
  const snapshot = projectNowAttention(rows, {
    maxDays: 2,
    detailsRequested: true,
    sourceStates: [{ status: "read" }],
  });
  assert.deepEqual(snapshot.publicationTimeline.days.map(group => group.day), [
    "2026-11-06", "2026-11-05",
  ]);
  assert.equal(snapshot.publicationTimeline.dayCount, 6);
  assert.equal(snapshot.publicationTimeline.omittedDayCount, 4);
  assert.equal(snapshot.activity.sampledPublicEntries, 6);
});

test("no output contains raw message content, contact identifiers, ranking or personal state", () => {
  const snapshot = projectNowAttention([publication("post:10", "2026-11-04T09:00:00Z", {
    fullText: "PRIVATE CONTENT 050-123-4567",
    item: { fullText: "PRIVATE CONTENT", email: "a@b.test" },
  })], { detailsRequested: true, sourceStates: [{ status: "read" }] });
  const json = JSON.stringify(snapshot);
  assert.ok(!json.includes("PRIVATE CONTENT"));
  assert.ok(!json.includes("050-123-4567"));
  assert.ok(!json.includes("a@b.test"));
  assert.ok(!json.includes("score"));
  assert.equal(snapshot.connectionStrength, null);
  assert.equal(snapshot.personalizedAttention, null);
});
