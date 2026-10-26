import { bridgeSecret, supabaseRpc } from "../server/cardcom.js";
import { chargeCardcomSubscription, decryptCardcomToken } from "../server/cardcom-subscription.js";

function bearer(req) {
  return String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function safeDocumentUrl(raw) {
  try {
    const url = new URL(String(raw || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "secure.cardcom.solutions" || host.endsWith(".cardcom.solutions"))) {
      return url.toString();
    }
  } catch { /* discard */ }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const cronSecret = String(process.env.CRON_SECRET || "").trim();
  if (!cronSecret || bearer(req) !== cronSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const secret = bridgeSecret();
  let processed = 0;
  try {
    for (let index = 0; index < 5; index += 1) {
      const due = await supabaseRpc("membership_pilot_claim_due", { p_bridge_secret: secret });
      if (!due?.found) break;

      const providerToken = decryptCardcomToken({
        ciphertext: due.token_ciphertext,
        iv: due.token_iv,
        tag: due.token_tag,
      });
      const { data, exactTransactionId } = await chargeCardcomSubscription({
        token: providerToken,
        expirationMMYY: due.expiration_mmyy,
        amount: due.amount_ils,
        externalId: due.external_uniq_tran_id,
        billingName: due.billing_name,
        billingEmail: due.billing_email,
      });
      const responseCode = Number(data?.ResponseCode);
      const success = responseCode === 0 && !!exactTransactionId;
      const documentUrl = safeDocumentUrl(data?.DocumentUrl || data?.DocumentInfo?.DocumentUrl || "");
      await supabaseRpc("membership_pilot_settle_renewal", {
        p_bridge_secret: secret,
        p_subscription_id: due.subscription_id,
        p_external_uniq_tran_id: due.external_uniq_tran_id,
        p_success: success,
        p_response_code: Number.isFinite(responseCode) ? responseCode : -1,
        p_transaction_id: exactTransactionId || null,
        p_document_url: documentUrl,
      });
      processed += 1;
    }
    res.status(200).json({ ok: true, processed });
  } catch (error) {
    console.error("cardcom-subscription-renew", String(error?.message || error).slice(0, 360));
    res.status(503).json({ error: "renewal_temporarily_failed", processed });
  }
}
