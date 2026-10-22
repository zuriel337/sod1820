// Raziel grounded-source composer V3.
//
// A pure presentation projection over the existing authorized Result-Bundle consumer. It does
// not search, calculate, rank, authorize, persist or call a model. Its only jobs are to preserve
// the Bundle's presentation order, label the epistemic lane of each admitted Finding, prepare an
// honest deterministic fallback, and expose canonical number-page navigation without inventing a
// source URL.

export const RAZIEL_GROUNDED_SOURCE_COMPOSER_VERSION = 3;

const MAX_READS = 2;
const MAX_FINDINGS = 12;
const MAX_SOURCES = 12;
const MAX_NAVIGATION = 10;
const MAX_FALLBACK_FINDINGS = 6;
const MAX_SOURCE_TERMS = 48;

const list = (value) => Array.isArray(value) ? value : [];

function cleanText(value, max = 160) {
  if (value == null) return null;
  const text = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, max) : null;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 999999 ? number : null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function canonicalSubject(subject) {
  if (!subject || typeof subject !== "object") return null;
  if (subject.type === "number") {
    const value = safeNumber(subject.value);
    return value == null ? null : { type: "number", value };
  }
  if (subject.type === "expression") {
    const value = cleanText(subject.value, 120);
    return value ? { type: "expression", value } : null;
  }
  return null;
}

function subjectNavigation(subject) {
  if (subject?.type !== "number") return null;
  const value = safeNumber(subject.value);
  return value == null ? null : {
    kind: "number",
    label: `פתח את דף המספר ${value}`,
    href: `/number/${value}`,
  };
}

export function razielFindingEvidenceLane(finding) {
  if (!finding || typeof finding !== "object") return "unverified_finding";
  if (finding.stage === "interpretation") return "explicit_interpretation";
  if (finding.verification?.state === "match" && finding.verification?.engine_result != null) {
    return "verified_calculation";
  }
  if (
    finding.source?.source_ref
    && (finding.stage === "claim" || finding.verification?.claimed_expression)
  ) return "source_claim";
  if (finding.verification?.engine_result != null || list(finding.evidence?.facts).length) {
    return "engine_finding";
  }
  return "unverified_finding";
}

function evidenceLanes(findings) {
  const lanes = {
    verified_calculations: [],
    source_claims: [],
    engine_findings: [],
    explicit_interpretations: [],
    unverified_findings: [],
  };
  const target = {
    verified_calculation: "verified_calculations",
    source_claim: "source_claims",
    engine_finding: "engine_findings",
    explicit_interpretation: "explicit_interpretations",
    unverified_finding: "unverified_findings",
  };
  for (const finding of findings) {
    const id = cleanText(finding?.id, 200);
    if (id) lanes[target[razielFindingEvidenceLane(finding)]].push(id);
  }
  return lanes;
}

function appendSourceTerm(target, seen, value) {
  const term = cleanText(value, 160);
  if (!term || term.length < 2 || seen.has(term) || target.length >= MAX_SOURCE_TERMS) return;
  seen.add(term);
  target.push(term);
}

function sourceTerms(findings) {
  const terms = [];
  const seen = new Set();
  for (const finding of findings) {
    appendSourceTerm(terms, seen, finding?.subject?.label);
    appendSourceTerm(terms, seen, finding?.verification?.claimed_expression);
    for (const fact of list(finding?.evidence?.facts)) {
      if (!fact || typeof fact !== "object") continue;
      appendSourceTerm(terms, seen, fact.label);
      appendSourceTerm(terms, seen, fact.text);
      appendSourceTerm(terms, seen, fact.expression);
      appendSourceTerm(terms, seen, fact.partner);
      for (const expression of list(fact.expressions)) appendSourceTerm(terms, seen, expression);
    }
  }
  return terms;
}

function hasExplicitRarityEvidence(findings) {
  return findings.some((finding) => list(finding?.evidence_relations).some((relation) => (
    relation?.base_rate != null
    && relation.base_rate !== ""
    && Number.isFinite(Number(relation.base_rate))
  )));
}

function responseMode(entries) {
  if (entries.length === 2 && entries.every((entry) => entry.subject?.type === "number")) {
    return "number_comparison";
  }
  if (entries.some((entry) => entry.findings.some((finding) => finding?.kind === "gematria-crossing"))) {
    return "expression_crossing";
  }
  return "single_subject_research";
}

function responseGuidance(entries) {
  const findings = entries.flatMap((entry) => entry.findings);
  const rarityAllowed = hasExplicitRarityEvidence(findings);
  const mode = responseMode(entries);
  const singleNumber = entries.length === 1 && entries[0].subject?.type === "number";
  const expressionResearch = entries.some((entry) => entry.subject?.type === "expression");
  return [
    "נאמנות לניסוח המקור: כשאתה נותן שם לממצא, מושג או ביטוי מן המקור, השתמש בנוסח שהופיע בחבילה בדיוק. אל תמציא לו שם חלופי ואל תציג ניסוח מחדש כאילו הוא מונח מן המקור.",
    "מותר להסביר במילים טבעיות, אך הסבר שלא כתוב במקור חייב להיפתח במפורש כ׳פרשנות אפשרית׳ ולא כעובדה או כמונח מקור.",
    "אל תייחס לשם, למילה או למספר תפקיד רוחני, ביוגרפי, היסטורי או תיאולוגי אלא אם טענה זו מופיעה במפורש בנתיב source_claims שסופק. חישוב זהות מספרית לבדו אינו מקור למשמעות כזו.",
    "הנושא המפורש של החבילה הנוכחית גובר על רקע-המסך והשיחה הקודמת. אל תחבר אותו למספר או לנושא מן המשטח אלא אם המשתמש ביקש את החיבור או שהחבילה סיפקה יחס מפורש.",
    rarityAllowed
      ? "מותר לתאר נדירות רק בצמוד למדד הנדירות או לשיעור הבסיס המפורש שסופק בחבילה."
      : "לא סופק מדד נדירות מפורש: אל תשתמש במילים ׳נדיר׳, ׳נדירה׳ או ׳נדירות׳.",
    mode === "number_comparison"
      ? "בהשוואת שני מספרים: בדוק וסכם לפי הסדר התאמה באותה שיטה, התאמה חוצת־שיטות, תלות בין שיטות, ורק אחר כך קשרי נושא. אם לא סופקה התאמה ישירה — אמור זאת; אל תחליף אותה במטפורה."
      : null,
    mode === "expression_crossing"
      ? "בהצלבות: הפרד בין שוויון מספרי שסופק, עצמאות או תלות בין השיטות, וקשר סמנטי שהוא פרשנות בלבד."
      : null,
    expressionResearch
      ? "בניתוח ביטוי מן המחשבון: פתח במפת החישוב הקנונית המלאה שב-calculation_profile; קבץ שיטות שמחזירות אותו ערך, אל תספור שיטות תלויות כראיות נפרדות, ורק אחר כך הצג הצלבות. אל תצמצם את הניתוח לאריח הפעיל בלבד."
      : null,
    singleNumber
      ? "בניתוח מספר יחיד: שמור על סדר ההצגה הקנוני. הצג תחילה ביטויים וטענות מקור לפי הסדר שסופק, אחר כך מבנה ופעולות מספריות, אחר כך קשרים שנמצאו, ולבסוף פרשנות אפשרית מסומנת. אל תשלים שכבה שלא חזרה בחבילה."
      : null,
  ].filter(Boolean).join("\n");
}

function methodDetails(finding) {
  const methods = list(finding?.verification?.engine_result?.methods)
    .slice(0, 8)
    .map((item) => {
      const method = cleanText(item?.method, 50);
      const value = typeof item?.value === "number" || typeof item?.value === "string"
        ? cleanText(item.value, 40)
        : null;
      return method && value ? `${method}=${value}` : null;
    })
    .filter(Boolean);
  if (methods.length) return `שיטות: ${methods.join(" · ")}`;
  const method = cleanText(
    finding?.verification?.engine_method_tested || finding?.source?.method,
    60,
  );
  return method ? `שיטה: ${method}` : null;
}

function scalarValue(finding) {
  const engineValue = finding?.verification?.engine_result?.value;
  const value = engineValue ?? finding?.subject?.value;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const clean = cleanText(value, 80);
  return clean ? `ערך: ${clean}` : null;
}

function findingFallbackLine(finding, subjectLabel) {
  const lane = razielFindingEvidenceLane(finding);
  const prefix = {
    verified_calculation: "חישוב מאומת",
    source_claim: "טענת המאגר",
    engine_finding: "ממצא מנוע",
    explicit_interpretation: "פרשנות מתועדת",
    unverified_finding: "ממצא שטרם אומת",
  }[lane];
  const label = cleanText(finding?.subject?.label, 120) || subjectLabel;
  const source = cleanText(finding?.source?.source_name, 120);
  const details = [methodDetails(finding), scalarValue(finding), source ? `מקור: ${source}` : null]
    .filter(Boolean);
  return `• ${prefix}: ${label}${details.length ? ` · ${details.join(" · ")}` : ""}`;
}

function subjectLabel(subject) {
  return subject?.type === "number" ? String(subject.value) : (subject?.value || "הביטוי");
}

function fallbackSection(entry) {
  const label = subjectLabel(entry.subject);
  const findings = list(entry.projection?.model_input?.findings).slice(0, MAX_FALLBACK_FINDINGS);
  const methodProfile = list(entry.projection?.model_input?.calculation_profile);
  const methodLine = methodProfile.length
    ? `מפת החישוב הקנונית: ${methodProfile.map((item) => `${cleanText(item?.method_label || item?.method_key, 60)}=${cleanText(item?.value, 40)}`).filter(Boolean).join(" · ")}`
    : null;
  if (!findings.length) {
    return [
      methodLine,
      `ל־${label} לא חזר ממצא חיובי בחיפוש הקנוני התחום. אין זו הוכחה שאין קשרים במקורות אחרים.`,
    ].filter(Boolean).join("\n");
  }
  const lines = findings.map((finding) => findingFallbackLine(finding, label));
  const independenceNotClaimed = findings.some((finding) => (
    finding?.verification?.engine_result?.dependency_independence_claimed === false
  ));
  const truncated = entry.projection?.model_input?.output_bounds?.source_truncated === true
    || entry.projection?.model_input?.output_bounds?.consumer_truncated === true;
  return [
    `ממצאים קנוניים עבור ${label}, לפי הסדר שנקבע במקור:`,
    methodLine,
    ...lines,
    independenceNotClaimed ? "ההתאמות הן התכנסות בין שיטות; עצמאות בין משפחות החישוב לא נטענה." : null,
    truncated ? "מוצג כאן מדגם תחום; קיימים ממצאים נוספים שלא הוכנסו לתשובה זו." : null,
  ].filter(Boolean).join("\n");
}

function sourceList(entries) {
  const seen = new Set();
  const sources = [];
  for (const entry of entries) {
    for (const card of list(entry.projection?.human_view?.cards)) {
      const originalName = cleanText(card?.source_name, 120);
      const sourceRef = cleanText(card?.source_ref, 200);
      const lang = cleanText(card?.source_lang, 20);
      const key = `${originalName || ""}|${sourceRef || ""}|${lang || ""}`;
      if (!originalName || seen.has(key)) continue;
      seen.add(key);
      sources.push({ original_name: originalName, source_ref: sourceRef || null, lang: lang || null });
      if (sources.length >= MAX_SOURCES) return sources;
    }
  }
  return sources;
}

function navigationList(entries) {
  const seen = new Set();
  const navigation = [];
  for (const entry of entries) {
    const item = subjectNavigation(entry.subject);
    if (!item || seen.has(item.href)) continue;
    seen.add(item.href);
    navigation.push(item);
    if (navigation.length >= MAX_NAVIGATION) return navigation;
  }
  for (const entry of entries) {
    for (const method of list(entry.projection?.model_input?.calculation_profile)) {
      const value = safeNumber(method?.value);
      if (value == null) continue;
      const href = `/number/${value}`;
      if (seen.has(href)) continue;
      seen.add(href);
      navigation.push({ kind: "number", label: `פתח את דף המספר ${value}`, href });
      if (navigation.length >= MAX_NAVIGATION) return navigation;
    }
  }
  return navigation;
}

function admittedEntry(entry) {
  const subject = canonicalSubject(entry?.subject);
  const projection = entry?.projection;
  if (!subject || !projection || projection?.guards?.existing_result_bundle_is_authority !== true) return null;
  const findings = list(projection?.model_input?.findings).slice(0, MAX_FINDINGS);
  return { subject, projection, findings };
}

export function buildRazielGroundedSourceComposer(input = []) {
  const entries = list(input).slice(0, MAX_READS).map(admittedEntry).filter(Boolean);
  const bundles = entries.map((entry) => ({
    subject: entry.subject,
    subject_navigation: subjectNavigation(entry.subject),
    evidence_lanes: evidenceLanes(entry.findings),
    source_wording: sourceTerms(entry.findings),
    rarity_claim_allowed: hasExplicitRarityEvidence(entry.findings),
    result: entry.projection.model_input,
  }));
  const mode = responseMode(entries);
  const promptObject = {
    contract: "raziel-canonical-result-bundle-input-v1",
    composer_contract: `raziel-grounded-source-composer-v${RAZIEL_GROUNDED_SOURCE_COMPOSER_VERSION}`,
    response_mode: mode,
    bundles,
    presentation_contract: {
      order_authority: "result_bundle_presentation_order",
      verified_calculation_requires: "verification.state=match with engine_result",
      source_claim_requires_attribution: true,
      interpretation_requires_explicit_label: true,
      engine_finding_is_not_automatically_independent_evidence: true,
      use_source_names_in_original_language: true,
      never_expose_internal_ids_or_json: true,
      never_invent_missing_capability_or_source_link: true,
      source_terms_must_remain_verbatim_when_attributed: true,
      never_coin_a_source_term: true,
      free_synthesis_requires_explicit_interpretation_label: true,
      subject_definition_requires_explicit_source_claim: true,
      surface_context_does_not_create_a_relation: true,
      calculation_profile_is_complete_bounded_method_map: true,
      rarity_claim_requires_explicit_metric: true,
      comparison_must_state_missing_direct_evidence: true,
    },
  };
  const fallback = entries.map(fallbackSection).join("\n\n").slice(0, 3600);
  const result = {
    contract_version: RAZIEL_GROUNDED_SOURCE_COMPOSER_VERSION,
    prompt: bundles.length ? JSON.stringify(promptObject) : "",
    guidance: bundles.length ? responseGuidance(entries) : "",
    fallback,
    sources: sourceList(entries),
    navigation: navigationList(entries),
    guards: {
      projection_only: true,
      preserves_result_bundle_order: true,
      no_calculation: true,
      no_model_call: true,
      no_network_or_database: true,
      no_access_decision: true,
      no_persistence: true,
      no_source_url_inference: true,
      source_wording_integrity: true,
      subject_definition_requires_source_claim: true,
      surface_context_never_creates_relation: true,
      no_unmeasured_rarity_claim: true,
      no_extra_model_call: true,
    },
  };
  return deepFreeze(result);
}

export default buildRazielGroundedSourceComposer;
