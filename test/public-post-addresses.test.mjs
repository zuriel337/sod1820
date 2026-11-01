import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPostAddress,publicPostHref,publicPostUrl,postAddressSlug,exactPostReadingHref,publicPostShareUrl} from '../src/lib/publicPostUrls.js';

test('imported WordPress keeps its exact original path, encoding and trailing slash',()=>{
 const post={id:92,source:'wordpress',slug:'%d7%a1%d7%95%d7%93',link:'https://sod1820.co.il/%d7%a1%d7%95%d7%93/'};
 assert.equal(publicPostHref(post),'/%d7%a1%d7%95%d7%93/');
 assert.equal(publicPostAddress(post).kind,'legacy');
 assert.equal(publicPostHref(post,{search:'?p=92&utm_source=source',hash:'#source-region-7'}),'/%d7%a1%d7%95%d7%93/?p=92&utm_source=source#source-region-7');
 assert.equal(postAddressSlug(publicPostHref(post)),'סוד');
});
test('AI revision of an old WordPress record preserves the address despite its source flag',()=>{
 const post={id:1342,wp_id:4756,source:'ai',date:'2015-05-28',created_at:'2026-06-07',slug:'old',link:'https://sod1820.co.il/old/'};
 assert.equal(publicPostHref(post),'/old/');
});
test('native AI and SOD1820 posts use /post without relying on a rolling date',()=>{
 for(const date of ['2024-08-08','2026-10-01','2090-01-01',null]){
  assert.equal(publicPostHref({id:5020,source:'ai',slug:'צופן-חותים-5784',date}),'/post/'+encodeURIComponent('צופן-חותים-5784'));
 }
 assert.equal(publicPostHref({source:'SOD1820',slug:'native'}),'/post/native');
 for(const source of ['source_document','uploaded_file'])assert.equal(publicPostHref({source,slug:'native'}),'/post/native');
 assert.equal(publicPostHref({source:'ai',slug:'%d7%a1%d7%95%d7%93'}),'/post/'+encodeURIComponent('סוד'));
});
test('reviewed modern records keep root aliases readable while preferring native canonical paths',()=>{
 for(const id of [2601,5084,5104,5110])assert.equal(publicPostHref({id,source:'ai',slug:'native',link:'https://sod1820.co.il/native'}),'/post/native');
 assert.equal(postAddressSlug('/native'),'native');
 assert.equal(postAddressSlug('/post/native'),'native');
});
test('unresolved provenance preserves existing addresses; a link is not indexation evidence',()=>{
 assert.equal(publicPostHref({source:'unknown_migration',slug:'source'}),'/source');
 assert.equal(publicPostHref({source:'ai',slug:'unknown',link:'/unknown/'}),'/unknown/');
 assert.equal(publicPostAddress({slug:'legacy'}).basis,'conservative_existing_address');
});
test('public Post copy keeps reading context while discarding access grants and credentials',()=>{
 const url=publicPostShareUrl({source:'ai',slug:'native'},{search:'?part=7&source=world&method=regular&_vercel_share=synthetic-secret&access_token=synthetic-secret',hash:'#source-region-1'});
 assert.equal(url,'https://sod1820.co.il/post/native?part=7&source=world&method=regular#source-region-1');
 assert.doesNotMatch(url,/synthetic-secret/);
});
test('stored links cannot redirect to another origin, another post or a protocol',()=>{
 for(const link of ['https://evil.invalid/own','//evil.invalid/own','javascript:alert(1)','https://sod1820.co.il/other','https://user:password@sod1820.co.il/own']){
  assert.equal(publicPostUrl({source:'wordpress',slug:'own',link}),'https://sod1820.co.il/own');
 }
 assert.equal(publicPostHref({source:'ai',slug:'../private'}),'/post/..%2Fprivate');
 assert.equal(publicPostHref({slug:'..'}),null);
});
test('post-to-number return retains the visited old/new alias, query, identifier and exact occurrence',()=>{
 const post={source:'ai',slug:'native'};
 for(const pathname of ['/native','/post/native'])assert.equal(exactPostReadingHref(post,{pathname,search:'?p=5112&part=7',hash:'#old'},'#post-annotation-42'),pathname+'?p=5112&part=7#post-annotation-42');
 assert.equal(exactPostReadingHref(post,{pathname:'//evil.invalid',search:'?secret=x'},'#source'),'/post/native#source');
});
