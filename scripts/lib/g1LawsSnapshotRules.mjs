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

// ctx: { index: Owner Index text, fileExists(path): boolean, retiredWithoutSuccessor: string[], codexSlugs: Set of proven slugs }
// project_codex.<slug> resolves ONLY when the slug is in the newest dated record of existing project_codex items
// (audits/g1-agent-entry/G1_PROJECT_CODEX_SLUGS_YYYYMMDD.txt). The prefix alone is not proof; no list means no codex owner resolves.
export function ownerResolves(owner, activeIds, fileExists, codexSlugs) {
  if (!owner) return false;
  if (owner.startsWith('project_codex.')) return !!codexSlugs && codexSlugs.has(owner.slice('project_codex.'.length));
  return activeIds.has(owner) || (/\.md$/.test(owner) && fileExists(owner));
}
export function parseCodexSlugs(text) {
  const out = new Set();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [kind, id, slug] = line.split('|');
    if (kind !== 'C' || !/^\d+$/.test(id || '') || !slug) throw new Error('unknown codex record row: ' + line);
    out.add(slug);
  }
  return out;
}
// The newest dated record of one kind: names like G1_<KIND>_YYYYMMDD.txt; the date is the only ordering.
export function newestDated(names, kind) {
  const re = new RegExp('^G1_' + kind + '_(\\d{8})\\.txt$');
  return names.filter((n) => re.test(n)).sort().pop() || null;
}

export function validateLawsSnapshot(snap, ctx) {
  const v = [];
  const activeIds = new Set(snap.active.map(x => x.rule_id));
  const retiredIds = new Set(snap.retired.map(x => x.rule_id));
  if (activeIds.size !== snap.active.length) v.push('duplicate active rule_id');
  for (const law of snap.active) {
    if (!law.owner || law.owner === '-') { v.push(law.rule_id + ': no canonical owner'); continue; }
    if (retiredIds.has(law.owner)) v.push(law.rule_id + ': owner ' + law.owner + ' is a retired law');
    else if (!ownerResolves(law.owner, activeIds, ctx.fileExists, ctx.codexSlugs)) v.push(law.rule_id + ': owner ' + law.owner + ' does not resolve');
    if (law.owner === law.rule_id && !ctx.index.includes('`' + law.rule_id + '`')) v.push(law.rule_id + ': owner law missing from the Owner Index');
  }
  for (const r of snap.retired) {
    if (activeIds.has(r.rule_id)) v.push(r.rule_id + ': listed both active and retired');
    if (r.owner === '-') { if (!ctx.retiredWithoutSuccessor.includes(r.rule_id)) v.push(r.rule_id + ': retired without a recorded successor (not a known gap)'); }
    else if (retiredIds.has(r.owner)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' is itself retired');
    else if (!ownerResolves(r.owner, activeIds, ctx.fileExists, ctx.codexSlugs)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' does not resolve');
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
    if (e.kind === 'C') { // a codex item approval (codexAdditionViolations decides whether it is needed); only its form is checked here
      if (!e.rule_id || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) violations.push('approval line malformed: ' + e.line);
      else if (!APPROVAL_REF.test(e.ref || '')) violations.push('project_codex.' + e.rule_id + ': approval reference is not work_log:<uuid> (' + e.ref + ')');
      else humanGate.push('project_codex.' + e.rule_id + ' <- ' + e.ref + ' (authenticity: human gate)');
      continue;
    }
    if (e.kind !== 'A' || !e.rule_id || !e.ref || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) { violations.push('approval line malformed: ' + e.line); continue; }
    if (!APPROVAL_REF.test(e.ref)) { violations.push(e.rule_id + ': approval reference is not work_log:<uuid> (' + e.ref + ')'); continue; }
    if (!active.has(e.rule_id)) violations.push(e.rule_id + ': approval names a law that is not in the new snapshot');
    if (seen.has(e.rule_id)) violations.push(e.rule_id + ': approved twice');
    seen.add(e.rule_id);
    humanGate.push(e.rule_id + ' <- ' + e.ref + ' (authenticity: human gate)');
  }
  return { violations, humanGate };
}

// ── One transition check (round 2, 12.11.2026): the NEWEST dated laws snapshot is the current state. Every rule (owner resolution,
// Owner Index, approvals, base comparison) reads that one snapshot; older dated snapshots stay history and are never re-validated as
// current. A newer snapshot is checked BOTH against the previous one (compare) AND on its own (validate): a version bump that also
// points to an owner that does not exist is refused even though the bump itself is a proper change.
export function checkSnapshotTransition(prev, next, ctx) {
  return [
    ...compareLawsSnapshots(prev, next, { approvals: ctx.approvals || [] }),
    ...validateLawsSnapshot(next, ctx),
    ...validateLawApprovals(ctx.approvals || [], next).violations,
  ];
}

// project_codex items: a slug that appears in a newer dated codex record but not in the base record is a NEW codex item (a new
// structure in the codex store) and needs a recorded approval line 'C|<slug>|work_log:<uuid>|YYYY-MM-DD' in the approvals record.
// The form is technical; that the record really is ZURIEL's approval and that the dated list really came from a read-only query of
// the live table are human gates.
export function codexAdditionViolations(prevSlugs, nextSlugs, entries) {
  const v = []; const approved = new Set(entries.filter((e) => e.kind === 'C' && APPROVAL_REF.test(e.ref || '') && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '')).map((e) => e.rule_id));
  for (const s of nextSlugs) if (!prevSlugs.has(s) && !approved.has(s)) v.push('project_codex.' + s + ': new codex item without a recorded approval (C|' + s + '|work_log:<uuid>|date)');
  return v;
}

// ── Repository contract files (12.11.2026, round 2): new structure, owner references in the Owner Index, change of a registered contract ──
export const CONTRACT_FILE = /(CONTRACT|_LAW|LAW_|MASTER|REGISTRY|FINAL)[^/]*\.md$/i;
export const CONTRACT_EXEMPT_DIR = /^(docs\/reviews\/|docs\/archive\/|docs\/audit-evidence\/|docs\/planning\/|docs\/research-notes\/|audits\/|planning\/|research-notes\/|research-library\/|drafts\/)/;
export const ROUTING_SPINE = new Set(['SOD1820_MASTER_OWNER_INDEX.md', 'SOD1820_MASTER_ROADMAP.md', 'SOD1820_MASTER_STATE.md']);
const ROUTING_HEADER = /OWNER-ROUTING:\s*(EXTEND_EXISTING|SUPERSEDE_EXISTING|GENUINELY_NEW_DOMAIN|HISTORICAL)\b[ \t]*(?:`?(?!APPROVAL:)([A-Za-z0-9_.\-\/]+)`?)?[^\n]*?(?:APPROVAL:\s*([^\n]*?))?[ \t]*$/m;
// Explicit history classification of an owner REFERENCE. It counts only inside the owner cell of an Owner Index row; a domain label
// such as "Legacy WordPress adapter" never turns an active ownership row into history.
export const HISTORY_STATUS = /(\bRETIRED\b|\bSUPERSEDED\b|\bHISTORICAL\b|\bINACTIVE\b|היסטורי|היסטוריה|לא פעיל|אינו פעיל|אינם פעילים|פרש)/;
const basename = (p) => p.split('/').pop();
export const isContractFile = (p) => p.endsWith('.md') && CONTRACT_FILE.test(basename(p)) && !CONTRACT_EXEMPT_DIR.test(p);
const routedIn = (index, path) => !!index && (index.includes(path) || index.includes(basename(path)));

// files: [{ path, head }]. ctx: { index (head), routingIndex (the Owner Index at BASE for files added in the change; defaults to index),
// activeIds, codexSlugs, baseline (frozen paths), humanGate (optional array that collects what only a human can confirm) }.
// A new file is routed only by an Owner Index line that existed BEFORE the change: a line added in the same change that names the
// file is self-routing, which is the creation of a new owner, and needs an OWNER-ROUTING header like any other new owner.
// EXTEND_EXISTING names an owner that resolves. SUPERSEDE_EXISTING and GENUINELY_NEW_DOMAIN additionally need APPROVAL:work_log:<uuid>;
// the header itself is never an approval. HISTORICAL declares the file non-authoritative and is allowed (it cannot become an owner
// later without a new routing check).
export function unroutedContractFiles(files, ctx) {
  const v = []; const routingIndex = ctx.routingIndex ?? ctx.index;
  const ownerOk = (owner) => ctx.activeIds.has(owner) || (owner.startsWith('project_codex.') && !!ctx.codexSlugs && ctx.codexSlugs.has(owner.slice(14)))
    || (owner.endsWith('.md') && routedIn(routingIndex, owner));
  for (const f of files) {
    if (!isContractFile(f.path) || ROUTING_SPINE.has(f.path) || ctx.baseline.has(f.path)) continue;
    if (routedIn(routingIndex, f.path)) continue;
    const m = ROUTING_HEADER.exec(f.head || '');
    const selfRouted = routingIndex !== ctx.index && routedIn(ctx.index, f.path);
    if (!m) {
      v.push(f.path + (selfRouted
        ? ': new contract-like file is routed only by an Owner Index line added in the same change (self-routing creates a new owner; it needs OWNER-ROUTING and, for a new domain, APPROVAL:work_log:<uuid>)'
        : ': new contract-like file is neither routed in the Owner Index nor carries an OWNER-ROUTING header'));
      continue;
    }
    const [, kind, owner = '', approval] = m; const before = v.length;
    if (kind === 'HISTORICAL') continue;
    if ((kind === 'EXTEND_EXISTING' || kind === 'SUPERSEDE_EXISTING') && !ownerOk(owner)) v.push(f.path + ': ' + kind + ' names ' + (owner || '(nothing)') + ', which is not an active or routed owner');
    if (kind === 'SUPERSEDE_EXISTING' || kind === 'GENUINELY_NEW_DOMAIN') {
      if (!approval) v.push(f.path + ': ' + kind + ' is a declaration, not an approval; it needs APPROVAL:work_log:<uuid>');
      else if (!APPROVAL_REF.test(approval)) v.push(f.path + ': ' + kind + ' approval is not work_log:<uuid> (' + approval + ')');
      else if (ctx.humanGate && v.length === before) ctx.humanGate.push(f.path + ' ' + kind + ' <- ' + approval + ' (authenticity: human gate)');
    }
  }
  return v;
}

// Owner Index rows: a backticked law-like owner must be an ACTIVE law of the newest snapshot (this covers retired AND nonexistent
// owners), and a project_codex.<slug> owner must be a proven codex item, unless the OWNER CELL classifies that reference explicitly as
// history (HISTORY_STATUS). Recognised rows: any markdown table row (leading pipe, any spacing).
const LAW_LIKE = /^[a-z][a-z0-9_]*(_law|_contract|_protocol|_registry|_system|_foundation_v\d+)$/;
export function ownerIndexOwnerViolations(index, ctx) {
  const v = [];
  for (const line of index.split('\n')) {
    if (!/^\s*\|/.test(line) || /^\s*\|[\s:|-]+\|?\s*$/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    const ownerCell = cells[2] || '';
    const history = HISTORY_STATUS.test(ownerCell);
    for (const [, id] of ownerCell.matchAll(/`([a-z][a-z0-9_]*)`/g)) {
      if (!LAW_LIKE.test(id) && !ctx.retiredIds.has(id)) continue;
      if (ctx.activeIds.has(id) || history) continue;
      v.push('Owner Index row routes to ' + id + ', which is ' + (ctx.retiredIds.has(id) ? 'a retired law' : 'not an active law') + ': ' + line.trim().slice(0, 140));
    }
    if (ctx.codexSlugs) for (const [, slug] of ownerCell.matchAll(/project_codex\.([A-Za-z0-9_\-]+)/g)) {
      if (ctx.codexSlugs.has(slug) || history) continue;
      v.push('Owner Index row routes to project_codex.' + slug + ', which is not a proven codex item: ' + line.trim().slice(0, 140));
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

// ── SQL lexer (round 2): a string is not a comment and a comment is not code. '--' or '/*' inside a quoted string does NOT start a
// comment ('select '--'; create table public.g1_probe (id int);' creates a table). Single-quoted and E'' strings are DATA: their
// content is removed from the code and collected. Dollar-quoted bodies ($$...$$, $tag$...$tag$) are scanned AS CODE (a DO block or a
// function body runs its DDL); this over-detects a create statement inside a dollar-quoted literal, which is the safe side. "..." is an
// identifier and is kept. Block comments nest, as in PostgreSQL.
export function lexSql(sql) {
  const strings = []; const comments = []; let code = '';
  let i = 0; const n = sql.length;
  while (i < n) {
    const c = sql[i]; const c2 = sql.slice(i, i + 2);
    if (c2 === '--') { const j = sql.indexOf('\n', i); const end = j < 0 ? n : j; comments.push(sql.slice(i + 2, end)); code += ' '; i = end; continue; }
    if (c2 === '/*') {
      let depth = 1; let j = i + 2;
      while (j < n && depth > 0) { if (sql.startsWith('/*', j)) { depth++; j += 2; } else if (sql.startsWith('*/', j)) { depth--; j += 2; } else j++; }
      comments.push(sql.slice(i + 2, Math.max(i + 2, j - 2))); code += ' '; i = j; continue;
    }
    if (c === "'" || ((c === 'E' || c === 'e') && sql[i + 1] === "'" && !/[A-Za-z0-9_$]/.test(sql[i - 1] || ''))) {
      const esc = c !== "'"; let j = i + (esc ? 2 : 1); let s = '';
      while (j < n) {
        if (esc && sql[j] === '\\') { s += sql.slice(j, j + 2); j += 2; continue; }
        if (sql[j] === "'") { if (sql[j + 1] === "'") { s += "'"; j += 2; continue; } j++; break; }
        s += sql[j]; j++;
      }
      strings.push(s); code += "''"; i = j; continue;
    }
    if (c === '"') { const j = sql.indexOf('"', i + 1); const end = j < 0 ? n : j + 1; code += sql.slice(i, end); i = end; continue; }
    const dq = c === '$' && !/[A-Za-z0-9_]/.test(sql[i - 1] || '') ? /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i)) : null;
    if (dq) {
      const tag = dq[0]; const j = sql.indexOf(tag, i + tag.length); const end = j < 0 ? n : j;
      const inner = lexSql(sql.slice(i + tag.length, end));
      strings.push(...inner.strings); comments.push(...inner.comments); code += ' ' + inner.code + ' '; i = j < 0 ? n : j + tag.length; continue;
    }
    code += c; i++;
  }
  return { code, strings, comments };
}
export function stripSqlComments(sql) { return lexSql(sql).code; }

// ── New structures in SQL: UNLOGGED, PARTITION OF, CREATE TABLE ... AS, materialized views, ALTER TABLE ... RENAME TO and dynamic
// EXECUTE of a string that creates a table are recognised. A plain view is a projection, not a store, and is not counted; TEMP
// tables are session-local and are not counted.
const IDENT = '(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))';
const QNAME = '(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT;
const STRUCT_RE = [
  new RegExp('create\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('create\\s+materialized\\s+view\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT + '\\s+rename\\s+to\\s+' + IDENT, 'gi'),
];
export function structuresCreated(sql) {
  const { code, strings } = lexSql(sql); const out = new Set();
  for (const re of STRUCT_RE.slice(0, 2)) for (const m of code.matchAll(re)) {
    const schema = (m[1] ?? m[2]) || 'public'; const name = m[3] ?? m[4];
    out.add(schema.toLowerCase() + '.' + name.toLowerCase());
  }
  for (const m of code.matchAll(STRUCT_RE[2])) out.add(((m[1] ?? m[2]) || 'public').toLowerCase() + '.' + (m[5] ?? m[6]).toLowerCase());
  if (/\bexecute\b/i.test(code) && strings.some((s) => /create\s+(?:unlogged\s+)?table/i.test(s))) out.add('dynamic:create-table');
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
// A new store needs TWO separate things (research_intake_foundation_contract_law v13 §10, as cited by the contracts session):
//   (1) an owner that resolves and an Intake classification, and (2) a permission to create a NEW store under that owner.
// Owner existence is never the permission. The header lives in a real SQL comment:
//   -- OWNER-CHECK: EXTEND_EXISTING <owner> <INTAKE_CLASS> APPROVAL:work_log:<uuid>
//   -- OWNER-CHECK: NEW <INTAKE_CLASS> <owner> APPROVAL:work_log:<uuid>
// The APPROVAL form is technical; that it is ZURIEL's permission for this store is a human gate (ctx.humanGate collects it).
export function migrationTableViolations(files, baseline, ctx) {
  const v = [];
  for (const f of files) {
    const created = [...new Set([...tablesCreated(f.text), ...structuresCreated(f.text)])].filter((t) => !baseline.has(t));
    if (!created.length) continue;
    const header = lexSql(f.text).comments.map((c) => /^\s*OWNER-CHECK:\s*(.*)$/i.exec(c)).find(Boolean);
    for (const t of created) {
      const before = v.length;
      if (!header) { v.push(f.path + ': new table ' + t + ' has no "-- OWNER-CHECK:" justification'); continue; }
      const words = header[1].trim().split(/\s+/); const approval = (words.find((w) => /^APPROVAL:/i.test(w)) || '').replace(/^APPROVAL:/i, '');
      const rest = words.filter((w) => !/^APPROVAL:/i.test(w)); const kind = (rest[0] || '').toUpperCase();
      let owner; let klass;
      if (kind === 'EXTEND_EXISTING') { owner = rest[1]; klass = rest[2]; }
      else if (kind === 'NEW') { klass = rest[1]; owner = rest[2]; }
      else { v.push(f.path + ': OWNER-CHECK for ' + t + ' must start with EXTEND_EXISTING or NEW'); continue; }
      if (!owner || !ctx.ownerOk(owner)) v.push(f.path + ': table ' + t + ' names owner ' + (owner || '(nothing)') + ' which does not resolve to an active owner');
      if (!INTAKE_CLASSES.includes(klass)) v.push(f.path + ': ' + kind + ' table ' + t + ' needs an Intake classification (' + INTAKE_CLASSES.join(' / ') + ')');
      if (!approval) v.push(f.path + ': ' + kind + ' table ' + t + ' needs APPROVAL:work_log:<uuid> (permission to create a new store is separate from the owner existing)');
      else if (!APPROVAL_REF.test(approval)) v.push(f.path + ': ' + kind + ' table ' + t + ' approval is not work_log:<uuid> (' + approval + ')');
      else if (ctx.humanGate && v.length === before) ctx.humanGate.push(f.path + ' ' + t + ' <- ' + approval + ' (authenticity: human gate)');
    }
  }
  return v;
}
