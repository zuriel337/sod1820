// Navigation projection for the Ahavat Torah prototype. It reconciles two
// existing groupings by PDF page range only: the seven reading divisions of the
// unified reader (bookReader2029.js) and the eight source areas of the deep
// reader (ahavatTorahSystem2029.js). It creates no source chapters, identities
// or readings: every entry points at pages and datasets that already exist.
import { getBookReaderManifest } from "./bookReader2029.js";
import { AHAVAT_LOCATED_DATASETS, AHAVAT_TORAH_SECTIONS, AHAVAT_TORAH_SOURCE } from "./ahavatTorahSystem2029.js";

export const AHAVAT_BOOK_SLUG = "ahavat-torah";
export const AHAVAT_COVER_IMAGE = Object.freeze({
  src: "/book-data/ahavat-torah.source-page-001.webp",
  width: 560,
  height: 704,
  alt: "עמוד השער של המהדורה המקורית של אהבת תורה, צילום PDF 1",
  caption: "עמוד השער של המהדורה · צילום מן המקור, PDF 1",
});

export const AHAVAT_CARD_SUMMARY = "ספר מניינים וחידושים על התורה: כמה פעמים נזכר שם ה׳, איך מתחלקות האותיות בין הפרשות, ומה חידש המחבר בכל פרשה.";
export const AHAVAT_CARD_TOPICS = Object.freeze(["מניין שם ה׳ · 1,820", "אותיות לפי פרשה", "חידושים על סדר הפרשות", "חמש המגילות"]);

const manifest = getBookReaderManifest(AHAVAT_BOOK_SLUG);

export function ahavatNormalizeSearch(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .replace(/(\d)[,.](?=\d)/g, "$1")
    .replace(/[׳״'"`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("he");
}

function overlap(range, division) {
  const from = Math.max(range[0], division.from);
  const to = Math.min(range[1], division.to);
  return from <= to ? [from, to] : null;
}

// Seven divisions -> the areas overlapping them -> the topics whose first source
// page lies inside. An area spanning two divisions is listed in both with its
// own overlapping pages, so the two groupings stay reconciled, not merged.
export function ahavatNavigationHierarchy() {
  return manifest.chapters.map((division, index) => ({
    id: division.id,
    index: index + 1,
    title: division.title,
    from: division.from,
    to: division.to,
    points: division.points,
    areas: AHAVAT_TORAH_SECTIONS.map(section => {
      const shared = overlap(section.range, division);
      return shared ? { id: section.id, title: section.title, shortTitle: section.shortTitle, from: shared[0], to: shared[1], range: section.range, page: shared[0], section } : null;
    }).filter(Boolean),
    topics: AHAVAT_LOCATED_DATASETS.filter(dataset => dataset.pages[0] >= division.from && dataset.pages[0] <= division.to),
  }));
}

export function ahavatDivisionForPage(page) {
  const safe = Math.max(1, Math.min(AHAVAT_TORAH_SOURCE.pdfPages, Number(page) || 1));
  return manifest.chapters.find(division => safe >= division.from && safe <= division.to) || manifest.chapters[0];
}

// Deterministic search over the same visible entries. Returns navigation targets
// only; it never searches or quotes page text.
export function ahavatNavigationSearch(query, limit = 10) {
  const needle = ahavatNormalizeSearch(query);
  if (needle.length < 2) return [];
  const results = [];
  const push = (entry, text) => { if (ahavatNormalizeSearch(text).includes(needle)) results.push(entry); };
  for (const division of ahavatNavigationHierarchy()) {
    push({ kind: "division", id: division.id, label: division.title, detail: `חטיבה ${division.index} · PDF ${division.from}–${division.to}`, page: division.from }, [division.title, ...division.points].join(" "));
    for (const area of division.areas) push({ kind: "area", id: `${division.id}:${area.id}`, label: area.title, detail: `אזור במקור · PDF ${area.from}–${area.to}`, page: area.page, areaId: area.id }, [area.title, area.section.description].join(" "));
    for (const topic of division.topics) push({ kind: "topic", id: topic.id, label: topic.title, detail: `${topic.total} · PDF ${topic.pages.join(" · ")}`, page: topic.pages[0], datasetId: topic.id }, [topic.title, topic.total, topic.summary].join(" "));
  }
  return results.slice(0, limit);
}
