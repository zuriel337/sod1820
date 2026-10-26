import { writeFileSync } from "node:fs";
import {
  DAAT_TEVUNOT_BRANCHES,
  DAAT_TEVUNOT_SECTIONS,
  DAAT_TEVUNOT_SOURCE,
} from "../src/data/daatTevunotSections2029.js";
import { connectionBundleForSection } from "../src/data/daatTevunotConnections2029.js";
import pageText from "../public/book-data/daat-tevunot.page-text.json" with { type: "json" };

const OUTPUT = new URL("../public/book-data/daat-tevunot.internal-map.json", import.meta.url);
const PDF_SHA256 = "3c0520d819875f62ace6bf5b55b5074cabbe62a5a9331ca64a1e58d2ac73935c";
const branchByKey = new Map(DAAT_TEVUNOT_BRANCHES.map(branch => [branch.key, branch]));
const worldNames = new Map([
  ["atzilut", "אצילות"],
  ["beriah", "בריאה"],
  ["yetzirah", "יצירה"],
  ["asiyah", "עשייה"],
]);

function clip(value, max = 280) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceReferences(text) {
  const references = [];
  for (const match of String(text).matchAll(/[({]([^(){}]{2,120})[)}]/gu)) {
    const value = match[1].replace(/\s+/g, " ").trim();
    if (/[֐-׿]/u.test(value) && !/^ה?קב[״"]ה$/u.test(value)) references.push(value);
  }
  return unique(references).slice(0, 8);
}

function sentenceParts(text) {
  const parts = String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/u)
    .map(value => value.trim())
    .filter(value => value.length > 8);
  return parts.length ? parts : [String(text).trim()];
}

function peopleFor(section) {
  const candidates = ["הקב״ה", "משה", "ישראל", "אדם", "נביא", "צדיק", "רשע", "דוד", "אברהם"];
  return unique([section.speaker, ...candidates.filter(name => section.sourceText.includes(name))]);
}

function questionFor(section, branch) {
  const explicit = sentenceParts(section.sourceText).find(part => part.includes("?"));
  if (explicit) return `השאלה המפורשת בסעיף היא: ${clip(explicit, 320)}`;
  if (section.speaker === "הנשמה") {
    return `איזו בקשה, קושיה או הסכמה מוסיפה הנשמה בסעיף ${section.marker}, וכיצד היא מקדמת את ענף „${branch.title}”?`;
  }
  return `איזה כלל מוסיף השכל בסעיף ${section.marker} להבנת „${branch.title}”, ומה משתנה בעקבותיו במהלך הדיאלוג?`;
}

function sectionUnit(section) {
  const branch = branchByKey.get(section.branch);
  const connections = connectionBundleForSection(section);
  const sources = sourceReferences(section.sourceText);
  const parts = sentenceParts(section.sourceText);
  const first = clip(parts[0]);
  const last = clip(parts.at(-1));
  const argumentSteps = [
    `הסעיף נפתח בקול ${section.speaker}: ${first}`,
    sources.length
      ? `המהלך קושר את הדיון למקורות הבאים: ${sources.slice(0, 4).join(" · ")}.`
      : `המהלך מתקדם מתוך לשון הדיאלוג עצמו, בלי לייחס לסעיף מקור חיצוני שלא הוזכר בו.`,
    `בתוך ענף „${branch.title}” הסעיף נקרא כחלק מן המהלך: ${branch.summary}`,
  ];
  if (last !== first) argumentSteps.push(`חתימת הסעיף: ${last}`);

  return {
    id: `daat-tevunot-section-${String(section.id).padStart(3, "0")}`,
    pdf_page: section.pdfPage,
    chapter_id: section.branch,
    chapter_title: branch.title,
    section_id: section.id,
    section_marker: section.marker,
    speaker: section.speaker,
    sequence_on_page: DAAT_TEVUNOT_SECTIONS.filter(item => item.pdfPage === section.pdfPage && item.id <= section.id).length,
    display_locator: `סעיף ${section.marker} · PDF ${section.pdfPage}`,
    kind: section.speaker === "הנשמה" ? "dialogue_question_or_response" : "dialogue_explanation",
    source_focus: section.focus,
    source_quote: section.sourceText,
    quote_status: "licensed_source_section",
    question: questionFor(section, branch),
    cited_sources: sources,
    argument_steps: argumentSteps,
    conclusion: last,
    companion_explanation: `סעיף ${section.marker} נאמר בקול ${section.speaker} ושייך לענף „${branch.title}”. מוקד הסעיף הוא: ${clip(section.focus, 260)} מפת הקריאה מציבה אותו בתוך ${branch.summary} הנוסח המלא המוצג כאן הוא נוסח המקור המורשה; ההסבר מסייע לעקוב אחר תפקידו במהלך ואינו מחליף את עמוד ה־PDF.`,
    people: peopleFor(section),
    concepts: connections.concepts.map(item => item.label),
    governance_axes: connections.governance.map(item => item.label),
    world_lenses: connections.worlds.filter(item => item.active).map(item => worldNames.get(item.key)),
    world_lens_status: "interpretive_candidate",
    extraction_anchor: clip(section.sourceText, 420),
    extraction_status: "licensed_source_text",
    source_anchor: `#page=${section.pdfPage}&view=FitH`,
    source_url: `${DAAT_TEVUNOT_SOURCE.pdfUrl}#page=${section.pdfPage}&view=FitH`,
    related_unit_ids: [],
  };
}

function editionUnit({ page, id, focus, question, steps, conclusion, explanation }) {
  const extracted = pageText.pages.find(item => item.pdf_page === page)?.text || "";
  return {
    id,
    pdf_page: page,
    chapter_id: page < 3 ? "edition" : "closing",
    chapter_title: page < 3 ? "שער וזהות המהדורה" : "חתימת מהדורת האתר",
    section_id: null,
    section_marker: null,
    speaker: "המהדורה",
    sequence_on_page: 1,
    display_locator: `פרטי המהדורה · PDF ${page}`,
    kind: "edition_matter",
    source_focus: focus,
    source_quote: null,
    quote_status: "not_asserted",
    question,
    cited_sources: page === 2 ? ["ויקיטקסט · דעת תבונות שלם", "CC BY-SA 4.0"] : [],
    argument_steps: steps,
    conclusion,
    companion_explanation: explanation,
    people: page === 1 ? ["הרמח״ל"] : [],
    concepts: ["זהות המקור", "עימוד קבוע"],
    governance_axes: [],
    world_lenses: [],
    world_lens_status: "not_applicable",
    extraction_anchor: clip(extracted, 420),
    extraction_status: "edition_text_for_navigation",
    source_anchor: `#page=${page}&view=FitH`,
    source_url: `${DAAT_TEVUNOT_SOURCE.pdfUrl}#page=${page}&view=FitH`,
    related_unit_ids: [],
  };
}

function continuationUnit(page, precedingSection) {
  const branch = branchByKey.get(precedingSection.branch);
  const connections = connectionBundleForSection(precedingSection);
  const extracted = pageText.pages.find(item => item.pdf_page === page)?.text || "";
  return {
    id: `daat-tevunot-continuation-p${String(page).padStart(2, "0")}`,
    pdf_page: page,
    chapter_id: precedingSection.branch,
    chapter_title: branch.title,
    section_id: precedingSection.id,
    section_marker: precedingSection.marker,
    speaker: precedingSection.speaker,
    sequence_on_page: 1,
    display_locator: `המשך סעיף ${precedingSection.marker} · PDF ${page}`,
    kind: "section_continuation_page",
    source_focus: `המשך סעיף ${precedingSection.marker} בעמוד ${page}`,
    source_quote: null,
    quote_status: "not_asserted",
    question: `כיצד המשך סעיף ${precedingSection.marker} בעמוד ${page} משלים את המהלך שנפתח בעמוד הקודם?`,
    cited_sources: [],
    argument_steps: [
      `חוזרים לפתיחת סעיף ${precedingSection.marker} ולעמוד שבו החל.`,
      `קוראים את המשך הנוסח בעמוד ${page} ישירות מן ה־PDF, בלי ליצור מספר סעיף חדש.`,
      `מחברים את המשך הדיון לענף „${branch.title}”: ${branch.summary}`,
    ],
    conclusion: `העמוד ממשיך את סעיף ${precedingSection.marker}; חתימת הסעיף נקראת בנוסח המלא לפני המעבר לסעיף הבא.`,
    companion_explanation: `עמוד ${page} אינו פותח סעיף חדש. הוא ממשיך את סעיף ${precedingSection.marker}, בקול ${precedingSection.speaker}, בתוך ענף „${branch.title}”. המפה שומרת את רצף הקריאה ואת עוגן העמוד בלי להמציא חלוקה נוספת לדברי הרמח״ל.`,
    people: [precedingSection.speaker],
    concepts: connections.concepts.map(item => item.label),
    governance_axes: connections.governance.map(item => item.label),
    world_lenses: connections.worlds.filter(item => item.active).map(item => worldNames.get(item.key)),
    world_lens_status: "interpretive_candidate",
    extraction_anchor: clip(extracted, 420),
    extraction_status: "licensed_page_text_for_navigation",
    source_anchor: `#page=${page}&view=FitH`,
    source_url: `${DAAT_TEVUNOT_SOURCE.pdfUrl}#page=${page}&view=FitH`,
    related_unit_ids: [],
  };
}

const sectionUnits = DAAT_TEVUNOT_SECTIONS.map(sectionUnit);
const sectionStartPages = new Set(DAAT_TEVUNOT_SECTIONS.map(section => section.pdfPage));
const continuationUnits = [];
for (let page = 3; page <= 98; page += 1) {
  if (sectionStartPages.has(page)) continue;
  const precedingSection = DAAT_TEVUNOT_SECTIONS.filter(section => section.pdfPage < page).at(-1);
  if (!precedingSection) throw new Error(`No preceding section for continuation page ${page}`);
  continuationUnits.push(continuationUnit(page, precedingSection));
}

const units = [
  editionUnit({
    page: 1,
    id: "daat-tevunot-edition-p01",
    focus: "שער הספר וזהות החיבור",
    question: "איזה חיבור, מחבר ועד מקור עומדים לפני הקורא?",
    steps: ["מזהים את שם החיבור.", "מזהים את רבי משה חיים לוצאטו כמחבר.", "קובעים את עמוד ה־PDF כעוגן קבוע למהדורת האתר."],
    conclusion: "זהו שער מהדורת האתר של „דעת תבונות”; גוף הדיאלוג מתחיל בעמוד 3.",
    explanation: "היחידה מפרידה בין זהות הספר לבין גוף דברי הרמח״ל. עמוד השער משמש עוגן ביבליוגרפי, וה־PDF נשאר מקור התצוגה המחייב.",
  }),
  editionUnit({
    page: 2,
    id: "daat-tevunot-edition-p02",
    focus: "מקור הנוסח ורישיון המהדורה",
    question: "מאין הגיע נוסח מהדורת האתר ובאילו תנאים הוא מוצג?",
    steps: ["מזהים את נוסח ויקיטקסט כבסיס הטקסט.", "שומרים את הייחוס והרישיון CC BY-SA 4.0.", "מבחינים בין נוסח המקור לבין מפת הקריאה העכשווית."],
    conclusion: "הנוסח ניתן לקריאה מלאה ברישיון פתוח, בעוד ההסברים והענפים מסומנים כשכבה נלווית.",
    explanation: "עמוד זה מתעד את מקור הנוסח ואת תנאי השימוש בו. הוא אינו סעיף מדברי הרמח״ל ולכן אינו מוצג כציטוט מתוך הדיאלוג.",
  }),
  ...sectionUnits,
  ...continuationUnits,
  editionUnit({
    page: 99,
    id: "daat-tevunot-edition-p99",
    focus: "הערת המהדורה וחתימת העימוד",
    question: "מה שייך לדברי הספר ומה שייך לעבודת ההדרה והעימוד?",
    steps: ["מסיימים את סעיף קצ״ה בעמוד הקודם.", "קוראים את הערת המהדורה כשכבה ביבליוגרפית נפרדת.", "שומרים את מספרי העמודים כעוגני מחקר יציבים."],
    conclusion: "עמוד 99 חותם את מהדורת האתר ואינו מוסיף סעיף חדש לדברי הרמח״ל.",
    explanation: "היחידה מסמנת במפורש את גבול הספר: 195 הסעיפים הסתיימו, והעמוד האחרון שייך למהדורה. כך הערת עורך אינה מתערבבת עם דברי הספר.",
  }),
].sort((left, right) => left.pdf_page - right.pdf_page
  || (left.kind === "edition_matter" ? -1 : right.kind === "edition_matter" ? 1 : 0)
  || (left.section_id || 0) - (right.section_id || 0));

for (let index = 0; index < units.length; index += 1) {
  units[index].related_unit_ids = [units[index - 1]?.id, units[index + 1]?.id].filter(Boolean);
}

const chapters = [
  { id: "edition", title: "שער וזהות המהדורה", from: 1, to: 2 },
  ...DAAT_TEVUNOT_BRANCHES.map(branch => {
    const branchUnits = units.filter(unit => unit.chapter_id === branch.key);
    return {
      id: branch.key,
      title: branch.title,
      from: Math.min(...branchUnits.map(unit => unit.pdf_page)),
      to: Math.max(...branchUnits.map(unit => unit.pdf_page)),
    };
  }),
].map(chapter => ({
  ...chapter,
  unit_ids: units.filter(unit => unit.chapter_id === chapter.id).map(unit => unit.id),
}));

const mappedPages = [...new Set(units.map(unit => unit.pdf_page))].sort((a, b) => a - b);
const internalMap = {
  schema_version: "daat-tevunot-internal-map.v1",
  book_slug: "daat-tevunot",
  display_contract: {
    source_text: "דברי הספר",
    companion: "הסבר נלווה",
    extraction: "נוסח מורשה לניווט; ה־PDF נשאר מקור התצוגה",
    source_detail_label: "נוסח מורשה ועוגן ניווט · ה־PDF נשאר פתוח",
  },
  reader_copy: {
    title: "סעיף אחר סעיף בתוך „דעת תבונות”",
    search_label: "חיפוש לפי סעיף, דובר, מקור, מושג או ציר הנהגה",
    search_placeholder: "למשל: קלה, הנשמה, הנהגת המשפט, נבואה",
    chapters_label: "ענפי דעת תבונות",
    focus_label: "מוקד הסעיף",
    question_label: "השאלה שמובילה את הקריאה",
    argument_label: "שלבי הסעיף בתוך המהלך",
    conclusion_label: "חתימת הסעיף",
  },
  source_identity: "book:daat-tevunot",
  source_pdf_url: DAAT_TEVUNOT_SOURCE.pdfUrl,
  source_pdf_sha256: PDF_SHA256,
  source_text_url: DAAT_TEVUNOT_SOURCE.wikisourceUrl,
  source_license: DAAT_TEVUNOT_SOURCE.license,
  generated_from: ["src/data/daatTevunotSections2029.js", "src/data/daatTevunotConnections2029.js", "public/book-data/daat-tevunot.page-text.json"],
  mapping_note: "195 סעיפי הדיאלוג מוצגים במלואם ומחוברים לתשעת ענפי הספר, לצירי ההנהגה ולעמוד ה־PDF המדויק. שער המהדורה ועמוד החתימה נשמרים בנפרד מדברי הרמח״ל.",
  coverage: {
    pdf_pages: 99,
    mapped_pdf_pages: mappedPages.length,
    internal_units: units.length,
    source_sections: DAAT_TEVUNOT_SECTIONS.length,
    source_quoted_units: units.filter(unit => unit.source_quote).length,
    status: "complete_source_anchored_map",
  },
  chapters,
  units,
};

writeFileSync(OUTPUT, `${JSON.stringify(internalMap, null, 2)}\n`);
console.log(`Wrote ${internalMap.coverage.internal_units} units across ${mappedPages.length} PDF pages to ${OUTPUT.pathname}`);
