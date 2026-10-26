import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    pdf: { type: "string" },
    output: { type: "string" },
    slug: { type: "string" },
    "source-identity": { type: "string" },
    "source-url": { type: "string" },
    pages: { type: "string" },
    "image-only": { type: "string", default: "" },
    "generated-at": { type: "string", default: new Date().toISOString().slice(0, 10) },
  },
  strict: true,
});

const required = ["pdf", "output", "slug", "source-identity", "source-url", "pages"];
for (const key of required) {
  if (!values[key]) throw new Error(`Missing required option --${key}`);
}

const expectedPages = Number(values.pages);
if (!Number.isInteger(expectedPages) || expectedPages < 1) throw new Error("--pages must be a positive integer");

const imageOnlyPages = new Set(String(values["image-only"] || "")
  .split(",")
  .map(value => Number(value.trim()))
  .filter(value => Number.isInteger(value) && value > 0));
const sourcePdf = resolve(values.pdf);
const outputPath = resolve(values.output);
const temporaryDirectory = mkdtempSync(join(tmpdir(), "book-page-text-"));
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
  const pageChunks = readFileSync(extractedTextPath, "utf8").split("\f");
  while (pageChunks.length > expectedPages && !pageChunks.at(-1).trim()) pageChunks.pop();
  if (pageChunks.length !== expectedPages) {
    throw new Error(`Expected ${expectedPages} pages, received ${pageChunks.length}`);
  }

  const pages = pageChunks.map((rawText, index) => {
    const pdfPage = index + 1;
    const normalized = imageOnlyPages.has(pdfPage) ? "" : normalizePageText(rawText);
    return {
      pdf_page: pdfPage,
      extraction_status: imageOnlyPages.has(pdfPage)
        ? "image_only"
        : normalized ? "machine_candidate" : "blank_or_image_only",
      character_count: normalized.length,
      text: normalized,
    };
  });

  const pdfBytes = readFileSync(sourcePdf);
  const document = {
    schema_version: "book-page-text.v1",
    book_slug: values.slug,
    source_identity: values["source-identity"],
    source_pdf_url: values["source-url"],
    source_pdf_sha256: createHash("sha256").update(pdfBytes).digest("hex"),
    generated_at: values["generated-at"],
    extraction_method: "embedded PDF text via pdftotext -layout",
    fidelity_status: "machine_candidate_for_search_and_navigation",
    display_contract: "PDF remains the source; extracted text is not a diplomatic transcription",
    pages,
  };
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
