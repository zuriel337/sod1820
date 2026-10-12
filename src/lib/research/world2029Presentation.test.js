import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildTopicSourceContext, INDIA_CAPTAIN_SOURCE } from "./topicSourceContext.js";
import { buildWorldSourceStory, worldSourceStoryContext } from "./world2029Presentation.js";
import { normalizeResearchContext } from "./researchContext.js";

const fixture = JSON.parse(fs.readFileSync(new URL("../../../test/fixtures/topic-source-context-pilot.json", import.meta.url)));
const project = (changes = {}) => buildTopicSourceContext({ ...fixture, topic: fixture.topics.find((t) => t.slug === "india-axis"), occurrences: fixture.images, ...changes });

test("World consumes the exact public witness without copying its media/history or inventing a number", () => {
  const projection = project(), snapshot = JSON.stringify(projection);
  const story = buildWorldSourceStory(projection);
  assert.equal(story.item, projection.items.at(-1));
  assert.equal(story.item.postPlacement.originalCaption, INDIA_CAPTAIN_SOURCE.requiredCaption);
  assert.match(story.reason, /אזרח הודי/);
  const context = normalizeResearchContext(worldSourceStoryContext(story));
  assert.equal(context.selection.sourceRef, story.item.reopen.selection.sourceRef);
  assert.equal(context.dimensions.surfaceFocus.reference, story.item.sourceIdentity.ref);
  assert.equal(context.journey, null);
  assert.equal(context.selection.resultValue, null);
  assert.equal(context.dimensions.surfaceFocus.number, undefined);
  assert.equal(JSON.stringify(projection), snapshot);
});

test("unavailable/private/changed post witness cannot fall back to a number or another gallery association", () => {
  for (const projection of [null, project({ post: null }), project({ post: { ...fixture.post, tags: ["טיוטה"] } }),
    project({ post: { ...fixture.post, content: fixture.post.content.replace("אזרח הודי", "אזרח") } }),
    { ...project(), access: { available: false, scope: "public" } },
    { ...project(), access: { available: true, scope: "private" } },
    { ...project(), topicSlug: "1237" }]) assert.equal(buildWorldSourceStory(projection), null);
});

test("documented relation and canonical source identity are required even when title and post match", () => {
  const projection = project(), source = projection.items.at(-1);
  for (const change of [{ contextRelations: [{ relationKind: "numeric_similarity" }] }, { sourceIdentity: null }, { access: { scope: "private" } }]) {
    assert.equal(buildWorldSourceStory({ ...projection, items: [{ ...source, ...change }] }), null);
  }
});
