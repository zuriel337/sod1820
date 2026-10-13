import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildTopicSourceContext, topicSourceContextPatch } from "./topicSourceContext.js";
import { retainTopicSourceReturn, resolveJourneySourceReturn } from "./journeySourceReturn.js";
import { continueResearchPathContext, buildResearchPathRepresentation, contextFromResearchPathSnapshot } from "./researchPathRuntime.js";

const fixture = JSON.parse(fs.readFileSync(new URL("../../../test/fixtures/topic-source-context-pilot.json", import.meta.url)));
const number = { subject: { type: "number", id: "1237", href: "/2029/number/1237" }, selection: { entityId: "1237", entityType: "number", method: "regular" } };
// Consume the delivered source builder/fixture, not a second source catalogue.
for (const slug of ["india-axis", "1237", "hodu"]) {
  test(`${slug}: source identity survives Number, explicit start and resume; access re-read`, async () => {
    const topic = fixture.topics.find((t) => t.slug === slug);
    const data = buildTopicSourceContext({ ...fixture, topic, occurrences: fixture.images });
    const item = slug === "india-axis" ? data.items.find((i) => i.postPlacement) : data.items[0];
    assert.ok(item);
    const context = { subject: { id: slug, type: "topic", label: topic.title }, ...topicSourceContextPatch(item, topic) };
    const entered = retainTopicSourceReturn(context, number);
    assert.equal(entered.journey, null);
    assert.equal(entered.returnTo.selection.sourceRef, item.reopen.selection.sourceRef);
    assert.equal(entered.returnTo.selection.versionRef, null);
    const started = continueResearchPathContext(entered).context;
    assert.equal(started.journey.pendingSteps.length, 2);
    const snapshot = { ok: true, path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revision_no: 1, steps: started.journey.pendingSteps, representation: buildResearchPathRepresentation(started) };
    const restored = contextFromResearchPathSnapshot(snapshot);
    assert.equal(restored.returnTo.href, item.reopen.topicHref);
    assert.equal((await resolveJourneySourceReturn(restored.returnTo, async () => data)).ok, true);
    const replaced = { ...data, items: data.items.map((entry) => ({ ...entry, sourceIdentity: { ref: "different-storage-object" } })) };
    assert.equal((await resolveJourneySourceReturn(restored.returnTo, async () => replaced)).ok, false, "same gallery row with different media is not the same source");
    for (const denied of [{ ...data, items: [] }, { ...data, access: { available: false } }]) {
      assert.equal((await resolveJourneySourceReturn(restored.returnTo, async () => denied)).ok, false);
    }
    assert.equal((await resolveJourneySourceReturn(restored.returnTo, async () => { throw Error("offline"); })).ok, false);
    if (slug === "hodu") { assert.equal(data.items.length, 1); assert.equal(item.occurrences.length, 2); }
  });
}
test("878 and unrelated returns remain untouched; unsafe locator rejected", () => {
  const n878 = { ...number, subject: { type: "number", id: "878" }, returnTo: { href: "/world" } };
  assert.equal(retainTopicSourceReturn({ subject: { type: "number", id: "878" } }, n878), n878);
  assert.equal(retainTopicSourceReturn({ subject: { type: "topic", id: "1237" }, selection: { entityType: "image", sourceRef: "x", locator: "//evil" } }, n878), n878);
});
