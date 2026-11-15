import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { setImmediate as tick } from 'node:timers/promises';
import { build } from 'esbuild';

// Run the actual projection and its access/verification decisions. Only I/O and
// the pack compiler boundary are fixtures; the compiler has its own owner tests.
const compiled = await build({
  entryPoints: ['src/lib/research/post2029ReadingProjection.js'],
  bundle: true, write: false, format: 'cjs', platform: 'node',
  plugins: [{ name: 'projection-io', setup(b) {
    const modules = {
      'supabase.js': 'export const supabase=globalThis.fixture.db; export const getPostBySlug=(...a)=>globalThis.fixture.readRelated(...a);',
      'researchW2Executors.js': 'export const createCanonicalNumberW2Executors=()=>({numeric_operators:{}});',
      'numberSystemMethods.js': 'export const fetchLiveNumericRuleVersions=async()=>[];',
      'goldenPostContextPacks.js': 'export const buildGoldenPostContextPack=(input)=>globalThis.fixture.pack(input);',
    };
    b.onResolve({ filter: /(?:supabase|researchW2Executors|numberSystemMethods|goldenPostContextPacks)\.js$/ }, args => {
      const name = args.path.split('/').at(-1);
      return modules[name] ? { path: name, namespace: 'projection-io' } : null;
    });
    b.onLoad({ filter: /.*/, namespace: 'projection-io' }, args => ({ contents: modules[args.path] }));
  } }],
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function reader({ rpc = async () => ({ data: 631 }), topic = async () => ({ data: null }), pack = async input => ({ rows: input.traces }), readRelated = async () => null } = {}) {
  const calls = [];
  const db = {
    rpc: (name, args) => { calls.push({ name, args }); return rpc(name, args); },
    from: table => {
      const query = { table };
      for (const method of ['select', 'eq', 'limit', 'maybeSingle', 'abortSignal']) query[method] = (...args) => { query[method + 'Args'] = args; return query; };
      query.then = (yes, no) => { calls.push({ name: 'topic', table }); return Promise.resolve(topic(query)).then(yes, no); };
      return query;
    },
  };
  const context = { module: { exports: {} }, DOMException, fixture: { db, pack, readRelated } };
  context.exports = context.module.exports;
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  return { read: context.module.exports.fetchPost2029ReadingProjection, calls };
}
const source = (slug, id = 90001) => ({ id, slug, title: 'Public fixture', source: 'sod1820', tags: [], content: '<p>Unmodified source.</p>' });
const fz = () => source('flydubai-fz1073-363-14000-remzei-geula', 5112);

test('Bennett story checks start while focus checks are pending; no unverified equality is promoted', async () => {
  const focus = deferred();
  const row = source('bennett-melach-631-78');
  row.content = '<p><button data-contextual-number-focus="true" data-expression="מלח" data-result="78">78</button><button data-contextual-number-focus="true" data-expression="מלח" data-result="79">79</button></p>';
  const r = reader({ rpc: (_name, { p_phrase }) => p_phrase === 'מלח' ? Promise.resolve({ data: 78 }) : focus.promise });
  let done = false;
  const pending = r.read(row.slug, { readPost: async () => row }).then(value => { done = true; return value; });
  await tick();
  const storyCalls = r.calls.filter(c => c.args?.p_phrase === 'מלח').length;
  assert.equal(done, false);
  focus.resolve({ data: 0 });
  const result = await pending;
  assert.equal(storyCalls, 2, 'independent story RPCs must start before focus RPCs finish');
  assert.equal(r.calls.length, 5, 'same bounded queries, no repeated retry');
  assert.equal(result.sourcePost, row);
  assert.equal(result.regions.some(x => x.contextualNumberFocus), false);
  assert.equal((result.post.content.match(/data-contextual-number-focus="true"/g) || []).length, 1);
  assert.match(result.post.content, /data-result="79"[^>]*data-gem="מלח"/);
});

test('FZ topic and six governed traces overlap; the full projection still waits for the pack', async () => {
  const topic = deferred(), pack = deferred();
  let packInput, done = false;
  const r = reader({ topic: () => topic.promise, rpc: async (name, args) => ({ data: { name, phrase: args.p_phrase } }),
    pack: input => { packInput = input; return pack.promise; } });
  const row = fz();
  const pending = r.read(row.slug, { readPost: async () => row }).then(value => { done = true; return value; });
  await tick();
  const started = r.calls.filter(c => c.name === 'gematria_method_trace').length;
  topic.resolve({ data: null });
  await tick();
  assert.equal(done, false, 'pending mandatory pack must not render as success');
  const value = { rows: [], witness: 'completed-pack' };
  pack.resolve(value);
  const result = await pending;
  assert.equal(started, 6, 'trace reads must start before the independent topic completes');
  assert.equal(packInput.traces.length, 6);
  assert.equal(result.contextPack, value);
  assert.equal(result.sourcePost, row);
  assert.ok(result.experience.connections.filter(x => x.kind === 'post').every(x => !x.href), 'related sources still require admission');
});

test('a rejected early pack is observed immediately and still rejects the eventual projection', async () => {
  const topic = deferred(), error = new Error('pack compiler fixture failure'), unhandled = [];
  const observe = reason => unhandled.push(reason);
  process.on('unhandledRejection', observe);
  try {
    let started = false;
    const r = reader({ topic: () => topic.promise, rpc: async () => ({ data: null }), pack: async () => { started = true; throw error; } });
    const row = fz();
    const pending = r.read(row.slug, { readPost: async () => row });
    const rejection = assert.rejects(pending, reason => reason === error);
    await tick(); await tick();
    const startedBeforeTopic = started;
    assert.deepEqual(unhandled, []);
    topic.resolve({ data: null });
    await rejection;
    assert.equal(startedBeforeTopic, true);
  } finally { process.off('unhandledRejection', observe); }
});

test('source invitations and ordinary posts do not fetch pack traces; denied and cancelled reads do no enrichment', async () => {
  for (const mode of ['ordinary', 'invitation', 'draft', 'suppressed', 'cancelled', 'missing']) {
    const r = reader();
    const row = mode === 'ordinary' ? source('ordinary') : fz();
    if (mode === 'draft') row.source = 'gpt-draft';
    if (mode === 'suppressed') row.tags = ['טיוטה'];
    const pending = r.read(row.slug, { readPost: async () => mode === 'missing' ? null : row,
      sourceInvitation: mode === 'invitation', signal: { aborted: mode === 'cancelled' } });
    if (mode === 'cancelled') await assert.rejects(pending, e => e.name === 'AbortError');
    else {
      const value = await pending;
      if (['draft', 'suppressed', 'missing'].includes(mode)) assert.equal(value, null);
      else assert.equal(value.contextPack, null);
    }
    assert.equal(r.calls.filter(c => c.name === 'gematria_method_trace').length, 0, mode);
    if (!['ordinary', 'invitation'].includes(mode)) assert.equal(r.calls.length, 0, mode);
  }
});

test('failed canonical traces remain absent, and cancellation during topic lookup still rejects', async () => {
  let received;
  const r = reader({ rpc: async (_name, args) => {
    if (args.p_phrase === 'אשר בשמים ממעל') throw new Error('network fixture');
    return { data: null, error: { message: 'canonical fixture denied' } };
  }, pack: async input => { received = input; return { rows: [] }; } });
  const row = fz();
  const result = await r.read(row.slug, { readPost: async () => row });
  assert.equal(received.traces.length, 0);
  assert.equal(result.contextPack.rows.length, 0);
  const wait = deferred(), controller = new AbortController();
  const cancelled = reader({ topic: () => wait.promise });
  const pending = cancelled.read(row.slug, { readPost: async () => row, signal: controller.signal });
  await tick(); controller.abort(); wait.resolve({ data: null });
  await assert.rejects(pending, e => e.name === 'AbortError');
});

test('a topic failure stays a failure even if the concurrent pack rejects later', async () => {
  const pack = deferred(), topicFailure = new Error('topic fixture failure'), unhandled = [];
  const observe = reason => unhandled.push(reason);
  process.on('unhandledRejection', observe);
  try {
    const r = reader({ topic: async () => { throw topicFailure; }, pack: () => pack.promise });
    const row = fz();
    await assert.rejects(r.read(row.slug, { readPost: async () => row }), reason => reason === topicFailure);
    pack.reject(new Error('later pack fixture failure'));
    await tick(); await tick();
    assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', observe); }
});
