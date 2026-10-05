import { randomUUID } from "crypto";
import {
  SITE_ORIGIN,
  bridgeSecret,
  cardcomConfig,
  createCardcomPayment,
  safeCardcomDescription,
  supabaseRpc,
  verifySupabaseUser,
} from "../server/cardcom.js";

function bearerToken(req) {
  return String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function bodyObject(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const token = bearerToken(req);
    const user = await verifySupabaseUser(token);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const packageId = Number(bodyObject(req)?.package_id);
    if (!Number.isInteger(packageId) || packageId <= 0) {
      res.status(400).json({ error: "bad_package" });
      return;
    }

    // Price and credit amount are always loaded from the canonical server-side package catalog.
    // The browser never gets to choose the amount charged.
    const catalog = await supabaseRpc("credit_packages_list", {}, token);
    const pkg = Array.isArray(catalog?.packages)
      ? catalog.packages.find((item) => Number(item?.id) === packageId)
      : null;
    if (!pkg || !Number.isFinite(Number(pkg.price_ils)) || Number(pkg.price_ils) <= 0) {
      res.status(400).json({ error: "bad_package" });
      return;
    }

    const amount = Number(pkg.price_ils);
    const credits = Number(pkg.credits);
    const providerRef = `SODC-${randomUUID()}`;
    const { terminal, apiName } = cardcomConfig();

    const email = String(user.email || "").trim();
    const meta = user.user_metadata || {};
    const customerName = String(meta.full_name || meta.name || email || "לקוח SOD1820").slice(0, 120);

    const payload = {
      TerminalNumber: terminal,
      ApiName: apiName,
      ReturnValue: providerRef,
      Amount: amount,
      Operation: "ChargeOnly",
      Language: "he",
      ISOCoinId: 1,
      ProductName: `SOD1820 · ${credits} קרדיטים`.slice(0, 50),
      SuccessRedirectUrl: `${SITE_ORIGIN}/credits?payment=success&ref=${encodeURIComponent(providerRef)}`,
      FailedRedirectUrl: `${SITE_ORIGIN}/credits?payment=failed&ref=${encodeURIComponent(providerRef)}`,
      WebHookUrl: `${SITE_ORIGIN}/api/cardcom-webhook`,
      Document: {
        DocumentTypeToCreate: "Auto",
        Name: customerName,
        ...(email ? { Email: email, IsSendByEmail: true } : {}),
        Products: [{
          Description: `SOD1820 · ${credits} קרדיטים`,
          Quantity: 1,
          UnitCost: amount,
        }],
      },
    };

    const created = await createCardcomPayment(payload);
    if (Number(created?.ResponseCode) !== 0) {
      console.warn("cardcom create rejected", Number(created?.ResponseCode), safeCardcomDescription(created));
      res.status(502).json({ error: "provider_rejected", description: safeCardcomDescription(created) });
      return;
    }

    const lowProfileId = String(created?.LowProfileId || "").trim();
    const paymentUrl = String(created?.Url || "").trim();
    let parsedPaymentUrl;
    try { parsedPaymentUrl = new URL(paymentUrl); } catch { parsedPaymentUrl = null; }

    if (!lowProfileId || !parsedPaymentUrl || parsedPaymentUrl.protocol !== "https:" ||
        parsedPaymentUrl.hostname !== "secure.cardcom.solutions") {
      console.error("cardcom create malformed response", { hasLowProfileId: !!lowProfileId, hasUrl: !!paymentUrl });
      res.status(502).json({ error: "provider_malformed_response" });
      return;
    }

    // Register only after CardCom created a real LowProfileId, but before exposing the payment URL.
    // Therefore a charge cannot be completed through a page the site has not bound to this user/package.
    await supabaseRpc("cardcom_purchase_register", {
      p_bridge_secret: bridgeSecret(),
      p_user_id: user.id,
      p_package_id: packageId,
      p_provider_ref: providerRef,
      p_low_profile_id: lowProfileId,
    });

    res.status(200).json({
      ok: true,
      url: paymentUrl,
      ref: providerRef,
    });
  } catch (error) {
    console.error("cardcom-start", String(error?.message || error).slice(0, 320));
    res.status(500).json({ error: "payment_start_failed" });
  }
}
