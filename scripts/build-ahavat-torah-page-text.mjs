import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [pdfArgument, outputArgument = "public/book-data/ahavat-torah.page-text.json"] = process.argv.slice(2);

if (!pdfArgument) {
  console.error("Usage: node scripts/build-ahavat-torah-page-text.mjs <source.pdf> [output.json]");
  process.exit(1);
}

const sourcePdf = resolve(pdfArgument);
const outputPath = resolve(outputArgument);
const temporaryDirectory = mkdtempSync(join(tmpdir(), "ahavat-torah-text-"));
const extractedTextPath = join(temporaryDirectory, "book.txt");

function normalizePageText(value) {
  return value
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

try {
  execFileSync("pdftotext", ["-layout", sourcePdf, extractedTextPath], { stdio: "inherit" });
  const pages = readFileSync(extractedTextPath, "utf8")
    .split("\f")
    .slice(0, 99)
    .map((text, index) => {
      const normalized = normalizePageText(text);
      return {
        pdf_page: index + 1,
        extraction_status: normalized ? "machine_candidate" : "blank_or_image_only",
        character_count: normalized.length,
        text: normalized,
      };
    });

  if (pages.length !== 99) throw new Error(`Expected 99 pages, received ${pages.length}`);

  writeFileSync(outputPath, `${JSON.stringify({
    schema_version: "ahavat-torah-page-text.v1",
    source_identity: "book:hebrewbooks:5635",
    generated_at: "2026-10-23",
    extraction_method: "embedded PDF text via pdftotext -layout",
    fidelity_status: "machine_candidate_requires_visual_verification",
    pages,
  }, null, 2)}\n`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
