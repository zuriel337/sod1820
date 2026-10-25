import { supabase } from "../supabase.js";

const clean = value => String(value || "").trim();

function requireClient() {
  if (!supabase) throw new Error("family_claim_client_unavailable");
  return supabase;
}

function throwRpcError(error) {
  if (error) throw error;
}

function safeClaim(row) {
  if (!row || typeof row !== "object") return null;
  return Object.freeze({
    id: clean(row.id),
    flow: clean(row.flow),
    status: clean(row.status),
    target_ref: clean(row.target_ref),
    created_at: row.created_at || null,
    reviewed_at: row.reviewed_at || null,
    consumed_at: row.consumed_at || null,
    token_expires_at: row.token_expires_at || null,
    has_claimant: row.has_claimant === true,
  });
}

export async function listMyFamilyClaims() {
  const { data, error } = await requireClient().rpc("fn_list_my_family_claims");
  throwRpcError(error);
  return (Array.isArray(data) ? data : []).map(safeClaim).filter(Boolean);
}

export async function createFamilyInvitation(ownerPersonId, targetRef, ttlDays = 7) {
  const owner = clean(ownerPersonId);
  const target = clean(targetRef);
  if (!owner || !target) throw new Error("family_claim_missing_target");
  const { data, error } = await requireClient().rpc("fn_create_family_invitation", {
    p_owner: owner,
    p_target_ref: target,
    p_ttl_days: ttlDays,
  });
  throwRpcError(error);
  return Object.freeze({
    id: clean(data?.id),
    token: clean(data?.token),
    target_ref: clean(data?.target_ref),
    expires_at: data?.expires_at || null,
  });
}

export async function redeemFamilyInvitation(rawToken) {
  const token = clean(rawToken);
  if (!token) throw new Error("family_claim_missing_token");
  const { data, error } = await requireClient().rpc("fn_redeem_family_invitation", {
    p_raw_token: token,
  });
  throwRpcError(error);
  return Object.freeze({
    id: clean(data?.id),
    target_ref: clean(data?.target_ref),
    status: clean(data?.status),
  });
}

export async function revokeFamilyClaim(claimId) {
  const id = clean(claimId);
  if (!id) throw new Error("family_claim_missing_id");
  const { data, error } = await requireClient().rpc("fn_revoke_family_claim", {
    p_claim_id: id,
  });
  throwRpcError(error);
  return Object.freeze({ id: clean(data?.id), status: clean(data?.status) });
}

export function familyClaimErrorMessage(error) {
  const message = [error?.message, error?.details, error?.hint, error]
    .find(value => typeof value === "string" && value.trim())?.trim() || "";
  if (/issuer cannot redeem own|issuer self-redeem/i.test(message)) return "אי אפשר לפדות הזמנה שנוצרה מהחשבון שלך. את הקוד פודים מהחשבון הנפרד של בן המשפחה.";
  if (/token has been revoked/i.test(message)) return "קוד ההזמנה בוטל ואינו פעיל עוד.";
  if (/token already used/i.test(message)) return "קוד ההזמנה כבר נוצל.";
  if (/token has expired/i.test(message)) return "תוקף קוד ההזמנה פג.";
  if (/invalid token/i.test(message)) return "קוד ההזמנה אינו תקין.";
  if (/missing token|family_claim_missing_token/i.test(message)) return "יש להזין קוד הזמנה.";
  if (/arbitration required|duplicate key|family_claims_target_active_uq/i.test(message)) return "כבר קיים חיבור פעיל או ממתין עבור האדם הזה.";
  return "לא ניתן להשלים כרגע את פעולת החיבור. המידע הפרטי לא שונה.";
}
