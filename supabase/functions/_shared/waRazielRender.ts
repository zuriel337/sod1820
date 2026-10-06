// WhatsApp transport helpers for wa-raziel (RAZIEL_WA_RESPONSE_SPEED_GOLDEN_V1).
// Pure, dependency-free: no I/O, no model call, no DB. ai-analyze keeps its canonical structured contract for site
// consumers; this module only (1) turns any ai-analyze/provider envelope into concise natural text for WhatsApp,
// failing closed (empty string) instead of ever returning raw JSON/code fences, and (2) decides whether the current
// message explicitly asks to continue earlier conversation (the only case where prior context may reach a source turn).

export const SOURCE_ACK_TEXT = "קיבלתי את התמונה. אני קורא ומנתח אותה עכשיו — אחזור אליך עם תשובה.";
export const SOURCE_ACK_TEXT_DOC = "קיבלתי את המסמך. אני קורא ומנתח אותו עכשיו — אחזור אליך עם תשובה.";

const CONTINUITY_CUE = /(כמו קודם|כמו מקודם|תמשיך|תמשיכי|תחבר\S*\s+(?:את\s+)?(?:זה\s+)?ל(?:מה|שיחה)|למה שדיברנו|למה שאמרנו|כפי שדיברנו|כפי שאמרנו|בהמשך ל|בשיחה הקודמת|בפעם הקודמת|מהשיחה הקודמת|שוחחנו (?:קודם|על))/;
export function hasContinuityCue(text: string): boolean {
  return CONTINUITY_CUE.test(String(text || ""));
}

const ANSWER_KEYS = ["answer", "text", "message", "reply", "analysis", "response", "content"];
const FOLLOW_KEYS = ["follow_up_question", "followUpQuestion"];
const MAX_DEPTH = 5;

function stripFences(s: string): string {
  return s.trim().replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim();
}
function looksLikeEnvelope(s: string): boolean {
  const t = s.trim();
  if (/^```/.test(t) || /```\s*$/.test(t)) return true;
  if (/^[\[{]/.test(t)) return true;
  return /"(?:answer|follow_up_question|suggested_paths|facts|agent|degraded|continue_wa)"\s*:/.test(t);
}

// Pull the human text out of a parsed value (string | object | array), unwrapping nested envelopes.
function fromValue(v: unknown, depth: number): string {
  if (depth > MAX_DEPTH || v == null) return "";
  if (typeof v === "string") return fromString(v, depth + 1);
  if (Array.isArray(v)) return v.map((x) => fromValue(x, depth + 1)).filter(Boolean).join("\n").trim();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.raziel && typeof o.raziel === "object") { const r = fromValue(o.raziel, depth + 1); if (r) return r; }
    let main = "";
    for (const k of ANSWER_KEYS) { if (o[k] != null) { main = fromValue(o[k], depth + 1); if (main) break; } }
    if (!main) return "";
    for (const k of FOLLOW_KEYS) {
      const f = o[k];
      if (typeof f === "string" && f.trim() && !looksLikeEnvelope(f)) return (main + "\n\n" + f.trim()).trim();
    }
    return main;
  }
  return "";
}

function fromString(raw: string, depth: number): string {
  const s = stripFences(raw);
  if (!s) return "";
  if (!looksLikeEnvelope(s)) return s;
  // 1) parseable envelope (also {...} embedded in surrounding prose)
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  const cands = [s];
  if (i >= 0 && j > i) cands.push(s.slice(i, j + 1));
  for (const c of cands) {
    try { const r = fromValue(JSON.parse(c), depth + 1); if (r) return r; } catch { /* next */ }
  }
  // 2) truncated/malformed envelope: salvage a well-formed "answer" string literal only
  const m = s.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (m) {
    try { const a = JSON.parse('"' + m[1] + '"'); if (typeof a === "string") { const r = fromString(a, depth + 1); if (r) return r; } } catch { /* fail closed */ }
  }
  return "";
}

// Final guard: whatever survives must be plain prose.
function isPlainProse(s: string): boolean {
  if (!s.trim()) return false;
  if (s.includes("```")) return false;
  if (/^\s*[\[{]/.test(s)) return false;
  if (/"(?:answer|follow_up_question|suggested_paths|facts|agent|degraded|continue_wa|source_stage)"\s*:/.test(s)) return false;
  return true;
}

// ai-analyze response body → text to send, or "" when it cannot be safely normalized (caller sends a short human fallback).
export function renderWhatsappReply(data: any): string {
  if (!data || typeof data !== "object") return "";
  let out = "";
  if (data.error === "quota" && data.message) out = fromString(String(data.message), 0);
  else if (data.raziel != null) out = fromValue(data.raziel, 0) || fromValue(data.analysis, 0);
  else out = fromValue(data.analysis, 0);
  out = out.trim();
  return isPlainProse(out) ? out : "";
}
