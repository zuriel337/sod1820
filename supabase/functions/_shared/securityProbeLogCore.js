// Core of the security-probe-log edge function (decision 337, 26.11.2026). Pure and dependency-injected so that node tests run the
// exact production logic; supabase/functions/security-probe-log/index.ts only wires the real Vercel OIDC verifier and the real RPC.
//
// Trust model (two gaps closed, "existing mechanisms, minimal privileges"):
//   1. WHO MAY RECORD. public.log_security used to be executable by PUBLIC/anon/authenticated, so anyone with the public anon key could
//      write security_log rows (poisoning the log, forging spikes). It is now service_role only, and this function is its only caller:
//      the caller must present a Vercel OIDC token that the same verifier as sg-rate-limit accepts (Production deployment of this
//      project only). The service-role key never leaves Supabase.
//   2. WHAT IS A CANARY. A user-agent string is not an identity. A row may carry the canary marker only when the request proves
//      knowledge of SECURITY_CANARY_KEY: proof = "<unixMinute>.<hex HMAC-SHA256(key, 'sod1820-security-canary:v1:<unixMinute>')>",
//      accepted within +/-10 minutes. The key lives only in the Supabase function secrets and the GitHub Actions secret of the canary
//      workflow; the edge forwards the opaque proof and never sees the key. Anything else that claims the canary user agent is
//      stored as "forged-canary:..." (and counts as the probe it is).
export const CANARY_UA = 'sod1820-security-canary/1';
export const CANARY_UA_PREFIX = 'sod1820-security-canary';
export const CANARY_PROOF_WINDOW_MINUTES = 10;
export const MAX_BODY_BYTES = 2048;

const COARSE_V4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.0\/24$/;
const COARSE_V6 = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,2}::\/48$/i;
const PROOF_SHAPE = /^\d{1,10}\.[0-9a-f]{64}$/;

function hex(buffer) { return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join(''); }

export async function canaryProof(key, unixMinute, subtle = globalThis.crypto.subtle) {
  const k = await subtle.importKey('raw', new TextEncoder().encode(String(key)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await subtle.sign('HMAC', k, new TextEncoder().encode(`sod1820-security-canary:v1:${unixMinute}`));
  return `${unixMinute}.${hex(mac)}`;
}

function equalConstantTime(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function canaryProofValid(proof, key, nowMs, subtle = globalThis.crypto.subtle) {
  if (!key || typeof proof !== 'string' || !PROOF_SHAPE.test(proof)) return false;
  const minute = Number(proof.split('.')[0]);
  const nowMinute = Math.floor(nowMs / 60000);
  if (!Number.isFinite(minute) || Math.abs(nowMinute - minute) > CANARY_PROOF_WINDOW_MINUTES) return false;
  return equalConstantTime(proof, await canaryProof(key, minute, subtle));
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);
}

// Everything the edge sends is re-validated here: the address must already be coarse, the path is a path (no query/hash), sizes are bounded.
export function normalizeEntry(body) {
  if (!body || typeof body !== 'object') return null;
  const country = /^[A-Za-z]{2}$/.test(String(body.country ?? '')) ? String(body.country).toUpperCase() : 'XX';
  let path = cleanText(body.path, 400).split('?')[0].split('#')[0].slice(0, 300);
  if (!path.startsWith('/')) return null;
  const ip = typeof body.ip === 'string' && (COARSE_V4.test(body.ip) || COARSE_V6.test(body.ip)) ? body.ip : '';
  return { country, path, ua: cleanText(body.ua, 300), ip, proof: typeof body.proof === 'string' ? body.proof.slice(0, 120) : '' };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export function createSecurityProbeLogHandler({ verifyOidc, record, canaryKey = '', now = () => Date.now(), subtle } = {}) {
  return async function handle(req) {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const authorization = req.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const token = authorization.slice(7).trim();
    if (!token) return json({ error: 'unauthorized' }, 401);
    try { await verifyOidc(token); } catch { return json({ error: 'unauthorized' }, 401); }

    let text;
    try { text = await req.text(); } catch { return json({ error: 'invalid_body' }, 400); }
    if (text.length > MAX_BODY_BYTES) return json({ error: 'too_large' }, 413);
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'invalid_json' }, 400); }
    const entry = normalizeEntry(body);
    if (!entry) return json({ error: 'invalid_entry' }, 400);

    let { ua, ip } = entry;
    if (ua.startsWith(CANARY_UA_PREFIX)) {
      if (await canaryProofValid(entry.proof, canaryKey, now(), subtle)) { ua = CANARY_UA; ip = ''; }
      else ua = `forged-canary:${ua}`.slice(0, 300);
    }
    try { await record({ p_country: entry.country, p_path: entry.path, p_ua: ua, p_ip: ip }); } catch { return json({ error: 'backend' }, 503); }
    return json({ ok: true }, 200);
  };
}
