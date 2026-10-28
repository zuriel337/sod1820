#!/usr/bin/env node
// EXP-16 case U1 (a saved cipher, same method as V1): builds data/windows/u1.json, a window of the width-10101 Torah matrix with the saved phrase as its axis. The occurrence is the
// engine's (review/case-u1-engine.json), never the saved record's (which has no start_index). The Torah has only 31 rows at this width, so the window takes all of them (see caseWindow).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pageLetters, windowMd5Sql } from "./build-windows.mjs";
import { caseWindow } from "./build-case-v1.mjs";

if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = JSON.parse(readFileSync(new URL("./review/case-u1-engine.json", import.meta.url), "utf8"));
  const { file, width, spelled, window: w } = caseWindow(engine, pageLetters(process.argv[2] || "public/tzofen.html").slice(0, 304_805), { id: "u1" });
  writeFileSync(new URL("./data/windows/u1.json", import.meta.url), JSON.stringify(file, null, 1));
  writeFileSync(new URL("./review/case-u1-md5.sql", import.meta.url), windowMd5Sql([w], width, w.r1 - w.r0 + 1));
  console.log(JSON.stringify({ width, rows: file.rows, cols: file.cols, axis: file.axis, spelled_along_the_engine_positions: spelled, md5_window: file.md5_window, md5_of_spelled: createHash("md5").update(spelled).digest("hex").slice(0, 8) }));
}
