// Consent-based account link (historical only). Shipped DARK: nothing runs unless VITE_ACCOUNT_LINK_OFFER=1.
// The signed-in account can only ask "is there an offer for ME"; the other account is never returned before proof.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";

export const ACCOUNT_LINK_ENABLED = (() => { try { return import.meta.env?.VITE_ACCOUNT_LINK_OFFER === "1"; } catch { return false; } })();
export const ACCOUNT_LINK_FUNCTION = `${SUPABASE_URL}/functions/v1/account-link-confirm`;

export function normalizeOffer(data) {
  const row = Array.isArray(data) ? data[0] : data;
  const id = typeof row?.offer_id === "string" && /^[0-9a-f-]{36}$/i.test(row.offer_id) ? row.offer_id : null;
  return id && row.state === "offered" ? { id } : null;
}

export async function fetchAccountLinkOffer(client) {
  const { data, error } = await client.rpc("account_link_offer_v1");
  return error ? null : normalizeOffer(data);
}
export async function dismissAccountLinkOffer(client, offerId) {
  const { data, error } = await client.rpc("account_link_dismiss_v1", { p_offer: offerId });
  return !error && data === true;
}
export async function beginAccountLink(client, offerId) {
  const { data, error } = await client.rpc("account_link_begin_v1", { p_offer: offerId });
  return !error && typeof data === "string" && data.length >= 32 ? data : null;
}

// Proof of control of the OTHER (primary) account: OTP to that account's own email in a separate, non-persisted client.
export async function createProofClient() {
  // Static import: the SDK is already part of the entry graph (supabase.js), and the repository's Realtime contract only accepts the statically checked createClient import.
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "sod-account-link-proof" } });
}
export async function sendPrimaryOtp(proof, email) {
  const { error } = await proof.auth.signInWithOtp({ email: String(email || "").trim(), options: { shouldCreateUser: false } });
  return !error;
}
export async function verifyPrimaryOtp(proof, email, code) {
  const { data, error } = await proof.auth.verifyOtp({ email: String(email || "").trim(), token: String(code || "").trim(), type: "email" });
  return error ? null : data?.session?.access_token || null;
}
export async function confirmAccountLink({ secondaryAccessToken, offerId, nonce, primaryAccessToken, fetchImpl = fetch }) {
  const res = await fetchImpl(ACCOUNT_LINK_FUNCTION, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secondaryAccessToken}`, apikey: SUPABASE_ANON },
    body: JSON.stringify({ offerId, nonce, primaryAccessToken }),
  });
  const body = await res.json().catch(() => null);
  return res.ok && (body?.status === "verified" || body?.status === "already_verified");
}
