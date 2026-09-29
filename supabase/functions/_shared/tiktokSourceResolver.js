const TIKTOK_PAGE_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);

const TIKTOK_MEDIA_SUFFIXES = [
  'tiktok.com',
  'tiktokcdn.com',
  'byteoversea.com',
  'ibytedtos.com',
  'byteicdn.com',
  'muscdn.com',
];

export const TIKTOK_BROWSER_HEADERS = Object.freeze({
  'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
});

function hostnameOf(input) {
  try { return new URL(input).hostname.toLowerCase().replace(/\.$/, ''); } catch { return ''; }
}

function hostMatches(host, suffix) {
  return host === suffix || host.endsWith(`.${suffix}`);
}

export function isTikTokPageUrl(input) {
  const host = hostnameOf(input);
  return TIKTOK_PAGE_HOSTS.has(host);
}

export function extractTikTokVideoId(input) {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/video\/(\d{8,30})(?:\/|$)/);
    if (match) return match[1];
    const itemId = url.searchParams.get('item_id') || url.searchParams.get('itemId');
    return /^\d{8,30}$/.test(itemId || '') ? itemId : null;
  } catch {
    return null;
  }
}

export function isAllowedTikTokMediaUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return TIKTOK_MEDIA_SUFFIXES.some((suffix) => hostMatches(host, suffix));
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function decodeEscapedUrl(value) {
  let text = decodeHtmlEntities(value).trim();
  if (!text) return null;
  try {
    // JSON string decoding safely handles \\u002F, escaped slashes and escaped query separators.
    text = JSON.parse(`"${text.replaceAll('\\"', '"').replaceAll('"', '\\"')}"`);
  } catch {
    text = text
      .replace(/\\u002[fF]/g, '/')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
      .replace(/\\u003[dD]/g, '=');
  }
  return /^https:\/\//i.test(text) ? text : null;
}

function addCandidate(out, seen, value, priority, source) {
  const values = Array.isArray(value) ? value : [value];
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const url = decodeEscapedUrl(raw) || raw;
    if (!isAllowedTikTokMediaUrl(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, priority, source });
  }
}

function collectFromJson(root, source, out, seen) {
  const stack = [{ value: root, path: '' }];
  while (stack.length) {
    const { value, path } = stack.pop();
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) stack.push({ value: value[i], path: `${path}[${i}]` });
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      const k = key.toLowerCase();
      const nextPath = path ? `${path}.${key}` : key;
      if (k === 'playaddr' || k === 'playurl') addCandidate(out, seen, child, 10, `${source}:${nextPath}`);
      else if (k === 'playaddrh264' || k === 'playaddrbytevc1') addCandidate(out, seen, child, 20, `${source}:${nextPath}`);
      else if (k === 'downloadaddr' || k === 'downloadurl') addCandidate(out, seen, child, 40, `${source}:${nextPath}`);
      else if ((k === 'urllist' || k === 'url_list') && /video|play|bitrate|download/i.test(path)) addCandidate(out, seen, child, 30, `${source}:${nextPath}`);
      if (child && typeof child === 'object') stack.push({ value: child, path: nextPath });
    }
  }
}

function parseScriptJson(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) return null;
  try { return JSON.parse(decodeHtmlEntities(match[1]).trim()); } catch { return null; }
}

export function extractTikTokMediaCandidatesFromHtml(html) {
  const out = [];
  const seen = new Set();
  const sourceText = String(html || '');

  for (const scriptId of ['__UNIVERSAL_DATA_FOR_REHYDRATION__', 'SIGI_STATE']) {
    const parsed = parseScriptJson(sourceText, scriptId);
    if (parsed) collectFromJson(parsed, scriptId, out, seen);
  }

  // Fallback for server variants that inline the same JSON without a stable script id.
  const rawPatterns = [
    { re: /["']playAddr["']\s*:\s*["']([^"']+)["']/gi, priority: 10, source: 'raw:playAddr' },
    { re: /["']downloadAddr["']\s*:\s*["']([^"']+)["']/gi, priority: 40, source: 'raw:downloadAddr' },
  ];
  for (const pattern of rawPatterns) {
    let match;
    while ((match = pattern.re.exec(sourceText))) addCandidate(out, seen, match[1], pattern.priority, pattern.source);
  }

  return out.sort((a, b) => a.priority - b.priority);
}

function filterVideoCandidates(candidates) {
  return candidates.filter((candidate) => {
    const source = String(candidate?.source || '');
    if (source.startsWith('raw:')) return true;
    return /video|bitrate/i.test(source) && !/music|audio|avatar|author|image|cover/i.test(source);
  });
}

export function extractTikTokMediaCandidatesFromJson(value, source = 'api') {
  const out = [];
  const seen = new Set();
  collectFromJson(value, source, out, seen);
  return out.sort((a, b) => a.priority - b.priority);
}

export async function fetchFollowingAllowedRedirects(url, fetchImpl, init, allowUrl, label, maxRedirects = 5) {
  let current = new URL(url).toString();
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!allowUrl(current)) throw new Error(`${label}_redirect_host_rejected`);
    const response = await fetchImpl(current, { ...init, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error(`${label}_redirect_without_location`);
    if (hop === maxRedirects) throw new Error(`${label}_too_many_redirects`);
    current = new URL(location, current).toString();
  }
  throw new Error(`${label}_redirect_failed`);
}

async function fetchJsonIfAvailable(url, fetchImpl, headers) {
  const response = await fetchFollowingAllowedRedirects(url, fetchImpl, { headers }, isTikTokPageUrl, 'tiktok_api');
  if (!response.ok) return null;
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('json') && !type.includes('text/plain')) return null;
  try { return await response.json(); } catch { return null; }
}

export async function resolveTikTokSource(src, fetchImpl = fetch) {
  if (!isTikTokPageUrl(src)) throw new Error('not_tiktok_url');

  const pageResponse = await fetchFollowingAllowedRedirects(
    src,
    fetchImpl,
    { headers: TIKTOK_BROWSER_HEADERS },
    isTikTokPageUrl,
    'tiktok_page',
  );
  if (!pageResponse.ok) throw new Error(`tiktok_page_${pageResponse.status}`);

  const finalUrl = pageResponse.url || src;
  if (!isTikTokPageUrl(finalUrl)) throw new Error('tiktok_redirect_outside_tiktok');
  const pageType = (pageResponse.headers.get('content-type') || '').toLowerCase();
  if (pageType.startsWith('video/')) {
    if (!isAllowedTikTokMediaUrl(finalUrl)) throw new Error('tiktok_direct_media_host_rejected');
    return {
      kind: 'tiktok',
      mediaUrl: finalUrl,
      mediaCandidates: [{ url: finalUrl, source: 'direct-video-response' }],
      resolvedPageUrl: finalUrl,
      platformVideoId: extractTikTokVideoId(finalUrl),
      resolutionSource: 'direct-video-response',
    };
  }

  const html = await pageResponse.text();
  let candidates = filterVideoCandidates(extractTikTokMediaCandidatesFromHtml(html));
  const videoId = extractTikTokVideoId(finalUrl) || extractTikTokVideoId(src);

  if (!candidates.length && videoId) {
    const apiUrl = `https://www.tiktok.com/api/item/detail/?itemId=${encodeURIComponent(videoId)}`;
    const apiJson = await fetchJsonIfAvailable(apiUrl, fetchImpl, {
      ...TIKTOK_BROWSER_HEADERS,
      'Accept': 'application/json,text/plain,*/*',
      'Referer': finalUrl,
    });
    if (apiJson) candidates = filterVideoCandidates(extractTikTokMediaCandidatesFromJson(apiJson, 'item-detail'));
  }

  const chosen = candidates[0];
  if (!chosen) throw new Error('tiktok_media_not_found');
  return {
    kind: 'tiktok',
    mediaUrl: chosen.url,
    mediaCandidates: candidates.slice(0, 8).map((candidate) => ({ url: candidate.url, source: candidate.source })),
    resolvedPageUrl: finalUrl,
    platformVideoId: videoId,
    resolutionSource: chosen.source,
  };
}

export async function fetchTikTokMedia(resolution, fetchImpl = fetch, { rangeProbe = false } = {}) {
  if (resolution?.kind !== 'tiktok' || !isAllowedTikTokMediaUrl(resolution?.mediaUrl)) {
    throw new Error('tiktok_media_url_rejected');
  }
  const headers = new Headers(mediaFetchHeaders(resolution));
  if (rangeProbe) headers.set('Range', 'bytes=0-0');
  return await fetchFollowingAllowedRedirects(
    resolution.mediaUrl,
    fetchImpl,
    { method: 'GET', headers },
    isAllowedTikTokMediaUrl,
    'tiktok_media',
  );
}

export function mediaFetchHeaders(resolution) {
  if (resolution?.kind !== 'tiktok') return {};
  return {
    'User-Agent': TIKTOK_BROWSER_HEADERS['User-Agent'],
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
    'Referer': resolution.resolvedPageUrl || 'https://www.tiktok.com/',
  };
}