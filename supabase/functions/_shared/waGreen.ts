// _shared/waGreen.ts — Edge-side Green API transport (G3 invariant #15).
// Replaces sb.rpc("wa_admin"): provider HTTP runs here, never inside a Postgres connection.
// Config comes from public.wa_green_config() (service_role only, Vault-backed); secrets are never logged.
// Return shape is identical to the legacy DB wa_admin(): {http_status, result} | {ok:false, error}.
// deno-lint-ignore-file no-explicit-any

export const WA_TIMEOUT_MS = 20000;
const DEFAULT_BASE = "https://api.green-api.com";

type Cfg = { id: string; token: string; base: string };
let cfgCache: { cfg: Cfg; at: number } | null = null;
const CFG_TTL_MS = 5 * 60 * 1000;
export function resetWaGreenConfigCache() { cfgCache = null; }

export function buildGreenUrl(cfg: Cfg, method: string): string {
  const base = (cfg.base || "").replace(/\/+$/, "") || DEFAULT_BASE;
  return `${base}/waInstance${cfg.id}/${method}/${cfg.token}`;
}

export function parseGreenBody(content: string): unknown {
  if (/^\s*[\[{]/.test(content)) {
    try { return JSON.parse(content); } catch { /* fall through to raw text */ }
  }
  return content;
}

async function loadConfig(sb: any, force = false): Promise<Cfg | null> {
  if (!force && cfgCache && Date.now() - cfgCache.at < CFG_TTL_MS) return cfgCache.cfg;
  const { data, error } = await sb.rpc("wa_green_config");
  if (error || !data || !data.id || !data.token) return null;
  const cfg = { id: String(data.id), token: String(data.token), base: String(data.base || "") };
  cfgCache = { cfg, at: Date.now() };
  return cfg;
}

export type WaAdminResult = { http_status?: number; result?: unknown; ok?: boolean; error?: string };

export async function waAdmin(
  sb: any,
  method: string,
  payload: unknown = null,
  http: string = "POST",
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<WaAdminResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? WA_TIMEOUT_MS;
  try {
    const cfg = await loadConfig(sb);
    if (!cfg) return { ok: false, error: "GREEN_API_ID/GREEN_API_TOKEN missing from vault" };
    const isGet = String(http).toUpperCase() === "GET";
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    let status = 0;
    let content = "";
    try {
      const res = await doFetch(buildGreenUrl(cfg, method), isGet
        ? { method: "GET", signal: ctl.signal }
        : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload ?? {}), signal: ctl.signal });
      status = res.status;
      content = await res.text();
    } finally {
      clearTimeout(timer);
    }

    const p = payload as any;
    if (method.toLowerCase().startsWith("sendmessage") && p && typeof p === "object" && "message" in p) {
      try {
        await sb.from("bot_transcripts").insert({
          chat_id: p.chatId, message: p.message, http_status: status,
          meta: { method, quoted: p.quotedMessageId ?? null },
        });
      } catch { /* transcript is best-effort, as in the DB version */ }
    }
    return { http_status: status, result: parseGreenBody(content) };
  } catch (e) {
    // Never echo the URL (it embeds the token): message only.
    const name = (e as any)?.name;
    return { ok: false, error: name === "AbortError" ? `timeout after ${timeoutMs}ms` : String((e as any)?.message ?? "provider fetch failed").replace(/\/waInstance\S*/g, "/waInstance[redacted]") };
  }
}
