// A post at its original WordPress address `/<slug>` starts the same route-owned source read as `/post/<slug>` while the page code downloads
// (App2029 PublicPostAddressEntry2029). This runs the real function of App2029.jsx against stubbed hooks and pins what a browser test cannot reach cheaply:
// the build without the public release (protected previews register this route too) keeps the plain page and never shows a loading frame forever;
// a visitor whose account is still resolving starts no read; one read per address and identity, cancelled when either changes or the entry unmounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

const app = readFileSync('src/App2029.jsx', 'utf8');
const start = app.indexOf('function PublicPostAddressEntry2029()'), end = app.indexOf('\n}\n', start);
assert.ok(start > 0 && end > start, 'PublicPostAddressEntry2029 must be found');
const source = app.slice(start, end + 3);
const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsxFactory: 'h', jsxFragment: 'Fragment' });

// A component host: useState/useEffect with the dependency comparison React performs, committed by hand.
function host({ release = true, slug = 'old-post', auth = { user: null, loading: false } } = {}) {
  const state = { slugValue: slug, authValue: auth, hooks: [], cursor: 0, requests: [], reads: [], chunkRequests: 0, mounted: true };
  const context = {
    PUBLIC_READING_RELEASE: release,
    h: (type, props) => ({ type, props: props || {} }), Fragment: Symbol('fragment'),
    useParams: () => ({ slug: state.slugValue }), useAuth: () => state.authValue,
    useState: initial => { const i = state.cursor++; state.hooks[i] ||= { value: initial, isState: true };
      return [state.hooks[i].value, value => { state.hooks[i].value = typeof value === 'function' ? value(state.hooks[i].value) : value; state.dirty = true; }]; },
    useEffect: (fn, deps) => { const i = state.cursor++; const previous = state.hooks[i];
      if (previous && deps && previous.deps.length === deps.length && deps.every((d, k) => Object.is(d, previous.deps[k]))) return;
      state.hooks[i] = { fn, deps, cleanup: previous?.cleanup, pending: true }; },
    beginPostReadingSource: requested => { const request = { slug: requested, cancelled: false, read: `reader:${requested}:${state.reads.length}` };
      state.reads.push(request); return { read: request.read, cancel() { request.cancelled = true; } }; },
    loadPublicPostAddress: () => { state.chunkRequests += 1; return Promise.resolve(); },
    PublicPostAddress2029Page: 'PublicPostAddress2029Page', Loading2029: 'Loading2029',
  };
  vm.createContext(context);
  vm.runInContext(code + ';globalThis.Entry = PublicPostAddressEntry2029;', context);
  const render = () => {
    state.cursor = 0; const element = context.Entry();
    for (const hook of state.hooks) if (hook?.pending) { hook.pending = false; hook.cleanup?.(); hook.cleanup = hook.fn(); }
    return element;
  };
  const settle = () => { let element = render(); for (let i = 0; i < 5 && state.dirty; i += 1) { state.dirty = false; element = render(); } return element; };
  return { state, context, render, settle,
    unmount() { state.mounted = false; for (const hook of state.hooks) { try { hook?.cleanup?.(); } catch { /* none */ } if (hook) hook.cleanup = undefined; } } };
}
const describe = element => (element ? { type: element.type, reader: element.props.sourceReader ?? null } : null);

test('the build without the public release keeps the plain page: no read, no loading frame', () => {
  const entry = host({ release: false });
  assert.deepEqual(describe(entry.settle()), { type: 'PublicPostAddress2029Page', reader: null });
  assert.equal(entry.state.reads.length, 0);
});

test('a guest: the page code is requested in the first render and one read starts with it', () => {
  const entry = host();
  const first = entry.render();
  assert.equal(entry.state.chunkRequests, 1, 'the code is requested before anything else happens');
  assert.equal(entry.state.reads.length, 1, 'the read starts in the same commit');
  assert.deepEqual(describe(first), { type: 'Loading2029', reader: null }, 'the loading frame until the reader belongs to this address');
  const settled = entry.settle();
  assert.deepEqual(describe(settled), { type: 'PublicPostAddress2029Page', reader: 'reader:old-post:0' });
  assert.equal(entry.state.reads.length, 1, 'exactly one read');
});

test('a visitor whose account is still resolving: the code is requested at once, the read waits (as on /post/<slug>)', () => {
  const entry = host({ auth: { user: null, loading: true } });
  assert.deepEqual(describe(entry.settle()), { type: 'Loading2029', reader: null });
  assert.equal(entry.state.chunkRequests >= 1, true);
  assert.equal(entry.state.reads.length, 0);
  entry.state.authValue = { user: { id: 'member-1' }, loading: false };
  assert.deepEqual(describe(entry.settle()), { type: 'PublicPostAddress2029Page', reader: 'reader:old-post:0' });
  assert.equal(entry.state.reads.length, 1);
});

test('another address or another identity cancels the previous read and never hands it over', () => {
  const entry = host();
  entry.settle();
  const [first] = entry.state.reads;
  entry.state.slugValue = 'second-post';
  const element = entry.render();
  assert.equal(first.cancelled, true, 'the read of the previous address is cancelled');
  assert.deepEqual(describe(element), { type: 'Loading2029', reader: null }, 'the stale reader is not handed to the new address');
  assert.deepEqual(describe(entry.settle()), { type: 'PublicPostAddress2029Page', reader: 'reader:second-post:1' });
  entry.state.authValue = { user: { id: 'member-1' }, loading: false };
  const [, second, third] = [first, ...entry.state.reads.slice(1), null];
  void third;
  entry.render();
  assert.equal(second.cancelled, true, 'an identity change cancels the read as well');
  assert.equal(entry.state.reads.length, 3);
});

test('leaving the address cancels its read', () => {
  const entry = host();
  entry.settle();
  const [read] = entry.state.reads;
  entry.unmount();
  assert.equal(read.cancelled, true);
});

test('source pins: the route uses this entry, the page forwards the reader only for an address with a slug, PostEntry2029 is untouched', () => {
  assert.match(app, /<Route path="\/:slug" element=\{<PublicPostAddressEntry2029 \/>\} \/>/);
  const page = readFileSync('src/pages/PublicPostAddress2029Page.jsx', 'utf8');
  assert.match(page, /if \(slug\) return <Post2029Page resolvedSlug=\{slug\} sourceReader=\{sourceReader\} \/>;/);
  assert.match(page, /state\.key === wp && state\.slug && !state\.error\) return <Post2029Page resolvedSlug=\{state\.slug\} \/>;/, 'the ?p= address resolves its own slug first and has no early reader');
  assert.match(app, /function PostEntry2029\(\) \{\n  const \{ slug \} = useParams\(\);\n  const \{ user, loading \} = useAuth\(\);/);
});
