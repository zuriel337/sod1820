const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function safeInt(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function buildElsRazielSurfaceContext({
  researchContext = null,
  projection = null,
  layers = null,
  includeText = false,
} = {}) {
  const subject = researchContext?.subject || null;
  const selected = projection?.selectedOccurrence || null;
  const selectedLayer = Array.isArray(layers?.layers)
    ? layers.layers.find((layer) => layer?.occurrenceId === selected?.occurrenceId) || null
    : null;

  const surfaceContext = {
    v: 1,
    surface: "els",
    lens: researchContext?.lens === "els" ? "els" : clean(researchContext?.lens),
    subject: subject
      ? {
          id: clean(subject.id),
          type: clean(subject.type),
          href: clean(subject.href),
        }
      : null,
    occurrence: selected
      ? {
          occurrenceId: clean(selected.occurrenceId),
          corpusId: clean(selected.corpusId || projection?.corpusId),
          skip: safeInt(selected.skip),
          dir: [-1, 1].includes(safeInt(selected.dir)) ? safeInt(selected.dir) : null,
          start: safeInt(selected.start),
          end: safeInt(selected.end),
          positions: Array.isArray(selected.positions)
            ? selected.positions.map(safeInt).filter(Number.isInteger).slice(0, 256)
            : [],
          dependencyGroup: clean(selected.dependencyGroup || selectedLayer?.dependencyGroup),
          coordinateConvention: clean(selected.coordinateConvention),
        }
      : null,
    result: projection
      ? {
          status: clean(projection.status),
          contract: clean(projection.contract),
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
    privacy: {
      includeText: includeText === true,
      rawPrivatePayloadLogged: false,
    },
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
    && occurrence?.occurrenceId
    && result?.contract === "els_2029_projection_v1"
    && result?.status === "OK"
    && result?.presentationPolicy === "exact_replay_v1"
  );
  if (!exactReplay) return null;

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

  const lead = `אתה מסתכל על מופע ELS שאומת מול המנוע הקנוני. הוא עובר ${skipText} ${direction}, ${spanText}, דרך ${pointsText}.`;
  const boundary = "הציר שמודגש כאן עוזר לראות את המופע שבחרת; ההדגשה והקרבה על המסך אינן מוסיפות לו חוזק ראייתי.";
  const inactive = "כרגע אני מסביר רק את מה שאומת ואת צורת ההצגה. בדיקת הסביבה, המשך הציר והמשמעות המחקרית עדיין אינן פעילות בשכבה הזאת.";
  const question = "מה מסקרן אותך להבין מכאן — איך הדילוג בנוי, מה משמעות הכיוון, או מה עדיין חסר כדי להעמיק?";
  const spokenScript = [lead, boundary, inactive, question].join(" ");

  return Object.freeze({
    contract: "els_raziel_guidance_v1",
    kind: "structural_explanation",
    language: "he",
    voice: "raziel",
    source: Object.freeze({
      surface: "els",
      occurrenceId: clean(occurrence.occurrenceId),
      projectionContract: clean(result.contract),
      presentationPolicy: clean(result.presentationPolicy),
    }),
    title: "מה אתה רואה כאן?",
    lead,
    boundary,
    inactive,
    question,
    spokenScript,
    interpretation: false,
    evidencePromotion: false,
    audioExecuted: false,
  });
}

export default buildElsRazielSurfaceContext;
