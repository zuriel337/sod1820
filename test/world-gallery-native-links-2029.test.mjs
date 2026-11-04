import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildGallerySourceContext, gallerySourceHref2029, galleryItemSourceHref2029 } from '../src/lib/research/topicSourceContext.js';
import { buildPublicMediaContentProjection } from '../src/lib/research/worldKnowledgeContentProjection.js';
import { buildElectionWorldContentProjection } from '../src/lib/research/worldElectionContentProjection.js';

const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002';
const image=(id,gallery)=>({id,wp_gallery_id:gallery,ordering:4,published:1,min_tier:0,
  image_url:'https://example.test/storage/v1/object/public/media/shared.jpg',name:'כותרת מקור',description:'כיתוב מקורי'});
const sources=()=>buildGallerySourceContext({images:[image(a,28),image(b,54)]});

test('every historical occurrence opens its own native image and retains the original address separately',()=>{
  const [item]=sources();assert.equal(item.occurrences.length,2);
  assert.deepEqual(item.reopen.galleries.map(r=>r.href),[gallerySourceHref2029(28,a),gallerySourceHref2029(54,b)]);
  assert.deepEqual(item.reopen.galleries.map(r=>r.legacyHref),['/archive?tab=galleries&gal=28','/archive?tab=galleries&gal=54']);
  assert.equal(galleryItemSourceHref2029(item,b),gallerySourceHref2029(54,b));
  assert.equal(item.occurrences[1].legacyPlacement.originalCaption,'כיתוב מקורי');
});

test('media and election map sources open the selected source rather than the first shared appearance',()=>{
  const [base]=sources();const item={...base,galleryImageId:b,sourceRef:`gallery_images:${b}`,provenance:{...base.provenance,sourceRef:`gallery_images:${b}`}};
  const media=buildPublicMediaContentProjection([item]);
  const bundle={sources:[{id:'shared-b',canonicalRef:`gallery-image:${b}`,label:'מקור',accessTier:'public'}],branchContract:{evidenceRecords:[]},resultBundle:{findings:[]}};
  const election=buildElectionWorldContentProjection({bundle,galleryItems:[item]});
  for(const projection of[media,election]){
    assert.equal(projection.sources[0].sourceRef,`gallery_images:${b}`);
    assert.equal(projection.sources[0].sourceHref,gallerySourceHref2029(54,b));
    assert.equal(projection.occurrences[0].href,gallerySourceHref2029(54,b));
    assert.equal(projection.treeRelations.length,0);
  }
});

test('missing, inaccessible or conflicting placements never fall back to an archive or another image',()=>{
  const [item]=sources();
  const conflicting={...item.occurrences[1],legacyPlacement:{...item.occurrences[1].legacyPlacement,wpGalleryId:81}};
  for(const bad of[{...item,access:{scope:'private'}},{...item,access:{scope:'public',available:false}},
    {...item,occurrences:[]},{...item,occurrences:[...item.occurrences,conflicting]},
    {...item,occurrences:[{...item.occurrences[1],provenance:{sourceRef:`gallery_images:${a}`}}]}]){
    assert.equal(galleryItemSourceHref2029(bad,b),null);
  }
  assert.equal(galleryItemSourceHref2029(item,'10000000-0000-4000-8000-000000000003'),null);
  const [invalid]=buildGallerySourceContext({images:[image(a,'28')]});
  assert.equal(invalid.reopen.galleries[0].href,null);
  assert.equal(invalid.reopen.galleries[0].routePrecision,'unavailable');
});

test('all known World gallery navigation consumers use native targets; historical provenance is not rendered as navigation',()=>{
  for(const file of['WorldSourceConnections.jsx','WorldSourceStory.jsx']){
    const source=fs.readFileSync(new URL('../src/components/research/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/<a[^>]*href=\{route\??\.href\}/);
    assert.match(source,/<Link[^>]*to=\{route.href\}/);
    assert.doesNotMatch(source,/legacyHref|בגלריות הפיילוט|לגלריה המקורית —/);
  }
});
