import { supabase } from '../supabase.js';
import { postCategoryFilterNames } from '../postCategoryIdentity.js';

export const HOME_POST_CARD_COLUMNS = 'id,slug,title,excerpt,image_url,thumb_url,categories,tags,home_hidden,date,modified,author,source';
export const HOME_POST_CARD_MAX = 60;

// Same category admission/order/draft/forum filters as getPostsFromSupabase.
// These 2029 cards do not consume the total or the full authored body.
export async function fetchHomePostCards2029({ category, limit, client = supabase }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > HOME_POST_CARD_MAX) throw new RangeError('Home post-card read must be bounded to 1..60 rows');
  const { data, error } = await client.from('posts').select(HOME_POST_CARD_COLUMNS)
    .order('modified', { ascending: false, nullsFirst: false }).range(0, limit - 1)
    .overlaps('categories', postCategoryFilterNames(category))
    .not('tags', 'cs', '{טיוטה}').not('tags', 'cs', '{פורום}');
  if (error) throw error;
  const posts = data || [];
  // Four language highlights rely on the authored body of the admitted Post 5018.
  // Preserve those exact checks while avoiding bodies for every other list row.
  if (category === 'שבילי שפה' && posts.some(post => String(post.id) === '5018' && post.home_hidden !== true)) {
    const { data: body, error: bodyError } = await client.from('posts')
      .select('id,content,excerpt').eq('id', 5018)
      .overlaps('categories', postCategoryFilterNames(category))
      .not('tags', 'cs', '{טיוטה}').not('tags', 'cs', '{פורום}')
      .eq('home_hidden', false).limit(1).maybeSingle();
    if (bodyError) return { posts }; // An optional highlight failure must not hide admitted cards.
    return { posts: posts.map(post => String(post.id) === '5018' ? { ...post, content: body?.content || '', excerpt: body?.excerpt || post.excerpt } : post) };
  }
  return { posts };
}
