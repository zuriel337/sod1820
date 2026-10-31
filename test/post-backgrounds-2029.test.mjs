import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {postBackground2029,POST_BACKGROUND_ASSETS_2029} from '../src/lib/research/postBackground2029.js';

test('approved series use exact source membership and preserve the existing author constraints',()=>{
  assert.equal(postBackground2029({categories:['מימד חמש'],author:'בדרך לנצח'}).key,'dimension-five');
  assert.equal(postBackground2029({tags:['מה קורה הבורא'],author:'אלון לוי'}).key,'mah-kore-habora');
  assert.equal(postBackground2029({categories:['סוד החשמל'],author:null}).key,'sod-hashmal');
  assert.equal(postBackground2029({tags:['סוד החשמל'],author:'מקור אחר'}).key,'sod-hashmal');
});

test('unmapped posts, a title, a slug, a tag alone and a different publisher keep the general background',()=>{
  for(const post of [null,{}, {slug:'future-dim5',title:'מימד חמש'}, {tags:['מימד חמש'],author:'בדרך לנצח'},
    {categories:['מימד חמש'],author:'manifestaffirms'}, {categories:['מה קורה הבורא'],author:'אלון לוי'},
    {categories:['מימד חמש','הצופן בסרטים'],slug:'matrix-506',author:null},
    {categories:['שבילי שפה']}, {background_url:'https://untrusted.invalid/image.png'}]){
    assert.equal(postBackground2029(post).key,'general');
  }
});

test('ambiguous series and suppressed content never choose the first matching identity',()=>{
  const ambiguous=postBackground2029({categories:['סוד החשמל'],tags:['מה קורה הבורא'],author:'אלון לוי'});
  assert.equal(ambiguous.key,'general');assert.equal(ambiguous.reason,'ambiguous_series');
  for(const tag of ['טיוטה','פורום']){
    const result=postBackground2029({categories:['סוד החשמל'],tags:[tag]});
    assert.equal(result.key,'general');assert.equal(result.reason,'suppressed_source');
  }
});

test('every shipped background variant matches its reviewed bytes, identity and device budget',()=>{
  const receipt=JSON.parse(readFileSync(new URL('../docs/reviews/post-series-background-artwork-20261030.json',import.meta.url)));
  assert.equal(receipt.artwork.length,4);
  for(const artwork of receipt.artwork){
    const assets=POST_BACKGROUND_ASSETS_2029[artwork.key];assert.ok(assets);
    for(const variant of artwork.variants){
      assert.equal(assets[variant.width===720?'preview':'desktop'],'/'+variant.filename);
      const bytes=readFileSync(new URL('../public/'+variant.filename,import.meta.url));
      assert.equal(bytes.length,variant.bytes);
      assert.ok(bytes.length<=(variant.width===720?30_000:60_000));
      assert.equal(bytes.subarray(8,12).toString(),'WEBP');
      assert.equal(createHash('sha256').update(bytes).digest('hex'),variant.sha256);
    }
  }
});


test('mobile portraits preserve native 9:16 framing and the existing thirty-kilobyte budget',()=>{
  const receipt=JSON.parse(readFileSync(new URL('../docs/reviews/post-mobile-backgrounds-20261031.json',import.meta.url)));
  assert.equal(receipt.artwork.length,4);
  for(const item of receipt.artwork){
    const assets=POST_BACKGROUND_ASSETS_2029[item.key];assert.equal(assets.mobile,'/'+item.filename);
    assert.notEqual(assets.mobile,assets.preview,'Library thumbnails keep their landscape artwork');
    const bytes=readFileSync(new URL('../public/'+item.filename,import.meta.url));
    assert.equal(bytes.length,item.bytes);assert.ok(bytes.length<=30_000);
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.equal(bytes.subarray(12,16).toString(),'VP8 ');
    assert.equal(bytes.readUInt16LE(26)&0x3fff,720);assert.equal(bytes.readUInt16LE(28)&0x3fff,1280);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
    assert.ok(item.generatedSourceDimensions[0]>=720&&item.generatedSourceDimensions[1]>=1280,'No upscaled native source');
    assert.match(item.origin,/not source evidence/);
  }
});

test('versioned public backgrounds override the catch-all cache policy without caching content or private data',()=>{
  const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url)));
  const catchAll=config.headers.findLastIndex(rule=>rule.source==='/(.*)');
  assert.ok(catchAll>=0);
  for(const item of Object.values(POST_BACKGROUND_ASSETS_2029))for(const href of [item.mobile,item.desktop]){
    const index=config.headers.findLastIndex(rule=>rule.source===href);
    assert.ok(index>catchAll,`${href} must take precedence over the general revalidation rule`);
    assert.deepEqual(config.headers[index].headers,[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]);
    assert.match(href,/-[a-f0-9]{12}\.webp$/);
  }
});
