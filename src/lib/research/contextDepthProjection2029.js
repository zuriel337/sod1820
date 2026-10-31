// Context Depth — display projection over EXISTING owners (project_codex 37 §21, §29.4–29.8, DC_SMART_METER).
//
// It reads nothing and stores nothing. It folds facts that the existing owners already produced
// (Reality Graph relations, canonical engine results, `convergence_meter` layers/cards, curation tiers,
// the post's own authored text) into six separate dimensions with a COVERAGE state each. There is
// deliberately no total, no 0–100 value and no ranking: DEC-METER-002 is OPEN, and DEC-METER-001 keeps
// quality 0–10, convergence 0–100 and gold/diamond curation as separate contracts.
//
// Two honesty rules are enforced here and covered by tests:
//  - an unknown value is `null` and is rendered as "not measured", never as 0 (see `measured`);
//  - tags (`post_tags` → `documents` edges) and statements inside the same post belong to ONE source
//    group, so they never count as independent sources.

export const COVERAGE = Object.freeze({ FULL: "full", PARTIAL: "partial", NONE: "none", UNMAPPED: "unmapped" });
export const COVERAGE_LABEL = Object.freeze({ full: "מכוסה", partial: "מכוסה חלקית", none: "אין נתון", unmapped: "טרם מופה" });

export const DIMENSIONS = Object.freeze([
  { key: "calculations", label: "חישובים מאומתים", ask: "אילו ערכים אימת המנוע הקנוני" },
  { key: "links", label: "עומק קשרים", ask: "ישיר / משני / רחוק בגרף" },
  { key: "convergence", label: "התכנסויות", ask: "כרטיסי התכנסות קיימים סביב המספר" },
  { key: "independence", label: "עצמאות מקורות", ask: "כמה מקורות בלתי תלויים, ללא כפילויות" },
  { key: "editor", label: "החלטת עורך", ask: "אצירה ידנית (זהב/כסף) ואיכות עריכתית" },
  { key: "approval", label: "מעמד אישור", ask: "מה אושר לפרסום ומה ממתין" },
]);

export const NOT_MEASURED = "לא נמדד";
/** Number-or-null → display text. `null`/`undefined`/NaN are "not measured"; a real 0 stays 0. */
export const measured = (value, suffix = "") => (Number.isFinite(value) ? `${value}${suffix}` : NOT_MEASURED);
/** Tri-state flag → text; `null` is "not checked", never "no". */
export const flagLabel = (value, yes, no) => (value === true ? yes : value === false ? no : "לא נבדק");

// Source kinds that name where a claim lives. Tags and the post's own text share one group per post;
// a plan/handoff document is documentation about the claim, not an independent source of the event.
const SOURCE_GROUP = Object.freeze({ tag: (ref) => ref, post_body: (ref) => ref });
export const NON_SOURCE_KINDS = Object.freeze(["plan_doc", "engine"]);

export function sourceGroups(sources = []) {
  const groups = new Set();
  for (const s of sources) {
    if (!s || NON_SOURCE_KINDS.includes(s.kind)) continue;
    if (s.access?.available === false || s.access?.scope === "private") continue;
    // An artifact lineage can have many placements. Keep every occurrence in
    // the caller's source list; count its owner-supplied group only once.
    const ref = s.dependencyGroup || s.artifactRef || s.sourceGroupRef || s.ref;
    const rawKey = (SOURCE_GROUP[s.kind] || ((ref) => ref))(ref);
    const key = typeof rawKey === "string" ? rawKey.replace(/^(posts?:\d+)#.*$/, "$1") : null;
    if (key) groups.add(key);
  }
  return [...groups];
}

// Explicit bounded-check states for the Post consumer of the same six axes.
// Presence of a row is never evidence of complete research coverage.
export const CHECK_LABEL = Object.freeze({
  not_tested: "טרם נבדק", not_found: "לא נמצא לאחר בדיקה",
  partial: "מידע חלקי", failed: "הקריאה נכשלה", checked: "נבדק בהיקף המוצג",
});

export function projectCoverageChecks(checks = {}) {
  return DIMENSIONS.map((dimension) => {
    const check = checks[dimension.key] || {};
    const state = Object.hasOwn(CHECK_LABEL, check.state) ? check.state : "not_tested";
    return { ...dimension, state, stateLabel: CHECK_LABEL[state],
      scope: check.scope || "לא בוצעה בדיקה בתחום זה.",
      missing: check.missing || "היקף הכיסוי אינו ידוע.",
    };
  });
}

// Edges that are not derived from post tags (unknown tag count is treated as all-tag: never inflate coverage).
const nonTag = (r) => (r.direct == null ? 0 : Math.max(0, r.direct - (r.tagDerived ?? r.direct)));
const coverageOf = (have, total) => (total === 0 || have === 0 ? COVERAGE.NONE : have >= total ? COVERAGE.FULL : COVERAGE.PARTIAL);

/**
 * Adapter: one raw `convergence_meter(p_n)` response → the facts the projection needs.
 * The raw 0–100 `score` is kept only as an inert labelled fact (never summarised or compared).
 */
export function convergenceMeterFacts(raw) {
  if (!raw || typeof raw !== "object") return null;
  const entities = Array.isArray(raw.entities) ? raw.entities : [];
  return {
    layers: (Array.isArray(raw.layers) ? raw.layers : []).map((l) => ({ name: l.name, ok: l.ok === true, detail: l.detail ?? null })),
    cards: (Array.isArray(raw.cards) ? raw.cards : []).map((c) => ({ slug: c.slug, title: c.title, quality: Number.isFinite(Number(c.quality)) ? Number(c.quality) : null })),
    tiers: { gold: entities.filter((e) => e.tier === "gold").length, silver: entities.filter((e) => e.tier === "silver").length },
    existingMeter: Number.isFinite(Number(raw.score)) ? Number(raw.score) : null,
  };
}

/**
 * One expression, three distinct layers (never merged):
 *   source         — where the phrase lives (post text, tag, plan document)
 *   calculation    — did the canonical engine reproduce the claimed value; row flags kept separate
 *   interpretation — the framing around it, with who attested it
 */
export function buildExpressionLayers(expr, { audience = "public" } = {}) {
  const sources = Array.isArray(expr?.sources) ? expr.sources : [];
  const calc = expr?.calculation || null;
  // Engine reproduction is not publication: for the public, a calculation whose database row is not published is
  // neither shown nor counted. The phrase stays visible only as the post itself shows it (source layer).
  const withheld = audience !== "admin" && Boolean(calc) && calc.rowPublished !== true;
  return {
    phrase: expr?.phrase ?? null,
    theme: expr?.theme ?? null,
    withheld,
    source: { items: sources, groups: sourceGroups(sources) },
    calculation: withheld ? null : calc && {
      method: calc.method ?? null, value: Number.isFinite(calc.value) ? calc.value : null,
      claimedValue: Number.isFinite(calc.claimedValue) ? calc.claimedValue : null,
      reproducesClaim: calc.reproducesClaim === true ? true : calc.reproducesClaim === false ? false : null,
      rowVerified: calc.rowVerified ?? null, rowPublished: calc.rowPublished ?? null,
      // Attribution of the database row is its own fact (neither calculation nor publication) and is admin-only.
      rowAttribution: audience === "admin" ? calc.rowAttribution ?? null : null,
    },
    interpretation: expr?.interpretation || null,
  };
}

/**
 * @param {object} input
 * @param {{id:string,label:string,type:string}} input.subject  the post / number / event shown
 * @param {Array<{value:number, source:{kind:string,note?:string}, graph:{direct:number|null,media?:number|null,viaTagsOnly?:boolean}|null,
 *   calculations:Array<{phrase:string,method:string,value:number,verified:boolean}>, expressions?:object[],
 *   convergence:ReturnType<typeof convergenceMeterFacts>|null}>} input.numbers
 * @param {"public"|"admin"} [input.audience]
 */
export function buildContextDepth({ subject, numbers = [], audience = "public", temporal = null, yearHints = [], approvals = {}, paths = [] } = {}) {
  if (!subject?.id || !numbers.length) return null;
  const rows = numbers.map((n) => {
    const expressions = (n.expressions || []).map((e) => buildExpressionLayers(e, { audience }));
    // Engine parity on an authored expression counts as a verified calculation; the row flags stay separate facts.
    const verified = (n.calculations || []).filter((c) => c.verified === true);
    for (const e of expressions) {
      const c = e.calculation;
      if (c?.reproducesClaim === true && c.value != null && !verified.some((v) => v.phrase === e.phrase && v.method === c.method)) {
        verified.push({ phrase: e.phrase, method: c.method, value: c.value, verified: true });
      }
    }
    return {
      value: n.value, source: n.source || null,
      verified, expressions,
      direct: Number.isFinite(n.graph?.direct) ? n.graph.direct : null, tagDerived: Number.isFinite(n.graph?.tagDerived) ? n.graph.tagDerived : null, media: Number.isFinite(n.graph?.media) ? n.graph.media : null,
      openQuestions: n.openQuestions || [],
      cards: n.convergence?.cards || [], layers: n.convergence?.layers || [], tiers: n.convergence?.tiers || { gold: 0, silver: 0 },
      existingMeter: n.convergence?.existingMeter ?? null, meterRead: Boolean(n.convergence),
    };
  });

  // Two verified results on the SAME phrase are one dependent calculation family, not two witnesses.
  const dependencies = [];
  const byPhrase = new Map();
  for (const row of rows) for (const c of row.verified) {
    const list = byPhrase.get(c.phrase) || [];
    list.push({ value: row.value, method: c.method });
    byPhrase.set(c.phrase, list);
  }
  for (const [phrase, hits] of byPhrase) if (new Set(hits.map((h) => h.value)).size > 1) dependencies.push({ phrase, hits });

  const allSources = rows.flatMap((r) => r.expressions.flatMap((e) => e.source.items));
  const groups = [...new Set(rows.flatMap((r) => r.expressions.flatMap((e) => e.source.groups)))];
  const total = rows.length;
  const dims = {
    calculations: { coverage: coverageOf(rows.filter((r) => r.verified.length).length, total),
      facts: rows.filter((r) => r.verified.length).map((r) => ({ value: r.value, results: r.verified })) },
    // Tag-derived relations are located and listed, but they never strengthen coverage: only a non-tag edge does.
    links: { coverage: rows.some((r) => nonTag(r) > 0) ? COVERAGE.PARTIAL : COVERAGE.NONE,
      // Only hop 1 is read on open; hop 2 / 3+ are opened on request (§21), so full coverage is never claimed here.
      facts: rows.filter((r) => r.direct != null).map((r) => ({ value: r.value, direct: r.direct, tagDerived: r.tagDerived ?? 0, nonTag: nonTag(r), media: r.media, viaTagsOnly: r.direct > 0 && nonTag(r) === 0 })),
      unread: rows.filter((r) => r.direct == null).map((r) => r.value) },
    convergence: { coverage: coverageOf(rows.filter((r) => r.cards.length).length, total),
      facts: rows.filter((r) => r.meterRead).map((r) => ({ value: r.value, cards: r.cards, layers: r.layers, existingMeter: r.existingMeter })),
      unread: rows.filter((r) => !r.meterRead).map((r) => r.value) },
    independence: { coverage: COVERAGE.UNMAPPED, facts: groups.length ? [{ groups }] : [],
      note: "אין עדיין קורא לקבוצות עצמאות (DC_SMART_METER · מיפוי קורא חסר). תגיות ומשפטים מאותו פוסט הם מקור אחד, ומסמך תכנון אינו מקור." },
    editor: { coverage: coverageOf(rows.filter((r) => r.tiers.gold + r.tiers.silver > 0 || r.cards.length).length, total),
      facts: rows.filter((r) => r.tiers.gold + r.tiers.silver > 0 || r.cards.length).map((r) => ({ value: r.value, tiers: r.tiers, cardQuality: r.cards.map((c) => ({ slug: c.slug, quality: c.quality })) })) },
    approval: { coverage: COVERAGE.UNMAPPED, facts: [], note: audience === "admin"
      ? "קשרי הגרף אינם נושאים מעמד אישור; הם מוצגים כממתינים לחיבור עד החלטה."
      : "קשרי הגרף אינם נושאים מעמד אישור; לציבור מוצגים רק חישוב מאומת ומקור מתועד." },
  };

  return {
    subject, audience, numbers: rows, dependencies, yearHints: buildYearHints(yearHints, temporal, audience, approvals), paths: buildPaths(paths, audience), sourceCount: { groups, statements: allSources.length },
    dimensions: DIMENSIONS.map((d) => ({ ...d, ...dims[d.key], coverageLabel: COVERAGE_LABEL[dims[d.key].coverage] })),
  };
}

/**
 * "Year hint" (DEC-TIME-004) over the existing time context (`timeFlow.getCurrentTemporalContext`), never a new engine and
 * never a numeric-equality test. A hint belongs to a reviewed UNIT (a source region of a container), carries its own year
 * binding, and needs an explicit documented link plus an editorial approval read from the existing research_objects owner
 * (`approvals[hint.id]`, see unitApproval2029). The value (787, gematria of the year letters) and the calendar year (5787)
 * stay two separately labelled numbers. Nothing is stored or deleted: the same hint is the live year hint this year and a
 * year group afterwards, with its source and calculation untouched.
 *   public : only a PUBLISHED approval shows (live this year, "year group" afterwards)
 *   admin  : also approved-but-unpublished and candidate, each with its own state
 */
export function buildYearHints(hints = [], temporal = null, audience = "public", approvals = {}) {
  const hebrew = temporal?.hebrew;
  if (!hebrew?.year || !hebrew?.year_value) return [];
  const admin = audience === "admin";
  return hints.flatMap((hint) => {
    if (hint?.link !== "explicit_documented" || !hint.unit) return [];
    const approval = approvals?.[hint.id]?.state || "none";
    // Public visibility needs a PUBLIC projection of the approval; a research_objects row (even approved, even scope public) is not one.
    const published = approval === "published" && approvals?.[hint.id]?.channel === "public_projection";
    if (!published && !admin) return [];
    const base = { id: hint.id, unit: hint.unit, value: hint.value, hebrewYear: hint.hebrewYear, valueLabel: `ערך גימטרי ${hint.value}`,
      yearLabel: `שנה ${hint.hebrewYear} (${hint.yearLabel})`, layers: hint.layers || [], approval, locatorId: hint.unit.locatorId ?? null,
      approvalChannel: approvals?.[hint.id]?.channel ?? null, sourceRef: hint.unit.sourceRef ?? null,
      // Four separate answers: where it is written, what the engine says about the number, how it is framed, and whether it is published.
      publication: published ? "published" : "blocked",
      numbers: { gematria: hint.value, calendarYear: hint.hebrewYear } };
    const current = hebrew.year === hint.hebrewYear && hebrew.year_value === hint.value;
    if (!current) return [{ ...base, state: hebrew.year > hint.hebrewYear ? "archived" : "upcoming", label: `קבוצת שנה · ${hint.yearLabel}` }];
    if (published) return [{ ...base, state: "active", label: `רמז השנה · ${hebrew.year_label}` }];
    if (approval === "container_level_only") return [{ ...base, state: "candidate", label: "מועמד לרמז השנה · קיימת סינתזה מאושרת ברמת הפוסט, לא ליחידה" }];
    if (approval === "approved_unpublished") return [{ ...base, state: "approved_unpublished", label: `רמז השנה · ${hebrew.year_label} · מאושר עריכתית, טרם פורסם` }];
    return [{ ...base, state: "candidate", label: "מועמד לרמז השנה · ללא אישור קנוני שניתן לאמת" }];
  });
}

const STATION_BASIS = Object.freeze({ tag: "תגית (רקע)", verified_calculation: "חישוב מאומת", source_region: "מקטע מקור", suggested: "ממתין לחיבור" });
/** A route through intermediate stations. A pending station (suggested link) ends the public route until the editor selects it. */
export function buildPaths(paths = [], audience = "public") {
  const admin = audience === "admin";
  return paths.map((path) => {
    const out = [];
    for (const station of path.stations || []) {
      const pending = station.pending === true && station.editorialSelection !== true;
      if (pending && !admin) break;
      out.push({ ...station, pending, basisLabel: pending ? STATION_BASIS.suggested : STATION_BASIS[station.basis] || null,
        // A tag station is background: it can be part of the route but never strengthens anything.
        strengthens: !pending && station.basis !== "tag" });
    }
    return { id: path.id, label: path.label, stations: out };
  }).filter((path) => path.stations.length);
}
