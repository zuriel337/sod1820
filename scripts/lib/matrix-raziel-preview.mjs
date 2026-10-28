// Preview-only gate for the matrix → Raziel connection. It is not a transport, engine or session owner:
// the request still travels through the existing global Raziel session and the existing ai-analyze route.
// This module only decides (a) whether a build may admit that one request shape and (b) the worker text.
// The Preview worker stays read-only for everything else, and Vercel Git deploys for claude/* stay disabled
// until a reviewed cut is named explicitly.

export const MATRIX_RAZIEL_PREVIEW_BRANCHES = new Set([
  "claude/els-matrix-discovery-raziel-preview-20261028",
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
  const approvedGitPreview = env.VERCEL_ENV === "preview" && MATRIX_RAZIEL_PREVIEW_BRANCHES.has(branch);
  if (!explicit && !approvedGitPreview) return null;
  if (env.VERCEL_ENV === "production") throw new Error("matrix_raziel_preview_is_never_production");
  if (env.SOD_RAZIEL_SAFE_ACTIONS_PREVIEW === "true") throw new Error("matrix_raziel_and_mock_preview_conflict");
  if (branch && !MATRIX_RAZIEL_PREVIEW_BRANCHES.has(branch)) throw new Error("matrix_raziel_preview_branch_mismatch");
  return branch || [...MATRIX_RAZIEL_PREVIEW_BRANCHES][0];
}

export function buildMatrixRazielPreviewWorker(worker) {
  if (worker.split(DENY_MARKER).length !== 2) throw new Error("matrix_raziel_preview_deny_marker_not_unique");
  return worker.replace(DENY_MARKER, () => MATRIX_AI_GUARD + DENY_MARKER);
}
