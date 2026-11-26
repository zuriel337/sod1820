// FIRST WORDS (ZURIEL 20.11.2026). A public page that is not a Post reached a reader, and a search crawler, as the opening shell only: a title
// and nothing to read (Search Console, URL Inspection 18.11.2026: phrase pages folded into unrelated number pages as duplicates, for example
// /number/נטע -> /number/2). A Post already carries its article in the document (article-first.js). This module gives the other public
// families the same first answer: the page's own heading, a short statement and real links, inside the opening shell, before any script runs.
//
// Rules:
//  - Every reader gets the same bytes (no user-agent branch), and the words are visible. The page replaces them with its full form on mount.
//  - Only public readers under the anonymous key (RLS applies); only verified, published gematria (verified_only_public_gematria_law).
//  - A value shown for a phrase is the stored canonical value of that verified row. Nothing is calculated here.
//  - "ביטויים נבחרים השבוע" comes from the one public activity reader, research_pulse_2029 (#1462). Its phrases are approved corpus phrases
//    that readers picked (activity_2029/select, above the reader's own privacy floor). They are NOT searches and are never presented as
//    other visitors' searches (Traffic Intelligence). While the reader is not available, the block is simply absent. No second source.
//  - Never throws and never delays the document beyond its small deadline: on any failure the answer is today's document.
//  - Free text typed by a visitor never creates words here: a phrase page gets words only when the phrase is a verified, published row.
import { PUBLIC_ARCHIVE_2029, publicArchiveHref2029 } from "../src/lib/research/publicArchive2029.js";
import { PUBLIC_REALITY_STREAM_2029 } from "../src/lib/publicReadingRelease2029.js";
import { publicMapLinks2029 } from "../src/lib/publicMap2029.js";
import { PUBLISHED_FINDINGS_READING } from "../src/lib/publishedFindingsReading2029.js";
import { publicPostHref } from "../src/lib/publicPostUrls.js";
import { COMMUNITY_CALCULATOR_SEO, COMMUNITY_CALCULATOR_EXPLAINER, COMMUNITY_CALCULATOR_FAQ } from "../src/lib/research/communityCalculatorSeo2029.js";
import { CALCULATOR_PRO_PATH, CALCULATOR_PRO_SEO } from "../src/lib/research/calculatorProSeo2029.js";
import { GALLERY_CATALOG_INTRO } from "../src/lib/galleryCatalogIntro2029.js";
import { HOME_FIRST_WORDS } from "../src/lib/homePublicWords2029.js";

// The public project address and the public anonymous key, as in the other server readers (api/og.js, api/sitemap.js, api/card.js). The browser
// module src/lib/supabase.js is not imported here: it creates a client, which a server function must not load.
const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
export const FIRST_WORDS_DEADLINE_MS = 1500;
// How long a document waits for words that are not kept yet, counted from the moment its metadata is ready. Past it the document goes out as
// it does today, and the read still completes for the next request.
export const FIRST_WORDS_GRACE_MS = 300;
// A number or phrase document is the words: its own metadata already waits for two reads, and the words are read beside them. Its first
// request (nothing kept yet) therefore waits for the words up to this bound instead of going out as an empty shell.
export const FIRST_WORDS_DATA_PAGE_GRACE_MS = 1200;
// The calculators' heading, lead, explanation and questions are fixed wording and need no read. When their lists are not ready in time
// (a cold instance), the document still carries that wording rather than an empty shell; the lists come with the next request.
// The home page's words are fixed wording only (ZURIEL 21.11.2026, #1470): no read, so they are never missing, even on a cold instance.
export function firstWordsStaticFacts2029(path) {
  const family = firstWordsFamily2029(path), kind = family?.kind;
  if (kind === "home") return { kind };
  if (kind === "codes") return { ...family, codes: [] };
  return kind === "gematria" || kind === "community-calculator" ? { kind, recent: [], picked: [], pickedThisWeek: false } : null;
}
export function firstWordsGraceMs2029(path) {
  const kind = firstWordsFamily2029(path)?.kind;
  return kind === "number" || kind === "phrase" ? FIRST_WORDS_DATA_PAGE_GRACE_MS : FIRST_WORDS_GRACE_MS;
}
export const FIRST_WORDS_MAX_BYTES = 24000;
const HEADERS = { apikey: SUPABASE_ANON, Authorization: "Bearer " + SUPABASE_ANON };
const VERIFIED = "is_verified=eq.true&is_published=eq.true";

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const text = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const numberHref = value => "/number/" + encodeURIComponent(String(value));
const day = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || "")) ? String(value).slice(0, 10).split("-").reverse().join(".") : "";
function unique(rows, key) {
  const seen = new Set(), out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = text(row?.[key]);
    if (!id || seen.has(id)) continue;
    seen.add(id); out.push(row);
  }
  return out;
}

function reader(fetchImpl, signal) {
  const get = async (path, init = {}) => {
    const response = await fetchImpl(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...HEADERS, ...(init.headers || {}) }, signal });
    if (!response.ok) throw new Error("first_words_source_unavailable");
    return response.json();
  };
  return {
    rows: async path => { const rows = await get(path); if (!Array.isArray(rows)) throw new Error("first_words_source_invalid"); return rows; },
    rpc: (name, body) => get(`rpc/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  };
}
// A failed optional block is an absent block; it never fails the page's words.
const optional = promise => promise.catch(() => null);

async function postsOfNumber(read, value) {
  const found = await read.rpc("posts_by_number_strict", { num: value, lim: 3 });
  const slugs = unique(found, "slug").map(row => row.slug).slice(0, 3);
  if (!slugs.length) return [];
  const rows = await read.rows(`posts?slug=in.(${slugs.map(slug => `"${String(slug).replace(/["\\]/g, "")}"`).map(encodeURIComponent).join(",")})&select=id,slug,wp_id,source,link,title,date`);
  return slugs.map(slug => rows.find(row => row.slug === slug)).filter(Boolean);
}

// The one read of a number's anchor, shared by everyone who asks for it at the same moment: the document's own metadata (api/og.js, through the
// document handler) and these words. Only the read in flight is shared (kept for a moment so two callers of one request meet); nothing is
// remembered beyond that, so a changed or hidden anchor is read again by the next request exactly as before.
const anchorReads = new Map();
export const NUMBER_ANCHOR_SHARE_MS = 1500;
export function numberAnchorRows2029(value, fetchImpl = globalThis.fetch) {
  const key = String(value);
  if (anchorReads.has(key)) return anchorReads.get(key);
  const pending = reader(fetchImpl, AbortSignal.timeout(FIRST_WORDS_DEADLINE_MS)).rows(`number_anchors?value=eq.${encodeURIComponent(key)}&select=fact,hint&limit=1`);
  anchorReads.set(key, pending);
  const forget = () => setTimeout(() => { if (anchorReads.get(key) === pending) anchorReads.delete(key); }, NUMBER_ANCHOR_SHARE_MS).unref?.();
  pending.then(forget, forget);
  return pending;
}
export function _resetNumberAnchorsForTests() { anchorReads.clear(); }

async function numberFacts(read, value, progress, fetchImpl) {
  const [phrases, anchor, posts] = await Promise.all([
    read.rows(`gematria_words?ragil=eq.${value}&${VERIFIED}&select=phrase&order=lead_rank.asc.nullslast,visibility_tier.asc.nullslast,created_at.desc.nullslast&limit=60`).then(rows => {
      const phrases = unique(rows, "phrase");
      if (phrases.length) progress.partial = { kind: "number", value, phrases, anchor: null, posts: [] };
      return rows;
    }),
    optional(numberAnchorRows2029(value, fetchImpl)),
    optional(postsOfNumber(read, value)),
  ]);
  const list = unique(phrases, "phrase");
  if (!list.length && !posts?.length && !anchor?.[0]?.fact) return null;
  return { kind: "number", value, phrases: list, anchor: anchor?.[0] || null, posts: posts || [] };
}

async function phraseFacts(read, phrase) {
  const own = await read.rows(`gematria_words?phrase=eq.${encodeURIComponent(phrase)}&${VERIFIED}&select=phrase,ragil&limit=1`);
  const value = Number(own[0]?.ragil);
  if (!own[0] || !Number.isSafeInteger(value) || value < 1) return null;
  // Two reads only (the phrase, then its peers): the posts of the value are on the number page this page links to.
  const peers = await optional(read.rows(`gematria_words?ragil=eq.${value}&${VERIFIED}&select=phrase&order=lead_rank.asc.nullslast,visibility_tier.asc.nullslast,created_at.desc.nullslast&limit=40`));
  return { kind: "phrase", phrase: own[0].phrase, value, phrases: unique(peers, "phrase").filter(row => row.phrase !== own[0].phrase), posts: [] };
}

async function calculatorFacts(read, kind) {
  const [recent, pulse] = await Promise.all([
    read.rows(`gematria_words?${VERIFIED}&ragil=gte.1&select=phrase,ragil,created_at&order=created_at.desc.nullslast&limit=36`),
    // The one public activity reader (#1461). Its own contract: { version: 1, phrases: [{ phrase, value, events }] }; anything else is absent.
    optional(read.rpc("research_pulse_2029", { p_hours: 168 })),
  ]);
  const picked = pulse?.version === 1 && Array.isArray(pulse.phrases)
    ? unique(pulse.phrases, "phrase").filter(row => Number.isSafeInteger(Number(row.value))).slice(0, 24) : [];
  // "this week" is stated only when the reader itself reports the seven-day window it measured; otherwise the block has no period.
  return { kind, recent: unique(recent, "phrase").slice(0, 30), picked, pickedThisWeek: picked.length > 0 && pulse?.hours === 168 };
}

const CIPHER_PAGE_SIZE = 24;
const researchCodesPath = "/codes/" + encodeURIComponent("מחקר");

async function codesFacts(read, family) {

  const filter = family.research ? "&source=eq.research" : "";
  const rows = await read.rows("els_records?status=eq.published&visibility=eq.public" + filter
    + "&select=slug,title,search_term,skip_distance&order=created_at.desc,id.desc"
    + `&limit=${CIPHER_PAGE_SIZE + 1}`);
  return { ...family, more: rows.length > CIPHER_PAGE_SIZE, codes: unique(rows.slice(0, CIPHER_PAGE_SIZE), "slug") };
}
async function topicFacts(read, slug) {
  const rows = await read.rows(`topic_cards_public?slug=eq.${encodeURIComponent(slug)}&select=title,subtitle,highlight_numbers&limit=1`);
  const row = rows[0];
  return row ? { kind: "topic", topic: row } : null;
}

// Which family an address belongs to. Anything else has no first words (today's document).
export function firstWordsFamily2029(path) {
  let decoded;
  try { decoded = decodeURIComponent(path).replace(/\/+$/, "") || "/"; } catch { return null; }
  if (decoded === "/") return { kind: "home" };
  if (decoded === "/number") return { kind: "number-search" };
  if (decoded === "/community" || decoded === "/community/chat") return { kind: "community-chat" };
  if (decoded === "/gematria") return { kind: "gematria" };
  if (decoded === "/community/calculator") return { kind: "community-calculator" };
  if (decoded === "/codes") return { kind: "codes" };
  if (decoded === "/codes/מחקר") return { kind: "codes", research: true };
  let match = /^\/number\/([^/]+)$/.exec(decoded);
  if (match) {
    if (/^\d{1,9}$/.test(match[1])) return Number(match[1]) >= 1 ? { kind: "number", value: Number(match[1]) } : null;
    return /^\d+$/.test(match[1]) || match[1].length > 120 ? null : { kind: "phrase", phrase: match[1] };
  }
  match = /^\/codes\/([^/]+)$/.exec(decoded);
  if (match && match[1] !== "מחקר") return { kind: "code", slug: match[1] };
  match = /^\/topic\/([^/]+)$/.exec(decoded);
  if (match) return { kind: "topic", slug: match[1] };
  return null;
}

async function readFacts(family, fetchImpl, deadlineMs, progress) {
  const read = reader(fetchImpl, AbortSignal.timeout(deadlineMs));
  if (family.kind === "number") return numberFacts(read, family.value, progress, fetchImpl);
  if (family.kind === "phrase") return phraseFacts(read, family.phrase);
  if (family.kind === "codes") return codesFacts(read, family);
  if (family.kind === "topic") return topicFacts(read, family.slug);
  return calculatorFacts(read, family.kind);
}

// Speed (Speed Law): the calculators and the cipher library read nothing for their metadata, so a read on every request would be new waiting
// time. Each function instance therefore keeps what it read, for a short and bounded time: an answer is used as it is for FRESH; between FRESH
// and STALE it is used once more while one background read replaces it; past STALE it is never used. So a phrase that is hidden (is_published
// or is_verified turned off) leaves every document within STALE at the latest, on every instance, with no purge step. Only public rows are
// kept, the same for every reader. A failed read keeps nothing.
export const FIRST_WORDS_CACHE = Object.freeze({ freshMs: 5 * 60 * 1000, staleMs: 10 * 60 * 1000, entries: 400 });
const kept = new Map(), reading = new Map();
export function _resetFirstWordsForTests() { kept.clear(); reading.clear(); }
function keepAlive(promise) {
  try { globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.waitUntil?.(promise); } catch { /* no request context: plain process */ }
  return promise;
}
function refresh(key, family, fetchImpl, deadlineMs, now) {
  if (reading.has(key)) return reading.get(key).pending;
  const progress = { pending: null, partial: null };
  const pending = readFacts(family, fetchImpl, deadlineMs, progress).then(facts => {
    kept.delete(key); kept.set(key, { facts, at: now() });
    if (kept.size > FIRST_WORDS_CACHE.entries) kept.delete(kept.keys().next().value);
    return facts;
  }).finally(() => { if (reading.get(key) === progress) reading.delete(key); });
  progress.pending = pending;
  reading.set(key, progress);
  // The read outlives a request that stopped waiting for it, so the next request finds its answer.
  keepAlive(pending.catch(() => null));
  return pending;
}

// A cold number read may already have public verified phrases while its related posts are loading.
export function numberWordsInFlight2029(path, search) {
  const family = !search && firstWordsFamily2029(path);
  return family?.kind === "number" ? reading.get(JSON.stringify(family))?.partial : null;
}

export async function firstWordsFacts2029(path, { search = "", fetchImpl = globalThis.fetch, deadlineMs = FIRST_WORDS_DEADLINE_MS, now = Date.now } = {}) {
  const family = search ? null : firstWordsFamily2029(path);
  // Detail metadata admits the exact record. Pagination metadata reads the requested slice.
  if (family?.kind === "code") return null;
  if (family && ["home", "number-search", "community-chat"].includes(family.kind)) return family;
  if (!family || typeof fetchImpl !== "function") return null;
  try {
    const key = JSON.stringify(family), entry = kept.get(key), age = entry ? now() - entry.at : Infinity;
    if (entry && age < FIRST_WORDS_CACHE.freshMs) return entry.facts;
    if (entry && age < FIRST_WORDS_CACHE.staleMs) { refresh(key, family, fetchImpl, deadlineMs, now).catch(() => null); return entry.facts; }
    return await refresh(key, family, fetchImpl, deadlineMs, now);
  } catch { return null; }
}

// `wide` = one item per row (long titles). Every item is one line of fixed height, so a web font that arrives later cannot change how many
// rows a list has (protected Preview, desktop, slowed: a wrapped title lost a line on the font swap and moved everything below it, CLS 0.098).
const links = (items, label, wide = false) => items.length
  ? `<h2>${esc(label)}</h2><ul${wide ? ' class="w"' : ""}>${items.map(item => `<li><a href="${esc(item.href)}">${esc(item.label)}</a>${item.note ? ` <span>${esc(item.note)}</span>` : ""}</li>`).join("")}</ul>` : "";
const phraseLinks = (rows, withValue = false) => rows.map(row => ({ href: numberHref(row.phrase), label: text(row.phrase), note: withValue && row.ragil != null ? `= ${Number(row.ragil ?? row.value)}` : "" }));
const postLinks = rows => rows.map(row => ({ href: publicPostHref(row), label: text(row.title), note: day(row.date) })).filter(item => item.href && item.label);

function body(facts) {
  if (facts.kind === "insight") {
    return `<h1 id="comm-${esc(facts.id)}">${esc(facts.title)}</h1><p>${esc(facts.body.slice(0, 1900))}</p><p><a href="/findings">לממצאים שפורסמו</a></p>`;
  }
  if (facts.kind === "writers") {
    const base = "/community/researchers";
    return '<h1>הכתבים והחוקרים</h1>'
      + (facts.unavailable ? '<p>רשימת הכותבים אינה זמינה כרגע. אפשר לנסות שוב בהמשך.</p>' : "")
      + links(facts.people.map(person => ({ label: person.displayName, href: person.href })), "דפי הכותבים")
      + (facts.page > 1 ? `<a rel="prev" href="${base}${facts.page > 2 ? `?page=${facts.page - 1}` : ""}">לעמוד הקודם</a> ` : "")
      + (facts.hasMore ? `<a rel="next" href="${base}?page=${facts.page + 1}">לעמוד הבא</a>` : "");
  }
  if (facts.kind === "writer") return `<h1>${esc(facts.name)}</h1>`
    + (facts.bio ? `<p>${esc(facts.bio)}</p>` : "")
    + links(facts.works, "פרסומים ומקורות", true)
    + '<p><a href="/community/researchers">כל הכתבים והחוקרים</a></p>';
  if (facts.kind === "timeline" || facts.kind === "broadcasts") {
    let html = `<h1>${esc(facts.title)}</h1><p>${esc(facts.description)}</p>`;
    if (facts.notice) html += `<p>${esc(facts.notice)}</p>`;
    for (const [rel, href, label] of [["prev", facts.previousHref, "לעמוד הקודם"], ["next", facts.nextHref, "לעמוד הבא"]]) {
      if (href) html += `<a rel="${rel}" href="${esc(href)}">${label}</a> `;
    }
    for (const section of facts.sections) {
      let items = "";
      for (const item of section.items) {
        const title = item.href ? `<a href="${esc(item.href)}">${esc(item.title)}</a>` : esc(item.title);
        const row = `<li${item.id ? ` id="${esc(item.id)}"` : ""}>${title}${item.detail ? ` <span>${esc(item.detail)}</span>` : ""}</li>`;
        if (Buffer.byteLength(html + items + row + STYLE + FIRST_WORDS_KEEPER, "utf8") > FIRST_WORDS_MAX_BYTES - 300) break;
        items += row;
      }
      if (items) html += `<h2>${esc(section.title)}</h2><ul class="w">${items}</ul>`;
    }
    return html;
  }
  if (facts.kind === "archive") {
    const { title, description } = PUBLIC_ARCHIVE_2029;
    const introduction = `<h1>${esc(title)}</h1><p>${esc(description)}</p>`;
    const destinations = '<p><a href="/gallery">גלריות ותמונות</a> · <a href="/post">פוסטים</a> · '
      + '<a href="/archive?tab=pool">מאגר התמונות</a> · <a href="/archive?tab=cascade">אוצרות הגילוי</a></p>';
    const notice = facts.selectionNotice ? `<p>${esc(facts.selectionNotice)}</p>` : "";
    const sections = facts.collections.map(collection => links(
      collection.items.slice(0, 3).map(item => ({ href: item.href, label: item.title })), collection.title, true
    ));
    const next = facts.hasMore ? `<p><a rel="next" href="${esc(publicArchiveHref2029(facts.year, facts.page + 1, facts.tab))}">לעמוד הבא</a></p>` : "";
    let html = introduction + notice + destinations + next;
    for (const section of sections) {
      if (Buffer.byteLength(html + section + STYLE + FIRST_WORDS_KEEPER, "utf8") > FIRST_WORDS_MAX_BYTES - 200) break;
      html += section;
    }
    return html;
  }
  if (facts.kind === "reality") {
    const { title, description } = PUBLIC_REALITY_STREAM_2029;
    return `<h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="/gallery">גלריות ומקורות</a></p>`;
  }
  if (facts.kind === "forum") {
    return `<h1>${esc(facts.title)}</h1><p>${esc(facts.excerpt)}</p><p><a href="/community/chat">לשיחת הקהילה</a></p>`;
  }
  if (facts.kind === "map") {
    return '<h1>מפת האתר</h1>' + links(publicMapLinks2029(true).map(([href, label]) => ({ href, label })), "דפי האתר");
  }
  if (facts.kind === "findings") {
    const { title, description } = PUBLISHED_FINDINGS_READING;
    return `<h1>${esc(title)}</h1><p>${esc(description)}</p><p><a href="/books">ספרים ומקורות</a> · <a href="/codes/מחקר">צפני מחקר שפורסמו</a></p>`;
  }
  if (facts.kind === "home") {
    const words = HOME_FIRST_WORDS;
    // Exact wording; the series line and the start line are links to destinations that exist today. The start items are inline
    // links on one line (no list), as written in the approved text.
    return `<h1>${esc(words.heading)}</h1><p><strong>${esc(words.tagline)}</strong></p><p>${esc(words.lead)}</p>`
      + `<p><a href="${esc(words.series.href)}"><strong>${esc(words.series.label)}</strong></a> — ${esc(words.series.note)}</p>`
      + `<p><strong>${esc(words.startLabel)}</strong> ${words.start.map(item => `<a href="${esc(item.href)}">${esc(item.label)}</a>`).join(" · ")}.</p>`;
  }
  if (facts.kind === "number-search") {
    return "<h1>מספר או ביטוי</h1><p>המספרים, הביטויים והמקורות במנוע הקיים. חיפוש אינו פרסום ציבורי.</p>"
      + '<p><a href="/number/1820">1820 בגימטריה</a> · <a href="/gematria">מחשבון גימטריה מקצועי</a></p>';
  }
  if (facts.kind === "community-chat") {
    return "<h1>צ'אט הקהילה</h1><p>שיחות, שאלות וגילויים, פתוח לכולם.</p>"
      + '<p><a href="/community/researchers">אנשים בקהילה</a> · <a href="/community/calculator">מחשבון הקהילה</a></p>';
  }
  if (facts.kind === "number") {
    const { value, phrases, anchor, posts } = facts;
    return `<h1>${value} בגימטריה</h1>`
      + (anchor?.fact ? `<p>${esc(text(anchor.fact))}${anchor.hint ? " — " + esc(text(anchor.hint)) : ""}</p>` : "")
      + (phrases.length ? `<p>${phrases.length} ביטויים מאומתים שערכם ${value} בגימטריה רגילה, מתוך מאגר סוד 1820.</p>` : "")
      + links(phraseLinks(phrases), `ביטויים ששווים ${value}`)
      + links(postLinks(posts), `פוסטים על ${value}`, true)
      + `<p><a href="/gematria">מחשבון גימטריה</a> · <a href="${numberHref(value - 1)}">${value - 1}</a> · <a href="${numberHref(value + 1)}">${value + 1}</a></p>`;
  }
  if (facts.kind === "gallery") {
    return `<h1>${esc(GALLERY_CATALOG_INTRO.heading)}</h1><p>${esc(GALLERY_CATALOG_INTRO.description)}</p><p><a href="/world">חזרה לעולם ←</a></p>`;
  }
  if (facts.kind === "phrase") {
    const { phrase, value, phrases, posts } = facts;
    return `<h1>${esc(text(phrase))} בגימטריה = ${value}</h1>`
      + `<p>הערך של «${esc(text(phrase))}» בגימטריה רגילה הוא <a href="${numberHref(value)}">${value}</a>. ביטוי מאומת במאגר סוד 1820.</p>`
      + links(phraseLinks(phrases), `ביטויים נוספים ששווים ${value}`)
      + links(postLinks(posts), `פוסטים על ${value}`, true)
      + `<p><a href="/gematria?q=${encodeURIComponent(text(phrase))}">חשבו את «${esc(text(phrase))}» בכל השיטות</a></p>`;
  }
  if (facts.kind === "gematria" || facts.kind === "community-calculator") {
    const community = facts.kind === "community-calculator";
    const picked = links(facts.picked.map(row => ({ href: numberHref(row.phrase), label: text(row.phrase), note: `= ${Number(row.value)}` })), facts.pickedThisWeek ? "ביטויים נבחרים השבוע" : "ביטויים נבחרים");
    const recent = links(phraseLinks(facts.recent, true), "גימטריות מאומתות שנוספו לאחרונה");
    const explain = `<h2>${esc(COMMUNITY_CALCULATOR_EXPLAINER.heading)}</h2>` + COMMUNITY_CALCULATOR_EXPLAINER.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join("");
    return community
      ? `<h1>${esc(COMMUNITY_CALCULATOR_SEO.heading)}</h1><p>${esc(COMMUNITY_CALCULATOR_SEO.lead)}</p>`
        + `<p><a href="${CALCULATOR_PRO_PATH}">${esc(CALCULATOR_PRO_SEO.heading)}</a></p>${picked}${recent}${explain}`
        + `<h2>שאלות נפוצות</h2>` + COMMUNITY_CALCULATOR_FAQ.map(({ q, a }) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")
      : `<h1>${esc(CALCULATOR_PRO_SEO.heading)}</h1><p>${esc(CALCULATOR_PRO_SEO.lead)}</p>`
        + `${picked}${recent}${explain}<p><a href="/community/calculator">מחשבון הקהילה: שמות, השוואה ותאריך עברי</a> · <a href="/number">דף המספר</a></p>`;
  }
  if (facts.kind === "codes") {
    const path = facts.research ? researchCodesPath : "/codes";
    const page = facts.page || 1;
    const prev = page > 1 ? `<a rel="prev" href="${path}${page === 2 ? "" : "?page=" + (page - 1)}">העמוד הקודם</a>` : "";
    const next = facts.more ? `<a rel="next" href="${path}?page=${page + 1}">העמוד הבא</a>` : "";
    return `<h1>${facts.research ? "פרסומי מחקר בצפנים" : "ספריית הצפנים"}</h1><p>דילוגי אותיות (ELS) שפורסמו בסוד 1820: המונח, הדילוג והמקום בתורה ובתנ״ך.</p>`
      + links(facts.codes.map(row => ({ href: "/codes/" + encodeURIComponent(row.slug), label: text(row.title || row.search_term), note: row.skip_distance != null ? `דילוג ${row.skip_distance}` : "" })), "הצפנים שפורסמו")
      + (prev || next ? `<nav aria-label="דפי הספרייה">${[prev, next].filter(Boolean).join(" · ")}</nav>` : "")
      + `<p><a href="${facts.research ? "/codes" : researchCodesPath}">${facts.research ? "כל הצפנים שפורסמו" : "פרסומי מחקר בצפנים"}</a> · <a href="/code">כלי הצופן: חיפוש דילוגי אותיות בתנ״ך</a></p>`;
  }
  if (facts.kind === "code") {
    const { code, findings } = facts;
    return `<h1>הצופן «${esc(text(code.title || code.search_term))}»</h1>`
      + `<p>דילוג אותיות (ELS) של «${esc(text(code.search_term))}» ${code.scope === "tanakh" ? "בכל התנ״ך" : code.scope === "torah" ? "בתורה" : ""}${code.skip_distance != null ? `, בדילוג ${esc(code.skip_distance)}` : ""}. עדות, לא ניבוי.</p>`
      + (findings.length ? `<h2>מה נמצא במטריצה</h2><ul>${findings.map(item => `<li>${esc(item)}</li>`).join("")}</ul>` : "")
      + `<p><a href="/codes">כל הצפנים</a> · <a href="/code">כלי הצופן</a></p>`;
  }
  if (facts.kind === "topic") {
    const numbers = (Array.isArray(facts.topic.highlight_numbers) ? facts.topic.highlight_numbers : []).map(Number).filter(value => Number.isSafeInteger(value) && value > 0).slice(0, 24);
    return `<h1>${esc(text(facts.topic.title))}</h1>` + (facts.topic.subtitle ? `<p>${esc(text(facts.topic.subtitle))}</p>` : "")
      + links(numbers.map(value => ({ href: numberHref(value), label: String(value) })), "המספרים בהתכנסות") + `<p><a href="/world">העולם</a></p>`;
  }
  if (facts.kind === "taxonomy") {
    return `<h1>${esc(text(facts.label))}</h1><p>הפרסומים הציבוריים של סוד 1820 ב${facts.taxonomyKind === "tag" ? "תגית" : "סיווג"} «${esc(text(facts.label))}».</p>`
      + (facts.toolNotice ? `<p>${esc(text(facts.toolNotice))}</p>` : "")
      + links(postLinks(facts.posts), "פרסומים", true) + `<p><a href="/post">כל הפוסטים</a></p>`;
  }
  return "";
}

// One small style, scoped to the block; colours are inherited from the opening shell (dark, light and parchment themes alike).
const STYLE = "<style>.sod29-first-words{max-width:46rem;margin:0 auto;padding:0 16px 48px;line-height:1.7;font-size:17px}.sod29-first-words h1{font-size:26px;line-height:1.3;margin:0 0 12px}.sod29-first-words h2{font-size:19px;margin:22px 0 8px}.sod29-first-words h3{font-size:17px;margin:14px 0 4px}.sod29-first-words p{margin:0 0 10px}.sod29-first-words ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:4px 14px}.sod29-first-words ul.w{grid-template-columns:1fr}.sod29-first-words li,.sod29-first-words h1,.sod29-first-words h2,.sod29-first-words h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sod29-first-words a{color:inherit;text-decoration:underline;text-underline-offset:3px}.sod29-first-words li span{opacity:.75;font-size:14px}</style>";

// The page's code first replaces the document's opening shell with its own twin of it (Opening2029.jsx, the Suspense fallback) and only then
// with the page. Without this, the words showed, vanished into a bare shell and then the page came (protected Preview, 20.11.2026). This small
// script, carried only by a document that has words, moves the same words node into the twin shell while it is the only thing in the root, and
// stops for good the moment anything else is there, so the words never appear over another page. It adds nothing to the code every page loads.
export const FIRST_WORDS_KEEPER = '<script>(function(){var r=document.getElementById("root"),w=document.querySelector("[data-first-words]");if(!r||!w||!window.MutationObserver)return;var s=w.previousElementSibling,o=new MutationObserver(function(){var c=r.firstElementChild;if(!c)return;if(r.childElementCount!==1||!c.classList.contains("sod29-opening")){o.disconnect();return}if(!c.contains(w)){if(s&&s.tagName==="STYLE")c.appendChild(s);c.appendChild(w)}});o.observe(r,{childList:true})})()</script>';

export function firstWordsHtml2029(facts) {
  try {
    const inner = facts ? body(facts) : "";
    if (!inner) return "";
    const html = `${STYLE}<main class="sod29-first-words" data-first-words="${esc(facts.kind)}">${inner}</main>${FIRST_WORDS_KEEPER}`;
    return Buffer.byteLength(html, "utf8") <= FIRST_WORDS_MAX_BYTES ? html : "";
  } catch { return ""; }
}

// The words go inside the opening shell, after its status line: the shell stays the same bar, and the page replaces the whole shell on mount.
const SLOT = /(<span class="sod29-opening-status" role="status">[^<]*<\/span>)(\s*<\/div><\/div>)/;
export function withFirstWords2029(html, fragment) {
  if (!fragment || typeof html !== "string" || html.includes("data-first-words=") || !SLOT.test(html)) return { html, state: fragment ? "no-slot" : "none" };
  return { html: html.replace(SLOT, (_, status, close) => status + fragment + close), state: "served" };
}
