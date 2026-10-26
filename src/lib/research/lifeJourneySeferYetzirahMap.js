export const LIFE_JOURNEY_SEFER_YETZIRAH_MAP_VERSION = "life-journey-sefer-yetzirah-map-v1";

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const FINAL_TO_STANDARD = Object.freeze({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" });

export const SEFER_YETZIRAH_LETTER_GROUPS = Object.freeze([
  Object.freeze({
    id: "mothers",
    label: "3 אמות",
    letters: Object.freeze(["א", "מ", "ש"]),
    sourceRef: "book:sefer-yetzirah-9perushim#p173:gra_commentary:gra:mishnah11",
  }),
  Object.freeze({
    id: "doubles",
    label: "7 כפולות",
    letters: Object.freeze(["ב", "ג", "ד", "כ", "פ", "ר", "ת"]),
    sourceRef: "book:sefer-yetzirah-9perushim#p182:gra_commentary:gra:perek4_title_m1",
  }),
  Object.freeze({
    id: "simples",
    label: "12 פשוטות",
    letters: Object.freeze(["ה", "ו", "ז", "ח", "ט", "י", "ל", "נ", "ס", "ע", "צ", "ק"]),
    sourceRef: "book:sefer-yetzirah-9perushim#p186:gra_commentary:gra:perek5_title_m1",
  }),
]);

export const SEFER_YETZIRAH_COSMIC_FRAMES = Object.freeze([
  Object.freeze({
    id: "seven",
    label: "7 כוכבים · 7 ימים · 7 שערים",
    value: 7,
    items: Object.freeze(["שמש", "נוגה", "כוכב", "לבנה", "שבתאי", "צדק", "מאדים"]),
    sourceRef: "book:sefer-yetzirah-9perushim#p183:gra_commentary:gra:mishnah5_planets",
  }),
  Object.freeze({
    id: "twelve",
    label: "12 מזלות · 12 חודשים · 12 גבולי אלכסון",
    value: 12,
    items: Object.freeze([]),
    sourceRef: "book:sefer-yetzirah-9perushim#p187:gra_commentary:gra:twelve_correspondences",
  }),
  Object.freeze({
    id: "triad",
    label: "עולם · שנה · נפש",
    value: 3,
    items: Object.freeze(["עולם", "שנה", "נפש"]),
    sourceRef: "book:sefer-yetzirah-9perushim#p190:gra_commentary:gra:perek6_title_m1",
  }),
]);

const letterGroupByLetter = new Map(SEFER_YETZIRAH_LETTER_GROUPS.flatMap(group => (
  group.letters.map(letter => [letter, group.id])
)));

function nameLetters(value) {
  return [...clean(value).normalize("NFKC")]
    .map(letter => FINAL_TO_STANDARD[letter] || letter)
    .filter(letter => /[א-ת]/u.test(letter));
}

function personLetterMap(member) {
  const letters = nameLetters(member?.name);
  const counts = Object.fromEntries(SEFER_YETZIRAH_LETTER_GROUPS.map(group => [group.id, 0]));
  const sequence = letters.map((letter, index) => {
    const group = letterGroupByLetter.get(letter) || "unclassified";
    if (counts[group] != null) counts[group] += 1;
    return Object.freeze({ id: `${index}:${letter}`, letter, group });
  });
  return Object.freeze({
    memberRef: clean(member?.source_ref),
    name: clean(member?.name) || "אדם ללא שם",
    sequence: Object.freeze(sequence),
    counts: Object.freeze(counts),
  });
}

/**
 * A source-anchored, read-only projection over the existing private Person context.
 * It classifies letters and displays saved birth anchors; it does not calculate a
 * horoscope, geocode a place, infer a birth time, or mint a Finding.
 */
export function buildLifeJourneySeferYetzirahMap({
  members = [],
  relations = [],
  selectedRefs = [],
  birthTimeline = [],
} = {}) {
  const selected = new Set(list(selectedRefs).map(clean).filter(Boolean));
  const selectedMembers = list(members).filter(member => selected.has(clean(member?.source_ref)));
  const people = selectedMembers.map(personLetterMap);
  const birthsByRef = new Map(list(birthTimeline).map(event => [clean(event?.memberRef), event]));
  const birthAnchors = people.map(person => {
    const event = birthsByRef.get(person.memberRef) || null;
    return Object.freeze({
      memberRef: person.memberRef,
      name: person.name,
      dateIso: clean(event?.dateIso),
      hebrewDate: clean(event?.hebrewDate),
      birthTime: clean(event?.birthTime),
      birthPlace: clean(event?.birthPlace),
      state: event?.dateIso ? "calendar_ready" : "missing_date",
    });
  });

  const letterPeople = new Map();
  for (const person of people) {
    for (const letter of new Set(person.sequence.map(item => item.letter))) {
      const refs = letterPeople.get(letter) || new Set();
      refs.add(person.memberRef);
      letterPeople.set(letter, refs);
    }
  }
  const sharedLetters = [...letterPeople.entries()]
    .filter(([, refs]) => refs.size >= 2)
    .map(([letter, refs]) => Object.freeze({
      letter,
      group: letterGroupByLetter.get(letter) || "unclassified",
      personCount: refs.size,
      memberRefs: Object.freeze([...refs]),
    }))
    .sort((left, right) => right.personCount - left.personCount || left.letter.localeCompare(right.letter, "he"));

  const selectedRelations = list(relations).filter(relation => (
    selected.has(clean(relation?.parent_ref)) && selected.has(clean(relation?.child_ref))
  ));

  return Object.freeze({
    version: LIFE_JOURNEY_SEFER_YETZIRAH_MAP_VERSION,
    letterGroups: SEFER_YETZIRAH_LETTER_GROUPS,
    cosmicFrames: SEFER_YETZIRAH_COSMIC_FRAMES,
    people: Object.freeze(people),
    sharedLetters: Object.freeze(sharedLetters),
    birthAnchors: Object.freeze(birthAnchors),
    triad: Object.freeze({
      olam: Object.freeze({ people: people.length, relations: selectedRelations.length }),
      shana: Object.freeze({ datedPeople: birthAnchors.filter(item => item.state === "calendar_ready").length }),
      nefesh: Object.freeze({ namedPeople: people.filter(item => item.sequence.length).length }),
    }),
    sources: Object.freeze([
      ...SEFER_YETZIRAH_LETTER_GROUPS.map(group => group.sourceRef),
      ...SEFER_YETZIRAH_COSMIC_FRAMES.map(frame => frame.sourceRef),
    ]),
    boundaries: Object.freeze({
      read_only_projection: true,
      source_anchored: true,
      no_personal_astrology: true,
      no_birth_time_inference: true,
      no_geocoding: true,
      no_new_engine: true,
      no_new_store: true,
    }),
  });
}

export default buildLifeJourneySeferYetzirahMap;
