import {
  bridgeSecret,
  cardcomConfig,
  getCardcomResult,
  supabaseRpc,
} from "../server/cardcom.js";
import {
  cardcomExpirationMMYY,
  encryptCardcomToken,
} from "../server/cardcom-subscription.js";

function findKeyDeep(value, wanted) {
  if (!value || typeof value !== "object") return "";
  const target = wanted.toLowerCase();
  const queue = [value];
  for (let visited = 0; queue.length && visited < 32; visited += 1) {
    const current = queue.shift();
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
  return findKeyDeep(body, "LowProfileId") || findKeyDeep(body, "LowProfileCode") ||
    String(req.query?.LowProfileId || req.query?.LowProfileCode || "").trim();
}

function safeDocumentUrl(raw) {
  try {
    const url = new URL(String(raw || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (host === "secure.cardcom.solutions" || host.endsWith(".cardcom.solutions"))) {
      return url.toString();
    }
  } catch { /* discard untrusted URL */ }
  return null;
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
    const secret = bridgeSecret();
    const lookup = await supabaseRpc("membership_pilot_webhook_lookup", {
      p_bridge_secret: secret,
      p_low_profile_id: lowProfileId,
    });
    if (!lookup?.known) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    if (lookup?.status === "active") {
      res.status(200).json({ ok: true, active: true, already: true });
      return;
    }

    const { data, exactTransactionId } = await getCardcomResult(lowProfileId);
    const { terminal } = cardcomConfig();
    const tx = data?.TranzactionInfo || data?.TransactionInfo || null;
    const responseCode = Number(data?.ResponseCode);
    const txCode = Number(tx?.ResponseCode);
    const returnedTerminal = Number(data?.TerminalNumber);
    const txTerminal = Number(tx?.TerminalNumber ?? returnedTerminal);
    const returnedLowProfile = String(data?.LowProfileId || "").trim();
    const returnedRef = String(data?.ReturnValue || "").trim();
    const operation = String(data?.Operation || "").trim();
    const amount = Number(tx?.Amount ?? data?.Amount);
    const coinId = Number(tx?.CoinId ?? data?.CoinId);

    if (
      ![0, "0"].includes(data?.ResponseCode) || ![0, "0"].includes(tx?.ResponseCode) ||
      returnedTerminal !== terminal || txTerminal !== terminal ||
      returnedLowProfile !== lowProfileId || returnedRef !== String(lookup.provider_ref || "") ||
      operation !== "ChargeAndCreateToken" || amount !== 4 || coinId !== 1 || !exactTransactionId
    ) {
      console.warn("cardcom subscription verification mismatch");
      res.status(200).json({ ok: true, active: false, issue: true });
      return;
    }

    const tokenInfo = data?.TokenInfo || tx?.TokenInfo || null;
    const providerToken = String(tokenInfo?.Token || tx?.Token || "").trim();
    if (!providerToken) {
      console.warn("cardcom subscription token missing");
      res.status(200).json({ ok: true, active: false, issue: true, reason: "token_missing" });
      return;
    }
    const encrypted = encryptCardcomToken(providerToken);
    const expirationMMYY = cardcomExpirationMMYY(tokenInfo || tx);
    const documentInfo = data?.DocumentInfo || null;
    const documentUrl = safeDocumentUrl(documentInfo?.DocumentUrl || tx?.DocumentUrl || "");

    const activated = await supabaseRpc("membership_pilot_activate", {
      p_bridge_secret: secret,
      p_subscription_id: lookup.subscription_id,
      p_provider_ref: lookup.provider_ref,
      p_transaction_id: exactTransactionId,
      p_document_url: documentUrl,
      p_token_ciphertext: encrypted.ciphertext,
      p_token_iv: encrypted.iv,
      p_token_tag: encrypted.tag,
      p_expiration_mmyy: expirationMMYY,
    });
    res.status(200).json({ ok: true, active: activated?.status === "active", already: !!activated?.already });
  } catch {
    console.error("cardcom-subscription-webhook: failed");
    res.status(503).json({ error: "subscription_verification_temporarily_failed" });
  }
}
