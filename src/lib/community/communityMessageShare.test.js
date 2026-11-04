import test from 'node:test';
import assert from 'node:assert/strict';
import { communityMessageShareUrl } from './communityMessageShare.js';
const root='11111111-1111-4111-8111-111111111111',child='22222222-2222-4222-8222-222222222222',leaf='33333333-3333-4333-8333-333333333333';
test('public root share strips every private and view parameter, retaining current protected host',()=>{
  const url=new URL(communityMessageShareUrl('https://preview.example/community/chat?dm=private&member=user%3Aprivate&sort=liked&returnTo=%2Fpersonal&_vercel_share=secret#private',[root]));
  assert.equal(url.origin,'https://preview.example');assert.equal(url.pathname,'/community/chat');assert.deepEqual([...url.searchParams],[['thread',root]]);assert.equal(url.hash,'');
});
test('a nested reply shares the complete established path for direct opening and refresh',()=>{
  const url=new URL(communityMessageShareUrl('https://preview.example/community/chat',[root,child,leaf]));
  assert.equal(url.searchParams.get('thread'),root);assert.equal(url.searchParams.get('reply'),leaf);assert.equal(url.searchParams.get('path'),[root,child,leaf].join(','));
});
test('unknown, cyclic, malformed and overly deep ancestry and unsafe origins never produce a link',()=>{
  for(const path of [null,[],[root,'bad'],[root,root],Array(31).fill(root)])assert.equal(communityMessageShareUrl('https://preview.example',path),null);
  for(const url of ['javascript:alert(1)','http://public.example','https://user:pass@public.example','/relative'])assert.equal(communityMessageShareUrl(url,[root]),null);
  assert.ok(communityMessageShareUrl('http://127.0.0.1:4000/2029',[root]));
});
