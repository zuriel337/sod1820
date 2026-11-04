import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PAGE_TEXT_PATH = resolve(ROOT, "public/book-data/maamar-esther.page-text.json");
const COMMENTARY_PATH = resolve(ROOT, "public/book-data/maamar-esther.commentary.json");
const OUTPUT_PATH = resolve(ROOT, "public/book-data/maamar-esther.internal-map.json");

const CHAPTERS = Object.freeze([
  { id: "edition", title: "שער והקדמות", from: 1, to: 4, megillahChapter: null },
  { id: "opening", title: "פתיחה", from: 5, to: 8, megillahChapter: null },
  { id: "chapter-1", title: "פרק א׳", from: 9, to: 24, megillahChapter: "א׳" },
  { id: "chapter-2", title: "פרק ב׳", from: 25, to: 36, megillahChapter: "ב׳" },
  { id: "chapter-3", title: "פרק ג׳", from: 37, to: 42, megillahChapter: "ג׳" },
  { id: "chapter-4", title: "פרק ד׳", from: 43, to: 50, megillahChapter: "ד׳" },
  { id: "chapter-5", title: "פרק ה׳", from: 51, to: 55, megillahChapter: "ה׳" },
  { id: "chapter-6", title: "פרק ו׳", from: 56, to: 61, megillahChapter: "ו׳" },
  { id: "chapter-7", title: "פרק ז׳", from: 62, to: 64, megillahChapter: "ז׳" },
  { id: "chapter-8", title: "פרק ח׳", from: 65, to: 69, megillahChapter: "ח׳" },
  { id: "chapter-9", title: "פרק ט׳", from: 70, to: 82, megillahChapter: "ט׳" },
  { id: "chapter-10", title: "פרק י׳", from: 83, to: 84, megillahChapter: "י׳" },
]);

const ENTITY_TERMS = [
  "אחשורוש", "אסתר", "מרדכי", "המן", "ושתי", "זרש", "ממוכן", "חרבונא",
  "בגתן", "תרש", "משה", "ישראל", "עמלק", "יהושע", "יעקב", "עשו",
];

const CONCEPT_TERMS = [
  "מלכות", "משתה", "מגילה", "פורים", "גזירה", "גאולה", "השגחה", "תשובה",
  "תענית", "שבת", "פסח", "עומר", "שקלים", "תורה", "מצוה", "בחירה",
  "נס", "תפילה", "צדקה", "זיכרון", "כבוד", "גלות", "בית המקדש", "הלל",
];

const SOURCE_TERMS = [
  ["מדרש", /מדרש/u],
  ["גמרא", /גמרא/u],
  ["ש״ס", /ש[״"]ס/u],
  ["ירושלמי", /ירושלמי/u],
  ["ילקוט", /ילקוט/u],
  ["רש״י", /רש[״"]י/u],
  ["תוספות", /תוס(?:פות|׳)/u],
  ["תרגום", /תרגום/u],
  ["ספרי", /ספרי/u],
  ["אלשיך", /אלשי[״"]?ך/u],
  ["עקידה", /עקידה/u],
  ["ר״ן", /ר[״"]ן/u],
  ["מהרש״א", /מהרש[״"]א/u],
];

const VERIFIED_QUOTES = new Map([
  [5, "לאדם שטוב לפניו נתן חכמה ודעת ושמחה"],
  [9, "ויהי בימי אחשורוש הוא אחשורוש המולך מהודו ועד כוש שבע ועשרים ומאה מדינה"],
  [83, "וישם המלך אחשורוש מס על הארץ ואיי הים"],
]);

const UNIT_BOUNDARY = /(?=\s(?:ב\s*פ\s*[סצ]\s*[וויל]\s*[קה]|כ\s*פ\s*[סצ]\s*[וויל]\s*[קה]|עוד\s+(?:ב\s*פסוק|בפסוק|יאמר)|או\s+י[״"׳']?ל)\s)/gu;

function cleanText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSnippet(value, max = 220) {
  const cleaned = cleanText(value)
    .replace(/^[^\u0590-\u05ff]+/u, "")
    .replace(/[■|^<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const clipped = cleaned.length > max ? cleaned.slice(0, max).replace(/\s+\S*$/u, "") : cleaned;
  return clipped.replace(/[,:;־\-\s]+$/u, "").trim();
}

function sentenceCandidates(text) {
  return cleanText(text)
    .split(/(?<=[.!?׃])\s+/u)
    .map(item => cleanSnippet(item, 260))
    .filter(item => item.length >= 28);
}

function firstMatchingSentence(text, pattern) {
  return sentenceCandidates(text).find(sentence => pattern.test(sentence)) || "";
}

function chapterForPage(page) {
  return CHAPTERS.find(chapter => page >= chapter.from && page <= chapter.to);
}

function sourceFocus(segment, page, sequence, isContinuation) {
  const explicit = firstMatchingSentence(segment, /(?:פסוק|מדרש|גמרא|ש[״"]ס|ירושלמי)/u);
  if (explicit) return cleanSnippet(explicit, 150);
  if (isContinuation) return `המשך המהלך מן העמוד הקודם · עמוד ${page}`;
  return `מהלך ${sequence} בעמוד ${page}`;
}

function detectKind(segment, isContinuation) {
  if (/או\s+י[״"׳']?ל|עוד\s+יאמר/u.test(segment)) return "alternative_explanation";
  if (/(?:פסוק|פ\s*[סצ]\s*[וויל]\s*[קה])/u.test(segment)) return "verse_discussion";
  if (/(?:מדרש|גמרא|ש[״"]ס|ירושלמי)/u.test(segment)) return "rabbinic_discussion";
  return isContinuation ? "continued_argument" : "page_argument";
}

function detectQuestion(segment, page) {
  const extracted = firstMatchingSentence(segment, /(?:קשה|קוש|תמוה|אינו מובן|יש להבין|יש לדייק|לכאורה|מה ענין|מנ[״"]ל)/u);
  return extracted || `מהו הקושי שהמחבר מברר במהלך המסומן בעמוד ${page}?`;
}

function detectConclusion(segment, page) {
  const candidates = sentenceCandidates(segment).filter(sentence => /(?:ולכך|לכך|מוכח|נמצא|יובן|וא[״"]ש|עולה|ממילא|על כן)/u.test(sentence));
  return candidates.at(-1) || `את חתימת המהלך יש לקרוא בדברי הספר בעמוד ${page}; שכבת המיפוי אינה מחליפה אותה.`;
}

function detectSteps(segment, page, focus) {
  const candidates = sentenceCandidates(segment)
    .filter(sentence => /(?:דהנה|הנה|אך|נראה|ולפ[״"]ז|א[״"]כ|ולכך|מוכח|וז[״"]ש)/u.test(sentence))
    .slice(0, 4);
  if (candidates.length >= 2) return candidates;
  return [
    `פותחים את דברי הספר בעמוד ${page} ומאתרים את ${focus}.`,
    "מפרידים בין הקושיה, המקורות שהמחבר מביא ושלבי התשובה.",
    "קוראים את המסקנה בדף המצולם לפני מעבר ליחידה הבאה.",
  ];
}

function detectTerms(segment, dictionary) {
  return dictionary.filter(term => cleanText(segment).includes(term));
}

function detectSources(segment) {
  const sources = SOURCE_TERMS.filter(([, pattern]) => pattern.test(segment)).map(([label]) => label);
  if (/(?:פסוק|פ\s*[סצ]\s*[וויל]\s*[קה])/u.test(segment)) sources.unshift("מגילת אסתר / מקרא");
  return [...new Set(sources)];
}

function makeExplanation(chapter, page, entities, concepts) {
  const anchors = [...entities.slice(0, 3), ...concepts.slice(0, 2)];
  const anchorText = anchors.length ? ` מוקדי האיתור הבולטים כאן: ${anchors.join(" · ")}.` : "";
  return `${chapter.title}, עמוד ${page}: היחידה מסדרת את הקריאה מן המקור אל הקושיה, המקורות, שלבי המהלך והמסקנה.${anchorText} זהו הסבר נלווה לניווט; דברי הספר נקראים מן ה־PDF הצמוד.`;
}

function splitPage(text) {
  const normalized = cleanText(text);
  const parts = normalized.split(UNIT_BOUNDARY).map(item => item.trim()).filter(item => item.length >= 100);
  return parts.length ? parts : [normalized];
}

function requestedChapters() {
  const raw = process.argv.find(arg => arg.startsWith("--chapters="))?.slice("--chapters=".length);
  if (!raw || raw === "all") return new Set(CHAPTERS.map(chapter => chapter.id));
  const selected = new Set(raw.split(",").map(item => item.trim()).filter(Boolean));
  for (const id of selected) {
    if (!CHAPTERS.some(chapter => chapter.id === id)) throw new Error(`Unknown chapter: ${id}`);
  }
  return selected;
}

const selectedChapters = requestedChapters();
const pageText = JSON.parse(await readFile(PAGE_TEXT_PATH, "utf8"));
const commentary = JSON.parse(await readFile(COMMENTARY_PATH, "utf8"));
const commentaryByPage = new Map(commentary.pages.map(item => [Number(item.pdf_page), item]));
const units = [];

for (const pageEntry of pageText.pages) {
  const page = Number(pageEntry.pdf_page);
  const chapter = chapterForPage(page);
  if (!chapter || !selectedChapters.has(chapter.id)) continue;
  const segments = splitPage(pageEntry.text);
  segments.forEach((segment, index) => {
    const sequence = index + 1;
    const isContinuation = index === 0 && !/(?:פסוק|פ\s*[סצ]\s*[וויל]\s*[קה]|מדרש|גמרא|פתיחה|הפיטיל)/u.test(segment.slice(0, 280));
    const focus = sourceFocus(segment, page, sequence, isContinuation);
    const entities = detectTerms(segment, ENTITY_TERMS);
    const concepts = detectTerms(segment, CONCEPT_TERMS);
    const id = `maamar-esther-${chapter.id}-p${String(page).padStart(2, "0")}-u${String(sequence).padStart(2, "0")}`;
    units.push({
      id,
      pdf_page: page,
      chapter_id: chapter.id,
      chapter_title: chapter.title,
      megillah_chapter: chapter.megillahChapter,
      sequence_on_page: sequence,
      kind: detectKind(segment, isContinuation),
      source_focus: focus,
      source_quote: index === 0 ? VERIFIED_QUOTES.get(page) || null : null,
      quote_status: index === 0 && VERIFIED_QUOTES.has(page) ? "visually_readable_in_source_page" : "not_asserted",
      question: detectQuestion(segment, page),
      cited_sources: detectSources(segment),
      argument_steps: detectSteps(segment, page, focus),
      conclusion: detectConclusion(segment, page),
      companion_explanation: makeExplanation(chapter, page, entities, concepts),
      people: entities,
      concepts,
      extraction_anchor: cleanSnippet(segment, 320),
      extraction_status: "machine_candidate_for_search_and_navigation",
      source_anchor: `#page=${page}&view=FitH`,
      source_url: `${pageText.source_pdf_url}#page=${page}&view=FitH`,
      related_unit_ids: [],
    });
  });
}

for (let index = 0; index < units.length; index += 1) {
  const unit = units[index];
  const previous = units[index - 1];
  const next = units[index + 1];
  unit.related_unit_ids = [
    previous?.chapter_id === unit.chapter_id ? previous.id : null,
    next?.chapter_id === unit.chapter_id ? next.id : null,
  ].filter(Boolean);
}

const selectedChapterRecords = CHAPTERS
  .filter(chapter => selectedChapters.has(chapter.id))
  .map(chapter => ({
    ...chapter,
    unit_ids: units.filter(unit => unit.chapter_id === chapter.id).map(unit => unit.id),
  }));
const coveredPages = [...new Set(units.map(unit => unit.pdf_page))].sort((a, b) => a - b);

const output = {
  schema_version: "maamar-esther-internal-map.v1",
  book_slug: "maamar-esther",
  display_contract: {
    source_text: "דברי הספר",
    companion: "הסבר נלווה",
    extraction: "טקסט חילוץ · לא תחליף ל־PDF",
    technical_details: "פרטי המקור",
  },
  source_identity: pageText.source_identity,
  source_pdf_url: pageText.source_pdf_url,
  source_pdf_sha256: pageText.source_pdf_sha256,
  generated_from: ["maamar-esther.page-text.json", "maamar-esther.commentary.json"],
  mapping_note: "המפה מסדרת סימני מהלך שנקלטו בשכבת החילוץ ומקשרת אותם לעמוד המקור. ציטוט מוצג רק בשלוש נקודות שנקראו חזותית; בכל יתר היחידות ה־PDF הוא המקור המחייב.",
  coverage: {
    requested_pdf_pages: 84,
    mapped_pdf_pages: coveredPages.length,
    mapped_pages: coveredPages,
    internal_units: units.length,
    chapters: selectedChapterRecords.length,
    status: selectedChapterRecords.length === CHAPTERS.length ? "complete_source_anchored_map" : "checkpoint_in_progress",
  },
  chapters: selectedChapterRecords,
  units,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.coverage));
