// SOD1820: change-impact risk map over existing owners; no additional telemetry/health store.
// Detect potential regressions before optimizing, rather than only measuring byte budgets.
// This is a heuristic risk detector: it never claims an unchanged route is actually healthy.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const IMPACT_RULES = Object.freeze([
  {
    id: "shared-entry",
    files: /^(?:src\/(?:main2029\.jsx|App2029\.jsx|components\/experience2029\/(?:Sod2029Shell|SystemFrame2029|HomeComposition2029)\.jsx|lib\/(?:publicReadingRelease2029|authLazy2029|storageLazy2029|realtimeLazy2029)\.js)|vite\.config\.js|scripts\/(?:test-2029-shell-budget\.mjs|2029-shell-budget-baseline\.json))$/,
    scope: ["all public routes", "personal-area", "sign-in"],
    risks: ["entry weight / render delay", "lazy load changed user action", "missing authenticated dependency"],
    checks: ["npm run build", "node scripts/test-2029-shell-budget.mjs", "real mobile/desktop browser: guest + authenticated"],
    priority: "critical",
  },
  {
    id: "personal-save-and-sync",
    files: /^(src\/components\/userCenter\/|src\/components\/experience2029\/PostReadingActions2029\.jsx|src\/components\/community2029\/CommunityPersonalActions2029\.jsx|src\/lib\/research\/(?:personalSaveDecision|researchSyncRuntime|researchSyncState|ResearchProvider)\.(?:js|jsx)|src\/lib\/(?:AuthContext\.jsx|storageLazy2029\.js)|supabase\/functions\/(?:post-save|research-sync)\/)/,
    scope: ["personal-area", "post save", "number save", "community save"],
    risks: ["local save shown as server-confirmed", "sync queue dropped on lazy boundary", "account-switch or reload loses state"],
    checks: ["node --test test/personal-save-decision-2029.test.mjs", "node --test test/research-sync-hardening.test.mjs", "real signed-in browser: save → receipt → reload → account"],
    priority: "critical",
  },
  {
    id: "research-local-storage-and-reclaim",
    files: /^(?:src\/lib\/research\/(?:researchLocalOnly|researchSyncRuntime|researchSyncState|researchQueueCompaction|researchJournalLifecycle)\.js|src\/components\/userCenter\/(?:LocalOnlyResearch2029|PersonalSaveButton2029)\.jsx|test\/research-saved-integration-2029\.test\.mjs|\.github\/workflows\/research-sync-gate\.yml)/,
    scope: ["personal-area", "saved research", "local quota recovery", "offline reopen", "account switching"],
    risks: ["quota cleanup deletes unsynced research", "save falsely reports success", "pending journal never resumes", "stale or foreign account data reappears"],
    checks: ["node --test test/research-sync-hardening.test.mjs", "node --test test/research-saved-integration-2029.test.mjs", "real signed-in browser: full quota → save → receipt → reload → recovery"],
    priority: "critical",
  },
  {
    id: "els-mode-and-access",
    files: /^(?:src\/pages\/Els2029Page\.jsx|src\/components\/experience2029\/(?:ElsModeHelp2029|ElsNativeClassic2029|ElsRotatingMatrixCard2029)\.jsx|src\/lib\/research\/els2029[^/]*\.js|test\/els-2029[^/]*\.test\.mjs)/,
    scope: ["ELS classic", "ELS research", "ELS registered advanced gate", "Bible code mobile"],
    risks: ["Classic search becomes inaccessible", "research mode state resets", "advanced mode opens to guests", "help panel blocks matrix controls"],
    checks: ["node --test test/els-2029-classic-faithful-port.test.mjs", "node --test test/els-2029-semantic-surface.test.mjs", "node --test test/els-2029-research-bar.test.mjs", "real browser: guest Classic + registered advanced gate + mobile overlays"],
    priority: "critical",
  },
  {
    id: "book-public-source",
    files: /^(src\/(?:data\/bookReader2029\.js|pages\/(?:Books2029Page|PublicLibraryContinuity2029Page)\.jsx|components\/books2029\/|lib\/research\/(?:publicLibraryContinuity2029|bookResearchProjection))|public\/book-data\/)/,
    scope: ["books", "public PDF", "book deep links"],
    risks: ["reader opens before source admitted", "broken PDF/page links", "unavailable source shown as published"],
    checks: ["node --test src/lib/research/publicLibraryContinuity2029.test.js", "anonymous browser: book → PDF → page → back"],
    priority: "high",
  },
  {
    id: "home-first-content",
    files: /^(src\/(?:pages\/Home2029Page\.jsx|components\/experience2029\/(?:Home|home|Opening|Awakening)|lib\/(?:home|Home)|components\/books2029\/SiboniGate50HomeCard2029))/,
    scope: ["home mobile", "home desktop", "latest post"],
    risks: ["LCP/image preload regression", "pinned post replaced", "layout shift on delayed content"],
    checks: ["npm run build", "browser: home LCP/CLS at 390px and 1440px, cold cache"],
    priority: "high",
  },
  {
    id: "storage-auth-access",
    files: /^(src\/lib\/(?:AuthContext|supabase|storageLazy2029|authLazy2029)|src\/components\/userCenter\/|supabase\/(?:migrations\/|functions\/media-upload-intent\/))/,
    scope: ["sign-in", "private storage", "personal-area", "media upload"],
    risks: ["JWT refresh / RLS mismatch", "storage permissions changed", "fallback silently drops write"],
    checks: ["node --test test/research-sync-hardening.test.mjs", "browser: guest denied, owner success, second account denied"],
    priority: "critical",
  },
]);

const PRIORITY = { critical: 3, high: 2, medium: 1 };
export function impactForChangedFiles(files = []) {
  const normalized = [...new Set(files.map(x => String(x).replace(/^\.\//, "")).filter(Boolean))].sort();
  const matched = IMPACT_RULES.filter(rule => normalized.some(f => rule.files.test(f)));
  const risky = matched.length > 0;
  const scope = [...new Set(matched.flatMap(rule => rule.scope))];
  const checks = [...new Set(matched.flatMap(rule => rule.checks))];
  const risks = [...new Set(matched.flatMap(rule => rule.risks))];
  return {
    schema: "sod1820.change-impact.v1",
    inspectedFiles: normalized,
    categories: matched.map(r => r.id),
    priority: matched.reduce((p, r) => PRIORITY[r.priority] > PRIORITY[p] ? r.priority : p, "medium"),
    affectedScopes: scope,
    potentialFailures: risks,
    proposedChecks: checks,
    browserRequired: matched.some(r => r.checks.some(c => c.startsWith("browser:") || c.startsWith("real "))),
    verdict: risky ? "RISK_CANDIDATE_REQUIRES_TESTS" : "NO_RULE_MATCH_COVERAGE_UNKNOWN",
    evidence: "Changed-file routing only; not evidence that a defect exists or that a check passed.",
  };
}

function changesSince(base) {
  return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRT", `${base}...HEAD`], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const findArg = key => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : null; };
  const files = findArg("--files") ? findArg("--files").split(",") : changesSince(findArg("--base") || "origin/main");
  const report = impactForChangedFiles(files);
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log("SOD1820 proactive change impact:", report.verdict);
    console.log("Changed files:", report.inspectedFiles.join(", ") || "none");
    console.log("Affected:", report.affectedScopes.join(", ") || "unknown");
    console.log("Potential regressions:", report.potentialFailures.join(" | ") || "no mapped risk; not proof of safety");
    console.log("Required targeted evidence:", report.proposedChecks.join(" | ") || "manual change review");
  }
}
