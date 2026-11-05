import { PUBLIC_READING_PROFILE_ID, publicReadingContinuation, PUBLIC_HISTORICAL_LECTURE_PATHS } from "../src/lib/publicReadingRelease2029.js";
import { projectPublicBook2029, fetchPublicLibraryItem2029, publicBookSourceAvailable2029 } from "../src/lib/research/publicLibraryContinuity2029.js";
import { postsTaxonomyRoute2029, postMatchesTaxonomy2029 } from "../src/lib/research/postsTaxonomy2029Route.js";
import { publicPostHref, publicPostUrl, postAddressSlug } from "../src/lib/publicPostUrls.js";
import { publicPostOnlyFilter } from "../src/lib/research/publicPostBoundary.js";
import { publicVideoSitemapAssets2029 } from "../src/lib/research/publicVideo2029Reading.js";
// Vercel Serverless Function — sitemap.xml דינמי (מפת אתר חיה).
// בונה את מפת האתר ישירות מהגרף ב-Supabase בכל בקשה, כך שכל פוסט/מספר/התכנסות
// חדשים נכללים במפה; הימצאות במפה אינה הוכחה לאינדוקס — בלי להריץ סקריפט ובלי לדחוף קובץ.
// אותה לוגיקה בדיוק כמו scripts/gen-sitemap.mjs, רק חיה (live) במקום סטטית.
//   • עמודים סטטיים קנוניים (עמודי-על)
//   • כל הפוסטים → /<slug>
//   • דפי המספר → /number/:n  (כל מספר ≥10 שיש לו תמונות בגלריה, primary_value)
//   • צירי ההתכנסות המאושרים → /topic/:slug
//   • דפי הכתבים → /community/researcher/:slug  (contributors עם slug/code)

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const SITE = 'https://sod1820.co.il';
const HEADERS = { apikey: ANON, Authorization: 'Bearer ' + ANON };

// Thumbnail Validity Gate — resolver משותף אחד (זהה ל-src/lib/seo.js): thumbnail=תמונה בלבד, לעולם לא mp4.
import { resolveThumb } from '../src/lib/thumbResolve.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 🚦 Search Indexability Contract — פוסטים לא-מפורסמים לפי אות-מחזור-החיים הקיים בלבד
// (tags∋«טיוטה»/«פורום» — אותו אות שסרגל מימד-חמש כבר משתמש בו). אין אורך-טקסט, אין
// home_hidden, אין ציון-איכות שרירותי. הפוסטים עדיין נגישים — רק לא מפורסמים לסריקה.
const POST_PUBLISHED_FILTER = "&or=" + encodeURIComponent("(" + publicPostOnlyFilter() + ")");

function urlTag({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${esc(SITE + loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

// 🎬 Video Sitemap (video:video) — כל סרטון של אור-הגאולה = תוצאת-וידאו בגוגל.
const VIDEO_RE = /\.(mp4|mov|webm|m4v|avi|mkv)($|\?|#)/i;
const cleanCap = t => { const s = String(t || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); return (s && s !== '📷 עדכון' && s !== '🎬 עדכון וידאו') ? s : ''; };
function videoUrlTag(v) {
  const title = cleanCap(v.seo_title || v.text).slice(0, 100) || 'אור הגאולה — סרטון';
  const desc = cleanCap(v.text).slice(0, 2048) || title;
  // Thumbnail Validity Gate: thumb_url רק אם תמונה (לא mp4); אחרת cardThumb ממותד. thumbnail_loc חובה.
  const thumb = resolveThumb([v.thumb_url], title, 'אור הגאולה · סרטון', 'orgeula');
  let pub; try { pub = v.created_at ? new Date(v.created_at).toISOString() : undefined; } catch { pub = undefined; }
  return [
    '  <url>',
    // דף-צפייה קנוני עצמאי לכל סרטון (לא ?v= שקורס ל-/or-geula) — Sitemap URL == Canonical Watch URL.
    `    <loc>${esc(SITE + '/or-geula/video/' + v.id)}</loc>`,
    '    <video:video>',
    `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
    `      <video:title>${esc(title)}</video:title>`,
    `      <video:description>${esc(desc)}</video:description>`,
    `      <video:content_loc>${esc(v.image_url)}</video:content_loc>`,
    pub ? `      <video:publication_date>${pub}</video:publication_date>` : '',
    '    </video:video>',
    '  </url>',
  ].filter(Boolean).join('\n');
}

// 🎬 פוסט video-primary (קטגוריה «וידאו») → video:video על ה-canonical של הפוסט (/<slug>).
//    הסרטון הוא הישות המרכזית של הדף (דף-צפייה עצמאי) → thumbnail + content_loc/player_loc.
const YT_RE = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
const MP4_IN_RE = /<(?:source|video)[^>]+src="([^"]+\.mp4[^"]*)"/i;
function postVideoUrlTag(p) {
  if (!p.slug) return '';
  const c = String(p.content || '');
  const mp4 = (c.match(MP4_IN_RE) || c.match(/(https?:\/\/[^"'\s<>]+\.mp4)/i) || [])[1];
  const yt = (c.match(YT_RE) || [])[1];
  if (!mp4 && !yt) return '';
  const poster = (c.match(/poster="([^"]+)"/i) || [])[1];
  // Thumbnail Validity Gate: image_url/poster רק אם תמונה (לא mp4/וידאו); אחרת cardThumb ממותד.
  const thumb = resolveThumb([p.image_url, poster], cleanCap(p.title).slice(0, 60));
  const title = cleanCap(p.title).slice(0, 100) || 'סוד1820 — סרטון';
  const desc = cleanCap(p.title).slice(0, 2048) || title;
  let pub; try { pub = p.date ? new Date(p.date).toISOString() : undefined; } catch { pub = undefined; }
  const lastmod = (p.modified || p.date || '').slice(0, 10) || undefined;
  const encodedSlug = p.slug.includes('%') ? p.slug : encodeURI(p.slug);
  return [
    '  <url>',
    `    <loc>${esc(publicPostUrl(p))}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    '    <video:video>',
    `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
    `      <video:title>${esc(title)}</video:title>`,
    `      <video:description>${esc(desc)}</video:description>`,
    mp4 ? `      <video:content_loc>${esc(mp4)}</video:content_loc>` : '',
    (yt && !mp4) ? `      <video:player_loc>${esc('https://www.youtube-nocookie.com/embed/' + yt)}</video:player_loc>` : '',
    pub ? `      <video:publication_date>${pub}</video:publication_date>` : '',
    '    </video:video>',
    '  </url>',
  ].filter(Boolean).join('\n');
}


function canonicalVideoLoc(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.includes('%') ? s : encodeURI(s);
}
function canonicalVideoPath(raw) {
  try { return new URL(String(raw || '')).pathname.toLowerCase(); } catch { return ''; }
}
function unifiedVideoBlock(v) {
  const title = cleanCap(v.title).slice(0, 100) || 'SOD1820 — סרטון';
  const desc = title;
  const thumb = resolveThumb([v.thumb_url, v.poster_url], title, 'SOD1820 · סרטון', 'video');
  let pub; try { pub = v.first_seen_at ? new Date(v.first_seen_at).toISOString() : undefined; } catch { pub = undefined; }
  const yt = v.youtube_id || (v.video_kind === 'youtube' ? (String(v.media_url || '').match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] : null);
  const vm = v.video_kind === 'vimeo' ? (String(v.media_url || '').match(/vimeo\.com\/(\d+)/) || [])[1] : null;
  return [
    '    <video:video>',
    `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
    `      <video:title>${esc(title)}</video:title>`,
    `      <video:description>${esc(desc)}</video:description>`,
    v.video_kind === 'selfhost' ? `      <video:content_loc>${esc(v.media_url)}</video:content_loc>` : '',
    yt ? `      <video:player_loc>${esc('https://www.youtube-nocookie.com/embed/' + yt)}</video:player_loc>` : '',
    (!yt && vm) ? `      <video:player_loc>${esc('https://player.vimeo.com/video/' + vm)}</video:player_loc>` : '',
    pub ? `      <video:publication_date>${pub}</video:publication_date>` : '',
    '    </video:video>',
  ].filter(Boolean).join('\n');
}
function unifiedVideoPageTag(pageUrl, assets = []) {
  const loc = canonicalVideoLoc(pageUrl);
  if (!loc || !assets.length) return '';
  let lastmod;
  try {
    const latest = assets.map(v => v.last_seen_at || v.first_seen_at).filter(Boolean).sort().at(-1);
    lastmod = latest ? new Date(latest).toISOString().slice(0, 10) : undefined;
  } catch { lastmod = undefined; }
  return [
    '  <url>',
    `    <loc>${esc(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    ...assets.slice(0, 1000).map(unifiedVideoBlock),
    '  </url>',
  ].filter(Boolean).join('\n');
}

// עמודי-על קנוניים (מקבילים ל-scripts/gen-sitemap.mjs)
const STATIC = [
  { loc: '/',             priority: '1.0', changefreq: 'daily'   },
  { loc: '/start',        priority: '0.8', changefreq: 'monthly' },
  { loc: '/map',          priority: '0.6', changefreq: 'monthly' },
  { loc: '/privacy',      priority: '0.3', changefreq: 'yearly'  },
  { loc: '/broadcasts',   priority: '0.6', changefreq: 'daily'   },
  { loc: '/forum',        priority: '0.7', changefreq: 'daily'   },
  { loc: '/or-geula',     priority: '0.7', changefreq: 'weekly'  },
  { loc: '/timeline',     priority: '0.8', changefreq: 'weekly'  },
  { loc: '/numbers',      priority: '0.6', changefreq: 'monthly' },
  { loc: '/gematria',     priority: '0.8', changefreq: 'monthly' },
  { loc: '/name',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/journey',      priority: '0.5', changefreq: 'monthly' },
  { loc: '/world',        priority: '0.9', changefreq: 'daily'   },
  { loc: '/code',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/codes',        priority: '0.7', changefreq: 'weekly'  },
  { loc: '/codes/' + encodeURIComponent('מחקר'), priority: '0.6', changefreq: 'weekly' },
  { loc: '/post',         priority: '0.9', changefreq: 'daily'   },
  { loc: '/archive',      priority: '0.8', changefreq: 'weekly'  },
  { loc: '/verified',     priority: '0.7', changefreq: 'weekly'  },
  { loc: '/sulamot',      priority: '0.5', changefreq: 'monthly' },
  { loc: '/community',    priority: '0.5', changefreq: 'weekly'  },
  { loc: '/community/calculator', priority: '0.8', changefreq: 'monthly' },
  { loc: '/cross',        priority: '0.7', changefreq: 'monthly' },
  { loc: '/contact',      priority: '0.4', changefreq: 'yearly'  },
  { loc: '/books',        priority: '0.7', changefreq: 'weekly'  },
];

// משיכה בעימוד דרך REST (limit/offset), עד שהדף האחרון קצר מ-PAGE.
async function fetchAll(path, { concurrentPages = 1 } = {}) {
  const PAGE = 1000;
  const out = [];
  // Only the existing ordered public phrase projection opts into three-page
  // waves. Default/Legacy reads retain sequential pagination. Lookahead may
  // fetch two empty pages, but cannot add rows beyond the first short page.
  const width = concurrentPages === 3 ? 3 : 1;
  for (let from = 0; from < 100000; from += PAGE * width) {
    const offsets = Array.from({ length: width }, (_, i) => from + i * PAGE).filter(offset => offset < 100000);
    const pages = await Promise.all(offsets.map(async offset => {
      const sep = path.includes('?') ? '&' : '?';
      const url = `${SUPABASE_URL}/rest/v1/${path}${sep}limit=${PAGE}&offset=${offset}`;
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) throw new Error("sitemap-source-unavailable");
      const rows = await r.json();
      if (!Array.isArray(rows)) throw new Error("sitemap-source-invalid");
      return rows;
    }));
    for (const rows of pages) {
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  }
  return out;
}

export default async function handler(req, res) {
  const productionReading = req.publicReadingProductionArtifact === true && req.publicReadingRelease === PUBLIC_READING_PROFILE_ID;
  const foundation = req.publicFoundationPreview === true;
  const foundationStatics = new Set(["/", "/world", "/post", "/map", "/privacy", "/number"]);
  if (req.publicReadingRelease === PUBLIC_READING_PROFILE_ID) foundationStatics.add("/gematria");
  if (productionReading) for (const path of ['/books', '/codes', '/or-geula', '/community/researchers']) foundationStatics.add(path);
  const urls = foundation ? STATIC.filter(row => foundationStatics.has(row.loc)) : [...STATIC];
  if (foundation && !urls.some(row => row.loc === "/number")) urls.push({ loc: "/number", priority: "0.6", changefreq: "monthly" });
  if (req.publicReadingRelease === PUBLIC_READING_PROFILE_ID && !urls.some(row => row.loc === "/gallery")) urls.push({ loc: "/gallery", priority: "0.6", changefreq: "weekly" });
  if (productionReading) urls.push({ loc: '/community/researchers', priority: '0.5', changefreq: 'weekly' });
  // The community chat is the replacement of the retired forum and a popular search landing page: it belongs in the sitemap.
  if (productionReading) urls.push({ loc: '/community/chat', priority: '0.7', changefreq: 'daily' });
  if (productionReading) for (const loc of PUBLIC_HISTORICAL_LECTURE_PATHS) urls.push({loc,priority:'0.4',changefreq:'yearly'});
  let foundationSourceFailed = false;
  let posts;
  try { posts = await fetchAll(`posts?select=id,slug,source,link,wp_id,modified,date${productionReading ? ',tags,categories' : ''}${POST_PUBLISHED_FILTER}&order=date.desc`); }
  catch { res.setHeader("Cache-Control", "no-store"); return res.status(503).send("sitemap source unavailable"); }
  const postBySlug = new Map(posts.filter(post => post.slug).map(post => [postAddressSlug(publicPostHref(post)), post]));
  const videoPage = raw => {
    try {
      const url = new URL(raw); if (url.origin !== SITE) return null;
      const post = postBySlug.get(postAddressSlug(url.pathname));
      if (post) return publicPostUrl(post);
      if (foundation && !/^\/(?:number|topic)(?:\/|$)/.test(url.pathname) && !foundationStatics.has(url.pathname)
        && !(productionReading && (/^\/video\/[0-9a-f]{32}$/i.test(url.pathname) || /^\/or-geula\/video\/[0-9a-f-]{36}$/i.test(url.pathname)))) return null;
      return url.origin + url.pathname;
    } catch { return null; }
  };

  // ── Unified Video Projection → asset אחד, placements רבים, primary Google page אחד ──
  // כולל פוסטים גם מחוץ לקטגוריית «וידאו», Or-Geula, home_videos וערוצי WhatsApp ציבוריים.
  const unifiedVideoPages = new Map();
  const videoPrimaryPaths = new Set();
  try {
    const readingProfile = req.publicReadingRelease === PUBLIC_READING_PROFILE_ID;
    let assets = await fetchAll('video_media_assets_v1?select=public_id,title,video_kind,media_url,youtube_id,poster_url,thumb_url,primary_page_url,google_indexable,first_seen_at,last_seen_at'
      + (readingProfile ? ',primary_source_type,primary_source_id' : '') + '&google_indexable=eq.true&order=last_seen_at.desc');
    if (readingProfile) assets = await publicVideoSitemapAssets2029(assets, { readRows: async (table, params) => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${new URLSearchParams(params)}`, { headers: HEADERS });
      if (!response.ok) throw new Error('sitemap-source-unavailable');
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('sitemap-source-invalid');
      return rows;
    } });
    for (const v of assets) {
      if (!v.primary_page_url || !v.media_url) continue;
      const pageUrl = videoPage(v.primary_page_url); if (!pageUrl) continue;
      const list = unifiedVideoPages.get(pageUrl) || [];
      list.push(v);
      unifiedVideoPages.set(pageUrl, list);
      const path = canonicalVideoPath(pageUrl);
      if (path) videoPrimaryPaths.add(path);
    }
  } catch (e) { if (req.publicReadingRelease === PUBLIC_READING_PROFILE_ID) foundationSourceFailed = true; }
  const unifiedVideoUrls = [...unifiedVideoPages.entries()].map(([pageUrl, assets]) => unifiedVideoPageTag(pageUrl, assets));

  // ── פוסטים → /<slug> (מדלגים על עמודים שכבר נכנסים עם video:video מה-Projection) ──
  try {

    for (const p of posts) {
      if (!p.slug) continue;
      const lastmod = (p.modified || p.date || '').slice(0, 10) || undefined;
      // סלאגים מוורדפרס כבר מקודדי-URL (%d7%aa...). encodeURI היה מקודד שוב את ה-%
      // ל-%25 → קידוד-כפול שגוי שלא תואם ל-canonical. לכן מקודדים רק עברית "נקייה".
      const postHref = publicPostHref(p);
      if (!postHref) continue;
      const postPath = postHref.toLowerCase();
      if (videoPrimaryPaths.has(postPath)) continue;
      urls.push({ loc: postHref, lastmod, changefreq: 'monthly', priority: '0.7' });
    }
  } catch (e) { /* ממשיכים גם בלי פוסטים */ }

  if (productionReading) {
    // Reuse already-admitted Posts, never an independent taxonomy census.
    // Publish only labels that round-trip through the existing address rule.
    const seen = new Set();
    for (const post of posts) for (const [kind, field] of [['tag', 'tags'], ['category', 'categories']]) {
      for (const label of Array.isArray(post[field]) ? post[field] : []) {
        if (typeof label !== 'string') continue;
        const path = `/${kind}/${encodeURIComponent(label.replace(/ /g, '-'))}`;
        const scope = postsTaxonomyRoute2029(path);
        if (!scope || !postMatchesTaxonomy2029(post, scope) || seen.has(path) || publicReadingContinuation(path)) continue;
        seen.add(path); urls.push({ loc: path, changefreq: 'weekly', priority: '0.4' });
      }
    }
  }

  // ── דפי מספר → /number/:n — יהלומים: גלריות ∪ גימטריה עשירה(≥20) ∪ התכנסויות (RPC sitemap_numbers).
  // כולל lastmod (אות re-crawl לתבנית ה-story-top) + priority לפי עושר. ספרה בודדת מפנה ל-/sulamot → ≥10.
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sitemap_numbers`, {
      method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) throw new Error("number-source-unavailable");
    if (r.ok) {
      const rows = await r.json();
      if (!Array.isArray(rows)) throw new Error("number-source-invalid");
      for (const row of (Array.isArray(rows) ? rows : [])) {
        const n = Number(row.value);
        if (Number.isFinite(n) && n >= 10)
          urls.push({ loc: '/number/' + n, lastmod: row.lastmod || undefined, changefreq: 'monthly', priority: row.priority || '0.6' });
      }
    }
  } catch (e) { if (foundation) foundationSourceFailed = true; }

  // ── דפי ביטוי מאומתים → /number/:phrase — אותו SSOT של robots בעמוד עצמו.
  // רק verified + published + visible מתוך sitemap_phrases_v1; ביטוי מספרי נשאר בבעל-המספר.
  try {
    const phrases = await fetchAll('sitemap_phrases_v1?select=phrase,lastmod&order=phrase.asc', { concurrentPages: productionReading ? 3 : 1 });
    for (const row of phrases) {
      const phrase = String(row?.phrase || '').trim();
      if (!phrase || /^\d+$/.test(phrase)) continue;
      urls.push({
        loc: '/number/' + encodeURIComponent(phrase),
        lastmod: row.lastmod || undefined,
        changefreq: 'monthly',
        priority: '0.5',
      });
    }
  } catch (e) { if (foundation) foundationSourceFailed = true; }

  // ── צירי התכנסות מאושרים → /topic/:slug ──
  try {
    const topics = await fetchAll('topic_cards_public?select=slug,approved_at,created_at');
    for (const t of topics) {
      if (!t.slug) continue;
      const lastmod = (t.approved_at || t.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/topic/' + encodeURIComponent(t.slug), lastmod, changefreq: 'weekly', priority: '0.7' });
    }
  } catch (e) { if (productionReading) foundationSourceFailed = true; }

  // ── פתילי פורום מאושרים → /forum/:id (research_contributions ברמה-עליונה) ──
  // כל פתיל = עמוד DiscussionForumPosting עצמאי; בלי זה גוגל בקושי מגלה דיונים בודדים.
  try {
    if (foundation) throw new Error("outside-public-foundation");
    const threads = await fetchAll('research_contributions?select=id,created_at&status=eq.approved&parent_id=is.null&order=created_at.desc');
    for (const t of threads) {
      if (!t.id) continue;
      const lastmod = (t.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/forum/' + encodeURIComponent(t.id), lastmod, changefreq: 'weekly', priority: '0.6' });
    }
  } catch (e) { /* ממשיכים גם בלי פתילי פורום */ }

  // ── צפנים מאושרים → /codes/:slug (els_records published) ──
  try {
    if (foundation && !productionReading) throw new Error("outside-public-foundation");
    const codes = await fetchAll('els_records?select=slug,created_at&status=eq.published' + (productionReading ? '&visibility=eq.public&or=(source.is.null,source.neq.research)' : ''));
    for (const c of codes) {
      if (!c.slug) continue;
      const lastmod = (c.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/codes/' + encodeURIComponent(c.slug), lastmod, changefreq: 'monthly', priority: '0.7' });
    }
  } catch (e) { if (productionReading) foundationSourceFailed = true; }

  // ── ספרים משוחררים → /book/:slug (nodes.type='book', is_active=true — אותו שער-שחרור
  //    שה-Book Hub עצמו כבר משתמש בו לרשימת-הספרים הציבורית; רק metadata/label ציבוריים,
  //    לא research_objects, exactly-once per book) ──
  try {
    if (foundation && !productionReading) throw new Error("outside-public-foundation");
    const books = await fetchAll('nodes?select=' + (productionReading
      ? 'id,type,label,description,identity_key,is_active,created_at,book_slug:metadata->>slug,source_ref_prefixes:metadata->source_ref_prefixes,identity_tiers:metadata->identity_tiers'
      : 'metadata,created_at') + '&type=eq.book&is_active=eq.true');
    for (const b of books) {
      const item = productionReading ? projectPublicBook2029(b) : null;
      if (productionReading) {
        if (!item) continue;
        // Reuse the reader's existing launch admission before probing a PDF.
        // Closed preparation cards remain reachable, but are not open readers.
        let sourceError;
        const reader = await fetchPublicLibraryItem2029('books', item.slug, {
          readRows: async () => books.filter(row => row.book_slug === item.slug),
          checkBookSource: async manifest => {
            try { return await publicBookSourceAvailable2029(manifest); }
            catch (error) { sourceError = error; throw error; }
          },
        });
        if (sourceError) throw sourceError;
        if (reader?.readerState !== 'ready') continue;
      }
      const slug = productionReading ? item?.slug : b?.metadata?.slug;
      if (!slug) continue;
      const lastmod = (b.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/book/' + encodeURIComponent(slug), lastmod, changefreq: 'weekly', priority: '0.7' });
    }
  } catch (e) { if (productionReading) foundationSourceFailed = true; }

  // ── דפי הכתבים → /community/researcher/:slug (contributors עם slug/code) ──
  // המשטח הציבורי/SEO של כל חוקר — קיר-ההצלבות, האוצרות והרמזים שלו. אותו slug שה-OG מזהה (code||slug).
  try {
    if (foundation && !productionReading) throw new Error("outside-public-foundation");
    const cons = await fetchAll('contributors?select=slug,code' + (productionReading
      ? '&active=eq.true&locked=not.is.true&building=not.is.true&or=(dossier_settings->>visibility.is.null,dossier_settings->>visibility.eq.public)' : ''));
    const seen = new Set();
    for (const c of cons) {
      const slug = c.code || c.slug;
      // דילוג על פרופילים אוטומטיים (r-<hash>) — לא דפי-כתב אצורים, לא לאינדקס
      if (!slug || seen.has(slug) || /^r-[0-9a-f]{16,}$/i.test(slug)) continue;
      seen.add(slug);
      urls.push({ loc: '/community/researcher/' + encodeURIComponent(slug), changefreq: 'weekly', priority: '0.6' });
    }
  } catch (e) { if (productionReading) foundationSourceFailed = true; }

  if (foundationSourceFailed) { res.setHeader("Cache-Control", "no-store"); return res.status(503).send("sitemap source unavailable"); }
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    urls.map(urlTag).join('\n'),
    unifiedVideoUrls.join('\n'),
    '</urlset>',
    '',
  ].filter(Boolean).join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // נשמר בקאש שעה בדפדפן / 6 שעות ב-CDN — טרי מספיק, וזול על המכסה.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
