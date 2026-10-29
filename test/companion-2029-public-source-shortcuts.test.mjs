import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveWorldLandingView, WORLD_LANDING_VIEW } from "../src/lib/research/worldLandingNavigation.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("2029 Companion exposes the three EXISTING public source destinations", () => {
  const companion = read("src/components/experience2029/CompanionPanel2029.jsx");
  assert.match(companion, /OrGeulaStoryColumn variant="shortcut"/);
  assert.equal((companion.match(/world\?subjectSource=zvi#world-public-content-map/g) || []).length, 2);
  assert.equal((companion.match(/world\?subjectSource=hashmal#world-public-content-map/g) || []).length, 2);
  const sourceMap = read("src/components/research/WorldPublicSourceSubjects2029.jsx");
  assert.match(sourceMap, /id="world-public-content-map"/);
  assert.match(companion, /sod29-companion-source-quick is-slim/);
  assert.match(companion, /sod29-companion-source-quick is-expanded/);
});

test("Or Geula shortcut reuses the canonical source reader and viewer", () => {
  const stories = read("src/components/OrGeulaStoryColumn.jsx");
  assert.match(stories, /if \(variant === "shortcut"\)/);
  assert.match(stories, /<StoryViewer items=\{rows\}/);
  assert.match(stories, /supabase\.from\("channel_updates"\)/);
  assert.match(stories, /hasNew = shown\.some\(\(row\) => isNewFresh\(row, seen\)\)/);
});

test("World source selector changes view only, never source authorizations", () => {
  const world = read("src/pages/World2029Page.jsx");
  const sourceMap = read("src/components/research/WorldPublicSourceSubjects2029.jsx");
  for (const source of ["zvi", "hashmal"]) {
    assert.equal(resolveWorldLandingView({ search: `?subjectSource=${source}`, hash: "#world-public-content-map" }), WORLD_LANDING_VIEW.SOURCES);
  }
  assert.match(world, /activeView === WORLD_LANDING_VIEW\.SOURCES/);
  assert.match(world, /<WorldPublicSourceSubjects2029/);
  assert.match(sourceMap, /new URLSearchParams\(location\.search\)\.get\("subjectSource"\)/);
  assert.match(sourceMap, /requested === "zvi" \|\| requested === "hashmal"/);
  assert.match(sourceMap, /setOrigin\(requested\)/);
  assert.match(sourceMap, /source=tzvi-opoc#world-contributor-material/);
  assert.match(sourceMap, /source=sod-hashmal#world-corpus-sod-hashmal/);
  const css = read("src/components/experience2029/companionPanel2029.css");
  assert.match(css, /min-block-size: 44px/);
  assert.match(css, /sod29-or-geula-shortcut\.is-new/);
});

test("public visitor sees the authorized context Inspector, but not the admin Projector or Event Sequence", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /companionActive = companionWide && surface !== "control"/);
  assert.match(frame, /feed = useSystemFeed2029\(\{ enabled: surface !== "control" \}\)/);
  assert.match(frame, /companionHasContext = showContextRail && !numberPageRoute/);
  assert.match(frame, /companionHasSequence = !corePublicViewer && hasEventSequence/);
  assert.match(frame, /showContextRail && !\(companionActive && companionHasContext\)/);
});
