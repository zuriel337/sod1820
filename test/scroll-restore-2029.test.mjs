import test from 'node:test';
import assert from 'node:assert/strict';
import { planNavigation, trimStore, createScrollRestorer2029, anchorTarget, readAnchors, resolveReadingPlace, SCROLL_STORE_KEY, SCROLL_ANCHOR_STORE_KEY, RESTORE_MAX_WAIT_MS, RESTORE_STABLE_MS, RESTORE_FORCE_AFTER_MS, RESTORE_HOLD_MS, RESTORE_HOLD_MAX_MS } from '../src/lib/scrollRestore2029.js';

const P = (o) => planNavigation({ hash: '', pathname: '/b', prevPathname: '/a', ...o });
test('plan: restore on back/forward, top on a new pathname, anchors and everything else untouched', () => {
  assert.deepEqual(P({ navType: 'POP', saved: 1800 }), { action: 'restore', y: 1800 });
  assert.deepEqual(P({ navType: 'POP', saved: 0 }), { action: 'none' });
  assert.deepEqual(P({ navType: 'POP', saved: undefined }), { action: 'none' });
  assert.deepEqual(P({ navType: 'PUSH' }), { action: 'top' });
  assert.deepEqual(P({ navType: 'PUSH', pathname: '/a' }), { action: 'none' });             // same page: filters/query keep scroll
  assert.deepEqual(P({ navType: 'REPLACE' }), { action: 'none' });
  assert.deepEqual(P({ navType: 'PUSH', prevPathname: null }), { action: 'none' });          // first location
  for (const navType of ['PUSH', 'POP', 'REPLACE']) assert.deepEqual(P({ navType, hash: '#world-sources', saved: 900 }), { action: 'none' }); // anchors belong to the page
});
test('store keeps the most recent entries', () => {
  const s = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`k${i}`, i]));
  const t = trimStore(s, 60);
  assert.equal(Object.keys(t).length, 60); assert.equal(t.k69, 69); assert.equal(t.k0, undefined);
});

function fakeWindow({ height = 800 } = {}) {
  const listeners = {}; let raf = []; const calls = [];
  const win = {
    scrollY: 0, innerHeight: 800, sessionStorage: { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = v; } },
    document: { documentElement: { scrollHeight: height, style: { overflowAnchor: '' } } },
    addEventListener(e, f) { (listeners[e] ||= new Set()).add(f); }, removeEventListener(e, f) { listeners[e]?.delete(f); },
    requestAnimationFrame(f) { raf.push(f); return raf.length; },
    scrollTo(o) { calls.push(o); win.scrollY = o.top; },
  };
  return { win, calls, flushRaf: () => { const q = raf; raf = []; q.forEach((f) => f()); }, emit: (e) => [...(listeners[e] || [])].forEach((f) => f()) };
}
function withClock(fn) { const real = Date.now; let t = real(); Date.now = () => t; try { return fn({ advance: (ms) => { t += ms; } }); } finally { Date.now = real; } }
const loc = (r, o) => r.onLocation({ key: 'k', pathname: '/', hash: '', navType: 'POP', ...o });
function leave(f, r, y) { loc(r, { key: 'home', pathname: '/' }); f.win.scrollY = y; f.emit('scroll'); f.flushRaf(); loc(r, { key: 'post', pathname: '/post/x', navType: 'PUSH' }); }

test('a new entry starts at the top with an instant jump', () => {
  const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
  f.win.scrollY = 1800; loc(r, { key: 'home', pathname: '/' });
  loc(r, { key: 'post', pathname: '/post/x', navType: 'PUSH' });
  assert.deepEqual(f.calls.at(-1), { top: 0, left: 0, behavior: 'instant' }); assert.equal(f.win.scrollY, 0);
});
test('anchor navigation never scrolls: direct hash load, in-page hash, cross-page hash', () => {
  const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
  loc(r, { key: 'a', pathname: '/world', hash: '#world-sources' });                                    // direct load with a hash
  loc(r, { key: 'b', pathname: '/world', hash: '#world-connections', navType: 'PUSH' });               // in-page anchor
  loc(r, { key: 'c', pathname: '/post/x', hash: '#sec-3', navType: 'PUSH' });                           // another page, anchored
  assert.equal(f.calls.length, 0);
});
test('forward/back: waits until the document is tall enough and stable, then scrolls down to the remembered offset', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2750);
    f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 900;
    loc(r, { key: 'home', pathname: '/' }); f.flushRaf(); assert.equal(f.win.scrollY, 0);
    f.win.document.documentElement.scrollHeight = 7000; f.flushRaf(); assert.equal(f.win.scrollY, 0);   // tall enough, but it just grew
    clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf();
    assert.equal(f.win.scrollY, 2750); assert.equal(f.calls.at(-1).behavior, 'instant');
  });
});
test('when the browser already put the page at the offset nothing is scrolled; when anchoring drifted it down, it is put back', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2000);
    f.win.scrollY = 2000; const before = f.calls.length;
    loc(r, { key: 'home', pathname: '/' }); clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf(); assert.equal(f.calls.length, before);
    clock.advance(RESTORE_HOLD_MS + 10); f.flushRaf();
    f.win.scrollY = 3300;                                                    // content above grew and anchoring pushed the page down
    loc(r, { key: 'home', pathname: '/' }); clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf();
    assert.equal(f.win.scrollY, 2000);
  });
});
test('anchoring stays paused during the hold and is restored afterwards or on user input', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2000); f.win.scrollY = 0;
    loc(r, { key: 'home', pathname: '/' });
    clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf(); assert.equal(f.win.scrollY, 2000);
    assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');   // still in the hold
    clock.advance(RESTORE_HOLD_MS + 10); f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
    loc(r, { key: 'home', pathname: '/' }); assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');
    f.emit('wheel'); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
  });
});
test('user input cancels a pending restore', () => {
  const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
  leave(f, r, 1500);
  f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 900;
  loc(r, { key: 'home', pathname: '/' }); f.emit('touchstart'); f.win.document.documentElement.scrollHeight = 7000; f.flushRaf();
  assert.equal(f.win.scrollY, 0);
});
test('a restore that never becomes reachable gives up after the bounded wait without scrolling', () => {
  const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
  leave(f, r, 3000);
  f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 900;
  const realNow = Date.now; let t = realNow(); Date.now = () => t;
  try { loc(r, { key: 'home', pathname: '/' }); t += RESTORE_MAX_WAIT_MS + 10; f.flushRaf(); f.flushRaf(); } finally { Date.now = realNow; }
  assert.equal(f.win.scrollY, 0);
});
test('a clamp caused by the page being swapped out is not recorded as the user position', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    loc(r, { key: 'home', pathname: '/' });
    f.win.scrollY = 2114; f.emit('scroll'); f.flushRaf();
    f.win.document.documentElement.scrollHeight = 880; f.win.scrollY = 80; f.emit('scroll'); f.flushRaf();
    loc(r, { key: 'post', pathname: '/post/x', navType: 'PUSH' });
    f.win.document.documentElement.scrollHeight = 7000; f.win.scrollY = 0;
    loc(r, { key: 'home', pathname: '/' }); f.flushRaf(); clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf();
    assert.equal(f.win.scrollY, 2114);
  });
});
test('positions persist for reloads', () => {
  const f = fakeWindow(); const r = createScrollRestorer2029(f.win); r.start();
  loc(r, { key: 'b' }); f.win.scrollY = 640; f.emit('scroll'); f.flushRaf(); r.stop();
  assert.equal(JSON.parse(f.win.sessionStorage._[SCROLL_STORE_KEY]).b, 640);
});

test('does not jump while the document is still growing; jumps once it is stable; anchoring is paused and restored', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2736);
    f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 4000;   // tall enough for 2736 but content above still arriving
    loc(r, { key: 'home', pathname: '/' });
    assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');
    for (const h of [4161, 7000, 10799, 16009]) { clock.advance(150); f.win.document.documentElement.scrollHeight = h; f.flushRaf(); assert.equal(f.win.scrollY, 0); }
    clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf();
    assert.equal(f.win.scrollY, 2736);
    assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');   // held while late content may still arrive
    clock.advance(RESTORE_HOLD_MS + 10); f.flushRaf();
    assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
  });
});
test('a document that never stops growing is restored after the force deadline', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 1500);
    f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 3000;
    loc(r, { key: 'home', pathname: '/' });
    let h = 3000; for (let i = 0; i < 25; i++) { clock.advance(130); h += 200; f.win.document.documentElement.scrollHeight = h; f.flushRaf(); if (f.win.scrollY) break; }
    assert.equal(f.win.scrollY, 1500);
  });
});

test('late content during the hold extends it (anchoring stays paused, position kept) until growth stops, bounded', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2000); f.win.scrollY = 0;
    loc(r, { key: 'home', pathname: '/' });
    clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf(); assert.equal(f.win.scrollY, 2000);
    let h = 7000;
    for (let i = 0; i < 3; i++) { clock.advance(RESTORE_HOLD_MS - 200); h += 800; f.win.document.documentElement.scrollHeight = h; f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none'); assert.equal(f.win.scrollY, 2000); }
    clock.advance(RESTORE_HOLD_MS + 10); f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');   // growth stopped
  });
});
test('a document that keeps growing releases anchoring at the bounded maximum hold', () => {
  withClock((clock) => {
    const f = fakeWindow({ height: 7000 }); const r = createScrollRestorer2029(f.win); r.start();
    leave(f, r, 2000); f.win.scrollY = 0;
    loc(r, { key: 'home', pathname: '/' });
    clock.advance(RESTORE_STABLE_MS + 10); f.flushRaf();
    let h = 7000, elapsed = 0;
    while (elapsed < RESTORE_HOLD_MAX_MS - 400) { clock.advance(300); elapsed += 300; h += 100; f.win.document.documentElement.scrollHeight = h; f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none'); }
    clock.advance(600); h += 100; f.win.document.documentElement.scrollHeight = h; f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
  });
});


// ---- the reading place: blocks marked data-scroll-anchor (Home) -----------------------------------------------------------------------------------------------
// layout = [{ id, top, height }] in document coordinates, mutable: tests move blocks the way late, failed or shrinking content does.
function pageWithBlocks(layout, { height = 7000 } = {}) {
  const f = fakeWindow({ height });
  const nodes = () => layout.map((b) => ({ getAttribute: (name) => (name === 'data-scroll-anchor' ? b.id : null), getBoundingClientRect: () => ({ top: b.top - f.win.scrollY, height: b.height }) }));
  f.win.document.querySelectorAll = (selector) => (selector === '[data-scroll-anchor]' ? nodes() : []);
  return f;
}
const home = () => [{ id: 'hero', top: 0, height: 400 }, { id: 'updates', top: 420, height: 700 }, { id: 'gwA', top: 1140, height: 300 }, { id: 'gwB', top: 1460, height: 400 }, { id: 'tools', top: 1880, height: 900 }];

test('anchorTarget: the same place in the block; never past a block that shrank; below a block, the same distance below its end', () => {
  assert.equal(anchorTarget({ off: 100, h: 400 }, { top: 1460, height: 400 }), 1560);          // unchanged
  assert.equal(anchorTarget({ off: 100, h: 400 }, { top: 500, height: 400 }), 600);            // moved up by what collapsed above
  assert.equal(anchorTarget({ off: 300, h: 400 }, { top: 500, height: 138 }), 638);            // the block shrank: its end, not beyond it
  assert.equal(anchorTarget({ off: 100, h: 400 }, { top: 500, height: 900 }), 600);            // the block grew: the same distance below its top
  assert.equal(anchorTarget({ off: 450, h: 400 }, { top: 500, height: 400 }), 950);            // below the block: 50 px below its end
  assert.equal(anchorTarget({ off: 450, h: 400 }, { top: 500, height: 200 }), 750);            // ...and it follows the block's end when the block shrank
});
test('readAnchors: the last marked block that starts at or above the viewport top, then the one before it; nothing when there is none', () => {
  const f = pageWithBlocks(home());
  f.win.scrollY = 1560; assert.deepEqual(readAnchors(f.win), [['gwB', 100, 400], ['gwA', 420, 300]]);
  f.win.scrollY = 1461; assert.deepEqual(readAnchors(f.win)[0], ['gwB', 1, 400]);
  f.win.scrollY = 10; assert.deepEqual(readAnchors(f.win), [['hero', 10, 400]]);                  // the first block has no fallback
  f.win.scrollY = 0; assert.deepEqual(readAnchors(f.win), [['hero', 0, 400]]);
  const above = pageWithBlocks([{ id: 'x', top: 300, height: 100 }]); assert.equal(readAnchors(above.win), null);   // viewport above the first block
  const plain = fakeWindow(); assert.equal(readAnchors(plain.win), null);                         // a page with no marked blocks
  const hidden = pageWithBlocks([{ id: 'gone', top: 0, height: 0 }, { id: 'real', top: 0, height: 50 }]); assert.deepEqual(readAnchors(hidden.win), [['real', 0, 50]]);
});
test('resolveReadingPlace: the first remembered block that is on the page decides, else the number; never past the end of a shorter page', () => {
  const f = pageWithBlocks(home()); const saved = [['gwB', 100, 400], ['gwA', 420, 300]];
  assert.deepEqual(resolveReadingPlace(f.win, 9999, saved), { y: 1560, anchored: true });
  const gone = home().filter((b) => b.id !== 'gwB'); const g = pageWithBlocks(gone);
  assert.deepEqual(resolveReadingPlace(g.win, 9999, saved), { y: 1140 + 300 + (420 - 300), anchored: true });   // the block before it, same distance below its end
  assert.deepEqual(resolveReadingPlace(pageWithBlocks([{ id: 'other', top: 0, height: 10 }]).win, 777, saved), { y: 777, anchored: false });
  assert.deepEqual(resolveReadingPlace(fakeWindow().win, 777, undefined), { y: 777, anchored: false });
  const short = pageWithBlocks([{ id: 'gwB', top: 2000, height: 400 }], { height: 1500 });
  assert.equal(resolveReadingPlace(short.win, 9999, saved).y, 1500 - 800);
});
test('plan: anchors travel with a restore only', () => {
  const anchors = [['gwB', 100, 400]];
  assert.deepEqual(P({ navType: 'POP', saved: 1800, anchors }), { action: 'restore', y: 1800, anchors });
  assert.deepEqual(P({ navType: 'POP', saved: 1800, anchors: [] }), { action: 'restore', y: 1800 });
  assert.deepEqual(P({ navType: 'PUSH', anchors }), { action: 'top' });
  assert.deepEqual(P({ navType: 'POP', saved: 1800, anchors, hash: '#sec' }), { action: 'none' });
});
test('the reading place is recorded on scroll and persisted next to the number; the number store is unchanged', () => {
  const f = pageWithBlocks(home()); const r = createScrollRestorer2029(f.win); r.start();
  loc(r, { key: 'home', pathname: '/' }); f.win.scrollY = 1560; f.emit('scroll'); f.flushRaf(); r.stop();
  assert.equal(JSON.parse(f.win.sessionStorage._[SCROLL_STORE_KEY]).home, 1560);
  assert.deepEqual(JSON.parse(f.win.sessionStorage._[SCROLL_ANCHOR_STORE_KEY]).home, [['gwB', 100, 400], ['gwA', 420, 300]]);
});

function leaveHome(f, r, y) { loc(r, { key: 'home', pathname: '/' }); f.win.scrollY = y; f.emit('scroll'); f.flushRaf(); loc(r, { key: 'post', pathname: '/post/x', navType: 'PUSH' }); }

test('a reading place is placed at once (no stability wait) and followed through a collapse above it, in the same frame', () => {
  const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
  leaveHome(f, r, 1560); f.win.scrollY = 0;
  loc(r, { key: 'home', pathname: '/' });
  f.flushRaf(); assert.equal(f.win.scrollY, 1560);                                 // no RESTORE_STABLE_MS wait
  assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');
  layout[0].height = 172; layout[1].top = 192; layout[1].height = 54; layout[2].top -= 894; layout[3].top -= 894; layout[4].top -= 894;   // hero and updates collapse: -894
  f.flushRaf(); assert.equal(f.win.scrollY, 1560 - 894);                           // the person stays at the same place in the block
});
test('a reading place follows content that grows above it as well', () => {
  const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
  leaveHome(f, r, 1560); f.win.scrollY = 0; loc(r, { key: 'home', pathname: '/' }); f.flushRaf();
  for (const b of layout.slice(2)) b.top += 300; f.flushRaf();
  assert.equal(f.win.scrollY, 1860);
});
test('a ResizeObserver delivers the correction before paint; it is disconnected when the restore ends', () => {
  let callback = null, disconnected = 0;
  const layout = home(); const f = pageWithBlocks(layout); f.win.ResizeObserver = class { constructor(cb) { callback = cb; } observe() {} disconnect() { disconnected++; } };
  const r = createScrollRestorer2029(f.win); r.start();
  leaveHome(f, r, 1560); f.win.scrollY = 0; loc(r, { key: 'home', pathname: '/' }); f.flushRaf();
  assert.equal(typeof callback, 'function');
  for (const b of layout.slice(1)) b.top -= 500;
  callback(); assert.equal(f.win.scrollY, 1060);                                  // no animation frame needed
  f.emit('wheel'); assert.equal(disconnected, 1);
});
test('user input stops following: a collapse after a deliberate scroll is left to the browser', () => {
  const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
  leaveHome(f, r, 1560); f.win.scrollY = 0; loc(r, { key: 'home', pathname: '/' }); f.flushRaf();
  f.emit('touchstart'); f.win.scrollY = 1700;                                    // the person scrolls on
  for (const b of layout.slice(1)) b.top -= 500; f.flushRaf();
  assert.equal(f.win.scrollY, 1700); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
});
test('before the reading place is placed, input cancels it exactly as it cancels a number', () => {
  const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
  leaveHome(f, r, 1560); f.win.scrollY = 0; f.win.document.documentElement.scrollHeight = 900;
  loc(r, { key: 'home', pathname: '/' }); f.emit('wheel'); f.win.document.documentElement.scrollHeight = 7000; f.flushRaf();
  assert.equal(f.win.scrollY, 0);
});
test('when the block being read is gone the block before it is used; when none is there the number is used after the bounded wait, not before', () => {
  withClock((clock) => {
    const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
    leaveHome(f, r, 1560);
    f.win.scrollY = 0; layout.splice(3, 1); loc(r, { key: 'home', pathname: '/' }); f.flushRaf();
    assert.equal(f.win.scrollY, 1140 + 300 + (420 - 300));                       // gwA's end + the same distance below it
    r.stop();
    const g = pageWithBlocks([{ id: 'unrelated', top: 0, height: 5000 }]); const r2 = createScrollRestorer2029(g.win); r2.start();
    leaveHome(g, r2, 1500); r2.stop();                                          // persists the number
    g.win.scrollY = 0; g.win.sessionStorage.setItem(SCROLL_ANCHOR_STORE_KEY, JSON.stringify({ home: [['gwB', 100, 400]] }));
    const r3 = createScrollRestorer2029(g.win); r3.start(); loc(r3, { key: 'home', pathname: '/' });
    clock.advance(RESTORE_STABLE_MS + 50); g.flushRaf(); assert.equal(g.win.scrollY, 0);       // waiting for the block, the number is not trusted yet
    clock.advance(RESTORE_FORCE_AFTER_MS); g.flushRaf(); assert.equal(g.win.scrollY, 1500);     // bounded: then the number
  });
});
test('the hold is as before: anchoring paused through it, restored after the quiet period, extended by late changes up to the cap', () => {
  withClock((clock) => {
    const layout = home(); const f = pageWithBlocks(layout); const r = createScrollRestorer2029(f.win); r.start();
    leaveHome(f, r, 1560); f.win.scrollY = 0; loc(r, { key: 'home', pathname: '/' }); f.flushRaf();
    assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');
    clock.advance(RESTORE_HOLD_MS - 100); f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');
    f.win.document.documentElement.scrollHeight = 7300; clock.advance(RESTORE_HOLD_MS - 100); f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, 'none');   // growth extended it
    clock.advance(RESTORE_HOLD_MS + 10); f.flushRaf(); assert.equal(f.win.document.documentElement.style.overflowAnchor, '');
  });
});
