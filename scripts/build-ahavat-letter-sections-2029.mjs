// Reproducible, bounded OCR extraction. Rectangles were inspected on PDF 36–41.
// No number or parasha is inferred/corrected here. The PDF remains source of record.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SOURCE_SHA256 = "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b";
// Page, column and vertical PDF coordinates (72 dpi, top-origin).
export const LETTER_SOURCE_REGIONS = Object.freeze({
  "ז": [[36, "left", 173, 338]],
  "ח": [[36, "left", 338, 473], [37, "right", 73, 124]],
  "ט": [[37, "right", 124, 293]],
  "י": [[37, "right", 293, 473], [37, "left", 73, 98]],
  "כ": [[37, "left", 98, 283]],
  "ך": [[37, "left", 283, 448]],
  "ל": [[37, "left", 448, 473], [38, "right", 73, 240]],
  "מ": [[38, "right", 240, 425]],
  "ם": [[38, "right", 425, 473], [38, "left", 73, 216]],
  "נ": [[38, "left", 216, 391]],
  "ן": [[38, "left", 391, 473], [39, "right", 73, 163]],
  "ס": [[39, "right", 163, 328]],
  "ע": [[39, "right", 328, 473], [39, "left", 73, 118]],
  "פ": [[39, "left", 118, 283]],
  "ף": [[39, "left", 283, 436]],
  "צ": [[39, "left", 436, 473], [40, "right", 73, 207]],
  "ץ": [[40, "right", 207, 360]],
  "ק": [[40, "right", 360, 473], [40, "left", 73, 140]],
  "ר": [[40, "left", 140, 327]],
  "שׁ": [[40, "left", 327, 473], [41, "right", 73, 126]],
  "שׂ": [[41, "right", 126, 281], [41, "left", 73, 96]],
  "ת": [[41, "left", 96, 281]],
});

export function extractLetterSections(pdfPath) {
  const digest = createHash("sha256").update(readFileSync(pdfPath)).digest("hex");
  if (digest !== SOURCE_SHA256) throw new Error("Wrong Ahavat Torah source PDF");
  const sections = Object.entries(LETTER_SOURCE_REGIONS).map(([form, regions]) => ({
    form,
    fidelity_status: "machine_candidate",
    fragments: regions.map(([pdf_page, column, top, bottom]) => {
      const x = column === "right" ? 215 : 28;
      const width = column === "right" ? 163 : 185;
      const raw = execFileSync("pdftotext", ["-f", String(pdf_page), "-l", String(pdf_page), "-r", "72", "-x", String(x), "-y", String(top), "-W", String(width), "-H", String(bottom - top), "-layout", pdfPath, "-"], { encoding: "utf8" });
      const text = raw.replace(/[\u202a-\u202e\u2066-\u2069\f]/g, "").split("\n").map(line => line.trim()).filter(Boolean).join("\n");
      if (text.length < 25) throw new Error(`Empty OCR fragment: ${form}/${pdf_page}/${column}`);
      return { pdf_page, column, region: { x, y: top, width, height: bottom - top }, text, source_anchor: `#page=${pdf_page}&view=FitH` };
    }),
  }));
  return { schema_version: "1.0", source_identity: "book:hebrewbooks:5635", source_pdf_sha256: digest,
    extraction_method: "pdftotext -layout -r 72, visually mapped column regions; bidi controls removed only",
    fidelity_status: "machine_candidate", sections };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pdfPath = process.argv[2];
  if (!pdfPath) throw new Error("Usage: node scripts/build-ahavat-letter-sections-2029.mjs /path/to/source.pdf");
  const result = extractLetterSections(pdfPath);
  const output = new URL("../public/book-data/ahavat-torah.letter-sections.json", import.meta.url);
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(`Extracted ${result.sections.length} letter sections / ${result.sections.reduce((sum, section) => sum + section.fragments.length, 0)} source fragments`);
}
