import {
  BEIT_MIDRASH_WORLD_SECTION,
  buildBeitMidrashWorldSections,
} from "./beitMidrashWorldSections.js";

const clean = (value) => value == null ? "" : String(value).trim();
const DEFAULT_EXAMPLE_LIMIT = 2;
const MAX_EXAMPLE_LIMIT = 3;

export const BEIT_MIDRASH_LEARNING_PILLAR = Object.freeze({
  LEARN: "learn",
  DISCOVER: "discover",
  PARTICIPATE: "participate",
});

export const BEIT_MIDRASH_LEARNING_SECTION = Object.freeze({
  START: "start",
  METHODS: "methods",
  CIPHERS: "ciphers",
  SOURCES: "sources",
  PATHS: "paths",
  GUIDED: "guided",
  PRACTICE: "practice",
  PARTICIPATE: "participate",
});

export const BEIT_MIDRASH_GUIDED_KIND = Object.freeze({
  CROSSING: "crossing",
  CONVERGENCE: "convergence",
  MAP: "map",
});

const SECTION_VALUES = new Set(Object.values(BEIT_MIDRASH_LEARNING_SECTION));
const GUIDED_KIND_VALUES = new Set(Object.values(BEIT_MIDRASH_GUIDED_KIND));

const freezeItems = (items) => Object.freeze(items.map((item) => Object.freeze({ ...item })));

const BEGINNER_CONCEPTS = freezeItems([
  {
    id: "hint",
    title: "רמז",
    body: "פרט שמעורר שאלה או מצביע על חיבור אפשרי. רמז הוא התחלה להתבוננות, לא תשובה סופית.",
  },
  {
    id: "source",
    title: "מקור",
    body: "המקום המדויק שממנו הגיע הפסוק, הציטוט, המספר או הסיפור. תמיד חוזרים אליו לפני שמסיקים מסקנה.",
  },
  {
    id: "calculation",
    title: "חישוב",
    body: "פעולה שנעשית לפי שיטה מוגדרת ואפשר לחזור עליה. אותה שיטה ואותו ביטוי צריכים להוביל לאותה תוצאה.",
  },
  {
    id: "interpretation",
    title: "פירוש",
    body: "המשמעות שאנו מציעים למה שגילינו. מציגים אותה ככיוון למחשבה ומבדילים בינה לבין המקור והחישוב.",
  },
]);

const LEARNING_PATHS = freezeItems([
  { id: "first-steps", title: "צעדים ראשונים", description: "רמז, מקור, חישוב ופירוש — ואיך מבדילים ביניהם." },
  { id: "gematria", title: "דרכי החישוב", description: "לומדים כל שיטת גימטריה, רואים דוגמה ומנסים בעצמנו." },
  { id: "sources", title: "קריאת מקורות", description: "חוזרים אל ההקשר, אל הציטוט המדויק ואל מקורות נוספים." },
  { id: "meetings", title: "הצלבות והתכנסויות", description: "לומדים מהי נקודת מפגש וכיצד כמה חיבורים מצטרפים לתמונה אחת." },
  { id: "sod1820", title: "מסלול 1820", description: "מסלול מדורג להכרת המספר 1820, המקורות והשיטות שסביבו." },
]);

const SECTIONS = freezeItems([
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.START,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "איך מתחילים לגלות?",
    description: "ארבע אבני יסוד שעוזרות לקרוא כל גילוי בבהירות.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.METHODS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "דרכי החישוב",
    description: "הסבר, דוגמה ותרגול לכל שיטת גימטריה מן הרישום הקנוני.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.CIPHERS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "לקרוא בין האותיות",
    description: "צפנים ודילוגי אותיות, לצד הגבולות והזהירות הנדרשים בכל שיטה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.SOURCES,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "לחזור אל המקור",
    description: "כיצד בודקים ציטוט, הקשר ועצמאות בין מקורות בלי לאבד את הדרך חזרה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PATHS,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.LEARN,
    title: "מסלולי לימוד",
    description: "שיעורים קצרים ומסלולים מדורגים, ובהם מסלול 1820.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.GUIDED,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.DISCOVER,
    title: "לומדים דרך גילויים",
    description: "דוגמאות נבחרות מן העולם, מפורקות צעד אחר צעד ללמידה.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PRACTICE,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE,
    title: "מנסים בעצמכם",
    description: "תרגול ומשחק שמחזקים את ההבנה בלי להפוך ניקוד למדד של אמת.",
  },
  {
    id: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE,
    pillar: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE,
    title: "ממשיכים יחד",
    description: "משתפים רמז או מצטרפים לשיחה דרך הזרימות הקיימות של האתר.",
  },
]);

const DESTINATIONS = Object.freeze({
  calculator: Object.freeze({
    id: "calculator",
    title: "לתרגול במחשבון",
    description: "המחשבון הקנוני נפתח ככלי נפרד; בית המדרש אינו מחזיק עותק שלו.",
    href: "/2029/calculator",
    status: "ready",
  }),
  ciphers: Object.freeze({
    id: "ciphers",
    title: "לכלי הצפנים",
    description: "הכלי הקנוני נפתח בנפרד מן השיעור.",
    href: "/code",
    status: "ready",
  }),
  world: Object.freeze({
    id: "world",
    title: "למפת הידע בעולם",
    description: "שם נמצאות המפה המלאה, ההצלבות, ההתכנסויות והעמודים הקנוניים.",
    href: "/world#world-connections",
    status: "ready",
  }),
  heichal: Object.freeze({
    id: "heichal",
    title: "להעמקה בהיכל",
    description: "שם נפתחת החקירה העמוקה עם רזיאל והשפה המקצועית המלאה.",
    href: "/heichal",
    status: "ready",
  }),
  community: Object.freeze({
    id: "community",
    title: "לשיחת הקהילה",
    description: "השיחה ממשיכה במקום הקנוני של הקהילה.",
    href: "/community/chat",
    status: "ready",
  }),
  contribution: Object.freeze({
    id: "contribution",
    title: "לשתף רמז",
    description: "החיבור ייקבע בידי בעל זרימת התרומה; בית המדרש לא יוצר טופס או מאגר משלו.",
    href: null,
    status: "owner_handoff_required",
  }),
  game: Object.freeze({
    id: "game",
    title: "למשחק",
    description: "החיבור יתווסף כאשר בעל המשחק ימסור נתיב קנוני.",
    href: null,
    status: "owner_handoff_required",
  }),
});

export const BEIT_MIDRASH_LEARNING_MANIFEST = Object.freeze({
  identity: Object.freeze({
    eyebrow: "בית המדרש",
    title: "לומדים לגלות",
    description: "כאן לומדים את דרכי החישוב, הקריאה והפענוח — מבינים כיצד רמז נולד, חוזרים אל המקור ומנסים צעד אחר צעד.",
    canonicalRoute: "/beit-midrash",
  }),
  pillars: freezeItems([
    { id: BEIT_MIDRASH_LEARNING_PILLAR.LEARN, title: "לומדים" },
    { id: BEIT_MIDRASH_LEARNING_PILLAR.DISCOVER, title: "מגלים" },
    { id: BEIT_MIDRASH_LEARNING_PILLAR.PARTICIPATE, title: "משתתפים" },
  ]),
  sections: SECTIONS,
  beginnerConcepts: BEGINNER_CONCEPTS,
  learningPaths: LEARNING_PATHS,
  destinations: DESTINATIONS,
  methodLesson: Object.freeze({
    source: "canonical-method-registry",
    blocks: Object.freeze([
      "מה השיטה עושה",
      "איך החישוב בנוי",
      "דוגמה מודרכת",
      "מתי נזהרים",
      "נסו בעצמכם",
    ]),
  }),
  language: Object.freeze({
    crossing: Object.freeze({ title: "נקודת המפגש", eyebrow: "הצלבה" }),
    convergence: Object.freeze({ title: "כשהתמונה מתחברת", eyebrow: "התכנסות" }),
    missingValue: "אין נתון",
    unratedValue: "טרם דורג",
  }),
});

const LEGACY_TAB_MAP = Object.freeze({
  calc: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PRACTICE }),
  methods: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.METHODS }),
  crosses: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.CROSSING }),
  atlas: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.MAP }),
  convergence: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.GUIDED, guidedKind: BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE }),
  searches: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.START, adminOnly: true }),
  verified: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.SOURCES }),
  sod1820: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PATHS, pathId: "sod1820" }),
  submit: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE, destinationId: "contribution" }),
  community: Object.freeze({ section: BEIT_MIDRASH_LEARNING_SECTION.PARTICIPATE, destinationId: "community" }),
});

function searchParamsOf(search) {
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  const value = clean(search);
  return new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
}

function safeSection(value) {
  const section = clean(value).toLowerCase();
  return SECTION_VALUES.has(section) ? section : null;
}

function safeGuidedKind(value) {
  const kind = clean(value).toLowerCase();
  return GUIDED_KIND_VALUES.has(kind) ? kind : null;
}

function methodRoute(methodKey) {
  const method = clean(methodKey);
  return method ? `/beit-midrash/${encodeURIComponent(method)}` : "/beit-midrash";
}

export function beitMidrashLearningHref(section, {
  methodKey = null,
  guidedKind = null,
  findingId = null,
  pathId = null,
  destinationId = null,
} = {}) {
  const resolvedSection = safeSection(section) || BEIT_MIDRASH_LEARNING_SECTION.START;
  const params = new URLSearchParams();
  const methodOwnsSection = clean(methodKey) && resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.METHODS;
  if (resolvedSection !== BEIT_MIDRASH_LEARNING_SECTION.START && !methodOwnsSection) {
    params.set("section", resolvedSection);
  }
  const kind = safeGuidedKind(guidedKind);
  if (resolvedSection === BEIT_MIDRASH_LEARNING_SECTION.GUIDED && kind) params.set("kind", kind);
  if (clean(findingId)) params.set("finding", clean(findingId));
  if (clean(pathId)) params.set("path", clean(pathId));
  if (clean(destinationId)) params.set("to", clean(destinationId));
  const query = params.toString();
  const finding = clean(findingId);
  return `${methodRoute(methodKey)}${query ? `?${query}` : ""}${finding ? `#finding-${encodeURIComponent(finding)}` : ""}`;
}

/**
 * Resolve old and new Beit Midrash links without redirecting the independent
 * Beit Midrash identity to World. `searches` remains an admin-only compatibility
 * signal and never opens a public catalogue.
 */
export function resolveBeitMidrashLearningLocation({ methodKey = null, search = "" } = {}) {
  const params = searchParamsOf(search);
  const routeMethod = clean(methodKey);
  const legacyMethod = clean(params.get("m"));
  const requestedMethod = routeMethod || legacyMethod || null;
  const legacyTab = clean(params.get("tab")).toLowerCase();
  const legacyAtlas = clean(params.get("atlas"));
  const explicitSection = safeSection(params.get("section"));
  const explicitKind = safeGuidedKind(params.get("kind"));
  const legacy = LEGACY_TAB_MAP[legacyAtlas ? "atlas" : legacyTab] || null;

  let section = explicitSection || legacy?.section || BEIT_MIDRASH_LEARNING_SECTION.START;
  if (requestedMethod) section = BEIT_MIDRASH_LEARNING_SECTION.METHODS;
  const guidedKind = section === BEIT_MIDRASH_LEARNING_SECTION.GUIDED
    ? (explicitKind || legacy?.guidedKind || null)
    : null;
  const findingId = clean(params.get("finding")) || null;
  const pathId = clean(params.get("path")) || legacy?.pathId || null;
  const destinationId = clean(params.get("to")) || legacy?.destinationId || null;
  const toolCompatibility = clean(params.get("tool")).toLowerCase() === "midrash";

  return Object.freeze({
    section,
    guidedKind,
    methodKey: requestedMethod,
    findingId,
    pathId,
    destinationId,
    adminOnly: legacy?.adminOnly === true,
    compatibilitySource: legacyAtlas
      ? "legacy-atlas"
      : legacy ? `legacy-tab:${legacyTab}`
        : toolCompatibility ? "legacy-tool:midrash"
          : requestedMethod ? "method-deep-link"
            : explicitSection ? "learning-section"
              : "default",
    canonicalHref: beitMidrashLearningHref(section, {
      methodKey: requestedMethod,
      guidedKind,
      findingId,
      pathId,
      destinationId,
    }),
    shouldRedirect: false,
  });
}

function boundedLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_EXAMPLE_LIMIT;
  return Math.max(0, Math.min(MAX_EXAMPLE_LIMIT, Math.trunc(numeric)));
}

function requestedFirst(rows, findingId, limit) {
  if (!limit) return [];
  const id = clean(findingId);
  if (!id) return rows.slice(0, limit);
  const requested = rows.find((row) => clean(row?.sourceId) === id);
  if (!requested) return rows.slice(0, limit);
  return [requested, ...rows.filter((row) => row !== requested)].slice(0, limit);
}

const CROSSING_PROMPTS = Object.freeze([
  "מה נפגש כאן?",
  "איך נוצר החיבור?",
  "מאין הגיע כל חלק?",
  "איזה כיוון למחשבה נפתח?",
  "נסו בעצמכם",
]);

const CONVERGENCE_PROMPTS = Object.freeze([
  "מה נמצא במרכז?",
  "אילו חיבורים מצטרפים?",
  "מאילו מקורות הם מגיעים?",
  "מה אפשר לראות כשהם מופיעים יחד?",
]);

function freezeOccurrence(value) {
  return value && typeof value === "object" ? Object.freeze({ ...value }) : value;
}

function guidedExample(row, concept) {
  const copy = concept === BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE
    ? BEIT_MIDRASH_LEARNING_MANIFEST.language.convergence
    : BEIT_MIDRASH_LEARNING_MANIFEST.language.crossing;
  return Object.freeze({
    id: row.id,
    sourceId: row.sourceId,
    concept,
    title: copy.title,
    eyebrow: copy.eyebrow,
    statement: row.statement,
    secondary: row.secondary,
    values: Object.freeze([...(row.values || [])]),
    sourceLabel: row.sourceLabel,
    sourceRef: row.sourceRef,
    sourceRefs: Object.freeze([...(row.sourceRefs || [])]),
    sourceHref: row.sourceHref,
    contributor: row.contributor,
    createdAt: row.createdAt,
    occurrences: Object.freeze((row.occurrences || []).map(freezeOccurrence)),
    canonicalFindingHref: row.canonicalFindingHref,
    returnHref: beitMidrashLearningHref(BEIT_MIDRASH_LEARNING_SECTION.GUIDED, {
      guidedKind: concept,
      findingId: row.sourceId,
    }),
    prompts: concept === BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE
      ? CONVERGENCE_PROMPTS
      : CROSSING_PROMPTS,
  });
}

/**
 * A bounded public teaching lens over the already-loaded World projection.
 * It performs no fetch, ranking or deduplication. Ordering and occurrence
 * preservation remain owned by World; an explicitly requested public example
 * is only moved to the front so a deep link can resume exactly.
 */
export function buildBeitMidrashGuidedExamples(worldProjection, {
  limit = DEFAULT_EXAMPLE_LIMIT,
  findingId = null,
} = {}) {
  const take = boundedLimit(limit);
  const world = buildBeitMidrashWorldSections(worldProjection);
  const crossings = requestedFirst(
    world.sections[BEIT_MIDRASH_WORLD_SECTION.CROSSES],
    findingId,
    take,
  ).map((row) => guidedExample(row, BEIT_MIDRASH_GUIDED_KIND.CROSSING));
  const convergences = requestedFirst(
    world.sections[BEIT_MIDRASH_WORLD_SECTION.CONVERGENCE],
    findingId,
    take,
  ).map((row) => guidedExample(row, BEIT_MIDRASH_GUIDED_KIND.CONVERGENCE));

  return Object.freeze({
    source: world.source,
    crossings: Object.freeze(crossings),
    convergences: Object.freeze(convergences),
    mapCallout: DESTINATIONS.world,
    maxExamplesPerKind: MAX_EXAMPLE_LIMIT,
    nonDestructiveDedup: world.nonDestructiveDedup,
  });
}

export function buildBeitMidrashLearningProjection({
  worldProjection = { rows: [] },
  methodKey = null,
  search = "",
  exampleLimit = DEFAULT_EXAMPLE_LIMIT,
} = {}) {
  const location = resolveBeitMidrashLearningLocation({ methodKey, search });
  return Object.freeze({
    manifest: BEIT_MIDRASH_LEARNING_MANIFEST,
    location,
    guidedExamples: buildBeitMidrashGuidedExamples(worldProjection, {
      limit: exampleLimit,
      findingId: location.findingId,
    }),
    sources: Object.freeze({
      methods: "canonical-method-registry",
      guidedExamples: "worldAllResearchProjection",
    }),
  });
}

