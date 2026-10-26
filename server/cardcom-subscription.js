import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { cardcomConfig } from "./cardcom.js";

const TRANSACTION_URL = "https://secure.cardcom.solutions/api/v11/Transactions/Transaction";

function encryptionKey() {
  const raw = String(process.env.CARDCOM_TOKEN_ENCRYPTION_KEY || "").trim();
  let key;
  if (/^[0-9a-f]{64}$/i.test(raw)) key = Buffer.from(raw, "hex");
  else {
    try { key = Buffer.from(raw, "base64"); } catch { key = Buffer.alloc(0); }
  }
  if (key.length !== 32) throw new Error("cardcom_token_encryption_not_configured");
  return key;
}

export function assertCardcomTokenEncryptionConfigured() {
  encryptionKey();
}

export function encryptCardcomToken(token) {
  const value = String(token || "").trim();
  if (!value || value.length > 200) throw new Error("bad_cardcom_token");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCardcomToken(envelope) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(String(envelope?.iv || ""), "base64"),
  );
  decipher.setAuthTag(Buffer.from(String(envelope?.tag || ""), "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(String(envelope?.ciphertext || ""), "base64")),
    decipher.final(),
  ]).toString("utf8");
  if (!plaintext || plaintext.length > 200) throw new Error("bad_cardcom_token_envelope");
  return plaintext;
}

export function cardcomExpirationMMYY(tokenInfo) {
  const month = Number(tokenInfo?.CardMonth);
  const year = Number(tokenInfo?.CardYear);
  if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000) {
    return `${String(month).padStart(2, "0")}${String(year).slice(-2)}`;
  }
  const tokenExDate = String(tokenInfo?.TokenExDate || "").replace(/\D/g, "");
  if (/^[0-9]{8}$/.test(tokenExDate)) {
    return `${tokenExDate.slice(4, 6)}${tokenExDate.slice(2, 4)}`;
  }
  throw new Error("missing_cardcom_token_expiration");
}

function exactJsonInteger(raw, key) {
  const match = String(raw || "").match(new RegExp(`"${key}"\\s*:\\s*(?:"([0-9]+)"|([0-9]+))`, "i"));
  return match ? (match[1] || match[2] || "") : "";
}

export async function chargeCardcomSubscription({
  token,
  expirationMMYY,
  amount,
  externalId,
  billingName,
  billingEmail,
}) {
  const { terminal, apiName } = cardcomConfig();
  if (!/^[A-Za-z0-9_-]{1,25}$/.test(String(externalId || ""))) {
    throw new Error("bad_external_transaction_id");
  }
  const payload = {
    TerminalNumber: terminal,
    ApiName: apiName,
    Amount: Number(amount),
    Token: String(token),
    CardExpirationMMYY: String(expirationMMYY),
    ExternalUniqTranId: String(externalId),
    ExternalUniqTranIdResponse: true,
    NumOfPayments: 1,
    ISOCoinId: 1,
    Document: {
      DocumentTypeToCreate: "Auto",
      Name: String(billingName || "SOD1820 member").slice(0, 120),
      ...(billingEmail ? { Email: String(billingEmail).slice(0, 254), IsSendByEmail: true } : {}),
      Products: [{ Description: "SOD1820 · מנוי בדיקה חודשי", Quantity: 1, UnitCost: Number(amount) }],
    },
  };
  const response = await fetch(TRANSACTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = null; }
  if (!response.ok || !data) throw new Error(`cardcom_subscription_charge_${response.status}`);
  const exactTransactionId =
    exactJsonInteger(raw, "TranzactionId") ||
    exactJsonInteger(raw, "TransactionId") ||
    String(data?.TranzactionId ?? data?.TransactionId ?? "");
  return { data, exactTransactionId };
}
