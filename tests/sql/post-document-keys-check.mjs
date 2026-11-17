// The edge (post-document-freshness.js) and the database (fn_post_document_keys) must compute the same address key for the same Post,
// whatever spelling of its address a reader requests. Run by tests/sql/run-post-document-freshness.sh after the migration.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { postDocumentKeysForPath } from '../../post-document-freshness.js';

const psql = (process.argv[2] || 'psql').split(' ');
const dbKeys = slug => JSON.parse(execFileSync(psql[0], [...psql.slice(1), '-At', '-v', `s=${slug}`],
  { encoding: 'utf8', input: "select to_jsonb(public.fn_post_document_keys(:'s'));" }));
const cases = [
  // stored slug (as in posts.slug)                  addresses a reader may request
  ['%d7%a2%d7%9c%d7%95%d7%9f-test', ['/%D7%A2%D7%9C%D7%95%D7%9F-test', '/%d7%a2%d7%9c%d7%95%d7%9f-test', '/עלון-test', '/%D7%A2%D7%9C%D7%95%D7%9F-test/']],
  ['פוסט-בדיקה', ['/פוסט-בדיקה', '/%D7%A4%D7%95%D7%A1%D7%98-%D7%91%D7%93%D7%99%D7%A7%D7%94', '/post/%D7%A4%D7%95%D7%A1%D7%98-%D7%91%D7%93%D7%99%D7%A7%D7%94']],
  ['chosen-one', ['/post/chosen-one', '/chosen-one', '/post/chosen-one/']],
  ['%D7%A2%D7%9C%D7%95%D7%9F-upper', ['/%d7%a2%d7%9c%d7%95%d7%9f-upper', '/עלון-upper']],
];
let checked = 0;
for (const [slug, paths] of cases) {
  const stored = new Set(dbKeys(slug));
  for (const path of paths) {
    const edge = await postDocumentKeysForPath(path);
    assert.ok(edge.some(key => stored.has(key)), `edge keys for ${path} do not meet the database keys of ${slug}: ${edge} vs ${[...stored]}`);
    checked++;
  }
}
const other = new Set(dbKeys('chosen-one'));
assert.ok(!(await postDocumentKeysForPath('/post/chosen-two')).some(key => other.has(key)), 'a different Post must not match');
console.log(`post document keys: edge and database agree (${checked} addresses)`);
