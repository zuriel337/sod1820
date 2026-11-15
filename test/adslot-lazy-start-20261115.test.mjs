// The ad unit sits after the article. Its library used to start the moment the article rendered, in the seconds the cover image and the visitor's first
// interaction need (lab, Slow 4G + 4x CPU: LCP +0.1 to +0.75 s, +0.1 to +0.24 s of blocking time). It now starts when the unit comes within a screen and
// a half of the viewport: at once on a short post, while scrolling on a long one. Eligibility (Israel, humans, a publisher id) is unchanged: adsense.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const { code } = await transform(readFileSync('src/components/AdSlot.jsx', 'utf8'), { loader: 'jsx', format: 'cjs', jsxFactory: 'h', jsxFragment: 'Fragment' });

function mount({ allowed = true, slot = '111', IntersectionObserver = undefined, pushThrows = false } = {}) {
  const calls = { script: 0, pushed: 0 }, effects = [], refs = [];
  const react = { __esModule: true, default: {}, useEffect: fn => effects.push(fn), useRef: initial => { const ref = { current: initial }; refs.push(ref); return ref; } };
  const adsense = { __esModule: true, ADSENSE_CLIENT: 'ca-pub-1', ADSENSE_SLOTS: { post: slot, list: '' }, adsAllowedHere: () => allowed, ensureAdSenseScript: () => { calls.script += 1; } };
  const window = { adsbygoogle: { push: () => { if (pushThrows) throw new Error('not ready'); calls.pushed += 1; } } };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, window, IntersectionObserver, h: (type, props, ...children) => ({ type, props, children }), Fragment: Symbol('fragment'),
    require: id => (id === 'react' ? react : adsense) });
  const element = module.exports.default({ place: 'post' });
  if (refs[1]) refs[1].current = { node: true };   // the DOM node React attaches to the unit
  const cleanups = effects.map(effect => effect());
  return { element, calls, cleanups };
}

test('no unit, no work: not eligible or no slot id renders nothing and starts nothing', () => {
  for (const options of [{ allowed: false }, { slot: '' }]) {
    const result = mount({ ...options, IntersectionObserver: class { observe() { assert.fail('observing a unit that is not shown'); } } });
    assert.equal(result.element, null);
    assert.equal(result.calls.script, 0);
  }
});

test('without IntersectionObserver the library starts at once, as before', () => {
  const result = mount();
  assert.ok(result.element);
  assert.equal(result.calls.script, 1);
  assert.equal(result.calls.pushed, 1);
});

test('with IntersectionObserver the library waits until the unit is within a screen and a half, then starts exactly once', () => {
  const seen = [];
  class FakeObserver { constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = 0; seen.push(this); }
    observe(node) { this.node = node; } disconnect() { this.disconnected += 1; } }
  const result = mount({ IntersectionObserver: FakeObserver });
  const [observer] = seen;
  assert.equal(seen.length, 1);
  assert.deepEqual({ ...observer.options }, { rootMargin: '1200px 0px' });
  assert.deepEqual({ ...observer.node }, { node: true }, 'it observes the unit itself');
  assert.equal(result.calls.script, 0, 'nothing starts while the unit is far below');
  observer.callback([{ isIntersecting: false }]);
  assert.equal(result.calls.script, 0);
  observer.callback([{ isIntersecting: true }]);
  assert.equal(result.calls.script, 1);
  assert.equal(result.calls.pushed, 1);
  assert.equal(observer.disconnected, 1, 'the observer is released once the unit has started');
  observer.callback([{ isIntersecting: true }]);
  assert.equal(result.calls.pushed, 1, 'one push per unit');
});

test('leaving the page before the unit approaches releases the observer and starts nothing', () => {
  const seen = [];
  class FakeObserver { constructor() { this.disconnected = 0; seen.push(this); } observe() {} disconnect() { this.disconnected += 1; } }
  const result = mount({ IntersectionObserver: FakeObserver });
  result.cleanups.forEach(cleanup => cleanup?.());
  assert.equal(seen[0].disconnected, 1);
  assert.equal(result.calls.script, 0);
});

test('a library that is not ready yet is not an error (the push is made when its queue drains)', () => {
  const result = mount({ pushThrows: true });
  assert.equal(result.calls.script, 1);
  assert.equal(result.calls.pushed, 0);
});
