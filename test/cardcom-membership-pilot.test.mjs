import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.CARDCOM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const {
  cardcomExpirationMMYY,
  decryptCardcomToken,
  encryptCardcomToken,
} = await import("../server/cardcom-subscription.js");

test("CardCom token envelope round-trips without storing plaintext", () => {
  const token = "pilot-token-value";
  const encrypted = encryptCardcomToken(token);
  assert.equal(decryptCardcomToken(encrypted), token);
  assert.notEqual(encrypted.ciphertext, token);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.tag);
});

test("CardCom token expiration converts to required MMYY", () => {
  assert.equal(cardcomExpirationMMYY({ CardMonth: 6, CardYear: 2028 }), "0628");
  assert.equal(cardcomExpirationMMYY({ TokenExDate: "20271101" }), "1127");
});

test("pilot is fixed to ILS 2, admin-only, token-based and idempotent", async () => {
  const start = await readFile(new URL("../api/cardcom-subscription-start.js", import.meta.url), "utf8");
  const renew = await readFile(new URL("../server/cardcom-subscription.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261026120150_cardcom_membership_pilot_v1.sql", import.meta.url), "utf8");

  assert.match(start, /Operation:\s*"ChargeAndCreateToken"/);
  assert.match(start, /Amount:\s*2/);
  assert.match(start, /verifySupabaseAdmin/);
  assert.match(renew, /ExternalUniqTranId:/);
  assert.match(renew, /ExternalUniqTranIdResponse:\s*true/);
  assert.match(migration, /amount_ils\s*=\s*2\.00/);
  assert.match(migration, /role\s*=\s*'admin'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /private\.cardcom_subscription_credentials/);
  assert.match(migration, /membership_subscription_pilots_user_created_idx/);
  assert.match(migration, /membership_subscription_pilots_due_idx/);
  assert.match(migration, /membership_subscription_pilot_charges_subscription_idx/);
  assert.match(migration, /if v_charge\.status <> 'pending'/);
  assert.doesNotMatch(migration, /service_role/i);
});
