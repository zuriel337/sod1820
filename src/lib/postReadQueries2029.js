// Query definitions used by the existing client readers AND the 2029 head.
// No independent boot query list; the same filters/order/limit define both URLs.
import { stripHtml } from './format.js';

export const HOME_LATEST_POST_LIMIT_2029 = 16;
export const WORLD_FLIGHT_POST_SLUG = 'flydubai-fz1073-363-14000-remzei-geula';
const cleanPostField = (value) => value == null ? '' : String(value).trim();

// Public Post admission shared by the compact Home/World story reader and the
// full World stream. Keeping it beside the read contract avoids importing the
// entire discovery stream just to admit one already-read card row.
export function isPublicWorldPostRow(row) {
  if (row?.id == null || !cleanPostField(row.slug) || row.home_hidden === true) return false;
  if ((Array.isArray(row.tags) ? row.tags : []).some((tag) => ['טיוטה', 'פורום'].includes(cleanPostField(tag)))) return false;
  if (['gpt-draft', 'web'].includes(cleanPostField(row.source).toLowerCase())) return false;
  return Boolean(stripHtml(cleanPostField(row.title)));
}
export function postBySlugRead(slug) {
  const decoded = decodeURIComponent(slug);
  const slugs = [...new Set([slug, decoded, encodeURIComponent(decoded).toLowerCase()])];
  const values = slugs.map(s => /[,()]/.test(s) ? `"${s}"` : s).join(',');
  return { table: 'posts', columns: '*', filters: [['slug', 'in', `(${values})`]], limit: 1 };
}
// Home story card: the columns it draws or admits on (id/slug identity, tags/home_hidden/source/title admission, categories, date, images).
// Same slug variants, filters and limit as postBySlugRead; only the columns differ. No body, excerpt or author.
export const HOME_STORY_POST_COLUMNS_2029 = 'id,slug,title,tags,home_hidden,source,categories,date,thumb_url,image_url';
export function postCardBySlugRead(slug) {
  return { ...postBySlugRead(slug), columns: HOME_STORY_POST_COLUMNS_2029 };
}
export function latestPostCardsRead({ limit = 2 } = {}) {
  return { table: 'posts', columns: 'id,slug,title,image_url,thumb_url,date,modified,tags,home_hidden',
    filters: [['home_hidden', 'eq', false], ['slug', 'not.is', 'null']],
    order: ['modified', { ascending: false, nullsFirst: false }], limit: limit + 5 };
}
export function applyPostRead(client, definition) {
  let query = client.from(definition.table).select(definition.columns);
  for (const [column, operator, value] of definition.filters) query = query.filter(column, operator, value);
  if (definition.order) query = query.order(...definition.order);
  return query.limit(definition.limit);
}
export function postReadUrl(base, definition) {
  const url = new URL(`/rest/v1/${definition.table}`, base);
  url.searchParams.set('select', definition.columns);
  for (const [column, operator, value] of definition.filters) url.searchParams.append(column, `${operator}.${value}`);
  if (definition.order) {
    const [column, options] = definition.order;
    url.searchParams.set('order', `${column}.${options.ascending ? 'asc' : 'desc'}.${options.nullsFirst ? 'nullsfirst' : 'nullslast'}`);
  }
  url.searchParams.set('limit', String(definition.limit));
  return url.href;
}
export function entryPrimaryReads2029(pathname) {
  if (pathname === '/') return [latestPostCardsRead({ limit: HOME_LATEST_POST_LIMIT_2029 })];
  if (/^\/post\/[^/]+\/?$/.test(pathname)) {
    try {
      // Match the existing router's decoded :slug, including its encoded-slash
      // handling. Keep postBySlugRead's original variant order unchanged.
      const slug = decodeURIComponent(pathname.slice(6).replace(/\/$/, '')).replace(/%2F/g, '/');
      return [postBySlugRead(slug)];
    } catch { return []; } // Malformed route: let the normal reader report it.
  }
  return [];
}
