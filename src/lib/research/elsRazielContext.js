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

export default buildElsRazielSurfaceContext;
