import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const registerFiles = [
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P16_25.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P26_35.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P36_45.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P46_57.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P58_62.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P63_70.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P71_80.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P81_90.json",
  "AHAVAT_TORAH_LOSSLESS_PAGE_REGISTER_P91_99.json",
];

const pages = registerFiles.flatMap((filename) => {
  const path = resolve(root, "docs/research-notes", filename);
  const register = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(register.pages)) throw new Error(`${filename}: pages is not an array`);
  return register.pages;
}).sort((a, b) => a.pdf_page - b.pdf_page);

const pageNumbers = pages.map((page) => page.pdf_page);
const expectedPageNumbers = Array.from({ length: 99 }, (_, index) => index + 1);
if (JSON.stringify(pageNumbers) !== JSON.stringify(expectedPageNumbers)) {
  throw new Error(`register must contain each PDF page 1..99 exactly once; got ${pageNumbers.join(",")}`);
}

const pageRegister = pages.map((page) => ({
  pdf_page: page.pdf_page,
  printed_page: page.printed_page ?? null,
  section: page.section ?? null,
  parasha: page.parasha ?? null,
  transcription_depth: page.transcription_depth ?? null,
  n_content_blocks: page.content_blocks?.length || 0,
  n_tables: page.tables?.length || 0,
  n_unresolved_readings: page.unresolved_readings?.length || 0,
  transcription_status: page.transcription_status ?? null,
  visual_verification_status: page.visual_verification_status ?? null,
  research_extraction_status: page.research_extraction_status ?? null,
  confidence: page.confidence ?? null,
}));

const contentBlocks = pages.flatMap((page) => (page.content_blocks || []).map((block) => ({
  pdf_page: page.pdf_page,
  ...block,
})));

const bundlePath = resolve(root, "public/book-data/ahavat-torah.tables.json");
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
bundle.page_register = pageRegister;
bundle.content_blocks = contentBlocks;

const metrics = bundle.hero?.metrics;
if (Array.isArray(metrics)) {
  const replacements = new Map([
    ["עמודים ברישום block רציף", [String(pageRegister.length), "עמודים ברישום block רציף", "all-page material register"]],
    ["blocks שמורים", [String(contentBlocks.length), "blocks שמורים", "all-page material register"]],
    ["טבלאות", [String(pageRegister.reduce((sum, page) => sum + page.n_tables, 0)), "טבלאות", "all-page material register"]],
  ]);
  bundle.hero.metrics = metrics.map((metric) => replacements.get(metric?.[1]) || metric);
}

writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 1)}\n`);
process.stdout.write(`${JSON.stringify({
  pages: pageRegister.length,
  contentBlocks: contentBlocks.length,
  tables: pageRegister.reduce((sum, page) => sum + page.n_tables, 0),
  unresolvedReadings: pageRegister.reduce((sum, page) => sum + page.n_unresolved_readings, 0),
})}\n`);
