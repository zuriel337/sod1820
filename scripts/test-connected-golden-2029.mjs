import assert from "node:assert/strict";
import fs from "node:fs";
import { EXPERIENCE_SURFACE, getExperienceSurfaceProfile } from "../src/lib/experienceContext.js";
import { resolve2029Palette } from "../src/lib/paletteTokens2029.js";

const read=(p)=>fs.readFileSync(p,"utf8");
const app=read("src/App2029.jsx");
const frame=read("src/components/experience2029/SystemFrame2029.jsx");
const home=read("src/pages/Home2029Page.jsx");
const post=read("src/pages/Post2029Page.jsx");
// One shared rail: SystemFrame mounts SurfaceContextRail2029 for every surface and Post only adds section navigation
// (the former per-Post ReadingContextRail2029 was removed from Post2029Page in d88ddd50; test/post2029-living-tree-infra.test.mjs
// forbids a duplicate Post rail).
const rail=read("src/components/experience2029/SurfaceContextRail2029.jsx");
const palette=read("src/lib/paletteTokens2029.js");
const paletteHook=read("src/lib/palette2029.js");

assert.match(app,/path="\/post\/:slug"/);
assert.match(home,/Home2029/);
assert.match(post,/SurfaceSectionNav2029/);
assert.equal(/<ReadingContextRail2029/.test(post),false);
assert.match(frame,/showContextRail \? <SurfaceContextRail2029[\s\S]{0,600}?onAskRaziel=\{razielLocked \? null :/);
// The in-page rail and the mobile context sheet both honour the Raziel lock.
assert.ok((frame.match(/<SurfaceContextRail2029[\s\S]{0,900}?onAskRaziel=\{razielLocked \? null :/g) || []).length >= 2);
assert.match(rail,/שאל את רזיאל/);
assert.match(frame,/sod29-header closed-orientation/);
assert.match(frame,/sod29-command-island/);
assert.match(frame,/גילוי וכלים/);
assert.match(frame,/התמקד בזה/);
assert.match(frame,/＋ שמור/);
assert.equal(frame.includes("קבע כפוקוס מחקר"),false);
assert.equal(frame.includes("הוסף למחקר"),false);
// Heichal lab environment (Design Contract V2 section 6: environment is a projection over the selected preset, not a fourth theme).
// The Legacy PALETTES.labDark/labLight and PaletteProvider were replaced by the research_lab environment role resolved over
// the three user presets and the 2029 Palette2029Provider.
assert.equal(getExperienceSurfaceProfile(EXPERIENCE_SURFACE.HEICHAL).environment, "research_lab");
assert.match(frame,/use2029Palette\(experience\?\.experience\?\.environmentRole \|\| null\)/);
assert.match(frame,/<Palette2029Provider value=\{palette\}>/);
assert.match(paletteHook,/resolve2029Palette\(preset, environmentRole\)/);
assert.match(palette,/RESEARCH_LAB_V2/);
const LAB_PAGE_BG = { light: "#EEF5FF", parchment: "#F3EEE4", dark: "#0B0907" };
for (const [preset, pageBg] of Object.entries(LAB_PAGE_BG)) {
  const lab = resolve2029Palette(preset, "research_lab");
  assert.equal(lab.pageBg, pageBg, `research_lab pageBg in ${preset}`);
  assert.equal(lab.environmentRole, "research_lab");
  assert.equal(lab.preset, preset, "the environment never replaces the user-selected preset");
  assert.equal(lab.accent, resolve2029Palette(preset).accent, "environment changes surfaces, not the action role");
  assert.equal(resolve2029Palette(preset, "dark_observatory").environmentRole, undefined, "only research_lab is projected");
}
assert.notEqual(resolve2029Palette("light", "research_lab").pageBg, resolve2029Palette("light").pageBg);
assert.match(post,/returnTo:\s*exactReturn/);
console.log("Connected Golden 2029 contract: PASS");
