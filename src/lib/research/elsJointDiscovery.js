// One list for the matrix discovery and the Fable reading (ZURIEL 18.11.2026: "discovery, then Fable", a joint list).
// Presentation over results that already exist, never a search, verifier or findings store of its own:
//   - discovery rows are the engine's lexicon/language results (candidates until the engine verifies them on adding);
//   - Fable rows are the reading's findings that the canonical engine already verified (elsMatrixReadingProjection);
//   - one row per exact occurrence, keyed by the engine's occurrence_id (corpus, letters, skip, direction, start): what both
//     found shows once, with both sources, and the same coordinates in two corpora are two rows.
// E is the same chance model as the server's (supabase/functions/_shared/elsChanceModel.js), Torah only.
import { expectedChance } from "../../../supabase/functions/_shared/elsChanceModel.js";
import { elsOccurrenceId, parseElsOccurrenceId } from "./elsOccurrenceIdentity.js";

const FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const canonical = text => String(text || "").replace(/[ךםןףץ]/g, c => FINALS[c]);
const integer = Number.isSafeInteger;
export const ELS_MATRIX_WORD_LIMIT = 24;

/** The row key: the engine's occurrence_id. null without a corpus (such a row has no exact identity and is not listed). */
export const elsJointKey = (corpusId, term, skip, dir, start) => elsOccurrenceId({ corpusId, term, skip, dir, start });

/** Cells (Chebyshev, in the matrix of width S) between an occurrence and the axis: 0 shares a cell, 1 touches. */
export function elsAxisDistance(positions, axisPositions, width) {
  if (!Array.isArray(positions) || !positions.length || !Array.isArray(axisPositions) || !axisPositions.length || !integer(width) || width < 1) return null;
  let best = Infinity;
  for (const p of positions) for (const a of axisPositions) {
    const d = Math.max(Math.abs(Math.floor(p / width) - Math.floor(a / width)), Math.abs((p % width) - (a % width)));
    if (d < best) best = d;
  }
  return best;
}

function baseRow(key, term, label, skip, dir, start, positions) {
  return { key, occurrenceId: key, corpusId: parseElsOccurrenceId(key).corpusId, term: canonical(term), label: label || canonical(term),
    skip, dir, start, hitId: `${skip}_${dir}_${start}`, positions, engine: null, fable: null };
}

/**
 * runs: discovery responses [{ data }] (the lexicon lens: data.ok, data.items, data.origin.corpusId); projection: the reading
 * projection ({ findings }, each keyed by its engine occurrence_id); axis: { term, skip, dir, start }; width: the matrix width
 * (the axis skip); scope: "torah" | "tanakh"; corpusId: the corpus of the open matrix (the engine state's verification.corpus_id),
 * used for a run or finding that does not name its own.
 */
export function joinElsDiscovery({ runs = [], projection = null, axis = null, width = null, scope = "torah", corpusId = null } = {}) {
  const axisPositions = axis && integer(axis.start) && integer(axis.skip) && [1, -1].includes(axis.dir)
    ? Array.from(canonical(axis.term), (_, i) => axis.start + axis.dir * axis.skip * i) : [];
  const axisSet = new Set(axisPositions);
  const rows = new Map();
  for (const run of runs) {
    if (!run?.data?.ok || !Array.isArray(run.data.items)) continue;
    for (const item of run.data.items) {
      if (!item || !integer(item.start) || !integer(item.skip) || item.skip < 1 || ![1, -1].includes(item.dir) || !/^[א-ת]{2,}$/u.test(canonical(item.term))) continue;
      const positions = Array.isArray(item.positions) && item.positions.length ? item.positions : Array.from(canonical(item.term), (_, i) => item.start + item.dir * item.skip * i);
      if (positions.every(p => axisSet.has(p))) continue; // a piece of the axis is not a new finding
      const key = elsJointKey(run.data.origin?.corpusId ?? corpusId, item.term, item.skip, item.dir, item.start);
      if (!key) continue;
      const row = rows.get(key) || baseRow(key, item.term, item.label, item.skip, item.dir, item.start, positions);
      if (!row.engine) row.engine = { item, data: run.data };
      rows.set(key, row);
    }
  }
  for (const finding of projection?.findings || []) {
    const hit = finding?.item?.occurrence;
    if (!hit || finding.axisPart || !integer(hit.start) || !integer(hit.skip) || ![1, -1].includes(hit.dir)) continue;
    // The reading's key is the engine's occurrence_id (elsMatrixReadingProjection requires it); derived only when absent.
    const own = parseElsOccurrenceId(finding.key);
    const key = own ? finding.key : elsJointKey(corpusId, finding.item.text, hit.skip, hit.dir, hit.start);
    if (!key || (own && (own.term !== canonical(finding.item.text) || own.hitId !== `${hit.skip}_${hit.dir}_${hit.start}`))) continue;
    const row = rows.get(key) || baseRow(key, finding.item.text, finding.label, hit.skip, hit.dir, hit.start, finding.positions);
    row.fable = finding;
    if (finding.label && finding.label !== row.term) row.label = finding.label;
    rows.set(key, row);
  }
  return [...rows.values()].map(row => {
    const fromFable = row.fable?.item?.chance?.expected_occurrences;
    const E = Number.isFinite(fromFable) ? fromFable : scope === "torah" && row.skip >= 2 ? expectedChance(row.term, row.skip) : null;
    return { ...row, kind: row.skip >= 2 ? "els" : "source", source: row.engine && row.fable ? "both" : row.fable ? "fable" : "engine",
      verified: !!row.fable, E: Number.isFinite(E) ? E : null, distance: elsAxisDistance(row.positions, axisPositions, width ?? axis?.skip) };
  });
}

/** kind: "els" (skip 2 and up), "rare" (ELS with E<1), "source", or "all". */
export function filterElsJointRows(rows, { kind = "els", source = "all" } = {}) {
  return rows.filter(row => (kind === "all" || (kind === "source" ? row.kind === "source" : row.kind === "els" && (kind !== "rare" || (row.E !== null && row.E < 1))))
    && (source === "all" || (source === "engine" ? !!row.engine : source === "fable" ? !!row.fable : row.source === "both")));
}

/** sort: "axis" (closest first), "rare" (smallest E first), "length" (longest first). A display order, not a strength score. */
export function sortElsJointRows(rows, sort = "axis") {
  const far = value => value ?? Infinity;
  const by = {
    axis: (a, b) => far(a.distance) - far(b.distance) || b.term.length - a.term.length,
    rare: (a, b) => far(a.E) - far(b.E) || far(a.distance) - far(b.distance),
    length: (a, b) => b.term.length - a.term.length || far(a.distance) - far(b.distance),
  }[sort] || ((a, b) => far(a.distance) - far(b.distance));
  return [...rows].sort((a, b) => by(a, b) || a.key.localeCompare(b.key));
}

export function countElsJointRows(rows) {
  return { all: rows.length, engine: rows.filter(r => r.engine).length, fable: rows.filter(r => r.fable).length, both: rows.filter(r => r.source === "both").length };
}

/**
 * A Fable-verified occurrence joins the words on the matrix through the engine's own findings update, exactly like a discovery addition
 * (prepareElsLexiconAdditions): the word with the occurrence to show (addShown). The engine verifies it again before it is marked.
 */
export function prepareElsReadingAddition(state, finding, color) {
  const hit = finding?.item?.occurrence;
  if (!hit || !state?.axis || state.verification?.state !== "MATCH") return { error: "stale" };
  if (finding.visibility !== "full") return { error: "outside" };
  const term = canonical(finding.item.text), hitId = `${hit.skip}_${hit.dir}_${hit.start}`;
  if (!/^[א-ת]{2,}$/u.test(term) || !/^\d+_-?1_\d+$/.test(hitId)) return { error: "stale" };
  const findings = (state.findings || []).map(f => ({ t: f.t, color: f.color }));
  let word = findings.find(w => w.t === term);
  if (!word) {
    if (findings.length >= ELS_MATRIX_WORD_LIMIT) return { error: "limit" };
    word = { t: term, color: typeof color === "function" ? color(findings) : color };
    findings.push(word);
  }
  word.addShown = [...new Set([...(word.addShown || []), hitId])];
  return { findings };
}
