import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
  for(const path of ['src/components/research/RealityRiver2029.jsx','src/components/research/realityRiver2029.css']) {
    assert.equal(read(path),execFileSync('git',['show','510bd8b20f5918432b3ce0e83e9432e35c1510b4:'+path],{encoding:'utf8'}));
  }
  for(const path of ['src/components/WatchButton.jsx','src/components/followCenter2029/WatchControl2029.jsx','src/components/followCenter2029/watchControl2029.css']) {
    assert.equal(read(path),execFileSync('git',['show','a10bd229f06e06733fa03f21464818f4acccee79:'+path],{encoding:'utf8'}));
  }
});
