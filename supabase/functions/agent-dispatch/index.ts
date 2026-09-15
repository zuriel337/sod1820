import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  boundedGithubPaths,
  boundedStringList,
  buildSpecialistPrompt,
  clip,
  extractAnthropicText,
  formatOpenThreads,
  formatResultSummary,
  parseSpecialistResult,
  statusForVerdict,
  type DispatchAssignment,
  type FileEvidence,
  type OwnerBundle,
  type SpecialistContext,
  type WorkLogEvidence,
} from "./core.ts";

const CANONICAL_PROJECT = "linswmnnkjxvweumprav";
const REPO = "zuriel337/sod1820";
const SB_URL = (Deno.env.get("SUPABASE_URL") || "").trim();
const SERVICE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
const ANTHROPIC_KEY = (Deno.env.get("ANTHROPIC_API_KEY") || "").trim();
const CLAUDE_MODEL = (
  Deno.env.get("AGENT_DISPATCH_CLAUDE_MODEL") ||
  Deno.env.get("ANALYZE_MODEL") ||
  "claude-sonnet-5"
).trim();
const MAX_FILE_BYTES = 64_000;
const MAX_FILES_TOTAL = 80_000;

const sb = SB_URL && SERVICE_KEY
  ? createClient(SB_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function verifyWebhook(req: Request): Promise<boolean> {
  if (!sb) return false;
  const key = (req.headers.get("x-agent-dispatch-key") || "").trim();
  if (key.length < 32) return false;
  const { data, error } = await sb.rpc("agent_dispatch_verify_webhook", { p_key: key });
  return !error && data === true;
}

async function finish(
  assignmentId: string,
  worker: string,
  outcome: "COMPLETED" | "FAILED" | "DEFERRED" | "CANCELLED",
  status: string,
  summary: string,
  openThreads = "",
  retryable = false,
  errorText: string | null = null,
) {
  if (!sb) throw new Error("supabase_not_configured");
  const { data, error } = await sb.rpc("agent_dispatch_finish", {
    p_assignment_id: assignmentId,
    p_worker: worker,
    p_outcome: outcome,
    p_result_status: status,
    p_result_summary: clip(summary),
    p_open_threads: clip(openThreads),
    p_retryable: retryable,
    p_error: errorText ? clip(errorText, 1000) : null,
  });
  if (error) throw new Error(`finish_failed:${error.message}`);
  return data;
}

async function getMainSha(): Promise<string> {
  const r = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "sod1820-agent-dispatch" },
  });
  if (!r.ok) throw new Error(`github_main_${r.status}`);
  const d = await r.json();
  const sha = typeof d?.sha === "string" ? d.sha : "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("github_main_invalid_sha");
  return sha;
}

async function fetchGithubFile(path: string, sha: string): Promise<FileEvidence | null> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${encodedPath}`, {
    headers: { "user-agent": "sod1820-agent-dispatch" },
  });
  if (!r.ok) return null;
  const text = await r.text();
  return { path, sha, content: clip(text, MAX_FILE_BYTES) };
}

function normalizeRuleId(identifier: string): string {
  return identifier.replace(/`/g, "").replace(/\s+v\d+\b.*$/i, "").trim();
}

async function fetchActiveRule(ruleId: string): Promise<{ identifier: string; body: string; depends: string[] } | null> {
  if (!sb) return null;
  const { data, error } = await sb
    .from("nodes")
    .select("rule_id,rule_version,label,description,depends_on,metadata")
    .eq("type", "rule")
    .eq("rule_id", ruleId)
    .eq("is_active", true)
    .order("rule_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!error && data) {
    return {
      identifier: `${data.rule_id} v${data.rule_version}`,
      body: `${data.label || ""}\n${data.description || ""}`,
      depends: Array.isArray(data.depends_on) ? data.depends_on.filter((x: unknown): x is string => typeof x === "string").slice(0, 8) : [],
    };
  }

  // A direct dependency may be historical after compaction. Follow only its explicit
  // current owner pointer; never perform broad archaeology here.
  const latest = await sb
    .from("nodes")
    .select("rule_id,rule_version,label,description,metadata")
    .eq("type", "rule")
    .eq("rule_id", ruleId)
    .order("rule_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const meta = latest.data?.metadata as Record<string, unknown> | null;
  const comp = meta?.compaction_v1 as Record<string, unknown> | undefined;
  const ownerRouting = meta?.owner_routing as Record<string, unknown> | undefined;
  const successor = (meta?.superseded_by_owner || comp?.canonical_owner || ownerRouting?.canonical_owner) as string | undefined;
  if (successor && successor !== ruleId && /^[A-Za-z0-9_.-]+$/.test(successor)) {
    return await fetchActiveRule(successor);
  }
  return null;
}

async function fetchCodex(slug: string): Promise<{ identifier: string; body: string } | null> {
  if (!sb) return null;
  const { data, error } = await sb
    .from("project_codex")
    .select("slug,title,body,updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return { identifier: `project_codex.${data.slug}`, body: `${data.title || ""}\n${data.body || ""}` };
}

function ownerPath(identifier: string): string | null {
  const m = identifier.match(/([A-Za-z0-9._@+\/-]+\.md)\b/);
  if (!m) return null;
  const p = m[1].replace(/^\.\//, "");
  if (p.startsWith("/") || p.includes("..") || p.includes("\\")) return null;
  return p;
}

async function resolveOwner(identifier: string, mainSha: string): Promise<OwnerBundle> {
  const id = (identifier || "").trim();
  const filePath = ownerPath(id);
  if (filePath) {
    const file = await fetchGithubFile(filePath, mainSha);
    return file
      ? { identifier: filePath, source: "github_file", body: file.content, dependencies: [] }
      : { identifier: id, source: "unresolved", body: "Owner file not found on verified main.", dependencies: [] };
  }

  if (id.startsWith("project_codex.")) {
    const codex = await fetchCodex(id.slice("project_codex.".length));
    return codex
      ? { identifier: codex.identifier, source: "project_codex", body: codex.body, dependencies: [] }
      : { identifier: id, source: "unresolved", body: "project_codex owner not found.", dependencies: [] };
  }

  const ruleId = normalizeRuleId(id);
  const rule = await fetchActiveRule(ruleId);
  if (!rule) return { identifier: id, source: "unresolved", body: "Active rule owner not found.", dependencies: [] };

  const dependencies: Array<{ identifier: string; body: string }> = [];
  for (const depId of rule.depends.slice(0, 6)) {
    const dep = await fetchActiveRule(depId);
    if (dep) dependencies.push({ identifier: dep.identifier, body: dep.body });
  }
  return { identifier: rule.identifier, source: "rule", body: rule.body, dependencies };
}

async function addBoundedRequestedOwners(owner: OwnerBundle, context: Record<string, unknown> | null | undefined) {
  const seen = new Set(owner.dependencies.map((x) => x.identifier));
  for (const ruleId of boundedStringList(context?.rule_ids, 6)) {
    if (!/^[A-Za-z0-9_.-]{2,160}$/.test(ruleId)) continue;
    const rule = await fetchActiveRule(ruleId);
    if (rule && !seen.has(rule.identifier)) {
      owner.dependencies.push({ identifier: rule.identifier, body: rule.body });
      seen.add(rule.identifier);
    }
  }
  for (const slug of boundedStringList(context?.project_codex_slugs, 6)) {
    if (!/^[A-Za-z0-9_.-]{2,160}$/.test(slug)) continue;
    const codex = await fetchCodex(slug);
    if (codex && !seen.has(codex.identifier)) {
      owner.dependencies.push({ identifier: codex.identifier, body: codex.body });
      seen.add(codex.identifier);
    }
  }
  owner.dependencies = owner.dependencies.slice(0, 10);
}

async function fetchRelevantWorkLog(taskKey: string): Promise<WorkLogEvidence[]> {
  if (!sb || !taskKey) return [];
  const { data, error } = await sb
    .from("work_log_current")
    .select("id,created_at,topic,status,what_we_did,open_threads")
    .ilike("topic", `%task=${taskKey}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !Array.isArray(data)) return [];
  return data as WorkLogEvidence[];
}

async function fetchExplicitFiles(context: Record<string, unknown> | null | undefined, mainSha: string): Promise<FileEvidence[]> {
  const out: FileEvidence[] = [];
  let total = 0;
  for (const path of boundedGithubPaths(context)) {
    const f = await fetchGithubFile(path, mainSha);
    if (!f) continue;
    total += f.content.length;
    if (total > MAX_FILES_TOTAL) break;
    out.push(f);
  }
  return out;
}

async function callClaude(ctx: SpecialistContext) {
  if (!ANTHROPIC_KEY) throw new Error("anthropic_not_configured");
  const { system, user } = buildSpecialistPrompt(ctx);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const retryable = r.status === 429 || r.status >= 500;
    throw Object.assign(new Error(`anthropic_${r.status}`), { retryable });
  }
  const text = extractAnthropicText(body);
  if (!text) throw Object.assign(new Error("anthropic_empty_response"), { retryable: true });

  try {
    await sb?.from("ai_token_log").insert({
      source: "agent_dispatch",
      kind: "claude_read_only",
      model: CLAUDE_MODEL,
      input_tokens: body?.usage?.input_tokens || 0,
      output_tokens: body?.usage?.output_tokens || 0,
      ref: ctx.assignment.id,
      ref_name: ctx.assignment.task_key || null,
    });
  } catch { /* observability never blocks the result */ }

  return parseSpecialistResult(text);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SB_URL || !SERVICE_KEY || !sb) return json({ error: "runtime_not_configured" }, 503);
  if (!(await verifyWebhook(req))) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !isUuid(body.assignment_id)) return json({ error: "assignment_id_required" }, 400);
  if (Object.keys(body).some((k) => k !== "assignment_id")) {
    return json({ error: "only_assignment_id_is_accepted" }, 400);
  }

  const assignmentId = body.assignment_id;
  const worker = `edge:${crypto.randomUUID()}`;
  const claim = await sb.rpc("agent_dispatch_claim", {
    p_assignment_id: assignmentId,
    p_worker: worker,
    p_lease_seconds: 900,
  });
  if (claim.error) return json({ error: "claim_failed", detail: claim.error.message }, 500);
  if (!claim.data) return json({ ok: true, state: "not_claimable_or_duplicate", assignment_id: assignmentId }, 202);

  const a = claim.data as DispatchAssignment;

  try {
    if (a.dispatch_kind === "RESULT_WAKE") {
      const data = await finish(
        assignmentId, worker, "DEFERRED", "DEFERRED_CONTROLLER_RUNTIME_NOT_CONFIGURED",
        "Result wake is preserved in work_log, but no live external GPT/CLAUDE controller endpoint is configured for automatic continuation yet.",
        "Controller wake remains an explicit G3 runtime seam; Human Gate/release authorization is unchanged.",
        false, "controller_runtime_endpoint_not_configured",
      );
      return json({ ok: true, deferred: true, reason: "controller_runtime_endpoint_not_configured", data }, 202);
    }

    if (a.to_actor === "GPT") {
      const data = await finish(
        assignmentId, worker, "DEFERRED", "DEFERRED_GPT_RUNTIME_ENDPOINT_NOT_CONFIGURED",
        "GPT assignment is queued/provenanced but no verified external GPT project-agent runtime endpoint exists yet.",
        "Do not claim automatic GPT wake until a real controller endpoint/credential is live-verified.",
        false, "gpt_runtime_endpoint_not_configured",
      );
      return json({ ok: true, deferred: true, reason: "gpt_runtime_endpoint_not_configured", data }, 202);
    }

    if (a.to_actor !== "CLAUDE") {
      const data = await finish(assignmentId, worker, "FAILED", "AFTER_DISPATCH_INVALID_TARGET", "Unsupported dispatch target.", "", false, "invalid_target");
      return json({ ok: false, data }, 400);
    }

    if (a.assignment_mode !== "READ_ONLY") {
      const data = await finish(
        assignmentId, worker, "DEFERRED", "DEFERRED_WRITE_REQUIRES_GOVERNED_TOOL_RUNTIME",
        "Event dispatch does not auto-authorize WRITE. This runtime has no repository/DB write tools by design.",
        "Transfer/authorize WRITE through the existing owner/security/one-writer contracts; merge/deploy/publish remain Human-Gated.",
        false, "write_requires_governed_tool_runtime",
      );
      return json({ ok: true, deferred: true, reason: "write_requires_governed_tool_runtime", data }, 202);
    }

    if (!ANTHROPIC_KEY) {
      const data = await finish(assignmentId, worker, "DEFERRED", "DEFERRED_ANTHROPIC_NOT_CONFIGURED", "ANTHROPIC_API_KEY is not configured for the dispatcher runtime.", "", false, "anthropic_not_configured");
      return json({ ok: true, deferred: true, reason: "anthropic_not_configured", data }, 202);
    }

    const mainSha = await getMainSha();
    const owner = await resolveOwner(a.primary_owner || "", mainSha);
    await addBoundedRequestedOwners(owner, a.dispatch_context || {});
    if (owner.source === "unresolved") {
      const data = await finish(
        assignmentId, worker, "COMPLETED", "AFTER_READ_ONLY_SPECIALIST_BLOCKED_NEEDS_OWNER",
        `Canonical owner could not be resolved live from the bounded assignment: ${a.primary_owner || "missing"}.`,
        "Primary controller must repair owner routing before specialist execution.",
      );
      return json({ ok: true, blocked: true, data });
    }

    const [workLog, files] = await Promise.all([
      fetchRelevantWorkLog(a.task_key || ""),
      fetchExplicitFiles(a.dispatch_context || {}, mainSha),
    ]);
    const specialistContext: SpecialistContext = {
      canonicalSupabase: CANONICAL_PROJECT,
      mainSha,
      assignment: a,
      owner,
      workLog,
      files,
    };

    const result = await callClaude(specialistContext);
    const data = await finish(
      assignmentId,
      worker,
      "COMPLETED",
      statusForVerdict(result),
      formatResultSummary(result),
      formatOpenThreads(result),
    );
    return json({ ok: true, verdict: result.verdict, main_sha: mainSha, data });
  } catch (err) {
    const e = err as Error & { retryable?: boolean };
    try {
      const data = await finish(
        assignmentId,
        worker,
        "FAILED",
        e.retryable ? "DISPATCH_RETRYABLE_FAILURE" : "AFTER_DISPATCH_FAILED",
        `Dispatcher failed: ${e.message}`,
        e.retryable ? "Automatic retry remains bounded by the work_log lease/retry contract." : "Human/runtime review required.",
        !!e.retryable,
        e.message,
      );
      return json({ ok: false, retryable: !!e.retryable, error: e.message, data }, e.retryable ? 503 : 500);
    } catch (finishErr) {
      return json({ ok: false, error: e.message, finish_error: String(finishErr) }, 500);
    }
  }
});
