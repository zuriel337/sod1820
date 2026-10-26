import { randomUUID } from "crypto";
import {
  bridgeSecret,
  cardcomConfig,
  createCardcomPayment,
  safeCardcomDescription,
  supabaseRpc,
  verifySupabaseAdmin,
  verifySupabaseUser,
} from "../server/cardcom.js";
import { assertCardcomTokenEncryptionConfigured } from "../server/cardcom-subscription.js";

function bearerToken(req) {
  return String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function requestOrigin(req) {
  const forwarded = String(req.headers?.["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwarded || String(req.headers?.host || "").trim();
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname !== "sod1820.co.il" && hostname !== "www.sod1820.co.il" && !hostname.endsWith(".vercel.app")) {
    throw new Error("untrusted_request_host");
  }
  return `https://${host}`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    assertCardcomTokenEncryptionConfigured();
    const token = bearerToken(req);
    const user = await verifySupabaseUser(token);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!(await verifySupabaseAdmin(token, user.id))) {
      res.status(403).json({ error: "admin_only" });
      return;
    }

    const guard = await supabaseRpc("membership_pilot_start_guard", {
      p_bridge_secret: bridgeSecret(),
      p_user_id: user.id,
    });
    if (guard?.allowed === false) {
      res.status(409).json({
        error: "existing_subscription",
        status: guard?.status || "pending",
        ref: guard?.provider_ref || null,
      });
      return;
    }

    const origin = requestOrigin(req);
    const providerRef = `SODM-${randomUUID()}`;
    const { terminal, apiName } = cardcomConfig();
    const email = String(user.email || "").trim();
    const meta = user.user_metadata || {};
    const billingName = String(meta.full_name || meta.name || email || "SOD1820 member").slice(0, 120);
    const payload = {
      TerminalNumber: terminal,
      ApiName: apiName,
      ReturnValue: providerRef,
      Amount: 2,
      Operation: "ChargeAndCreateToken",
      Language: "he",
      ISOCoinId: 1,
      ProductName: "SOD1820 · מנוי בדיקה חודשי",
      SuccessRedirectUrl: `${origin}/membership-pilot?payment=success&ref=${encodeURIComponent(providerRef)}`,
      FailedRedirectUrl: `${origin}/membership-pilot?payment=failed&ref=${encodeURIComponent(providerRef)}`,
      WebHookUrl: `${origin}/api/cardcom-subscription-webhook`,
      Document: {
        DocumentTypeToCreate: "Auto",
        Name: billingName,
        ...(email ? { Email: email, IsSendByEmail: true } : {}),
        Products: [{ Description: "SOD1820 · מנוי בדיקה חודשי", Quantity: 1, UnitCost: 2 }],
      },
    };

    const created = await createCardcomPayment(payload);
    if (Number(created?.ResponseCode) !== 0) {
      res.status(502).json({ error: "provider_rejected", description: safeCardcomDescription(created) });
      return;
    }
    const lowProfileId = String(created?.LowProfileId || "").trim();
    const paymentUrl = String(created?.Url || "").trim();
    let parsedUrl;
    try { parsedUrl = new URL(paymentUrl); } catch { parsedUrl = null; }
    if (!lowProfileId || !parsedUrl || parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "secure.cardcom.solutions") {
      res.status(502).json({ error: "provider_malformed_response" });
      return;
    }

    await supabaseRpc("membership_pilot_register", {
      p_bridge_secret: bridgeSecret(),
      p_user_id: user.id,
      p_provider_ref: providerRef,
      p_low_profile_id: lowProfileId,
      p_billing_name: billingName,
      p_billing_email: email || null,
    });
    res.status(200).json({ ok: true, url: paymentUrl, ref: providerRef });
  } catch (error) {
    console.error("cardcom-subscription-start", String(error?.message || error).slice(0, 320));
    res.status(500).json({ error: "subscription_start_failed" });
  }
}
