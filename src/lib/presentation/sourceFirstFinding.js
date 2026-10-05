// Source-first presentation of a research finding (SOURCE_FIRST_LIVING_FINDING_V1).
//
// READ-ONLY PRESENTATION HELPER. It reorders and labels what the existing Universal Finding
// envelope (researchObjectFinding.js) already carries. It never computes gematria, never
// canonicalizes, never publishes, never writes, and never invents a verification state.
//
// Order contract (Human Gate decision 2026-10-05):
//   1. SOURCE   — the contributor's own statement, wording preserved, attribution attached
//   2. DERIVATIONS — value / claimed expression / engine verification the system already holds
//   3. CONNECTIONS — number / topic / post / source nodes that already exist in the tree
//   4. CHALLENGES  — engine mismatches, contrasting findings, honest caveats
//   5. DEPTH    — research detail for the Heichal; research vocabulary is allowed only here
//
// Allowed statement normalization is presentation-only (whitespace, line breaks, punctuation
// spacing, typographic quotes/dashes). Words are never added, removed, summarized or replaced.

const clean = (value) => (value == null ? "" : String(value).trim());

const VERIFICATION_PUBLIC = Object.freeze({
  match: "אומת מול החישוב",
  mismatch: "נמצאה אי־התאמה בבדיקה",
  method_unknown: "השיטה אינה זמינה לבדיקה",
  not_tested: "טרם נבדק מול החישוב",
});

// Internal research/engine/debug vocabulary must never be the public primary line.
const INTERNAL_LANGUAGE = /\b(?:DOSSIER|CHAIN|ENGINE|PROCEDURE|FAMILY|SYNTHESIS|UUID|CANONICAL|research[_ -]?object|research[_ -]?strength|engine[_ -]?detail|verification[_ -]?state)\b|[0-9a-f]{8}-[0-9a-f-]{27,}|\w+_\w+/i;
const TECHNICAL_SOURCE_REF = /^(chat:|channel_updates:|wa_bot_log:|work_log:|gallery_images:|research-cue:|book:|https?:\/\/)/i;

export function isInternalResearchLanguage(value) {
  return INTERNAL_LANGUAGE.test(clean(value));
}

/**
 * Presentation-only normalization of a source statement. Idempotent. Preserves every word.
 */
export function normalizeSourceStatement(value) {
  let text = clean(value);
  if (!text) return "";
  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // punctuation spacing: no space before , ; : ! ? . — a following letter gets one space
    .replace(/ +([,;:!?.])/g, "$1")
    // typographic dashes (spaced hyphen / double hyphen only — never touches Hebrew maqaf or ranges)
    .replace(/ -- /g, " — ")
    .replace(/ - /g, " – ")
    // typographic quotes only around a whole quoted run, so gershayim (צה"ל) are untouched
    .replace(/(^|[\s(])"([^"\n]+)"(?=$|[\s.,;:!?)])/g, "$1“$2”");
  return text.trim();
}

/** "FZ1073" / "FZ 1073" / "1073" -> 1073. Anything without a trailing integer -> null. */
export function numberFromAnchor(anchor) {
  const text = clean(anchor);
  if (!text) return null;
  const match = text.match(/^[A-Za-z֐-׿\s._-]{0,12}?(\d{1,15})$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : null;
}

function presentationHints(finding) {
  const hints = finding?.view?.rendererHints?.presentation;
  return hints && typeof hints === "object" ? hints : {};
}

function researchObjectIdOf(finding) {
  return clean(finding?.identity?.sourceIdentity?.researchObjectId) || clean(finding?.id);
}

function sourceLabelFor(finding, hints) {
  const label = clean(hints.sourceLabel);
  if (label && !TECHNICAL_SOURCE_REF.test(label)) return label;
  return null;
}

function derivationsFor(finding, root) {
  const rows = [];
  const value = finding?.subject?.value;
  if (Number.isFinite(Number(value)) && value !== null && value !== "") {
    rows.push({ key: "value", label: "ערך", text: String(Number(value)), href: `/number/${Number(value)}` });
  }
  const v = finding?.verification || {};
  if (clean(v.claimed_expression)) {
    rows.push({
      key: "expression",
      label: "ביטוי שנבדק",
      text: clean(v.claimed_expression) + (Number.isFinite(Number(v.claimed_value)) ? ` = ${Number(v.claimed_value)}` : ""),
    });
  }
  if (clean(v.engine_method_tested) || v.engine_result != null) {
    const result = typeof v.engine_result === "object" ? null : clean(v.engine_result);
    rows.push({
      key: "engine",
      label: "תוצאת החישוב",
      text: [clean(v.engine_method_tested), result].filter(Boolean).join(" · "),
    });
  }
  const state = clean(v.verification_state) || null;
  // Absent stays absent in data, but a public reader should see the honest "not checked yet".
  rows.push({
    key: "verification",
    label: "אימות",
    state,
    text: VERIFICATION_PUBLIC[state] || VERIFICATION_PUBLIC.not_tested,
  });
  return rows.filter((row) => row.text);
}

function connectionsFor(finding, hints, { root = null, postLinks = [] } = {}) {
  const out = [];
  const seen = new Set();
  const add = (row) => {
    const key = `${row.type}:${row.label}`;
    if (!row.label || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };
  const value = Number(finding?.subject?.value);
  if (Number.isFinite(value) && finding?.subject?.value !== null && finding?.subject?.value !== "") {
    add({ type: "number", label: String(value), href: `/number/${value}`, current: root != null && value === Number(root) });
  }
  for (const link of postLinks) {
    if (clean(link?.label) && clean(link?.href)) add({ type: "post", label: clean(link.label), href: clean(link.href) });
  }
  for (const term of Array.isArray(hints.terms) ? hints.terms : []) add({ type: "term", label: clean(term) });
  for (const rel of Array.isArray(hints.relates) ? hints.relates : []) add({ type: "relates", label: clean(rel) });
  return out;
}

function challengesFor(finding, siblings) {
  const out = [];
  const state = clean(finding?.verification?.verification_state);
  if (state === "mismatch") {
    out.push({ key: "engine_mismatch", kind: "challenge", text: "הבדיקה מול החישוב לא תאמה את הטענה." });
  } else if (!state || state === "not_tested") {
    out.push({ key: "uncertainty", kind: "caveat", text: "הטענה של התורם עדיין לא נבדקה מול החישוב; היא מוצגת כדבריו." });
  } else if (state === "method_unknown") {
    out.push({ key: "method_unknown", kind: "caveat", text: "השיטה שהוזכרה אינה זמינה לבדיקה כרגע." });
  }
  const selfId = researchObjectIdOf(finding);
  for (const other of Array.isArray(siblings) ? siblings : []) {
    if (!other || researchObjectIdOf(other) === selfId) continue;
    if (clean(other?.verification?.verification_state) !== "mismatch") continue;
    const statement = normalizeSourceStatement(presentationHints(other).sourceStatement);
    if (statement) out.push({ key: `contrast:${researchObjectIdOf(other)}`, kind: "contrast", text: statement, contributor: clean(presentationHints(other).contributor) || null });
  }
  return out;
}

/**
 * Projects ONE finding in source-first order. Returns null when the finding carries no source
 * statement (callers then keep their existing rendering — nothing is fabricated).
 */
export function buildSourceFirstFinding(finding, { root = null, postLinks = [], siblings = [] } = {}) {
  if (!finding) return null;
  const hints = presentationHints(finding);
  const statement = normalizeSourceStatement(hints.sourceStatement);
  if (!statement) return null;
  const secondaryTitle = clean(hints.title);
  const secondarySummary = clean(hints.summary);
  const humanSecondary = hints.fallbackMode !== "raw_statement" && secondaryTitle && !isInternalResearchLanguage(secondaryTitle);
  return {
    id: researchObjectIdOf(finding),
    source: {
      statement,
      contributor: clean(hints.contributor) || null,
      sourceLabel: sourceLabelFor(finding, hints),
    },
    derivations: derivationsFor(finding, root),
    connections: connectionsFor(finding, hints, { root, postLinks }),
    challenges: challengesFor(finding, siblings),
    // AI wrapper is secondary metadata only, and only when it reads as human copy.
    secondary: humanSecondary ? { title: secondaryTitle, summary: secondarySummary || null } : null,
    depth: {
      kind: clean(hints.researchObjectKind) || null,
      rawStatementRef: hints.rawStatementRef || null,
    },
  };
}

/** Living findings of a number, projected from the already-loaded tree rows. No manual attachment. */
export function buildLivingNumberFindings(findings, root, { postLinks = [] } = {}) {
  const list = Array.isArray(findings) ? findings : [];
  const seen = new Set();
  const rows = [];
  for (const finding of list) {
    const row = buildSourceFirstFinding(finding, { root, postLinks, siblings: list });
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/**
 * Post numeric anchor -> living Number context, in the contracted order:
 *   post-direct connections -> eligible living findings of the number -> (per finding) calculations,
 *   connections, challenges. The post body is never duplicated.
 */
export function buildPostAnchorLivingContext({ anchor, postConnections = [], findings = [] } = {}) {
  const number = numberFromAnchor(anchor);
  if (number == null) return null;
  const postLinks = (Array.isArray(postConnections) ? postConnections : [])
    .map((row) => ({ label: clean(row?.label), href: clean(row?.href) }))
    .filter((row) => row.label && row.href);
  return {
    number,
    numberHref: `/number/${number}`,
    postDirect: postLinks,
    living: buildLivingNumberFindings(findings, number, { postLinks }),
  };
}
