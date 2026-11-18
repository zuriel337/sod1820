// Skeleton, not wired into CI. Run: node --test <this dir>
import test from "node:test";
import assert from "node:assert/strict";
import { elsFindingShareUrl, elsFindingWorkspaceHref, parseElsFindingAddress, SITE } from "../elsFindingShare.draft.mjs";
import { approvedExact, memberPendingSubmission, ownerSharedDraft, privateDraft, approvedLegacy } from "./fixtures.mjs";

test("approved record shares its existing canonical public address /codes/<slug>", () => {
  const url = elsFindingShareUrl(approvedExact);
  assert.equal(url, `${SITE}/codes/${encodeURIComponent("משיח-17")}`);
  assert.deepEqual(parseElsFindingAddress(url), { kind: "record", via: "public-page", slug: "משיח-17" });
});

test("legacy approved record is still shareable (it opens as saved image, see open-plan tests)", () => {
  assert.ok(elsFindingShareUrl(approvedLegacy));
});

test("no public link without a public basis: private draft and an un-consented pending submission", () => {
  assert.equal(elsFindingShareUrl(privateDraft), null);
  assert.equal(elsFindingShareUrl(memberPendingSubmission), null);           // submission for review is not publication
  assert.ok(elsFindingShareUrl(ownerSharedDraft, { explicitShare: true }));  // only after the explicit choice
});

test("the share link carries no account data, token or research context", () => {
  const url = new URL(elsFindingShareUrl(approvedExact));
  assert.equal(url.search, "");
  assert.equal(url.hash, "");
  for (const leaked of [approvedExact.id, approvedExact.owner_user_id, "access_token", "visitor", "t-secret"]) {
    assert.ok(!url.href.includes(leaked), leaked);
  }
});

test("workspace address is the existing /code?cipher=<slug>; a share never uses ?record=<uuid>", () => {
  assert.equal(elsFindingWorkspaceHref(approvedExact), `/code?cipher=${encodeURIComponent("משיח-17")}`);
  assert.deepEqual(parseElsFindingAddress(`/code?record=${approvedExact.id}`), { kind: "record-id", via: "workspace", ownerOnly: true });
  assert.ok(!elsFindingShareUrl(approvedExact).includes("record="));
});

test("parser: accepted shapes and refusals", () => {
  assert.deepEqual(parseElsFindingAddress("/code?cipher=%D7%90%D7%91"), { kind: "record", via: "workspace", slug: "אב" });
  assert.deepEqual(parseElsFindingAddress("/els?cipher=אב"), { kind: "record", via: "workspace", slug: "אב" });
  assert.deepEqual(parseElsFindingAddress("/code?mode=classic#els-matrix=abc"), { kind: "fragment", via: "workspace" });
  assert.equal(parseElsFindingAddress("/codes/מחקר"), null);                       // the unlisted collection, not a record
  assert.equal(parseElsFindingAddress("/codes/a%2Fb"), null);                      // encoded slash
  assert.equal(parseElsFindingAddress("/codes/x/y"), null);
  assert.equal(parseElsFindingAddress("https://evil.example/codes/x"), null);      // other origin
  assert.equal(parseElsFindingAddress("/code"), null);                             // the cipher page alone is not a finding (decision 3)
  assert.equal(parseElsFindingAddress("/code?cipher="), null);
});
