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
// opts.approvals: entries of the approvals record (parseLawApprovals); a well-formed entry for the rule_id counts as recorded.
// Extended 12.11.2026 (G1 technical writer, main-audit session): an owner change at the same version and the activation of a law
// that the previous snapshot listed as retired are refused like the other in-place changes.
export function compareLawsSnapshots(prev, next, opts = {}) {
  const v = []; const approved = new Set([...(opts.approvedNewLaws || []), ...(opts.approvals || []).filter((a) => APPROVAL_REF.test(a.ref)).map((a) => a.rule_id)]);
  const prevRetired = new Set(prev.retired.map((x) => x.rule_id));
  const before = new Map(prev.active.map(x => [x.rule_id, x]));
  const after = new Map(next.active.map(x => [x.rule_id, x]));
  const nextRetired = new Set(next.retired.map(x => x.rule_id));
  for (const [id, b] of before) {
    const a = after.get(id);
    if (!a) { if (!nextRetired.has(id)) v.push(id + ': removed from the active tree without a retirement record'); continue; }
    if (a.version < b.version) v.push(id + ': version went backwards (v' + b.version + ' -> v' + a.version + ')');
    else if (a.version === b.version && a.md5 !== b.md5) v.push(id + ': text changed in place at v' + a.version + ' (a change of an existing contract needs a new version)');
    else if (a.version > b.version && a.md5 === b.md5) v.push(id + ': version bumped without any text change');
    if (a.version === b.version && a.owner !== b.owner) v.push(id + ': owner changed in place at v' + a.version + ' (' + b.owner + ' -> ' + a.owner + '; an owner change needs a new version)');
  }
  for (const [id] of after) {
    if (before.has(id) || approved.has(id)) continue;
    v.push(prevRetired.has(id)
      ? id + ': a retired law was activated again without a recorded approval'
      : id + ': new law without a recorded approval (explain why the existing owner is not enough)');
  }
  return v;
}

// ── Approvals record (12.11.2026). Format, one per line: A|rule_id|work_log:<uuid>|YYYY-MM-DD ─────────────────────────────────
// TECHNICAL (checked here): the line is well formed, the reference has the work_log:<uuid> form, the rule is in the new snapshot, no
// duplicates. HUMAN GATE (not checkable in CI): that the referenced record really is ZURIEL's approval of exactly this change. Every
// accepted entry is returned in humanGate so a reviewer can see what still needs a human check.
export const APPROVAL_REF = /^work_log:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function parseLawApprovals(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [kind, rule_id, ref, date] = line.split('|');
    out.push({ kind, rule_id, ref, date, line });
  }
  return out;
}
export function validateLawApprovals(entries, next) {
  const violations = []; const humanGate = []; const seen = new Set();
  const active = new Set(next.active.map((x) => x.rule_id));
  for (const e of entries) {
    if (e.kind !== 'A' || !e.rule_id || !e.ref || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) { violations.push('approval line malformed: ' + e.line); continue; }
    if (!APPROVAL_REF.test(e.ref)) { violations.push(e.rule_id + ': approval reference is not work_log:<uuid> (' + e.ref + ')'); continue; }
    if (!active.has(e.rule_id)) violations.push(e.rule_id + ': approval names a law that is not in the new snapshot');
    if (seen.has(e.rule_id)) violations.push(e.rule_id + ': approved twice');
    seen.add(e.rule_id);
    humanGate.push(e.rule_id + ' <- ' + e.ref + ' (authenticity: human gate)');
  }
  return { violations, humanGate };
}

// ── Repository contract files (12.11.2026): new structure, owner references in the Owner Index, change of a registered contract ──
export const CONTRACT_FILE = /(CONTRACT|_LAW|LAW_|MASTER|REGISTRY|FINAL)[^/]*\.md$/i;
export const CONTRACT_EXEMPT_DIR = /^(docs\/reviews\/|docs\/archive\/|docs\/audit-evidence\/|docs\/planning\/|docs\/research-notes\/|audits\/|planning\/|research-notes\/|research-library\/|drafts\/)/;
export const ROUTING_SPINE = new Set(['SOD1820_MASTER_OWNER_INDEX.md', 'SOD1820_MASTER_ROADMAP.md', 'SOD1820_MASTER_STATE.md']);
const ROUTING_HEADER = /OWNER-ROUTING:\s*(EXTEND_EXISTING|SUPERSEDE_EXISTING|GENUINELY_NEW_DOMAIN|HISTORICAL)\b\s*`?([A-Za-z0-9_.\-\/]+)?`?/;
const HISTORY_MARK = /(היסטור|לא פעיל|אינם פעילים|אינו פעיל|פרש|retired|inactive|historical|history|provenance|superseded|legacy)/i;
const basename = (p) => p.split('/').pop();
export const isContractFile = (p) => p.endsWith('.md') && CONTRACT_FILE.test(basename(p)) && !CONTRACT_EXEMPT_DIR.test(p);

// files: [{ path, head: first lines of the file }]; ctx: { index, activeIds: Set, baseline: Set of paths frozen on the baseline date }
export function unroutedContractFiles(files, ctx) {
  const v = [];
  for (const f of files) {
    if (!isContractFile(f.path) || ROUTING_SPINE.has(f.path) || ctx.baseline.has(f.path)) continue;
    if (ctx.index.includes(f.path) || ctx.index.includes(basename(f.path))) continue;
    const m = ROUTING_HEADER.exec(f.head || '');
    if (!m) { v.push(f.path + ': new contract-like file is neither routed in the Owner Index nor carries an OWNER-ROUTING header'); continue; }
    if (m[1] === 'EXTEND_EXISTING' || m[1] === 'SUPERSEDE_EXISTING') {
      const owner = m[2] || '';
      const ok = ctx.activeIds.has(owner) || (owner.endsWith('.md') && ctx.index.includes(basename(owner)));
      if (!ok) v.push(f.path + ': ' + m[1] + ' names ' + (owner || '(nothing)') + ', which is not an active or routed owner');
    }
  }
  return v;
}

// Owner Index rows: a backticked law-like owner must be an ACTIVE law (this covers retired AND nonexistent owners), unless the same row
// marks it as history. Recognised rows: any markdown table row '| a | b |' (leading pipe, any spacing), not only '| ' + label.
const LAW_LIKE = /^[a-z][a-z0-9_]*(_law|_contract|_protocol|_registry|_system|_foundation_v\d+)$/;
export function ownerIndexOwnerViolations(index, ctx) {
  const v = [];
  for (const line of index.split('\n')) {
    if (!/^\s*\|/.test(line) || /^\s*\|[\s:|-]+\|?\s*$/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    const ownerCell = cells[2] || '';
    for (const [, id] of ownerCell.matchAll(/`([a-z][a-z0-9_]*)`/g)) {
      if (!LAW_LIKE.test(id) && !ctx.retiredIds.has(id)) continue;
      if (ctx.activeIds.has(id) || HISTORY_MARK.test(line)) continue;
      v.push('Owner Index row routes to ' + id + ', which is ' + (ctx.retiredIds.has(id) ? 'a retired law' : 'not an active law') + ': ' + line.trim().slice(0, 140));
    }
  }
  return v;
}

// changes: [{ path, existedAtBase, added: added lines, removed: removed lines }] of a REAL base..head diff; ctx: { index (head), indexAddedLines }
// A registered contract (named in the Owner Index) may change only with a NEW change record: an added line with 'Human Gate' or
// 'CHANGE-RECORD:' and a date, which is not an edited old record (no removed line carries the same marker and the same dates), or
// together with an Owner Index line that names the file. Authenticity of the record is a human gate.
const DATE = /(\d{1,2}\.\d{1,2}\.20\d\d|20\d\d-\d\d-\d\d)/;
const DATES = /(\d{1,2}\.\d{1,2}\.20\d\d|20\d\d-\d\d-\d\d)/g;
const RECORD_MARK = /(Human Gate|CHANGE-RECORD:)/i;
export function registeredContractChangeViolations(changes, ctx) {
  const v = [];
  for (const c of changes) {
    if (!isContractFile(c.path) || ROUTING_SPINE.has(c.path) || !c.existedAtBase) continue;
    if (!ctx.index.includes(basename(c.path))) continue;
    const key = (l) => ((l.match(RECORD_MARK) || [''])[0].toLowerCase()) + '|' + (l.match(DATES) || []).join(',');
    const oldRecords = new Set((c.removed || '').split('\n').filter((l) => RECORD_MARK.test(l) && DATE.test(l)).map(key));
    const record = c.added.split('\n').some((l) => RECORD_MARK.test(l) && DATE.test(l) && !oldRecords.has(key(l)));
    const indexTouches = (ctx.indexAddedLines || '').split('\n').some((l) => l.includes(basename(c.path)));
    if (!record && !indexTouches) v.push(c.path + ': registered contract changed without a dated Human Gate / CHANGE-RECORD line or an Owner Index update');
  }
  return v;
}

// ── New structures in SQL (12.11.2026): comments are ignored; UNLOGGED, PARTITION OF, CREATE TABLE ... AS, materialized views,
// ALTER TABLE ... RENAME TO and dynamic EXECUTE 'create table' are recognised. A plain view is a projection, not a store, and is not
// counted; TEMP tables are session-local and are not counted.
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}
const IDENT = '(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))';
const QNAME = '(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT;
const STRUCT_RE = [
  new RegExp('create\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('create\\s+materialized\\s+view\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT + '\\s+rename\\s+to\\s+' + IDENT, 'gi'),
];
export function structuresCreated(sql) {
  const text = stripSqlComments(sql); const out = new Set();
  for (const re of STRUCT_RE.slice(0, 2)) for (const m of text.matchAll(re)) {
    const schema = (m[1] ?? m[2]) || 'public'; const name = m[3] ?? m[4];
    out.add(schema.toLowerCase() + '.' + name.toLowerCase());
  }
  for (const m of text.matchAll(STRUCT_RE[2])) out.add(((m[1] ?? m[2]) || 'public').toLowerCase() + '.' + (m[5] ?? m[6]).toLowerCase());
  if (/execute\s+[^;]*create\s+(?:unlogged\s+)?table/i.test(text)) out.add('dynamic:create-table');
  return out;
}

// The SQL files a package will APPLY: every step's file and rollback listed in docs/reviews/*/apply-plan.json.
export function applyPlanSqlPaths(plans) {
  const out = new Set();
  for (const plan of plans) for (const step of plan.steps || []) for (const f of [step.file, step.rollback]) if (f && f.endsWith('.sql')) out.add(f);
  return [...out].sort();
}


const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?([a-z_0-9]+)"?\.)?"?([a-z_0-9]+)"?/gi;
export function tablesCreated(sql) {
  const out = new Set();
  for (const m of stripSqlComments(sql).matchAll(CREATE_TABLE)) out.add((m[1] || 'public').toLowerCase() + '.' + m[2].toLowerCase());
  return out;
}

// files: [{ path, text }]; baseline: Set of 'schema.table' created before the baseline date; ctx.ownerOk(owner): boolean.
export function migrationTableViolations(files, baseline, ctx) {
  const v = [];
  for (const f of files) {
    for (const t of new Set([...tablesCreated(f.text), ...structuresCreated(f.text)])) {
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
