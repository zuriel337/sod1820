// Client of the separate, admin-only claude-raziel function. It sends only the question, the packet text the page already built and a
// short ephemeral history; it keeps nothing (no storage, no session) and never touches the site's Raziel.
export const CLAUDE_RAZIEL_FUNCTION = "claude-raziel";
export const CLAUDE_RAZIEL_MAX_HISTORY = 6;

// Returns { ok: true, answer, degraded } or { ok: false, reason: "admin_required" | "unavailable" | "invalid" }. Never throws.
export async function askClaudeRaziel({ question, packet, history = [] }, { invoke } = {}) {
  const q = typeof question === "string" ? question.trim() : "";
  const p = typeof packet === "string" ? packet.trim() : "";
  if (!q || !p || typeof invoke !== "function") return { ok: false, reason: "invalid" };
  try {
    const turns = history.filter((turn) => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.text === "string" && turn.text.trim())
      .slice(-CLAUDE_RAZIEL_MAX_HISTORY).map((turn) => ({ role: turn.role, text: turn.text.trim() }));
    const { data, error } = await invoke(CLAUDE_RAZIEL_FUNCTION, { body: { question: q, packet: p, history: turns } });
    const status = error?.context?.status ?? error?.status ?? null;
    if (status === 401 || status === 403 || data?.error === "admin_required") return { ok: false, reason: "admin_required" };
    if (error || typeof data?.answer !== "string" || !data.answer.trim()) return { ok: false, reason: "unavailable" };
    return { ok: true, answer: data.answer, degraded: data.degraded === true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
