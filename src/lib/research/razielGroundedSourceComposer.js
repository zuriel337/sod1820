// Raziel grounded-source composer V8.
//
// A pure presentation projection over the existing authorized Result-Bundle consumer. It does
// not search, calculate, truth-rank, authorize, persist or call a model. Its only jobs are to preserve
// the Bundle's presentation order, label the epistemic lane of each admitted Finding, prepare an
// honest deterministic fallback, expose canonical number-page navigation without inventing a
// source URL, and derive bounded presentation candidates for the exploratory view. Candidate
// ordering never changes the canonical evidence order or promotes a candidate to research truth.

export const RAZIEL_GROUNDED_SOURCE_COMPOSER_VERSION = 13;

const MAX_READS = 2;
const MAX_FINDINGS = 12;
const MAX_SOURCES = 12;
const MAX_NAVIGATION = 10;
const MAX_FALLBACK_FINDINGS = 6;
const MAX_SOURCE_TERMS = 48;
const MAX_SURPRISE_CANDIDATES = 3;
const MAX_CONSTELLATION_TERMS = 10;

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
    if (!value) return null;
    const requestedMethod = cleanText(subject.requestedMethod, 60);
    const relatedExpression = cleanText(subject.relatedExpression, 120);
    const observedValue = safeNumber(subject.observedValue);
    return {
      type: "expression",
      value,
      ...(requestedMethod ? { requestedMethod } : {}),
      ...(relatedExpression ? { relatedExpression } : {}),
      ...(observedValue != null ? { observedValue } : {}),
    };
  }
  return null;
}

function subjectNavigation(subject) {
  if (subject?.type !== "number") return null;
  const value = safeNumber(subject.value);
  return value == null ? null : {
    kind: "number",
    label: `פתח את דף המספר ${value}`,
    href: `/2029/number/${value}`,
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

function crossingNormalization(finding) {
  const value = finding?.verification?.engine_result?.relation_normalization;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const finite = (input) => Number.isFinite(Number(input)) ? Number(input) : null;
  const raw = finite(value.raw_independent_group_count);
  const effective = finite(value.effective_independent_group_count);
  const evidenceCounts = value.independent_evidence_counts && typeof value.independent_evidence_counts === "object"
    ? value.independent_evidence_counts
    : {};
  const sourceEvidenceCount = ["edges", "topic_cards", "research_objects"]
    .map((key) => finite(evidenceCounts[key]) || 0)
    .reduce((sum, count) => sum + count, 0);
  if (raw == null && effective == null) return null;
  return {
    raw,
    effective,
    collapsed: raw != null && effective != null ? Math.max(0, raw - effective) : null,
    sourceEvidenceCount,
  };
}

function responseMode(entries) {
  if (entries.length === 2 && entries.every((entry) => entry.subject?.type === "number")) {
    return "number_comparison";
  }
  if (entries.some((entry) => entry.findings.some((finding) => [
    "gematria-crossing",
    "gematria-confirmed-relation",
    "gematria-method-semantic",
  ].includes(finding?.kind)))) {
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
    "כשאתה מצטט ביטוי מאומת, העתק אותו בשלמותו ובדיוק מן החבילה; אל תחבר חלקי ביטויים, אל תשלים מילה ואל תתקן אותה בניחוש. אם אינך יכול לשמר את הנוסח — השמט את הביטוי במקום לייצר נוסח משובש.",
    "אל תכריז כמה ביטויים או ממצאים יש אלא אם total_count מפורש סופק בחבילה. כשסופקה ספירה, כתוב אותה בספרות בדיוק כפי שסופקה ואל תחשב מחדש מתוך מדגם חלקי או מניסוח התשובה.",
    "אל תוריד ביטוי מאומת לדרגת פרשנות רק מפני שניסוחו נשמע סמלי או מטפורי. אם החבילה אימתה ביטוי, שיטה וערך — הצג את השוויון כעובדה חישובית; רק המשמעות שאתה מסיק מן השוויון היא פרשנות.",
    "מותר ואף רצוי לזהות דפוס משמעותי ולהציע מטפורה, שם או חיבור מקורי משלך. פתח אותו במפורש כ׳רזיאל מציע׳ או כ׳פרשנות אפשרית׳, הסבר מיד בשפה פשוטה למה בחרת בו ועל אילו עובדות הוא נשען, ואל תייחס אותו למקור.",
    "אל תייחס לשם, למילה או למספר תפקיד רוחני, ביוגרפי, היסטורי או תיאולוגי אלא אם טענה זו מופיעה במפורש בנתיב source_claims שסופק. חישוב זהות מספרית לבדו אינו מקור למשמעות כזו.",
    "אל תהפוך פירוש מילוני אפשרי של ביטוי מצטלב להוכחה על נושא המחקר. אם למילה יש כמה מובנים, שמור את העמימות או הצע בחירה; קשר רעיוני נכתב רק כפרשנות מסומנת ועל בסיס העובדות שסופקו.",
    "תשובה מעמיקה אינה רשימת ערכים ארוכה: לאחר הצגת הבסיס המאומת, חבר בפסקה רציפה בין שני ממצאים שסופקו לפחות והסבר את מהלך החיבור. אם אין שני ממצאים שתומכים במהלך, אמור שאין עדיין בסיס לסינתזה במקום לכפות סיפור.",
    "הנושא המפורש של החבילה הנוכחית גובר על רקע-המסך והשיחה הקודמת. אל תחבר אותו למספר או לנושא מן המשטח אלא אם המשתמש ביקש את החיבור או שהחבילה סיפקה יחס מפורש.",
    rarityAllowed
      ? "מותר לתאר נדירות רק בצמוד למדד הנדירות או לשיעור הבסיס המפורש שסופק בחבילה."
      : "לא סופק מדד נדירות מפורש: אל תשתמש במילים ׳נדיר׳, ׳נדירה׳ או ׳נדירות׳.",
    mode === "number_comparison"
      ? "בהשוואת שני מספרים: בדוק וסכם לפי הסדר התאמה באותה שיטה, התאמה חוצת־שיטות, תלות בין שיטות, ורק אחר כך קשרי נושא. אם לא סופקה התאמה ישירה — אמור זאת לפני הפרשנות; אחר כך מותר להציע מטפורה מסומנת ומוסברת, בלי להציג אותה כראיה."
      : null,
    mode === "expression_crossing"
      ? "בהצלבות: הפרד בין שוויון מספרי שסופק, עצמאות או תלות בין השיטות, וקשר סמנטי. כאשר relation_normalization סופק, effective_independent_group_count הוא מספר משפחות החישוב האפקטיביות אחרי נרמול; raw_independent_group_count הוא המספר לפני נרמול. אל תהפוך אותם לציון מתוך 100 ואל תכנה משפחות חישוב ׳מקורות עצמאיים׳. independent_evidence_counts מתאר ראיות מקור נפרדות. ממצא מסוג gematria-confirmed-relation הוא יחס מחקרי מאושר ומאומת־מנוע של SOD1820; ממצא מסוג gematria-method-semantic הוא פרשנות מאושרת של מודל SOD1820, לא עובדה מתמטית ולא אמת מסורתית אוניברסלית."
      : null,
    expressionResearch
      ? "בניתוח ביטוי מן המחשבון: פתח במפת החישוב הקנונית המלאה שב-calculation_profile והשתמש ב-method_value_groups כדי להציג שיטות שמחזירות אותו ערך כקבוצה אחת. שמור את שמות השיטות, אך אל תהפוך method_count למספר ראיות עצמאיות ואל תטען לעצמאות כש-independent_support_count הוא null. רק אחר כך הצג הצלבות. אל תצמצם את הניתוח לאריח הפעיל בלבד."
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
  const methodValueGroups = list(entry.projection?.model_input?.method_value_groups);
  const methodLine = methodProfile.length
    ? `מפת החישוב הקנונית: ${methodProfile.map((item) => `${cleanText(item?.method_label || item?.method_key, 60)}=${cleanText(item?.value, 40)}`).filter(Boolean).join(" · ")}`
    : null;
  const normalizedGroupsLine = methodValueGroups.some((group) => Number(group?.method_count) > 1)
    ? `קבוצות ערך מנורמלות (ללא טענת עצמאות): ${methodValueGroups
      .filter((group) => Number(group?.method_count) > 1)
      .map((group) => {
        const methods = list(group?.methods)
          .map((method) => cleanText(method?.method_label || method?.method_key, 60))
          .filter(Boolean).join(", ");
        const equivalences = list(group?.proven_equivalence_sets)
          .map((set) => list(set?.methods).map((method) => cleanText(method, 60)).filter(Boolean).join(" + "))
          .filter(Boolean);
        const effectiveCount = Number.isSafeInteger(Number(group?.effective_distinct_method_count))
          ? Number(group.effective_distinct_method_count)
          : null;
        const dependency = equivalences.length
          ? `; שקילות מותנית מן המרשם: ${equivalences.join(", ")}${effectiveCount != null ? `; זהויות אפקטיביות: ${effectiveCount}` : ""}`
          : "";
        return `${cleanText(group?.value, 40)} ← ${methods}${dependency}`;
      })
      .filter(Boolean).join(" · ")}`
    : null;
  if (!findings.length) {
    return [
      methodLine,
      normalizedGroupsLine,
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
    normalizedGroupsLine,
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
      const href = `/2029/number/${value}`;
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

function numericFindingValue(finding) {
  const result = finding?.verification?.engine_result;
  const raw = result && typeof result === "object" ? result.value : result;
  const value = Number(raw ?? finding?.subject?.value);
  return Number.isSafeInteger(value) && value >= 1 && value <= 999999 ? value : null;
}

function hebrewLetterSignature(value) {
  const normalized = (cleanText(value, 160) || "")
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/gu, "")
    .replace(/[ךםןףץ]/gu, (letter) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[letter])
    .replace(/[^א-ת]/gu, "");
  return normalized ? [...normalized].sort().join("") : null;
}

function trivialLetterPermutation(left, right) {
  const a = hebrewLetterSignature(left);
  const b = hebrewLetterSignature(right);
  return !!a && a === b && comparable(left) !== comparable(right);
}

function semanticDescription(entry, method) {
  const finding = semanticInterpretation(entry, method);
  const fact = list(finding?.evidence?.facts)[0] || {};
  return cleanText(fact.semantic_description, 240) || cleanText(fact.label_he, 120);
}

function surpriseCandidateKey(candidate) {
  return [candidate.kind, candidate.value, ...list(candidate.terms).map(comparable).sort()].join("|");
}

function primaryExpressionAnchor(entries) {
  const expressionEntries = entries.filter((entry) => entry.subject?.type === "expression");
  if (expressionEntries.length !== 1) return null;
  const entry = expressionEntries[0];
  const profile = list(entry?.projection?.model_input?.calculation_profile).find((item) => (
    regularMethod(item?.method_label || item?.method_key)
  ));
  const expression = cleanText(entry.subject?.value, 120);
  const value = safeNumber(profile?.value);
  const method = cleanText(profile?.method_label || profile?.method_key, 60) || "רגיל";
  return expression && value != null ? { expression, method, value } : null;
}

// This is a deterministic presentation shortlist over already-admitted evidence. It does not
// calculate, query, infer statistical rarity or claim method independence. Scores are UI-writing
// preferences only: confirmed relations first, then a cross-Bundle value bridge, then bounded
// corpus convergence. Canonical presentation order is the stable tie-breaker.
export function razielSurpriseCandidates(input = []) {
  const entries = list(input).slice(0, MAX_READS).map(admittedEntry).filter(Boolean);
  const candidates = [];
  let sourceOrder = 0;
  const push = (candidate) => {
    const terms = list(candidate.terms).filter(Boolean);
    if (terms.length >= 2 && trivialLetterPermutation(terms[0], terms[1])) return;
    candidates.push({ ...candidate, terms, source_order: sourceOrder++ });
  };

  for (const entry of entries) {
    for (const finding of entry.findings) {
      if (finding?.kind === "gematria-confirmed-relation"
        && finding?.verification?.state === "match"
        && finding?.verification?.engine_result?.engine_verified === true) {
        const result = finding.verification.engine_result;
        const expression = cleanText(result.expression, 120);
        const partner = cleanText(result.partner, 120);
        const expressionMethod = cleanText(result.expression_method, 60);
        const partnerMethod = cleanText(result.partner_method, 60);
        const value = safeNumber(result.value);
        if (!expression || !partner || !expressionMethod || !partnerMethod || value == null) continue;
        const semantic = semanticDescription(entry, expressionMethod);
        push({
          kind: "confirmed_cross_method_relation",
          strength: 100,
          value,
          terms: [expression, partner],
          fact: `${expression} בשיטת ${expressionMethod} = ${value}; ${partner} בשיטת ${partnerMethod} = ${value}.`,
          interpretation_basis: semantic
            ? `החבילה מספקת גם את פרשנות השיטה: ${expressionMethod} — ${semantic}.`
            : "לא סופקה בחבילה משמעות מאושרת לשיטה; אפשר לפרש רק בזהירות מן המילים עצמן.",
          limit: "זהו שוויון מספרי מאומת; עצמאות בין השיטות וקשר סיבתי או מסורתי אינם מוכחים מעצם השוויון.",
        });
      }
    }
  }

  // A broad expression question needs more than multi-method pairs to support a memorable reading.
  // When the same canonical read set already contains the expression's regular Number Bundle, expose
  // a bounded constellation in canonical source order. This is still presentation-only: the model may
  // choose a coherent subset, but the shared value remains the sole admitted fact.
  const primaryAnchor = primaryExpressionAnchor(entries);
  const primaryNumberEntry = primaryAnchor && entries.find((entry) => (
    entry.subject?.type === "number" && safeNumber(entry.subject.value) === primaryAnchor.value
  ));
  if (primaryAnchor && primaryNumberEntry) {
    const seen = new Set([comparable(primaryAnchor.expression)]);
    const phrases = primaryNumberEntry.findings.flatMap((finding) => {
      const label = cleanText(finding?.subject?.label, 120);
      const value = numericFindingValue(finding);
      const method = cleanText(
        finding?.verification?.engine_method_tested || finding?.source?.method,
        60,
      );
      const lane = razielFindingEvidenceLane(finding);
      const key = comparable(label);
      if (!label || !key || seen.has(key) || value !== primaryAnchor.value || !regularMethod(method)
        || !["verified_calculation", "engine_finding"].includes(lane)) return [];
      seen.add(key);
      return [{ label, method: method || "רגיל" }];
    }).slice(0, MAX_CONSTELLATION_TERMS);
    if (phrases.length >= 3) {
      push({
        kind: "canonical_value_constellation",
        strength: 96,
        value: primaryAnchor.value,
        terms: [primaryAnchor.expression, ...phrases.map((item) => item.label)],
        fact: `${primaryAnchor.expression} בשיטת ${primaryAnchor.method} = ${primaryAnchor.value}; באותו ערך ובשיטת רגיל מופיעים לפי הסדר הקנוני: ${phrases.map((item) => item.label).join(" · ")}.`,
        interpretation_basis: "זו קבוצת עוגנים ולא מסקנה. בחר מתוכה שלושה עד חמישה ביטויים שיוצרים מתח, רצף או תמונה אחת, והסבר במפורש כיצד הקריאה נבנית מן המילים שסופקו.",
        limit: "הערך המשותף מוכח בחבילה; הסיפור המחבר בין הביטויים הוא פרשנות של רזיאל בלבד, לא קשר סיבתי, מסורתי או ביוגרפי מוכח.",
      });
    }
  }

  const numberEntriesByValue = new Map(entries
    .filter((entry) => entry.subject?.type === "number")
    .map((entry) => [safeNumber(entry.subject.value), entry]));
  for (const entry of entries.filter((item) => item.subject?.type === "expression")) {
    const expression = cleanText(entry.subject.value, 120);
    for (const method of list(entry.projection?.model_input?.calculation_profile)) {
      const value = safeNumber(method?.value);
      const methodLabel = cleanText(method?.method_label || method?.method_key, 60);
      const numberEntry = numberEntriesByValue.get(value);
      if (!expression || value == null || !methodLabel || !numberEntry) continue;
      for (const finding of numberEntry.findings) {
        const partner = cleanText(finding?.subject?.label, 120);
        const partnerMethod = cleanText(
          finding?.verification?.engine_method_tested || finding?.source?.method,
          60,
        );
        if (!partner || finding?.subject?.type === "number" || /^\d+$/u.test(partner)
          || comparable(partner) === comparable(expression)
          || numericFindingValue(finding) !== value || !partnerMethod) continue;
        const lane = razielFindingEvidenceLane(finding);
        if (!["verified_calculation", "engine_finding"].includes(lane)) continue;
        push({
          kind: "cross_bundle_value_bridge",
          strength: lane === "verified_calculation" ? 90 : 82,
          value,
          terms: [expression, partner],
          fact: `${expression} בשיטת ${methodLabel} = ${value}; ${partner} בשיטת ${partnerMethod} = ${value}.`,
          interpretation_basis: "שתי העובדות הופיעו באותה חבילת מחקר תחומה; מותר להציע חיבור רעיוני מסומן ביניהן.",
          limit: "הערך המשותף הוא עובדת החיבור היחידה; המשמעות המשותפת אינה מוכחת ויש להציג אותה כפרשנות אפשרית בלבד.",
        });
      }
    }
  }

  for (const entry of entries.filter((item) => item.subject?.type === "number")) {
    const anchorValue = safeNumber(entry.subject.value);
    const phrases = entry.findings.flatMap((finding) => {
      const label = cleanText(finding?.subject?.label, 120);
      const method = cleanText(
        finding?.verification?.engine_method_tested || finding?.source?.method,
        60,
      );
      const lane = razielFindingEvidenceLane(finding);
      if (!label || finding?.subject?.type === "number" || /^\d+$/u.test(label)
        || anchorValue == null || numericFindingValue(finding) !== anchorValue || !method
        || !["verified_calculation", "engine_finding"].includes(lane)) return [];
      return [{ label, method, lane }];
    });
    if (phrases.length < 2) continue;
    const anchor = phrases[0];
    for (const partner of phrases.slice(1, 5)) {
      push({
        kind: "shared_value_pair",
        strength: anchor.lane === "verified_calculation" && partner.lane === "verified_calculation" ? 80 : 70,
        value: anchorValue,
        terms: [anchor.label, partner.label],
        fact: `${anchor.label} בשיטת ${anchor.method} = ${anchorValue}; ${partner.label} בשיטת ${partner.method} = ${anchorValue}.`,
        interpretation_basis: "שני הביטויים מופיעים באותו ערך ובסדר ההצגה הקנוני; אפשר לבחון בזהירות איזה מתח, רצף או תמונה נוצרים ביניהם.",
        limit: "השוויון המספרי אינו מוכיח קשר רעיוני, סיבתי או מסורתי. אם אין גשר ברור שאפשר להסביר, אין לכפות פרשנות.",
      });
    }
  }

  for (const entry of entries) {
    for (const finding of entry.findings) {
      if (finding?.kind !== "gematria-crossing") continue;
      const result = finding?.verification?.engine_result;
      const fact = list(finding?.evidence?.facts).find((item) => item?.type === "gematria-multi-method-corpus-crossing") || {};
      const expression = cleanText(fact.expression, 120);
      const partner = cleanText(fact.partner, 120);
      const methods = list(result?.methods).map((item) => {
        const method = cleanText(item?.method, 60);
        const value = safeNumber(item?.value);
        return method && value != null ? `${method}=${value}` : null;
      }).filter(Boolean);
      if (!expression || !partner || !methods.length) continue;
      const normalization = crossingNormalization(finding);
      const normalizedFact = normalization?.effective != null
        ? ` מנוע הנרמול ספר ${normalization.effective} משפחות חישוב אפקטיביות${normalization.raw != null ? ` מתוך ${normalization.raw} לפני נרמול` : ""}${normalization.collapsed ? `; ${normalization.collapsed} התאמות תלויות לא הוסיפו משקל` : ""}.`
        : "";
      const sourceFact = normalization
        ? ` ראיות מקור נפרדות בחבילה: ${normalization.sourceEvidenceCount}.`
        : "";
      push({
        kind: "bounded_corpus_convergence",
        strength: normalization?.effective >= 2 ? 76 : normalization?.effective === 1 ? 62 : 58,
        value: null,
        terms: [expression, partner],
        fact: `${expression} ו${partner} מתכנסים בחבילת המאגר דרך ${methods.join(" וגם ")}.${normalizedFact}${sourceFact}`,
        interpretation_basis: "מותר לבחון אם המילים יוצרות ניגוד, רצף או תמונה משותפת, בלי להפוך פירוש מילוני לראיה.",
        limit: normalization?.effective != null
          ? `${normalization.effective} משפחות החישוב הן גיוון נוסחאי, לא ${normalization.effective} מקורות מחקריים; הקשר הסמנטי עדיין אינו מוכח.`
          : "עצמאות בין שיטות החישוב לא נטענה, ולכן אין לספור את מספר השיטות כמספר ראיות נפרדות.",
      });
    }
  }

  const seen = new Set();
  const ranked = candidates
    .sort((a, b) => b.strength - a.strength || a.source_order - b.source_order)
    .filter((candidate) => {
      const key = surpriseCandidateKey(candidate);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  // Broad expression readings need their regular-value constellation to lead the story. Without a
  // reserved slot, technically stronger pair relations can crowd it out and make the model narrate
  // normalization instead of the supplied words. This changes presentation priority only.
  const constellation = ranked.find((candidate) => candidate.kind === "canonical_value_constellation");
  const selected = constellation
    ? [constellation, ...ranked.filter((candidate) => candidate !== constellation).slice(0, MAX_SURPRISE_CANDIDATES - 1)]
    : ranked.slice(0, MAX_SURPRISE_CANDIDATES);
  return deepFreeze(selected
    .map(({ source_order, strength, ...candidate }) => candidate));
}

// Final output instructions. "מתפרע" is the full Legacy-style interpretive reading: flowing prose, no template headings, built
// around the asked expression. "הפתע אותי" is the ONLY contract that hunts one unexpected axis. The server layers carry the same contracts.
const EXPLORATORY_OUTPUT_INSTRUCTION = "[הוראת פלט סופית] כתוב בתוך answer פרשנות מלאה בפרוזה זורמת, 5–9 פסקאות, בלי כותרות ובלי רשימות. התחל מהביטוי שנשאל ומערכו הרגיל ושמור עליו כנושא עד הסוף; עבור לפי הסדר על השכבות שקיימות בתיק בלבד: משמעות הביטוי (כקריאה רכה ומסומנת), קבוצת הביטויים באותו ערך, מפגשים בכמה שיטות, אתבש כמראה, מילוי כפנימיות, מסתתר כרובד נסתר — וסיים בסינתזה אחת. דלג על שכבה שאין עליה חומר. הנרמול הוא בלם אמינות ולא הסיפור; סיים במשפט הסתייגות קצר וטבעי.";
const SURPRISE_OUTPUT_INSTRUCTION = "[הוראת פלט סופית] כתוב בתוך answer קריאה מפתיעה בפרוזה זורמת, 3–5 פסקאות, בלי כותרות ובלי רשימות: בחר ציר אחד בלתי צפוי מתוך התיק (מותר לפתוח בממצא צדדי), בנה סביבו סיפור והסבר מיד למה בחרת בו. הנרמול הוא בלם אמינות ולא הסיפור. אם אין בסיס טוב להפתעה — אמור זאת במקום לכפות סיפור.";

function surpriseGuidance(entries) {
  const candidates = razielSurpriseCandidates(entries);
  const intro = [
    "[מסנן הפתעות דטרמיניסטי — תעדוף תצוגה בלבד, לא מנוע אמת נוסף]",
    "בחר הפתעה אחת חזקה, או לכל היותר שלוש אם הן מוסיפות זוויות שונות. אל תציג רשימת אסוציאציות ואל תזכיר ציונים, מועמדים או את המסנן.",
    "השתמש רק בעובדות המועמד שסופקו כאן ובחבילת התוצאה. ניסוח הפרשנות יכול להיות מקורי ונועז, אך חייב להסביר את הגשר מן העובדה אל הרעיון.",
    "אל תהפוך את הנרמול, מספר השיטות או סידורי שחוזר בכמה זוגות לנושא הראשי. הם קובעים משקל ובקרה; ההפתעה עצמה צריכה להיות תזה על הביטויים והמתח ביניהם.",
  ];
  if (!candidates.length) return [...intro,
    "לא נמצא בחומר קשר שעבר את סף ההפתעה. אמור שאין עדיין בסיס להפתעה טובה ואל תכפה סיפור.",
    SURPRISE_OUTPUT_INSTRUCTION,
  ].join("\n");
  return [...intro, ...candidates.map((candidate, index) => [
    `אפשרות ${index + 1} — ${candidate.kind}:`,
    `עובדה שסופקה: ${candidate.fact}`,
    `בסיס פרשני: ${candidate.interpretation_basis}`,
    `גבול הראיה: ${candidate.limit}`,
  ].join("\n")), SURPRISE_OUTPUT_INSTRUCTION].join("\n");
}

// ── Method layers of the Legacy deep reading: אתבש (mirror), מילוי (inner), מסתתר (hidden) ─────────────────────────────
// The words that sit at the REGULAR value equal to one of the expression's method values. The values come from the
// already-supplied canonical calculation profile; the words come from the existing Number Result Bundle contract read for
// that value (the same contract, authorization and projection as every other read). Presentation only: no calculation.
const METHOD_LAYERS = Object.freeze([
  { key: "אתבש", role: "מראה" },
  { key: "מילוי", role: "פנימיות" },
  { key: "מסתתר", role: "רובד נסתר" },
]);
const MAX_LAYER_READS = METHOD_LAYERS.length;
const MAX_LAYER_TERMS = 6;

export function razielMethodLayerNumbers(expressionProjection) {
  const anchor = list(expressionProjection?.model_input?.calculation_profile)
    .find((item) => regularMethod(cleanText(item?.method_key || item?.method_label, 60)));
  const anchorValue = safeNumber(anchor?.value);
  const seen = new Set([anchorValue]);
  return METHOD_LAYERS.flatMap((layer) => {
    const item = list(expressionProjection?.model_input?.calculation_profile)
      .find((candidate) => comparableMethod(cleanText(candidate?.method_key || candidate?.method_label, 60)) === comparableMethod(layer.key));
    const value = safeNumber(item?.value);
    if (value == null || value < 1 || value > 999999 || seen.has(value)) return [];
    seen.add(value);
    return [{ layer: layer.key, role: layer.role, value }];
  }).slice(0, MAX_LAYER_READS);
}

function methodLayerLines(entries, layerEntries) {
  const expressionEntry = entries.find((entry) => entry.subject?.type === "expression");
  const expression = cleanText(expressionEntry?.subject?.value, 120);
  if (!expression || !layerEntries.length) return [];
  return razielMethodLayerNumbers(expressionEntry.projection).flatMap(({ layer, role, value }) => {
    const numberEntry = layerEntries.find((entry) => entry.subject?.type === "number" && safeNumber(entry.subject.value) === value);
    if (!numberEntry) return [];
    const seen = new Set([comparable(expression)]);
    const phrases = numberEntry.findings.flatMap((finding) => {
      const label = cleanText(finding?.subject?.label, 120);
      const key = comparable(label);
      const method = cleanText(finding?.verification?.engine_method_tested || finding?.source?.method, 60);
      if (!label || !key || seen.has(key) || /^\d+$/u.test(label) || finding?.subject?.type === "number"
        || numericFindingValue(finding) !== value || !regularMethod(method)
        || !["verified_calculation", "engine_finding"].includes(razielFindingEvidenceLane(finding))) return [];
      seen.add(key);
      return [label];
    }).slice(0, MAX_LAYER_TERMS);
    return phrases.length
      ? [`${layer} (${role}): ${expression} בשיטת ${layer} = ${value}; בשיטת רגיל באותו ערך ${value} מופיעים: ${phrases.join(" · ")}.`]
      : [];
  });
}

// ── "תיק פרשנות" — the compact deterministic interpretive dossier for "מתפרע" ─────────────────────────────────────
// A bounded projection of the SAME canonical Result Bundle (no second Bundle, no new read, no calculation). Nine labelled
// sections, each only when the Bundle supplies it; the raw Bundle JSON is never passed to the model in this mode.
const MAX_DOSSIER_CHARS = 9000;
const DOSSIER_EXCLUDED_KINDS = new Set(["gematria-method-value", "gematria-method-semantic", "gematria-crossing", "gematria-confirmed-relation"]);

function methodMapLine(entries) {
  const anchor = primaryExpressionAnchor(entries);
  const expressionEntry = anchor && entries.find((entry) => entry.subject?.type === "expression");
  const profile = list(expressionEntry?.projection?.model_input?.calculation_profile).flatMap((item) => {
    const method = cleanText(item?.method_label || item?.method_key, 60);
    const value = safeNumber(item?.value);
    return method && value != null ? [`${method}=${value}`] : [];
  }).slice(0, 40);
  return profile.length ? `מפת החישוב הקנונית שסופקה לביטוי: ${profile.join(" · ")}.` : null;
}

function equivalenceLines(entries) {
  return entries.flatMap((entry) => list(entry.projection?.model_input?.method_value_groups)
    .filter((group) => safeNumber(group?.method_count) > 1)
    .map((group) => {
      const methods = list(group.methods).map((method) => cleanText(method?.method_label || method?.method_key, 40)).filter(Boolean).join(" · ");
      const sets = list(group.proven_equivalence_sets).map((set) => list(set?.methods).join(" = ")).filter(Boolean).join("; ");
      const distinct = safeNumber(group.effective_distinct_method_count);
      return `ערך ${safeNumber(group.value)}: ${methods}${sets ? ` — שקילות מבנית מוכחת: ${sets}` : ""}${distinct != null ? ` — שיטות מובחנות אפקטיבית: ${distinct}` : ""}; עצמאות לא נטענה.`;
    })).slice(0, 6);
}

function sourceFindingLines(entries) {
  return entries.flatMap((entry) => entry.findings
    .filter((finding) => !DOSSIER_EXCLUDED_KINDS.has(finding?.kind)
      && ["source_claim", "verified_calculation", "engine_finding"].includes(razielFindingEvidenceLane(finding)))
    .map((finding) => findingFallbackLine(finding, subjectLabel(entry.subject)))).slice(0, 6);
}

function semanticLines(entries) {
  return entries.flatMap((entry) => entry.findings
    .filter((finding) => finding?.kind === "gematria-method-semantic" && finding?.stage === "interpretation")
    .map((finding) => {
      const fact = list(finding?.evidence?.facts)[0] || {};
      const method = cleanText(finding?.source?.method || fact.method, 60);
      const description = cleanText(fact.semantic_description, 200) || cleanText(fact.label_he, 120);
      return method && description ? `${method} — ${description}` : null;
    }).filter(Boolean)).slice(0, 6);
}

// Order / hierarchy only when the canonical source states it; never inferred.
function orderLines(entries) {
  return entries.flatMap((entry) => entry.findings.flatMap((finding) => list(finding?.evidence?.facts)
    .filter((fact) => /order|hierarch|sequence/i.test(String(fact?.type || "")))
    .map((fact) => cleanText(fact.text || fact.label_he || fact.relation_note || fact.label, 200))
    .filter(Boolean))).slice(0, 4);
}

function normalizationCaveats(entries) {
  return entries.flatMap((entry) => entry.findings.map(crossingNormalization).filter(Boolean)).slice(0, 3).map((n) => (
    `בהצלבה שסופקה: ${n.effective != null ? `${n.effective} משפחות חישוב אפקטיביות` : "נרמול חלקי"}${n.raw != null ? ` מתוך ${n.raw} לפני נרמול` : ""}${n.collapsed ? `; ${n.collapsed} התאמות תלויות לא הוסיפו משקל` : ""}.`
  ));
}

// A value typed beside the expression ("337 שאול") is an observed value to be checked against the canonical profile that was
// already supplied — never a second subject and never a new calculation.
function observedValueLine(entries, anchor) {
  const entry = anchor && entries.find((item) => item.subject?.type === "expression" && item.subject?.observedValue != null);
  const observed = safeNumber(entry?.subject?.observedValue);
  if (observed == null) return null;
  if (observed === anchor.value) return `הערך שנשאל, ${observed}, תואם את ${anchor.method} של ${anchor.expression} במפת החישוב הקנונית.`;
  const matching = list(entry?.projection?.model_input?.calculation_profile)
    .filter((item) => safeNumber(item?.value) === observed)
    .map((item) => cleanText(item?.method_label || item?.method_key, 40)).filter(Boolean);
  return matching.length
    ? `הערך שנשאל, ${observed}, אינו הערך ה${anchor.method} של ${anchor.expression} (${anchor.value}), אך הוא תואם בשיטות: ${matching.join(" · ")}.`
    : `הערך שנשאל, ${observed}, אינו מופיע במפת החישוב הקנונית של ${anchor.expression}; הערך ה${anchor.method} הוא ${anchor.value}.`;
}

// Every multi-method corpus meeting the Bundle supplies for the expression (exact methods and values per partner), bounded.
function meetingLines(entries) {
  return entries.flatMap((entry) => entry.findings
    .filter((finding) => finding?.kind === "gematria-crossing")
    .map((finding) => {
      const fact = list(finding?.evidence?.facts).find((item) => item?.type === "gematria-multi-method-corpus-crossing") || {};
      const expression = cleanText(fact.expression, 120);
      const partner = cleanText(fact.partner, 120);
      const methods = list(finding?.verification?.engine_result?.methods).map((item) => {
        const method = cleanText(item?.method, 60);
        const value = safeNumber(item?.value);
        return method && value != null ? `${method}=${value}` : null;
      }).filter(Boolean);
      return expression && partner && methods.length ? `${expression} ↔ ${partner}: ${methods.join(" · ")}` : null;
    }).filter(Boolean)).slice(0, 8);
}

function exploratoryBrief(entries, instruction = EXPLORATORY_OUTPUT_INSTRUCTION, layerEntries = []) {
  const anchor = primaryExpressionAnchor(entries);
  const candidates = razielSurpriseCandidates(entries);
  const constellation = candidates.find((candidate) => candidate.kind === "canonical_value_constellation");
  const relations = candidates.filter((candidate) => candidate !== constellation);
  const equivalences = equivalenceLines(entries);
  const sources = sourceFindingLines(entries);
  const meanings = semanticLines(entries);
  const order = orderLines(entries);
  const section = (title, lines) => (lines.filter(Boolean).length ? `${title}\n${lines.filter(Boolean).join("\n")}` : null);
  const caveats = [
    "עצמאות בין שיטות חישוב לא נטענה: מספר שיטות או משפחות אינו מספר ראיות עצמאיות, והנרמול הוא בלם אמינות ולא ממצא.",
    "שוויון מספרי אינו מוכיח קשר סמנטי, סיבתי או מסורתי; תמורת אותיות וכפילות שיטות טבעית אינן הצלבה.",
    !sources.length ? "לא סופק בתיק מקור או פוסט שמפרש את הביטוי." : null,
    !meanings.length ? "לא סופקה בתיק משמעות מאושרת של שיטות — אין להציג משמעות מילונית או מקור כעובדה; קריאה לשונית רכה ומסומנת מותרת." : null,
    ...normalizationCaveats(entries),
  ];
  const blocks = [
    "[תיק פרשנות תחום מתוך אותה חבילת־תוצאה קנונית — הקרנה דטרמיניסטית בלבד, לא מנוע ולא מקור אמת נוסף; השתמש רק בחומר שכאן]",
    section("1. הביטוי והערך המרכזי:", [anchor ? `${anchor.expression} · ${anchor.method}=${anchor.value}.` : null, observedValueLine(entries, anchor)]),
    section("2. מפת השיטות המחושבת:", [methodMapLine(entries)]),
    section("3. קבוצות שקילות לאחר נרמול:", equivalences),
    section("4. קבוצת הביטויים באותו ערך רגיל:", constellation ? [constellation.fact, `בסיס פרשני: ${constellation.interpretation_basis}`] : []),
    section("5. הצלבות בין־שיטתיות חשובות:", relations.slice(0, 3).map((candidate) => `${candidate.fact} גבול: ${candidate.limit}`)),
    section("5א. מפגשים בכמה שיטות (השיטות והערכים המדויקים לכל ביטוי):", meetingLines(entries)),
    section("5ב. שכבות המראה, הפנימיות והנסתר (ביטויים שערכם הרגיל שווה לערך השיטה):", methodLayerLines(entries, layerEntries)),
    section("6. ממצאים מאומתים ממקורות ופוסטים:", sources),
    section("7. משמעות השיטות המאושרת של SOD1820 (פרשנות SOD1820, לא עובדה מתמטית):", meanings),
    section("8. סדר והיררכיה שנקבעו במקור:", order),
    section("9. הסתייגויות:", caveats),
  ];
  // The bound applies to the material; the output instruction is always kept whole at the end.
  return `${blocks.filter(Boolean).join("\n").slice(0, MAX_DOSSIER_CHARS - instruction.length - 1)}\n${instruction}`;
}

function comparable(value) {
  return (cleanText(value, 160) || "")
    .normalize("NFKC")
    .replace(/["'״׳`]/gu, "")
    .replace(/[\s־–—-]+/gu, "")
    .toLowerCase();
}

function comparableMethod(value) {
  const normalized = comparable(value);
  return normalized.startsWith("ה") && normalized.length > 2 ? normalized.slice(1) : normalized;
}

function exactMethodProfile(entry, requestedMethod) {
  const wanted = comparableMethod(requestedMethod);
  if (!wanted) return null;
  return list(entry?.projection?.model_input?.calculation_profile).find((item) => (
    [item?.method_label, item?.method_key].some((candidate) => comparableMethod(candidate) === wanted)
  )) || null;
}

function confirmedRelation(entry, relatedExpression = null, requestedMethod = null) {
  const subject = comparable(entry?.subject?.value);
  const related = comparable(relatedExpression);
  const method = comparableMethod(requestedMethod);
  return entry.findings.find((finding) => {
    if (finding?.kind !== "gematria-confirmed-relation" || finding?.verification?.state !== "match") return false;
    const result = finding?.verification?.engine_result;
    if (!result || result.engine_verified !== true || !Number.isSafeInteger(Number(result.value))) return false;
    if (comparable(result.expression) !== subject) return false;
    if (related && comparable(result.partner) !== related) return false;
    if (method && comparableMethod(result.expression_method) !== method) return false;
    return true;
  }) || null;
}

// An exact-pair absence is a negative result only when the canonical crossing source attests that
// the relevant bounded read completed. A failed/gated/access-filtered capability is UNKNOWN, never
// evidence that the relation does not exist. `negative_result` is already the Bundle's explicit
// completed-search contract; an EXECUTED capability may also prove completion through the bounded,
// allowlisted confirmed-relation source trace projected by the Result-Bundle consumer.
function confirmedRelationSearchCompleted(entry) {
  const capability = list(entry?.projection?.model_input?.capabilities)
    .find((item) => item?.key === "crossings");
  if (!capability || Number(capability?.access_filtered?.count || 0) > 0) return false;
  if (capability.status === "negative_result" && capability?.negative_result?.searched === true) {
    return true;
  }
  const source = capability?.trace?.confirmed_relation_source;
  return capability.status === "executed"
    && source?.status === "available"
    && ["available", "not_needed"].includes(source?.public_endpoint_status)
    && ["available", "not_needed"].includes(source?.semantic_status);
}

function semanticInterpretation(entry, method) {
  const wanted = comparableMethod(method);
  if (!wanted) return null;
  return entry.findings.find((finding) => {
    if (finding?.kind !== "gematria-method-semantic" || finding?.stage !== "interpretation") return false;
    const fact = list(finding?.evidence?.facts)[0] || {};
    return [finding?.source?.method, fact?.method].some((candidate) => comparableMethod(candidate) === wanted);
  }) || null;
}

function semanticSentence(finding, method) {
  if (!finding) return null;
  const fact = list(finding?.evidence?.facts)[0] || {};
  const description = cleanText(fact.semantic_description, 240) || cleanText(fact.label_he, 120);
  if (!description) return null;
  return `במודל המשמעות המאושר של SOD1820, שיטת ${method} מתוארת כך: „${description}”. זו פרשנות של SOD1820, לא עובדה מתמטית ולא אמת מסורתית אוניברסלית.`;
}

function relationSentence(relation) {
  const result = relation?.verification?.engine_result;
  if (!result) return null;
  const expression = cleanText(result.expression, 120);
  const partner = cleanText(result.partner, 120);
  const expressionMethod = cleanText(result.expression_method, 60);
  const partnerMethod = cleanText(result.partner_method, 60);
  const value = safeNumber(result.value);
  if (!expression || !partner || !expressionMethod || !partnerMethod || value == null) return null;
  return `נמצא יחס מחקרי מאושר ומאומת־מנוע של SOD1820: ${expression} בשיטת ${expressionMethod} = ${value}, ו${partner} בשיטת ${partnerMethod} = ${value}. זהו שוויון מספרי מאומת; עצמאות בין שיטות החישוב לא נטענה.`;
}

function regularMethod(method) {
  return ["רגיל", "ragil", "regular"].includes(comparableMethod(method));
}

function exactRegularCorpusCrossings(entries, expression, value) {
  const numberEntry = entries.find((entry) => (
    entry?.subject?.type === "number" && safeNumber(entry.subject.value) === value
  ));
  if (!numberEntry) return [];
  const seen = new Set();
  return numberEntry.findings.flatMap((finding) => {
    if (finding?.kind !== "gematria") return [];
    const label = cleanText(finding?.subject?.label, 120);
    const findingValue = safeNumber(finding?.subject?.value);
    const method = cleanText(
      finding?.verification?.engine_method_tested || finding?.source?.method,
      60,
    );
    const engineValue = safeNumber(finding?.verification?.engine_result);
    const publishedFact = list(finding?.evidence?.facts).find((fact) => (
      fact?.type === "published-gematria-phrase"
      && fact?.status === "verified_published"
      && safeNumber(fact?.value) === value
      && regularMethod(fact?.method)
    ));
    if (!label || comparable(label) === comparable(expression) || findingValue !== value
      || !regularMethod(method) || (engineValue !== value && !publishedFact)
      || seen.has(comparable(label))) return [];
    seen.add(comparable(label));
    return [{ label, method: method || "רגיל", value, basis: engineValue === value ? "engine" : "verified_public_corpus" }];
  }).slice(0, 6);
}

function exactCorpusCrossingSentence(crossings, expression, method, value) {
  if (!crossings.length) return null;
  const rendered = crossings.map((item) => `${item.label} בשיטת ${item.method} = ${item.value}`).join("; ");
  const allEngine = crossings.every((item) => item.basis === "engine");
  const lane = allEngine ? "ממצאי מנוע ציבוריים" : "ממצאים מן המאגר הציבורי המאומת";
  return `באותה חבילת מחקר נמצאו ${lane} לאותו ערך: ${rendered}. לכן ${expression} בשיטת ${method} מתכנסת איתם מספרית בערך ${value}; משמעות הקשר, אם ישנה, דורשת פרשנות נפרדת.`;
}

// High-confidence focused questions do not need a model to restate already projected facts. This
// is a presentation of the authorized canonical Bundle, not a calculator, relation engine or new
// source. Broad questions still receive the full prompt for synthesis.
function directCanonicalAnswer(entries) {
  const expressionEntries = entries.filter((entry) => entry.subject?.type === "expression");
  if (expressionEntries.length !== 1) return null;
  const entry = expressionEntries[0];
  const { value: expression, requestedMethod, relatedExpression, observedValue } = entry.subject;

  if (relatedExpression) {
    const relation = confirmedRelation(entry, relatedExpression);
    if (!relation && confirmedRelationSearchCompleted(entry)) return {
      kind: "exact_expression_relation_negative",
      answer: `בחבילת המחקר הקנונית לא נמצא יחס ישיר, מאושר ומאומת־מנוע בין ${expression} לבין ${relatedExpression}. אין בכך הוכחה שאין קשר במקורות אחרים; רק שהיחס המבוקש לא אומת בחיפוש התחום הזה.`,
      facts: [],
    };
    if (!relation) return null;
    const result = relation.verification.engine_result;
    const semantic = semanticSentence(
      semanticInterpretation(entry, result.expression_method),
      cleanText(result.expression_method, 60),
    );
    return {
      kind: "exact_expression_relation",
      answer: [relationSentence(relation), semantic].filter(Boolean).join(" "),
      anchor_value: safeNumber(result.value),
      facts: [
        { label: `${result.expression} · ${result.expression_method}`, value: String(result.value) },
        { label: `${result.partner} · ${result.partner_method}`, value: String(result.value) },
      ],
    };
  }

  if (requestedMethod) {
    const profile = exactMethodProfile(entry, requestedMethod);
    if (!profile || !Number.isSafeInteger(Number(profile.value))) {
      const completeProfile = list(entry?.projection?.model_input?.calculation_profile);
      const outputBounds = entry?.projection?.model_input?.output_bounds;
      if (!completeProfile.length || outputBounds?.source_truncated === true || outputBounds?.consumer_truncated === true) return null;
      return {
        kind: "exact_expression_method_unavailable",
        answer: `השיטה ${requestedMethod} לא נמצאה במפת החישוב הקנונית והשלמה של ${expression}. לכן לא חישבתי את מילות הפקודה ולא המצאתי ערך חלופי.`,
        facts: [],
      };
    }
    const method = cleanText(profile.method_label || profile.method_key, 60);
    const value = Number(profile.value);
    const relation = confirmedRelation(entry, null, method);
    const semantic = semanticSentence(semanticInterpretation(entry, method), method);
    const crossings = exactRegularCorpusCrossings(entries, expression, value);
    const observedCorrection = observedValue != null && observedValue !== value
      ? `הערך ${observedValue} שנכתב בשאלה אינו תוצאת ${method} של ${expression}; התוצאה הקנונית היא ${value}.`
      : null;
    return {
      kind: "exact_expression_method",
      answer: [
        observedCorrection,
        `${expression} בשיטת ${method} = ${value}. זהו חישוב מתוך מפת החישוב הקנונית של המנוע.`,
        relationSentence(relation),
        exactCorpusCrossingSentence(crossings, expression, method, value),
        semantic,
      ].filter(Boolean).join(" "),
      anchor_value: value,
      facts: [
        { label: `${expression} · ${method}`, value: String(value) },
        ...crossings.map((item) => ({ label: `${item.label} · ${item.method}`, value: String(item.value) })),
      ],
    };
  }
  return null;
}

export function buildRazielGroundedSourceComposer(input = [], { layerReads = [] } = {}) {
  const entries = list(input).slice(0, MAX_READS).map(admittedEntry).filter(Boolean);
  // Extra Number reads for the method layers feed ONLY the interpretive dossier; the prompt, guidance and candidates stay on the primary reads.
  const layerEntries = list(layerReads).slice(0, MAX_LAYER_READS).map(admittedEntry).filter(Boolean);
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
      verified_expression_must_not_be_downgraded_by_semantic_tone: true,
      source_claim_requires_attribution: true,
      interpretation_requires_explicit_label: true,
      engine_finding_is_not_automatically_independent_evidence: true,
      use_source_names_in_original_language: true,
      never_expose_internal_ids_or_json: true,
      never_invent_missing_capability_or_source_link: true,
      source_terms_must_remain_verbatim_when_attributed: true,
      source_terms_must_not_be_merged_or_autocorrected: true,
      total_count_claim_requires_explicit_total_count: true,
      explicit_counts_must_be_copied_as_digits: true,
      calculation_subject_must_equal_bundle_subject: true,
      request_scaffolding_must_not_be_calculated: true,
      lexical_gloss_is_not_relation_evidence: true,
      rich_synthesis_requires_supplied_evidence: true,
      never_coin_a_source_term: true,
      free_synthesis_requires_explicit_interpretation_label: true,
      original_interpretation_is_allowed_when_labeled_and_explained: true,
      subject_definition_requires_explicit_source_claim: true,
      surface_context_does_not_create_a_relation: true,
      calculation_profile_is_complete_bounded_method_map: true,
      method_value_groups_are_normalized_presentation_not_new_calculation: true,
      method_count_is_not_independent_support_count: true,
      normalized_method_family_count_is_not_source_evidence_count: true,
      relation_normalization_must_not_be_rendered_as_percent_score: true,
      proven_equivalence_requires_satisfied_canonical_registry_rule: true,
      confirmed_relation_is_sod1820_research_evidence: true,
      method_semantic_is_explicit_sod1820_interpretation: true,
      rarity_claim_requires_explicit_metric: true,
      comparison_must_state_missing_direct_evidence: true,
    },
  };
  const fallback = entries.map(fallbackSection).join("\n\n").slice(0, 3600);
  const result = {
    contract_version: RAZIEL_GROUNDED_SOURCE_COMPOSER_VERSION,
    prompt: bundles.length ? JSON.stringify(promptObject) : "",
    guidance: bundles.length ? responseGuidance(entries) : "",
    surprise_guidance: bundles.length ? surpriseGuidance(entries) : "",
    exploratory_brief: bundles.length ? exploratoryBrief(entries, EXPLORATORY_OUTPUT_INSTRUCTION, layerEntries) : "",
    surprise_brief: bundles.length ? exploratoryBrief(entries, SURPRISE_OUTPUT_INSTRUCTION, layerEntries) : "",
    fallback,
    sources: sourceList(entries),
    navigation: navigationList(entries),
    direct_answer: directCanonicalAnswer(entries),
    primary_expression_anchor: primaryExpressionAnchor(entries),
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
      surprise_candidates_are_presentation_only: true,
      surprise_candidates_do_not_claim_independence_or_rarity: true,
      direct_answer_uses_canonical_projection_only: true,
      calculation_subject_fidelity: true,
    },
  };
  return deepFreeze(result);
}

export default buildRazielGroundedSourceComposer;
