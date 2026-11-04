import test from 'node:test';
import assert from 'node:assert/strict';
import { razielSavedSyncCopy, canRetryRazielSync, RAZIEL_LOCAL_SAVE_NOTICE } from '../src/lib/research/razielSavedSync2029.js';
import { RAZIEL_ONE_SHOT_COPY } from '../src/lib/research/razielOneShotCopy2029.js';

test('save result is local, never a stale synced closure; failed state is not empty-account evidence',()=>{
  assert.match(RAZIEL_LOCAL_SAVE_NOTICE,/בדפדפן/);
  assert.match(razielSavedSyncCopy('synced'),/מסונכרנות.*לחשבון/);
  for(const status of ['pending','syncing','error','local_only','local_error','conflict','unknown']) assert.doesNotMatch(razielSavedSyncCopy(status),/מסונכרנות באופן פרטי/);
  assert.equal(canRetryRazielSync('error'),true);assert.equal(canRetryRazielSync('conflict'),false);
  assert.match(razielSavedSyncCopy('local_error'),/נכשלה/);
});
test('map is a deliberate same-thread AI continuation, not a graphical page or new scan',()=>{
  assert.match(RAZIEL_ONE_SHOT_COPY.map.explanation,/לא פתיחת מפה גרפית ולא סריקה/);
  assert.match(RAZIEL_ONE_SHOT_COPY.map.explanation,/רק לחיצה/);
  assert.match(RAZIEL_ONE_SHOT_COPY.map.noMaterial,/לא נשלחה בקשת AI/);
});
