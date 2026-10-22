import assert from "node:assert/strict";
import test from "node:test";
import {
  auditAhavatTorahLetterGlyphCounts,
  PRINTED_GLYPHS,
} from "../scripts/research/ahavat-torah-letter-glyph-count.mjs";

const mamCorpusDir = process.env.AHAVAT_TORAH_MAM_CORPUS;

test("DS-02 preserves the source's 27 printed glyph rows including final forms", { skip: !mamCorpusDir }, () => {
  const audit = auditAhavatTorahLetterGlyphCounts({ mamCorpusDir });
  assert.equal(PRINTED_GLYPHS.join(""), "אבגדהוזחטיכךלמםנןסעפףצץקרשת");
  assert.equal(audit.glyphs.length, 27);
  assert.equal(audit.rows.length, 54);
  assert.equal(audit.rows.length * audit.glyphs.length, 1458);
  assert.equal(audit.total, 304_805);
});

test("DS-02 corpus totals keep ordinary and final glyphs separate", { skip: !mamCorpusDir }, () => {
  const { glyphTotals, rows } = auditAhavatTorahLetterGlyphCounts({ mamCorpusDir });
  assert.deepEqual(glyphTotals, {
    א: 27059, ב: 16345, ג: 2109, ד: 7032, ה: 28056, ו: 30513, ז: 2198,
    ח: 7189, ט: 1804, י: 31531, כ: 8610, ך: 3358, ל: 21570, מ: 14466,
    ם: 10624, נ: 9867, ן: 4259, ס: 1833, ע: 11250, פ: 3975, ף: 830,
    צ: 2927, ץ: 1035, ק: 4695, ר: 18125, ש: 15595, ת: 17950,
  });
  assert.equal(rows.slice(0, 12).reduce((sum, row) => sum + row.counts.ה, 0), 6_283);
  assert.equal(glyphTotals.ז, 2_198);
});
