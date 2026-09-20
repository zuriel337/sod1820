// world-convergence-catalog — admin-only read projection for the World 2029 Human Gate.
// EXTEND_EXISTING only: no convergence/rank store, no truth score, no publication mutation.
// Authorization: real caller JWT -> canonical rd_is_admin(); service role is server-side read transport only.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

async function requireCanonicalAdmin(req: Request): Promise<boolean> {
  const authz = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authz) || !SUPABASE_URL || !ANON_KEY) return false;
  const actor = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authz } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await actor.rpc("rd_is_admin");
  return !error && data === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!(await requireCanonicalAdmin(req))) return json({ error: "forbidden" }, 403);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server_not_configured" }, 500);

  const body = await req.json().catch(() => ({}));
  const includeRaw = body?.includeRaw === true;
  const rawLimit = boundedInt(body?.rawLimit, 120, 1, 250);
  const rawOffset = boundedInt(body?.rawOffset, 0, 0, 100000);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const topicPromise = admin
      .from("topic_cards")
      .select("id,slug,title,subtitle,search_terms,numbers,highlight_numbers,status,quality,meter_score,created_by,created_at,approved_at,occurred_at,findings", { count: "exact" })
      .eq("status", "approved")
      .order("meter_score", { ascending: false, nullsFirst: false })
      .order("quality", { ascending: false, nullsFirst: false })
      .order("approved_at", { ascending: false, nullsFirst: false })
      .limit(500);

    const relationPromise = admin
      .from("research_objects")
      .select("id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,parent_id,meta,privacy_scope", { count: "exact" })
      .eq("kind", "relation")
      .in("status", ["candidate", "approved", "canonical"])
      .order("created_at", { ascending: false })
      .limit(750);

    const candidatePromise = admin
      .from("research_candidates")
      .select("id,candidate_type,subject_type,subject_ref,node_id,recommendation,confidence,why,evidence_refs,rules_snapshot,created_by_agent,status,decision_id,created_at,decided_at", { count: "exact" })
      .eq("status", "pending")
      .order("confidence", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(250);

    const rawPromise = includeRaw
      ? admin
        .from("convergences")
        .select("id,kind,method,value,phrases,group_size,details,score,status,first_seen,last_seen", { count: "exact" })
        .eq("status", "new")
        .order("score", { ascending: false })
        .order("group_size", { ascending: false })
        .range(rawOffset, rawOffset + rawLimit - 1)
      : Promise.resolve({ data: [], error: null, count: null });

    const [topics, relations, candidates, raw] = await Promise.all([
      topicPromise, relationPromise, candidatePromise, rawPromise,
    ]);

    for (const [name, result] of [["topics", topics], ["relations", relations], ["candidates", candidates], ["raw", raw]] as const) {
      if (result.error) return json({ error: "catalog_read_failed", layer: name, detail: result.error.message }, 500);
    }

    return json({
      layers: {
        topics: topics.data || [],
        relations: relations.data || [],
        candidates: candidates.data || [],
        raw: raw.data || [],
      },
      totals: {
        topics: topics.count ?? (topics.data || []).length,
        relations: relations.count ?? (relations.data || []).length,
        candidates: candidates.count ?? (candidates.data || []).length,
        raw: includeRaw ? (raw.count ?? null) : null,
      },
      raw: {
        included: includeRaw,
        offset: rawOffset,
        limit: rawLimit,
        hasMore: includeRaw && raw.count != null
          ? rawOffset + (raw.data || []).length < Number(raw.count)
          : false,
      },
      boundaries: {
        access: "caller_jwt_then_rd_is_admin_before_service_read",
        truth: "projection_only_no_canonicalization_no_publication",
        ranking: "client_projection_research_gold_hints_law_v3_no_universal_score",
        rawDiscovery: "legacy_equality_buckets_signal_only_not_research_convergence",
      },
    });
  } catch (error) {
    return json({ error: "catalog_exception", detail: String((error as Error)?.message || error) }, 500);
  }
};
