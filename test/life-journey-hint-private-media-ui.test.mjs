import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Life Journey private hint media reuses the existing owner, transport and row", async () => {
  const [adapter, hints, surface, person, maps, capabilities] = await Promise.all([
    read("src/lib/research/lifeJourneyHintMedia.js"),
    read("src/lib/hints.js"),
    read("src/components/experience2029/LifeJourneyHints2029.jsx"),
    read("src/components/PersonJourney.jsx"),
    read("src/components/experience2029/LifeJourneyMaps2029.jsx"),
    read("src/components/experience2029/LifeJourneyCapabilities2029.jsx"),
  ]);

  assert.match(adapter, /uploadResumableMedia/);
  assert.match(adapter, /owner_kind: "research_item_hint"/);
  assert.match(adapter, /action: "verify_hint_media"/);
  assert.match(adapter, /action: "bind_hint_media"/);
  assert.match(adapter, /action: "read_hint_media"/);
  assert.match(adapter, /action: "detach_hint_media"/);
  assert.match(adapter, /action: "retry_hint_media_cleanup"/);
  assert.match(adapter, /cache: "no-store"/);
  assert.match(adapter, /session\.user\?\.id !== expected/);
  assert.match(adapter, /storageObjectId: bound\.storage_object_id/);
  assert.doesNotMatch(adapter, /localStorage|sessionStorage|telemetry|track\(|console\.|uploadHintImage|gallery|community_hints|Raziel|ELS|ai-analyze/i);

  assert.match(hints, /metadata, media, created_at/);
  assert.match(hints, /media: normalizePrivateMedia\(row\.media\)/);
  assert.match(surface, /CanonicalProgress/);
  assert.match(surface, /צרף תמונה פרטית/);
  assert.match(surface, /URL חתום קצר־מועד/);
  assert.match(surface, /רמז מקומי של אורח אינו מועלה/);
  assert.match(surface, /detachLifeJourneyHintImage/);
  assert.doesNotMatch(surface, /uploadHintImage|gallery|community_hints/);
  assert.match(person, /onRefreshHints=\{refreshPrivateHints\}/);
  assert.match(maps, /hintUserId=\{hintUserId\}/);
  assert.match(capabilities, /userId=\{user\?\.id \|\| null\}/);
});
