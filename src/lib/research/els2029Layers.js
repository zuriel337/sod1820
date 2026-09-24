const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function cellFromPosition(position, occurrenceId, role) {
  const i = Number(position);
  if (!Number.isInteger(i) || i < 0) return null;
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
      corpusId: clean(occurrence.corpusId),
      dependencyGroup: clean(occurrence.dependencyGroup),
      skip: Number.isInteger(Number(occurrence.skip)) ? Number(occurrence.skip) : null,
      dir: [-1, 1].includes(Number(occurrence.dir)) ? Number(occurrence.dir) : null,
      start: Number.isInteger(Number(occurrence.start)) ? Number(occurrence.start) : null,
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
