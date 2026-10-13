const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema storage;
create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));
create table public.posts(id bigint primary key,image_url text,thumb_url text,title text);
create table public.project_codex(slug text primary key,body text,updated_at timestamptz);
insert into project_codex values('publishing_conventions','before\n—— FAST IMAGE DELIVERY V1 old',now());
insert into posts values(1,'https://legacy.example/old.jpg',null,'old');`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261012125823_post_image_representations_v2.sql', import.meta.url),'utf8'));
const prefix='https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/';
const dir='sod1820/2029/image/2026/10/test-asset/';
for(const [name,size,mime] of [['reading.jpg',600000,'image/jpeg'],['preview.jpg',100000,'image/jpeg'],['heavy.jpg',600001,'image/jpeg'],['big-preview.jpg',100001,'image/jpeg'],['bad.jpg',1000,'text/html']]){
 await db.query('insert into storage.objects values($1,$2,$3)', ['media',dir+name,{size,mimetype:mime}]);
}
await db.exec("update posts set title='still editable' where id=1");
await db.query('insert into posts values(2,$1,null,$2)',[prefix+dir+'reading.jpg','valid']);
assert.equal((await db.query('select thumb_url from posts where id=2')).rows[0].thumb_url,prefix+dir+'preview.jpg');
await db.exec("insert into posts values(3,null,null,'text')");
let failed=0;
for(const [image,thumb,code] of [
 [prefix+dir+'heavy.jpg',null,'READING_INVALID_OR_TOO_LARGE'],
 [prefix+dir+'reading.jpg',prefix+dir+'big-preview.jpg','PREVIEW_INVALID_OR_TOO_LARGE'],
 [prefix+dir+'reading.jpg',prefix+dir+'reading.jpg','PREVIEW_REQUIRED'],
 [prefix+dir+'reading.jpg',prefix+dir+'../test-asset/preview.jpg','IDENTITY_MISMATCH'],
 [prefix+dir+'bad.jpg',null,'READING_INVALID_OR_TOO_LARGE'],
 ['https://evil.example/reading.jpg',null,'CANONICAL_REQUIRED'],
 [prefix+dir+'missing.jpg',null,'READING_INVALID_OR_TOO_LARGE'],
 [null,prefix+dir+'preview.jpg','READING_REQUIRED'],
]){
 await assert.rejects(db.query('update posts set image_url=$1,thumb_url=$2 where id=2',[image,thumb]),new RegExp(code)); failed++;
 assert.equal((await db.query('select image_url from posts where id=2')).rows[0].image_url,prefix+dir+'reading.jpg');
}
assert.match((await db.query('select body from project_codex')).rows[0].body,/FAST IMAGE DELIVERY V2/);
console.log(`PASS: valid pair, inferred preview, unchanged legacy, text-only, ${failed} rejected changes preserve prior publication, existing contract updated`);
await db.close();
