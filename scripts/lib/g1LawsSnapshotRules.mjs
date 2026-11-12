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
    else if (kind === 'R') retired.push({ rule_id: f[0], version: Number(f[1]), owner: f[2], routing: f[3] || '' });
    else throw new Error('unknown snapshot row: ' + line);
  }
  return { active, retired };
}

// ctx: { index: Owner Index text, fileExists(path): boolean, retiredWithoutSuccessor: string[], codexSlugs: Set of proven slugs,
//        registeredDocs (optional; defaults to registeredDocumentOwners(index)), unregisteredDocumentOwners (optional known gaps) }
// project_codex.<slug> resolves ONLY when the slug is in the newest dated record of existing project_codex items
// (audits/g1-agent-entry/G1_PROJECT_CODEX_SLUGS_YYYYMMDD.txt). The prefix alone is not proof; no list means no codex owner resolves.
// A DOCUMENT owner (round 3) resolves ONLY when the file exists AND it is REGISTERED: named as an owner in the owner cell of an
// Owner Index row that is not classified as history. An existing file is not an owner by existing; no registered set means no
// document owner resolves (fail-closed, like the codex list).
export const isDocumentOwner = (owner) => /\.md$/.test(owner || '');
export function ownerResolves(owner, activeIds, fileExists, codexSlugs, registeredDocs) {
  if (!owner) return false;
  if (owner.startsWith('project_codex.')) return !!codexSlugs && codexSlugs.has(owner.slice('project_codex.'.length));
  if (isDocumentOwner(owner)) return fileExists(owner) && !!registeredDocs && registeredDocs.has(owner);
  return activeIds.has(owner);
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

// The successor of a retired law comes from ONE of two sources (contracts session, alignment README section 16.4):
//   (1) the owner recorded at retirement (metadata.compaction_v1.canonical_owner): history, never rewritten; the R row's 5th field is empty;
//   (2) a later mapping in metadata.retired_routing_v1: the 5th field is 'retired_routing_v1:work_log:<uuid>' (its approval reference).
export const RETIRED_ROUTING_SOURCE = /^retired_routing_v1:work_log:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function validateLawsSnapshot(snap, ctx) {
  const v = [];
  const activeIds = new Set(snap.active.map(x => x.rule_id));
  const retiredIds = new Set(snap.retired.map(x => x.rule_id));
  const registeredDocs = ctx.registeredDocs ?? registeredDocumentOwners(ctx.index || '');
  const knownUnregistered = new Set(ctx.unregisteredDocumentOwners || []);
  // one statement of what is wrong with the DIRECT owner of a law (null = it resolves)
  const ownerProblem = (law) => {
    if (!law.owner || law.owner === '-') return 'no canonical owner';
    if (retiredIds.has(law.owner)) return 'owner ' + law.owner + ' is a retired law';
    if (isDocumentOwner(law.owner) && ctx.fileExists(law.owner) && !registeredDocs.has(law.owner)) {
      return knownUnregistered.has(law.owner) ? null : 'owner document ' + law.owner + ' exists but is not registered as an owner in the Owner Index';
    }
    if (!ownerResolves(law.owner, activeIds, ctx.fileExists, ctx.codexSlugs, registeredDocs)) return 'owner ' + law.owner + ' does not resolve';
    return null;
  };
  if (activeIds.size !== snap.active.length) v.push('duplicate active rule_id');
  const byId = new Map(snap.active.map((l) => [l.rule_id, l]));
  for (const law of snap.active) {
    const direct = ownerProblem(law);
    if (direct) { v.push(law.rule_id + ': ' + direct); continue; }
    if (law.owner === law.rule_id && !ctx.index.includes('`' + law.rule_id + '`')) v.push(law.rule_id + ': owner law missing from the Owner Index');
    // the chain of owners must end at a valid root: a self-owned active law, a proven codex item or a registered document.
    // A broken link at any depth and a chain that returns to a law already on it (a cycle) are refused.
    const seen = [law.rule_id]; let cur = law;
    while (cur.owner !== cur.rule_id && byId.has(cur.owner)) {
      if (seen.includes(cur.owner)) { v.push(law.rule_id + ': ownership chain is a cycle (' + [...seen, cur.owner].join(' -> ') + ')'); break; }
      seen.push(cur.owner); cur = byId.get(cur.owner);
      const deep = ownerProblem(cur);
      if (deep) { v.push(law.rule_id + ': ownership chain reaches ' + cur.rule_id + ', whose ' + deep); break; }
      if (seen.length > 16) { v.push(law.rule_id + ': ownership chain is longer than 16 links (' + seen.join(' -> ') + ')'); break; }
    }
  }
  for (const r of snap.retired) {
    if (activeIds.has(r.rule_id)) v.push(r.rule_id + ': listed both active and retired');
    if (r.routing && !RETIRED_ROUTING_SOURCE.test(r.routing)) v.push(r.rule_id + ': successor source is not retired_routing_v1:work_log:<uuid> (' + r.routing + ')');
    if (r.owner === '-') {
      if (r.routing) v.push(r.rule_id + ': a retired_routing_v1 source without a successor');
      else if (!ctx.retiredWithoutSuccessor.includes(r.rule_id)) v.push(r.rule_id + ': retired without a recorded successor (not a known gap)');
    }
    else if (retiredIds.has(r.owner)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' is itself retired');
    else if (!ownerResolves(r.owner, activeIds, ctx.fileExists, ctx.codexSlugs, registeredDocs)) v.push(r.rule_id + ': recorded successor ' + r.owner + ' does not resolve');
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
  // the successor recorded for a retired law is history: it changes only through a later retired_routing_v1 record (never by rewriting
  // the owner of the retired row, and never silently). Authenticity of the referenced approval is a human gate.
  const prevRetiredRows = new Map(prev.retired.map((x) => [x.rule_id, x]));
  for (const r of next.retired) {
    const b = prevRetiredRows.get(r.rule_id);
    if (!b || b.owner === r.owner) continue;
    if (!RETIRED_ROUTING_SOURCE.test(r.routing || '')) v.push(r.rule_id + ': recorded successor changed (' + b.owner + ' -> ' + r.owner + ') without a retired_routing_v1 record (the owner recorded at retirement is history and is not rewritten)');
  }
  return v;
}

// A document that becomes the canonical owner of a law for the FIRST time (no law of the previous snapshot named it) is a new document
// owner. Registration (the Owner Index, validateLawsSnapshot) is one check; AUTHORIZATION is a separate recorded approval line
// 'D|<path>|work_log:<uuid>|YYYY-MM-DD' in the approvals record. The form is technical; that it is ZURIEL's approval is a human gate.
export function newDocumentOwnerViolations(prev, next, entries) {
  const v = []; const had = new Set([...prev.active, ...prev.retired].map((x) => x.owner).filter(isDocumentOwner));
  const approved = new Set((entries || []).filter((e) => e.kind === 'D' && APPROVAL_REF.test(e.ref || '') && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '')).map((e) => e.rule_id));
  for (const d of new Set(next.active.map((x) => x.owner).filter(isDocumentOwner))) {
    if (!had.has(d) && !approved.has(d)) v.push(d + ': new document owner without a recorded approval (D|' + d + '|work_log:<uuid>|date)');
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
    if (e.kind === 'D') { // a new document owner approval (newDocumentOwnerViolations decides whether it is needed); form only
      if (!isDocumentOwner(e.rule_id) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) violations.push('approval line malformed: ' + e.line);
      else if (!APPROVAL_REF.test(e.ref || '')) violations.push(e.rule_id + ': approval reference is not work_log:<uuid> (' + e.ref + ')');
      else humanGate.push('document owner ' + e.rule_id + ' <- ' + e.ref + ' (authenticity: human gate)');
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
    ...newDocumentOwnerViolations(prev, next, ctx.approvals || []),
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
const DOC_IN_CELL = /`([A-Za-z0-9_.\/-]+\.md)`/g;
// The owner cells of the Owner Index rows (any markdown table row), with the explicit history classification of each cell.
function ownerCells(index) {
  const out = [];
  for (const line of (index || '').split('\n')) {
    if (!/^\s*\|/.test(line) || /^\s*\|[\s:|-]+\|?\s*$/.test(line)) continue;
    const ownerCell = line.split('|').map((c) => c.trim())[2] || '';
    out.push({ line, ownerCell, history: HISTORY_STATUS.test(ownerCell) });
  }
  return out;
}
// REGISTERED document owners (round 3): the documents named (backticked path) in the owner cell of an Owner Index row that is not
// classified as history. This is the only registration of a document as an owner; a file that merely exists is not registered.
export function registeredDocumentOwners(index) {
  const out = new Set();
  for (const { ownerCell, history } of ownerCells(index)) if (!history) for (const [, path] of ownerCell.matchAll(DOC_IN_CELL)) out.add(path);
  return out;
}
export function ownerIndexOwnerViolations(index, ctx) {
  const v = [];
  // a document named as an owner must exist in the repository (ctx.fileExists; skipped when the caller cannot see the tree)
  if (ctx.fileExists) for (const { line, ownerCell, history } of ownerCells(index)) {
    if (history) continue;
    for (const [, path] of ownerCell.matchAll(DOC_IN_CELL)) if (!ctx.fileExists(path)) v.push('Owner Index row routes to document ' + path + ', which does not exist in the repository: ' + line.trim().slice(0, 140));
  }
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
  // code: everything that can run, dollar-quoted bodies included. top: the same WITHOUT the dollar-quoted bodies, i.e. the statements
  // the file itself runs at top level (round 3: SELECT ... INTO creates a table there, and assigns a variable inside PL/pgSQL).
  const strings = []; const comments = []; let code = ''; let top = '';
  const emit = (x) => { code += x; top += x; };
  let i = 0; const n = sql.length;
  while (i < n) {
    const c = sql[i]; const c2 = sql.slice(i, i + 2);
    if (c2 === '--') { const j = sql.indexOf('\n', i); const end = j < 0 ? n : j; comments.push(sql.slice(i + 2, end)); emit(' '); i = end; continue; }
    if (c2 === '/*') {
      let depth = 1; let j = i + 2;
      while (j < n && depth > 0) { if (sql.startsWith('/*', j)) { depth++; j += 2; } else if (sql.startsWith('*/', j)) { depth--; j += 2; } else j++; }
      comments.push(sql.slice(i + 2, Math.max(i + 2, j - 2))); emit(' '); i = j; continue;
    }
    if (c === "'" || ((c === 'E' || c === 'e') && sql[i + 1] === "'" && !/[A-Za-z0-9_$]/.test(sql[i - 1] || ''))) {
      const esc = c !== "'"; let j = i + (esc ? 2 : 1); let s = '';
      while (j < n) {
        if (esc && sql[j] === '\\') { s += sql.slice(j, j + 2); j += 2; continue; }
        if (sql[j] === "'") { if (sql[j + 1] === "'") { s += "'"; j += 2; continue; } j++; break; }
        s += sql[j]; j++;
      }
      strings.push(s); emit("''"); i = j; continue;
    }
    if (c === '"') { const j = sql.indexOf('"', i + 1); const end = j < 0 ? n : j + 1; emit(sql.slice(i, end)); i = end; continue; }
    const dq = c === '$' && !/[A-Za-z0-9_]/.test(sql[i - 1] || '') ? /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i)) : null;
    if (dq) {
      const tag = dq[0]; const j = sql.indexOf(tag, i + tag.length); const end = j < 0 ? n : j;
      const inner = lexSql(sql.slice(i + tag.length, end));
      strings.push(...inner.strings); comments.push(...inner.comments); code += ' ' + inner.code + ' '; top += " '' "; i = j < 0 ? n : j + tag.length; continue;
    }
    emit(c); i++;
  }
  return { code, strings, comments, top };
}
export function stripSqlComments(sql) { return lexSql(sql).code; }

// ── New structures in SQL: UNLOGGED, PARTITION OF, CREATE TABLE ... AS, materialized views, ALTER TABLE ... RENAME TO, dynamic
// EXECUTE of a string that creates a table, and (round 3) a top-level SELECT ... INTO <table> are recognised. A plain view is a
// projection, not a store, and is not counted; TEMP tables are session-local and are not counted.
//
// SELECT ... INTO: at the top level of a file, 'SELECT ... INTO [UNLOGGED] [TABLE] name' (also after a WITH clause) creates a table.
// Inside a PL/pgSQL body the same words assign variables, PL/pgSQL refuses EXECUTE of SELECT ... INTO, and an SQL-language function
// may not contain it (all three verified on PostgreSQL 16: scripts/test-g1-agent-routing-smoke.mjs names the probe). So only the
// TOP-LEVEL statements are searched (lexSql().top), at parenthesis depth 0, and only when the statement starts with SELECT or WITH.
//
// KNOWN LIMITS OF THIS DETECTION (stated, not hidden; anything here that creates a store is NOT seen by CI):
//   1. a function or DO body written as a single-quoted string (not dollar-quoted) is data: its CREATE TABLE is seen only by the
//      dynamic check below, and only when the same file has the word EXECUTE;
//   2. dynamic SQL assembled from pieces ('cre' || 'ate table ...', format() with the keyword in an argument, a variable);
//   3. dynamic CREATE MATERIALIZED VIEW (the dynamic check looks for CREATE TABLE only), and SQL passed as a string to a scheduler or
//      a remote executor (cron.schedule, dblink_exec) when written in single quotes;
//   4. CREATE FOREIGN TABLE, ALTER TABLE ... SET SCHEMA, ALTER TABLE ... ATTACH PARTITION, CREATE EXTENSION (an extension may create
//      tables), CREATE SCHEMA and sequences/types are not counted as stores here;
//   5. psql meta-commands: \i / \ir includes are not followed, \gexec runs the result of a query as SQL;
//   6. over-detection (the safe side): a function BODY that creates a table is counted when the function is defined, not when it runs,
//      and a CREATE TABLE inside a dollar-quoted literal that is only data is counted too;
//   7. scope: only supabase/migrations and the SQL files of docs/reviews/*/apply-plan.json are read. SQL elsewhere (other proposed
//      files, Edge function code, scripts) and anything run directly on the database is not seen; the baseline covers the tables the
//      migrations create (41 of the live public tables), not the live schema.
const IDENT = '(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))';
const QNAME = '(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT;
const STRUCT_RE = [
  new RegExp('create\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('create\\s+materialized\\s+view\\s+(?:if\\s+not\\s+exists\\s+)?' + QNAME, 'gi'),
  new RegExp('alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:' + IDENT + '\\s*\\.\\s*)?' + IDENT + '\\s+rename\\s+to\\s+' + IDENT, 'gi'),
];
const stripParens = (t) => { let prev; do { prev = t; t = t.replace(/\([^()]*\)/g, ' '); } while (t !== prev); return t; };
const SELECT_INTO = new RegExp('^\\s*(?:with\\b[\\s\\S]*?\\bselect\\b|select\\b)[\\s\\S]*?\\binto\\s+(temp\\s+|temporary\\s+|unlogged\\s+)?(?:table\\s+)?' + QNAME, 'i');
export function selectIntoTables(sql) {
  const out = new Set();
  for (const stmt of lexSql(sql).top.split(';')) {
    const m = SELECT_INTO.exec(stripParens(stmt));
    if (!m || /^temp/i.test(m[1] || '')) continue;
    out.add(((m[2] ?? m[3]) || 'public').toLowerCase() + '.' + (m[4] ?? m[5]).toLowerCase());
  }
  return out;
}
export function structuresCreated(sql) {
  const { code, strings } = lexSql(sql); const out = selectIntoTables(sql);
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
