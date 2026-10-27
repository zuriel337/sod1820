import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detectChannelAudio, isChannelMessageType } from "../supabase/functions/wa-channel-ingest/channelAudio.mjs";

const read = p => readFileSync(p,"utf8");
test("recognized Green API voice message type", () => {
 assert.equal(isChannelMessageType("audioMessage"), true);
 assert.equal(isChannelMessageType("textMessage"), true);
 assert.equal(isChannelMessageType("reactionMessage"), false);
});
test("audio signature matches actual bytes and prevents HTML error pages", () => {
 const ogg = Uint8Array.from([79,103,103,83,0,2,1,0]);
 assert.deepEqual(detectChannelAudio(ogg,"audio/ogg"),{mime:"audio/ogg",ext:"ogg"});
 assert.equal(detectChannelAudio(ogg,"text/html"),null);
 assert.equal(detectChannelAudio(new TextEncoder().encode("<html>error</html>"),"audio/ogg"),null);
});
test("voice media source persists before channel update; checkpoint cannot skip failed audio", () => {
 const code=read("supabase/functions/wa-channel-ingest/index.ts");
 assert.match(code,/isChannelMessageType\(typ\)/);
 assert.match(code,/isAud \? "audio"/);
 assert.match(code,/earliestAudioFailure/);
 assert.match(code,/audio-upload-retry/);
 assert.match(code,/if \(isAud && !imageUrl\)/);
});
test("Or Geula Legacy catalog keeps text-only entries and paginates", () => {
 const code=read("src/pages/OrGeulaPage.jsx");
 assert.doesNotMatch(code,/\.not\("image_url", "is", null\)/);
 assert.match(code,/טען עוד עדכונים/);
 assert.match(code,/<audio /);
 assert.match(code,/open\.image_url/);
});
test("Legacy Now keeps mixed cap by default, but Or Geula-only mode is complete and plays voice on demand", () => {
 const code=read("src/components/LiveChannelFeed.jsx");
 assert.match(code,/orGeulaOnly\s*\?/);
 assert.match(code,/כל אור הגאולה/);
 assert.match(code,/טען עוד הודעות מאור הגאולה/);
 assert.match(code,/<audio controls preload="none"/);
 assert.match(code,/applyCaps\(visible\)/);
});
