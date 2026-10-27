// Display side of the ELS matrix-scan experiment: puts the engine-reported findings on the REAL matrix letters, proves that every
// finding's cells spell its word, and renders the marks. Nothing here searches or generates occurrences: cells come from the engine's
// positions (findings.cells, local coordinates) and letters from regionLettersSql (the canonical stream relation, display only).
import { DIRECTION_LABEL } from "./grouping.mjs";

// The stream stores base letters; the dictionary may hold final forms. This is a spelling normalisation, not a search.
const FINAL_TO_BASE = Object.freeze({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" });
export const baseLetters = (word) => [...word].map((ch) => FINAL_TO_BASE[ch] || ch).join("");

/** rows: [{r, letters}] as returned by regionLettersSql → grid[localRow][localCol] (one letter per cell). */
export function letterGridFromRows(rows, region) {
  const byRow = new Map(rows.map((entry) => [Number(entry.r), [...String(entry.letters)]]));
  const grid = [];
  for (let row = region.r0; row <= region.r1; row += 1) {
    const letters = byRow.get(row);
    if (!letters) throw new RangeError(`letters for matrix row ${row} are missing`);
    if (letters.length !== region.cols) throw new RangeError(`matrix row ${row}: expected ${region.cols} letters, got ${letters.length}`);
    grid.push(letters);
  }
  return grid;
}

/** Reads each finding's cells off the grid and compares with its word (base letters). A mismatch means engine positions and letters disagree. */
export function verifyFindingsAgainstLetters({ findings, grid }) {
  const mismatches = [];
  for (const finding of findings) {
    const read = finding.cells.map((cell) => grid[cell.row]?.[cell.col] ?? "?").join("");
    const expected = baseLetters(finding.word);
    if (read !== expected) mismatches.push({ id: finding.id, word: finding.word, expected, read });
  }
  return { checked: findings.length, matched: findings.length - mismatches.length, mismatches };
}

/** Marks for drawing: local 0-based cells with their letters, plus the matrix offset to translate back to global coordinates. */
export function buildMarkup({ findings, phrases = [], grid, region, topic = "" }) {
  const cellMarks = findings.map((finding) => finding.cells.map((cell) => ({ row: cell.row, col: cell.col, letter: grid[cell.row]?.[cell.col] ?? null })));
  return {
    topic,
    coordinates: "local, 0-based; matrix row = region.firstMatrixRow + row, matrix column = region.firstMatrixCol + col; column 0 is the first letter of the text row",
    region: { rows: region.rows, cols: region.cols, width: region.width, firstMatrixRow: region.r0, firstMatrixCol: region.c0 },
    rows: grid.map((letters) => letters.join("")),
    marks: findings.map((finding, index) => ({
      id: finding.id,
      word: finding.word,
      kind: finding.kind,
      direction: finding.direction,
      from: { row: finding.local.fromRow, col: finding.local.fromCol },
      to: { row: finding.local.toRow, col: finding.local.toCol },
      cells: cellMarks[index],
    })),
    phrases: phrases.map((phrase) => ({ id: phrase.id, text: phrase.text, direction: phrase.direction, components: [...phrase.components] })),
  };
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const HUES = [12, 48, 140, 200, 265, 320, 95, 175, 230, 345];
const colorOf = (index) => `hsl(${HUES[index % HUES.length]} 75% 55% / 0.6)`;

/** One self-contained right-to-left page (no scripts, no external resources): the matrix with every finding marked, and a legend. */
export function renderMarkupHtml(markup, { title = "ניסוי מטריצת ELS" } = {}) {
  const { region } = markup;
  const owners = new Map(); // "row:col" -> indices of marks covering the cell
  markup.marks.forEach((mark, index) => mark.cells.forEach((cell) => {
    const key = `${cell.row}:${cell.col}`;
    owners.set(key, [...(owners.get(key) || []), index]);
  }));
  const styleOf = (indices) => {
    const els = indices.filter((index) => markup.marks[index].kind === "els_in_matrix");
    const text = indices.filter((index) => markup.marks[index].kind !== "els_in_matrix");
    const parts = [];
    if (els.length === 1) parts.push(`background:${colorOf(els[0])}`);
    else if (els.length > 1) parts.push(`background:linear-gradient(135deg,${els.map((index, i) => `${colorOf(index)} ${Math.round((100 * i) / els.length)}% ${Math.round((100 * (i + 1)) / els.length)}%`).join(",")})`);
    if (text.length) parts.push(`box-shadow:inset 0 -3px 0 ${colorOf(text[text.length - 1]).replace("0.6", "1")}`);
    return parts.join(";");
  };
  const header = `<tr><th></th>${Array.from({ length: region.cols }, (_, col) => `<th>${(col + 1) % 10 === 0 || col === 0 ? col + 1 : ""}</th>`).join("")}</tr>`;
  const body = markup.rows.map((line, row) => {
    const cells = [...line].map((letter, col) => {
      const indices = owners.get(`${row}:${col}`);
      const label = indices ? ` data-f="${indices.map((index) => markup.marks[index].id).join(" ")}" style="${escapeHtml(styleOf(indices))}"` : "";
      return `<td${label} title="(${row + 1},${col + 1}) ${escapeHtml(letter)}">${escapeHtml(letter)}</td>`;
    }).join("");
    return `<tr><th>${row + 1}</th>${cells}</tr>`;
  }).join("\n");
  const legend = markup.marks.map((mark, index) => {
    const swatch = mark.kind === "els_in_matrix" ? `background:${colorOf(index)}` : `box-shadow:inset 0 -3px 0 ${colorOf(index).replace("0.6", "1")}`;
    const from = `(${mark.from.row + 1},${mark.from.col + 1})`;
    const to = `(${mark.to.row + 1},${mark.to.col + 1})`;
    return `<li><span class="sw" style="${swatch}"></span><b>${escapeHtml(mark.id)}</b> ${escapeHtml(mark.word)} · ${escapeHtml(DIRECTION_LABEL[mark.direction] || mark.direction)}${mark.kind === "els_in_matrix" ? "" : " · טקסט רגיל, לא ELS"} · <bdi>${from} → ${to}</bdi></li>`;
  }).join("\n");
  const phraseList = markup.phrases.length
    ? `<h2>צירופים ברצף</h2><ul>${markup.phrases.map((phrase) => `<li><b>${escapeHtml(phrase.id)}</b> ${escapeHtml(phrase.text)} · ${escapeHtml(DIRECTION_LABEL[phrase.direction] || phrase.direction)} · ${escapeHtml(phrase.components.join("+"))}</li>`).join("")}</ul>`
    : "";
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --bg: #fbfaf7; --fg: #1d1b16; --muted: #6b665c; --line: #d9d3c5; --cell: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --bg: #16140f; --fg: #efe9da; --muted: #a39d8e; --line: #3a362c; --cell: #1f1c15; } }
body { background: var(--bg); color: var(--fg); font: 16px/1.55 system-ui, "Segoe UI", Arial, sans-serif; margin: 0; padding: 16px; }
h1 { font-size: 1.25rem; margin: 0 0 4px; }
h2 { font-size: 1.05rem; margin: 20px 0 6px; }
p.note { color: var(--muted); margin: 0 0 12px; max-width: 70ch; }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: var(--cell); }
table.m { border-collapse: collapse; margin: 6px; }
table.m td, table.m th { width: 22px; min-width: 22px; height: 24px; text-align: center; padding: 0; font-family: "Frank Ruhl Libre", "David", "Times New Roman", serif; font-size: 17px; }
table.m th { color: var(--muted); font: 10px/1 system-ui, sans-serif; }
table.m td { border: 1px solid var(--line); }
ul { padding-inline-start: 18px; margin: 6px 0; }
li { margin: 3px 0; }
.sw { display: inline-block; width: 14px; height: 14px; border: 1px solid var(--line); vertical-align: -2px; margin-inline-end: 6px; border-radius: 3px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="note">נושא: ${escapeHtml(markup.topic || "—")} · אזור ${region.rows}×${region.cols} מתוך מטריצה ברוחב ${region.width} (שורה ${region.firstMatrixRow + 1}, עמודה ${region.firstMatrixCol + 1} בפינה). עמודה 1 היא האות הראשונה בשורת הטקסט (בצד ימין). כל המיקומים הם פלט מנוע ה-ELS הקנוני; הצבע מסמן ממצא, קו תחתון מסמן מילה בטקסט רגיל (לא ELS).</p>
<div class="scroll"><table class="m" dir="rtl">
${header}
${body}
</table></div>
<h2>ממצאים</h2>
<ul>
${legend}
</ul>
${phraseList}
</body>
</html>
`;
}
