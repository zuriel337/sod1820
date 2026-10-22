import test from "node:test";
import assert from "node:assert/strict";

import {
  channelUpdateOccurrenceId,
  contributorSourceLibraryHref,
  contributorSourceLocator,
  sourceOccurrenceElementId,
} from "./worldContributorSourceLocator.js";

const SOURCE_REF = "channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14#finding";

test("contributor occurrence links stay inside the public World source library", () => {
  const locator = contributorSourceLocator(SOURCE_REF, { slug: "tzvi-opoc" });
  assert.equal(locator.exact, true);
  assert.equal(locator.occurrenceId, "a6805e30-21e0-4315-8f35-70b1bfdb0d14");
  assert.match(locator.href, /^\/world\?view=sources&source=tzvi-opoc&sourceRef=/);
  assert.match(locator.href, /#source-occurrence-a6805e30-21e0-4315-8f35-70b1bfdb0d14$/);
  assert.equal(sourceOccurrenceElementId(SOURCE_REF), "source-occurrence-a6805e30-21e0-4315-8f35-70b1bfdb0d14");
  assert.equal(channelUpdateOccurrenceId(SOURCE_REF), "a6805e30-21e0-4315-8f35-70b1bfdb0d14");
});

test("non-channel provenance falls back to the contributor library without claiming exactness", () => {
  const locator = contributorSourceLocator("legacy-spatial-model/example", { slug: "tzvi-opoc" });
  assert.deepEqual(locator, {
    ref: "legacy-spatial-model/example",
    exact: false,
    occurrenceId: null,
    href: contributorSourceLibraryHref("tzvi-opoc"),
  });
});
