/**
 * Deterministic seeded null/control harness + Benjamini-Hochberg FDR utility.
 *
 * Methodology utilities only — NOT Truth promotion. The null model is always declared by the caller
 * (an injected deterministic evaluator + control manifest); no significance label is emitted unless
 * controls and FDR are both present. No ambient randomness anywhere.
 */

export const ELS_CONTROLS_CONTRACT = "els_seeded_controls_v1";

/** mulberry32: small deterministic 32-bit PRNG. */
export function createSeededPrng(seed) {
  let a = (Number(seed) >>> 0) || 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates permutation of an array (pure, returns a copy). */
export function seededShuffle(items, prng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(prng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param {object} a
 * @param {number} a.seed declared seed
 * @param {number} a.trials declared trial count
 * @param {object} a.nullModel declared null model { id, description } — required
 * @param {(ctx)=>number} a.statistic deterministic statistic on the observed input
 * @param {(ctx)=>number} a.controlStatistic deterministic statistic for a control draw; ctx = { trial, prng, seed }
 * @param {"greater"|"less"} [a.tail]
 */
export function runSeededControls({ seed, trials, nullModel, observed, statistic, controlStatistic, tail = "greater" } = {}) {
  const base = { contract: ELS_CONTROLS_CONTRACT, truthPromotion: false };
  const n = Number.isInteger(trials) ? trials : 0;
  if (!Number.isInteger(seed) || n < 1 || !nullModel?.id || typeof statistic !== "function" || typeof controlStatistic !== "function") {
    return Object.freeze({ ...base, status: "CONTEXT_REQUIRED", significanceLabel: null, pValue: null });
  }
  const observedStat = statistic({ observed });
  const prng = createSeededPrng(seed);
  const manifest = [];
  let extreme = 0;
  for (let trial = 0; trial < n; trial += 1) {
    const draw = controlStatistic({ trial, prng, seed, observed });
    manifest.push(draw);
    if (tail === "less" ? draw <= observedStat : draw >= observedStat) extreme += 1;
  }
  return Object.freeze({
    ...base,
    status: "EXECUTED",
    seed, trials: n, tail, nullModel: Object.freeze({ ...nullModel }),
    observed: observedStat,
    controlManifest: Object.freeze(manifest),
    extremeCount: extreme,
    pValue: (extreme + 1) / (n + 1), // add-one empirical p-value, never exactly 0
    significanceLabel: null, // labels only via applySignificanceLabels with FDR present
  });
}

/** Benjamini–Hochberg over a declared family. Returns q-values in input order (monotone, capped at 1). */
export function benjaminiHochberg(pValues, { alpha = 0.05, familyId = null } = {}) {
  const ps = Array.isArray(pValues) ? pValues : [];
  const valid = ps.length > 0 && ps.every((p) => Number.isFinite(p) && p >= 0 && p <= 1) && familyId;
  if (!valid) return Object.freeze({ status: "CONTEXT_REQUIRED", familyId, alpha, qValues: Object.freeze([]), rejected: Object.freeze([]) });
  const m = ps.length;
  const order = ps.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const q = new Array(m);
  let running = 1;
  for (let k = m - 1; k >= 0; k -= 1) {
    running = Math.min(running, (order[k][0] * m) / (k + 1));
    q[order[k][1]] = Math.min(1, running);
  }
  return Object.freeze({
    status: "EXECUTED", familyId, alpha, familySize: m,
    qValues: Object.freeze(q),
    rejected: Object.freeze(q.map((v) => v <= alpha)),
  });
}

/** Significance labels are withheld unless BOTH controls and FDR exist for the item. */
export function applySignificanceLabels({ controls, fdr, index = 0 } = {}) {
  if (controls?.status !== "EXECUTED" || fdr?.status !== "EXECUTED" || !Number.isInteger(index) || index >= fdr.qValues.length) {
    return Object.freeze({ significanceLabel: null, reason: "CONTROLS_OR_FDR_ABSENT", truthPromotion: false });
  }
  return Object.freeze({
    significanceLabel: fdr.rejected[index] ? "FDR_SURVIVES_DECLARED_NULL" : "NOT_SIGNIFICANT_UNDER_DECLARED_NULL",
    qValue: fdr.qValues[index], familyId: fdr.familyId, nullModelId: controls.nullModel.id, truthPromotion: false,
  });
}
