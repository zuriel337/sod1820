import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { rolldown } from 'rolldown';

const entry = new URL('../supabase/functions/sg-rate-limit/index.ts', import.meta.url).pathname;
const source = readFileSync(entry, 'utf8');

const productionPayload = {
  iss: 'https://oidc.vercel.com/sod1820-s-projects',
  owner_id: 'team_vtfWHZfKvdbob8gvynQb5N89',
  project_id: 'prj_43q7k7QFAcWnin1tcBjce5xOi7Cq',
  project: 'sod1820',
  environment: 'production',
  sub: 'owner:sod1820-s-projects:project:sod1820:environment:production',
};

async function loadHandler() {
  let handler = null;
  const originalDeno = globalThis.Deno;
  globalThis.Deno = {
    env: {
      get(name) {
        if (name === 'SUPABASE_URL') return 'https://fixture.supabase.test';
        if (name === 'SUPABASE_SERVICE_ROLE_KEY') return 'fixture-service-role';
        return '';
      },
    },
    serve(fn) { handler = fn; },
  };

  const bundle = await rolldown({
    input: entry,
    platform: 'neutral',
    plugins: [{
      name: 'fixture-jose',
      resolveId(id) {
        return id === 'npm:jose@6.2.12' ? '\0fixture-jose' : null;
      },
      load(id) {
        if (id !== '\0fixture-jose') return null;
        return `
            const production = ${JSON.stringify(productionPayload)};
            export const createRemoteJWKSet = (url) => ({ url });
            export const decodeJwt = (token) => {
              if (token === 'fixture-valid') return production;
              if (token === 'fixture-preview') return { ...production, environment: 'preview' };
              throw new Error('invalid fixture token');
            };
            export const jwtVerify = async (token) => ({ payload: decodeJwt(token) });
          `;
      },
    }],
  });
  const generated = await bundle.generate({ format: 'esm' });
  await bundle.close();
  const code = generated.output.find((item) => item.type === 'chunk')?.code;
  assert.ok(code, 'isolated SG limiter bundle must contain an executable chunk');

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  await import(moduleUrl);
  assert.equal(typeof handler, 'function');
  return {
    handler,
    restore() {
      if (originalDeno === undefined) delete globalThis.Deno;
      else globalThis.Deno = originalDeno;
    },
  };
}

test('deployed SG limiter source keeps the production-only OIDC boundary', () => {
  assert.match(source, /ALLOWED_ISSUERS = new Set\(\[TEAM_ISSUER, GLOBAL_ISSUER\]\)/);
  assert.match(source, /payload\.environment !== "production"/);
  assert.match(source, /payload\.sub !== EXPECTED_SUBJECT/);
  assert.match(source, /p_key_hash: keyHash/);
  assert.match(source, /p_window_seconds: windowSeconds/);
  assert.match(source, /p_limit: limit/);
});

test('actual SG limiter handler rejects non-production callers and returns the RPC decision', async (t) => {
  const originalFetch = globalThis.fetch;
  const upstreamCalls = [];
  const runtime = await loadHandler();
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init = {}) => {
    upstreamCalls.push({ url: String(input), init });
    return new Response(JSON.stringify({
      allowed: false,
      count: 9,
      limit: 8,
      window_seconds: 300,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const noAuth = await runtime.handler(new Request('https://fixture.test', { method: 'POST' }));
  assert.equal(noAuth.status, 401);

  const preview = await runtime.handler(new Request('https://fixture.test', {
    method: 'POST',
    headers: { authorization: 'Bearer fixture-preview', 'content-type': 'application/json' },
    body: JSON.stringify({ key_hash: 'a'.repeat(64), window_seconds: 300, limit: 8 }),
  }));
  assert.equal(preview.status, 401);
  assert.equal(upstreamCalls.length, 0);

  const response = await runtime.handler(new Request('https://fixture.test', {
    method: 'POST',
    headers: { authorization: 'Bearer fixture-valid', 'content-type': 'application/json' },
    body: JSON.stringify({ key_hash: 'a'.repeat(64), window_seconds: 300, limit: 8 }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    allowed: false,
    count: 9,
    limit: 8,
    window_seconds: 300,
  });
  assert.equal(upstreamCalls.length, 1);
  assert.equal(upstreamCalls[0].url, 'https://fixture.supabase.test/rest/v1/rpc/edge_rate_limit_check');
  assert.deepEqual(JSON.parse(upstreamCalls[0].init.body), {
    p_key_hash: 'a'.repeat(64),
    p_window_seconds: 300,
    p_limit: 8,
  });
});
