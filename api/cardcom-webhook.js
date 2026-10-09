import {
  bridgeSecret,
  cardcomConfig,
  getCardcomResult,
  supabaseRpc,
} from "../server/cardcom.js";

function findKeyDeep(value, wanted) {
  if (!value || typeof value !== "object") return "";
  const target = wanted.toLowerCase();
  const queue = [value];
  let visited = 0;
  while (queue.length && visited < 32) {
    const current = queue.shift();
    visited += 1;
    for (const [key, val] of Object.entries(current || {})) {
      if (String(key).toLowerCase() === target && val != null) return String(val).trim();
      if (val && typeof val === "object") queue.push(val);
    }
  }
  return "";
}

function requestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function lowProfileFromRequest(req) {
  const body = requestBody(req);
  return (
    findKeyDeep(body, "LowProfileId") ||
    findKeyDeep(body, "LowProfileCode") ||
    String(req.query?.LowProfileId || req.query?.lowProfileId || req.query?.LowProfileCode || "").trim()
  );
}

function safeProviderDocumentUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(String(raw));
    const host = url.hostname.toLowerCase();
    if (
      url.protocol === "https:" &&
      (host === "secure.cardcom.solutions" || host.endsWith(".cardcom.solutions"))
    ) {
      return url.toString();
    }
  } catch {
    // Invalid/untrusted provider URL is intentionally discarded.
  }
  return null;
}

function paymentVectorNumber(raw) {
  if (raw == null || raw === "") return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const map = {
    NoneOrUnknown: 0,
    PayPal: 10,
    ApplePay: 11,
    uPayBit: 12,
    "3DS": 13,
    PayMeBit: 14,
    GooglePay: 15,
    EmvPinpad: 100,
    EmvP400Verifon: 101,
    IM30: 102,
    BitCardcom: 104,
  };
  return Object.prototype.hasOwnProperty.call(map, String(raw)) ? map[String(raw)] : null;
}

async function alertIssue(secret, lowProfileId, providerRef, reason) {
  try {
    await supabaseRpc("cardcom_purchase_alert", {
      p_bridge_secret: secret,
      p_low_profile_id: lowProfileId,
      p_provider_ref: providerRef || null,
      p_reason: String(reason || "unknown").slice(0, 160),
    });
  } catch (error) {
    console.error("cardcom alert failed", String(error?.message || error).slice(0, 220));
  }
}

function isPermanentFinalizeError(error) {
  const message = String(error?.message || error);
  return [
    "amount_mismatch",
    "low_profile_mismatch",
    "transaction_mismatch",
    "detached_user",
    "invalid_status",
    "not_found",
    "bad_coin",
    "bad_transaction_id",
  ].some((code) => message.includes(code));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const lowProfileId = lowProfileFromRequest(req);
  if (!lowProfileId || lowProfileId.length > 120) {
    res.status(400).json({ error: "missing_low_profile_id" });
    return;
  }

  const secret = bridgeSecret();

  try {
    // Ignore arbitrary public POSTs before spending a CardCom API call.
    const lookup = await supabaseRpc("cardcom_purchase_webhook_lookup", {
      p_bridge_secret: secret,
      p_low_profile_id: lowProfileId,
    });
    if (!lookup?.known) {
      res.status(200).json({ ok: true, ignored: true, reason: "unknown_low_profile" });
      return;
    }
    if (lookup?.status === "approved") {
      res.status(200).json({ ok: true, verified: true, granted: true, already: true });
      return;
    }

    const expectedProviderRef = String(lookup?.provider_ref || "").trim();

    // Never trust CardCom's webhook body as proof of payment.
    // Pull the transaction again from CardCom and decide only from that server-to-server result.
    const { data, exactTransactionId } = await getCardcomResult(lowProfileId);
    const { terminal } = cardcomConfig();

    const responseCode = Number(data?.ResponseCode);
    const returnedTerminal = Number(data?.TerminalNumber);
    const returnedLowProfile = String(data?.LowProfileId || "").trim();
    const providerRef = String(data?.ReturnValue || "").trim();
    const operation = String(data?.Operation || "").trim();
    const tx = data?.TranzactionInfo || data?.TransactionInfo || null;
    const txCode = Number(tx?.ResponseCode);
    const txTerminal = Number(tx?.TerminalNumber ?? returnedTerminal);
    const amount = Number(tx?.Amount ?? data?.Amount);
    const coinId = Number(tx?.CoinId ?? data?.CoinId);
    const paymentVector = paymentVectorNumber(data?.ExternalPaymentVector ?? tx?.ExternalPaymentVector);
    const documentInfo = data?.DocumentInfo || null;
    const documentCode = documentInfo ? Number(documentInfo?.ResponseCode) : null;
    const documentUrl = safeProviderDocumentUrl(documentInfo?.DocumentUrl || tx?.DocumentUrl || "");

    const identityMismatch =
      responseCode !== 0 ||
      returnedTerminal !== terminal ||
      txTerminal !== terminal ||
      returnedLowProfile !== lowProfileId ||
      providerRef !== expectedProviderRef ||
      !/^SODC-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(providerRef);

    if (identityMismatch) {
      console.warn("cardcom webhook verification mismatch", {
        responseCode,
        terminalMatch: returnedTerminal === terminal && txTerminal === terminal,
        lowProfileMatch: returnedLowProfile === lowProfileId,
        providerRefMatch: providerRef === expectedProviderRef,
      });
      await alertIssue(secret, lowProfileId, expectedProviderRef, "provider_identity_mismatch");
      res.status(200).json({ ok: true, verified: false, granted: false, issue: true });
      return;
    }

    if (operation !== "ChargeOnly") {
      await alertIssue(secret, lowProfileId, expectedProviderRef, "unexpected_operation");
      res.status(200).json({ ok: true, verified: false, granted: false, issue: true });
      return;
    }

    if (txCode !== 0) {
      await supabaseRpc("cardcom_purchase_record_attempt", {
        p_bridge_secret: secret,
        p_provider_ref: expectedProviderRef,
        p_low_profile_id: lowProfileId,
        p_response_code: Number.isFinite(txCode) ? txCode : responseCode,
      });
      res.status(200).json({ ok: true, verified: true, granted: false });
      return;
    }

    if (!exactTransactionId) {
      await alertIssue(secret, lowProfileId, expectedProviderRef, "missing_transaction_id");
      res.status(200).json({ ok: true, verified: false, granted: false, issue: true });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0 || coinId !== 1) {
      console.warn("cardcom webhook amount/currency mismatch", {
        amountOk: Number.isFinite(amount) && amount > 0,
        coinId,
      });
      await alertIssue(secret, lowProfileId, expectedProviderRef, "amount_or_currency_mismatch");
      res.status(200).json({ ok: true, verified: false, granted: false, issue: true });
      return;
    }

    let finalized;
    try {
      finalized = await supabaseRpc("cardcom_purchase_finalize", {
        p_bridge_secret: secret,
        p_provider_ref: expectedProviderRef,
        p_low_profile_id: lowProfileId,
        p_transaction_id: exactTransactionId,
        p_amount: amount,
        p_coin_id: coinId,
        p_document_url: documentUrl,
        p_payment_vector: paymentVector,
      });
    } catch (error) {
      if (isPermanentFinalizeError(error)) {
        await alertIssue(secret, lowProfileId, expectedProviderRef, String(error?.message || error));
        res.status(200).json({ ok: true, verified: true, granted: false, issue: true });
        return;
      }
      throw error;
    }

    // A paid transaction must remain paid even if document issuance had a separate provider error.
    // Surface the document problem operationally instead of withholding the purchased credits.
    if (documentInfo && Number.isFinite(documentCode) && documentCode !== 0) {
      await alertIssue(secret, lowProfileId, expectedProviderRef, `document_response_${documentCode}`);
    }

    res.status(200).json({
      ok: true,
      verified: true,
      granted: finalized?.status === "approved",
      already: !!finalized?.already,
    });
  } catch (error) {
    // Only transient/provider/config failures return non-200 so CardCom can retry.
    console.error("cardcom-webhook", String(error?.message || error).slice(0, 360));
    res.status(503).json({ error: "verification_temporarily_failed" });
  }
}
