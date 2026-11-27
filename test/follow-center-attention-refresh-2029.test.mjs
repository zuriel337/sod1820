// The unread mark on the profile picture must be told when the notifications page marks updates as read (found by the isolated end-to-end run:
// the mark stayed until a reload). The event is sent only after the server confirmed the marking, never on a failure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/followCenter2029/FollowCenterController2029.jsx', import.meta.url), 'utf8');
const mark = source.slice(source.indexOf('async function mark('), source.indexOf('const retry = section'));

test('the picture mark is refreshed after a confirmed read, and only then', () => {
  assert.match(source, /import \{ PERSONAL_ATTENTION_REFRESH_EVENT \} from "\.\.\/\.\.\/lib\/notifications\.js"/);
  const ack = mark.indexOf('Unconfirmed update'), dispatch = mark.indexOf('dispatchEvent(new Event(PERSONAL_ATTENTION_REFRESH_EVENT))'), failure = mark.indexOf('setReadChange("failed")');
  assert.ok(ack > 0 && dispatch > ack, 'dispatched after the acknowledgement check');
  assert.ok(failure > dispatch, 'the failure branch comes after and never dispatches');
  assert.equal((mark.match(/PERSONAL_ATTENTION_REFRESH_EVENT/g) || []).length, 1);
});

test('the same event is the one the badge listens to', () => {
  const badge = readFileSync(new URL('../src/components/experience2029/PersonalAttentionBadge2029.jsx', import.meta.url), 'utf8');
  assert.match(badge, /window\.addEventListener\(PERSONAL_ATTENTION_REFRESH_EVENT/);
});
