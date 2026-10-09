function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const HEBREW_KIND_LABEL = Object.freeze({
  fact: "ממצא מסוג עובדה",
  relation: "קשר מחקרי",
  observation: "תצפית",
  hypothesis: "השערה",
  question: "שאלת מחקר",
  calculation: "חישוב",
  interpretation: "פרשנות",
});

const SOURCE_LABELS = Object.freeze({
  research_triage: "מיון מחקר פנימי",
  channel_updates: "הודעות מקור",
  wordpress: "פוסט מקור",
  posts: "פוסטים",
  gematria_engine: "מנוע הגימטריה",
  "canonical Gematria Engine + post 5112": "מנוע הגימטריה + פוסט המטוס",
  video_semantic_map: "מפת תוכן וידאו",
  family_input: "מידע משפחתי",
  uploaded_docx: "מסמך שהועלה למחקר",
  root_gate_repair: "בדיקת תיקון מערכת",
  pre_els_finite_closure: "מחקר הכנה לצפנים",
  ranked_enrichment_pilot_v1: "פיילוט העשרת מחקר",
  amit_existing_corpus_stress_test: "קורפוס עמית — בדיקת עומס",
  "SOD1820 research synthesis": "סינתזת מחקר של סוד 1820",
  "zuriel_research_corpus": "קורפוס המחקר של צוריאל",
  "zuriel_live_interview": "ראיון מחקר חי עם צוריאל",
  "Zuriel live interview + historical corpus": "ראיון חי עם צוריאל + קורפוס היסטורי",
  "ZURIEL_RESEARCH_DIRECTION": "כיוון מחקר של צוריאל",
  "ai:messianic_model_v1": "מודל מחקר משיחי",
  "GPT cross-domain research synthesis from canonical SOD1820 data + external mathematics": "סינתזת מחקר מערכתית של סוד 1820 ומתמטיקה",
  "Itzhak Bentov — A Brief Tour of Higher Consciousness (2nd ed., 2000)": "יצחק בנטוב — מסע קצר אל התודעה הגבוהה",
  "ספר הפליאה — HebrewBooks 6355": "ספר הפליאה — היברובוקס 6355",
  "HebrewBooks 23968 — exact canonical Supabase digital object": "מקור ספרותי — היברובוקס 23968",
  "ספר יצירה — institutional witness Q 18/3545": "ספר יצירה — עדות כתב־יד 18/3545",
});

const OCCURRENCE_LABELS = Object.freeze({
  channel_updates: "הודעת מקור",
  research_contributions: "תרומת מחקר",
  work_log: "רשומת מחקר פנימית",
  post: "פוסט מקור",
  posts: "פוסט מקור",
  wp: "פוסט מקור",
  book: "קטע מקור",
  video: "קטע וידאו",
  gallery_image: "פריט מדיה",
  family_relation: "קשר משפחתי",
});

export function normalizeResearchPresentationLocale(locale = "he") {
  const value = clean(locale)?.toLowerCase().replace(/_/g, "-") || "he";
  return value;
}

export function researchKindLabel(kind) {
  return HEBREW_KIND_LABEL[clean(kind)] || "ממצא מחקר";
}

export function normalizeResearchDisplayText(value) {
  const text = value == null ? "" : String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");
  if (!text.trim()) return null;
  const lines = text.split("\n").map((line) => line.replace(/[\t ]+/g, " ").trim());
  const out = [];
  let blanks = 0;
  for (const line of lines) {
    if (!line) {
      blanks += 1;
      if (blanks <= 1 && out.length) out.push("");
      continue;
    }
    blanks = 0;
    out.push(line);
  }
  while (out.length && !out[out.length - 1]) out.pop();
  return out.join("\n").trim() || null;
}

function inferStatementLanguage(statement) {
  const text = clean(statement) || "";
  const hasHebrew = /[א-ת]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasHebrew && !hasLatin) return "he";
  return null;
}

function variantForLocale(variants, locale) {
  const requested = normalizeResearchPresentationLocale(locale);
  const base = requested.split("-")[0];
  for (const candidate of [...new Set([requested, base])]) {
    const variant = objectValue(variants[candidate]);
    const title = clean(variant.title);
    const summary = clean(variant.summary);
    if (title || summary) return { locale: candidate, variant };
  }
  return { locale: null, variant: {} };
}

function isTechnicalToken(value) {
  const text = clean(value) || "";
  return !text
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text)
    || /^\+?\d{8,}$/.test(text)
    || /^(?:research_|work_log|channel_updates|wa_bot_log|video_semantic_map|ai:|api:|rpc:)/i.test(text)
    || (/^[A-Za-z0-9_.:/#-]+$/.test(text) && /[_:/#]/.test(text));
}

function hebrewClip(value, max = 118) {
  const text = clean(value)?.replace(/\s+/g, " ") || "";
  if (!text) return null;
  const clipped = text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  return clipped || null;
}

function hebrewOnlyLabel(value) {
  const text = clean(value) || "";
  if (!text) return null;
  const withoutLatin = text
    .replace(/[A-Za-z][A-Za-z0-9_.:/#()'’-]*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([·:;,—-])/g, "$1")
    .trim();
  return /[א-ת]/.test(withoutLatin) ? hebrewClip(withoutLatin) : null;
}

export function humanizeResearchSource(source, sourceRef = null) {
  const raw = clean(source);
  if (raw && SOURCE_LABELS[raw]) return SOURCE_LABELS[raw];
  if (raw) {
    const hb = raw.match(/^HebrewBooks\s+(\d+)/i);
    if (hb) return `היברובוקס ${hb[1]}`;
    const hebrew = hebrewOnlyLabel(raw);
    if (hebrew && !isTechnicalToken(raw)) return hebrew;
  }
  const ref = clean(sourceRef) || "";
  if (/^channel_updates:/i.test(ref)) return "הודעות מקור";
  if (/^(?:posts?|wp):/i.test(ref)) return "פוסט מקור";
  if (/^book:/i.test(ref)) return "מקור ספרותי";
  if (/^video/i.test(ref)) return "וידאו מקור";
  if (/^work_log:/i.test(ref)) return "מחקר פנימי";
  return "מקור מחקר";
}

export function researchOccurrenceLabel(sourceRef) {
  const ref = clean(sourceRef);
  if (!ref) return "מקום במקור לא צוין";
  const prefix = ref.split(":")[0];
  return OCCURRENCE_LABELS[prefix] || "מקום במקור";
}

function formatHebrewDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function contextualFallbackTitle(row, rawStatement, { typeLabel, sourceLabel } = {}) {
  const text = clean(rawStatement) || "";
  const value = row?.value != null && row?.value !== "" ? String(row.value) : null;

  const caseStudy = text.match(/^CASE\s+STUDY\s*[—-]\s*(\d+)\s*\/\s*([^:]+)(?::|$)/i);
  if (caseStudy) {
    const topic = hebrewOnlyLabel(caseStudy[2]);
    return topic ? `מחקר מקרה: ${caseStudy[1]} — ${topic}` : `מחקר מקרה סביב ${caseStudy[1]}`;
  }

  const numberDefinition = text.match(/^NUMBER\s+DEFINITION\s+CANDIDATE\s*[—-]\s*(\d+)/i);
  if (numberDefinition) return `הגדרת מספר מועמדת: ${numberDefinition[1]}`;

  const speaker = text.match(/^Speaker of the phrase\s+["“]?([^"”]+)["”]?/i);
  if (speaker) {
    const phrase = hebrewOnlyLabel(speaker[1]);
    if (phrase) return `${typeLabel}: ייחוס הדובר לביטוי „${phrase}”`;
  }

  if (/\bbinary\s*\(/i.test(text)) return value ? `ייצוג בינארי סביב ${value}` : "בדיקת ייצוג בינארי";
  if (/^Zuriel research thread:/i.test(text)) return value ? `ציר המחקר של צוריאל סביב ${value}` : "ציר המחקר של צוריאל";

  const startsHebrew = /^[\s"'“”׳״(\d.,:;—-]*[א-ת]/u.test(text);
  if (startsHebrew) {
    const line = text.split(/\n|(?<=[.!?])\s+/u)[0];
    const clipped = hebrewClip(line);
    if (clipped) return clipped;
  }

  const hebrew = hebrewOnlyLabel(text);
  if (hebrew && text.search(/[א-ת]/) < 24) return hebrew;

  if (value) return `${typeLabel} סביב ${value}`;
  if (sourceLabel && sourceLabel !== "מקור מחקר") return `${typeLabel} מתוך ${sourceLabel}`;
  return typeLabel || "ממצא מחקר";
}

function presentationAttribution(row) {
  const meta = objectValue(row?.meta);
  const ext = objectValue(meta.ext);
  const waIntake = objectValue(ext.wa_channel_intake);
  const contributor = clean(row?.contributor);

  const explicitType = clean(meta.attribution_type);
  const explicitContributorId = clean(meta.contributor_id);
  const trustedIntakeContributorId = waIntake.trusted_author === true
    ? clean(waIntake.contributor_id)
    : null;

  const contributorId = explicitContributorId || trustedIntakeContributorId;
  const hasValidContributorId = Boolean(
    contributorId && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(contributorId)
  );
  const attributionIsExplicit = Boolean(explicitType && explicitContributorId);
  const attributionIsTrustedIntake = Boolean(trustedIntakeContributorId);

  const displayName = contributor === "ZURIEL" ? "צוריאל"
    : contributor === "GPT" ? "מערכת המחקר"
      : contributor === "CLAUDE" ? "מערכת המחקר"
        : hebrewOnlyLabel(contributor);

  if (hasValidContributorId && (attributionIsExplicit || attributionIsTrustedIntake)) {
    return {
      state: "resolved",
      contributorId,
      label: displayName ? `ייחוס מקור מאומת: ${displayName}` : "ייחוס מקור מאומת",
    };
  }

  if (contributor) {
    return {
      state: "unresolved",
      contributorId: null,
      label: displayName
        ? `תווית ייחוס במקור: ${displayName} · זהות המחבר לא הוכרעה`
        : "קיימת תווית ייחוס במקור · זהות המחבר לא הוכרעה",
    };
  }

  return { state: "unknown", contributorId: null, label: "זהות המחבר לא צוינה" };
}

function safeHebrewPrimaryTitle(title, fallback) {
  const text = clean(title);
  if (!text) return fallback;
  if (!/[A-Za-z]/.test(text)) return text;
  const hebrew = hebrewOnlyLabel(text);
  return hebrew || fallback;
}

/**
 * Human-facing presentation for one durable research_objects row.
 *
 * Original statement/source/source_ref are never replaced. Hebrew surfaces receive a safe,
 * contextual primary title even before durable backfill exists; fallbackMode remains raw_statement
 * until a real meta.ext.presentation Hebrew variant has been compiled and stored.
 */
export function resolveResearchObjectPresentation(row, { locale = "he" } = {}) {
  const meta = objectValue(row?.meta);
  const ext = objectValue(meta.ext);
  const presentation = objectValue(ext.presentation);
  const variants = objectValue(presentation.variants);
  const requestedLocale = normalizeResearchPresentationLocale(locale);
  const requestedBase = requestedLocale.split("-")[0];
  const resolved = variantForLocale(variants, requestedLocale);
  const rawStatement = clean(row?.statement);
  const humanTitle = clean(resolved.variant.title);
  const humanSummary = clean(resolved.variant.summary);
  const sourceLabelRaw = clean(resolved.variant.source_label) || clean(meta.source_label);
  const sourceLabel = requestedBase === "he"
    ? (safeHebrewPrimaryTitle(sourceLabelRaw, null) || humanizeResearchSource(row?.source, row?.source_ref))
    : (sourceLabelRaw || clean(row?.source));
  const statementLang = clean(presentation.statement_lang) || inferStatementLanguage(rawStatement);
  const sourceWitnessLang = clean(presentation.source_witness_lang);
  const sourceWitnessLangBasis = clean(presentation.source_witness_lang_basis);
  const hasHumanPresentation = Boolean(resolved.locale && (humanTitle || humanSummary));
  const typeLabel = researchKindLabel(row?.kind);
  const fallbackTitle = requestedBase === "he"
    ? contextualFallbackTitle(row, rawStatement, { typeLabel, sourceLabel })
    : (rawStatement || `Research object ${row?.id || ""}`.trim());
  const title = requestedBase === "he"
    ? safeHebrewPrimaryTitle(humanTitle, fallbackTitle)
    : (humanTitle || fallbackTitle);
  const occurrenceLabel = researchOccurrenceLabel(row?.source_ref);
  const dateLabel = formatHebrewDate(row?.created_at);
  const attribution = presentationAttribution(row);
  const storedContextLine = clean(resolved.variant.context_line);
  const contextLine = requestedBase === "he"
    ? (safeHebrewPrimaryTitle(storedContextLine, null)
      || [...new Set([typeLabel, sourceLabel, occurrenceLabel, dateLabel].filter(Boolean))].join(" · "))
    : storedContextLine;

  return {
    requestedLocale,
    resolvedLocale: hasHumanPresentation ? resolved.locale : null,
    title,
    summary: hasHumanPresentation ? humanSummary : null,
    sourceLabel,
    typeLabel,
    contextLine,
    attributionLabel: attribution.label,
    attributionState: attribution.state,
    occurrenceLabel,
    dateLabel,
    statementLang,
    sourceWitnessLang,
    sourceWitnessLangBasis,
    statementRole: clean(presentation.statement_role) || null,
    hasHumanPresentation,
    fallbackMode: hasHumanPresentation ? null : "raw_statement",
    originalText: rawStatement,
    displayText: normalizeResearchDisplayText(rawStatement),
    originalLanguage: statementLang,
    compiled: objectValue(presentation.compiled),
  };
}

export default resolveResearchObjectPresentation;
