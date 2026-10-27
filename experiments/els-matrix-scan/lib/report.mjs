// Merges executed batches into one run report: time, counts, what was omitted because of scan limits, findings, and the optional
// control comparison. Pure functions over batch results; nothing is executed here.
import { compareToTiles, decodeVector, mergeTileVectors } from "./controls.mjs";
import { joinAdjacentFindings, normalizeFindings } from "./findings.mjs";

/** dictionaryTotals: [{len, words}] (any order). The scan order is longest word first, then alphabetical. */
export function lengthRangeOfOffsets(dictionaryTotals, offset, count) {
  const ordered = [...dictionaryTotals].sort((a, b) => b.len - a.len);
  let cursor = 0;
  const covered = [];
  for (const { len, words } of ordered) {
    const from = Math.max(offset, cursor);
    const to = Math.min(offset + count, cursor + words);
    if (to > from) covered.push({ len, words: to - from, of: words });
    cursor += words;
  }
  return covered;
}

/** With minLen >= 5 the len>=5 statistics are identical to the plain ones (derived, not transported). */
export function withDerivedStatistics(batch) {
  const { descriptor, result } = batch;
  if (!(descriptor?.minLen >= 5) || !result.tile_vectors) return batch;
  const vectors = { ...result.tile_vectors };
  const sums = { ...result.tile_sums };
  if (vectors.cd5 == null) { vectors.cd5 = vectors.cd; sums.cd5 = sums.cd; }
  if (vectors.row5 == null) { vectors.row5 = vectors.row; sums.row5 = sums.row; }
  return { ...batch, result: { ...result, tile_vectors: vectors, tile_sums: sums } };
}

export function verifyBatch(batch, size) {
  const errors = [];
  const sums = batch.result.tile_sums;
  const vectors = batch.result.tile_vectors;
  for (const name of Object.keys(sums || {})) {
    const total = decodeVector(vectors?.[name], size).reduce((a, b) => a + b, 0);
    if (total !== Number(sums[name])) errors.push(`tile vector ${name} sums to ${total}, engine reported ${sums[name]} (copy error?)`);
  }
  return errors;
}

/**
 * controls: false (default) = region findings only; true = also the SEPARATE comparison to other regions (needs batches that were run with
 * controls on). The comparison is never mixed into the findings: it is its own `control` section with its method text.
 */
export function buildRunReport({ example, state, batches: rawBatches, evaluationWords = [], membership = null, controls = false, statistics = ["cd", "cd5"] }) {
  const batches = rawBatches.map(withDerivedStatistics);
  const dictionaryTotals = state.dictionaryTotals;
  const dictionaryWords = dictionaryTotals.reduce((n, entry) => n + entry.words, 0);
  const integrity = controls ? batches.flatMap((batch, index) => verifyBatch(batch, state.tileGrid.count).map((message) => `batch ${index + 1}: ${message}`)) : [];

  const coverage = { cd: [], row: [] };
  for (const { descriptor, result } of batches) {
    const groups = descriptor.directions === "both" ? ["cd", "row"] : [descriptor.directions];
    for (const group of groups) coverage[group].push({ offset: descriptor.offset, words: result.words_in_batch });
  }
  const covered = (group) => coverage[group].reduce((n, c) => n + c.words, 0);
  const lengthsCovered = (group) => {
    const merged = new Map();
    for (const c of coverage[group]) for (const part of lengthRangeOfOffsets(dictionaryTotals, c.offset, c.words)) merged.set(part.len, (merged.get(part.len) || 0) + part.words);
    return [...merged.entries()].sort((a, b) => b[0] - a[0]).map(([len, words]) => ({ len, scanned: words, of: dictionaryTotals.find((e) => e.len === len)?.words ?? null }));
  };

  const targetRows = batches.flatMap(({ result }) => result.target);
  const matrixHits = Object.assign({}, ...batches.map(({ result }) => result.word_matrix_hits));
  const findings = normalizeFindings({ rows: targetRows, width: state.width, region: state.region, matrixHits });
  const phrases = joinAdjacentFindings(findings, { width: state.width });
  const returned = batches.reduce((n, { result }) => n + result.target.length, 0);
  const reportedTotal = batches.reduce((n, { result }) => n + Number(result.target_total), 0);

  let control = Object.freeze({ requested: false, note: "comparison to other regions not requested (separate option: controls)" });
  if (controls) {
    if (batches.some(({ result }) => !result.tile_vectors)) throw new RangeError("controls requested but a batch was run without controls (no tile_vectors)");
    const merged = mergeTileVectors(batches.map(({ result }) => result.tile_vectors), state.tileGrid.count);
    control = Object.freeze({ requested: true, ...compareToTiles({ merged, grid: state.tileGrid, statistics }) });
  }

  const statuses = {};
  for (const { result } of batches) for (const [status, n] of Object.entries(result.engine_statuses || {})) statuses[status] = (statuses[status] || 0) + Number(n);

  return {
    example,
    time: { dbMsTotal: batches.reduce((n, { result }) => n + Number(result.db_ms), 0), batches: batches.length, wallMsTotal: batches.reduce((n, b) => n + (b.wallMs || 0), 0) || null },
    scan: {
      dictionaryWords,
      wordsScanned: { columnsAndDiagonals: covered("cd"), rows: covered("row") },
      omitted: {
        columnsAndDiagonals: Math.max(0, dictionaryWords - covered("cd")),
        rows: Math.max(0, dictionaryWords - covered("row")),
        reason: "scan budget (each dictionary word costs one canonical engine call per direction group over the whole matrix)",
      },
      lengthsScanned: { columnsAndDiagonals: lengthsCovered("cd"), rows: lengthsCovered("row") },
      engineCalls: batches.reduce((n, { result }) => n + Number(result.calls), 0),
      engineStatuses: statuses,
      truncatedCalls: batches.flatMap(({ result }) => result.truncated_calls),
      targetOutputTruncated: reportedTotal > returned ? { reported: reportedTotal, returned } : false,
    },
    findings: {
      total: findings.length,
      elsInMatrix: findings.filter((f) => f.kind === "els_in_matrix").length,
      plainTextRows: findings.filter((f) => f.kind === "plain_text_row").length,
      byLength: Object.fromEntries([...new Set(findings.map((f) => f.length))].sort((a, b) => b - a).map((len) => [len, findings.filter((f) => f.length === len).length])),
      phrases: phrases.length,
    },
    control,
    evaluation: evaluationWords.length ? evaluateWords({ words: evaluationWords, findings, phrases, membership, scannedLengths: lengthsCovered("cd").filter((entry) => entry.scanned === entry.of).map((entry) => entry.len) }) : null,
    integrity,
    findingsList: findings,
    phrasesList: phrases,
  };
}

/**
 * Evaluation only (never part of the model packet): was each word found by the dictionary scan, and where.
 * scannedLengths: letter counts that were fully scanned (columns+diagonals); membership: words known to exist in the dictionary (optional).
 */
export function evaluateWords({ words, findings, phrases, grouping = null, scannedLengths = null, membership = null }) {
  const labelOf = (id) => grouping?.groups.find((group) => group.finding_ids.includes(id))?.label ?? null;
  return words.map((word) => {
    const found = findings.filter((finding) => finding.word === word);
    const phrase = phrases.find((entry) => entry.words.join("") === word);
    const length = [...word].length;
    const scanned = scannedLengths ? scannedLengths.includes(length) : null;
    const inDictionary = membership ? membership.includes(word) : null;
    let status = "FOUND_BY_DICTIONARY_SCAN";
    if (!(found.length || phrase)) {
      status = scanned === false ? "NOT_FULLY_SCANNED_LENGTH" : inDictionary === false ? "NOT_IN_DICTIONARY" : "NOT_FOUND_IN_SCANNED_DICTIONARY";
    }
    return {
      word, length, scannedLength: scanned, inDictionary,
      foundAsFinding: found.map((finding) => ({ id: finding.id, kind: finding.kind, direction: finding.direction, matrixHits: finding.matrixHits, group: labelOf(finding.id) })),
      foundAsJoinedPhrase: phrase ? { id: phrase.id, text: phrase.text, components: phrase.components } : null,
      status,
    };
  });
}
