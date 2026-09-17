function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeResearchPresentationLocale(locale = "he") {
  const value = clean(locale)?.toLowerCase().replace(/_/g, "-") || "he";
  return value;
}

function inferStatementLanguage(statement) {
  const text = clean(statement) || "";
  const hasHebrew = /[א-ת]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  // Hebrew-only is safe to infer. Latin-only is deliberately NOT inferred as English:
  // it may be a formula, transliteration, code key or another Latin-script language.
  if (hasHebrew && !hasLatin) return "he";
  return null;
}

function variantForLocale(variants, locale) {
  const requested = normalizeResearchPresentationLocale(locale);
  const base = requested.split("-")[0];
  for (const candidate of [...new Set([requested, base])]) {
    const variant = objectValue(variants[candidate]);
    if (Object.keys(variant).length) return { locale: candidate, variant };
  }
  return { locale: null, variant: {} };
}

/**
 * Resolves a human presentation for ONE durable research_objects row.
 *
 * Storage contract (existing flexible extension primitive only):
 *   meta.ext.presentation = {
 *     v: 1,
 *     statement_lang: "he" | "en" | ... | null,
 *     statement_role: "research_statement",
 *     source_witness_lang: "he" | "en" | ... | null,
 *     variants: {
 *       he: { title, summary, source_label, ... },
 *       en: { title, summary, source_label, ... }
 *     },
 *     compiled: { ... provenance/version metadata ... }
 *   }
 *
 * The original research_objects.statement and source/source_ref are never replaced here.
 * Missing locale presentation falls back to the historical statement for compatibility and is
 * explicitly marked as raw fallback so future surfaces can route it to compile/backfill instead
 * of mistaking it for normalized public copy.
 */
export function resolveResearchObjectPresentation(row, { locale = "he" } = {}) {
  const meta = objectValue(row?.meta);
  const ext = objectValue(meta.ext);
  const presentation = objectValue(ext.presentation);
  const variants = objectValue(presentation.variants);
  const resolved = variantForLocale(variants, locale);
  const rawStatement = clean(row?.statement);
  const title = clean(resolved.variant.title) || rawStatement || `Research object ${row?.id || ""}`.trim();
  const summary = clean(resolved.variant.summary);
  const sourceLabel = clean(resolved.variant.source_label) || clean(meta.source_label);
  const statementLang = clean(presentation.statement_lang) || inferStatementLanguage(rawStatement);
  const sourceWitnessLang = clean(presentation.source_witness_lang);
  const requestedLocale = normalizeResearchPresentationLocale(locale);
  const hasHumanPresentation = Boolean(resolved.locale && (clean(resolved.variant.title) || summary));

  return {
    requestedLocale,
    resolvedLocale: resolved.locale,
    title,
    summary,
    sourceLabel,
    statementLang,
    sourceWitnessLang,
    statementRole: clean(presentation.statement_role) || null,
    hasHumanPresentation,
    fallbackMode: hasHumanPresentation ? null : "raw_statement",
    compiled: objectValue(presentation.compiled),
  };
}

export default resolveResearchObjectPresentation;
