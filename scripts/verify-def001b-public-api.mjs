// Read-only release gate: GET only, no RPC execution, writes or notification delivery.
const phase = process.argv[2];
if (!['before', 'prepared', 'locked'].includes(phase)) throw new Error('Usage: node scripts/verify-def001b-public-api.mjs before|prepared|locked');
const site = 'https://sod1820.co.il';
const api = 'https://linswmnnkjxvweumprav.supabase.co/rest/v1';
const workerResponse = await fetch(`${site}/sw.js`, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
if (!workerResponse.ok) throw new Error(`Public worker HTTP ${workerResponse.status}`);
const key = /"anonKey":"([^"]+)"/.exec(await workerResponse.text())?.[1];
if (!key) throw new Error('Published anon key not found; no credential fallback');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const get = route => fetch(api + route, { headers, method: 'GET', signal: AbortSignal.timeout(20000), cache: 'no-store' });
let failed = 0;
function report(name, ok, extra = '') { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); if (!ok) failed++; }
// OpenAPI root is restricted to service_role on this project. OPTIONS returns 200 even for
// nonexistent functions, so neither proves cache readiness. A deliberately nonexistent
// named argument (p_topic / p_endpoin, deliberately misspelled) produces PGRST202 BEFORE execution. Its exact-signature hint proves that
// the reviewed function is in the API cache. Never use a valid invocation as a probe.
for (const [name, argumentsExpected, probe] of [
  ['push_subscription_upsert_v1', ['p_auth', 'p_endpoint', 'p_p256dh', 'p_topics', 'p_user_agent', 'p_visitor'], { p_auth: '', p_endpoint: 'invalid-schema-probe', p_p256dh: '', p_topic: '{}', p_user_agent: '', p_visitor: '' }],
  ['push_subscription_delete_v1', ['p_endpoint'], { p_endpoin: 'invalid-schema-probe' }],
]) {
  const r = await get(`/rpc/${name}?${new URLSearchParams(probe)}`);
  const body = await r.json();
  const hint = String(body.hint || '');
  const signature = new RegExp(`public\\.${name}\\(([^)]*)\\)`).exec(hint);
  const names = signature ? signature[1].split(',').map(x => x.trim()).sort() : [];
  const visible = JSON.stringify(names) === JSON.stringify(argumentsExpected);
  const refused = r.status === 404 && body.code === 'PGRST202';
  report(`RPC signature ${name}`, refused && visible === (phase !== 'before'), `visible=${visible}, signature lookup refused=${refused}`);
}
for (const [name, route, allowed] of [
  ['public ELS columns', '/els_records?select=id,title,slug&limit=0', true],
  ['ELS visitor_id', '/els_records?select=visitor_id&limit=0', phase === 'before'],
  ['feedback', '/feedback?select=id&limit=0', phase === 'before'],
  ['push table', '/push_subscriptions?select=id&limit=0', phase !== 'locked'],
]) {
  const r = await get(route);
  const body = await r.json();
  // Empty result only. No feedback, visitor identifier or subscription endpoint is requested.
  const ok = allowed ? r.ok && Array.isArray(body) && body.length === 0
    : (r.status === 401 || r.status === 403) && body?.code === '42501';
  report(name, ok, `HTTP ${r.status}`);
}
console.log(`DEF001B API phase ${phase}: ${6 - failed}/6; GET only, no RPC invoked.`);
process.exitCode = failed ? 1 : 0;
