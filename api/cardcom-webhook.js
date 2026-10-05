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
  let depth = 0;
  while (queue.length && depth < 32) {
    const current = queue.shift();
    depth += 1;
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

  try {
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
    const paymentVectorRaw = data?.ExternalPaymentVector ?? tx?.ExternalPaymentVector;
    const paymentVector = paymentVectorRaw == null ? null : Number(paymentVectorRaw);
    const documentUrl = String(data?.DocumentInfo?.DocumentUrl || tx?.DocumentUrl || "").trim();

    if (
      responseCode !== 0 ||
      returnedTerminal !== terminal ||
      txTerminal !== terminal ||
      returnedLowProfile !== lowProfileId ||
      !/^SODC-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(providerRef)
    ) {
      console.warn("cardcom webhook verification mismatch", {
        responseCode,
        terminalMatch: returnedTerminal === terminal && txTerminal === terminal,
        lowProfileMatch: returnedLowProfile === lowProfileId,
        hasProviderRef: !!providerRef,
      });
      res.status(200).json({ ok: true, verified: false, granted: false });
      return;
    }

    if (txCode !== 0 || operation !== "ChargeOnly" || !exactTransactionId) {
      await supabaseRpc("cardcom_purchase_record_attempt", {
        p_bridge_secret: bridgeSecret(),
        p_provider_ref: providerRef,
        p_low_profile_id: lowProfileId,
        p_response_code: Number.isFinite(txCode) ? txCode : responseCode,
      });
      res.status(200).json({ ok: true, verified: true, granted: false });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0 || coinId !== 1) {
      console.warn("cardcom webhook amount/currency mismatch", { amountOk: Number.isFinite(amount) && amount > 0, coinId });
      res.status(200).json({ ok: true, verified: false, granted: false });
      return;
    }

    const finalized = await supabaseRpc("cardcom_purchase_finalize", {
      p_bridge_secret: bridgeSecret(),
      p_provider_ref: providerRef,
      p_low_profile_id: lowProfileId,
      p_transaction_id: exactTransactionId,
      p_amount: amount,
      p_coin_id: coinId,
      p_document_url: documentUrl || null,
      p_payment_vector: Number.isFinite(paymentVector) ? paymentVector : null,
    });

    res.status(200).json({
      ok: true,
      verified: true,
      granted: finalized?.status === "approved",
      already: !!finalized?.already,
    });
  } catch (error) {
    // Non-200 intentionally asks CardCom to retry transient failures.
    console.error("cardcom-webhook", String(error?.message || error).slice(0, 360));
    res.status(503).json({ error: "verification_temporarily_failed" });
  }
}
