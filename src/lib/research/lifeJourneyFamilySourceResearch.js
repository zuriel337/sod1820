import { getNameMultiWithoutEls, getNumberLookup } from "../supabase.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_FAMILY_SOURCE_VERSION = "life-journey-family-source-v1";
export const LIFE_JOURNEY_FAMILY_SOURCE_MAX_MEMBERS = 12;
export const LIFE_JOURNEY_FAMILY_SOURCE_MAX_VALUES = 8;
export const LIFE_JOURNEY_FAMILY_SOURCE_MAX_PHRASES_PER_VALUE = 6;
export const LIFE_JOURNEY_FAMILY_SOURCE_MAX_VERSES_PER_MEMBER = 2;

const clean = value => String(value || "").trim();
const integer = value => Number.isSafeInteger(Number(value)) ? Number(value) : null;
const list = value => Array.isArray(value) ? value : [];
const ELS_TRACK_IDS = new Set(["els", "els_search", "dilugim"]);
const ALLOWED_NAME_TRACKS = new Set([
  "name_verse", "literal", "words", "graded_prox", "chapter", "proximity", "in_verse",
  "anagrams", "combo_gem", "split_gem", "milui", "shared_num", "transforms", "initials",
  "roots", "variants",
]);

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function sourceTrack(track) {
  const id = clean(track?.id);
  const sourceFn = clean(track?.source_fn);
  if (!id || !ALLOWED_NAME_TRACKS.has(id) || ELS_TRACK_IDS.has(id) || /els/i.test(sourceFn)) return null;
  return Object.freeze({
    id,
    label: clean(track?.label) || id,
    evidence: clean(track?.evidence) || null,
    count: Math.max(0, integer(track?.count) ?? 0),
    sourceRef: sourceFn ? `rpc:${sourceFn}` : "rpc:fn_name_multi",
  });
}

function sourceVerse(verse, index) {
  const ref = clean(verse?.ref);
  const text = clean(verse?.text);
  if (!ref || !text) return null;
  return Object.freeze({
    id: `life-family-verse:${stableIdentityDigest(`${ref}:${index}`)}`,
    ref,
    text,
    sourceRef: "rpc:fn_name_verse",
    evidence: "direct",
  });
}

function sourceConsensus(row, index) {
  const target = clean(row?.target);
  const count = integer(row?.consensus);
  if (!target || count == null || count < 2) return null;
  return Object.freeze({
    id: `life-family-consensus:${stableIdentityDigest(`${target}:${index}`)}`,
    type: clean(row?.type) || "ממצא",
    target,
    independentFamilyCount: count,
    families: Object.freeze(list(row?.families).map(clean).filter(Boolean).slice(0, 6)),
    sourceRef: "rpc:fn_name_multi#consensus",
  });
}

/** Reference-safe projection of the existing non-ELS name-research response for one selected member. */
export function projectLifeJourneyMemberSources(memberRef, document) {
  const ref = clean(memberRef);
  if (!ref || !document || typeof document !== "object") return null;
  const verses = Object.freeze(list(document?.name_verse?.verses)
    .slice(0, LIFE_JOURNEY_FAMILY_SOURCE_MAX_VERSES_PER_MEMBER)
    .map(sourceVerse).filter(Boolean));
  const tracks = Object.freeze(list(document?.tracks).map(sourceTrack).filter(Boolean));
  const consensus = Object.freeze(list(document?.consensus).slice(0, 6).map(sourceConsensus).filter(Boolean));
  return Object.freeze({
    memberRef: ref,
    verses,
    tracks,
    consensus,
    tracksWithResults: tracks.filter(track => track.count > 0).length,
    sourceRef: "rpc:fn_name_multi?skip_els=1",
  });
}

function phraseGroup(value, rows) {
  const grouped = new Map();
  for (const row of list(rows)) {
    const phrase = clean(row?.phrase);
    const method = clean(row?.method);
    const rowValue = integer(row?.value ?? value);
    if (!phrase || !method || rowValue !== value) continue;
    const key = phrase.normalize("NFKC");
    const current = grouped.get(key) || {
      phrase,
      methods: new Set(),
      sourceRefs: new Set(),
      governed: false,
    };
    current.methods.add(method);
    if (clean(row?.bid_id)) current.sourceRefs.add(`bidim:${clean(row.bid_id)}`);
    current.governed ||= row?.method_governed !== false;
    grouped.set(key, current);
  }
  const ordered = [...grouped.values()]
    .sort((a, b) => Number(b.governed) - Number(a.governed)
      || a.phrase.length - b.phrase.length
      || a.phrase.localeCompare(b.phrase, "he"));
  const phrases = ordered.slice(0, LIFE_JOURNEY_FAMILY_SOURCE_MAX_PHRASES_PER_VALUE)
    .map((row, index) => Object.freeze({
      id: `life-family-equal-phrase:${stableIdentityDigest(`${value}:${row.phrase}:${index}`)}`,
      phrase: row.phrase,
      methods: Object.freeze([...row.methods].sort((a, b) => a.localeCompare(b, "he"))),
      sourceRefs: Object.freeze([...row.sourceRefs]),
      governed: row.governed,
      evidence: "value_match",
    }));
  return { phrases, truncated: ordered.length > phrases.length };
}

/** Projects canonical fn_number_lookup rows; equality is labelled as a value-match, never meaning. */
export function projectLifeJourneyNumberSources(valueInput, rows) {
  const value = integer(valueInput);
  if (value == null) return null;
  const projected = phraseGroup(value, rows);
  const phrases = Object.freeze(projected.phrases);
  return Object.freeze({
    value,
    phrases,
    sourceRef: "rpc:fn_number_lookup",
    truncated: projected.truncated,
  });
}

function requestedValues(research) {
  const out = [];
  const seen = new Set();
  const add = value => {
    const number = integer(value);
    if (number == null || seen.has(number) || out.length >= LIFE_JOURNEY_FAMILY_SOURCE_MAX_VALUES) return;
    seen.add(number);
    out.push(number);
  };
  list(research?.sharedValues).forEach(item => add(item?.value));
  list(research?.rows).forEach(row => row?.state === "ready" && add(row?.data?.fullValue));
  return out;
}

export function createLifeJourneyFamilySourceReaders({
  readName = getNameMultiWithoutEls,
  readNumber = getNumberLookup,
} = {}) {
  if (typeof readName !== "function" || typeof readNumber !== "function") {
    throw new TypeError("lifeJourneyFamilySourceResearch: existing name and number readers are required");
  }
  return Object.freeze({ readName, readNumber });
}

/**
 * Explicit, bounded source pass over the selected family only. It reuses existing readers and
 * returns a projection; it does not calculate gematria, persist rows, create stores or invoke ELS.
 */
export async function runLifeJourneyFamilySourceResearch({ members = [], research, readers = null } = {}) {
  if (!research || research.state !== "ready") {
    throw new TypeError("lifeJourneyFamilySourceResearch: completed family research is required");
  }
  const activeReaders = readers?.readName && readers?.readNumber
    ? readers
    : createLifeJourneyFamilySourceReaders();
  const selectedMembers = list(members).slice(0, LIFE_JOURNEY_FAMILY_SOURCE_MAX_MEMBERS)
    .map(member => ({
      memberRef: clean(member?.memberRef || member?.source_ref),
      fullName: clean(member?.fullName || member?.name),
    }))
    .filter(member => member.memberRef && member.fullName);
  const values = requestedValues(research);

  const [memberResults, numberResults] = await Promise.all([
    mapWithConcurrency(selectedMembers, 3, async member => {
      try {
        return projectLifeJourneyMemberSources(member.memberRef, await activeReaders.readName(member.fullName));
      } catch { return null; }
    }),
    mapWithConcurrency(values, 3, async value => {
      try {
        return projectLifeJourneyNumberSources(value, await activeReaders.readNumber(value));
      } catch { return null; }
    }),
  ]);
  const memberSources = Object.freeze(memberResults.filter(Boolean));
  const numberSources = Object.freeze(numberResults.filter(Boolean));
  return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_SOURCE_VERSION,
    memberSources,
    numberSources,
    coverage: Object.freeze({
      requestedMemberCount: selectedMembers.length,
      returnedMemberCount: memberSources.length,
      requestedValueCount: values.length,
      returnedValueCount: numberSources.length,
      verseCount: memberSources.reduce((sum, row) => sum + row.verses.length, 0),
      equalPhraseCount: numberSources.reduce((sum, row) => sum + row.phrases.length, 0),
      truncated: list(members).length > selectedMembers.length || numberSources.some(row => row.truncated),
    }),
    boundaries: Object.freeze({
      explicit_selected_members_only: true,
      no_els: true,
      no_public_feed_sources: true,
      no_new_store: true,
      equality_is_not_meaning: true,
    }),
  });
}

export default runLifeJourneyFamilySourceResearch;
