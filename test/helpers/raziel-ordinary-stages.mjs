import assert from "node:assert/strict";

// Explicit ELS actions have their own guarded quota/model calls before ordinary
// conversation. Locate the ordinary bindings, not the first call in the route.
// Require unique anchors so a missing/duplicated boundary cannot pass as -1.
export function ordinaryRazielStages(route) {
  const at = (anchor) => {
    const index = route.indexOf(anchor);
    assert.ok(index >= 0, `ordinary Raziel boundary missing: ${anchor}`);
    assert.equal(route.indexOf(anchor, index + anchor.length), -1, `ambiguous boundary: ${anchor}`);
    return index;
  };
  return {
    deterministic: at('if (det && det.enabled === true && det.mode === "deterministic" && det.needs_synthesis === false)'),
    selector: at('const rSel = selectRazielIntelligence('),
    quota: at('const q = await checkQuota(rBudgetIdentity, tier, rLimitOverride, { failOpen: !!rTrusted });'),
    trace: at('activeTrace = await beginOperationalTrace({\n        body,\n        identityClass: tier,\n        capability: rPersonalAreaCompanion'),
    model: at('const rel = await callClaudeReliable({\n        apiKey: ANTHROPIC_KEY, model: rModel, system: rzSys, user,'),
  };
}
