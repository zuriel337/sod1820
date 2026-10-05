import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ENTRY_ARRIVAL,
  LEARN_FRAGMENTS,
  buildEntryLearnTelemetry,
  buildLearnHelpSeed,
  classifyEntryArrival,
  getEntryOrientationManifest,
  isEntryLearnSurfaceActive,
  projectAvailability,
  resolveEntryOrientation,
} from "../src/lib/entryLearn2029.js";
import { EXPERIENCE_SURFACE, resolveExperienceContext } from "../src/lib/experienceContext.js";

assert.equal(classifyEntryArrival({ locationState: { sodEntryArrival: "exact_return" }, historyIndex: 3 }), ENTRY_ARRIVAL.EXACT_RETURN);
assert.equal(classifyEntryArrival({ locationState: { sodEntryArrival: "internal" }, historyIndex: 0 }), ENTRY_ARRIVAL.INTERNAL);
assert.equal(classifyEntryArrival({ locationKey: "default", historyIndex: null }), ENTRY_ARRIVAL.DIRECT);
assert.equal(classifyEntryArrival({ historyIndex: 0 }), ENTRY_ARRIVAL.DIRECT);
assert.equal(classifyEntryArrival({ historyIndex: 2 }), ENTRY_ARRIVAL.INTERNAL);

const postManifest = getEntryOrientationManifest("post");
assert.ok(postManifest);
assert.equal(resolveEntryOrientation({ surface: "post", arrival: "direct" }).mode, "prominent");
assert.equal(resolveEntryOrientation({ surface: "post", arrival: "internal" }).mode, "compact");
assert.equal(resolveEntryOrientation({ surface: "post", arrival: "exact_return" }).mode, "hidden");
assert.equal(isEntryLearnSurfaceActive("post"), true);
assert.equal(isEntryLearnSurfaceActive("number"), false);
assert.equal(resolveEntryOrientation({ surface: "number", arrival: "direct" }).mode, "hidden");
assert.equal(resolveEntryOrientation({
  surface: "post",
  arrival: "direct",
  familiarity: { state: "complete", v: 1 },
}).mode, "compact");
assert.equal(resolveEntryOrientation({
  surface: "post",
  arrival: "direct",
  familiarity: { state: "complete", v: 0 },
}).mode, "prominent");
assert.equal(resolveEntryOrientation({
  surface: "post",
  arrival: "direct",
  familiarity: { state: "complete", v: 0 },
}).mode, "prominent");

assert.equal(projectAvailability({ status: "active" }), "OPEN");
assert.equal(projectAvailability({ status: "registered_only" }), "GATED");
assert.equal(projectAvailability({ status: "building" }), "BUILDING");
assert.equal(projectAvailability({ status: "unknown" }), "LATER");

const payload = buildEntryLearnTelemetry("learn_opened", {
  entrySurface: "post",
  conceptKey: "method",
  layer: "explain",
  actionId: "open_number",
  targetSurface: "number",
  manifestVersion: 1,
  // Unrecognized/free-text keys are intentionally not part of the builder contract.
  expression: "משיח",
  prompt: "private text",
});
assert.equal(payload.surface, "entry_2029");
assert.equal(payload.eventType, "learn_opened");
assert.equal(payload.options.props.entry_surface, "post");
assert.equal(payload.options.props.concept_key, "method");
assert.equal(Object.hasOwn(payload.options.props, "expression"), false);
assert.equal(Object.hasOwn(payload.options.props, "prompt"), false);

const helpPayload = buildEntryLearnTelemetry("learn_help_requested", {
  entrySurface: "post",
  conceptKey: "method",
  layer: "explain",
  actionId: null,
  expression: "מלח",
  prompt: "still confused",
});
assert.equal(helpPayload.eventType, "learn_help_requested");
assert.equal(helpPayload.options.props.concept_key, "method");
assert.equal(Object.hasOwn(helpPayload.options.props, "expression"), false);
assert.equal(Object.hasOwn(helpPayload.options.props, "prompt"), false);
assert.match(buildLearnHelpSeed("method"), /שיטת הגימטריה/);
assert.doesNotMatch(buildLearnHelpSeed("method"), /מלח|משיח|נחש/);

assert.match(LEARN_FRAGMENTS.method.explain, /שיטה/);
assert.match(LEARN_FRAGMENTS.relation.explain, /שוויון מספרי/);
assert.match(LEARN_FRAGMENTS.interpretation.explain, /פרשנות/);

const topic = resolveExperienceContext({ surface: EXPERIENCE_SURFACE.TOPIC, locale: "he-IL" });
assert.equal(topic.surface, "topic");
assert.equal(topic.experience.question, "מה מחבר את הציר הזה?");

const systemFrame = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const postPage = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
const topicPage = fs.readFileSync("src/pages/Topic2029Page.jsx", "utf8");
const rail = fs.readFileSync("src/components/experience2029/SurfaceContextRail2029.jsx", "utf8");
const numberDrawer = fs.readFileSync("src/components/number2029/NumberDrawer2029.jsx", "utf8");
const learnMark = fs.readFileSync("src/components/experience2029/LearnMark2029.jsx", "utf8");
const gateway = fs.readFileSync("src/components/ContactGateway.jsx", "utf8");

assert.match(systemFrame, /resolveEntryOrientation/);
assert.match(systemFrame, /sodEntryArrival: "exact_return"/);
assert.match(systemFrame, /<LearnMark2029/);
assert.match(systemFrame, /import ContactGateway from "\.\.\/ContactGateway\.jsx"/);
assert.match(systemFrame, /onNeedHelp=\{openIssueReport\}/);
assert.match(learnMark, /עדיין לא ברור\?/);
assert.match(gateway, /buildContactGatewayContext/);
assert.match(gateway, /learnStage/);
assert.match(gateway, /actionTried/);
assert.match(rail, /continued_to_research/);
assert.match(rail, /learn_help_requested/);
assert.match(rail, /onStillUnclear=\{askForLearnHelp\}/);
assert.match(rail, /ההסבר רק מתאר את המוקד הפעיל; הוא אינו מחשב את הערך בעצמו/);
assert.match(rail, /surfaceMapLabel/);
assert.match(rail, /GematriaReveal2029/);
assert.match(rail, /interactive/);
assert.match(postPage, /surfaceSections: regions\.map/);
assert.match(postPage, /surfaceMapLabel: "בתוך הפוסט"/);
assert.match(postPage, /shell\.openInspect\?\./);
assert.doesNotMatch(postPage, /source: "post-contextual-focus",[\s\S]{0,120}shell\.openNumber/);
assert.match(topicPage, /surface="topic"/);
assert.match(topicPage, /surfaceSections: navItems\.map/);
assert.match(topicPage, /surfaceMapLabel: "בתוך הציר"/);
assert.match(numberDrawer, /targetMethodKey\s*\|\|\s*clean\(context\?\.selection\?\.method\)/);
assert.match(numberDrawer, /targetNumber\s*\?\?\s*targetResultRoot\s*\?\?\s*contextRoot/);
assert.match(numberDrawer, /fetchGematriaMethodTrace\(key, expr\)/);

console.log("Entry Orientation + Contextual Learn 2029 smoke gate: PASS");
