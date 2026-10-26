import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  authorizeFamilyInvitationEmail,
  buildFamilyInvitationEmail,
  constantTimeHexEqual,
  familyJourneyUrl,
  normalizeFamilyInvitationEmail,
  normalizeFamilyInvitationInput,
  sha256Hex,
} from "../supabase/functions/_shared/familyInvitationEmail.js";

const TOKEN = "a".repeat(64);
const CLAIM_ID = "123e4567-e89b-42d3-a456-426614174000";

test("family invitation delivery validates private input and strips navigation data", () => {
  assert.equal(normalizeFamilyInvitationEmail(" Person@Example.COM "), "person@example.com");
  assert.equal(normalizeFamilyInvitationEmail("bad address@example.com"), null);
  assert.equal(normalizeFamilyInvitationEmail("person@localhost"), null);
  assert.deepEqual(normalizeFamilyInvitationInput({
    claim_id: CLAIM_ID,
    raw_token: TOKEN.toUpperCase(),
    recipient_email: " Person@Example.COM ",
  }), { claimId: CLAIM_ID, rawToken: TOKEN, recipientEmail: "person@example.com" });
  assert.equal(normalizeFamilyInvitationInput({ claim_id: CLAIM_ID, raw_token: "short", recipient_email: "person@example.com" }), null);
  assert.equal(familyJourneyUrl("https://example.test/base?private=value#secret"), "https://example.test/2029/journey");
  assert.equal(familyJourneyUrl("javascript:alert(1)"), "https://sod1820.co.il/2029/journey");
});

test("family invitation authorization requires owner, live claim, exact token and owned target", async () => {
  const ownerPersonId = "11111111-1111-4111-8111-111111111111";
  const claim = {
    flow: "invitation",
    status: "pending",
    issuer_owner_id: ownerPersonId,
    token_hash: await sha256Hex(TOKEN),
    token_expires_at: "2026-10-27T00:00:00.000Z",
  };
  const base = { claim, ownerPersonId, rawToken: TOKEN, targetExists: true, now: new Date("2026-10-25T00:00:00.000Z") };
  assert.equal(await authorizeFamilyInvitationEmail(base), true);
  assert.equal(await authorizeFamilyInvitationEmail({ ...base, rawToken: "b".repeat(64) }), false);
  assert.equal(await authorizeFamilyInvitationEmail({ ...base, ownerPersonId: "22222222-2222-4222-8222-222222222222" }), false);
  assert.equal(await authorizeFamilyInvitationEmail({ ...base, targetExists: false }), false);
  assert.equal(await authorizeFamilyInvitationEmail({ ...base, now: new Date("2026-10-28T00:00:00.000Z") }), false);
  assert.equal(await authorizeFamilyInvitationEmail({ ...base, claim: { ...claim, status: "approved" } }), false);
  assert.equal(constantTimeHexEqual(claim.token_hash, claim.token_hash.toUpperCase()), true);
  assert.equal(constantTimeHexEqual(claim.token_hash, "0".repeat(64)), false);
});

test("family invitation email is accessible, text-backed and keeps the token out of URLs", () => {
  const email = buildFamilyInvitationEmail({ rawToken: TOKEN, siteUrl: "https://sod1820.co.il?source=private" });
  assert.match(email.html, /<html lang="he" dir="rtl">/);
  assert.match(email.html, /<main lang="he" dir="rtl"/);
  assert.equal((email.html.match(/<h1\b/g) || []).length, 1);
  assert.match(email.html, /<title>[^<]+<\/title>/);
  assert.match(email.text, new RegExp(TOKEN));
  assert.match(email.html, new RegExp(TOKEN));
  assert.equal(email.journeyUrl, "https://sod1820.co.il/2029/journey");
  for (const href of email.html.matchAll(/href="([^"]+)"/g)) assert.equal(href[1].includes(TOKEN), false);
  assert.equal(email.html.includes("שם הילד"), false);
});

test("edge sender is authenticated, owner-bound, idempotent and non-observing", () => {
  const edge = fs.readFileSync("supabase/functions/send-family-invitation-email/index.ts", "utf8");
  const adapter = fs.readFileSync("src/lib/research/familyClaimAdapter.js", "utf8");
  assert.match(edge, /admin\.auth\.getUser\(bearer\)/);
  assert.match(edge, /\.from\("persons"\).*\.eq\("account_user_id", userId\)/s);
  assert.match(edge, /\.from\("family_claims"\)/);
  assert.match(edge, /authorizeFamilyInvitationEmail/);
  assert.match(edge, /\.from\("research_objects"\)/);
  assert.match(edge, /Idempotency-Key.*family-claim-/s);
  assert.match(adapter, /body: \{ claim_id: claim, raw_token: token, recipient_email: email \}/);
  assert.doesNotMatch(edge, /verify_jwt\s*=\s*false/);
  assert.doesNotMatch(edge, /console\.|URLSearchParams|sent_to|recipient_email\s*:/);
  assert.doesNotMatch(edge, /providerResponse\.(?:text|json)\(/);
});
