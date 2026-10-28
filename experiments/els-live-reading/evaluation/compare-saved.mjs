#!/usr/bin/env node
// Compares a run's saved answers (all rounds) with the items of a saved cipher, AFTER the answers were saved. Generic: the saved items come from a data file (evaluation/saved-cipher-*.json),
// never from code. Usage:  node experiments/els-live-reading/evaluation/compare-saved.mjs <runId> <saved-file> [page]
// For every saved item occurrence: the interpretation skip_dir_start is checked against the Torah letters, the cells are placed in the run's window (or marked outside), and the model's proposals
// (verified occurrences only count as verified) are matched by cells: exact (same cells), contains (proposal covers it), inside (proposal is part of it), overlaps (>= 2 shared cells), else none.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadRegion } from "../lib/region.mjs";
import { regionPathOf } from "../lib/context.mjs";
import { pageLetters } from "../build-windows.mjs";
import { foldFinals } from "../lib/region.mjs";

const [runId, savedFile, page = "public/tzofen.html"] = process.argv.slice(2);
const here = (path) => new URL(path, import.meta.url);
const run = JSON.parse(readFileSync(new URL(`../controls/plan-review.json`, import.meta.url), "utf8")).runs.find((r) => r.id === runId);
const saved = JSON.parse(readFileSync(savedFile, "utf8"));
const region = loadRegion(regionPathOf(run.region));
const torah = pageLetters(page).slice(0, 304_805);
const key = (i, j) => `${i},${j}`;

const parse = (sh) => { const [skip, dir, start] = sh.split("_").map(Number); return { skip, dir, start }; };
const cellsOf = (text, { skip, dir, start }) => {
  const positions = [...text].map((_, k) => start + k * skip * dir);
  const lettersOk = positions.every((p, k) => torah[p] === [...text][k]);
  const cells = positions.map((p) => [Math.floor(p / region.W) - region.r0 + 1, (p % region.W) - region.c0 + 1]);
  const inside = cells.map(([i, j]) => i >= 1 && i <= region.nRows && j >= 1 && j <= region.nCols);
  return { positions, lettersOk, cells, inside };
};

// the model's verified occurrences, per round
const proposals = [];
for (const round of [1, 2]) {
  const dir = `../controls/runs/${runId}/`;
  if (!existsSync(here(`${dir}classified-round${round}.json`))) continue;
  const classified = JSON.parse(readFileSync(here(`${dir}classified-round${round}.json`), "utf8"));
  const answer = JSON.parse(JSON.parse(readFileSync(here(`${dir}round${round}-response.json`), "utf8")).summary.text);
  for (const f of classified) {
    const raw = answer.findings[Number(f.id.split(".f")[1]) - 1];
    f.occurrences.forEach((occ, k) => {
      const check = f.checks[k];
      const verified = Boolean(check && check.letters_match && (check.plain_text || check.synthetic || check.engine_found === true));
      proposals.push({ id: f.id, modelId: raw.id, round, text: f.text, tier: raw.tier ?? null, kind: raw.kind, from: raw.from_finding, line: occ.reading, verified, plain: Boolean(check?.plain_text), cells: occ.cells.map(([i, j]) => key(i, j)), note: raw.note });
    });
  }
}

const rank = { exact: 5, contains: 4, inside: 3, overlaps: 2, none: 0 };
const rows = [];
for (const item of [...saved.findings, ...(saved.include_other_record ? saved.other_record.findings : [])]) {
  const text = foldFinals(item.t);
  if (!item.sh.length) { rows.push({ saved: item.t, sh: "(none stored)", status: "no stored position", best: null }); continue; }
  for (const sh of item.sh) {
    const spec = parse(sh);
    const where = cellsOf([...text].join(""), spec);
    const row = { saved: item.t, sh, kind: spec.skip === 1 ? "plain text" : `skip ${spec.skip}${spec.dir < 0 ? " (back)" : ""}`, lettersMatchTorah: where.lettersOk, inWindow: where.inside.every(Boolean) ? "whole" : where.inside.some(Boolean) ? "part" : "outside", cells: where.cells.map(([i, j]) => `R${i}C${j}`).join(" ") };
    if (row.inWindow !== "outside" && where.lettersOk) {
      const mine = new Set(where.cells.filter((_, k) => where.inside[k]).map(([i, j]) => key(i, j)));
      let best = { match: "none" };
      for (const p of proposals) {
        const shared = p.cells.filter((c) => mine.has(c)).length;
        const match = shared === 0 ? "none" : p.cells.length === mine.size && shared === mine.size ? "exact" : shared === mine.size ? "contains" : shared === p.cells.length ? "inside" : shared >= 2 ? "overlaps" : "none";
        if (rank[match] > rank[best.match] || (rank[match] === rank[best.match] && match !== "none" && p.verified && !best.verified)) best = { match, ...p, shared };
      }
      row.best = best.match === "none" ? { match: "none" } : { match: best.match, proposal: best.id, modelId: best.modelId, round: best.round, text: best.text, line: best.line, tier: best.tier, kind: best.kind, from_finding: best.from, verified: best.verified, plain_text: best.plain };
    }
    rows.push(row);
  }
}
const out = { run: runId, record: saved.record_id, region: { r0: region.r0, r1: region.r1, c0: region.c0, c1: region.c1, width: region.W }, saved_items: rows, proposals_verified_occurrences: proposals.filter((p) => p.verified).length };
writeFileSync(here(`../controls/runs/${runId}/comparison-with-saved.json`), `${JSON.stringify(out, null, 2)}\n`);
for (const r of rows) console.log(`${r.saved}\t${r.sh}\t${r.kind ?? ""}\tletters=${r.lettersMatchTorah}\twindow=${r.inWindow ?? ""}\t${r.best ? `${r.best.match}${r.best.proposal ? ` ${r.best.proposal}/${r.best.modelId} r${r.best.round} "${r.best.text}" ${r.best.line} tier ${r.best.tier} ${r.best.plain_text ? "plain" : "ELS"} verified=${r.best.verified}` : ""}` : r.status}`);
