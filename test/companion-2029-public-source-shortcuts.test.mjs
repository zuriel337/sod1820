import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("2029 Companion exposes the three EXISTING public source destinations", () => {
  const companion = read("src/components/experience2029/CompanionPanel2029.jsx");
  assert.match(companion, /OrGeulaStoryColumn variant="shortcut"/);
  assert.match(companion, /world\?source=tzvi-opoc#world-contributor-material/);
  assert.match(companion, /world\?source=sod-hashmal#world-corpus-sod-hashmal/);
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
  assert.match(world, /new URLSearchParams\(location\.search\)\.get\("source"\)/);
  assert.match(world, /source === "tzvi-opoc"/);
  assert.match(world, /source === "sod-hashmal"/);
  assert.match(world, /setCorpusKey\("sod-hashmal"\)/);
  assert.match(world, /setWriterFilter\("tzvi-opoc"\)/);
  const css = read("src/components/experience2029/companionPanel2029.css");
  assert.match(css, /min-block-size: 44px/);
  assert.match(css, /sod29-or-geula-shortcut\.is-new/);
});
