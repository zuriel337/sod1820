import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseOffscreenAnimations } from '../src/lib/pauseOffscreenAnimations2029.js';

function setup(animationDefs) {
  const observed = []; let callback = null; let disconnected = false; const timers = []; const frames = [];
  class FakeIO { constructor(cb) { callback = cb; } observe(el) { observed.push(el); } disconnect() { disconnected = true; } }
  const mk = ({ iterations = Infinity, state = 'running', target }) => ({ playState: state, effect: { target, getComputedTiming: () => ({ iterations }) }, pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; } });
  const animations = animationDefs.map((d) => mk(d));
  const root = { getAnimations: () => animations };
  const win = { IntersectionObserver: FakeIO, requestAnimationFrame: (f) => { frames.push(f); return frames.length; }, cancelAnimationFrame() {}, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {} };
  return { root, win, animations, observed, fire: (entries) => callback(entries), get disconnected() { return disconnected; }, frames, timers };
}

test('observes only infinite animations and pauses them off-screen, resumes in view', () => {
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  const t = setup([{ target: a }, { target: b, iterations: 1 }, { target: c }]);
  const stop = pauseOffscreenAnimations(t.root, { win: t.win });
  assert.deepEqual(t.observed, [a, c]);                       // finite animation is left alone
  t.fire([{ target: a, isIntersecting: false }, { target: c, isIntersecting: true }]);
  assert.equal(t.animations[0].playState, 'paused');
  assert.equal(t.animations[1].playState, 'running');
  assert.equal(t.animations[2].playState, 'running');
  t.fire([{ target: a, isIntersecting: true }]);
  assert.equal(t.animations[0].playState, 'running');
  stop();
});

test('cleanup resumes what it paused and disconnects (no stale state when the post changes)', () => {
  const a = { id: 'a' };
  const t = setup([{ target: a }]);
  const stop = pauseOffscreenAnimations(t.root, { win: t.win });
  t.fire([{ target: a, isIntersecting: false }]);
  assert.equal(t.animations[0].playState, 'paused');
  stop();
  assert.equal(t.animations[0].playState, 'running');
  assert.equal(t.disconnected, true);
});

test('cleanup does not touch animations whose element has already left the document', () => {
  const a = { id: 'a', isConnected: true }, gone = { id: 'gone', isConnected: true };
  const t = setup([{ target: a }, { target: gone }]);
  const stop = pauseOffscreenAnimations(t.root, { win: t.win });
  t.fire([{ target: a, isIntersecting: false }, { target: gone, isIntersecting: false }]);
  gone.isConnected = false;
  let played = 0; const orig = t.animations[1].play; t.animations[1].play = function () { played++; return orig.call(this); };
  stop();
  assert.equal(t.animations[0].playState, 'running');
  assert.equal(played, 0);
});

test('does not resume an animation that something else paused', () => {
  const a = { id: 'a' };
  const t = setup([{ target: a, state: 'paused' }]);
  pauseOffscreenAnimations(t.root, { win: t.win });
  t.fire([{ target: a, isIntersecting: true }]);
  assert.equal(t.animations[0].playState, 'paused');
});

test('animations found by the late collection are observed too', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  const t = setup([{ target: a }]);
  pauseOffscreenAnimations(t.root, { win: t.win });
  t.animations.push({ playState: 'running', effect: { target: b, getComputedTiming: () => ({ iterations: Infinity }) }, pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; } });
  t.frames[0]();
  assert.deepEqual(t.observed, [a, b]);
});

test('no-ops safely without the browser APIs', () => {
  assert.equal(typeof pauseOffscreenAnimations(null), 'function');
  assert.equal(typeof pauseOffscreenAnimations({}, { win: {} }), 'function');
  pauseOffscreenAnimations({ getAnimations: () => [] }, { win: null })();
});
