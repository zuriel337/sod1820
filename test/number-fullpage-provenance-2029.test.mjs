import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublicNumberAddress,resolveNumericNumberAddress,numberReadingReturnHref,resolveExpressionFocus} from '../src/lib/research/numberExpressionFocus.js';
import {publicNumberSourceCards,publicNumberSourceHref} from '../src/lib/research/numberSourceCards.js';

test('a phrase address passes the single canonical execution into its page; exact method/value cannot silently fall back',async()=>{
 const rows=[{methodKey:'רגיל',computedValue:1820,definitionVersion:2},{methodKey:'מילוי',computedValue:3928,definitionVersion:3}];let calls=0;
 const result=await resolvePublicNumberAddress('canonical fixture',{search:'?method='+encodeURIComponent('מילוי'),profileReader:async()=>{calls++;return rows;}});
 assert.equal(calls,1);assert.equal(result.root,3928);assert.equal(result.focus.method,'מילוי');assert.strictEqual(result.methodProfile.rows,rows);
 assert.equal(await resolveExpressionFocus('canonical fixture',{preferredMethod:'unavailable',profileReader:async()=>rows}),null);
 assert.equal(await resolveExpressionFocus('canonical fixture',{preferredMethod:'מילוי',expectedValue:1820,profileReader:async()=>rows}),null);
});
test('numeric destinations resolve synchronously without fake graph identity or network, including zero; invalid bounds fail closed',()=>{
 const address=resolveNumericNumberAddress('3928','?focus=canonical&method=selected');
 assert.equal(address.root,3928);assert.equal(address.focus.method,'selected');assert.equal('then' in address,false);assert.equal('nodeId' in address,false);
 assert.equal(resolveNumericNumberAddress('0').root,0);assert.equal(resolveNumericNumberAddress('expression'),null);
 assert.throws(()=>resolveNumericNumberAddress('9007199254740992'),/invalid-number/);
});
test('Number return uses the actual public address with repeated source values and anchor, excluding credentials',()=>{
 assert.equal(numberReadingReturnHref({pathname:'/number/1820',search:'?source=post&part=2&part=7&_vercel_share=private',hash:'#number-source-original'}),'/number/1820?source=post&part=2&part=7#number-source-original');
 const original='?focus=%D7%90%20%D7%91&part=2&part=7&note=a+b%20c';
 assert.equal(numberReadingReturnHref({pathname:'/number/1820',search:original,hash:'#number-essential'}),'/number/1820'+original+'#number-essential');
 assert.equal(numberReadingReturnHref({pathname:'/number/1820',search:original+'&%61ccess_token=private',hash:'#number-essential'}),'/number/1820?focus=%D7%90+%D7%91&part=2&part=7&note=a+b+c#number-essential');
 assert.equal(numberReadingReturnHref({pathname:'/number/בראשית',search:'?method=קטן',hash:'#access_token=secret'}),'/number/%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA?method=%D7%A7%D7%98%D7%9F');
 assert.equal(numberReadingReturnHref({pathname:'/2029/me/messages'}),null);
});
const id='10000000-0000-4000-8000-000000000001';
const source={id,title:'Public source text, without a fabricated calculation claim',sourceRef:'channel_updates:20000000-0000-4000-8000-000000000002',publicationState:'approved',findingHref:'/world?finding='+id,kindLabel:'חומר מקור',sourceHref:null};
test('only admitted public DTOs produce informative cards; a missing source URL remains a nonlink',()=>{
 const cards=publicNumberSourceCards([source,source,{...source,id:'invalid'},{...source,privacy_scope:'private'},{...source,publicationState:'draft'}]);
 assert.equal(cards.length,1);assert.equal(cards[0].title,source.title);assert.equal(cards[0].href,null);
 for(const change of [{sourceRef:'wa_bot_log:private'},{title:''},{title:'הודעות מקור'},{findingHref:'/2029/me'}])assert.deepEqual(publicNumberSourceCards([{...source,...change}]),[]);
 const post=publicNumberSourceCards([{...source,sourceRef:'posts:123',sourceHref:'/?p=123&part=7#source'}])[0];assert.equal(post.href,'/?p=123&part=7#source');
});
test('source links reject active schemes, credentials, private routes and grants',()=>{
 for(const href of ['javascript:alert(1)','//evil.invalid/path','https://user:password@example.invalid/','/2029/me/messages','/auth/callback','/admin','/post/read?_vercel_share=secret','https://example.invalid/file?token=secret'])assert.equal(publicNumberSourceHref(href),null,href);
 assert.equal(publicNumberSourceHref('https://example.invalid/public-source#part'),'https://example.invalid/public-source#part');
});
