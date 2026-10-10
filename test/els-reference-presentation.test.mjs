import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { formatTanakhRef } from "../src/lib/presentation/canonicalPresentation.js";

const generated = readFileSync(new URL("../public/tzofen.html", import.meta.url), "utf8");
const shared = readFileSync(new URL("../src/lib/presentation/tanakhReferenceParts.js", import.meta.url), "utf8");

test("offline ELS embeds the exact shared reference presentation", () => {
  assert.ok(generated.includes(shared.replace("export function ", "function ")));
  assert.ok(!generated.includes("__TANAKH_REFERENCE_FORMATTER__"));
});

test("ELS source references match app presentation, including special numerals", () => {
  const numerals = generated.slice(generated.indexOf("  const HEBNUM="), generated.indexOf("  let VTEXT=null;"));
  const reference = generated.match(/  const refStr=vi=>[^\n]+/)[0];
  const rows = [[0, 35, 2], [0, 35, 3], [0, 15, 16], [0, 119, 176]];
  const context = vm.createContext({ BOOKNM: ["בראשית"], VREF: rows });
  vm.runInContext(`${numerals}\n${reference}\nglobalThis.displayRefs=VREF.map((_,i)=>refStr(i));`, context);
  assert.deepEqual(Array.from(context.displayRefs), rows.map(([, chapter, verse]) =>
    formatTanakhRef({ book: "בראשית", chapter, verse })));
  assert.equal(context.displayRefs[0], "בראשית ל״ה, ב׳");
  assert.deepEqual(rows[0], [0, 35, 2]);
});
