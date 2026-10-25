import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  authorizeFamilyInvitationEmail,
  buildFamilyInvitationEmail,
  normalizeFamilyInvitationInput,
} from "../_shared/familyInvitationEmail.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("FAMILY_INVITE_FROM") ?? Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const REPLY_TO = Deno.env.get("NEWSLETTER_REPLY_TO") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://sod1820.co.il";
const MAX_BODY_BYTES = 2048;

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) return json({ error: "invalid_request" }, 400);

  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) return json({ error: "service_unavailable" }, 503);
    const bearer = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!bearer) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(bearer);
    const userId = authData?.user?.id;
    if (authError || !userId) return json({ error: "unauthorized" }, 401);

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "invalid_request" }, 400);
    const input = normalizeFamilyInvitationInput(JSON.parse(rawBody || "{}"));
    if (!input) return json({ error: "invalid_request" }, 400);

    const [{ data: owner, error: ownerError }, { data: claim, error: claimError }] = await Promise.all([
      admin.from("persons").select("person_id").eq("account_user_id", userId).limit(1).maybeSingle(),
      admin.from("family_claims")
        .select("id,flow,status,target_ref,issuer_owner_id,token_hash,token_expires_at")
        .eq("id", input.claimId)
        .maybeSingle(),
    ]);
    if (ownerError || claimError || !owner?.person_id || !claim) return json({ error: "invitation_not_available" }, 403);

    const targetPrefix = `person:${owner.person_id}:p:%`;
    const { data: target, error: targetError } = await admin.from("research_objects")
      .select("id")
      .eq("owner_person_id", owner.person_id)
      .eq("kind", "observation")
      .eq("source_ref", claim.target_ref)
      .like("source_ref", targetPrefix)
      .limit(1)
      .maybeSingle();
    const authorized = !targetError && await authorizeFamilyInvitationEmail({
      claim,
      ownerPersonId: owner.person_id,
      rawToken: input.rawToken,
      targetExists: Boolean(target?.id),
    });
    if (!authorized) return json({ error: "invitation_not_available" }, 403);

    const email = buildFamilyInvitationEmail({ rawToken: input.rawToken, siteUrl: SITE_URL });
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `family-claim-${claim.id}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: input.recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
    });
    if (!providerResponse.ok) return json({ error: "delivery_failed" }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
});
