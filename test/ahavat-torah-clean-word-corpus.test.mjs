import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  compareWordBoundaries,
  normalizeHebrewLetters,
  parseMichiganKorenText,
  tokenizeKetivVerse,
} from "../scripts/research/ahavat-torah-clean-word-corpus.mjs";

test("the canonical local Torah prefix has the clean-corpus fingerprint", () => {
  const stream = normalizeHebrewLetters(fs.readFileSync("tools/els/data/tk-letters.txt", "utf8")).slice(0, 304_805);
  assert.equal(stream.length, 304_805);
  assert.equal(createHash("sha256").update(stream).digest("hex"), "9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4");
});

test("ketiv tokenization splits maqaf and rejects Masoretic punctuation tokens", () => {
  assert.deepEqual(
    tokenizeKetivVerse("מִימִינ֕וֹ אשדת לָֽמוֹ׃ ׀ הֲ־לַיהוָה"),
    ["מימינו", "אשדת", "למו", "ה", "ליהוה"],
  );
});

test("Michigan-Claremont Koren parsing preserves source word spaces", () => {
  assert.deepEqual(parseMichiganKorenText("5 23 6 HLYHWH TGMLW Z)T\n"), ["הליהוה", "תגמלו", "זאת"]);
});

test("the 79,977/79,976 model has one boundary: ה | ליהוה versus הליהוה", () => {
  const maqafSplit = ["דור", "עקש", "ופתלתל", "ה", "ליהוה", "תגמלו", "זאת"]
    .map((word) => ({ word, book: "Deuteronomy", chapter: 32, verse: 6 }));
  const koren = ["דור", "עקש", "ופתלתל", "הליהוה", "תגמלו", "זאת"]
    .map((word) => ({ word, book: "Deuteronomy" }));
  const difference = compareWordBoundaries(maqafSplit, koren);

  assert.equal(difference.onlyLeft.length, 1);
  assert.equal(difference.onlyRight.length, 0);
  assert.equal(difference.onlyLeft[0].before.word, "ה");
  assert.equal(difference.onlyLeft[0].after.word, "ליהוה");
  assert.equal(difference.onlyLeft[0].joinedOnRight.word, "הליהוה");
});
