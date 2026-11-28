// Support reports (ZURIEL, 27.11.2026): what a person types NEVER enters analytics. The report goes to the authorized support store
// (record_feedback -> public.feedback, readable by administrators only), with the bounded context beside it (no identifier, no session, no visitor).
// Its own module so the entry every page loads does not carry it (only the issue-report component imports it).
import { supabase } from "./supabase.js";
import { isBot } from "./botVerdict.js";

export async function persistExplicitIssueReport(payload, client = supabase) {
  if (!client || isBot()) throw new Error("issue_report_unavailable");
  const { message, ...context } = payload && typeof payload === "object" ? payload : {};
  const { error } = await client.rpc("record_feedback", {
    p_context: "issue_report", p_verdict: "reported", p_query: null,
    p_target: typeof context.surface === "string" ? context.surface.slice(0, 64) : null,
    p_detail: typeof message === "string" && message.trim() ? message.slice(0, 1000) : null,
    p_visitor: null, p_meta: context,
  });
  if (error) throw error;
  return {saved: true};
}
