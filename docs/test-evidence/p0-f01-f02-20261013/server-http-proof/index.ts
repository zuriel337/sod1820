// Supplemental #999 evidence only. This is not a production function.
// Deployment must retain verify_jwt=true. No caller-selected destinations/data.
import permit from './permit.json' with { type: 'json' };

export const CHILD_REF = 'krnaxxndgtrdnaddlzws';
export const ORIGIN = `https://${CHILD_REF}.supabase.co`;
export const FIXTURES = Object.freeze([
  'posts/tmp-content-5074.txt',
  'sod1820/cards/ego-confession.png',
  'sod1820/videos/ego-confession.en.vtt',
  'sod1820/videos/ego-confession.he.vtt',
  'sod1820/videos/ego-confession.jpg',
  'sod1820/videos/ego-confession.mp4',
  'sod1820/updates/metro-gush-dan-fixture-a.png',
  'sod1820/updates/metro-gush-dan-fixture-b.png',
]);
const SENTINEL = 'community/p0-local-1791499873650.png';
const SENTINEL_SHA = 'a38a4ff7320a3d8764ac959b264f15e335360d7c1e23a0627dee7f366c95c58f';
const encoder = new TextEncoder();
const ORIGINAL = encoder.encode('Disposable local F02 fixture; no production content');
const ATTEMPT = encoder.encode('Unauthorized replacement attempt; disposable test fixture only.');
const NEW_BYTES = encoder.encode('SOD1820 #999 supplemental server HTTP proof; disposable child only.');

export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((n) => n.toString(16).padStart(2, '0')).join('');
}

class ProofFailure extends Error {
  stage: string;
  status: number | null;
  reason: string;
  constructor(stage, status = null, reason = 'unexpected_response') {
    super(stage);
    this.stage = stage;
    this.status = status;
    this.reason = reason;
  }
}

// An HTTP failure alone is never accepted as authorization evidence.
export function denialEvidence(result, rpc = false) {
  if (![400, 401, 403].includes(result.status)) return null;
  const message = result.data?.message;
  if (typeof message !== 'string') return null;
  let reason;
  if (/^new row violates row-level security policy(?: for table "[a-z_]+")?$/i.test(message)) {
    reason = message;
  } else if (rpc && result.data?.code === '42501' && /^permission denied for function get_work_log$/i.test(message)) {
    reason = message;
  } else if (rpc && result.data?.code === 'P0001' && message === 'not authorized') {
    reason = message;
  } else {
    return null;
  }
  // Only conventional safe error identifiers and the exact accepted reason leave the server.
  const rawCode = result.data?.code ?? result.data?.error;
  const code = typeof rawCode === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(rawCode) ? rawCode : null;
  return { status: result.status, code, reason };
}

function requireOK(result, stage) {
  if (!result.ok) throw new ProofFailure(stage, result.status);
}

export function resolveInjectedKeyMode(anon, service) {
  if (typeof anon !== 'string' || typeof service !== 'string') return null;
  const modernPublic = /^sb_publishable_[A-Za-z0-9_-]+$/.test(anon);
  const modernSecret = /^sb_secret_[A-Za-z0-9_-]+$/.test(service);
  if (modernPublic && modernSecret) return 'modern';
  // Never combine a modern key with a legacy JWT, or accept reversed/unknown pairs.
  if (anon.startsWith('sb_') || service.startsWith('sb_')) return null;
  try {
    const decodeClaims = (jwt) => {
      const parts = jwt.split('.');
      if (parts.length !== 3 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error('shape');
      const binary = atob(parts[1].replaceAll('-', '+').replaceAll('_', '/'));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0))));
    };
    const publicClaims = decodeClaims(anon);
    const serverClaims = decodeClaims(service);
    return publicClaims?.role === 'anon' && serverClaims?.role === 'service_role'
      && publicClaims.ref === CHILD_REF && serverClaims.ref === CHILD_REF ? 'legacy' : null;
  } catch { return null; }
}

async function runProof({ anon, service, keyMode, fetcher, runId }) {
  const checks = [];
  const cleanup = [];
  const created = new Set();
  const newPath = `p0-local/service-http-proof-${runId}.bin`;
  const unrelated = `not-authorized/service-http-proof-${runId}.bin`;
  let sentinelBefore = null;
  let sentinelAfter = null;
  let restoredSentinel = false;
  let failure = null;
  const api = async (path, token = anon, method = 'GET', body = undefined, upsert = false) => {
    const binary = body instanceof Uint8Array;
    const headers: Record<string, string> = {
      // API-key identity must match the actual role being tested on this request.
      apikey: token,
      'Content-Type': binary ? 'application/octet-stream' : 'application/json',
      'Cache-Control': 'no-cache',
      'x-upsert': String(upsert),
    };
    // Opaque sb_publishable/sb_secret keys are API keys, never Bearer JWTs.
    if (keyMode === 'legacy') headers.Authorization = `Bearer ${token}`;
    const response = await fetcher(ORIGIN + path, {
      method,
      headers,
      body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    let data = null;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { /* binary */ }
    return { status: response.status, ok: response.ok, data, bytes };
  };
  const objectPath = (path) => `/storage/v1/object/gallery/${path}`;
  const publicRead = (path) => api(`/storage/v1/object/public/gallery/${path}?proof=${runId}`);
  const authenticatedRead = (path) => api(`/storage/v1/object/authenticated/gallery/${path}`, service);
  const requireAbsent = async (path, stage) => {
    const result = await authenticatedRead(path);
    // Native Storage commonly returns HTTP 400 for a missing object.
    if (![400, 404].includes(result.status)
      || !['NoSuchKey', 'not_found', 'NotFound'].includes(result.data?.code ?? result.data?.error)
        && !/^(Object not found|The resource was not found)$/i.test(result.data?.message ?? '')) {
      throw new ProofFailure(stage, result.status, 'missing_object_not_proven');
    }
    return result;
  };
  const deleteCreated = async (path) => {
    const result = await api('/storage/v1/object/gallery', service, 'DELETE', { prefixes: [path] });
    requireOK(result, 'cleanup_delete');
    const absent = await requireAbsent(path, 'cleanup_absence');
    created.delete(path);
    cleanup.push({ path, delete_status: result.status, absent_status: absent.status });
  };
  const deny = (result, name, path, rpc = false) => {
    const evidence = denialEvidence(result, rpc);
    if (!evidence) throw new ProofFailure(name, result.status, 'authorization_reason_not_proven');
    checks.push({ name, path, ...evidence });
  };
  const unchanged = async (path, expectedHash, stage) => {
    const result = await publicRead(path);
    requireOK(result, stage);
    const actual = await sha256(result.bytes);
    if (actual !== expectedHash) throw new ProofFailure(stage, result.status, 'object_bytes_changed');
    return actual;
  };

  try {
    const sentinel = await publicRead(SENTINEL);
    requireOK(sentinel, 'existing_public_fixture_read');
    // A drifted baseline must fail without acquiring restoration authority over it.
    if (await sha256(sentinel.bytes) !== SENTINEL_SHA) throw new ProofFailure('existing_public_fixture_hash', sentinel.status);
    sentinelBefore = sentinel.bytes;

    const rpc = await api('/rest/v1/rpc/get_work_log', service, 'POST', {});
    deny(rpc, 'F01_service_role_without_admin_JWT_denied', null, true);

    // ONE new privileged upload acceptance case. Additional eight fixed uploads below
    // are setup for the missing overwrite/insert denials, not reruns of credited tests.
    await requireAbsent(newPath, 'new_service_fixture_absent');
    // Storage may commit even if the HTTP response/body later fails to arrive.
    // Acquire cleanup responsibility before the request leaves this server.
    created.add(newPath);
    const upload = await api(objectPath(newPath), service, 'POST', NEW_BYTES);
    requireOK(upload, 'service_upload');
    const newHash = await unchanged(newPath, await sha256(NEW_BYTES), 'service_public_byte_parity');
    checks.push({ name: 'F02_service_upload_public_byte_parity', path: newPath, status: upload.status, sha256: newHash });

    const originalHash = await sha256(ORIGINAL);
    for (const path of FIXTURES) {
      // The previous accepted harness removed metadata for these eight synthetic paths.
      // Never overwrite a pre-existing object, even in this child.
      await requireAbsent(path, 'protected_fixture_absent');
      created.add(path);
      const seed = await api(objectPath(path), service, 'POST', ORIGINAL);
      requireOK(seed, 'protected_fixture_setup');
      await unchanged(path, originalHash, 'protected_fixture_public_baseline');

      const overwrite = await api(objectPath(path), anon, 'PUT', ATTEMPT);
      deny(overwrite, 'F02_anonymous_PUT_denied', path);
      checks.at(-1).unchanged_sha256 = await unchanged(path, originalHash, 'PUT_byte_preservation');

      const upsert = await api(objectPath(path), anon, 'POST', ATTEMPT, true);
      deny(upsert, 'F02_anonymous_POST_upsert_denied', path);
      checks.at(-1).unchanged_sha256 = await unchanged(path, originalHash, 'upsert_byte_preservation');

      await deleteCreated(path);
      // Retain cleanup responsibility for an unexpected successful anonymous INSERT.
      created.add(path);
      const fresh = await api(objectPath(path), anon, 'POST', ATTEMPT);
      deny(fresh, 'F02_anonymous_fresh_POST_denied', path);
      const absent = await requireAbsent(path, 'fresh_INSERT_created_no_object');
      checks.at(-1).absent_status = absent.status;
      created.delete(path);
    }

    await requireAbsent(unrelated, 'unrelated_fixture_absent');
    created.add(unrelated);
    deny(await api(objectPath(unrelated), anon, 'POST', ATTEMPT), 'F02_unrelated_unauthorized_POST_denied', unrelated);
    checks.at(-1).absent_status = (await requireAbsent(unrelated, 'unrelated_INSERT_created_no_object')).status;
    created.delete(unrelated);

    deny(await api(objectPath(SENTINEL), anon, 'PUT', ATTEMPT), 'F02_community_anonymous_PUT_denied', SENTINEL);
    checks.at(-1).unchanged_sha256 = await unchanged(SENTINEL, SENTINEL_SHA, 'community_byte_preservation');
    if (checks.length !== 28) throw new ProofFailure('supplemental_case_count');
  } catch (error) {
    failure = error instanceof ProofFailure
      ? { stage: error.stage, status: error.status, reason: error.reason }
      : { stage: 'network_or_runtime', status: null, reason: 'request_failed' };
  } finally {
    // Only paths created by this run are deleted. No bulk deletion or schema mutations.
    for (const path of Array.from(created)) {
      try { await deleteCreated(path); }
      catch { cleanup.push({ path, failed: true }); }
    }
    if (sentinelBefore) {
      try {
        const result = await publicRead(SENTINEL);
        requireOK(result, 'final_public_fixture_read');
        sentinelAfter = await sha256(result.bytes);
        if (sentinelAfter !== SENTINEL_SHA) {
          // A failed negative test may have changed this pre-existing synthetic fixture.
          // Restore its captured original bytes, mark the proof failed, never hide the failure.
          requireOK(await api(objectPath(SENTINEL), service, 'PUT', sentinelBefore), 'restore_synthetic_sentinel');
          sentinelAfter = await unchanged(SENTINEL, SENTINEL_SHA, 'restored_sentinel_hash');
          restoredSentinel = true;
          failure ??= { stage: 'sentinel_changed', status: null, reason: 'negative_test_changed_bytes' };
        }
      } catch {
        failure ??= { stage: 'final_public_fixture', status: null, reason: 'preservation_not_proven' };
      }
    }
  }
  if (created.size) failure ??= { stage: 'cleanup', status: null, reason: 'fixture_cleanup_incomplete' };
  return {
    result: failure ? 'NO_GO' : 'PASS_SUPPLEMENTAL_HTTP_ONLY',
    child_ref: CHILD_REF,
    credential_mode: keyMode,
    credited_checks_not_rerun: 37,
    checks,
    negative_request_count: checks.filter((item) => item.name.startsWith('F02_') && item.name.endsWith('_denied')).length,
    cleanup,
    public_fixture_before_sha256: sentinelBefore ? await sha256(sentinelBefore) : null,
    public_fixture_after_sha256: sentinelAfter,
    synthetic_public_fixture_restored_after_failure: restoredSentinel,
    failure,
    production_applied: false,
    independent_main_GO: false,
  };
}

export function createHandler({ env = (name) => Deno.env.get(name), fetcher = fetch, now = Date.now, configuration = permit } = {}) {
  let consumed = false; // Additional replay guard for this isolate; expiry applies across isolates.
  return async (request) => {
    const respond = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);
    // Supabase's gateway may strip /functions/v1 before forwarding to the runtime.
    if (!['/functions/v1/p0-999-supplemental-http-proof', '/p0-999-supplemental-http-proof']
      .includes(new URL(request.url).pathname)) return respond({ error: 'invalid_path' }, 404);
    const time = now();
    if (typeof configuration.expires_at_ms !== 'number' || time >= configuration.expires_at_ms
      || configuration.expires_at_ms - time > 30 * 60 * 1000
      || !/^[0-9a-f]{64}$/.test(configuration.nonce_sha256)) return respond({ error: 'permit_expired_or_unprepared' }, 403);
    const nonce = request.headers.get('x-proof-nonce') ?? '';
    if (!/^[A-Za-z0-9_-]{43}$/.test(nonce) || await sha256(encoder.encode(nonce)) !== configuration.nonce_sha256) {
      return respond({ error: 'not_authorized' }, 403);
    }
    if (consumed) return respond({ error: 'already_consumed' }, 409);
    // Validate project identity before reading credentials or issuing any network call.
    if (env('SUPABASE_URL') !== ORIGIN || !env('DENO_DEPLOYMENT_ID')?.startsWith(`${CHILD_REF}_`)) {
      return respond({ error: 'wrong_project' }, 403);
    }
    const anon = env('SUPABASE_ANON_KEY');
    const service = env('SUPABASE_SERVICE_ROLE_KEY');
    if (!anon || !service) return respond({ error: 'server_credentials_unavailable' }, 503);
    const keyMode = resolveInjectedKeyMode(anon, service);
    if (!keyMode) return respond({ error: 'unexpected_injected_key_role_or_project' }, 503);
    // The request body is deliberately ignored. It cannot select tests, paths, data, or SQL.
    consumed = true;
    const result = await runProof({ anon, service, keyMode, fetcher, runId: configuration.nonce_sha256.slice(0, 16) });
    return respond(result, result.result === 'PASS_SUPPLEMENTAL_HTTP_ONLY' ? 200 : 409);
  };
}

if (typeof Deno !== 'undefined') Deno.serve(createHandler());
