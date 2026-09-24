const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const toInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const freezeList = (items) => Object.freeze(items);

function emptyRepresentation(status = "CONTEXT_REQUIRED") {
  return Object.freeze({
    contract: "els_2029_representation_v1",
    sourceContract: "els_2029_layers_v1",
    status,
    sourceStatus: null,
    corpusId: null,
    corpusVersion: null,
    axisOccurrenceId: null,
    extent: null,
    bands: freezeList([]),
    projectionOnly: true,
    semantics: Object.freeze({
      visualProximityIsEvidence: false,
      axisIsProjectionRole: true,
      glyphIdentityCanonicalized: false,
      fontOutlineOwned: false,
      renderingInstanceCanonicalized: false,
      rendererMayChange: true,
    }),
  });
}

export function projectEls2029Representation(layers) {
  if (!layers || layers.contract !== "els_2029_layers_v1") {
    return emptyRepresentation();
  }

  const sourceLayers = Array.isArray(layers.layers) ? layers.layers : [];
  let min = null;
  let max = null;
  for (const layer of sourceLayers) {
    for (const cell of Array.isArray(layer?.cells) ? layer.cells : []) {
      const corpusIndex = toInt(cell?.corpusIndex);
      if (corpusIndex == null) continue;
      min = min == null ? corpusIndex : Math.min(min, corpusIndex);
      max = max == null ? corpusIndex : Math.max(max, corpusIndex);
    }
  }

  if (min == null || max == null) {
    const empty = emptyRepresentation("NO_GEOMETRY");
    return Object.freeze({
      ...empty,
      sourceStatus: clean(layers.status),
      corpusId: clean(layers.corpusId),
      corpusVersion: clean(layers.corpusVersion),
      axisOccurrenceId: clean(layers.axisOccurrenceId),
    });
  }

  const span = max - min;

  const bands = sourceLayers.map((layer, bandIndex) => {
    const occurrenceId = clean(layer?.occurrenceId);
    if (!occurrenceId) return null;
    const role = layer?.role === "axis" ? "axis" : "occurrence";
    const sourceCells = Array.isArray(layer?.cells) ? layer.cells : [];

    const cells = sourceCells.map((cell, sequenceIndex) => {
      const corpusIndex = toInt(cell?.corpusIndex);
      if (corpusIndex == null) return null;
      const xRatio = span === 0 ? 0.5 : (corpusIndex - min) / span;

      return Object.freeze({
        corpusIndex,
        occurrenceId: clean(cell?.occurrenceId) || occurrenceId,
        role,
        sequenceIndex,
        xRatio,
        characterIdentityRef: clean(cell?.characterIdentityRef),
        glyphIdentity: cell?.glyphIdentity ?? null,
        fontOutline: null,
        renderingInstance: null,
      });
    }).filter(Boolean);

    return Object.freeze({
      bandIndex,
      layerId: clean(layer?.layerId),
      occurrenceId,
      role,
      corpusId: clean(layer?.corpusId) || clean(layers.corpusId),
      corpusVersion: clean(layer?.corpusVersion) || clean(layers.corpusVersion),
      dependencyGroup: clean(layer?.dependencyGroup),
      skip: toInt(layer?.skip),
      dir: [-1, 1].includes(Number(layer?.dir)) ? Number(layer.dir) : null,
      start: toInt(layer?.start),
      end: toInt(layer?.end),
      coordinateConvention: clean(layer?.coordinateConvention),
      positions: freezeList(Array.isArray(layer?.positions) ? [...layer.positions] : []),
      cells: freezeList(cells),
      visualDepth: role === "axis" ? "focus" : "context",
      evidenceWeight: null,
      proximityStrength: null,
      truthPromotion: false,
    });
  }).filter(Boolean);

  return Object.freeze({
    contract: "els_2029_representation_v1",
    sourceContract: "els_2029_layers_v1",
    status: bands.length ? "READY" : "NO_GEOMETRY",
    sourceStatus: clean(layers.status),
    corpusId: clean(layers.corpusId),
    corpusVersion: clean(layers.corpusVersion),
    axisOccurrenceId: clean(layers.axisOccurrenceId),
    extent: Object.freeze({
      minCorpusIndex: min,
      maxCorpusIndex: max,
      span,
      mapping: span === 0 ? "single-point-center" : "linear-corpus-index",
    }),
    bands: freezeList(bands),
    projectionOnly: true,
    semantics: Object.freeze({
      visualProximityIsEvidence: false,
      axisIsProjectionRole: true,
      glyphIdentityCanonicalized: false,
      fontOutlineOwned: false,
      renderingInstanceCanonicalized: false,
      rendererMayChange: true,
    }),
  });
}

export default projectEls2029Representation;
