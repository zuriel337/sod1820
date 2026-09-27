const toInt = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const gcd = (a, b) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

function positiveMod(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function shortestCyclicDelta(delta, width) {
  const mod = positiveMod(delta, width);
  if (mod > width / 2) return mod - width;
  if (mod < width / 2) return mod;
  return delta < 0 ? -mod : mod;
}

function decomposeStep(delta, axisWidth) {
  const dc = shortestCyclicDelta(delta, axisWidth);
  const dr = (delta - dc) / axisWidth;
  if (!Number.isInteger(dr)) return null;
  return { dr, dc };
}

function canonicalPrimitive(dr, dc) {
  if (dr === 0 && dc === 0) return null;
  const divisor = gcd(dr, dc);
  let vr = dr / divisor;
  let vc = dc / divisor;
  if (vr < 0 || (vr === 0 && vc < 0)) {
    vr *= -1;
    vc *= -1;
  }
  return Object.freeze([vr, vc]);
}

function sameVector(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1];
}

function cyclicDistance(a, b, width) {
  const raw = Math.abs(a - b);
  return Math.min(raw, width - raw);
}

function normalizedInvariant(value, period) {
  if (!period) return value;
  return positiveMod(value, period);
}

function invariantDelta(a, b, period) {
  const raw = Math.abs(a - b);
  if (!period) return raw;
  const mod = raw % period;
  return Math.min(mod, period - mod);
}

function pairedSupport(lineA, lineB, axisWidth) {
  const [vr, vc] = lineA.primitiveVector || [];
  if (vr == null || vc == null) {
    return Object.freeze({ axis: null, count: 0, gaps: Object.freeze([]), constantGap: null });
  }
  const useRows = Math.abs(vr) >= Math.abs(vc);
  const key = useRows ? "row" : "unwrappedCol";
  const value = useRows ? "col" : "row";
  const bMap = new Map(lineB.coordinates.map((point) => [point[key], point[value]]));
  const gaps = [];
  for (const point of lineA.coordinates) {
    if (!bMap.has(point[key])) continue;
    const other = bMap.get(point[key]);
    gaps.push(useRows
      ? cyclicDistance(point[value], other, axisWidth)
      : Math.abs(point[value] - other));
  }
  const constantGap = gaps.length > 0 ? gaps.every((gap) => gap === gaps[0]) : null;
  return Object.freeze({
    axis: useRows ? "row" : "column",
    count: gaps.length,
    gaps: Object.freeze(gaps),
    constantGap,
  });
}

export function deriveElsLineGeometry(occurrence, axisWidth) {
  const width = toInt(axisWidth);
  if (width == null || width < 1 || !occurrence || typeof occurrence !== "object") return null;
  const positions = Array.isArray(occurrence.positions)
    ? occurrence.positions.map(toInt).filter((value) => value != null && value >= 0)
    : [];
  if (positions.length < 2) return null;

  const coordinates = [];
  const first = positions[0];
  let unwrappedRow = Math.floor(first / width);
  let unwrappedCol = positiveMod(first, width);
  coordinates.push(Object.freeze({
    sequenceIndex: 0,
    corpusIndex: first,
    row: Math.floor(first / width),
    col: positiveMod(first, width),
    unwrappedRow,
    unwrappedCol,
  }));

  const steps = [];
  for (let i = 1; i < positions.length; i += 1) {
    const delta = positions[i] - positions[i - 1];
    const step = decomposeStep(delta, width);
    if (!step) return null;
    steps.push(Object.freeze({ delta, ...step }));
    unwrappedRow += step.dr;
    unwrappedCol += step.dc;
    coordinates.push(Object.freeze({
      sequenceIndex: i,
      corpusIndex: positions[i],
      row: Math.floor(positions[i] / width),
      col: positiveMod(positions[i], width),
      unwrappedRow,
      unwrappedCol,
    }));
  }

  const firstStep = steps[0];
  const linear = steps.every((step) => step.dr === firstStep.dr && step.dc === firstStep.dc);
  const primitiveVector = linear ? canonicalPrimitive(firstStep.dr, firstStep.dc) : null;
  let lineInvariant = null;
  let invariantPeriod = null;

  if (primitiveVector) {
    const [vr, vc] = primitiveVector;
    const invariants = coordinates.map((point) => vr * point.unwrappedCol - vc * point.unwrappedRow);
    if (invariants.every((value) => value === invariants[0])) {
      invariantPeriod = Math.abs(vr) * width || null;
      lineInvariant = normalizedInvariant(invariants[0], invariantPeriod);
    }
  }

  return Object.freeze({
    occurrenceId: clean(occurrence.occurrenceId ?? occurrence.occurrence_id),
    term: clean(occurrence.term),
    axisWidth: width,
    positions: Object.freeze([...positions]),
    coordinates: Object.freeze(coordinates),
    steps: Object.freeze(steps),
    linear,
    rawStep: linear ? Object.freeze([firstStep.dr, firstStep.dc]) : null,
    primitiveVector,
    lineInvariant,
    invariantPeriod,
    traversalDirection: toInt(occurrence.dir) === -1 || clean(occurrence.direction) === "back" ? "back" : "fwd",
  });
}

export function classifyElsLineRelation(lineA, lineB) {
  if (!lineA || !lineB || lineA.axisWidth !== lineB.axisWidth) return null;
  if (!lineA.linear || !lineB.linear || !sameVector(lineA.primitiveVector, lineB.primitiveVector)) return null;
  if (lineA.lineInvariant == null || lineB.lineInvariant == null) return null;

  const period = lineA.invariantPeriod === lineB.invariantPeriod ? lineA.invariantPeriod : null;
  const latticeOffset = invariantDelta(lineA.lineInvariant, lineB.lineInvariant, period);
  const [vr, vc] = lineA.primitiveVector;
  const euclideanPerpendicularOffset = latticeOffset / Math.hypot(vr, vc);
  const support = pairedSupport(lineA, lineB, lineA.axisWidth);

  return Object.freeze({
    type: "EXACT_PARALLEL",
    a: lineA.occurrenceId,
    b: lineB.occurrenceId,
    primitiveVector: lineA.primitiveVector,
    latticeOffset,
    euclideanPerpendicularOffset,
    support,
    truthPromotion: false,
  });
}

function exactIntersections(lineA, lineB) {
  const b = new Set(lineB.positions);
  return lineA.positions.filter((position) => b.has(position));
}

export function extractElsVectorGeometry({ axisWidth, occurrences } = {}) {
  const width = toInt(axisWidth);
  if (width == null || width < 1) {
    return Object.freeze({
      contract: "els_vector_geometry_v1",
      status: "CONTEXT_REQUIRED",
      axisWidth: null,
      lines: Object.freeze([]),
      relations: Object.freeze([]),
      clusters: Object.freeze([]),
      intersections: Object.freeze([]),
      transversals: Object.freeze([]),
      projectionOnly: true,
    });
  }

  const lines = Object.freeze((Array.isArray(occurrences) ? occurrences : [])
    .map((occurrence) => deriveElsLineGeometry(occurrence, width))
    .filter(Boolean));

  const relations = [];
  const intersections = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const relation = classifyElsLineRelation(lines[i], lines[j]);
      if (relation) relations.push(relation);
      const shared = exactIntersections(lines[i], lines[j]);
      if (shared.length) {
        intersections.push(Object.freeze({
          type: "EXACT_INTERSECTION",
          a: lines[i].occurrenceId,
          b: lines[j].occurrenceId,
          positions: Object.freeze(shared),
          truthPromotion: false,
        }));
      }
    }
  }

  const byVector = new Map();
  for (const line of lines) {
    if (!line.primitiveVector) continue;
    const key = line.primitiveVector.join(",");
    if (!byVector.has(key)) byVector.set(key, []);
    byVector.get(key).push(line);
  }

  const clusters = Object.freeze([...byVector.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([key, members]) => Object.freeze({
      type: members.length >= 3 ? "PARALLEL_CLUSTER" : "PARALLEL_FAMILY",
      primitiveVector: Object.freeze(key.split(",").map(Number)),
      occurrenceIds: Object.freeze(members.map((line) => line.occurrenceId)),
      memberCount: members.length,
      truthPromotion: false,
    })));

  const transversals = [];
  for (const cluster of clusters) {
    const memberSet = new Set(cluster.occurrenceIds);
    for (const line of lines) {
      if (memberSet.has(line.occurrenceId)) continue;
      const crossed = intersections.filter((item) => (
        item.a === line.occurrenceId && memberSet.has(item.b)
      ) || (
        item.b === line.occurrenceId && memberSet.has(item.a)
      ));
      if (crossed.length) {
        transversals.push(Object.freeze({
          type: "TRANSVERSAL_CROSSING",
          occurrenceId: line.occurrenceId,
          parallelVector: cluster.primitiveVector,
          crossedMembers: Object.freeze([...new Set(crossed.map(
            (item) => item.a === line.occurrenceId ? item.b : item.a
          ))]),
          positions: Object.freeze([...new Set(crossed.flatMap((item) => item.positions))]),
          truthPromotion: false,
        }));
      }
    }
  }

  return Object.freeze({
    contract: "els_vector_geometry_v1",
    status: lines.length ? "READY" : "NO_GEOMETRY",
    axisWidth: width,
    lines,
    relations: Object.freeze(relations),
    clusters,
    intersections: Object.freeze(intersections),
    transversals: Object.freeze(transversals),
    projectionOnly: true,
    semantics: Object.freeze({
      rawSkipIsNotDirectionIdentity: true,
      structuralRelationIsNotTruthPromotion: true,
      rendererIndependent: true,
    }),
  });
}

export default extractElsVectorGeometry;
