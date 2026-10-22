import assert from "node:assert/strict";
import test from "node:test";

import {
  ZVI_PUBLIC_CONTRIBUTOR,
  publicContributorHref,
  publicContributorIdentity,
  publicWorldSourceHref,
} from "../src/lib/research/publicContributorIdentity.js";

test("reviewed Zvi credits always resolve to one public canonical author page", () => {
  for (const credit of ["צבי", "צבי (OPOC)", "צבי opoc", "TZVI", "tzvi-opoc", "Zvi (OPOC)"]) {
    assert.equal(publicContributorIdentity(credit), ZVI_PUBLIC_CONTRIBUTOR, credit);
    assert.equal(publicContributorHref(credit), "/world?view=sources&source=tzvi-opoc#world-contributor-material");
  }
});

test("unknown or ambiguous credits are never guessed as Zvi", () => {
  for (const credit of [null, "", "חוקר", "כתב: צבי ואחרים", "צבי כהן"]) {
    assert.equal(publicContributorIdentity(credit), null, String(credit));
    assert.equal(publicContributorHref(credit), null, String(credit));
    assert.equal(publicWorldSourceHref(credit), "/world#world-sources", String(credit));
  }
});
