// EXP-12 pilot: metrics of the saved runs (descriptive only; no test statistic is claimed). Pure functions over the files a run leaves behind; the known words enter ONLY through
// the evaluation data files (d1-forced-ids.json, saved-cipher-u1.json, locate-saved-result.json) that the CLI hands in, never through the library or the prompts.
import { collinearPairs, isEls, rankOfPair } from "./metrics.mjs";

const RELATION_WORDS = /אותו קו|אותה עמודה|באותה שורה|על קו|מקביל|חיתוך|חוצ|סמוכ|צמוד|המשך|ממשיכ|R\d{4}/;
const sum = (list) => list.reduce((a, b) => a + b, 0);
const mean = (list) => (list.length ? Number((sum(list) / list.length).toFixed(3)) : null);
const median = (list) => { if (!list.length) return null; const s = list.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

/** Pairs of members of a group that are "tight" (post-hoc, as in metrics.mjs): same line with gap <= 2, or parallel with offset <= 1 and overlap >= 3, both ELS and >= 4 letters. */
export function tightPairsIn(pool, ids) {
  const byId = new Map(pool.items.map((i) => [i.id, i]));
  const set = new Set(ids);
  return pool.relations.filter((r) => set.has(r.a) && set.has(r.b) && ((r.type === "same_line" && r.gap <= 2) || (r.type === "parallel" && r.offset <= 1 && r.overlap >= 3)) && [r.a, r.b].every((id) => isEls(byId.get(id)) && byId.get(id).text.length >= 4));
}
/** Registered PP: parallel, offset <= 3, overlap >= 3, both ELS and >= 4 letters. */
export function ppPairsIn(pool, ids) {
  const byId = new Map(pool.items.map((i) => [i.id, i]));
  const set = new Set(ids);
  return pool.relations.filter((r) => set.has(r.a) && set.has(r.b) && r.type === "parallel" && r.offset <= 3 && r.overlap >= 3 && [r.a, r.b].every((id) => isEls(byId.get(id)) && byId.get(id).text.length >= 4));
}

const LABELS = /\b(?:[FR]\d{3,4}|K[1-4]|D[12]|A[12]|C2)\b/g; // item ids, relation ids and the family labels shown in the packet
/** Free texts of an evaluated answer that still hold digits after ids and family labels are removed (counts such as "4 cells" or column numbers). */
export function digitsBeyondLabels(evaluation) {
  const texts = [...evaluation.groups.map((g) => g.why), ...evaluation.singles.map((s) => s.why), ...evaluation.phrases.map((p) => p.why), ...evaluation.continuations.map((c) => c.why), evaluation.answer?.chance_note ?? ""];
  return texts.filter((t) => /[0-9]/.test(String(t).replace(LABELS, ""))).length;
}

/** The numbers of one pool-arm run from its saved response and evaluation. */
export function runMetrics({ run, pool, response, evaluation }) {
  const usage = response?.summary?.usage ?? {};
  const row = { id: run.id, arm: run.arm, series: run.series, model: run.model, pool: pool?.id ?? null, stop_reason: response?.summary?.stop_reason ?? null, usd: response?.cost?.usd ?? null, input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, thinking_tokens: usage.output_tokens_details?.thinking_tokens ?? null, seconds: response?.ms ? Math.round(response.ms / 1000) : null, usable: Boolean(evaluation?.ok) };
  if (!evaluation?.ok) return { ...row, failure: evaluation?.error ?? "no usable answer" };
  const groups = evaluation.groups;
  const errors = {};
  for (const e of evaluation.errors) errors[e.code] = (errors[e.code] ?? 0) + 1;
  const ordered = groups.map((g) => ({ order: g.order, kind: g.kind, size: g.stats.size, ids: g.ids, connected_any: g.stats.connected_share_any, connected_listed: g.stats.connected_share_listed, claimed_ok: g.claimed_ok.length, types: g.stats.types, E_ge_1: g.stats.members_with_E_ge_1, E_lt_1: g.stats.members_with_E_lt_1, plain: g.stats.members_plain_text, pp_pairs: ppPairsIn(pool, g.ids).length, tight_pairs: tightPairsIn(pool, g.ids).length, names_relation: RELATION_WORDS.test(g.why), why: g.why }));
  const members = new Set(groups.flatMap((g) => g.ids));
  return {
    ...row, groups: groups.length, group_sizes: groups.map((g) => g.stats.size), members_in_groups: members.size, singles: evaluation.singles.length,
    connected_any_mean: mean(groups.map((g) => g.stats.connected_share_any)), connected_listed_mean: mean(groups.map((g) => g.stats.connected_share_listed)),
    groups_with_claimed_relation: groups.filter((g) => g.claimed_ok.length).length, groups_names_relation: ordered.filter((g) => g.names_relation).length,
    groups_with_pp_pair: ordered.filter((g) => g.pp_pairs > 0).length, groups_with_tight_pair: ordered.filter((g) => g.tight_pairs > 0).length,
    members_E_ge_1_share: members.size ? Number((sum(groups.map((g) => g.stats.members_with_E_ge_1)) / Math.max(1, sum(groups.map((g) => g.stats.size)))).toFixed(3)) : null,
    phrases: evaluation.phrases.length, phrases_confirmed: evaluation.phrases.filter((p) => p.status === "engine_confirmed").length,
    continuations: evaluation.continuations.length, continuations_confirmed: evaluation.continuations.filter((c) => c.status === "engine_confirmed").length,
    errors, errors_total: evaluation.errors.length, errors_other_than_digits: evaluation.errors.filter((e) => e.code !== "digits_in_text").length, texts_with_digits_beyond_labels: digitsBeyondLabels(evaluation), chance_note: evaluation.answer?.chance_note ?? "", ordered_groups: ordered,
  };
}

/** For a diagnostic run whose pool holds the forced items: does the model put the known words together? `forced` = d1-forced-ids.json. Words are matched by the data file's own texts. */
export function knownPairMetrics({ pool, evaluation, forced, pair }) {
  if (!evaluation?.ok) return null;
  const idsOf = (text) => forced.filter((f) => f.text === text).map((f) => f.id);
  const [a, b, c] = pair.map(idsOf);
  const has = (g, list) => g.ids.some((id) => list.includes(id));
  const hit = (g) => ({ order: g.order, kind: g.kind, ids: g.ids, relation_ids: g.relation_ids, why: g.why, names_relation: RELATION_WORDS.test(g.why) });
  const both = evaluation.groups.filter((g) => has(g, a) && has(g, b));
  const triple = c ? evaluation.groups.filter((g) => has(g, a) && has(g, b) && has(g, c)) : [];
  const withAny = evaluation.groups.filter((g) => g.ids.some((id) => forced.some((f) => f.id === id)));
  return {
    forced_items_in_pool: forced.length,
    groups_with_both_words: both.map(hit), groups_with_all_three: triple.map(hit),
    groups_with_any_added_item: withAny.map(hit),
    singles_with_added_item: evaluation.singles.filter((s) => forced.some((f) => f.id === s.id)).map((s) => ({ order: s.order, id: s.id, why: s.why })),
    phrases_with_both: evaluation.phrases.filter((p) => p.ids.some((id) => a.includes(id)) && p.ids.some((id) => b.includes(id))).map((p) => ({ order: p.order, ids: p.ids, status: p.status, why: p.why })),
    continuations_of_added_item: evaluation.continuations.filter((x) => forced.some((f) => f.id === x.id)).map((x) => ({ order: x.order, id: x.id, before: x.before_letters, after: x.after_letters, status: x.status })),
  };
}

/** Jaccard overlap between the item sets of repeated runs of one arm (stability). */
export function stability(rows) {
  const sets = rows.filter((r) => r.usable).map((r) => new Set(r.ordered_groups.flatMap((g) => g.ids)));
  const out = [];
  for (let i = 0; i < sets.length; i += 1) for (let j = i + 1; j < sets.length; j += 1) {
    const inter = [...sets[i]].filter((x) => sets[j].has(x)).length;
    const union = new Set([...sets[i], ...sets[j]]).size;
    out.push(union ? Number((inter / union).toFixed(3)) : null);
  }
  return out;
}

/** Deterministic ranks of the model's two-member groups under the registered pair score (descriptive). */
export function pairRanks(pool, row) {
  return row.ordered_groups.filter((g) => g.ids.length === 2).map((g) => ({ ids: g.ids, rank_all: rankOfPair(pool, g.ids[0], g.ids[1]), rank_els: rankOfPair(pool, g.ids[0], g.ids[1], { elsOnly: true }) }));
}
export { collinearPairs, mean, median };
