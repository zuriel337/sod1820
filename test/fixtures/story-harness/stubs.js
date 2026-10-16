// Stand-ins for the readers and the drawing-only parts around WorldFlightStory2029 (bundled by test/home-story-2029.test.mjs in place of the real modules, which reach for a
// database): every read is logged in window.__calls; window.__post is the row getPostBySlug returns (null = not found).
const calls = (window.__calls = window.__calls || []);
const later = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getPostBySlug(slug) { calls.push('getPostBySlug'); await later(); return window.__post === undefined ? null : window.__post; }
export const supabase = null;
// the projection builder: logs, hands the row out early (onPrimary) like the real one, then resolves the full projection after its extension reads
export async function fetchPost2029ReadingProjection(slug, { onPrimary } = {}) {
  calls.push('fetchPost2029ReadingProjection');
  const post = await getPostBySlug(slug);
  if (!post) return null;
  if (typeof onPrimary === 'function') onPrimary({ post, identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` }, experience: { media: null, timeline: [] }, draft: Array.isArray(post.tags) && post.tags.includes('טיוטה'), privateStage: false, previewSnapshot: false, extensionsPending: true });
  calls.push('extension reads');
  await later(60);
  return { post, identity: { type: 'post', id: String(post.id), slug: post.slug, href: `/post/${post.slug}` }, experience: { media: window.__media || null, timeline: [{ href: '/post/x', label: 'x' }] }, draft: Array.isArray(post.tags) && post.tags.includes('טיוטה'), privateStage: false, previewSnapshot: false };
}
export function projectPost2029Experience(post) { return { media: post?._experience?.media || null, timeline: [] }; }
export function postRowToWorldUpdate(row) { return row && row.slug && !(Array.isArray(row.tags) && row.tags.includes('פורום')) ? { id: row.slug } : null; }
export const WORLD_FLIGHT_POST_SLUG = 'flydubai-fz1073-363-14000-remzei-geula';
export function FrameState({ kind, title, children }) { return React.createElement('section', { className: `sod29-frame-state state-${kind}`, role: 'status' }, React.createElement('strong', null, title), children); }
export function PostCategories({ categories = [] }) { return React.createElement('span', { className: 'cats' }, (categories || []).join('|')); }
import React from 'react';
// default export for every drawing-only module (icons, the timeline, the category chips): chips are drawn as their names so the markup can be compared
export default function Drawn({ categories }) { return categories ? React.createElement('span', { className: 'cats' }, categories.join('|')) : null; }
