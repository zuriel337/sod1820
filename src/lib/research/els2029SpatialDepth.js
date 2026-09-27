const toInt = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

function freezeList(items) {
  return Object.freeze(items);
}

export function projectElsDepthSlice({
  axisWidth,
  depth = 0,
  baseWindowOrigin,
  localCells,
  corpusLength = null,
} = {}) {
  const S = toInt(axisWidth);
  const z = toInt(depth);
  const origin = toInt(baseWindowOrigin);
  const N = toInt(corpusLength);

  if (S == null || S < 1 || z == null || origin == null || origin < 0 || !Array.isArray(localCells)) {
    return Object.freeze({
      contract: "els_corpus_native_depth_v1",
      status: "CONTEXT_REQUIRED",
      axisWidth: S,
      depth: z,
      baseWindowOrigin: origin,
      depthOffset: null,
      cells: freezeList([]),
      projectionOnly: true,
    });
  }

  const depthOffset = z * S;
  const cells = freezeList(localCells.map((cell, index) => {
    const localRow = toInt(cell?.localRow) ?? 0;
    const localCol = toInt(cell?.localCol);
    const explicitBase = toInt(cell?.baseCorpusIndex);
    if (localCol == null) return null;

    const baseCorpusIndex = explicitBase ?? (origin + localRow * S + localCol);
    const corpusIndex = baseCorpusIndex + depthOffset;
    const inCorpus = corpusIndex >= 0 && (N == null || corpusIndex < N);

    return Object.freeze({
      cellIndex: index,
      localRow,
      localCol,
      baseCorpusIndex,
      depth: z,
      depthOffset,
      corpusIndex: inCorpus ? corpusIndex : null,
      requestedCorpusIndex: corpusIndex,
      inCorpus,
      outOfCorpus: !inCorpus,
      sameLocalCellAcrossDepth: true,
    });
  }).filter(Boolean));

  return Object.freeze({
    contract: "els_corpus_native_depth_v1",
    status: cells.some((cell) => cell.inCorpus) ? "READY" : "OUT_OF_CORPUS",
    axisWidth: S,
    depth: z,
    baseWindowOrigin: origin,
    depthOffset,
    cells,
    projectionOnly: true,
    semantics: Object.freeze({
      wholeWindowTransform: true,
      transform: "baseCorpusIndex + depth * axisWidth",
      rendererOwnsDepthSemantics: false,
      createsIndependentEvidence: false,
      equivalentToRowShiftInSWidthMatrix: true,
    }),
  });
}

export function buildElsDepthStack({
  axisWidth,
  zMin = 0,
  zMax = 0,
  baseWindowOrigin,
  localCells,
  corpusLength = null,
} = {}) {
  const lo = toInt(zMin);
  const hi = toInt(zMax);
  if (lo == null || hi == null || hi < lo) {
    return Object.freeze({
      contract: "els_corpus_native_depth_stack_v1",
      status: "CONTEXT_REQUIRED",
      slices: freezeList([]),
      projectionOnly: true,
    });
  }

  const slices = freezeList(
    Array.from({ length: hi - lo + 1 }, (_, offset) => lo + offset)
      .map((depth) => projectElsDepthSlice({
        axisWidth,
        depth,
        baseWindowOrigin,
        localCells,
        corpusLength,
      }))
  );

  return Object.freeze({
    contract: "els_corpus_native_depth_stack_v1",
    status: slices.some((slice) => slice.status === "READY") ? "READY" : "OUT_OF_CORPUS",
    axisWidth: toInt(axisWidth),
    zMin: lo,
    zMax: hi,
    baseWindowOrigin: toInt(baseWindowOrigin),
    slices,
    projectionOnly: true,
  });
}

export default projectElsDepthSlice;
