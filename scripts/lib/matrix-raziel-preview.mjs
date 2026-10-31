// Preview-only gate for the matrix → Raziel connection. It is not a transport, engine or session owner:
// the request still travels through the existing global Raziel session and the existing ai-analyze route.
// This module only decides (a) whether a build may admit that one request shape and (b) the worker text.
// The Preview worker stays read-only for everything else, and Vercel Git deploys for claude/* stay disabled
// until a reviewed cut is named explicitly.

export const MATRIX_RAZIEL_PREVIEW_BRANCHES = new Set([
  "claude/els-matrix-discovery-raziel-preview-20261028",
]);
export const MATRIX_READING_PREVIEW_BRANCHES = new Set([
  "gpt/els-language-preview-20261031",
  "gpt/els-context-reset-20261031",
  "gpt/els-search-order-preview-20261031",
  "gpt/els-search-planners-preview-20261031",
  "gpt/els-unified-research-preview-20261031",
  "gpt/els-search-clarity-preview-20261030",
  "gpt/els-lexicon-structure-preview-20261030",
  "gpt/els-research-exact-return-preview-20261030",
  "gpt/raziel-account-sync-map-20261030",
  "gpt/els-reading-responsive-preview-20261030",
  "gpt/els-fable-preview-activation-20261029",
  "gpt/els-fable-admin-default-20261030",
  "gpt/els-fable-findings-matrix-20261030",
]);

// Only this reviewed cut enables the existing private Research sync and normal
// authenticated Raziel submit. This is not a replacement for server authorization.
export const RAZIEL_ACCOUNT_PREVIEW_BRANCH = "gpt/raziel-account-sync-map-20261030";
export const RAZIEL_ACCOUNT_PREVIEW_BRANCHES = new Set([
  RAZIEL_ACCOUNT_PREVIEW_BRANCH,
  "gpt/els-language-preview-20261031",
  "gpt/els-context-reset-20261031",
  "gpt/els-search-order-preview-20261031",
  "gpt/els-search-planners-preview-20261031",
  "gpt/els-unified-research-preview-20261031",
  "gpt/els-search-clarity-preview-20261030",
  "gpt/els-lexicon-structure-preview-20261030",
  "gpt/els-research-exact-return-preview-20261030",
]);

const DENY_MARKER = "  return new Response(JSON.stringify({error:'preview_read_only'})";

// One explicit request shape: a deep Raziel research turn that carries a matrix presentation context.
// Anything else (ordinary chat, planning/companion actions, other personas) keeps the 403 default.
const MATRIX_AI_GUARD = `  // Matrix discovery Preview: only an explicit matrix request reaches the existing ai-analyze route.
  if(req.method==='POST'&&u.origin===authOrigin&&u.pathname==='/functions/v1/ai-analyze'){
   try{
    const body=await req.clone().json(),m=body&&body.els_matrix_context;
    if(body&&body.kind==='research'&&body.persona==='raziel'&&body.research_contract==='public-number-research-run-v1'
     &&body.intelligence_level==='deep'&&m&&typeof m==='object'&&!Array.isArray(m)&&m.contract==='els_matrix_presentation_context_v1'
     &&!body.companion_action&&!body.els_planning_action)return fetch(req);
   }catch{}
  }
`;

export function selectMatrixRazielPreview(env) {
  const branch = typeof env.VERCEL_GIT_COMMIT_REF === "string" ? env.VERCEL_GIT_COMMIT_REF : "";
  const explicit = env.SOD_MATRIX_RAZIEL_PREVIEW === "true";
  const approvedBranch = MATRIX_RAZIEL_PREVIEW_BRANCHES.has(branch) || MATRIX_READING_PREVIEW_BRANCHES.has(branch);
  const approvedGitPreview = env.VERCEL_ENV === "preview" && approvedBranch;
  if (!explicit && !approvedGitPreview) return null;
  if (env.VERCEL_ENV === "production") throw new Error("matrix_raziel_preview_is_never_production");
  if (MATRIX_READING_PREVIEW_BRANCHES.has(branch) && env.VERCEL_ENV !== "preview") throw new Error("reading_preview_requires_preview_environment");
  if (env.SOD_RAZIEL_SAFE_ACTIONS_PREVIEW === "true") throw new Error("matrix_raziel_and_mock_preview_conflict");
  if (branch && !approvedBranch) throw new Error("matrix_raziel_preview_branch_mismatch");
  return branch || [...MATRIX_RAZIEL_PREVIEW_BRANCHES][0];
}

export function buildMatrixRazielPreviewWorker(worker, { readingOnly = false, branch = null } = {}) {
  if (worker.split(DENY_MARKER).length !== 2) throw new Error("matrix_raziel_preview_deny_marker_not_unique");
  // Only the explicitly approved reading, not ordinary matrix chat. Authentication,
  // ownership and complete action validation remain server-owned.
  const readingGuard = `const a=body&&body.els_matrix_reading_action;
    if(!a||a.id!=='els_matrix_reading_v1'||!['preview','start','status','cancel','recover'].includes(a.op))throw new Error('reading_action_required');
    if(['preview','start'].includes(a.op)&&(!a.window||a.window.rows!==33||a.window.cols!==41||a.cap!==25))throw new Error('reading_preview_bounds');
    if(a.op==='start'&&(!a.request_id||a.ack_upper_bound_usd!==2))throw new Error('reading_preview_cost_bound');`;
  const guard = readingOnly ? MATRIX_AI_GUARD.replace("const body=await req.clone().json(),m=body&&body.els_matrix_context;", `const body=await req.clone().json(),m=body&&body.els_matrix_context;${readingGuard}`) : MATRIX_AI_GUARD;
  const accountGuard = readingOnly && RAZIEL_ACCOUNT_PREVIEW_BRANCHES.has(branch) ? `
  // Existing per-user APIs only; forward original credentials unchanged. The
  // server validates JWT/auth.uid(), expected principal, revision and batch ID.
  if(req.method==='POST'&&u.origin===authOrigin&&/^Bearer [^ ]+$/i.test(req.headers.get('authorization')||'')){
   try{
    const token=req.headers.get('authorization').slice(7),part=token.split('.')[1];
    const claims=JSON.parse(atob((part||'').replace(/-/g,'+').replace(/_/g,'/')));
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Reject the public anon token here. Decoding is NOT authentication: the
    // unchanged server must still verify signature, expiry and ownership.
    if(claims.role!=='authenticated'||!uuid.test(claims.sub||''))throw new Error('account_required');
    const raw=await req.clone().text();
    if(raw.length>600000)throw new Error('preview_request_too_large');
    const b=JSON.parse(raw);
    if(b&&b.p_expected_user_id===claims.sub){
     if(u.pathname==='/rest/v1/rpc/research_state_snapshot_v1'&&Object.keys(b).length===1)return fetch(req);
     if(u.pathname==='/rest/v1/rpc/research_state_apply_ops_v1'&&Object.keys(b).every(k=>['p_expected_user_id','p_batch_id','p_expected_revision','p_ops'].includes(k))
      &&uuid.test(b.p_batch_id||'')&&Number.isSafeInteger(b.p_expected_revision)&&b.p_expected_revision>=0
      &&Array.isArray(b.p_ops)&&b.p_ops.length>0&&b.p_ops.length<=100)return fetch(req);
    }
    // No automatic invocation: same session submit/one-shot gate. No additional
    // planner/action route, ordinary model or matrix scan started by this worker.
    if(u.pathname==='/functions/v1/ai-analyze'&&b&&b.kind==='research'&&b.persona==='raziel'
     &&b.research_contract==='public-number-research-run-v1'&&typeof b.subject==='string'&&b.subject.trim()
     &&['fast','deep'].includes(b.intelligence_level)&&(!b.view_mode||['landscape','exploratory'].includes(b.view_mode))
     &&!b.metatron&&!b.companion_action&&!b.els_planning_action&&!b.els_matrix_reading_action)return fetch(req);
   }catch{}
  }
` : '';
  return worker.replace(DENY_MARKER, () => guard + accountGuard + DENY_MARKER);
}
