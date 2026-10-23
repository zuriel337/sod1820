const clean = (value) => value == null ? "" : String(value).trim();

const AHAVAT_TORAH_BOOK = Object.freeze({
  identity_key: "book:ahavat-torah",
  label: "אהבת תורה",
  metadata: Object.freeze({
    route: "/book/ahavat-torah",
    source_ref_prefixes: Object.freeze(["book:hebrewbooks:5635"]),
  }),
});

const PRESENTATION_BASE_HREF = "/beit-midrash?section=paths&path=sod1820&lesson=sod1820";

const freezeItems = (items) => Object.freeze(items.map((item) => Object.freeze({ ...item })));

function calculatorHref(expression) {
  return `/2029/gematria?q=${encodeURIComponent(clean(expression))}`;
}

function slideHref(slideId) {
  const id = encodeURIComponent(clean(slideId));
  return `${PRESENTATION_BASE_HREF}&slide=${id}#sod1820-slide-${id}`;
}

// Pure link projection matching bookSelectionAdapter's existing public dossier
// contract. Importing that adapter here would pull the live Book reader into every
// Beit Midrash route, so the lesson carries only the already-established identity,
// source locator and deterministic selection URL.
function ahavatTorahSelectionHref(sourceRef) {
  const ref = clean(sourceRef);
  const page = ref.match(/#p(\d+)/i)?.[1] || null;
  const selection = `book-selection:${AHAVAT_TORAH_BOOK.identity_key}:${ref}:v1`;
  const params = new URLSearchParams({ tab: "dossier", selection });
  if (page) params.set("page", page);
  return `${AHAVAT_TORAH_BOOK.metadata.route}?${params.toString()}#selection`;
}

function ahavatTorahSource(sourceRef, title, status = "exact") {
  return Object.freeze({
    id: sourceRef,
    label: title,
    sourceRef,
    sourceHref: ahavatTorahSelectionHref(sourceRef),
    kind: "book",
    status,
  });
}

const SOURCE_STATUS = Object.freeze({
  EXACT: "exact_source_locator",
  LOCATED_PARTIAL: "source_located_partial_extraction",
  ZURIEL_APPROVED: "zuriel_approved_pending_exact_locator",
});

const CALCULATION_STATUS = Object.freeze({
  REPRODUCIBLE: "reproducible_arithmetic",
  ENGINE_VERIFIED: "canonical_engine_verified",
  ENGINE_COMPONENTS_VERIFIED: "canonical_components_verified_and_arithmetic_reproducible",
  METHOD_MAPPING_OPEN: "historic_method_mapping_open",
  NOT_APPLICABLE: "not_applicable",
});

const VIDEO_SOURCE = Object.freeze({
  id: "youtube:DClJVGBMCs0",
  label: "סוד ה׳ — מספר הפלא 1820",
  sourceRef: "youtube:DClJVGBMCs0",
  sourceHref: "https://www.youtube.com/watch?v=DClJVGBMCs0",
  kind: "video",
  status: SOURCE_STATUS.ZURIEL_APPROVED,
});

const ORIGINAL_POST_SOURCE = Object.freeze({
  id: "post:1799",
  label: "הפוסט הראשי של סוד 1820",
  sourceRef: "posts:1799",
  sourceHref: "/post/סוד-1820",
  kind: "post",
  status: SOURCE_STATUS.ZURIEL_APPROVED,
});

const MEDIA_ASSETS = Object.freeze({
  poster: Object.freeze({
    id: "post:1799:poster",
    src: "https://sod1820.co.il/seals/1820-poster.jpg",
    alt: "כרזת סוד 1820 מן הפוסט הראשי",
    sourceRef: ORIGINAL_POST_SOURCE.sourceRef,
  }),
  torahNameCount: Object.freeze({
    id: "post:1799:torah-name-count",
    src: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2013/11/mspr-shmvt-hyhv.png",
    alt: "המחשת מניין שמות הוי״ה בתורה",
    sourceRef: ORIGINAL_POST_SOURCE.sourceRef,
  }),
  birkatKohanim: Object.freeze({
    id: "post:1799:birkat-kohanim",
    src: "https://sod1820.co.il/seals/1820-birkat-kohanim.jpg",
    alt: "חותם 1820 של ברכת כהנים",
    sourceRef: ORIGINAL_POST_SOURCE.sourceRef,
  }),
  fiveSeals: Object.freeze({
    id: "post:1799:five-seals",
    src: "https://sod1820.co.il/seals/1820-five-seals.jpg",
    alt: "חמש חותמות 1820 מן הגלריה המקורית",
    sourceRef: ORIGINAL_POST_SOURCE.sourceRef,
  }),
});

const BOOK_GRAND_TOTAL = ahavatTorahSource(
  "book:hebrewbooks:5635#p6:tetragrammaton_grand_total_restated",
  "אהבת תורה · עמ׳ PDF 6 · הסיכום לחמשת החומשים",
  SOURCE_STATUS.EXACT,
);

const BOOK_PER_PARASHA = ahavatTorahSource(
  "book:hebrewbooks:5635#p6:per_parasha_tetragrammaton_table",
  "אהבת תורה · עמ׳ PDF 6 · טבלת הפרשות",
  SOURCE_STATUS.EXACT,
);

const BOOK_CATALOG = ahavatTorahSource(
  "book:hebrewbooks:5635#p20:oryan_talitai_title_and_talmudic_source",
  "אהבת תורה · עמ׳ PDF 20 · שער קטלוג מבני 1820",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const BOOK_TRIBES = ahavatTorahSource(
  "book:hebrewbooks:5635#p23:sample_construction_tribal_names_gematria",
  "אהבת תורה · עמ׳ PDF 23 · מבנה שמות השבטים",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const BOOK_YAAKOV_RACHEL_LEAH = ahavatTorahSource(
  "book:hebrewbooks:5635#p9:yaakov_rachel_leah_word_count",
  "אהבת תורה · עמ׳ PDF 9 · יעקב, רחל ולאה",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const BOOK_HAAZINU = ahavatTorahSource(
  "book:hebrewbooks:5635#p16:haazinu_letter_count_1820",
  "אהבת תורה · עמ׳ PDF 16 · שירת האזינו",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const BOOK_DIVINE_SPEECH = ahavatTorahSource(
  "book:hebrewbooks:5635#p19:first_last_divine_speech_1820",
  "אהבת תורה · עמ׳ PDF 19 · הדיבור הראשון והאחרון",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const STRONG_1820_EXAMPLES = freezeItems([
  {
    id: "ein-sof",
    expression: "אין סוף אין קץ אין תכלית אין מספר",
    method: "רגיל",
    value: 1820,
    sourceRef: "gematria_words:ba9802c8-34c8-4ef1-8426-50ef39dc0abb",
    calculationStatus: CALCULATION_STATUS.ENGINE_VERIFIED,
    calculatorHref: calculatorHref("אין סוף אין קץ אין תכלית אין מספר"),
    credit: "יניב לוי",
  },
  {
    id: "takhlit-shaddai",
    expression: "אם עד תכלית שדי תמצא",
    method: "רגיל",
    value: 1820,
    sourceRef: "gematria_words:ed2c9cb7-5d02-4375-8f13-6f4624badba4",
    calculationStatus: CALCULATION_STATUS.ENGINE_VERIFIED,
    calculatorHref: calculatorHref("אם עד תכלית שדי תמצא"),
    credit: "יניב לוי",
  },
  {
    id: "independence-development",
    expression: "פיתוח עצמאות",
    method: "מילוי",
    value: 1820,
    sourceRef: "gematria_words:dff490db-a631-4cbd-9142-b04bba490317",
    calculationStatus: CALCULATION_STATUS.ENGINE_VERIFIED,
    calculatorHref: calculatorHref("פיתוח עצמאות"),
    credit: "יניב לוי",
  },
  {
    id: "et-kadmi",
    expression: "עת",
    method: "קדמי",
    value: 1820,
    sourceRef: "gematria_words:7b7dacf2-f4da-448e-815d-0ae4a2598c39",
    calculationStatus: CALCULATION_STATUS.ENGINE_VERIFIED,
    calculatorHref: calculatorHref("עת"),
    credit: null,
  },
  {
    id: "release-milui",
    expression: "שחרור",
    method: "מילוי",
    value: 1820,
    sourceRef: "gematria_words:0ba26e9e-692e-44dd-a999-e07ea51941ca",
    calculationStatus: CALCULATION_STATUS.ENGINE_VERIFIED,
    calculatorHref: calculatorHref("שחרור"),
    credit: null,
  },
]);

const BIBI_EXAMPLES = freezeItems([
  {
    id: "netanyahu-david-reversal",
    title: "שני מספרים בהיפוך",
    equations: Object.freeze([
      Object.freeze({ expression: "בנימין נתניהו", method: "רגיל", value: 683, sourceRef: "gematria_words:1ca56ab8-500e-490c-b80f-0ea01d320f9f", calculatorHref: calculatorHref("בנימין נתניהו") }),
      Object.freeze({ expression: "דוד בן ישי", method: "רגיל", value: 386, sourceRef: "gematria_words:cd4c0e20-bb4c-4549-b3d9-77b2335b9431", calculatorHref: calculatorHref("דוד בן ישי") }),
    ]),
    note: "זו דוגמת רמז מן האתר במספרים 683 ו־386, לא טענת 1820.",
  },
  {
    id: "netanyahu-631",
    title: "שני ביטויים, אותו ערך",
    equations: Object.freeze([
      Object.freeze({ expression: "נס נתניהו", method: "רגיל", value: 631, sourceRef: "gematria_words:9d721ce3-6b84-443c-879b-b6f8e7cb06fa", calculatorHref: calculatorHref("נס נתניהו") }),
      Object.freeze({ expression: "מלך ישראל", method: "רגיל", value: 631, sourceRef: "gematria_words:19dc0ba8-48bf-45b8-b1c8-e0df6339ea25", calculatorHref: calculatorHref("מלך ישראל") }),
    ]),
    note: "השוויון המספרי מאומת; המשמעות שמציעים לו נשארת פירוש.",
  },
]);

const BASE_SLIDES = Object.freeze([
  Object.freeze({
    id: "opening",
    chapter: "פתיחה",
    title: "1820 — מן הסרטון אל מסלול לימוד",
    statement: "המצגת משחזרת את הרעיונות המרכזיים מן הסרטון, אבל מלמדת בכל צעד מהו מקור, מהו חישוב ומהו פירוש.",
    media: MEDIA_ASSETS.poster,
    sources: Object.freeze([VIDEO_SOURCE, ORIGINAL_POST_SOURCE, BOOK_CATALOG]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: CALCULATION_STATUS.NOT_APPLICABLE, interpretation: "teaching_frame" }),
  }),
  Object.freeze({
    id: "five-books",
    chapter: "המקור",
    title: "המניין בחמשת חומשי תורה",
    statement: "ספר אהבת תורה מציג את מניין שם הוי״ה בכל חומש ואת הסכום הכולל.",
    figures: freezeItems([
      { label: "בראשית", value: 165 },
      { label: "שמות", value: 398 },
      { label: "ויקרא", value: 311 },
      { label: "במדבר", value: 396 },
      { label: "דברים", value: 550 },
    ]),
    equation: "165 + 398 + 311 + 396 + 550 = 1820",
    media: MEDIA_ASSETS.torahNameCount,
    sources: Object.freeze([BOOK_GRAND_TOTAL, BOOK_PER_PARASHA]),
    truth: Object.freeze({ source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" }),
  }),
  Object.freeze({
    id: "reading-boundary",
    chapter: "איך קוראים",
    title: "שלוש שכבות שלא מערבבים",
    statement: "הספר אומר מה הוא מנה; החשבון בודק את הסכום; הפירוש שואל מה אפשר ללמוד מן החזרה של 1820.",
    layers: freezeItems([
      { id: "source", title: "מקור", body: "מראה המקום המדויק בספר או בפוסט." },
      { id: "calculation", title: "חישוב", body: "פעולה שאפשר לחזור עליה באותה שיטה." },
      { id: "interpretation", title: "פירוש", body: "כיוון למחשבה שאינו משנה את המקור או את התוצאה." },
    ]),
    sources: Object.freeze([BOOK_GRAND_TOTAL]),
    truth: Object.freeze({ source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.NOT_APPLICABLE, interpretation: "explicitly_separate" }),
  }),
  Object.freeze({
    id: "number-structures",
    chapter: "המספר",
    title: "שתי דרכים חשבוניות להגיע ל־1820",
    statement: "כאן אין טענת מקור חדשה: אלה מבנים חשבוניים שאפשר לבדוק ישירות.",
    equations: freezeItems([
      { label: "סוד × יהוה", expression: "70 × 26", value: 1820 },
      { label: "מ־26 עד 65", expression: "26 + 27 + … + 65", value: 1820 },
      { label: "כח × אדני", expression: "28 × 65", value: 1820 },
    ]),
    sources: Object.freeze([VIDEO_SOURCE]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "invitation_to_discovery" }),
  }),
  Object.freeze({
    id: "kedusha",
    chapter: "צירוף",
    title: "קדושה ושמות — מבנה של 1820",
    statement: "שלוש פעמים קדוש, בצירוף יהוה, אדני וצבאות, מגיעים ל־1820 בגימטריה רגילה.",
    equation: "410 × 3 + 26 + 65 + 499 = 1820",
    parts: freezeItems([
      { expression: "קדוש", value: 410 },
      { expression: "יהוה", value: 26 },
      { expression: "אדני", value: 65 },
      { expression: "צבאות", value: 499 },
    ]),
    sources: Object.freeze([VIDEO_SOURCE]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: CALCULATION_STATUS.ENGINE_COMPONENTS_VERIFIED, interpretation: "separate" }),
  }),
  Object.freeze({
    id: "birkat-kohanim",
    chapter: "חותם מן הסרטון",
    title: "ברכת כהנים — המסגרת החיצונית",
    statement: "בסרטון ובגלריה מוצג מבנה שבו המילים החיצוניות של ברכת כהנים מצטרפות ל־1820. החותם מאושר להצגה על־ידי צוריאל; מראה המקום המדויק ושחזור הסכום עדיין בבנייה.",
    media: MEDIA_ASSETS.birkatKohanim,
    sources: Object.freeze([VIDEO_SOURCE, ORIGINAL_POST_SOURCE]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: "pending_exact_reconstruction", interpretation: "separate" }),
  }),
  Object.freeze({
    id: "book-catalog",
    chapter: "אהבת תורה",
    title: "לא ממצא יחיד — קטלוג של דרכים",
    statement: "בעמודים 20–24 נמצא קטלוג צפוף של עשרות מבנים המסתיימים ב־1820. רק דוגמאות שאותרו במדויק מוצגות כאן; הרשימה המלאה עדיין בבנייה.",
    examples: freezeItems([
      { title: "כלי המקדש ומידותיהם", source: ahavatTorahSource("book:hebrewbooks:5635#p20:sample_construction_kadshei_hamikdash", "אהבת תורה · כלי המקדש", SOURCE_STATUS.LOCATED_PARTIAL) },
      { title: "בגדי כהונה", source: ahavatTorahSource("book:hebrewbooks:5635#p20:sample_construction_bigdei_kehuna", "אהבת תורה · בגדי כהונה", SOURCE_STATUS.LOCATED_PARTIAL) },
      { title: "שמות השבטים", source: BOOK_TRIBES },
      { title: "יעקב, רחל ולאה", source: BOOK_YAAKOV_RACHEL_LEAH },
      { title: "שירת האזינו", source: BOOK_HAAZINU },
      { title: "הדיבור הראשון והאחרון", source: BOOK_DIVINE_SPEECH },
    ]),
    sources: Object.freeze([BOOK_CATALOG]),
    truth: Object.freeze({ source: SOURCE_STATUS.LOCATED_PARTIAL, calculation: "not_all_independently_recomputed", interpretation: "separate" }),
  }),
  Object.freeze({
    id: "historic-methods",
    chapter: "בודקים שיטה",
    title: "כשאותו שם שיטה נותן תוצאה אחרת",
    statement: "בסרטון מוצג מילוי היסטורי של „בראשית” כ־1820, ואילו הרישום הקנוני הנוכחי מחזיר תוצאה אחרת. לכן המצגת שומרת את הממצא ההיסטורי אך אינה מסמנת אותו כאימות מנוע עד שמיפוי צורת המילוי ייסגר.",
    comparison: Object.freeze({ expression: "בראשית", historicVideoValue: 1820, currentCanonicalMiluyValue: 1829 }),
    sources: Object.freeze([VIDEO_SOURCE]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: CALCULATION_STATUS.METHOD_MAPPING_OPEN, interpretation: "not_promoted" }),
  }),
  Object.freeze({
    id: "strong-1820",
    chapter: "אוצרות",
    title: "גימטריות 1820 חזקות מן האתר",
    statement: "כל ביטוי מוצג עם השיטה שלו וקישור למחשבון. התאמה מספרית היא נקודת מפגש, לא הוכחה לפירוש.",
    examples: STRONG_1820_EXAMPLES,
    media: MEDIA_ASSETS.fiveSeals,
    sources: Object.freeze([]),
    truth: Object.freeze({ source: "public_gematria_word_ids", calculation: CALCULATION_STATUS.ENGINE_VERIFIED, interpretation: "separate" }),
  }),
  Object.freeze({
    id: "bibi-examples",
    chapter: "דוגמה מן האתר",
    title: "רמזי ביבי — מחוץ לציר 1820",
    statement: "הדוגמאות האלה נכללות מפני שביקשת להראות גם גימטריות חזקות מן האתר. הן מסומנות במפורש כדוגמאות 683/386 ו־631, ולא כחלק מחישובי 1820.",
    examples: BIBI_EXAMPLES,
    sources: Object.freeze([Object.freeze({
      id: "post:142",
      label: "גלריית רמזי ביבי",
      sourceRef: "posts:142",
      sourceHref: "/post/%d7%a8%d7%9e%d7%96%d7%99-%d7%92%d7%90%d7%95%d7%9c%d7%94-%d7%97%d7%96%d7%a7%d7%99%d7%9d-%d7%a2%d7%9c-%d7%94%d7%9e%d7%a1%d7%a4%d7%a8-2024",
      kind: "post",
      status: SOURCE_STATUS.ZURIEL_APPROVED,
    })]),
    truth: Object.freeze({ source: SOURCE_STATUS.ZURIEL_APPROVED, calculation: CALCULATION_STATUS.ENGINE_VERIFIED, interpretation: "separate" }),
  }),
]);

function diamondSlide(curationCatalog) {
  const diamonds = (Array.isArray(curationCatalog?.diamonds) ? curationCatalog.diamonds : [])
    .filter((item) => clean(item?.id) && clean(item?.label))
    .map((item) => Object.freeze({
      id: item.id,
      label: item.label,
      description: item.description || item.reason || null,
      value: item.value ?? null,
      kind: item.kind,
      calculatorHref: calculatorHref(item.label),
    }));
  return Object.freeze({
    id: "diamonds",
    chapter: "סיום",
    title: "חתימות היהלום של 1820",
    statement: diamonds.length
      ? "אלה כל חתימות היהלום הפעילות שמגיעות מן הקטלוג הקנוני בזמן הצפייה. המצגת אינה מחזיקה רשימת יהלומים נפרדת."
      : "חתימות היהלום יופיעו כאן לאחר טעינת הקטלוג הקנוני.",
    diamonds: Object.freeze(diamonds),
    sources: Object.freeze([]),
    truth: Object.freeze({ source: "canonical_curation_catalog", calculation: "carried_from_canonical_identity", interpretation: "human_gate_curation" }),
  });
}

export const BEIT_MIDRASH_SOD1820_PRESENTATION_ID = "sod1820";

export const BEIT_MIDRASH_SOD1820_PRESENTATION = Object.freeze({
  id: BEIT_MIDRASH_SOD1820_PRESENTATION_ID,
  title: "מסע 1820",
  description: "מצגת לימודית מן המקור אל החישוב, מן החישוב אל הרמז, ומן הרמז אל חתימות היהלום.",
  href: slideHref("opening"),
  video: VIDEO_SOURCE,
  media: MEDIA_ASSETS,
  book: Object.freeze({
    identityKey: AHAVAT_TORAH_BOOK.identity_key,
    title: AHAVAT_TORAH_BOOK.label,
    href: AHAVAT_TORAH_BOOK.metadata.route,
    constructionStatus: "in_progress",
  }),
  approvalPolicy: Object.freeze({
    missingExactSource: SOURCE_STATUS.ZURIEL_APPROVED,
    label: "אושר על־ידי צוריאל · מראה מקום מדויק בבנייה",
    doesNotImplyEngineVerification: true,
    doesNotImplyExactSourceLocated: true,
  }),
  sources: Object.freeze({
    bookIdentity: AHAVAT_TORAH_BOOK.identity_key,
    bookWitness: "book:hebrewbooks:5635",
    diamondCatalog: "curationProjection2029",
    video: VIDEO_SOURCE.sourceRef,
  }),
});

export function buildBeitMidrashSod1820Presentation(curationCatalog = null, requestedSlideId = null) {
  const slides = Object.freeze([...BASE_SLIDES, diamondSlide(curationCatalog)].map((slide, index, all) => Object.freeze({
    ...slide,
    href: slideHref(slide.id),
    position: index + 1,
    total: all.length,
  })));
  const requested = clean(requestedSlideId);
  const selectedIndex = Math.max(0, slides.findIndex((slide) => slide.id === requested));
  return Object.freeze({
    ...BEIT_MIDRASH_SOD1820_PRESENTATION,
    slides,
    selectedSlide: slides[selectedIndex],
    selectedIndex,
    previousSlide: selectedIndex > 0 ? slides[selectedIndex - 1] : null,
    nextSlide: selectedIndex < slides.length - 1 ? slides[selectedIndex + 1] : null,
  });
}

export function isBeitMidrashSod1820Slide(slideId) {
  const id = clean(slideId);
  return [...BASE_SLIDES, { id: "diamonds" }].some((slide) => slide.id === id);
}

export const BEIT_MIDRASH_SOD1820_SOURCE_STATUS = SOURCE_STATUS;
export const BEIT_MIDRASH_SOD1820_CALCULATION_STATUS = CALCULATION_STATUS;
