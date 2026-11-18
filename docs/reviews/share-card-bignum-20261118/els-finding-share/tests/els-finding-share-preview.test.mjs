// Skeleton, not wired into CI. Preview (Open Graph) uses public fields only and states the approval status.
import test from "node:test";
import assert from "node:assert/strict";
import { elsFindingPreview, viewerAccess } from "../elsFindingShare.draft.mjs";
import { approvedExact, ownerSharedDraft, privateDraft, approvedLegacy } from "./fixtures.mjs";

test("approved: indexable, matrix card image, canonical /codes/<slug>", () => {
  const p = elsFindingPreview(approvedExact, { access: viewerAccess(approvedExact) });
  assert.equal(p.status, 200);
  assert.equal(p.robots, "index, follow");
  assert.equal(p.image, approvedExact.image_url);
  assert.match(p.canonical, /\/codes\//);
  assert.match(p.description, /אושר ופורסם/);
});

test("explicitly shared, unapproved: noindex and the description says it is not approved", () => {
  const p = elsFindingPreview(ownerSharedDraft, { access: viewerAccess(ownerSharedDraft, { explicitShare: true }) });
  assert.equal(p.robots, "noindex, follow");
  assert.match(p.description, /לא אושר/);
});

test("image falls back to the saved matrix shape, then to the branded card", () => {
  const noCard = { ...approvedExact, image_url: null };
  assert.equal(elsFindingPreview(noCard, { access: "public-approved" }).image, approvedExact.positions.shapeUrl);
  const neither = { ...approvedLegacy, image_url: null, positions: {} };
  assert.match(elsFindingPreview(neither, { access: "public-approved" }).image, /\/api\/card\?/);
});

test("no account data, engine detail or other research in the preview", () => {
  const text = JSON.stringify(elsFindingPreview(approvedExact, { access: "public-approved" }));
  for (const leaked of [approvedExact.owner_user_id, approvedExact.id, "t-secret", "engine_detail", "author"]) assert.ok(!text.includes(leaked), leaked);
});

test("private or missing: 404 without metadata", () => {
  assert.deepEqual(elsFindingPreview(privateDraft, { access: viewerAccess(privateDraft) }), { status: 404, robots: "noindex, follow" });
  assert.deepEqual(elsFindingPreview(null, { access: "unavailable" }), { status: 404, robots: "noindex, follow" });
});
