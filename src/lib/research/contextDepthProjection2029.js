// Context Depth — display projection over EXISTING owners (project_codex 37 §21, §29.4–29.8, DC_SMART_METER).
//
// It reads nothing and stores nothing. It folds facts that the existing owners already produced
// (Reality Graph relation Findings, canonical engine results, `convergence_meter` layers/cards,
// curation tiers) into six separate dimensions with a COVERAGE state each. There is deliberately
// no total, no 0–100 value and no ranking: DEC-METER-002 (formula, public name, placement,
// strength vs. independence) is OPEN, and DEC-METER-001 keeps quality 0–10, convergence 0–100 and
// gold/diamond curation as separate contracts. Raw existing values are carried as labelled facts only.

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
 * @param {object} input
 * @param {{id:string,label:string,type:string}} input.subject  the post / number / event shown
 * @param {Array<{value:number,source:{kind:string,note?:string},
 *   graph:{direct:number,viaTagsOnly?:boolean}|null,
 *   calculations:Array<{phrase:string,method:string,value:number,verified:boolean}>,
 *   convergence:ReturnType<typeof convergenceMeterFacts>|null}>} input.numbers
 * @param {"public"|"admin"} [input.audience]
 */
export function buildContextDepth({ subject, numbers = [], audience = "public" } = {}) {
  if (!subject?.id || !numbers.length) return null;
  const rows = numbers.map((n) => {
    const verified = (n.calculations || []).filter((c) => c.verified === true);
    return {
      value: n.value, source: n.source || null,
      verified, direct: n.graph?.direct ?? null, viaTagsOnly: Boolean(n.graph?.viaTagsOnly),
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

  const total = rows.length;
  const dims = {
    calculations: { coverage: coverageOf(rows.filter((r) => r.verified.length).length, total),
      facts: rows.filter((r) => r.verified.length).map((r) => ({ value: r.value, results: r.verified })) },
    links: { coverage: rows.some((r) => r.direct) ? COVERAGE.PARTIAL : COVERAGE.NONE,
      // Only hop 1 is read on open; hop 2 / 3+ are opened on request (§21), so full coverage is never claimed here.
      facts: rows.filter((r) => r.direct != null).map((r) => ({ value: r.value, direct: r.direct, viaTagsOnly: r.viaTagsOnly })) },
    convergence: { coverage: coverageOf(rows.filter((r) => r.cards.length).length, total),
      facts: rows.filter((r) => r.meterRead).map((r) => ({ value: r.value, cards: r.cards, layers: r.layers, existingMeter: r.existingMeter })) },
    independence: { coverage: COVERAGE.UNMAPPED, facts: [], note: "אין עדיין קורא לקבוצות עצמאות (DC_SMART_METER · מיפוי קורא חסר). תגיות מאותו פוסט הן מקור אחד." },
    editor: { coverage: coverageOf(rows.filter((r) => r.tiers.gold + r.tiers.silver > 0 || r.cards.length).length, total),
      facts: rows.filter((r) => r.tiers.gold + r.tiers.silver > 0 || r.cards.length).map((r) => ({ value: r.value, tiers: r.tiers, cardQuality: r.cards.map((c) => ({ slug: c.slug, quality: c.quality })) })) },
    approval: { coverage: COVERAGE.UNMAPPED, facts: [], note: audience === "admin"
      ? "קשרי הגרף אינם נושאים מעמד אישור; הם מוצגים כממתינים לחיבור עד החלטה."
      : "קשרי הגרף אינם נושאים מעמד אישור; לציבור מוצגים רק חישוב מאומת ומקור מתועד." },
  };

  return {
    subject, audience, numbers: rows, dependencies,
    dimensions: DIMENSIONS.map((d) => ({ ...d, ...dims[d.key], coverageLabel: COVERAGE_LABEL[dims[d.key].coverage] })),
  };
}
