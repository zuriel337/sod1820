import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const world=read('src/pages/World2029Page.jsx');
const gallery=read('src/pages/Gallery2029Page.jsx');

test('World START leads with an existing public story before navigation, without a generic hero or source copy',()=>{
  const landing=world.split('function LiveWorldLanding')[1].split('function AnchoredWorld')[0];
  const body=landing.slice(landing.indexOf('\n  return <>'));
  const story=body.indexOf('<WorldFlightStory2029');
  const navigation=body.indexOf('aria-label="כניסה לעולם"');
  assert.ok(story>=0&&navigation>story);
  assert.match(body.slice(0,story),/activeView === WORLD_LANDING_VIEW.START/);
  assert.match(body.slice(0,story),/data-world-story-entry/);
  assert.match(read('src/pages/worldComposition2029.css'),/\[data-world-story-entry\][\s\S]*?\.sod29-flight-media \{\s*display: block;\s*grid-row: 1;/);
  assert.equal((body.match(/<WorldFlightStory2029/g)||[]).length,2,'existing Connections entry is retained, not simultaneously rendered on START');
  assert.match(body,/activeView === WORLD_LANDING_VIEW.CONNECTIONS/);
  assert.match(body,/to="\/world\?view=gallery"/);
  assert.doesNotMatch(body,/data-world-hero|createStory|new Graph|\.insert\(/);
});

test('Gallery uses the unchanged river view and source admission, with a single correctly attributed Follow',()=>{
  assert.match(gallery,/import \{ RealityRiver2029 \} from/);
  assert.match(gallery,/loadPublicRealityStream2029\(\{listHints:getRealityHints,fetchSourceContext:fetchGallerySourceContext\}\)/);
  const catalog=gallery.split('function GalleryCatalogBody()')[1].split('\nfunction ')[0];
  assert.ok(catalog.indexOf('data-gallery-entry-stream')<catalog.indexOf('id="gallery-catalog"'));
  assert.match(catalog,/follow=\{<RealityStreamFollow2029 source="gallery_catalog_2029" \/>\}/);
  assert.match(catalog,/!showStream \? <RealityStreamFollow2029 source="gallery_catalog_2029"/);
  assert.match(gallery,/const showStream=enabled&&includeStream&&!filters\.q&&!filters\.from&&!filters\.to&&!filters\.year/);
  assert.match(gallery,/!filters\.kind&&!filters\.nums\.length/);
  assert.match(gallery,/useGalleryReading\(location\.search,retry,true,true\)/);
  assert.doesNotMatch(gallery,/from\(["']gallery_images|stream_at\s*=|\.update\(/);
});

test('World Follow consumes the canonical2029 view while retaining its Topic target and consent boundary',()=>{
  const focus=world.split('function PublicWorldFindingFocus')[1].split('function LiveWorldLanding')[0];
  const follow=focus.match(/<WatchButton[\s\S]*?\/>/)[0];
  assert.match(follow,/topic=\{linkedFollow\.topic\}/);
  assert.match(follow,/variant="2029" noPush compact/);
  assert.match(follow,/followLabel=/);
  assert.doesNotMatch(follow,/checkbox|ghost|onClick|onShare|watchToggle/);
  for(const file of ['src/components/research/RealityStreamFollow2029.jsx','src/components/contributor2029/ContributorActionsController2029.jsx']) {
    const control=read(file).match(/<WatchButton[\s\S]*?\/>/)[0];
    assert.match(control,/variant="2029"/);
  }
});

test('Claude river source/styles and canonical Follow controller/styles are not locally redesigned',()=>{
  // Byte-for-byte pins (sha256 of the file bytes, so the check needs no git history: the original snapshot commits
  // 510bd8b2 / fba5cf57 are not on main and CI checks out shallow). Each file must equal the LAST owner-approved
  // version, so any new local edit by this surface still fails here and needs a deliberate, reviewed re-pin.
  // Provenance: `git show <commit>:<path> | sha256sum`. Originally accepted: river 510bd8b2, Follow fba5cf57. Approved since:
  //  - RealityRiver2029.jsx 1d9fac93 (DEF-008 gallery CLS: is-loading class, Follow after load, entity hub loaded on demand
  //    by the Home reader) on 42276956 (Step 2: palette2029 replaces the shared palette);
  //  - realityRiver2029.css 44b84c5f (DEF-008 reserved mat size) on 1d9fac93 (is-loading min-height);
  //  - WatchButton.jsx f0b541f4 (Legacy theme/palette contracts removed) on 71bb7646 (#1191: read-only action lock, thread variant);
  //  - WatchButton.jsx again on the Home follow branch (ZURIEL 18.11.2026 "פתוח לכולם, גם לאורחים": publicFollow opens only the
  //    reality-stream follow and the series bells in the public reading release; every other follow stays closed);
  //  - WatchControl2029.jsx 42276956 (palette2029); watchControl2029.css unchanged since fba5cf57;
  //  - WatchControl2029.jsx + watchControl2029.css e46e08be (S-59, ZURIEL 25.11.2026 "טפל בקפיצות התצוגה ... באמצעות תיקון ממוקד"): the live check line
  //    and the explainer share one slot so the box does not grow 24 px; no colour, type, wording or control change.
  const pins={
    'src/components/research/RealityRiver2029.jsx':'9a496e612666bd986e07eaa86c0de6726b7d31381bd044bc8268ddf9d9d92793',
    'src/components/research/realityRiver2029.css':'951246e810316699eafd7f003978d8c63e29ac8741bfea2ccda7a898b6016d68',
    'src/components/WatchButton.jsx':'72cc88ceea81bd2bd36320f05bd9a6901f63b61ad91c6243e77527eac1cf5588',
    'src/components/followCenter2029/WatchControl2029.jsx':'eaf32fb6164ae34d83d1c8f169b9656647043d2e532ed344a45cc6c0c8c83a90',
    'src/components/followCenter2029/watchControl2029.css':'d853f2561507742c810c6d45bf6439e1665d8fe49903d0e22e1aa5033ec67c03',
  };
  for(const [path,sha256] of Object.entries(pins)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),sha256,
      path+' differs from its last approved version; inspect with git diff <approved commit> -- '+path);
  }
});
