import test from "node:test";
import assert from "node:assert/strict";
import { FAMILIES, scanDesignFamilies } from "../scripts/lib/designFamilyScan2029.mjs";

// WARNING STAGE (ZURIEL 25.11.2026): this test reports and NEVER fails on counts. It only proves the scan works, so a later stage can turn a family into a ratchet.
test("design family scan reports candidates for review (warning only)", () => {
  const { totals, perFile } = scanDesignFamilies();
  assert.deepEqual(Object.keys(totals), Object.keys(FAMILIES));
  for (const [name, total] of Object.entries(totals)) {
    const top = Object.entries(perFile[name]).sort((a, b) => b[1] - a[1])[0];
    console.log(`# design-family warning · ${name}: ${total}${top ? ` (most: ${top[0]} ${top[1]})` : ""}`);
    assert.ok(Number.isInteger(total) && total >= 0);
  }
});

test("the scan itself recognises each family on a known sample", () => {
  assert.equal(FAMILIES["2 typography · font-size in px"].measure(".a{font-size:14px}.b{font-size:1rem}", "x.css"), 1);
  assert.equal(FAMILIES["3 colours · hex / rgb(a) literal"].measure(".a{color:#fff}.b{color:rgba(0,0,0,.5)}", "x.css"), 2);
  assert.equal(FAMILIES["3 colours · hex / rgb(a) literal"].measure(".a{color:#fff}", "src/components/experience2029/royal2029.css"), 0, "the Royal layer is the source");
  assert.equal(FAMILIES["9 forms · input/textarea/select control"].measure("<input /><textarea/>", "x.jsx"), 2);
});
