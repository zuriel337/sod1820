// wa-system-outbox core — drains ALREADY-GOVERNED bot_outbox rows (bot in system|link-code), nothing else.
// The caller cannot supply chat/message/image/token: input is at most an opaque row ref (done_key).
// Nothing here logs or returns chat ids, message text, image urls, OTPs or provider URLs/tokens.
// deno-lint-ignore-file no-explicit-any
import { waAdmin } from "../_shared/waGreen.ts";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};
export const REF_RE = /^[A-Za-z0-9:_-]{1,80}$/;
type Row = { done_key: string; bot: string; chat_id: string; reply: string; payload: any; attempts: number };

export function buildCall(row: Row): { method: string; payload: Record<string, unknown> } {
  const img = row.payload && typeof row.payload.image_url === "string" ? row.payload.image_url : "";
  if (img && /^https:\/\//i.test(img)) {
    return {
      method: "sendFileByUrl",
      payload: { chatId: row.chat_id, urlFile: img, fileName: img.replace(/^.*\//, "").split("?")[0] || "image.jpg", caption: row.reply },
    };
  }
  return { method: "sendMessage", payload: { chatId: row.chat_id, message: row.reply } };
}

// Outcome classification — FAIL CLOSED on any post-dispatch ambiguity (no duplicate sends).
// sent   = 2xx + idMessage only.
// retry  = ONLY 429 (explicit provider rate-limit refusal: request not accepted for delivery).
// failed = everything else, including timeout/AbortError/transport error/no status (provider may have accepted
//          before the response was lost), every 5xx (acceptance unknown), 4xx, and 2xx without idMessage.
// No other status is treated as proven non-acceptance: Green API semantics are not guessed.
export function classify(r: { http_status?: number; result?: any; ok?: boolean }): "sent" | "retry" | "failed" {
  const s = r.http_status;
  if (typeof s === "number" && s >= 200 && s < 300 && r.result && typeof r.result === "object" && r.result.idMessage) return "sent";
  if (s === 429) return "retry";
  return "failed";
}

export async function drain(sb: any, ref: string | null, opts: { fetchImpl?: typeof fetch } = {}) {
  const { data: rows, error } = await sb.rpc("outbox_claim_system", { p_ref: ref, p_limit: ref ? 1 : 5 });
  if (error) return { ok: false, processed: 0, sent: 0 };
  let sent = 0;
  for (const row of (rows || []) as Row[]) {
    let outcome: "sent" | "retry" | "failed" = "failed"; // unknown until proven: never default to resend
    let msgId: string | null = null;
    try {
      const { method, payload } = buildCall(row);
      const res = await waAdmin(sb, method, payload, "POST", { fetchImpl: opts.fetchImpl, noTranscript: row.bot === "link-code" });
      outcome = classify(res as any);
      if (outcome === "sent") msgId = String((res as any).result.idMessage);
    } catch { outcome = "failed"; } // thrown after dispatch may mean provider accepted: do not resend
    await sb.rpc("outbox_mark_system", { p_key: row.done_key, p_outcome: outcome, p_sent_msg_id: msgId });
    if (outcome === "sent") sent++;
  }
  const out: Record<string, unknown> = { ok: true, processed: (rows || []).length, sent };
  if (ref) {
    const { data: st } = await sb.rpc("outbox_ref_status", { p_ref: ref });
    out.ref_status = typeof st === "string" ? st : "unknown";
  }
  return out;
}

export async function handle(req: Request, sb: any, opts: { fetchImpl?: typeof fetch } = {}): Promise<Response> {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS }); // before any RPC
  if (req.method !== "POST" && req.method !== "GET") return json({ ok: false }, 405);
  let ref: string | null = new URL(req.url).searchParams.get("ref");
  if (!ref && req.method === "POST") {
    try { const b = await req.json(); if (b && typeof b.ref === "string") ref = b.ref; } catch { /* empty body */ }
  }
  if (ref !== null && !REF_RE.test(ref)) return json({ ok: false }, 400);
  return json(await drain(sb, ref, opts));
}
