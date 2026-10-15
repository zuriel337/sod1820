import test from 'node:test';
import assert from 'node:assert/strict';
import { planNavigation, trimStore, createScrollRestorer2029, SCROLL_STORE_KEY, RESTORE_MAX_WAIT_MS, RESTORE_STABLE_MS, RESTORE_HOLD_MS, RESTORE_HOLD_MAX_MS } from '../src/lib/scrollRestore2029.js';

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
