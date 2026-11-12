// Pure validators behind the G1 dated laws snapshot checks (focused alignment, 12.11.2026).
// No I/O, no database, no service key: callers pass text and lookup functions. Extends the existing G1 smoke test; creates no store.
// Three enforcement cases, each with refuse AND allow fixtures in scripts/test-g1-agent-routing-smoke.mjs:
//   (1) reference to an owner that retired      -> validateLawsSnapshot
//   (2) change of an existing contract          -> compareLawsSnapshots (same version + different text hash = in-place edit)
//   (3) creation of a new structure             -> new law (compareLawsSnapshots) and new table (migrationTableViolations)
// Scope: CI-visible changes only. A direct database write that never passes through Git is NOT seen here (see the alignment README, section 6).

export const INTAKE_CLASSES = ['CANONICAL_OWNER', 'SOURCE_INGRESS_PROVENANCE', 'PERSONAL_STATE', 'OPERATIONAL_RUNTIME', 'LEGACY_COMPATIBILITY'];

export function parseLawsSnapshot(text) {
  const active = []; const retired = [];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [kind, ...f] = line.split('|');
    if (kind === 'L') active.push({ rule_id: f[0], version: Number(f[1]), owner: f[2], family: f[3], md5: f[4] });
    else if (kind === 'R') retired.push({ rule_id: f[0], version: Number(f[1]), owner: f[2] });
    else throw new Error('unknown snapshot row: ' + line);
  }
  return { active, retired };
}

// ctx: { index: Owner Index text, fileExists(path): boolean, retiredWithoutSuccessor: string[] }
export function ownerResolves(owner, activeIds, fileExists) {
  return activeIds.has(owner) || owner.startsWith('project_codex.') || fileExists(owner);
}

export function validateLawsSnapshot(snap, ctx) {
  const v = [];
  const activeIds = new Set(snap.active.map(x => x.rule_id));
  const retiredIds = new Set(snap.retired.map(x => x.rule_id));
  if (activeIds.size !== snap.active.length) v.push('duplicate active rule_id');
  for (const law of snap.active) {
    if (!law.owner || law.owner === '-') { v.push(law.rule_id + ': no canonical owner'); continue; }
    if (retiredIds.has(law.owner)) v.push(law.rule_id + ': owner ' + law.owner + ' is a retired law');
    else if (!ownerResolves(law.owner, activeIds, ctx.fileExists)) v.push(law.rule_id + ': owner ' + law.owner + ' does not resolve');
    if (law.owner === law.rule_id && !ctx.index.includes('`' + law.rule_id + '`')) v.push(law.rule_id + ': owner law missing from the Owner Index');
  }
  for (const r of snap.retired) {
    if (activeIds.has(r.rule_id)) v.push(r.rule_id + ': listed both active and retired');
    if (r.owner === '-') { if (!ctx.retiredWithoutSuccessor.includes(r.rule_id)) v.push(r.rule_id + ': retired without a recorded successor (not a known gap)'); }
    else if (retiredIds.has(r.owner)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' is itself retired');
    else if (!ownerResolves(r.owner, activeIds, ctx.fileExists)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' does not resolve');
  }
  return v;
}

// opts.approvedNewLaws: rule_ids a human approved as NEW (otherwise a new law is a violation until justified).
export function compareLawsSnapshots(prev, next, opts = {}) {
  const v = []; const approved = new Set(opts.approvedNewLaws || []);
  const before = new Map(prev.active.map(x => [x.rule_id, x]));
  const after = new Map(next.active.map(x => [x.rule_id, x]));
  const nextRetired = new Set(next.retired.map(x => x.rule_id));
  for (const [id, b] of before) {
    const a = after.get(id);
    if (!a) { if (!nextRetired.has(id)) v.push(id + ': removed from the active tree without a retirement record'); continue; }
    if (a.version < b.version) v.push(id + ': version went backwards (v' + b.version + ' -> v' + a.version + ')');
    else if (a.version === b.version && a.md5 !== b.md5) v.push(id + ': text changed in place at v' + a.version + ' (a change of an existing contract needs a new version)');
    else if (a.version > b.version && a.md5 === b.md5) v.push(id + ': version bumped without any text change');
  }
  for (const [id] of after) if (!before.has(id) && !approved.has(id)) v.push(id + ': new law without a recorded approval (explain why the existing owner is not enough)');
  return v;
}

const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_0-9]+)"?\.)?"?([a-z_0-9]+)"?/gi;
export function tablesCreated(sql) {
  const out = new Set();
  for (const m of sql.matchAll(CREATE_TABLE)) out.add((m[1] || 'public').toLowerCase() + '.' + m[2].toLowerCase());
  return out;
}

// files: [{ path, text }]; baseline: Set of 'schema.table' created before the baseline date; ctx.ownerOk(owner): boolean.
export function migrationTableViolations(files, baseline, ctx) {
  const v = [];
  for (const f of files) {
    for (const t of tablesCreated(f.text)) {
      if (baseline.has(t)) continue;
      const m = /--\s*OWNER-CHECK:\s*(EXTEND_EXISTING|NEW)\s+(\S+)(?:\s+(\S+))?(?:\s+APPROVAL:(\S+))?/i.exec(f.text);
      if (!m) { v.push(f.path + ': new table ' + t + ' has no "-- OWNER-CHECK:" justification'); continue; }
      const kind = m[1].toUpperCase();
      if (kind === 'EXTEND_EXISTING') { if (!ctx.ownerOk(m[2])) v.push(f.path + ': table ' + t + ' names owner ' + m[2] + ' which does not resolve to an active owner'); continue; }
      if (!INTAKE_CLASSES.includes(m[2])) v.push(f.path + ': NEW table ' + t + ' needs an Intake classification (' + INTAKE_CLASSES.join(' / ') + ')');
      else if (!m[3] || !ctx.ownerOk(m[3])) v.push(f.path + ': NEW table ' + t + ' needs a resolving owner after the classification');
      if (!m[4]) v.push(f.path + ': NEW table ' + t + ' needs APPROVAL:<reference>');
    }
  }
  return v;
}
