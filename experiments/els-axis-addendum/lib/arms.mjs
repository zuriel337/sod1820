// Builds the two requests of EXP-22 with the PRODUCT module, so that each is exactly what the product would send for this window. The window is the one that live job 5f5aa117 sent
// (sha256 208cbe68…), copied in data/window.json. Neither the plan nor the runner knows anything about the saved cipher except the window and its selected occurrence (the axis).
import { readFileSync } from "node:fs";
import * as M from "../../../supabase/functions/_shared/elsMatrixReading.js";
import { CAP, COLS, MODEL, ROWS, RUNS } from "./plan.mjs";

export const WINDOW_PATH = new URL("../data/window.json", import.meta.url);
export const loadWindow = () => JSON.parse(readFileSync(WINDOW_PATH, "utf8"));

export function context() {
  const data = loadWindow();
  const axisInput = { term: data.axis.term, scope: data.axis.scope, skip: data.axis.skip, dir: data.axis.dir, start: data.axis.start, corpusId: data.axis.corpus_id };
  const region = M.makeRegion({ width: data.width, r0: data.r0, c0: data.c0, rows: data.rows, axis: { start: data.axis.start, skip: data.axis.skip, dir: data.axis.dir, length: [...data.axis.term].length } });
  const lines = M.buildLines(region);
  const window = M.selectWindow({ axis: axisInput, rows: ROWS, cols: COLS });
  return { data, axis: axisInput, region, lines, byReading: M.readings(lines), window };
}

export async function buildArms() {
  const ctx = context();
  const arms = [];
  for (const run of RUNS) {
    const { request, prompt } = M.buildReadingRequest({ model: MODEL.id, region: ctx.region, lines: ctx.lines, cap: CAP, focus: run.focus, effort: MODEL.effort, maxTokens: MODEL.maxTokens });
    arms.push({ run, request, prompt, requestSha256: await M.requestSha256(request), lockSha256: await M.lockSha256(request), instruction: M.instructionLabel({ focus: run.focus }) });
  }
  return { ctx, arms };
}
