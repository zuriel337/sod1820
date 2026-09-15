import coreMiddleware from './middleware-core.js';

// SG rate-limit wrapper around the audited Smart Quarantine / Adaptive Strict core.
// Human Gate: 15.9.2026. No country hard-block is introduced here.
export const config = {
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoibGluc3dtbm5ranh2d2V1bXByYXYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MDYyODc2MiwiZXhwIjoyMDk2MjA0NzYyfQ.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';
const SG_RATE_LIMIT_URL = `${SUPABASE_URL}/functions/v1/sg-rate-limit`;

const SG_POLICY_CACHE_MS = 5 * 60 * 1000;
let SG_POLICY = null;
let SG_POLICY_AT = 0;
let SG_RATE_LIMIT_WARNED = false;

async function sgPolicy() {
  const now = Date.now();
  if (SG_POLICY && now - SG_POLICY_AT < SG_POLICY_CACHE_MS) return SG_POLICY;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/edge_blocked_countries?select=mode,strict_level&code=eq.SG&enabled=eq.true&limit=1`, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
    });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0]) {
      SG_POLICY = {
        mode: String(rows[0].mode || ''),
        strictLevel: Math.max(1, Math.min(3, Number(rows[0].strict_level) || 1)),
      };
      SG_POLICY_AT = now;
      return SG_POLICY;
    }
  } catch { /* fail-open: core middleware still enforces its normal policy */ }
  return null;
}

const GOOD_BOT = /(googlebot|google-inspectiontool|mediapartners-google|googleother|google-read-aloud|feedfetcher-google|bingbot|duckduckbot|yandex|baidu|applebot|facebookexternalhit|facebot|meta-externalagent|facebookbot|meta-externalfetcher|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterest|redditbot|skypeuripreview|embedly|iframely|w3c_validator|vkshare|jetmon|jetpack|uptimerobot|pingdom|statuscake|site24x7|betteruptime)/;
const BAD_BOT = /(python-requests|python-urllib|aiohttp|httpx|scrapy|curl\/|wget\/|libwww|go-http-client|okhttp|node-fetch|axios\/|java\/|apache-httpclient|headless|phantomjs|puppeteer|playwright|selenium|guzzle|winhttp|zgrab|masscan|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|um-ic|ubermetrics|dataforseo|blexbot|barkrowler|mauibot|serpstatbot|zoominfobot)/;
const AI_BOT = /(gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|claude-web|perplexitybot|perplexity-user|amazonbot|ccbot|cohere-ai|google-extended|applebot-extended|bytespider|youbot|ai2bot|omgili|diffbot|timpibot|imagesiftbot|webzio|meta-externalagent)/;
const GENERIC_BOT = /(bot|crawler|crawl|spider|scraper)/;
const EXPENSIVE_PATH = /^\/(journey|journey-beta|research|reveal|experience|auth|profile|login|admin|traffic|numbers-report|theme-preview)(\/|$)/;

function classify(ua) {
  if (!ua) return 'bot';
  if (GOOD_BOT.test(ua)) return 'goodbot';
  if (AI_BOT.test(ua)) return 'ai';
  if (BAD_BOT.test(ua)) return 'bot';
  if (GENERIC_BOT.test(ua)) return 'bot';
  return 'browser';
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const item = part.trim();
    if (item.startsWith(`${name}=`)) return item.slice(name.length + 1);
  }
  return null;
}

const QUARANTINE_POLICY_VERSION = 'q2029v1';

function quarantineBrowserRisk(request, uaRaw, path) {
  let score = 0;
  const ua = String(uaRaw || '');
  const chromium = ua.match(/(Chrome|CriOS)\/(\d+)/i);
  const chromiumMajor = chromium ? Number(chromium[2]) : null;

  if (/^Mozilla\/[45]\.\d{2,}/i.test(ua)) score += 3;
  if (chromiumMajor != null && chromiumMajor < 110) score += 2;
  if (/\b(?:MSIE|Trident)\b/i.test(ua) || /Android [0-5](?:\.|;)/i.test(ua)) score += 1;

  const accept = request.headers.get('accept') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const fetchMode = request.headers.get('sec-fetch-mode') || '';
  const fetchDest = request.headers.get('sec-fetch-dest') || '';
  if (!acceptLanguage) score += 1;
  if (accept && !/text\/html|application\/xhtml\+xml|\*\/\*/i.test(accept)) score += 1;
  if (chromiumMajor != null && chromiumMajor >= 100 && !fetchMode && !fetchDest) score += 1;
  if (EXPENSIVE_PATH.test(path)) score += 1;

  const band = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { score, band };
}

function hasQuarantineProof(request, risk) {
  return cookieValue(request, 'sod_edge_q_SG') === `${QUARANTINE_POLICY_VERSION}:${risk.band}`;
}

const SG_RATE_LIMIT_WINDOW_SECONDS = 5 * 60;

function sgRateLimitCap(risk, path) {
  let cap = risk.band === 'high' ? 6 : risk.band === 'medium' ? 12 : 30;
  if (EXPENSIVE_PATH.test(path)) cap = Math.min(cap, 8);
  return cap;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function vercelOidcToken() {
  try {
    return typeof process !== 'undefined' ? String(process.env?.VERCEL_OIDC_TOKEN || '') : '';
  } catch {
    return '';
  }
}

async function sgBrowserRateLimit(request, risk, path) {
  const ip = String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const limit = sgRateLimitCap(risk, path);
  if (!ip) return { allowed: true, limit, windowSeconds: SG_RATE_LIMIT_WINDOW_SECONDS };

  const oidc = vercelOidcToken();
  if (!oidc) {
    if (!SG_RATE_LIMIT_WARNED) {
      SG_RATE_LIMIT_WARNED = true;
      console.warn('sg-rate-limit fail-open: missing VERCEL_OIDC_TOKEN');
    }
    return { allowed: true, limit, windowSeconds: SG_RATE_LIMIT_WINDOW_SECONDS };
  }

  try {
    const keyHash = await sha256Hex(`sg:${ip}`);
    const r = await fetch(SG_RATE_LIMIT_URL, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${oidc}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key_hash: keyHash,
        window_seconds: SG_RATE_LIMIT_WINDOW_SECONDS,
        limit,
      }),
    });
    if (!r.ok) {
      if (!SG_RATE_LIMIT_WARNED) {
        SG_RATE_LIMIT_WARNED = true;
        console.warn(`sg-rate-limit fail-open: edge function status ${r.status}`);
      }
      return { allowed: true, limit, windowSeconds: SG_RATE_LIMIT_WINDOW_SECONDS };
    }
    const data = await r.json();
    return {
      allowed: data?.allowed !== false,
      limit: Number(data?.limit) || limit,
      windowSeconds: Number(data?.window_seconds) || SG_RATE_LIMIT_WINDOW_SECONDS,
    };
  } catch {
    if (!SG_RATE_LIMIT_WARNED) {
      SG_RATE_LIMIT_WARNED = true;
      console.warn('sg-rate-limit fail-open: edge function request failed');
    }
    return { allowed: true, limit, windowSeconds: SG_RATE_LIMIT_WINDOW_SECONDS };
  }
}

export default async function middleware(request, context) {
  const country = String(request.headers.get('x-vercel-ip-country') || 'XX').toUpperCase();

  if (country === 'SG') {
    const policy = await sgPolicy();
    const uaRaw = request.headers.get('user-agent') || '';
    const kind = classify(uaRaw.toLowerCase());

    if (policy?.mode === 'quarantine' && policy.strictLevel >= 3 && kind === 'browser') {
      let path = '/';
      try { path = new URL(request.url).pathname; } catch { /* ignore */ }

      const risk = quarantineBrowserRisk(request, uaRaw, path);
      if (hasQuarantineProof(request, risk)) {
        const rate = await sgBrowserRateLimit(request, risk, path);
        if (!rate.allowed) {
          return new Response('Too many requests', {
            status: 429,
            headers: {
              'cache-control': 'no-store',
              'retry-after': String(rate.windowSeconds),
              'x-sod-edge-policy': 'sg-rate-limit',
              'x-sod-edge-risk': risk.band,
            },
          });
        }
      }
    }
  }

  return coreMiddleware(request, context);
}
