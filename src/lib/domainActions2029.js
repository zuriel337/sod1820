// Domain actions for the administration centre (S3, 27.11.2026): registration, sign-in, messages, reactions, subscriptions and issue reports counted from the tables that hold their truth.
// One more reader of the existing Traffic Intelligence family (research_domain_actions_2029, administrators only). Counts and distributions only: no identity, no text.
import { supabase } from "./supabase.js";

export const DOMAIN_WINDOWS = Object.freeze([["day", "אתמול"], ["week", "7 ימים"], ["month", "30 ימים"]]);
export const DOMAIN_ROWS = Object.freeze([
  ["registrations", "הרשמות חדשות"], ["signed_in_users", "משתמשים שנכנסו"], ["community_messages", "הודעות בקהילה"], ["messages_with_reactions", "הודעות עם תגובות רגש"],
  ["contributions", "תרומות מחקר"], ["subscribers", "מנויים חדשים"], ["subscribe_events", "אירועי הרשמה לעדכונים"], ["push_subscriptions", "מנויי התראות חדשים"], ["issue_reports", "דיווחי תקלה"],
]);
const cache = new Map();

export function readDomainActions(window) {
  if (!cache.has(window)) {
    cache.set(window, supabase.rpc("research_domain_actions_2029", { p_window: window }).then(({ data, error }) => {
      if (error) throw error;
      return data;
    }).catch(error => { cache.delete(window); throw error; }));
  }
  return cache.get(window);
}

// Pure model. forbidden or unavailable draws nothing; a missing number is "—", never 0 (a missing measurement is UNKNOWN).
export function domainActionsModel(d) {
  if (!d || d.version !== 1 || d.state !== "measured") return null;
  const num = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
  const load = d.visitor_load || {};
  const silence = { expected: [], awaiting: [], preserved: [] };
  for (const x of Array.isArray(d.expected_silence) ? d.expected_silence : []) {
    if (typeof x?.surface !== "string" || typeof x?.event !== "string" || !/^[a-z0-9_-]{1,48}$/i.test(x.surface) || !/^[a-z0-9_]{1,48}$/i.test(x.event)) continue;
    const row = { key: x.surface + "/" + x.event, last: typeof x.last_seen === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.last_seen) ? x.last_seen : null };
    (x.status === "preserved" ? silence.preserved : x.status === "awaiting_release" ? silence.awaiting : silence.expected).push(row);
  }
  return {
    silence,
    window: d.window, from: d.from, to: d.to,
    rows: DOMAIN_ROWS.map(([key, label]) => ({ key, label, value: num(d[key]) })),
    load: { visitors: num(load.visitors), sessions: num(load.sessions), identified: num(load.identified_persons), views: num(load.views),
      top1: Number.isFinite(load.top1_share_pct) ? load.top1_share_pct : null, top3: Number.isFinite(load.top3_share_pct) ? load.top3_share_pct : null },
  };
}
