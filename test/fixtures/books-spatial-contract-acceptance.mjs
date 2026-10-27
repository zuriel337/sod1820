// Acceptance/audit utilities only. No runtime source, renderer or verification authority.
export function classifyModelEvidence({ specification, binding, browser }) {
  if (!specification) return "UNMAPPED";
  if (!binding?.structureId || binding.structureId !== specification.id || !binding.renderer) return "SPECIFICATION_ONLY";
  if (!browser?.sourceSelection || !browser?.fallback || !browser?.nineViewportPresets) return "IMPLEMENTED_ACCEPTANCE_INCOMPLETE";
  return "SOURCE_BOUND_BROWSER_CHECKED";
}

export function inspectStructureBindings(structure, units, pdfPages) {
  const issues = [];
  const index = new Map(units.map(unit => [unit.id, unit]));
  const inspect = (source, owner) => {
    if (!source?.unit_id || !source?.source_ref || !Number.isInteger(source?.pdf_page)) {
      issues.push({ code: "MISSING_LOCATOR", owner });
      return;
    }
    const unit = index.get(source.unit_id);
    if (!unit) issues.push({ code: "UNKNOWN_UNIT", owner });
    else if (unit.pdf_page !== source.pdf_page || unit.source_ref !== source.source_ref) issues.push({ code: "SOURCE_UNIT_MISMATCH", owner });
    if (source.pdf_page < 1 || source.pdf_page > pdfPages) issues.push({ code: "PAGE_OUT_OF_RANGE", owner });
  };
  if (!structure.id) issues.push({ code: "MISSING_MODEL_ID" });
  if (!structure.sources?.length) issues.push({ code: "MISSING_MODEL_SOURCE" });
  for (const source of structure.sources || []) inspect(source, structure.id);
  const ids = new Set();
  for (const component of structure.components || []) {
    if (!component.id || ids.has(component.id)) issues.push({ code: "INVALID_COMPONENT_ID", owner: component.id });
    ids.add(component.id);
    inspect(component.source, component.id);
  }
  for (const relation of structure.source_relations || []) {
    if (!ids.has(relation.from_id) || !ids.has(relation.to_id)) issues.push({ code: "UNKNOWN_RELATION_COMPONENT", owner: structure.id });
    inspect(relation.source, relation.type);
  }
  return issues;
}

// Necessary audit fields only. This is not engine attestation or a UI authorization API;
// matching canonical execution/input/result must also be observed independently.
export function engineClaimHasRequiredAuditFields(result) {
  return result?.verification === "match"
    && result?.inputMatches === true
    && Boolean(result?.canonicalMethod && result?.traceId)
    && result?.sourceOnly !== true;
}
