import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProfileAvatar,ownedProfileAvatarUrl} from './avatarPolicy.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',origin='https://linswmnnkjxvweumprav.supabase.co';
const own=`${origin}/storage/v1/object/public/gallery/avatars/${uid}-1793440000000.png`;
test('profile images use bounded supported MIME/extension pairs',()=>{
 for(const[name,type]of[['a.jpg','image/jpeg'],['a.jpeg','image/jpeg'],['a.png','image/png'],['a.webp','image/webp'],['a.gif','image/gif']])assert.ok(validateProfileAvatar({name,type,size:100}));
 for(const file of [{name:'a.svg',type:'image/svg+xml',size:1},{name:'a.png',type:'text/html',size:1},{name:'a.jpg',type:'image/png',size:1},{name:'a.png',type:'image/png',size:0},{name:'a.png',type:'image/png',size:5*1024*1024+1}])assert.throws(()=>validateProfileAvatar(file));
});
test('profile updates accept only this canonical project and caller-owned image path',()=>{
 assert.equal(ownedProfileAvatarUrl(own,uid,origin),own);
 for(const url of [own.replace(uid,other),own+'?x=1',own+'#x',own.replace('.png','.svg'),own.replace(origin,'https://evil.invalid'),own.replace('.co/','.co:444/'),own.replace('/avatars/','/community/'),'javascript:alert(1)'])assert.equal(ownedProfileAvatarUrl(url,uid,origin),null);
});
