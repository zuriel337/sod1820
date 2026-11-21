import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Vite inlines this build constant in the public artifact; mirror that single define for Node.
const source = readFileSync(new URL('../src/lib/authLazy2029.js', import.meta.url), 'utf8')
  .replace("import { PUBLIC_READING_PRODUCTION_ARTIFACT } from './publicReadingRelease2029.js';", 'const PUBLIC_READING_PRODUCTION_ARTIFACT = true;');
const { AuthClient, _setAuthImportForTests } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
function setup(t, stored = null, route = '/') {
  const original = globalThis.location;
  globalThis.location = { origin: 'https://sod1820.co.il', pathname: route, search: '', hash: '' };
  t.after(() => { globalThis.location = original; _setAuthImportForTests(); });
  let loads = 0;
  const subscriptions = [];
  class Real {
    constructor(options) { this.options = options; }
    getSession() { return { data: { session: stored ? { user: { id: 'sdk-only' } } : null }, error: null }; }
    onAuthStateChange(callback) { const item = { callback, removed: false }; subscriptions.push(item); return { data: { subscription: { unsubscribe: () => { item.removed = true; } } } }; }
    signInWithPassword(...args) { return { forwarded: args }; }
  }
  _setAuthImportForTests(async () => { loads++; return { AuthClient: Real }; });
  const options = { storageKey: 'account', persistSession: true, storage: { probe: () => 'durable', getItem: async key => key === 'account' ? stored : null } };
  return { options, loads: () => loads, subscriptions };
}
test('anonymous reader receives an empty session without downloading Auth', async t => {
  const env = setup(t), client = new AuthClient(env.options), events = [];
  client.onAuthStateChange((...args) => events.push(args));
  assert.equal((await client.getSession()).data.session, null);
  assert.equal(env.loads(), 0); assert.deepEqual(events, [['INITIAL_SESSION', null]]);
});
test('any stored bytes defer identity to the SDK, never grant a cached role', async t => {
  const env = setup(t, 'malformed-or-forged'), client = new AuthClient(env.options);
  assert.deepEqual((await client.getSession()).data.session, { user: { id: 'sdk-only' } }); assert.equal(env.loads(), 1);
});
test('callback and login paths initialize the real SDK immediately', async t => {
  const env = setup(t, null, '/auth/callback'); const client = new AuthClient(env.options);
  await client.getSession(); assert.equal(env.loads(), 1);
});
test('explicit actions share one SDK and forward exact arguments', async t => {
  const env = setup(t), client = new AuthClient(env.options); await client.getSession();
  const args = { email: 'fixture@example.invalid', password: 'fixture-only' };
  const [a,b] = await Promise.all([client.signInWithPassword(args), client.signInWithPassword(args)]);
  assert.deepEqual(a, { forwarded: [args] }); assert.deepEqual(a,b); assert.equal(env.loads(),1);
});
test('cross-tab storage wakes the real SDK and transfers only active subscriptions', async t => {
  const env=setup(t),client=new AuthClient(env.options); await client.getSession();
  const removed=client.onAuthStateChange(()=>{});removed.data.subscription.unsubscribe();client.onAuthStateChange(()=>{});
  client.onStorage({key:'account'});await client.getSession();assert.equal(env.loads(),1);assert.equal(env.subscriptions.length,1);
});
test('storage uncertainty uses the SDK rather than assuming a guest', async t => {
  const env=setup(t);env.options.storage.getItem=()=>{throw Error('blocked');};
  await new AuthClient(env.options).getSession();assert.equal(env.loads(),1);
});

// Build-time inventory: this boundary is intentionally smaller than the SDK.
// Unknown methods, computed escapes and new exports need an explicit adapter review.
import { readdirSync } from 'node:fs';
import { parseSync } from 'rolldown/utils';
const publicMethods = new Set(Object.getOwnPropertyNames(AuthClient.prototype)
  .filter(name => !['constructor', 'checkGuest', 'materialize'].includes(name)));
const memberName = node => node?.type === 'MemberExpression'
  ? node.computed ? node.property.type === 'Literal' ? node.property.value : null : node.property.name : null;
function authBoundaryViolations(code, file = 'fixture.js') {
  const parsed = parseSync(file, code);
  assert.deepEqual(parsed.errors, [], `cannot inventory ${file}`);
  const violations = [];
  const sdkParameters = new Set(file.endsWith('publicReadingAuthSession.js') ? ['auth'] : []);
  function parameters(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'AssignmentPattern' && node.left.type === 'Identifier' && memberName(node.right) === 'auth') sdkParameters.add(node.left.name);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(parameters); else if (value && typeof value === 'object') parameters(value);
  }
  parameters(parsed.program);
  function walk(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'MemberExpression') {
      const receiver = node.object;
      const sdkReceiver = memberName(receiver) === 'auth';
      const verificationParameter = receiver.type === 'Identifier' && sdkParameters.has(receiver.name);
      if (sdkReceiver || verificationParameter) {
        const method = memberName(node);
        // Measurement contexts contain identity data, not a Supabase Auth client.
        const measurementData = sdkReceiver && receiver.object.type === 'Identifier' && receiver.object.name === 'context'
          && ['token', 'userId'].includes(method);
        if (!measurementData && !publicMethods.has(method)) violations.push(`unsupported auth member: ${method ?? 'computed'}`);
      }
      // Web Push encryption keys named 'auth' are data, unrelated to GoTrue.
      const pushKey = file.endsWith('pushSubscriptionStore.js') && node.object.name === 'sub'
        || file.endsWith('/push.js') && memberName(node.object) === 'keys';
      if (!pushKey && memberName(node) === 'auth' && !(parent?.type === 'MemberExpression' && parent.object === node)
        && !(parent?.type === 'CallExpression' && parent.callee?.name === 'verifyReadingSession')
        && !(parent?.type === 'AssignmentPattern' && parent.left.type === 'Identifier' && parent.right === node)) {
        violations.push('auth client escape: review aliases/destructuring before use');
      }
    }
    const module = ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)
      ? node.source?.value : null;
    if (module?.startsWith('@supabase/auth-js')) {
      if (!(file.endsWith('authLazy2029.js') && node.type === 'ImportExpression' && module === '@supabase/auth-js/dist/module/index.js'))
        violations.push(`direct Auth import/export: ${module}`);
    }
    if (module === '@supabase/supabase-js' && !(node.type === 'ImportDeclaration' && node.specifiers.every(s => s.type === 'ImportSpecifier' && s.imported.name === 'createClient')))
      violations.push('new Supabase export: review re-exported Auth symbols');
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      if (Array.isArray(value)) value.forEach(child => walk(child, node));
      else if (value && typeof value === 'object') walk(value, node);
    }
  }
  walk(parsed.program, null);
  return violations;
}
function applicationFiles(dir) {
  return readdirSync(dir, {withFileTypes:true}).flatMap(item => {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), dir);
    return item.isDirectory() ? applicationFiles(path) : /\.[cm]?[jt]sx?$/.test(item.name) && !/\.test\./.test(item.name) ? [path] : [];
  });
}
test('all application Auth operations and SDK imports stay inside the lazy boundary', () => {
  const offenders = applicationFiles(new URL('../src/', import.meta.url)).flatMap(file =>
    authBoundaryViolations(readFileSync(file, 'utf8'), file.pathname).map(message => `${file.pathname}: ${message}`));
  assert.deepEqual(offenders, []);
});
test('Auth inventory catches unsupported methods, aliases and error-class imports', () => {
  const authPackage = '@supabase/' + 'auth-js', clientPackage = '@supabase/' + 'supabase-js';
  for (const mutation of ['client.auth.signInAnonymously()', 'client.auth[method]()', 'client.auth.mfa.enroll({})',
    'function f({auth=client.auth}) { auth.signInAnonymously(); }', 'const {signOut}=client.auth', 'const auth=client.auth',
    `import {AuthError} from "${authPackage}"`, `export * from "${authPackage}"`,
    `import {AuthError} from "${clientPackage}"`, `import("${authPackage}")`])
    assert.ok(authBoundaryViolations(mutation).length > 0, mutation);
  assert.deepEqual(authBoundaryViolations('client.auth["signOut"](); client?.auth?.getSession?.()'), []);
});

test('the installed Supabase client consumes only the provided AuthClient export', () => {
  const code=readFileSync(new URL('../node_modules/@supabase/supabase-js/dist/index.mjs', import.meta.url),'utf8');
  const ast=parseSync('supabase.mjs',code);
  const imports=ast.program.body.filter(n=>n.type==='ImportDeclaration'&&n.source.value==='@supabase/auth-js');
  assert.equal(imports.length,1);
  assert.deepEqual(imports[0].specifiers.map(n=>n.imported?.name),['AuthClient']);
});
