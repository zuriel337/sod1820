import { buildIdentity, RELEASE_CONTRACT, sha } from "../src/lib/admin/releaseProjection.js";
import { CANARY_STATUS_CONTEXT } from "../scripts/release-canary-gate.mjs";

const REPO = "zuriel337/sod1820";
const PROJECT = "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq", TEAM = "team_vtfWHZfKvdbob8gvynQb5N89";
const LIVE_ALIAS = "sod1820.co.il";
export function runtimeIdentity(env) {
  return buildIdentity({ sha: env.VERCEL_GIT_COMMIT_SHA, branch: env.VERCEL_GIT_COMMIT_REF,
    environment: env.VERCEL_ENV, deploymentId: env.VERCEL_DEPLOYMENT_ID,
    source: "vercel-system-environment" });
}

export function createReleaseReader({ fetchImpl = fetch, env = process.env, now = () => Date.now() } = {}) {
  let cached = null, pending = null;
  const get = async (url, headers) => {
    const response = await fetchImpl(url, { method: "GET", headers, signal: AbortSignal.timeout(5000), redirect: "error" });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    return response.json();
  };
  const project = async (source, read) => {
    try { const data = await read(); return { status: "ready", source, data, observed_at: new Date(now()).toISOString(), error: null }; }
    catch { return { status: "unavailable", source, data: null, observed_at: null, error: "המקור אינו זמין או אינו מחובר בסביבה זו" }; }
  };
  const github = path => {
    const token = env.GH_TOKEN || env.GITHUB_TOKEN;
    return get(`https://api.github.com/repos/${REPO}/${path}`, { Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "sod1820-admin-release-projection",
      ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  };
  const query = async () => {
    const identity = runtimeIdentity(env);
    const [main, live, checks] = await Promise.all([
      project("GitHub · refs/heads/main", async () => {
        const data = await github("branches/main");
        const commit = sha(data?.commit?.sha); if (!commit) throw new Error("missing_sha");
        return { sha: commit };
      }),
      project("Vercel · current production alias", async () => {
        if (!env.VERCEL_API_TOKEN) throw new Error("not_connected");
        const data = await get(`https://api.vercel.com/v13/deployments/${LIVE_ALIAS}?teamId=${TEAM}`, { Authorization: `Bearer ${env.VERCEL_API_TOKEN}` });
        const commit = sha(data.meta?.githubCommitSha);
        // Resolve the custom domain, not the newest READY candidate or main.
        if ((data.projectId || data.project?.id) !== PROJECT || data.target !== "production" || data.readyState !== "READY" || !commit) throw new Error("unverified_alias");
        return { sha: commit, deploymentId: /^dpl_[\w]+$/.test(data.id || "") ? data.id : null,
          environment: "production", alias: LIVE_ALIAS, basis: "ALIAS_BINDING" };
      }),
      project("GitHub · exact server SHA check runs", async () => {
        if (!identity.sha) throw new Error("missing_sha");
        const data = await github(`commits/${identity.sha}/check-runs?per_page=100`);
        if (!Array.isArray(data.check_runs)) throw new Error("invalid_checks");
        const latest = new Map();
        for (const row of data.check_runs.filter(r => r.head_sha === identity.sha).sort((a, b) => b.id - a.id)) {
          const key = `${row.app?.id}:${row.name}`;
          if (!latest.has(key)) latest.set(key, { name: String(row.name || "בדיקה").slice(0, 150),
            status: ["queued", "in_progress", "completed"].includes(row.status) ? row.status : "unknown",
            conclusion: ["success", "failure", "cancelled", "skipped", "timed_out", "neutral", "action_required", "stale"].includes(row.conclusion) ? row.conclusion : null,
            completed_at: row.completed_at || null });
        }
        return { sha: identity.sha, checks: [...latest.values()].slice(0, 25),
          partial: data.total_count > data.check_runs.length || latest.size > 25 };
      }),
    ]);
    const canary = await project("GitHub · sod1820/post-deploy-canary", async () => {
      const commit = live.status === "ready" ? live.data.sha : null;
      if (!commit) throw new Error("live_sha_unknown");
      const statuses = await github(`commits/${commit}/statuses?per_page=100`);
      if (!Array.isArray(statuses)) throw new Error("invalid_statuses");
      const status = statuses.filter(s => s.context === CANARY_STATUS_CONTEXT)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      if (!status || !["success", "failure", "error", "pending"].includes(status.state)) throw new Error("no_canary_evidence");
      return { sha: commit, state: status.state, checked_at: status.created_at || null, context: CANARY_STATUS_CONTEXT };
    });
    return { contract: RELEASE_CONTRACT, generated_at: new Date(now()).toISOString(), identity, main, live, checks, canary };
  };
  return async () => {
    // Ephemeral provider-read cache only. Errors/missing evidence are never promoted to success.
    const cacheMs = env.GH_TOKEN || env.GITHUB_TOKEN ? 120000 : 300000;
    if (cached && now() - Date.parse(cached.generated_at) < cacheMs) return cached;
    if (pending) return pending;
    pending = query().then(data => { cached = data; return data; }).finally(() => { pending = null; });
    return pending;
  };
}
