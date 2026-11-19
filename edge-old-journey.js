// Old Journey addresses: 410 Gone (ZURIEL 19.11.2026).
//
// Which addresses: GET or HEAD of exactly /journey or /journey/ with a `from` parameter, i.e. /journey?from=<expression>. These are the links
// of the retired Legacy random walk ("קחו אותי למסע"), one per expression. The 2029 site no longer creates them (rendered pages, sitemap and
// public content checked 19.11.2026), but Google still requests them: 1,723 Googlebot requests answered 403 in 6–19.11 (crawl_daily),
// consistent with robots.txt no longer excluding /journey since the 4.11 cutover (not proven as the cause).
//
// Not these addresses, and unchanged: /journey without `from`, /journey/<anything>, /journey-beta, /מסע and /2029/journey (the 2029 Life
// Journey, not open yet), and any other method. Nothing personal is read, written or removed.
//
// The answer is the same light document for a browser and for a crawler: no database read, no function. It keeps the expression's identity:
// it links to the existing expression page and to the calculator with the same expression. It never computes a value from it and never
// redirects. Bad bots and blocked countries are still refused before this point (middleware-core.js).

const OLD_JOURNEY_PATH = /^\/journey\/?$/;
const EXPRESSION_MAX = 80;

// The `from` value as an expression, or "" when it cannot be shown safely (empty, control characters only, or longer than any Legacy link).
export function oldJourneyExpression(raw) {
  const text = String(raw ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
  return text && text.length <= EXPRESSION_MAX ? text : "";
}

// null when the request is not an old Journey address; otherwise { expression } (expression may be "").
export function oldJourneyAddress(method, url) {
  if (method !== "GET" && method !== "HEAD") return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (!OLD_JOURNEY_PATH.test(parsed.pathname) || !parsed.searchParams.has("from")) return null;
  return { expression: oldJourneyExpression(parsed.searchParams.get("from")) };
}

// The public number-page address of the expression, as numberPageHref builds it on the public site: a number loses its leading zeros, an
// expression stays exactly itself (src/lib/research/numberPageAddress.js; the parity is a test). The edge cannot import that module, since
// it reads Vite's import.meta.env.
export function oldJourneyExpressionHref(expression) {
  const address = /^\d+$/.test(expression) ? expression.replace(/^0+(?=\d)/, "") : expression;
  return `/number/${encodeURIComponent(address)}`;
}

export function oldJourneyCalculatorHref(expression) {
  return `/gematria?q=${encodeURIComponent(expression)}`;
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function oldJourneyGoneHtml(expression) {
  const shown = expression ? escapeHtml(expression) : "";
  const links = expression
    ? `<p>אפשר להמשיך עם «${shown}»:</p><p><a href="${escapeHtml(oldJourneyExpressionHref(expression))}">לדף הביטוי «${shown}»</a></p><p><a href="${escapeHtml(oldJourneyCalculatorHref(expression))}">לחשב את «${shown}» במחשבון</a></p>`
    : `<p><a href="/gematria">למחשבון הגימטריה</a></p>`;
  return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex"><title>המסלול הישן הוסר · SOD1820</title></head>'
    + '<body><main style="font-family:system-ui,sans-serif;max-width:680px;margin:12vh auto;padding:24px;text-align:center;line-height:1.7">'
    + '<h1>המסלול הישן הוסר</h1><p>הכתובת הזו שייכת למסלול «קחו אותי למסע» של האתר הקודם, והוא אינו קיים עוד.</p>'
    + links + '<p><a href="/">לדף הראשי</a></p></main></body></html>';
}

export function oldJourneyGoneResponse(expression, method = "GET") {
  return new Response(method === "HEAD" ? null : oldJourneyGoneHtml(expression), {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // The same answer for everyone and nothing personal in it, so the CDN may keep it; a deliberate change of policy is one deploy away.
      "cache-control": "public, max-age=3600, s-maxage=86400",
      "x-robots-tag": "noindex",
      "x-sod-route": "legacy-journey-gone",
    },
  });
}
