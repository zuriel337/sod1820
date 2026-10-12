import test from "node:test";
import assert from "node:assert/strict";
import { projectHomeWorldPreviewItem } from "./home2029Projection.js";
import { groupRowToWorldUpdate } from "./worldGroupSource.js";
import { postRowToWorldUpdate, topicRowToWorldUpdate } from "./worldDiscoveryStream.js";

test("Home carries the same readable group source occurrence as World before research", () => {
  const source = groupRowToWorldUpdate({
    id: "group-1", body: "דברי מקור", created_at: "2026-10-09T08:00:00Z",
    contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true,
    proof_basis: "verified_phone_unique",
  });
  const home = projectHomeWorldPreviewItem(source);
  assert.equal(home.kind, "source");
  assert.equal(home.sourceKind, "group_message");
  assert.equal(home.sourceRef, source.sourceRef);
  assert.equal(home.href, source.href);
  assert.equal(home.fullText, "דברי מקור");
  assert.equal(home.creator, "צבי");
  assert.equal(home.arrivalAt, "2026-10-09T08:00:00.000Z");
  assert.equal(home.researchCount, 0);
  assert.equal(home.slug, undefined);
});

test("Home retains post opening and approved topic slug as distinct destinations", () => {
  const post = projectHomeWorldPreviewItem(postRowToWorldUpdate({
    id: 17, slug: "source", title: "דברי מקור", author: "מחבר", date: "2026-10-09T08:00:00Z",
    tags: [], home_hidden: false,
  }));
  const topic = projectHomeWorldPreviewItem(topicRowToWorldUpdate({
    id: "topic-1", slug: "gathering", title: "התכנסות", approved_at: "2026-10-09T09:00:00Z",
  }));
  assert.equal(post.href, "/post/source");
  assert.equal(post.sourceKind, "post");
  assert.equal(topic.slug, "gathering");
  assert.equal(topic.kind, "convergence");
  assert.equal(topic.href, null);
});
