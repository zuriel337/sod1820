import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicCipherContentProjection, buildPublicLanguageContentProjection, buildPublicMediaContentProjection } from "../src/lib/research/worldKnowledgeContentProjection.js";

test("public ciphers enter the shared envelope as source identities, not topics", () => {
  const projection = buildPublicCipherContentProjection([{ id: "c1", slug: "cipher-1", title: "צופן" }]);
  assert.equal(projection.metrics.corpusSources, 1);
  assert.equal(projection.sources[0].sourceRef, "els_records:c1");
  assert.equal(projection.compatibility.legacyTopics.length, 0);
  assert.equal(projection.treeRelations.length, 0);
});

test("public media keeps exact source identity and representation separate", () => {
  const projection = buildPublicMediaContentProjection([{
    mediaId: "media:gallery_image:g1", imageUrl: "https://example.test/g1.jpg", label: "תמונה",
    provenance: { sourceRef: "gallery_images:g1" }, reopen: { galleries: [{ href: "/archive?gal=1" }] },
  }]);
  assert.equal(projection.metrics.corpusSources, 1);
  assert.equal(projection.sources[0].sourceRef, "gallery_images:g1");
  assert.equal(projection.sources[0].media[0].href, "https://example.test/g1.jpg");
  assert.equal(projection.findings.length, 0);
});

test("approved language bridges are sources with explicit verification states outside the identity", () => {
  const projection = buildPublicLanguageContentProjection([
    { id: "l1", hebrew: "שלום", foreignWord: "shalom", status: "approved", state: "verified_with_source" },
    { id: "l2", hebrew: "פרטי", foreignWord: "private", status: "draft" },
  ]);
  assert.equal(projection.metrics.corpusSources, 1);
  assert.equal(projection.sources[0].sourceRef, "language_links:l1");
  assert.equal(projection.findings.length, 0, "a language link is not promoted to a finding by the adapter");
});
