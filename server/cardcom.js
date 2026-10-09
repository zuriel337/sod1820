const CARDCOM_BASE = "https://secure.cardcom.solutions/api/v11";
export const SITE_ORIGIN = "https://sod1820.co.il";

export function cardcomConfig() {
  const terminal = Number(process.env.CARDCOM_TERMINAL_NUMBER || "");
  const apiName = String(process.env.CARDCOM_API_NAME || "").trim();
  if (!Number.isInteger(terminal) || terminal <= 0 || !apiName) {
    throw new Error("cardcom_not_configured");
  }
  return { terminal, apiName };
}

export function supabaseConfig() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !anon) throw new Error("supabase_server_not_configured");
  return { url, anon };
}

export function bridgeSecret() {
  const secret = String(process.env.CARDCOM_BRIDGE_SECRET || "").trim();
  if (!secret) throw new Error("cardcom_bridge_not_configured");
  return secret;
}

async function readJsonResponse(response) {
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = null; }
  return { raw, data };
}

export async function verifySupabaseUser(token) {
  const { url, anon } = supabaseConfig();
  if (!token) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

export async function supabaseRpc(name, args, token = null) {
  const { url, anon } = supabaseConfig();
  const bearer = token || anon;
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(args || {}),
    signal: AbortSignal.timeout(12_000),
  });
  const { raw, data } = await readJsonResponse(response);
  if (!response.ok) {
    const message = data?.message || data?.hint || raw.slice(0, 240) || `rpc_${response.status}`;
    throw new Error(`${name}: ${message}`);
  }
  return data;
}

export async function createCardcomPayment(payload) {
  const response = await fetch(`${CARDCOM_BASE}/LowProfile/Create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const { raw, data } = await readJsonResponse(response);
  if (!response.ok || !data) {
    throw new Error(`cardcom_create_${response.status}: ${raw.slice(0, 180)}`);
  }
  return data;
}

function exactJsonInteger(raw, key) {
  const re = new RegExp(`"${key}"\\s*:\\s*(?:"([0-9]+)"|([0-9]+))`, "i");
  const match = String(raw || "").match(re);
  return match ? (match[1] || match[2] || "") : "";
}

export async function getCardcomResult(lowProfileId) {
  const { terminal, apiName } = cardcomConfig();
  const response = await fetch(`${CARDCOM_BASE}/LowProfile/GetLpResult`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      TerminalNumber: terminal,
      ApiName: apiName,
      LowProfileId: String(lowProfileId || ""),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const { raw, data } = await readJsonResponse(response);
  if (!response.ok || !data) {
    throw new Error(`cardcom_result_${response.status}: ${raw.slice(0, 180)}`);
  }

  // CardCom documents TranzactionId as Int64. Keep its exact decimal representation
  // from the raw JSON so JavaScript never rounds a future >2^53 identifier.
  const exactTransactionId =
    exactJsonInteger(raw, "TranzactionId") ||
    exactJsonInteger(raw, "TransactionId") ||
    String(data?.TranzactionInfo?.TranzactionId ?? data?.TranzactionId ?? "");

  return { data, exactTransactionId };
}

export function safeCardcomDescription(data) {
  return String(data?.Description || data?.description || "").slice(0, 160);
}
