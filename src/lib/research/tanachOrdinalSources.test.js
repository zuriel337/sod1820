import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchTanachVerseByOrdinal,
  technicalOrdinalRequest,
  TANACH_ORDINAL_SCOPE,
  TANACH_ORDINAL_SCHEME,
} from "./tanachOrdinalSources.js";

test("technical ordinal request is explicit about scope and current-corpus scheme", () => {
  const req = technicalOrdinalRequest(358, { scope: "torah" });
  assert.equal(req.ok, true);
  assert.equal(req.ordinal, 358);
  assert.equal(req.offset, 357);
  assert.equal(req.scope, TANACH_ORDINAL_SCOPE.TORAH);
  assert.equal(req.countingScheme, TANACH_ORDINAL_SCHEME);
});

test("book ordinal requires an explicit book and invalid ordinals fail closed", () => {
  assert.equal(technicalOrdinalRequest(0).status, "invalid_ordinal");
  assert.equal(technicalOrdinalRequest("x").status, "invalid_ordinal");
  assert.equal(technicalOrdinalRequest(358, { scope: "book" }).status, "book_required");
  assert.equal(technicalOrdinalRequest(358, { scope: "unknown" }).status, "invalid_scope");
});

test("technical ordinal result never claims source counting-scheme equivalence", async () => {
  const out = await fetchTanachVerseByOrdinal(5785, {
    scope: "torah",
    fetchRow: async (request) => {
      assert.equal(request.offset, 5784);
      return {
        count: 5846,
        row: {
          book_idx: 4,
          book: "דברים",
          chapter: 32,
          verse: 32,
          text: "כימגפן סדם גפנם ומשדמת עמרה ענבמו ענבירוש אשכלת מררת למו",
        },
      };
    },
  });

  assert.equal(out.status, "ready");
  assert.equal(out.totalInScope, 5846);
  assert.equal(out.verse.ref, "דברים 32:32");
  assert.equal(out.governance.technicalProjection, true);
  assert.equal(out.governance.sourceCountingSchemeInferred, false);
  assert.equal(out.governance.semanticProof, false);
  assert.equal(out.governance.truthPromotion, false);
});

test("out-of-range is explicit and does not manufacture a verse", async () => {
  const out = await fetchTanachVerseByOrdinal(9999, {
    scope: "torah",
    fetchRow: async () => ({ count: 5846, row: null }),
  });
  assert.equal(out.status, "out_of_range");
  assert.equal(out.verse, null);
  assert.equal(out.totalInScope, 5846);
});


test("book-scoped ordinal preserves the Post 976 Deuteronomy mismatch as technical evidence", async () => {
  const out = await fetchTanachVerseByOrdinal(358, {
    scope: "book",
    book: "דברים",
    fetchRow: async (request) => {
      assert.equal(request.scope, TANACH_ORDINAL_SCOPE.BOOK);
      assert.equal(request.book, "דברים");
      assert.equal(request.offset, 357);
      return {
        count: 955,
        row: {
          book_idx: 4,
          book: "דברים",
          chapter: 12,
          verse: 13,
          text: "השמר לך פןתעלה עלתיך בכלמקום אשר תראה",
        },
      };
    },
  });

  assert.equal(out.verse.ref, "דברים 12:13");
  assert.equal(out.countingScheme, TANACH_ORDINAL_SCHEME);
  assert.equal(out.governance.sourceCountingSchemeInferred, false);
});
