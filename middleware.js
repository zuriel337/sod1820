import { next } from '@vercel/edge';

// ── שומר-סף + לוג צד-שרת (Vercel Edge) ────────────────────────────────────────
// רץ על כל ניווט-דף (כולל index.html הסטטי, שפונקציית API לא רואה).
// שכבות המדיניות:
//   1) חסימה לפי התנהגות (User-Agent של בוט) — עוקבת אחרי הבוט לכל מדינה.
//   2) מדיניות-מדינה חיה מה-DB: monitor | strict | quarantine | blocked.
//      strict = browser מקבל JS challenge אחיד; quarantine = challenge מותאם-סיכון;
//      goodbot/ai עוברים ציבורי; bad bot נחסם. אף challenge אינו Human proof.
//      עוצמה 1/2/3 נשלטת ב-DB; quarantine משתמש בה כתקרת TTL ומחמיר רק כשיש סיכון.
// בוטים "טובים" (חיפוש + תצוגות שיתוף) ברשימה לבנה → עוברים חופשי (SEO/OG).
// מתעדים כל בקשה (כולל נחסמים) ל-edge_geo_log (country+kind) ול-edge_ua_seen (UA
// אמיתי) דרך RPC log_edge, fire-and-forget (waitUntil) — בלי השהיה. כך נראה אם
// בוטים מסתובבים בין מדינות, והאם נפח הדפיקות מ-CN/SG עולה או יורד עם הזמן.
// 📉 דגימת-דפדפן (EDGE_BOT_LOGGING_IO_PASS1, 25.8.2026, באישור צוריאל): kind='browser'
// כבר נספר במלואו ובעושר גבוה יותר דרך site_visits/events (כל דפדפן אמיתי מריץ JS
// ומדווח שם ממילא) — הכתיבה הכפולה ל-log_edge לכל בקשת-דפדפן מיותרת. לכן רק ~1-מ-10
// בקשות-דפדפן נשלחות ל-log_edge, במשקל (p_weight=10) שמפצה על הדגימה במדויק (ראה
// EDGE_BOT_LOGGING_IO_AUDIT work_log). goodbot/ai/bot נשארים במלוא-הנאמנות (ה-Crawl
// Intelligence היחיד לתנועה הזו) — קריאה זהה ל-100% כמו קודם, בלי p_weight.

export const config = {
  // רק ניווטי-דף: לא api/, לא assets/, ולא נתיב עם סיומת קובץ.
  matcher: ['/((?!api/|assets/|.*\\.).*)'],
};

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
// מפתח anon ציבורי (זהה לזה שב-api/ga-insights.js · api/ga-sync.js) — בטוח להטמעה.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

// 🌍 מדיניות-מדינה — אותו owner/table קיים, בלי מערכת מקבילה.
// public.edge_blocked_countries מחזיק enabled + mode + strict_level.
// mode=blocked    → חסימה מלאה ל-browser/bot (goodbot/ai מוחרגים כמו בעבר).
// mode=strict     → browser עובר challenge רך אחיד; bad bot נחסם; goodbot/ai עוברים.
// mode=quarantine → browser עובר challenge מותאם-סיכון מקומי; אין lookup/API נוסף.
// mode=monitor    → אין אכיפה נוספת, רק המדידה הרגילה.
// cache קצר של 5 דקות כדי שאפשר יהיה להעלות/להוריד מינון מה-DB בלי deploy.
const COUNTRY_POLICY_CACHE_MS = 5 * 60 * 1000;
let COUNTRY_POLICIES = null, COUNTRY_POLICIES_AT = 0;
async function countryPolicyMap() {
  const now = Date.now();
  if (COUNTRY_POLICIES && now - COUNTRY_POLICIES_AT < COUNTRY_POLICY_CACHE_MS) return COUNTRY_POLICIES;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/edge_blocked_countries?select=code,mode,strict_level&enabled=eq.true`, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
    });
    const arr = await r.json();
    if (Array.isArray(arr)) {
      COUNTRY_POLICIES = new Map(arr.map((row) => [
        String(row.code || '').toUpperCase(),
        { mode: String(row.mode || 'blocked'), strictLevel: Math.max(1, Math.min(3, Number(row.strict_level) || 1)) },
      ]));
      COUNTRY_POLICIES_AT = now;
    }
  } catch { /* fail-open למדיניות מדינה; שכבות bot/path האחרות ממשיכות לפעול */ }
  return COUNTRY_POLICIES || new Map();
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const item = part.trim();
    if (item.startsWith(`${name}=`)) return item.slice(name.length + 1);
  }
  return null;
}
function hasCookie(request, name) { return cookieValue(request, name) !== null; }

function strictChallengeTtl(level) {
  if (level >= 3) return 60 * 60;       // שעה
  if (level === 2) return 6 * 60 * 60;  // 6 שעות
  return 24 * 60 * 60;                  // 24 שעות
}

function strictBrowserChallenge(country, level) {
  const safeCountry = String(country || 'XX').replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';
  const cookieName = `sod_edge_ok_${safeCountry}`;
  const maxAge = strictChallengeTtl(level);
  const cookie = `${cookieName}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  const scriptCookie = JSON.stringify(cookie);
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>בדיקת גישה</title></head><body><main style="font-family:system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:24px;text-align:center"><h1 style="font-size:22px">בדיקת דפדפן קצרה</h1><p>האתר מאמת שהגישה מגיעה מדפדפן רגיל. המעבר ימשיך אוטומטית.</p><noscript><p>נדרש JavaScript כדי להשלים את בדיקת הגישה.</p></noscript></main><script>document.cookie=${scriptCookie};location.replace(location.href);</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-sod-edge-policy': `strict-l${level}`,
    },
  });
}

// ── Smart Quarantine 2029 ────────────────────────────────────────────────────
// Progressive friction, not a new bot classifier:
// - computes risk only from headers/path already present at the Edge (zero extra network I/O)
// - goodbot/ai stay on the existing public bypass; explicit bad bots still get 403
// - browser stays Unknown: passing this proof is friction only, not Human proof
// - no CAPTCHA/Turnstile/ASN lookup unless a future Human Gate explicitly adds one
const QUARANTINE_POLICY_VERSION = 'q2029v1';
const QUARANTINE_LOW_TTL = 60 * 60;
const QUARANTINE_MEDIUM_TTL = 15 * 60;
const QUARANTINE_HIGH_TTL = 5 * 60;

function quarantineBrowserRisk(request, uaRaw, path) {
  let score = 0;
  const reasons = [];
  const ua = String(uaRaw || '');
  const chromium = ua.match(/(Chrome|CriOS)\/(\d+)/i);
  const chromiumMajor = chromium ? Number(chromium[2]) : null;

  // Malformed crawler-style UA prefixes seen in the live CN sample.
  if (/^Mozilla\/[45]\.\d{2,}/i.test(ua)) { score += 3; reasons.push('malformed_ua'); }
  // Very old Chromium is not blocked; it simply has to re-prove more often.
  if (chromiumMajor != null && chromiumMajor < 110) { score += 2; reasons.push('stale_chromium'); }
  if (/\b(?:MSIE|Trident)\b/i.test(ua) || /Android [0-5](?:\.|;)/i.test(ua)) { score += 1; reasons.push('legacy_stack'); }

  const accept = request.headers.get('accept') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const fetchMode = request.headers.get('sec-fetch-mode') || '';
  const fetchDest = request.headers.get('sec-fetch-dest') || '';
  if (!acceptLanguage) { score += 1; reasons.push('no_accept_language'); }
  if (accept && !/text\/html|application\/xhtml\+xml|\*\/\*/i.test(accept)) { score += 1; reasons.push('non_html_accept'); }
  // Modern Chromium navigation normally sends Sec-Fetch metadata. Missing both is a weak signal only.
  if (chromiumMajor != null && chromiumMajor >= 100 && !fetchMode && !fetchDest) { score += 1; reasons.push('no_fetch_metadata'); }
  // Cost-sensitive/private surfaces receive one extra point, never an automatic block.
  if (EXPENSIVE_PATH.test(path)) { score += 1; reasons.push('sensitive_path'); }

  const band = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  return { score, band, reasons };
}

function quarantineTtl(level, band) {
  const ceiling = strictChallengeTtl(level);
  if (band === 'high') return Math.min(ceiling, QUARANTINE_HIGH_TTL);
  if (band === 'medium') return Math.min(ceiling, QUARANTINE_MEDIUM_TTL);
  return Math.min(ceiling, QUARANTINE_LOW_TTL);
}

function quarantineDelayMs(band) {
  if (band === 'high') return 900;
  if (band === 'medium') return 350;
  return 80;
}

function quarantineProofValue(band) { return `${QUARANTINE_POLICY_VERSION}:${band}`; }

function quarantineBrowserChallenge(country, level, risk) {
  const safeCountry = String(country || 'XX').replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';
  const cookieName = `sod_edge_q_${safeCountry}`;
  const maxAge = quarantineTtl(level, risk.band);
  const cookie = `${cookieName}=${quarantineProofValue(risk.band)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
  const scriptCookie = JSON.stringify(cookie);
  const delay = quarantineDelayMs(risk.band);
  // webdriver/cookie checks execute in the browser and cost the server nothing. A sophisticated bot can still
  // emulate a browser, so this remains Unknown and is intentionally not promoted to Human.
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>בדיקת גישה</title></head><body><main style="font-family:system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:24px;text-align:center"><h1 style="font-size:22px">בדיקת דפדפן קצרה</h1><p id="qmsg">הגישה נבדקת וממשיכה אוטומטית.</p><noscript><p>נדרש JavaScript כדי להשלים את בדיקת הגישה.</p></noscript></main><script>(function(){var ok=navigator.cookieEnabled!==false&&navigator.webdriver!==true;if(!ok){document.getElementById('qmsg').textContent='לא ניתן לאמת את הדפדפן.';return;}setTimeout(function(){document.cookie=${scriptCookie};location.replace(location.href);},${delay});})();</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-sod-edge-policy': 'quarantine',
    },
  });
}

function hasQuarantineProof(request, country, risk) {
  const safeCountry = String(country || 'XX').replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';
  return cookieValue(request, `sod_edge_q_${safeCountry}`) === quarantineProofValue(risk.band);
}

// 📉 קצב-דגימה ל-kind='browser' בלבד (ראה הסבר למעלה) — goodbot/ai/bot אינם נוגעים בזה.
const BROWSER_SAMPLE_RATE = 10;

// בוטים מותרים — מנועי חיפוש (SEO), בוטי תצוגת-שיתוף (OG), וכל הסורקים של מטא
// (facebookexternalhit/facebot=תצוגות · meta-externalagent/facebookbot=סורק התוכן/AI).
// לבקשת צוריאל: לא חוסמים שום דבר של מטא. חייבים לעבור חופשי.
// כולל גם: סורקי-Google לא-חיפוש (mediapartners/googleother/read-aloud/feedfetcher) ומוניטורי-זמינות
// (jetmon=Jetpack, uptimerobot, pingdom, statuscake) — בוטים לגיטימיים שעוברים חופשי אך *אינם* בני-אדם,
// כדי שלא ידלפו ל-kind='browser' וינפחו את ספירת המבקרים האנושיים (jetmon לבדו = ~11K "US browser").
const GOOD_BOT = /(googlebot|google-inspectiontool|mediapartners-google|googleother|google-read-aloud|feedfetcher-google|bingbot|duckduckbot|yandex|baidu|applebot|facebookexternalhit|facebot|meta-externalagent|facebookbot|meta-externalfetcher|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|pinterest|redditbot|skypeuripreview|embedly|iframely|w3c_validator|vkshare|jetmon|jetpack|uptimerobot|pingdom|statuscake|site24x7|betteruptime)/;
// חתימות בוט לחסימה — ספריות/כלים אוטומטיים שמזדהים בעצמם.
const BAD_BOT = /(python-requests|python-urllib|aiohttp|httpx|scrapy|curl\/|wget\/|libwww|go-http-client|okhttp|node-fetch|axios\/|java\/|apache-httpclient|headless|phantomjs|puppeteer|playwright|selenium|guzzle|winhttp|zgrab|masscan|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|um-ic|ubermetrics|dataforseo|blexbot|barkrowler|mauibot|serpstatbot|zoominfobot)/;
// 🤖 בוטי-AI — מותרים לתוכן ציבורי בלבד (חשיפה במנועי-תשובות), חסומים ממסלולים יקרים.
//    (בקשת צוריאל: מדיניות לפי סוג-תוכן, לא לפי בוט.)
const AI_BOT = /(gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|claude-web|perplexitybot|perplexity-user|amazonbot|ccbot|cohere-ai|google-extended|applebot-extended|bytespider|youbot|ai2bot|omgili|diffbot|timpibot|imagesiftbot|webzio|meta-externalagent)/;
const GENERIC_BOT = /(bot|crawler|crawl|spider|scraper)/; // אחרי שניכינו את הטובים
// 🔒 מסלולים יקרים/פרטיים — חסומים לכל בוט (רק דפדפן-אדם עובר). מגן על טוקנים/AI.
const EXPENSIVE_PATH = /^\/(journey|journey-beta|research|reveal|experience|auth|profile|login|admin|traffic|numbers-report|theme-preview)(\/|$)/;

function classify(ua) {
  if (!ua) return 'bot';                 // UA ריק = כמעט תמיד אוטומציה
  if (GOOD_BOT.test(ua)) return 'goodbot';
  if (AI_BOT.test(ua)) return 'ai';      // בוט-AI — ציבורי בלבד
  if (BAD_BOT.test(ua)) return 'bot';
  if (GENERIC_BOT.test(ua)) return 'bot';
  return 'browser';
}

// 📊 Crawl Intelligence — שם-בוט ספציפי + דלי-תוכן (לתיעוד מגמות ב-crawl_daily).
function botName(ua) {
  if (/googlebot|google-inspection/.test(ua)) return 'Googlebot';
  if (/bingbot|bingpreview|adidxbot/.test(ua)) return 'Bingbot';
  if (/gptbot|oai-search|chatgpt-user/.test(ua)) return 'GPTBot';
  if (/claudebot|anthropic/.test(ua)) return 'ClaudeBot';
  if (/perplexit/.test(ua)) return 'PerplexityBot';
  if (/meta-external|facebookexternal|facebot|facebookbot/.test(ua)) return 'Meta';
  if (/amazonbot/.test(ua)) return 'Amazonbot';
  if (/applebot/.test(ua)) return 'Applebot';
  if (/yandex/.test(ua)) return 'Yandex';
  if (/baidu/.test(ua)) return 'Baidu';
  if (/duckduck/.test(ua)) return 'DuckDuckBot';
  if (/ccbot/.test(ua)) return 'CCBot';
  if (/ahrefs/.test(ua)) return 'AhrefsBot';
  if (/semrush/.test(ua)) return 'SemrushBot';
  if (/mj12/.test(ua)) return 'MJ12bot';
  if (/um-ic|ubermetrics/.test(ua)) return 'ubermetrics';
  return 'other';
}
function bucketOf(p) {
  if (p === '/') return 'home';
  if (p.startsWith('/number')) return '/number';
  if (p.startsWith('/topic')) return '/topic';
  if (p.startsWith('/cross')) return '/cross';
  if (p.startsWith('/gallery') || p.startsWith('/archive')) return 'gallery';
  if (p.startsWith('/languages') || p.startsWith('/name-lab') || p.startsWith('/%D7%A7%D7%A9%D7%A8%D7%99')) return 'languages';
  if (p.startsWith('/journey')) return 'journey';
  if (p.startsWith('/research') || p.startsWith('/beit-midrash')) return 'research';
  if (p.startsWith('/community')) return 'community';
  if (p.startsWith('/post') || p.startsWith('/category') || p.startsWith('/verified')) return 'posts';
  if (p.startsWith('/timeline') || p.startsWith('/numbers') || p.startsWith('/map') || p.startsWith('/broadcasts')) return 'index';
  if (/^\/[^/]+$/.test(p)) return 'post/slug';   // מקטע-יחיד = כנראה סלאג-פוסט
  return 'other';
}

// 🔢 allowlist של מספרים-גדולים-עם-תוכן (>4 ספרות) — נשמר ב-cache ברמת-המודול (רענון כל שעה).
// מספר-גדול שיש לו תוכן (מילה/צופן/עוגן) → מותר לבוטים ואינדוקס; מספר-גדול ריק → נחסם.
let BIG_OK = null, BIG_OK_AT = 0;
async function bigContentSet() {
  const now = Date.now();
  if (BIG_OK && now - BIG_OK_AT < 3600000) return BIG_OK;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/content_big_numbers`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
      body: '{}',
    });
    const arr = await r.json();
    if (Array.isArray(arr)) { BIG_OK = new Set(arr.map(Number)); BIG_OK_AT = now; }
  } catch { /* אם נכשל — נשארים עם ה-cache הקודם (או null → fail-closed בבדיקה) */ }
  return BIG_OK;
}

export default async function middleware(request, context) {
  const country = request.headers.get('x-vercel-ip-country') || 'XX';
  const uaRaw = request.headers.get('user-agent') || '';
  const kind = classify(uaRaw.toLowerCase());

  // מתעדים תמיד (כולל נחסמים) — country+kind+UA אמיתי. כך מזהים רוטציה ומגמה.
  // kind='browser' בלבד: נדגם ~1-מ-BROWSER_SAMPLE_RATE, במשקל מפצה (p_weight); שאר
  // הבקשות (goodbot/ai/bot) — 100% נאמנות, בלי p_weight (זהה-בדיוק להתנהגות הקודמת).
  const isBrowserKind = kind === 'browser';
  const shouldLogEdge = !isBrowserKind || Math.random() < 1 / BROWSER_SAMPLE_RATE;
  if (shouldLogEdge) {
    const logBody = { p_country: country, p_kind: kind, p_ua: uaRaw };
    if (isBrowserKind) logBody.p_weight = BROWSER_SAMPLE_RATE;
    context.waitUntil(
      fetch(`${SUPABASE_URL}/rest/v1/rpc/log_edge`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify(logBody),
      }).catch(() => {}),
    );
  }

  let path = '/'; try { path = new URL(request.url).pathname; } catch { /* ignore */ }
  const isBot = kind !== 'browser';       // goodbot | ai | bot
  const uaL = uaRaw.toLowerCase();
  const policies = await countryPolicyMap();
  const countryPolicy = policies.get(String(country).toUpperCase()) || null;

  // ── מדיניות לפי סוג-תוכן + מדינה ──
  // 1) כל בוט חסום ממסלולים יקרים/פרטיים (מסע/מחקר/AI/ניהול) — רק דפדפן-אדם עובר.
  // 2) בוט-רע (BAD/GENERIC) → 403 מלא.
  // 3) country mode=blocked → חסימה מלאה ל-browser/bot; goodbot/ai עוברים.
  // 4) strict/quarantine → browser בלבד מקבל progressive challenge; goodbot/ai עוברים.
  let blocked = false;
  if (isBot && EXPENSIVE_PATH.test(path)) blocked = true;
  else if (kind === 'bot') blocked = true;
  if (countryPolicy?.mode === 'blocked' && kind !== 'goodbot' && kind !== 'ai') blocked = true;

  // 🤖 דף-מספר טהור מעל 4 ספרות: חוסמים בוט רק אם המספר **ריק** (לא ב-allowlist התוכן).
  //    מספר-גדול עם תוכן (מילה/צופן/עוגן) → מותר ומאונדקס (בקשת צוריאל). דף-ריק → נחסם.
  //    הכלל הקליינטי (noindex) לא מגיע לבוטים חסרי-JS, לכן האכיפה כאן בקצה.
  const bigNum = isBot && /^\/number\/\d{5,}$/.test(path) ? Number(path.slice(8)) : null;
  if (bigNum != null) {
    const ok = await bigContentSet();
    if (!ok || !ok.has(bigNum)) blocked = true;   // אין תוכן (או cache לא זמין) → חסום
  }

  // 📊 Crawl Intelligence — לבוטים בלבד: שם-בוט + דלי-תוכן + נחסם (crawl_daily, UPSERT מצטבר)
  if (isBot) {
    context.waitUntil(
      fetch(`${SUPABASE_URL}/rest/v1/rpc/log_crawl`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_bot: botName(uaL), p_bucket: bucketOf(path), p_blocked: blocked }),
      }).catch(() => {}),
    );
  }

  if (blocked) return new Response('Access denied', { status: 403, headers: { 'cache-control': 'no-store' } });

  // Adaptive STRICT חל רק על browser שלא נחסם בשכבות הקודמות.
  // cookie מקומי מוכיח רק שהדפדפן ביצע JS challenge; הוא אינו Human proof ואינו משנה TI classification.
  if (kind === 'browser' && countryPolicy?.mode === 'strict') {
    const level = countryPolicy.strictLevel;
    const safeCountry = String(country || 'XX').replace(/[^A-Z]/g, '').slice(0, 2) || 'XX';
    const cookieName = `sod_edge_ok_${safeCountry}`;
    if (!hasCookie(request, cookieName)) return strictBrowserChallenge(safeCountry, level);
  }

  // Smart Quarantine 2029: same canonical country policy owner, but risk-adaptive friction.
  // No request here is promoted to Human; browser remains Unknown until downstream behavioral evidence says otherwise.
  if (kind === 'browser' && countryPolicy?.mode === 'quarantine') {
    const level = countryPolicy.strictLevel;
    const risk = quarantineBrowserRisk(request, uaRaw, path);
    if (!hasQuarantineProof(request, country, risk)) return quarantineBrowserChallenge(country, level, risk);
  }

  // 🇮🇱 חושפים את מדינת-המבקר ללקוח (cookie vc) — לגידור מודעות ל-IL בלבד (בקשת צוריאל:
  //    פרסומות לא-צנועות הגיעו מתעבורה זרה). המודעות ממילא רק בפוסטים הישנים.
  // 🤖 חושפים גם את פסק-הבוט של הקצה (cookie vb=<kind>): browser=Unknown; goodbot/ai/bot=Bot.
  //    מעבר challenge אינו Human proof. מחושב מה-UA האמיתי בצד-שרת → הלקוח מסמן bot/no-bot
  //    לפי החוזה הישן, בעוד Clean Traffic/TI שומר Human/Bot/Unknown בנפרד.
  const outHeaders = new Headers();
  outHeaders.append('set-cookie', `vc=${country}; Path=/; Max-Age=86400; SameSite=Lax`);
  outHeaders.append('set-cookie', `vb=${kind}; Path=/; Max-Age=86400; SameSite=Lax`);
  return next({ headers: outHeaders });
}
