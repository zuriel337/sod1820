const clean = (value) => value == null ? "" : String(value).trim();

const PRESENTATION_BASE_HREF = "/beit-midrash?section=paths&path=sod1820&lesson=sod1820";
const freezeItems = (items) => Object.freeze(items.map((item) => Object.freeze({ ...item })));

function calculatorHref(expression) {
  return `/2029/gematria?q=${encodeURIComponent(clean(expression))}`;
}

function slideHref(slideId) {
  const id = encodeURIComponent(clean(slideId));
  return `${PRESENTATION_BASE_HREF}&slide=${id}#sod1820-slide-${id}`;
}

const SOURCE_STATUS = Object.freeze({
  EXACT: "exact_source_locator",
  LOCATED_PARTIAL: "source_located_partial_extraction",
});

const CALCULATION_STATUS = Object.freeze({
  REPRODUCIBLE: "reproducible_arithmetic",
  ENGINE_VERIFIED: "canonical_engine_verified",
  NOT_APPLICABLE: "not_applicable",
});

const EMPTY_TRUTH = Object.freeze({ source: null, calculation: null, interpretation: null });

const VIDEO_SOURCE = Object.freeze({
  id: "youtube:DClJVGBMCs0",
  label: "סוד ה׳ — מספר הפלא 1820",
  sourceRef: "youtube:DClJVGBMCs0",
  sourceHref: "https://www.youtube.com/watch?v=DClJVGBMCs0",
  kind: "video",
  status: SOURCE_STATUS.EXACT,
});

const ORIGINAL_POST_SOURCE = Object.freeze({
  id: "post:1799",
  label: "הפוסט הראשי של סוד 1820",
  sourceRef: "posts:1799",
  sourceHref: "/post/סוד-1820",
  kind: "post",
  status: SOURCE_STATUS.EXACT,
});

const ORIGINAL_DECK_SOURCE = Object.freeze({
  id: "slideserve:5004169",
  label: "חותם הקודש — המצגת המקורית",
  sourceRef: "slideserve:5004169",
  sourceHref: "https://www.slideserve.com/malana/5004169",
  kind: "presentation",
  status: SOURCE_STATUS.EXACT,
});

const AHAVAT_TORAH_BOOK = Object.freeze({
  identity_key: "book:ahavat-torah",
  label: "אהבת תורה",
  metadata: Object.freeze({
    route: "/book/ahavat-torah",
    source_ref_prefixes: Object.freeze(["book:hebrewbooks:5635"]),
  }),
});

function ahavatTorahSelectionHref(sourceRef) {
  const ref = clean(sourceRef);
  const page = ref.match(/#p(\d+)/i)?.[1] || null;
  const selection = `book-selection:${AHAVAT_TORAH_BOOK.identity_key}:${ref}:v1`;
  const params = new URLSearchParams({ tab: "dossier", selection });
  if (page) params.set("page", page);
  return `${AHAVAT_TORAH_BOOK.metadata.route}?${params.toString()}#selection`;
}

function ahavatTorahSource(sourceRef, title, status = SOURCE_STATUS.EXACT) {
  return Object.freeze({
    id: sourceRef,
    label: title,
    sourceRef,
    sourceHref: ahavatTorahSelectionHref(sourceRef),
    kind: "book",
    status,
  });
}

const BOOK_GRAND_TOTAL = ahavatTorahSource(
  "book:hebrewbooks:5635#p6:tetragrammaton_grand_total_restated",
  "אהבת תורה · עמ׳ PDF 6 · הסיכום לחמשת החומשים",
);
const BOOK_PER_PARASHA = ahavatTorahSource(
  "book:hebrewbooks:5635#p6:per_parasha_tetragrammaton_table",
  "אהבת תורה · עמ׳ PDF 6 · טבלת הפרשות",
);
const BOOK_YAAKOV_RACHEL_LEAH = ahavatTorahSource(
  "book:hebrewbooks:5635#p9:yaakov_rachel_leah_word_count",
  "אהבת תורה · עמ׳ PDF 9 · יעקב, רחל ולאה",
  SOURCE_STATUS.LOCATED_PARTIAL,
);

const ORIGINAL_SOURCES = Object.freeze([VIDEO_SOURCE, ORIGINAL_POST_SOURCE, ORIGINAL_DECK_SOURCE]);

function originalSlide(slide) {
  return Object.freeze({
    ...slide,
    sources: Object.freeze(slide.sources || ORIGINAL_SOURCES),
    truth: Object.freeze(slide.truth || EMPTY_TRUTH),
  });
}

// This sequence follows the surviving 2014 deck "חותם הקודש", used by the
// 6:32 video in post 1799. Its final contact slide is intentionally omitted
// because it contains stale personal contact data.
const ORIGINAL_DECK_SLIDES = Object.freeze([
  originalSlide({
    id: "opening", originalDeckPosition: 1, chapter: "פתיחה", title: "חותם הקודש",
    statement: "הסוד שנתגלה לאחר 3,300 שנה — 1820.",
  }),
  originalSlide({
    id: "great-wonder", originalDeckPosition: 2, chapter: "הפלא", title: "המניין שנשמר בתורה",
    statement: "המצגת פותחת בפלא שבמניין שם הוי״ה בתורה ובמקומה העתידי של חכמת הגימטריה.",
  }),
  originalSlide({
    id: "name-times-seventy", originalDeckPosition: 3, chapter: "החותם", title: "26 כפול 70",
    statement: "שם הוי״ה עולה 26; שבעים הפנים והשמות יוצרים יחד את חותם 1820.",
    equation: "26 × 70 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "five-books", originalDeckPosition: 4, chapter: "חמשת החומשים", title: "מניין שם הוי״ה בתורה",
    statement: "המניין בכל אחד מחמשת חומשי התורה מצטרף ל־1820.",
    figures: freezeItems([
      { label: "בראשית", value: 165 }, { label: "שמות", value: 398 }, { label: "ויקרא", value: 311 },
      { label: "במדבר", value: 396 }, { label: "דברים", value: 550 },
    ]),
    equation: "165 + 398 + 311 + 396 + 550 = 1820",
    sources: [ORIGINAL_DECK_SOURCE, BOOK_GRAND_TOTAL, BOOK_PER_PARASHA],
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "bereshit-milui", originalDeckPosition: 5, chapter: "בראשית", title: "בראשית במילוי א״י",
    statement: "בי״ת, רי״ש, אל״ף, שי״ן, יו״ד ותא״ו — ששת מילויי האותיות של בראשית במצגת המקורית.",
    parts: freezeItems([
      { expression: "בי״ת", value: 412 }, { expression: "רי״ש", value: 510 },
      { expression: "אל״ף", value: 111 }, { expression: "שי״ן", value: 360 },
      { expression: "יו״ד", value: 20 }, { expression: "תא״ו", value: 407 },
    ]),
    equation: "412 + 510 + 111 + 360 + 20 + 407 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "bereshit-chain", originalDeckPosition: 6, chapter: "בראשית", title: "שש האותיות פותחות שש מילים",
    statement: "במצגת נבחרות המילים הבאות בתורה לפי אותיות בראשית: ברא, רקיע, אלהים, שמים, יום, תדשא.",
    parts: freezeItems([
      { expression: "ברא", value: 203 }, { expression: "רקיע", value: 380 },
      { expression: "אלהים", value: 86 }, { expression: "שמים", value: 390 },
      { expression: "יום", value: 56 }, { expression: "תדשא", value: 705 },
    ]),
  }),
  originalSlide({
    id: "bereshit-chain-total", originalDeckPosition: 7, chapter: "בראשית", title: "סכום שש המילים",
    statement: "שש המילים שנבחרו במצגת מצטרפות ל־1820.",
    equation: "203 + 380 + 86 + 390 + 56 + 705 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "secret-and-strength", originalDeckPosition: 8, chapter: "שני צירופים", title: "סוד ושם · כח ושם",
    statement: "שתי דרכים חשבוניות המופיעות במצגת מגיעות לאותו חותם.",
    equations: freezeItems([
      { label: "סוד × יהוה", expression: "70 × 26", value: 1820 },
      { label: "כח × אדני", expression: "28 × 65", value: 1820 },
    ]),
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "twenty-six-to-sixty-five", originalDeckPosition: 9, chapter: "רצף המספרים", title: "מ־26 עד 65",
    statement: "סכום כל המספרים השלמים מ־26 ועד 65 הוא 1820.", equation: "26 + 27 + … + 65 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "twenty-six-milui", originalDeckPosition: 10, chapter: "עשרים ושש", title: "המילים „עשרים ושש” במילוי",
    statement: "מילויי אותיות הביטוי „עשרים ושש” מצטרפים במצגת ל־1820.",
    parts: freezeItems([
      { expression: "עי״ן", value: 130 }, { expression: "שי״ן (1)", value: 360 },
      { expression: "רי״ש", value: 510 }, { expression: "יו״ד", value: 20 },
      { expression: "מ״ם", value: 80 }, { expression: "שי״ן (2)", value: 360 },
      { expression: "שי״ן (3)", value: 360 },
    ]),
    equation: "130 + 360 + 510 + 20 + 80 + 360 + 360 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
]);

const REMAINING_ORIGINAL_DECK_SLIDES = Object.freeze([
  originalSlide({
    id: "first-name-distance", originalDeckPosition: 11, chapter: "מן הפתיחה", title: "מן הפסוק הראשון אל שם הוי״ה הראשון",
    statement: "לפי מניין המצגת, 1820 אותיות מפרידות בין פסוק הפתיחה לבין הופעת שם הוי״ה הראשונה בתורה, בבראשית ב׳, ד׳.",
  }),
  originalSlide({
    id: "verse-1820", originalDeckPosition: 12, chapter: "הפסוק", title: "הפסוק ה־1820 בתורה",
    statement: "לפי חלוקת הפסוקים המוצגת, „החדש הזה לכם ראש חדשים” הוא הפסוק ה־1820 בתורה.",
  }),
  originalSlide({
    id: "jacob-rachel-leah", originalDeckPosition: 13, chapter: "האבות והאמהות", title: "דברי יעקב, רחל ולאה",
    statement: "מניין המילים שאמרו יעקב, רחל ולאה בתורה מצטרף ל־1820.",
    figures: freezeItems([
      { label: "יעקב", value: 1597 }, { label: "רחל", value: 107 }, { label: "לאה", value: 116 },
    ]),
    equation: "1597 + 107 + 116 = 1820",
    sources: [ORIGINAL_DECK_SOURCE, BOOK_YAAKOV_RACHEL_LEAH],
    truth: { source: SOURCE_STATUS.LOCATED_PARTIAL, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "brothers-words", originalDeckPosition: 14, chapter: "שנים־עשר האחים", title: "דברי האחים בספר בראשית",
    statement: "חמש קבוצות מניין של דברי שנים־עשר האחים בספר בראשית מצטרפות ל־1820.",
    equation: "53 + 313 + 794 + 513 + 147 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "two-censuses", originalDeckPosition: 15, chapter: "שני המפקדים", title: "ההפרש בין שני מפקדי ישראל",
    statement: "ההפרש בין 603,550 במפקד הראשון לבין 601,730 במפקד השני הוא 1820.",
    equation: "603,550 − 601,730 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "tribes-question", originalDeckPosition: 16, chapter: "שבטי ישראל", title: "היכן מסתתר ההפרש?",
    statement: "המצגת עוברת מן ההפרש שבין המפקדים לחיפוש 1820 בתוך שמות השבטים.",
  }),
  originalSlide({
    id: "six-tribes", originalDeckPosition: 17, chapter: "שבטי ישראל", title: "שישה שמות שבטים",
    statement: "ראובן, גד, אפרים, בנימין, אשר ונפתלי מצטרפים בגימטריה ל־1820.",
    parts: freezeItems([
      { expression: "ראובן", value: 259 }, { expression: "גד", value: 7 },
      { expression: "אפרים", value: 331 }, { expression: "בנימין", value: 152 },
      { expression: "אשר", value: 501 }, { expression: "נפתלי", value: 570 },
    ]),
    equation: "259 + 7 + 331 + 152 + 501 + 570 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "leaders", originalDeckPosition: 18, chapter: "מנהיגי ישראל", title: "ממשה ועד משיח",
    statement: "משה, יהושע, שאול, דוד, שלמה ומשיח מצטרפים בגימטריה ל־1820.",
    parts: freezeItems([
      { expression: "משה", value: 345 }, { expression: "יהושע", value: 391 },
      { expression: "שאול", value: 337 }, { expression: "דוד", value: 14 },
      { expression: "שלמה", value: 375 }, { expression: "משיח", value: 358 },
    ]),
    equation: "345 + 391 + 337 + 14 + 375 + 358 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
  originalSlide({
    id: "thirteen-attributes", originalDeckPosition: 19, chapter: "י״ג מידות", title: "משולש י״ג המידות",
    statement: "המצגת מסדרת את שלוש־עשרה מידות הרחמים במשולש שסכומו 1820.",
  }),
  originalSlide({
    id: "torah-roots", originalDeckPosition: 20, chapter: "שורשי התורה", title: "1820 שורשים",
    statement: "המצגת מציגה מסורת שלפיה כשמונים אלף מילות התורה נבנות מ־1820 שורשים שונים.",
  }),
  originalSlide({
    id: "ana-bekoach", originalDeckPosition: 21, chapter: "אנא בכח", title: "שישה כינויים בתפילה",
    statement: "שישה כינויים המופיעים ב„אנא בכח” מצטרפים במצגת ל־1820, ללא המילה „נורא”.",
    equation: "211 + 128 + 410 + 32 + 9 + 1030 = 1820",
    truth: { source: SOURCE_STATUS.EXACT, calculation: CALCULATION_STATUS.REPRODUCIBLE, interpretation: "separate" },
  }),
]);

const ORIGINAL_CONTENT_SLIDES = Object.freeze([...ORIGINAL_DECK_SLIDES, ...REMAINING_ORIGINAL_DECK_SLIDES]);

const STRONG_1820_EXAMPLES = freezeItems([
  { id: "ein-sof", expression: "אין סוף אין קץ אין תכלית אין מספר", method: "רגיל", value: 1820, sourceRef: "gematria_words:ba9802c8-34c8-4ef1-8426-50ef39dc0abb", calculatorHref: calculatorHref("אין סוף אין קץ אין תכלית אין מספר"), credit: "יניב לוי" },
  { id: "takhlit-shaddai", expression: "אם עד תכלית שדי תמצא", method: "רגיל", value: 1820, sourceRef: "gematria_words:ed2c9cb7-5d02-4375-8f13-6f4624badba4", calculatorHref: calculatorHref("אם עד תכלית שדי תמצא"), credit: "יניב לוי" },
  { id: "independence-development", expression: "פיתוח עצמאות", method: "מילוי", value: 1820, sourceRef: "gematria_words:dff490db-a631-4cbd-9142-b04bba490317", calculatorHref: calculatorHref("פיתוח עצמאות"), credit: "יניב לוי" },
  { id: "et-kadmi", expression: "עת", method: "קדמי", value: 1820, sourceRef: "gematria_words:7b7dacf2-f4da-448e-815d-0ae4a2598c39", calculatorHref: calculatorHref("עת"), credit: null },
  { id: "release-milui", expression: "שחרור", method: "מילוי", value: 1820, sourceRef: "gematria_words:0ba26e9e-692e-44dd-a999-e07ea51941ca", calculatorHref: calculatorHref("שחרור"), credit: null },
]);

const BIBI_EXAMPLES = freezeItems([
  {
    id: "netanyahu-david-reversal", title: "שני מספרים בהיפוך",
    equations: Object.freeze([
      Object.freeze({ expression: "בנימין נתניהו", method: "רגיל", value: 683, sourceRef: "gematria_words:1ca56ab8-500e-490c-b80f-0ea01d320f9f", calculatorHref: calculatorHref("בנימין נתניהו") }),
      Object.freeze({ expression: "דוד בן ישי", method: "רגיל", value: 386, sourceRef: "gematria_words:cd4c0e20-bb4c-4549-b3d9-77b2335b9431", calculatorHref: calculatorHref("דוד בן ישי") }),
    ]),
    note: "דוגמת רמז מן האתר במספרים 683 ו־386; היא אינה חלק מחישובי 1820.",
  },
  {
    id: "netanyahu-631", title: "שני ביטויים, אותו ערך",
    equations: Object.freeze([
      Object.freeze({ expression: "נס נתניהו", method: "רגיל", value: 631, sourceRef: "gematria_words:9d721ce3-6b84-443c-879b-b6f8e7cb06fa", calculatorHref: calculatorHref("נס נתניהו") }),
      Object.freeze({ expression: "מלך ישראל", method: "רגיל", value: 631, sourceRef: "gematria_words:19dc0ba8-48bf-45b8-b1c8-e0df6339ea25", calculatorHref: calculatorHref("מלך ישראל") }),
    ]),
    note: "ההתאמה המספרית נבדקת בנפרד מן המשמעות שמציעים לה.",
  },
]);

const SITE_APPENDIX_SLIDES = Object.freeze([
  Object.freeze({
    id: "strong-1820", chapter: "נספח מן האתר", title: "עוד גימטריות 1820",
    statement: "מכאן מתחיל נספח נפרד מן המצגת המקורית: התאמות 1820 שנבחרו מן האתר ונפתחות לבדיקה במחשבון.",
    examples: STRONG_1820_EXAMPLES, sources: Object.freeze([]),
    truth: Object.freeze({ source: "public_gematria_word_ids", calculation: CALCULATION_STATUS.ENGINE_VERIFIED, interpretation: "separate" }),
  }),
  Object.freeze({
    id: "bibi-examples", chapter: "נספח מן האתר", title: "רמזים נוספים מן האתר",
    statement: "הדוגמאות מוצגות כנספח נפרד ואינן חלק מן הסרטון או מחישובי 1820.",
    examples: BIBI_EXAMPLES, sources: Object.freeze([]), truth: EMPTY_TRUTH,
  }),
]);

function diamondSlide(curationCatalog) {
  const diamonds = (Array.isArray(curationCatalog?.diamonds) ? curationCatalog.diamonds : [])
    .filter((item) => clean(item?.id) && clean(item?.label))
    .map((item) => Object.freeze({
      id: item.id, label: item.label, description: item.description || item.reason || null,
      value: item.value ?? null, kind: item.kind, calculatorHref: calculatorHref(item.label),
    }));
  return Object.freeze({
    id: "diamonds", chapter: "נספח מן האתר", title: "חתימות היהלום",
    statement: diamonds.length
      ? "חתימות היהלום מגיעות מן הקטלוג הקנוני של האתר בזמן הצפייה; הן אינן חלק מן המצגת המקורית."
      : "חתימות היהלום יופיעו כאן לאחר טעינת הקטלוג הקנוני.",
    diamonds: Object.freeze(diamonds), sources: Object.freeze([]), truth: EMPTY_TRUTH,
  });
}

export const BEIT_MIDRASH_SOD1820_PRESENTATION_ID = "sod1820";

export const BEIT_MIDRASH_SOD1820_PRESENTATION = Object.freeze({
  id: BEIT_MIDRASH_SOD1820_PRESENTATION_ID,
  title: "חותם הקודש · סוד 1820",
  description: "המצגת המקורית לפי סדר הסרטון, ואחריה נספח נפרד של גילויים מן האתר.",
  href: slideHref("opening"), video: VIDEO_SOURCE,
  originalDeck: Object.freeze({
    title: "חותם הקודש", source: ORIGINAL_DECK_SOURCE,
    originalContentSlideCount: ORIGINAL_CONTENT_SLIDES.length, omittedStaleContactSlide: 22,
  }),
  media: Object.freeze({}),
  book: Object.freeze({
    identityKey: AHAVAT_TORAH_BOOK.identity_key, title: AHAVAT_TORAH_BOOK.label,
    href: AHAVAT_TORAH_BOOK.metadata.route, constructionStatus: "in_progress",
  }),
  approvalPolicy: Object.freeze({ label: "" }),
  sources: Object.freeze({
    bookIdentity: AHAVAT_TORAH_BOOK.identity_key, bookWitness: "book:hebrewbooks:5635",
    diamondCatalog: "curationProjection2029", video: VIDEO_SOURCE.sourceRef,
    originalDeck: ORIGINAL_DECK_SOURCE.sourceRef,
  }),
});

export function buildBeitMidrashSod1820Presentation(curationCatalog = null, requestedSlideId = null) {
  const slides = Object.freeze([...ORIGINAL_CONTENT_SLIDES, ...SITE_APPENDIX_SLIDES, diamondSlide(curationCatalog)].map((slide, index, all) => Object.freeze({
    ...slide, href: slideHref(slide.id), position: index + 1, total: all.length,
  })));
  const requested = clean(requestedSlideId);
  const selectedIndex = Math.max(0, slides.findIndex((slide) => slide.id === requested));
  return Object.freeze({
    ...BEIT_MIDRASH_SOD1820_PRESENTATION, slides, selectedSlide: slides[selectedIndex], selectedIndex,
    previousSlide: selectedIndex > 0 ? slides[selectedIndex - 1] : null,
    nextSlide: selectedIndex < slides.length - 1 ? slides[selectedIndex + 1] : null,
  });
}

export function isBeitMidrashSod1820Slide(slideId) {
  const id = clean(slideId);
  return [...ORIGINAL_CONTENT_SLIDES, ...SITE_APPENDIX_SLIDES, { id: "diamonds" }].some((slide) => slide.id === id);
}

export const BEIT_MIDRASH_SOD1820_SOURCE_STATUS = SOURCE_STATUS;
export const BEIT_MIDRASH_SOD1820_CALCULATION_STATUS = CALCULATION_STATUS;
