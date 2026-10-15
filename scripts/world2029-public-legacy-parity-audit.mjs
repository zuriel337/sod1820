// Companion to the existing parity SQL. Public client only; never a content importer.
import { readFileSync } from 'node:fs';
import { buildPublicNumberHighlights } from '../src/lib/research/worldSourceDepthProjection.js';

const client = readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8');
const url = client.match(/export const SUPABASE_URL = '([^']+)'/)?.[1];
const key = client.match(/const SUPABASE_ANON = '([^']+)'/)?.[1];
if (!url || !key) throw new Error('Public client configuration missing');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function all(table, query) {
  const rows = [];
  for (let page = 0; page < 12; page++) {
    const response = await fetch(`${url}/rest/v1/${table}?${query}&limit=500&offset=${page * 500}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
  throw new Error(`${table}: bounded inventory incomplete`);
}
const [posts, images, topics, nodes] = await Promise.all([
  all('posts', 'select=id,wp_id,slug,home_hidden,categories,tags,source&order=id.asc'),
  all('gallery_images', 'select=id,image_url&published=eq.1&curator_hidden=not.is.true&min_tier=eq.0&order=id.asc'),
  all('topic_cards_public', 'select=id,slug,node_id,numbers,approved_at&order=id.asc'),
  all('nodes', 'select=id,type,label,metadata&is_active=eq.true&type=in.(number,post,image)&order=id.asc'),
]);
const activeTopicIds = new Set();
for (let offset = 0; offset < topics.length; offset += 100) {
  const ids = topics.slice(offset, offset + 100).map(t => t.node_id).filter(Boolean);
  if (!ids.length) continue;
  const rows = await all('nodes', `select=id&is_active=eq.true&id=in.(${ids.join(',')})&order=id.asc`);
  rows.forEach(n => activeTopicIds.add(n.id));
}
const privateProbe = await fetch(`${url}/rest/v1/research_objects?select=id&limit=1`, { headers, signal: AbortSignal.timeout(30000) });
const privateRows = privateProbe.ok ? await privateProbe.json() : [];
const archiveEligible = posts.filter(p => !(p.tags || []).some(t => ['טיוטה','פורום'].includes(t)) && p.source !== 'gpt-draft');
const postNodes = nodes.filter(n => n.type === 'post');
const imageIds = new Set(nodes.filter(n => n.type === 'image').map(n => n.metadata?.gallery_image_id));
const missingPosts = posts.filter(p => !postNodes.some(n => (p.wp_id != null && String(p.wp_id) === String(n.metadata?.post_wp_id)) || p.slug === n.metadata?.slug));
const missingImages = images.filter(i => !imageIds.has(i.id));
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), source: 'anonymous_REST', exhaustive: true,
  posts: { readable: posts.length, archiveEligible: archiveEligible.length, homeHidden: posts.filter(p => p.home_hidden).length, missingGraphMappings: missingPosts.length, uncategorized: posts.filter(p => !p.categories?.length).map(p => p.id) },
  images: { readable: images.length, missingGraphMappings: missingImages.length },
  topics: { readable: topics.length, missingActiveNode: topics.filter(t => !activeTopicIds.has(t.node_id)).length },
  numbers: { readable: nodes.filter(n => n.type === 'number').length, highlights: buildPublicNumberHighlights(topics) },
  // A REST row is NOT evidence of a rendered route or image byte availability.
  renderedRoutesVerified: false, assetBytesVerified: false,
  privateResearchProbe: { httpStatus: privateProbe.status, returnedRows: privateRows.length, accessDenied: !privateProbe.ok },
}, null, 2));
