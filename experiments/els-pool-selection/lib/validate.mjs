// EXP-12 pilot: validation of a model answer against the pool it was shown. NOTHING is fixed silently: every deviation is recorded as an error with a code, and an item that is wrong is
// reported as wrong, not repaired. The model refers to findings by id and to letters that were shown; this module checks exactly that, and builds the engine items for the phrases and
// continuations it proposed (the engine confirms them afterwards, like any other occurrence).
import { fold } from "./lexicon.mjs";
import { LIMITS } from "./packet.mjs";
import { geometryOf, relationOf } from "./relations.mjs";

const ID_TOKEN = /\b[FR]\d{3,4}\b/g;
export const ERROR_CODES = Object.freeze(["not_json", "bad_shape", "over_limit", "unknown_id", "duplicate_id", "id_in_two_groups", "group_too_small", "kind_size_mismatch", "relation_unknown", "relation_not_listed", "relation_outside_group", "digits_in_text", "text_too_long", "phrase_too_short", "phrase_not_contiguous", "continuation_letters_not_shown", "continuation_empty"]);

export function parseAnswer(text) {
  let value;
  try { value = JSON.parse(text); } catch (error) { return { ok: false, code: "not_json", error: `not JSON: ${error.message}` }; }
  const arrays = ["groups", "singles", "phrases", "continuations"];
  if (!value || typeof value !== "object" || arrays.some((key) => !Array.isArray(value[key])) || typeof value.chance_note !== "string") return { ok: false, code: "bad_shape", error: "the answer does not have the five fields of the schema" };
  return { ok: true, value };
}

const hasDigits = (text) => /[0-9]/.test(String(text ?? "").replace(ID_TOKEN, ""));

/** The span of a phrase on one line: index of each item's first and last letter along the line, measured from the first item's start. */
function phraseSpan(items) {
  const first = items[0];
  if (!items.every((item) => item.family === first.family && item.dir === first.dir && item.skip === first.skip)) return { ok: false, why: "not on one family and direction" };
  const step = first.dir * first.skip;
  const index = (item, k) => (item.start + step * k - first.start) / step;
  const spans = items.map((item) => ({ from: index(item, 0), to: index(item, item.text.length - 1) }));
  if (spans.some((s) => !Number.isInteger(s.from) || !Number.isInteger(s.to))) return { ok: false, why: "not on one arithmetic line" };
  for (let k = 1; k < spans.length; k += 1) if (!(spans[k].from > spans[k - 1].from && spans[k].to > spans[k - 1].to)) return { ok: false, why: "not in reading order" };
  for (let k = 1; k < spans.length; k += 1) if (spans[k].from - spans[k - 1].to - 1 > 6) return { ok: false, why: "more than 6 letters between two parts" };
  return { ok: true, start: first.start, skip: first.skip, dir: first.dir, length: spans.at(-1).to + 1 };
}

/**
 * pool: the pool file the packet was built from. listedRelationIds: the Set the packet listed. answer: the parsed answer. Returns
 * { errors: [{code, where, detail}], groups, singles, phrases, continuations, engineItems } where engineItems are the phrases and continuations that passed the local checks.
 */
export function validateAnswer({ pool, listedRelationIds, answer }) {
  const errors = [];
  const err = (code, where, detail = "") => errors.push({ code, where, detail });
  const items = new Map(pool.items.map((item) => [item.id, item]));
  const relations = new Map(pool.relations.map((r) => [r.id, r]));
  const text = (value, where) => {
    if (typeof value !== "string") return;
    if (hasDigits(value)) err("digits_in_text", where, value.slice(0, 80));
    if (value.length > LIMITS.why) err("text_too_long", where, `${value.length} > ${LIMITS.why}`);
  };
  for (const key of ["groups", "singles", "phrases", "continuations"]) if (answer[key].length > LIMITS[key]) err("over_limit", key, `${answer[key].length} > ${LIMITS[key]}`);
  text(answer.chance_note, "chance_note");

  const seenInGroup = new Map();
  const groups = answer.groups.map((g, k) => {
    const where = `groups[${k}]`;
    const ids = Array.isArray(g.ids) ? g.ids.map(String) : [];
    const known = ids.filter((id) => items.has(id));
    for (const id of ids) if (!items.has(id)) err("unknown_id", where, id);
    if (new Set(ids).size !== ids.length) err("duplicate_id", where, ids.join(","));
    for (const id of new Set(known)) { if (seenInGroup.has(id)) err("id_in_two_groups", where, `${id} also in groups[${seenInGroup.get(id)}]`); else seenInGroup.set(id, k); }
    if (new Set(known).size < 2) err("group_too_small", where, ids.join(","));
    if (g.kind === "pair" && ids.length !== 2) err("kind_size_mismatch", where, `pair with ${ids.length} ids`);
    if ((g.kind === "chain" || g.kind === "cluster") && ids.length < 3) err("kind_size_mismatch", where, `${g.kind} with ${ids.length} ids`);
    const claimed = (Array.isArray(g.relation_ids) ? g.relation_ids : []).map(String);
    const claimedOk = [];
    for (const rid of claimed) {
      const r = relations.get(rid);
      if (!r) { err("relation_unknown", where, rid); continue; }
      if (!listedRelationIds.has(rid)) { err("relation_not_listed", where, rid); continue; }
      if (!ids.includes(r.a) || !ids.includes(r.b)) { err("relation_outside_group", where, `${rid} joins ${r.a}-${r.b}`); continue; }
      claimedOk.push(rid);
    }
    text(g.why, `${where}.why`);
    return { ids, kind: g.kind, relation_ids: claimed, claimed_ok: claimedOk, why: g.why ?? "", order: k + 1 };
  });

  const singles = answer.singles.map((s, k) => {
    const where = `singles[${k}]`;
    if (!items.has(String(s.id))) err("unknown_id", where, String(s.id));
    text(s.why, `${where}.why`);
    return { id: String(s.id), why: s.why ?? "", order: k + 1 };
  });

  const engineItems = [];
  const phrases = answer.phrases.map((p, k) => {
    const where = `phrases[${k}]`;
    const ids = Array.isArray(p.ids) ? p.ids.map(String) : [];
    for (const id of ids) if (!items.has(id)) err("unknown_id", where, id);
    text(p.why, `${where}.why`);
    const out = { ids, why: p.why ?? "", order: k + 1, status: "invalid" };
    if (ids.length < 2) { err("phrase_too_short", where, ids.join(",")); return out; }
    if (!ids.every((id) => items.has(id))) return out;
    const span = phraseSpan(ids.map((id) => items.get(id)));
    if (!span.ok) { err("phrase_not_contiguous", where, `${ids.join(",")}: ${span.why}`); return out; }
    out.status = "local_ok";
    out.span = span;
    engineItems.push({ key: `phrase:${k}`, kind: "phrase", ref: k, start: span.start, skip: span.skip, dir: span.dir, length: span.length });
    return out;
  });

  const continuations = answer.continuations.map((c, k) => {
    const where = `continuations[${k}]`;
    const id = String(c.id);
    const item = items.get(id);
    text(c.why, `${where}.why`);
    const out = { id, before_letters: c.before_letters ?? "", after_letters: c.after_letters ?? "", why: c.why ?? "", order: k + 1, status: "invalid" };
    if (!item) { err("unknown_id", where, id); return out; }
    const before = fold(String(c.before_letters ?? "")), after = fold(String(c.after_letters ?? ""));
    if (!before && !after) { err("continuation_empty", where, id); return out; }
    if ((before && !item.before.endsWith(before)) || (after && !item.after.startsWith(after))) { err("continuation_letters_not_shown", where, `${id}: before "${before}" / after "${after}" are not the letters shown ("${item.before}" | "${item.after}")`); return out; }
    const step = item.dir * item.skip;
    out.status = "local_ok";
    out.extended = { start: item.start - step * [...before].length, skip: item.skip, dir: item.dir, length: [...before].length + [...item.text].length + [...after].length, before, after };
    engineItems.push({ key: `continuation:${k}`, kind: "continuation", ref: k, start: out.extended.start, skip: item.skip, dir: item.dir, length: out.extended.length, expected: `${before}${item.text}${after}` });
    return out;
  });
  return { errors, groups, singles, phrases, continuations, engineItems };
}

/** Reads the letters of every engine item from the stream (the phrase's term is whatever the stream holds along the claimed line; a continuation's term is the one the model's letters make). */
export function termsOf(engineItems, torah) {
  return engineItems.map((item) => {
    const letters = Array.from({ length: item.length }, (_, k) => torah[item.start + item.dir * item.skip * k] ?? "").join("");
    return { key: item.key, kind: item.kind, ref: item.ref, term: item.kind === "continuation" ? item.expected : letters, start: item.start, skip: item.skip, dir: item.dir, stream_letters: letters };
  });
}

/** Connectivity of a group under the pool's relations (every relation, or only the listed ones): the share of its members in the largest connected component and the relation types inside. */
export function groupStats(pool, listedRelationIds, group) {
  const ids = [...new Set(group.ids.filter((id) => pool.items.some((item) => item.id === id)))];
  const inside = pool.relations.filter((r) => ids.includes(r.a) && ids.includes(r.b));
  const component = (relations) => {
    const parent = new Map(ids.map((id) => [id, id]));
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const r of relations) parent.set(find(r.a), find(r.b));
    const sizes = new Map();
    for (const id of ids) sizes.set(find(id), (sizes.get(find(id)) ?? 0) + 1);
    return Math.max(0, ...sizes.values());
  };
  const items = ids.map((id) => pool.items.find((item) => item.id === id));
  return {
    size: ids.length,
    relations_any: inside.length,
    relations_listed: inside.filter((r) => listedRelationIds.has(r.id)).length,
    connected_share_any: ids.length ? Number((component(inside) / ids.length).toFixed(3)) : 0,
    connected_share_listed: ids.length ? Number((component(inside.filter((r) => listedRelationIds.has(r.id))) / ids.length).toFixed(3)) : 0,
    types: [...new Set(inside.map((r) => r.type))].sort(),
    members_with_E_ge_1: items.filter((item) => item.E !== null && item.E >= 1).length,
    members_with_E_lt_1: items.filter((item) => item.E !== null && item.E < 1).length,
    members_plain_text: items.filter((item) => item.E === null).length,
  };
}
export { geometryOf, relationOf };
