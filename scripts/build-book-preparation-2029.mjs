import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getAllBookReaderManifests } from "../src/data/bookReader2029.js";
const root = fileURLToPath(new URL("..", import.meta.url));
export function buildBookPreparation() {
  const books = {};
  for (const manifest of getAllBookReaderManifests()) {
    const inputs = [];
    const read = relative => {
      const bytes = readFileSync(`${root}/${relative}`);
      inputs.push({ path: relative, sha256: createHash("sha256").update(bytes).digest("hex") });
      return JSON.parse(bytes);
    };
    const commentary = read(`public${manifest.commentaryUrl}`);
    const validPage = p => Number.isInteger(p) && p >= 1 && p <= manifest.pdfPages;
    const guides = new Set(commentary.pages.filter(p => validPage(p.pdf_page) && p.companion_explanation?.trim() && p.source_anchor?.startsWith(`#page=${p.pdf_page}&`)).map(p => p.pdf_page));
    const mapped = new Set();
    for (const p of commentary.pages) if (validPage(p.pdf_page) && p.companion_units?.length) mapped.add(p.pdf_page);
    for (const suffix of ["internal-map", "units"]) {
      const relative = `public/book-data/${manifest.slug}.${suffix}.json`;
      if (!existsSync(`${root}/${relative}`)) continue;
      for (const unit of read(relative).units || []) {
        if (validPage(unit.pdf_page) && unit.source_anchor?.startsWith(`#page=${unit.pdf_page}&`)) mapped.add(unit.pdf_page);
        else if (validPage(unit.source?.from_pdf_page) && validPage(unit.source?.to_pdf_page) && unit.source.entry_anchor === `#page=${unit.source.entry_pdf_page}&view=FitH`) {
          for (let page = unit.source.from_pdf_page; page <= unit.source.to_pdf_page; page++) mapped.add(page);
        }
      }
    }
    books[manifest.slug] = {
      pdfPages: manifest.pdfPages,
      steps: [
        { id: "source", label: "מקור PDF מקושר", completed: manifest.pdfUrl ? 1 : null, total: 1 },
        { id: "guides", label: "עמודים עם הסבר מקושר", completed: guides.size, total: manifest.pdfPages },
        { id: "units", label: "עמודים עם מפת יחידות לימוד", completed: mapped.size || null, total: manifest.pdfPages },
        { id: "editorial", label: "קבלה עריכתית מלאה", completed: null, total: 1 },
        { id: "reader", label: "קבלת חוויית הספר המלאה", completed: null, total: 1 },
      ],
      inputs,
    };
  }
  return { schema: "books-preparation-projection.v1", basis: "Five equally weighted preparation steps. Documented progress, not research truth, engine verification, exhaustive commentary or publication permission. Unassessed gates remain null. Current checked-in assets only.", books };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(`${root}/public/book-data/books.preparation.json`, JSON.stringify(buildBookPreparation(), null, 2) + "\n");
