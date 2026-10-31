// Synthetic public projection only; never publishes/restores a live Topic.
async function installPublicTopicFixture(page, { available = true, onlyMatchingRequests = false } = {}) {
  await page.route('**/rest/v1/topic_cards_public*', async (route) => {
    const url = new URL(route.request().url());
    const slug = url.searchParams.get('slug');
    if (onlyMatchingRequests && !url.search.includes('888')) return route.fallback();
    if (slug && !slug.includes('888-yeshua')) return route.fallback();
    const rows = available ? [{
      id: '11111111-1111-4111-8111-111111111888', slug: '888-yeshua',
      title: '888 — ציר בדיקה', subtitle: 'מקור ציבורי מדומה לבדיקת ניווט בלבד',
      status: 'approved', numbers: [888], highlight_numbers: [888],
      node_id: null, findings: [], image_ids: [], search_terms: [],
      created_at: '2026-10-12T00:00:00Z', approved_at: '2026-10-12T00:00:00Z',
    }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'content-range': rows.length ? '0-0/1' : '*/0' }, body: JSON.stringify(rows) });
  });
}

async function installSyntheticWorldCatalogFixture(page){
  const rows=Array.from({length:45},(_,index)=>({
    id:'22222222-2222-4222-8222-'+String(index+1).padStart(12,'0'),
    slug:index===0?'888-yeshua':'acceptance-topic-'+index,
    title:index===0?'888 — ציר בדיקה':'נושא בדיקה '+index,
    subtitle:'מקור ציבורי סינתטי לבדיקת חיפוש ועימוד בלבד',
    status:'approved',numbers:[index===0?888:index],highlight_numbers:[index===0?888:index],
    node_id:null,findings:[],image_ids:[],search_terms:[],created_by:null,
    meter_score:45-index,created_at:'2026-10-12T00:00:00Z',approved_at:'2026-10-12T00:00:00Z',
  }));
  await page.route('**/rest/v1/topic_cards_public*',async route=>{
    const url=new URL(route.request().url()),slug=url.searchParams.get('slug');
    if(slug&&!slug.includes('888-yeshua'))return route.fallback();
    const query=url.searchParams.get('or')||'';
    const matching=slug||query.includes('888')?rows.filter(row=>row.slug==='888-yeshua'):rows;
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||45);
    const pageRows=matching.slice(offset,offset+limit);
    await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':pageRows.length?offset+'-'+(offset+pageRows.length-1)+'/'+matching.length:'*/'+matching.length},body:JSON.stringify(pageRows)});
  });
}
module.exports={installPublicTopicFixture,installSyntheticWorldCatalogFixture};
