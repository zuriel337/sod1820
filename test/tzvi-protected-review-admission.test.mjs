import test from 'node:test';
import assert from 'node:assert/strict';
import { protectedReviewBuildIdentity, protectedReviewRuntimeAuthorized, REVIEW_PROJECT_ID,
  TZVI_SOURCE_REVIEW_BRANCH } from '../public-reading-deploy/review-admission.js';

const sha = 'a'.repeat(40);
const env = { VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview',
  VERCEL_PROJECT_ID: REVIEW_PROJECT_ID, VERCEL_GIT_COMMIT_REF: TZVI_SOURCE_REVIEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: sha, VERCEL_DEPLOYMENT_ID: 'dpl_tzvireview',
  VERCEL_URL: 'sod1820-tzvireview-sod1820-s-projects.vercel.app' };
const input = { env, sourceSha: sha, requestedSourceSha: sha, sourceDirty: false };

test('exact Tzvi Preview retains pinned identity and no production or auth-alias grant', () => {
  const identity = protectedReviewBuildIdentity(input);
  assert.equal(protectedReviewRuntimeAuthorized(identity, env), true);
  assert.equal(identity.productionAuthorized, false);
  assert.equal(identity.indexingAuthorized, false);
  assert.equal(identity.authHost, undefined);
  assert.equal(protectedReviewRuntimeAuthorized(identity, { ...env, VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40) }), false);
});

test('Tzvi admission never accepts Production, prefixes, another project or an unpinned build', () => {
  for (const patch of [
    { env: { ...env, VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production' }, reviewTarget: 'production' },
    { env: { ...env, VERCEL_GIT_COMMIT_REF: TZVI_SOURCE_REVIEW_BRANCH + '-other' } },
    { env: { ...env, VERCEL_PROJECT_ID: 'another-project' } },
    { requestedSourceSha: 'b'.repeat(40) }, { sourceDirty: true },
  ]) assert.throws(() => protectedReviewBuildIdentity({ ...input, ...patch }), /identity_rejected/);
});
