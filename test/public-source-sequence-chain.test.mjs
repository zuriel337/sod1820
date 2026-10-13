import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicPostSequenceBundle, projectPublicSourceSequences, sourceSequenceAttention, sourceSequenceFeedSeenKey, withSourceSequenceContext } from '../src/lib/research/publicSourceSequence2029.js';
import { buildRazielSurfaceContext } from '../src/lib/research/razielSurfaceContext.js';
import { feedRows, feedSeenKey } from '../src/lib/systemFeed2029.js';
import { readSeen, markSeen } from '../src/lib/homeMotion2029.js';

// Bounded live metadata receipt, 2026-10-13: current certified version of
// public Elections post. No private revisions, inbox or source body copied.
const elections = { id: 5107, slug: 'sharshar-elections-redemption-hints-draft', source: 'ai', home_hidden: false,
  tags: ['הבחירות'], date: '2026-09-30T08:55:06.593419Z', modified: '2026-10-12T13:52:58.270789Z' };
// Negative source admission fixture: live Bennett still carries the draft tag.
const draft = { id: 5113, slug: 'bennett-melach-631-78', source: 'ai', home_hidden: false,
  tags: ['טיוטה'], date: '2026-09-30T23:57:13.947791Z', modified: '2026-10-12T14:06:54.127591Z' };
const now = Date.parse('2026-10-13T07:45:00Z');

test('live public metadata -> proven source revisions -> root sequence -> latest/unread attention', () => {
  const bundle = buildPublicPostSequenceBundle([elections, draft]);
  assert.equal(bundle.kind, 'authored_post_sequence'); assert.deepEqual(bundle.events.map(e => e.id), ['posts:5107']);
  assert.equal(bundle.updates.length, 3);
  const p = projectPublicSourceSequences(bundle); const s = p.sequences[0];
  assert.equal(s.rootId, 'posts:5107'); assert.equal(s.unreadCount, 3);
  assert.equal(s.updates.filter(u => u.pulse).length, 1);
  assert.deepEqual(s.followSubject, { entityType: 'post_sequence', stableId: '5107', available: false });
  assert.ok(!JSON.stringify(bundle).includes('5113')); assert.ok(!JSON.stringify(p).includes('bennett'));
});

test('one shared Home/Frame seen key clears the exact revision in all projections without clearing history', () => {
  const storage = new Map(); const previous = globalThis.window;
  globalThis.window = { localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } };
  try {
    const bundle = buildPublicPostSequenceBundle([elections]); const p = projectPublicSourceSequences(bundle);
    const latest = p.sequences[0].updates.at(-1);
    const sourceUpdate = { eventKey: `${latest.id}@revision:${latest.revisionId}`, label: latest.summary };
    const item = { id: 'post:5107', kind: 'source', sourceKind: 'post', label: 'פוסט הבחירות', at: latest.arrivalAt, sourceUpdate, href: latest.href };
    const row = feedRows([item], { now })[0]; assert.equal(row.isNew, true);
    assert.equal(feedSeenKey(item), sourceSequenceFeedSeenKey(latest));
    const seen = markSeen(feedSeenKey(item)); assert.deepEqual(readSeen(), seen);
    for (const surface of ['Home', 'World', 'desktop Companion', 'mobile Now']) {
      const state = projectPublicSourceSequences(bundle, { seen: readSeen() });
      assert.equal(sourceSequenceAttention(item, state).isUnread, false, surface);
      assert.equal(sourceSequenceAttention(item, state).pulse, false, surface);
      assert.equal(state.sequences[0].unreadCount, 2, surface);
    }
    assert.equal(feedRows([item], { now, seen: readSeen() })[0].isNew, false);
  } finally { globalThis.window = previous; }
});

test('explicit source selection -> existing Research Context -> bounded Raziel descriptor, with no private payload', () => {
  const s = projectPublicSourceSequences(buildPublicPostSequenceBundle([elections])).sequences[0];
  const u = s.updates.at(-1); const before = { subject: { type: 'number', id: '631' }, dimensions: { entrySource: 'home', unrelated: true } };
  const context = withSourceSequenceContext(before, s, u);
  assert.equal(context.subject, before.subject); assert.equal(context.dimensions.unrelated, true);
  assert.equal(context.selection.sourceRef, 'posts:5107');
  const dto = buildRazielSurfaceContext(context);
  assert.equal(dto.sourceSequence.occurrenceKey, u.seenKey); assert.equal(dto.sourceSequence.targetHref, u.href);
  assert.equal(dto.reading.postId, '5107'); assert.equal(dto.reading.postSlug, elections.slug);
  assert.equal(dto.focus.entityType, 'post'); assert.equal(dto.reading.locator, u.id);
  assert.ok(!JSON.stringify(dto).includes('body')); assert.ok(!JSON.stringify(dto).includes('audience'));
  assert.equal(withSourceSequenceContext(before, s, { seenKey: 'forged' }), before);
});

test('stale, hidden, forum, draft, unknown origin and wrong source identity never become revision events', () => {
  for (const row of [{...elections, modified:'2026-10-13T00:00:00Z'}, {...elections,home_hidden:true},
    {...elections,tags:['טיוטה']}, {...elections,tags:['פורום']}, {...elections,source:'gpt-draft'}, {...elections,source:'unknown'}, {...elections,slug:'other'}]) {
    assert.equal(buildPublicPostSequenceBundle([row]).updates.length, 0);
  }
});

test('unread state never grants verification or publication; reduced motion keeps meaning', () => {
  const p=projectPublicSourceSequences(buildPublicPostSequenceBundle([elections]),{reducedMotion:true});
  assert.equal(p.sequences[0].updates.filter(u=>u.isLatest).length,1);
  assert.equal(p.sequences[0].updates.some(u=>u.pulse),false);
  assert.equal(p.sequences[0].updates.every(u=>u.verification==='unknown'),true);
  assert.equal(p.streams[0].hasUnread,true);
});

test('an unpublished/missing ancestor is withheld before the bundle reaches public consumers',()=>{
  // Synthetic admission-positive child fixture, not a live publication claim.
  const child={...draft,tags:[]}; const bundle=buildPublicPostSequenceBundle([child,{...elections,home_hidden:true}]);
  assert.deepEqual(bundle.events,[]); assert.deepEqual(bundle.updates,[]);
});
