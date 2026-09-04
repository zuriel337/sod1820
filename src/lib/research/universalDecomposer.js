// Universal Research Source Decomposer v1
//
// Projection/orchestration only. This module owns NO truth, engine, storage, graph,
// governance or publication semantics. It implements the existing Research Intake v8
// decomposition shape for any source (message/book/post/image/transcript/other) and
// transports results from canonical owners into one read-only workbench model.
//
// SOURCE -> EXTRACTED CONTENT -> CLAIM/FINDING CANDIDATES -> EVIDENCE/REPRESENTATIONS
// Identity / verification / governance / publication remain owned by their canonical laws.

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const QUOTE_PAIRS = [
  ["\"", "\""], ["׳", "׳"], ["״", "״"], ["“", "”"], ["'", "'"],
];

export function extractQuotedSegments(text) {
  const input = String(text || "");
  const out = [];
  for (const [open, close] of QUOTE_PAIRS) {
    const escapedOpen = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedClose = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escapedOpen}([^${escapedClose}\\n]{1,180})${escapedClose}`, "g");
    let m;
    while ((m = re.exec(input))) {
      const value = clean(m[1]);
      if (value.length < 2) continue;
      out.push({
        kind: "quoted_span",
        text: value,
        start: m.index,
        end: m.index + m[0].length,
        provenance: "source_exact_span",
      });
    }
  }
  return uniqueBy(out, (x) => `${x.text}|${x.start}`);
}

// Preserve source-native Tanach-style locators without converting Hebrew numerals locally.
// Exact witness verification belongs to the canonical source/corpus adapter, not this parser.
export function extractSourceReferences(text) {
  const input = String(text || "");
  const out = [];
  const re = /\(?([א-ת][א-ת\s״׳"'\-]{0,24})\s+([א-ת״׳"']{1,5})\s*[,,:]\s*([א-ת״׳"']{1,5})\)?/g;
  let m;
  while ((m = re.exec(input))) {
    const book = clean(m[1]).replace(/^["'״׳]+|["'״׳]+$/g, "");
    const chapterRaw = clean(m[2]);
    const verseRaw = clean(m[3]);
    if (!book || !chapterRaw || !verseRaw) continue;
    out.push({
      kind: "source_reference",
      corpus: "tanach_candidate",
      raw: clean(m[0]).replace(/^\(|\)$/g, ""),
      book,
      chapterRaw,
      verseRaw,
      start: m.index,
      end: m.index + m[0].length,
      verificationState: "not_tested",
    });
  }
  return uniqueBy(out, (x) => x.raw);
}

function relation(left, right, relationType, cue, start, raw) {
  const a = clean(left).replace(/^["'״׳]+|["'״׳]+$/g, "");
  const b = clean(right).replace(/^["'״׳]+|["'״׳]+$/g, "");
  if (!a || !b || a === b) return null;
  return {
    kind: "relation_candidate",
    left: a,
    right: b,
    relationType,
    cue,
    raw: clean(raw),
    start,
    epistemicType: "claim",
    verificationState: "not_tested",
    governanceState: "candidate",
    provenance: "source_claim",
  };
}

// Extract only relations the SOURCE itself makes explicit. These remain Claims/Candidates.
// No relation is turned into an Edge here.
export function extractSourceRelations(text) {
  const input = String(text || "");
  const out = [];

  const directionalPatterns = [
    {
      cue: "כינוי ל",
      type: "symbolizes_candidate",
      re: /["'״׳]?([^\n,.;:()]{1,35}?)["'״׳]?\s+(?:הוא\s+|היא\s+)?כינוי\s+ל(?:ספירת\s+)?["'״׳]?([^\n,.;:()]{1,35})/g,
    },
    {
      cue: "בחינת",
      type: "interpreted_as_candidate",
      re: /["'״׳]?([^\n,.;:()]{1,35}?)["'״׳]?\s+(?:הוא\s+|היא\s+)?בחינת\s+["'״׳]?([^\n,.;:()]{1,35})/g,
    },
    {
      cue: "כנגד",
      type: "corresponds_to_candidate",
      re: /["'״׳]?([^\n,.;:()]{1,35}?)["'״׳]?\s+כנגד\s+["'״׳]?([^\n,.;:()]{1,35})/g,
    },
  ];

  for (const p of directionalPatterns) {
    let m;
    while ((m = p.re.exec(input))) {
      const r = relation(m[1], m[2], p.type, p.cue, m.index, m[0]);
      if (r) out.push(r);
    }
  }

  // Parenthetical apposition is intentionally symmetric/ambiguous: "בועז (חכמה)" may mean
  // person->concept, while "הבינה (נעמי)" reverses the written order. Human Gate resolves it.
  const apposition = /\b([א-ת][א-ת״׳"'\-]{1,24})\s*\(\s*([א-ת][א-ת\s״׳"'\-]{1,30})\s*\)/g;
  let a;
  while ((a = apposition.exec(input))) {
    if (/[,.:]/.test(a[2])) continue;
    const r = relation(a[1], a[2], "apposition_candidate", "סוגריים", a.index, a[0]);
    if (r) out.push(r);
  }

  // Textual equality asserted by the source. This is a Claim, never engine-verified here.
  const equals = /["'״׳]?([^\n=]{1,45}?)["'״׳]?\s*=\s*["'״׳]?([^\n=]{1,45})/g;
  let e;
  while ((e = equals.exec(input))) {
    const r = relation(e[1], e[2], "source_equality_claim", "=", e.index, e[0]);
    if (r) out.push(r);
  }

  return uniqueBy(out, (x) => `${x.relationType}|${x.left}|${x.right}`);
}

export function extractConceptMentions(text) {
  const input = String(text || "");
  const out = [];
  const patterns = [
    /ספירת\s+ה?([א-ת][א-ת״׳"'\-]{1,20})/g,
    /(?:דרך|באמצעות)\s+([א-ת][א-ת״׳"'\-]{1,20})/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(input))) {
      out.push({ text: clean(m[1]), start: m.index, provenance: "source_mention" });
    }
  }
  return uniqueBy(out, (x) => x.text);
}

function subjectScore(text, origins) {
  let score = 0;
  const len = clean(text).length;
  if (origins.has("relation")) score += 5;
  if (origins.has("quote")) score += 4;
  if (origins.has("analysis")) score += 3;
  if (origins.has("concept")) score += 3;
  if (len >= 2 && len <= 26) score += 2;
  if (/^[א-ת״׳"'\- ]+$/.test(text)) score += 1;
  return score;
}

export function collectSubjectCandidates({ text, analysis = null } = {}) {
  const map = new Map();
  const add = (value, origin) => {
    const v = clean(value).replace(/^["'״׳]+|["'״׳]+$/g, "");
    if (v.length < 2 || v.length > 120) return;
    const key = v.replace(/[״׳"']/g, "").replace(/\s+/g, " ");
    if (!key) return;
    const prev = map.get(key) || { text: v, origins: new Set() };
    prev.origins.add(origin);
    map.set(key, prev);
  };

  extractQuotedSegments(text).forEach((q) => add(q.text, "quote"));
  extractSourceRelations(text).forEach((r) => { add(r.left, "relation"); add(r.right, "relation"); });
  extractConceptMentions(text).forEach((m) => add(m.text, "concept"));
  (analysis?.phrases || []).forEach((p) => add(typeof p === "string" ? p : p?.text || p?.phrase, "analysis"));

  return [...map.values()]
    .map((x) => ({ text: x.text, origins: [...x.origins], score: subjectScore(x.text, x.origins) }))
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length);
}

function normalizeGraphMatches(graphMatches = {}) {
  const out = [];
  for (const [term, rows] of Object.entries(graphMatches || {})) {
    for (const row of rows || []) {
      out.push({
        term,
        nodeId: row.id,
        nodeType: row.type,
        label: row.label,
        identityKey: row.identity_key || null,
        active: row.is_active !== false,
        weight: row.weight ?? null,
      });
    }
  }
  return out;
}

function normalizeResearchMatches(researchMatches = {}) {
  const out = [];
  for (const [term, rows] of Object.entries(researchMatches || {})) {
    for (const row of rows || []) {
      out.push({
        term,
        researchObjectId: row.id,
        statement: row.statement,
        source: row.source,
        sourceRef: row.source_ref,
        status: row.status,
        engineVerified: row.engine_verified === true,
        kind: row.kind || null,
      });
    }
  }
  return out;
}

function normalizeCalculations(findings = []) {
  return (findings || []).map((f) => ({
    kind: "calculation",
    subject: f?.subject?.label || "",
    subjectKey: f?.subject?.key || null,
    method: f?.source?.method || null,
    value: f?.subject?.value ?? f?.verification?.engine_result ?? null,
    verificationState: f?.verification?.verification_state || null,
    engine: f?.source?.engine || null,
    findingId: f?.id || null,
    truthClass: "calculation",
  })).filter((x) => x.subject && x.method && x.value != null);
}

export function buildUniversalDecomposition({
  source = {},
  text = "",
  analysis = null,
  expressionBoundary = null,
  canonicalGematriaFindings = [],
  graphMatches = {},
  researchMatches = {},
  time = null,
  aiInterpretation = null,
} = {}) {
  const sourceText = String(text || "");
  const quoted = extractQuotedSegments(sourceText);
  const references = extractSourceReferences(sourceText);
  const relations = extractSourceRelations(sourceText);
  const subjects = collectSubjectCandidates({ text: sourceText, analysis });
  const graph = normalizeGraphMatches(graphMatches);
  const existingResearch = normalizeResearchMatches(researchMatches);
  const calculations = normalizeCalculations(canonicalGematriaFindings);
  const expressionCandidates = Array.isArray(expressionBoundary?.candidates) ? expressionBoundary.candidates : [];
  const compoundClaims = Array.isArray(expressionBoundary?.compound_claims) ? expressionBoundary.compound_claims : [];
  const dates = [
    ...(time?.hebrews || []).map((x) => ({ ...x, calendar: "hebrew" })),
    ...(time?.gregs || []).map((x) => ({ ...x, calendar: "gregorian" })),
    ...(time?.years || []).map((x) => ({ ...x, calendar: "year" })),
  ];

  const graphTerms = new Set(graph.map((g) => g.term));
  const researchTerms = new Set(existingResearch.map((r) => r.term));
  const subjectRows = subjects.map((s) => ({
    ...s,
    existingGraphIdentity: graphTerms.has(s.text),
    existingResearchObject: researchTerms.has(s.text),
    candidateAction: graphTerms.has(s.text) ? "link_existing_identity" : "identity_resolution_required",
  }));

  const unresolved = [];
  for (const r of relations) {
    if (!graphTerms.has(r.left) || !graphTerms.has(r.right)) {
      unresolved.push({
        kind: "relation_identity_resolution",
        label: `${r.left} ↔ ${r.right}`,
        reason: "לפחות צד אחד עדיין לא נפתר לזהות גרף קיימת. Relation Candidate בלבד.",
      });
    }
  }
  for (const ref of references) {
    unresolved.push({
      kind: "source_witness_verification",
      label: ref.raw,
      reason: "מראה המקום נשמר כפי שנכתב במקור; אימות corpus/witness מדויק עדיין לא בוצע בשכבה הזאת.",
    });
  }

  const counts = {
    subjects: subjectRows.length,
    calculations: calculations.length,
    sourceClaims: relations.length + compoundClaims.length,
    sourceReferences: references.length,
    graphMatches: graph.length,
    existingResearchObjects: existingResearch.length,
    unresolved: unresolved.length,
  };

  return {
    v: 1,
    contract: "research_intake_foundation_contract_v8",
    mode: "projection_read_only",
    source: {
      kind: source.kind || "unknown",
      sourceRef: source.sourceRef || null,
      title: source.title || null,
      contributor: source.contributor || null,
      occurredAt: source.occurredAt || null,
      channel: source.channel || null,
      witness: source.witness || null,
      locator: source.locator || null,
    },
    sourceArtifact: {
      text: sourceText,
      length: sourceText.length,
      representations: quoted,
    },
    extracted: {
      subjects: subjectRows,
      expressionCandidates,
      sourceReferences: references,
      temporalAnchors: dates,
    },
    calculations,
    claims: {
      sourceRelations: relations,
      compoundClaims,
    },
    identityResolution: {
      graphMatches: graph,
      existingResearchObjects: existingResearch,
    },
    interpretation: aiInterpretation ? {
      kind: "ai_interpretation",
      text: String(aiInterpretation),
      governanceState: "candidate",
      truthClass: "interpretation",
    } : null,
    unresolved,
    counts,
    invariants: [
      "INPUT≠EXTRACTION≠CALCULATION≠CLAIM≠EVIDENCE≠FACT≠INTERPRETATION≠CANONICAL≠PUBLISHED",
      "AI_MAY_PROPOSE_NEVER_CANONICALIZE",
      "GRAPH_PRESENCE_DOES_NOT_PROVE_NARRATIVE_TRUTH",
      "NO_AUTOMATIC_NODE_OR_EDGE_CREATION",
    ],
  };
}

export default buildUniversalDecomposition;
