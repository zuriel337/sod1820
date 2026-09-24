const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const toInt = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

function cellFromPosition(position, occurrenceId, role) {
  const i = toInt(position);
  if (i == null || i < 0) return null;
  return Object.freeze({
    corpusIndex: i,
    occurrenceId,
    role,
    characterIdentityRef: "corpus-index:" + i,
    glyphIdentity: null,
    renderingInstance: null,
  });
}

export function projectEls2029Layers(projection) {
  if (!projection || projection.contract !== "els_2029_projection_v1") {
    return Object.freeze({
      contract: "els_2029_layers_v1",
      status: "CONTEXT_REQUIRED",
      corpusId: null,
      corpusVersion: null,
      layers: Object.freeze([]),
      axisOccurrenceId: null,
      projectionOnly: true,
    });
  }

  const selectedId = clean(projection?.selectedOccurrence?.occurrenceId);
  const layers = (Array.isArray(projection.occurrences) ? projection.occurrences : []).map((occurrence, index) => {
    const occurrenceId = clean(occurrence?.occurrenceId);
    if (!occurrenceId) return null;
    const role = selectedId && occurrenceId === selectedId ? "axis" : "occurrence";
    const positions = Array.isArray(occurrence.positions) ? occurrence.positions : [];
    const cells = Object.freeze(
      positions.map((position) => cellFromPosition(position, occurrenceId, role)).filter(Boolean)
    );

    return Object.freeze({
      layerId: "els-layer:" + occurrenceId,
      occurrenceId,
      role,
      order: role === "axis" ? 0 : index + 1,
      corpusId: clean(occurrence.corpusId) || clean(projection.corpusId),
      corpusVersion: clean(occurrence.corpusVersion) || clean(projection.corpusVersion),
      dependencyGroup: clean(occurrence.dependencyGroup),
      skip: toInt(occurrence.skip),
      dir: [-1, 1].includes(toInt(occurrence.dir)) ? toInt(occurrence.dir) : null,
      start: toInt(occurrence.start),
      end: toInt(occurrence.end),
      coordinateConvention: clean(occurrence.coordinateConvention),
      positions: Object.freeze([...positions]),
      cells,
      evidenceWeight: null,
      proximityStrength: null,
      truthPromotion: false,
    });
  }).filter(Boolean);

  layers.sort((a, b) => a.order - b.order || a.occurrenceId.localeCompare(b.occurrenceId));

  return Object.freeze({
    contract: "els_2029_layers_v1",
    status: clean(projection.status) || "UNVERIFIED",
    corpusId: clean(projection.corpusId),
    corpusVersion: clean(projection.corpusVersion),
    term: clean(projection.term),
    axisOccurrenceId: selectedId,
    layers: Object.freeze(layers),
    projectionOnly: true,
    semantics: Object.freeze({
      visualProximityIsEvidence: false,
      dependencyPreserved: true,
      glyphIdentityCanonicalized: false,
      rendererMayChange: true,
    }),
  });
}

export default projectEls2029Layers;
