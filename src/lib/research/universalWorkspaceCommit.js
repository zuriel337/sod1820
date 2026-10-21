import { isUniversalFinding, universalFindingToResearchEntity } from "./universalFinding.js";

// Small commit adapter over the existing ResearchProvider actions. It owns no
// store and deliberately reports the provider's real commit result.
export function commitUniversalFinding(action, finding) {
  if (!isUniversalFinding(finding)) return false;
  const entity = universalFindingToResearchEntity(finding);
  if (!entity || typeof action !== "function") return false;
  return action(entity) === true;
}

export function commitUniversalFindings(action, items) {
  let committed = 0;
  for (const finding of Array.isArray(items) ? items : []) {
    if (commitUniversalFinding(action, finding)) committed += 1;
  }
  return committed;
}

export default commitUniversalFinding;
