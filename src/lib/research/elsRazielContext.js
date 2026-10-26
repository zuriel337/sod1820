import { stableIdentityDigest } from "./researchRepresentations.js";

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const boundedClean = (value, limit) => {
  const text = clean(value);
  return text && text.length <= limit ? text : null;
};

function safeInt(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

const EXACT_CONTRACT = "els_2029_projection_v1";
const EXACT_STATUS = "OK";
const EXACT_POLICY = "exact_replay_v1";
const EXACT_RETURN = "verified-v1";
const LANGUAGE_INSPECTION_CONTRACT = "els_matrix_language_inspection_v1";
const LANGUAGE_INSPECTION_STATUS = "CANDIDATE_INPUT";
const LANGUAGE_ORIENTATIONS = new Set(["horizontal", "vertical", "diagonal-right", "diagonal-left"]);
const LANGUAGE_FACT_LIMIT = 2800;
const LANGUAGE_ORIENTATION_CODE = Object.freeze({
  horizontal: "H",
  vertical: "V",
  "diagonal-right": "D+",
  "diagonal-left": "D-",
});

function canonicalHebrewLetters(value) {
  const finals = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
  return [...String(value ?? "")]
    .filter((letter) => letter >= "א" && letter <= "ת")
    .map((letter) => finals[letter] || letter)
    .join("");
}

function cleanScope(value) {
  const scope = clean(value);
  return ["torah", "tanakh"].includes(scope) ? scope : null;
}

function exactProjectionOccurrence(projection) {
  const selected = projection?.selectedOccurrence || null;
  const term = boundedClean(selected?.term || projection?.term, 80);
  const occurrenceId = clean(selected?.occurrenceId);
  const corpusId = boundedClean(selected?.corpusId || projection?.corpusId, 160);
  const skip = safeInt(selected?.skip);
  const dir = safeInt(selected?.dir);
  const start = safeInt(selected?.start);
  if (
    projection?.contract !== EXACT_CONTRACT
    || projection?.status !== EXACT_STATUS
    || projection?.presentation?.policy !== EXACT_POLICY
    || !term
    || !occurrenceId
    || !corpusId
    || skip == null
    || skip < 2
    || ![-1, 1].includes(dir)
    || start == null
    || start < 0
  ) return null;
  return selected;
}

function boundedLanguageInspection(value, selected, projection, scope) {
  if (
    !value
    || value.contract !== LANGUAGE_INSPECTION_CONTRACT
    || value.status !== LANGUAGE_INSPECTION_STATUS
    || value.source !== "canonical_matrix_letters"
    || value.modelCallsTriggered !== 0
  ) return null;
  const axis = value.axis || {};
  const selectedTerm = canonicalHebrewLetters(selected?.term || projection?.term);
  const axisTerm = canonicalHebrewLetters(axis.term);
  const axisScope = cleanScope(axis.scope);
  const axisSkip = safeInt(axis.skip);
  const axisDir = safeInt(axis.dir);
  const axisStart = safeInt(axis.start);
  if (
    !selectedTerm
    || axisTerm !== selectedTerm
    || axisScope !== scope
    || axisSkip !== safeInt(selected?.skip)
    || axisDir !== safeInt(selected?.dir)
    || axisStart !== safeInt(selected?.start)
  ) return null;

  const rays = [];
  let letterCount = 0;
  for (const raw of Array.isArray(value.rays) ? value.rays.slice(0, 24) : []) {
    const orientation = clean(raw?.orientation);
    const text = canonicalHebrewLetters(raw?.text);
    const reverseText = canonicalHebrewLetters(raw?.reverseText);
    const start = safeInt(raw?.start);
    const step = safeInt(raw?.step);
    const distance = safeInt(raw?.distance);
    if (
      !LANGUAGE_ORIENTATIONS.has(orientation)
      || text.length < 4
      || text.length > 24
      || reverseText !== [...text].reverse().join("")
      || start == null
      || start < 0
      || step == null
      || step === 0
      || distance == null
      || distance < 0
      || distance > 80
      || letterCount + text.length > 576
    ) continue;
    letterCount += text.length;
    rays.push(Object.freeze({
      id: `${orientation}:${start}:${step}:${text.length}`,
      orientation,
      text,
      reverseText,
      start,
      step,
      length: text.length,
      distance,
      intersectsAxis: distance === 0,
    }));
  }
  if (!rays.length) return null;
  const coverage = value.coverage || {};
  return Object.freeze({
    contract: LANGUAGE_INSPECTION_CONTRACT,
    status: LANGUAGE_INSPECTION_STATUS,
    source: "canonical_matrix_letters",
    axis: Object.freeze({ term: axisTerm, scope, skip: axisSkip, dir: axisDir, start: axisStart }),
    authority: Object.freeze({
      letters: "CANONICAL",
      segmentation: "UNVERIFIED",
      meaning: "UNVERIFIED",
      canonicalReplayRequired: true,
    }),
    coverage: Object.freeze({
      stage: "A",
      rayCap: 24,
      maxLetters: 24,
      totalRays: safeInt(coverage.totalRays),
      returnedRays: rays.length,
      truncated: coverage.truncated === true,
      letterCount,
    }),
    modelCallsTriggered: 0,
    rays: Object.freeze(rays),
  });
}

export function buildElsRazielLanguageFacts(surfaceContext) {
  const occurrence = surfaceContext?.occurrence || null;
  const result = surfaceContext?.result || null;
  const inspection = surfaceContext?.languageInspection || null;
  const axis = inspection?.axis || null;
  const scope = cleanScope(occurrence?.corpus);
  const occurrenceTerm = canonicalHebrewLetters(occurrence?.term);
  if (
    surfaceContext?.surface !== "els"
    || !occurrence?.occurrenceRef
    || result?.contract !== EXACT_CONTRACT
    || result?.status !== EXACT_STATUS
    || result?.presentationPolicy !== EXACT_POLICY
    || inspection?.contract !== LANGUAGE_INSPECTION_CONTRACT
    || inspection?.status !== LANGUAGE_INSPECTION_STATUS
    || inspection?.source !== "canonical_matrix_letters"
    || inspection?.modelCallsTriggered !== 0
    || inspection?.authority?.letters !== "CANONICAL"
    || inspection?.authority?.segmentation !== "UNVERIFIED"
    || inspection?.authority?.meaning !== "UNVERIFIED"
    || inspection?.authority?.canonicalReplayRequired !== true
    || !occurrenceTerm
    || canonicalHebrewLetters(axis?.term) !== occurrenceTerm
    || cleanScope(axis?.scope) !== scope
    || safeInt(axis?.skip) !== safeInt(occurrence?.skip)
    || safeInt(axis?.dir) !== safeInt(occurrence?.dir)
    || safeInt(axis?.start) !== safeInt(occurrence?.start)
  ) return "";

  const rays = [];
  for (const raw of Array.isArray(inspection.rays) ? inspection.rays.slice(0, 24) : []) {
    const orientation = clean(raw?.orientation);
    const text = canonicalHebrewLetters(raw?.text);
    const reverseText = canonicalHebrewLetters(raw?.reverseText);
    const start = safeInt(raw?.start);
    const step = safeInt(raw?.step);
    const distance = safeInt(raw?.distance);
    if (
      !LANGUAGE_ORIENTATIONS.has(orientation)
      || text.length < 4
      || text.length > 24
      || reverseText !== [...text].reverse().join("")
      || start == null
      || start < 0
      || step == null
      || step === 0
      || distance == null
      || distance < 0
      || distance > 80
    ) continue;
    rays.push({ orientation, text, reverseText, start, step, distance });
  }
  if (!rays.length) return "";

  const direction = occurrence.dir === -1 ? "לאחור" : "קדימה";
  const header = [
    "ELS_LANGUAGE_MAP_V1 — חומר מועמד בלבד, לא ממצאי ELS.",
    `ציר מאומת: ${occurrence.term}; היקף=${scope}; דילוג=${occurrence.skip}; כיוון=${direction}; התחלה=${occurrence.start}.`,
    "רק אותיות הקווים נגזרו מן המטריצה הקנונית. חלוקה למילים, קריאה ומשמעות אינן מאומתות.",
    "אפשר להציע עד שלוש קריאות ולסמן כל אחת כהשערה בלבד. אין לחשב או להשלים מיקום, דילוג או התאמה.",
    "כל הצעה חייבת exact replay במנוע ELS הקנוני לפני שתוצג כממצא.",
    "קווים: f=קדימה, r=הפוך, d=מרחק מן הציר; s/k הם מטא־נתונים קנוניים לקריאה בלבד.",
  ].join(" ");
  let facts = header;
  for (let index = 0; index < rays.length; index += 1) {
    const ray = rays[index];
    const row = ` R${index + 1}[${LANGUAGE_ORIENTATION_CODE[ray.orientation]};d=${ray.distance};s=${ray.start};k=${ray.step}] f=${ray.text};r=${ray.reverseText}.`;
    if (facts.length + row.length > LANGUAGE_FACT_LIMIT) break;
    facts += row;
  }
  return facts;
}

function exactReturnFields(value) {
  const occurrence = value?.occurrence && typeof value.occurrence === "object"
    ? value.occurrence
    : value;
  const result = value?.result && typeof value.result === "object" ? value.result : null;
  const term = boundedClean(occurrence?.term || value?.term, 80);
  const scope = cleanScope(occurrence?.corpus || occurrence?.scope || value?.scope || value?.corpus);
  const corpusId = boundedClean(result?.corpusId || occurrence?.corpusId || value?.corpusId, 160);
  const skip = safeInt(occurrence?.skip);
  const dir = safeInt(occurrence?.dir);
  const start = safeInt(occurrence?.start);
  const end = safeInt(occurrence?.end);
  const occurrenceRef = boundedClean(occurrence?.occurrenceRef || occurrence?.occurrence || value?.occurrenceRef, 160);
  if (!term || term.length < 2 || !scope || skip == null || skip < 2 || ![-1, 1].includes(dir) || start == null || start < 0) return null;
  return { term, scope, corpusId, skip, dir, start, end, occurrenceRef };
}

export function buildElsRazielSurfaceContext({
  researchContext = null,
  projection = null,
  layers = null,
  planSummary = null,
  languageInspection = null,
  includeText = false,
} = {}) {
  const subject = researchContext?.subject || null;
  const selected = exactProjectionOccurrence(projection);
  const scope = cleanScope(researchContext?.selection?.corpus || planSummary?.scope);
  if (!selected || !scope) return null;
  const selectedLayer = Array.isArray(layers?.layers)
    ? layers.layers.find((layer) => layer?.occurrenceId === selected?.occurrenceId) || null
    : null;
  const boundedInspection = boundedLanguageInspection(languageInspection, selected, projection, scope);

  const surfaceContext = {
    v: 1,
    surface: "els",
    lens: researchContext?.lens === "els" ? "els" : clean(researchContext?.lens),
    subject: subject
      ? {
          ref: clean(subject.id) ? `anon:${stableIdentityDigest(subject.id)}` : null,
          type: clean(subject.type),
        }
      : null,
    occurrence: selected
      ? {
          occurrenceRef: clean(selected.occurrenceId)
            ? `anon:${stableIdentityDigest(selected.occurrenceId)}`
            : null,
          term: boundedClean(selected.term || projection?.term, 80),
          corpus: scope,
          skip: safeInt(selected.skip),
          dir: [-1, 1].includes(safeInt(selected.dir)) ? safeInt(selected.dir) : null,
          start: safeInt(selected.start),
          end: safeInt(selected.end),
          positions: Array.isArray(selected.positions)
            ? selected.positions.map(safeInt).filter(Number.isInteger).slice(0, 256)
            : [],
          dependencyRef: clean(selected.dependencyGroup || selectedLayer?.dependencyGroup)
            ? `anon:${stableIdentityDigest(selected.dependencyGroup || selectedLayer?.dependencyGroup)}`
            : null,
          coordinateConvention: clean(selected.coordinateConvention),
        }
      : null,
    result: projection
      ? {
          status: clean(projection.status),
          contract: clean(projection.contract),
          corpusId: clean(selected.corpusId || projection?.corpusId),
          totalHits: safeInt(projection?.completion?.totalHits),
          returnedHits: safeInt(projection?.completion?.returnedHits),
          truncated: projection?.completion?.truncated === true,
          presentationPolicy: clean(projection?.presentation?.policy),
          representative: typeof projection?.presentation?.representative === "boolean"
            ? projection.presentation.representative
            : null,
        }
      : null,
    journey: researchContext?.journey
      ? {
          id: clean(researchContext.journey.id),
          kind: clean(researchContext.journey.kind),
          position: safeInt(researchContext.journey.position),
          revisionId: clean(researchContext.journey.revisionId),
          revisionNo: safeInt(researchContext.journey.revisionNo),
        }
      : null,
    plan: planSummary?.contract === "els_automatic_plan_summary_v1"
      ? {
          contract: planSummary.contract,
          sourceCount: safeInt(planSummary.sourceCount),
          variantCount: safeInt(planSummary.variantCount),
          scannedCount: safeInt(planSummary.scannedCount),
          partialCount: safeInt(planSummary.partialCount),
          failedCount: safeInt(planSummary.failedCount),
          hasPending: planSummary.hasPending === true,
          scope: planSummary.scope === "tanakh" ? "tanakh" : "torah",
          evidencePromotion: false,
        }
      : null,
    privacy: {
      includeText: includeText === true,
      rawPrivatePayloadLogged: false,
    },
    verification: {
      state: "MATCH",
      source: "canonical_els_engine",
      interpretation: false,
    },
    ...(boundedInspection ? { languageInspection: boundedInspection } : {}),
  };

  if (includeText === true) {
    surfaceContext.text = {
      subjectLabel: clean(subject?.label),
      term: clean(projection?.term),
    };
  }

  return Object.freeze(surfaceContext);
}


export function buildElsRazielGuidance(surfaceContext) {
  const occurrence = surfaceContext?.occurrence || null;
  const result = surfaceContext?.result || null;
  const exactReplay = Boolean(
    surfaceContext?.surface === "els"
    && occurrence?.occurrenceRef
    && result?.contract === "els_2029_projection_v1"
    && result?.status === "OK"
    && result?.presentationPolicy === "exact_replay_v1"
  );
  if (!exactReplay) return null;

  const term = clean(occurrence.term) || "הביטוי שנבחר";
  const direction = occurrence.dir === -1 ? "לאחור" : occurrence.dir === 1 ? "קדימה" : "בכיוון שמור";
  const skip = safeInt(occurrence.skip);
  const start = safeInt(occurrence.start);
  const end = safeInt(occurrence.end);
  const positionCount = Array.isArray(occurrence.positions) ? occurrence.positions.length : 0;
  const skipText = skip == null ? "בדילוג שמור" : `בדילוג של ${skip}`;
  const spanText = start != null && end != null
    ? `בין מיקום ${start} למיקום ${end}`
    : "על פני המיקומים המאומתים";
  const pointsText = positionCount === 1 ? "נקודה אחת בטקסט" : `${positionCount} נקודות בטקסט`;

  const lead = `המופע „${term}” אומת מול מנוע ה־ELS הקנוני. הוא עובר ${skipText} ${direction}, ${spanText}, דרך ${pointsText}.`;
  const boundary = "מאומתים כאן הביטוי, ההיקף והקואורדינטות של המופע בלבד. כל משמעות או קשר שרזיאל מציע הם פרשנות נפרדת; ההדגשה והקרבה על המסך אינן מוסיפות חוזק ראייתי.";
  const plan = surfaceContext?.plan;
  const planLine = plan ? `בתוכנית שהזנת יש ${plan.sourceCount} ביטויים ו־${plan.variantCount} צורות; ${plan.scannedCount} צורות נסרקו${plan.hasPending ? ", ועוד צורות או דפים ממתינים להמשך" : ""}. אלו בדיקות תלויות של אותם ביטויים, לא ראיות עצמאיות.` : null;
  const inactive = "הפעולה המחקרית הבאה האפשרית היא לחזור למופע המדויק, לקרוא את המקור סביבו או להשוות אליו ממצא מאומת נוסף. שום פעולה אינה מופעלת אוטומטית.";
  const question = "מה תרצה לבדוק במופע הזה — את מבנה הדילוג, את המקור סביבו או את גבולות הפרשנות?";
  const spokenScript = [lead, planLine, boundary, inactive, question].filter(Boolean).join(" ");

  return Object.freeze({
    contract: "els_raziel_guidance_v1",
    kind: "structural_explanation",
    language: "he",
    voice: "raziel",
    source: Object.freeze({
      surface: "els",
      occurrenceRef: clean(occurrence.occurrenceRef),
      projectionContract: clean(result.contract),
      presentationPolicy: clean(result.presentationPolicy),
    }),
    title: `המופע שנבחר · ${term}`,
    lead: planLine ? `${lead} ${planLine}` : lead,
    planLine,
    boundary,
    inactive,
    question,
    spokenScript,
    interpretation: false,
    evidencePromotion: false,
    audioExecuted: false,
  });
}

export function buildElsRazielExactHref(value) {
  const fields = exactReturnFields(value);
  if (!fields) return null;
  const params = new URLSearchParams({
    els_return: EXACT_RETURN,
    term: fields.term,
    scope: fields.scope,
    skip: String(fields.skip),
    dir: String(fields.dir),
    start: String(fields.start),
  });
  if (fields.corpusId) params.set("corpus", fields.corpusId);
  if (fields.end != null) params.set("end", String(fields.end));
  if (fields.occurrenceRef) params.set("occurrence", fields.occurrenceRef);
  return `/code?${params.toString()}`;
}

export function readElsRazielExactReturn(value) {
  const params = value instanceof URLSearchParams
    ? value
    : new URLSearchParams(typeof value === "string" ? value.replace(/^\?/, "") : "");
  if (params.get("els_return") !== EXACT_RETURN) return null;
  const fields = exactReturnFields({
    term: params.get("term"),
    scope: params.get("scope"),
    corpusId: params.get("corpus"),
    skip: params.get("skip"),
    dir: params.get("dir"),
    start: params.get("start"),
    end: params.get("end"),
    occurrenceRef: params.get("occurrence"),
  });
  if (!fields) return null;
  return Object.freeze({
    term: fields.term,
    scope: fields.scope,
    skip: fields.skip,
    dir: fields.dir,
    start: fields.start,
    hitId: `${fields.skip}_${fields.dir}_${fields.start}`,
    ...(fields.corpusId ? { corpusId: fields.corpusId } : {}),
    words: [],
    researchNonce: `raziel-return:${fields.scope}:${fields.skip}:${fields.dir}:${fields.start}`,
    occurrenceRef: fields.occurrenceRef,
  });
}

export default buildElsRazielSurfaceContext;
