// The week BEFORE the Home's week (days 8-14), for the weekly trend on the Home line (ZURIEL 25.11.2026). Two head-only exact counts, read AFTER the
// Home has painted (a separate, lazy call), so the Home's own read budget (home2029Pulse.test.js: two corpus counts and one contribution read) is unchanged.
// Same public filters as the Home pulse (verified, published, not encrypted; contributions approved). A failed read returns null for that part and the
// trend is simply not drawn: nothing here is ever shown as zero.
import { supabase } from "../supabase.js";

const WEEK_MS = 7 * 86400000;

function publicWords(options) {
  return supabase.from("gematria_words").select("phrase", options).eq("is_verified", true).eq("is_published", true).or("is_encrypted.is.null,is_encrypted.eq.false");
}

export async function fetchHomeWeekBefore2029({ signal, now = Date.now() } = {}) {
  const since = new Date(now - WEEK_MS).toISOString(), sincePrev = new Date(now - 2 * WEEK_MS).toISOString();
  const guard = query => signal ? query.abortSignal(signal) : query;
  const [words, contributions] = await Promise.all([
    guard(publicWords({ count: "exact", head: true })
      .or(`and(created_at.gte."${sincePrev}",created_at.lt."${since}"),and(visibility_changed_at.gte."${sincePrev}",visibility_changed_at.lt."${since}")`)),
    guard(supabase.from("research_contributions").select("id", { count: "exact", head: true }).eq("status", "approved").gte("created_at", sincePrev).lt("created_at", since)),
  ]);
  return {
    corpusAddedPrev7d: words?.error ? null : Math.max(0, Number(words?.count || 0)),
    contributionsPrev7d: contributions?.error ? null : Math.max(0, Number(contributions?.count || 0)),
  };
}
