// Actual exact-branch binding acceptance after full-history owner closure verification.
// Compare the applied worker and API wrapper to the received restricted branch.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { COMMUNITY_UPLOAD_POLICY } from '../src/lib/community/communityUploadPolicy.js';
import { AVATAR_UPLOAD_POLICY } from '../src/lib/userCenter/avatarPolicy.js';

const base = 'gpt/2029-unified-performance-consolidation-20261031';
const branch = 'gpt/2029-home-loading-acceptance-20261031';
const builder = readFileSync('scripts/build-integrated-preview.mjs', 'utf8');
const wrapper = readFileSync('preview-deploy/api/contributor-self.js', 'utf8');
const addBinding = source => source.replaceAll(JSON.stringify(base), `${JSON.stringify(base)}, ${JSON.stringify(branch)}`);
const parentBuilder = execFileSync('git', ['show', '5cafa111075bbb9a8b9e20a204e8260982edf88b:scripts/build-integrated-preview.mjs'], { encoding: 'utf8' });
const parentWrapper = execFileSync('git', ['show', '5cafa111075bbb9a8b9e20a204e8260982edf88b:preview-deploy/api/contributor-self.js'], { encoding: 'utf8' });
const worker = (source, ref, env = 'preview') => vm.runInNewContext(
  source.slice(source.indexOf('const allow ='), source.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")')) + '\nworker;',
  { COMMUNITY_UPLOAD_POLICY, AVATAR_UPLOAD_POLICY, process: { env: { VERCEL_GIT_COMMIT_REF: ref, VERCEL_ENV: env } } },
);
const api = (source, ref, env = 'preview') => vm.runInNewContext(
  source.replace(/^import[^\n]+\n/, '').replace('export default contributorSelfHandler', 'contributorSelfHandler'),
  { contributorSelfHandler: options => options, process: { env: { VERCEL_GIT_COMMIT_REF: ref, VERCEL_ENV: env } } },
);
const guard = source => source.slice(source.indexOf('const END_TO_END_BRANCH'), source.indexOf('const POSTS_PREVIEW_BRANCH'));

test('applied patch changes only the reviewed exact branch bindings', () => {
  execFileSync('git', ['apply', '--reverse', '--check', 'docs/reviews/home-loading-preview-bindings-20261031.patch']);
  assert.equal(builder, addBinding(parentBuilder));
  assert.equal(wrapper, addBinding(parentWrapper));
  const patch = readFileSync('docs/reviews/home-loading-preview-bindings-20261031.patch', 'utf8');
  assert.deepEqual(patch.split('\n').filter(line => line.startsWith('--- ')), [
    '--- a/scripts/build-integrated-preview.mjs', '--- a/preview-deploy/api/contributor-self.js',
  ]);
  const lines = patch.split('\n').filter(line => /^[+-]/.test(line) && !/^[+-]{3}/.test(line));
  const removed = lines.filter(line => line[0] === '-').map(line => line.slice(1));
  const added = lines.filter(line => line[0] === '+').map(line => line.slice(1));
  assert.equal(removed.length, 6);
  assert.deepEqual(added, removed.map(addBinding));
  for (const source of [builder, wrapper]) assert.equal(source.includes(JSON.stringify(branch)), true);
});

test('applied worker is byte-identical to the received capability guard for the base branch', () => {
  const inherited = worker(parentBuilder, base);
  assert.match(inherited, /const realRazielPreview=true/);
  assert.match(inherited, /const communityPublishing=true/);
  assert.match(inherited, /const unifiedReadOnly=true/);
  assert.equal(worker(builder, branch), inherited);
  assert.equal(worker(builder, base), inherited);
});

test('applied binding denies Production and leaves other branches and missing environment closed', () => {
  for (const ref of [branch, base]) assert.throws(() => vm.runInNewContext(guard(builder), {
    process: { env: { VERCEL_GIT_COMMIT_REF: ref, VERCEL_ENV: 'production' } },
  }), /unified_preview_is_never_production/);
  for (const env of ['preview', 'production', null]) {
    assert.equal(worker(builder, branch + '-other', env), worker(builder, 'gpt/unreviewed', env));
  }
  assert.match(worker(builder, branch, 'production'), /const realRazielPreview=false/);
  assert.match(worker(builder, branch, 'production'), /const communityPublishing=false/);
  assert.match(worker(builder, branch, null), /const realRazielPreview=false/);
  assert.match(worker(builder, branch, null), /const communityPublishing=false/);
});

test('applied own-avatar wrapper keeps canonical read-only/ownership behavior and exact Preview scope', () => {
  for (const [ref, env, expected] of [[branch, 'preview', true], [base, 'preview', true],
    [branch, 'production', false], [branch, null, false], [branch + '-other', 'preview', false], ['gpt/unreviewed', 'preview', false]]) {
    const options = api(wrapper, ref, env);
    assert.equal(options.previewReadOnly, true);
    assert.equal(options.avatarUpdates, expected);
  }
});
