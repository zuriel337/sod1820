// Stand-ins for the readers, retryable module boundary and drawing-only parts around WorldFlightStory2029 (bundled by
// test/home-story-2029.test.mjs in place of the real modules, which reach for a database). Every read is logged in
// window.__calls; window.__post is the compact row and window.__fullPost may override the full-reader row.
const calls = (window.__calls = window.__calls || []);
const later = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getPostBySlug(slug) {
  calls.push('getPostBySlug');
  await later(window.__primaryDelay ?? 25);
  return window.__fullPost === undefined ? (window.__post === undefined ? null : window.__post) : window.__fullPost;
}
// the Home card's narrower lookup: the same row, cut to the columns the test passes in (window.__columns = the real HOME_STORY_POST_COLUMNS_2029)
export async function getPostCardBySlug(slug) {
  calls.push('getPostCardBySlug'); await later(window.__cardDelay ?? 25);
  const row = window.__post === undefined ? null : window.__post;
  if (!row) return row;
  const picked = {};
  for (const column of window.__columns) if (column in row) picked[column] = row[column];
  return picked;
}
export const supabase = null;
// The production component uses createOnDemandLoader. This bounded stand-in lets the component integration test make
// the module request fail once while separately retaining the real loader's own unit coverage.
export function createOnDemandLoader(importer) {
  let pending = null;
  return () => {
    if (pending) return pending;
    if (window.__trackModuleRequests) calls.push('projection module request');
    if ((window.__moduleFailures || 0) > 0) {
      window.__moduleFailures -= 1;
      return Promise.reject(new Error('Failed to fetch dynamically imported module: https://fixture.test/projection.js'));
    }
    pending = Promise.resolve().then(importer).catch((error) => { pending = null; throw error; });
    return pending;
  };
}
// the projection builder: logs, hands the row out early (onPrimary) like the real one, then resolves the full projection after its extension reads
export async function fetchPost2029ReadingProjection(slug, { onPrimary } = {}) {
  calls.push('fetchPost2029ReadingProjection');
  const post = await getPostBySlug(slug);
  if (!post) return null;
  const flags = window.__projectionFlags || {};
  const projectionFlags = {
    draft: flags.draft ?? (Array.isArray(post.tags) && post.tags.includes('טיוטה')),
    privateStage: flags.privateStage === true,
    previewSnapshot: flags.previewSnapshot === true,
  };
  if (typeof onPrimary === 'function') onPrimary({
    post,
    identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` },
    experience: { media: window.__primaryMedia || null, timeline: [] },
    ...projectionFlags,
    extensionsPending: true,
  });
  calls.push('extension reads');
  await later(window.__extensionDelay ?? 60);
  if ((window.__extensionFailures || 0) > 0) {
    window.__extensionFailures -= 1;
    throw new Error('extension reads failed');
  }
  return {
    post,
    identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` },
    experience: { media: window.__media || null, timeline: window.__timeline || [{ href: '/post/x', label: 'x' }] },
    ...projectionFlags,
  };
}
export function projectPost2029Experience(post) { return { media: post?._experience?.media || null, timeline: [] }; }
export function postRowToWorldUpdate(row) {
  if (row?.id == null || !String(row.slug || '').trim() || row.home_hidden === true) return null;
  if ((Array.isArray(row.tags) ? row.tags : []).some((tag) => ['טיוטה', 'פורום'].includes(String(tag).trim()))) return null;
  if (['gpt-draft', 'web'].includes(String(row.source || '').trim().toLowerCase())) return null;
  if (!String(row.title || '').replace(/<[^>]*>/g, '').trim()) return null;
  return { id: row.slug };
}
export const WORLD_FLIGHT_POST_SLUG = 'flydubai-fz1073-363-14000-remzei-geula';
export function FrameState({ kind, title, children }) { return React.createElement('section', { className: `sod29-frame-state state-${kind}`, role: 'status' }, React.createElement('strong', null, title), children); }
export function PostCategories({ categories = [] }) { return React.createElement('span', { className: 'cats' }, (categories || []).join('|')); }
import React from 'react';
// default export for every drawing-only module (icons, the timeline, the category chips): chips are drawn as their names so the markup can be compared
export default function Drawn({ categories, items, currentHref, name }) {
  if (categories) return React.createElement('span', { className: 'cats' }, categories.join('|'));
  if (Array.isArray(items)) return React.createElement('ol', { 'data-timeline-current': currentHref || '' }, items.map((item, index) =>
    React.createElement('li', { key: item.id || `${item.href}-${index}` }, React.createElement('a', { href: item.href }, item.label))));
  return name ? React.createElement('span', { 'data-icon': name }) : null;
}
