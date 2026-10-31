// Diagnostic only. Existing anonymous readers, bounded windows, no runtime registry.
// Run: node --use-env-proxy scripts/audit-world-one-tree-coverage-20261031.mjs
// Never prints statements, contributor names, contact details or auth material.
import assert from 'node:assert/strict';

const nativeFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = String(init.method || input?.method || 'GET').toUpperCase();
  assert.equal(url.origin, 'https://linswmnnkjxvweumprav.supabase.co', 'audit stays on canonical public backend');
  assert.ok(['GET','HEAD','OPTIONS'].includes(method), 'audit forbids writes and RPC/model invocations');
  requests.push({ method, path: url.pathname });
  return nativeFetch(input, init);
};

const { getPublicResearchClient } = await import('../src/lib/research/researchViewMode.js');
const { fetchZviApprovedFindingsPage, fetchZviReviewedFindingsPage, fetchZviNumberFindingsPage,
  fetchZviSourceFindingsPage, ZVI_SOURCE_CONTRIBUTOR_ID } = await import('../src/lib/research/worldZviApprovedFindings2029.js');
const { fetchWorldPublicFindingById } = await import('../src/lib/research/worldPublicFindingReader.js');
const { fetchCanonicalGraphEntityFindings } = await import('../src/lib/research/entityGraphFinding.js');
const { normalizeOpenedRelations } = await import('../src/lib/research/worldGraphRelationOpener2029.js');
const { fetchStoryTreeSequence2029 } = await import('../src/lib/research/worldSourceConnections.js');
const { fetchTopicSourceContext } = await import('../src/lib/research/entityHubProjection.js');
const { getGalleriesOverview } = await import('../src/lib/supabase.js');
const { buildPublicGalleryCatalog2029 } = await import('../src/lib/research/topicSourceContext.js');
const { buildWorldAllResearchProjection, findWorldPublicResearchFinding } = await import('../src/lib/research/worldAllResearchProjection.js');
const client = getPublicResearchClient();
const report = { checkedAt: new Date().toISOString(), scope: 'bounded_readonly_audit_not_full_admission_or_ui_acceptance',
  inventory: {}, findingWindows: {}, numberPaths: [], sourcePath: null, exactFindings: [], topics: [], graphWindows: [], stories: null };

async function checked(query) {
  const result = await query;
  if (result.error) throw new Error(`audit_read_failed:${result.error.code || 'backend'}`);
  return result;
}
async function pages(read, maxPages, pageSize) {
  let cursor = null, page, omittedForReview = false, omittedUnavailable = false;
  const rows = new Map(); let count = 0;
  do {
    page = await read({ client, cursor, pageSize });
    assert.ok(Array.isArray(page.rows));
    for (const row of page.rows) rows.set(row.id, row);
    omittedForReview ||= page.omittedForReview === true;
    omittedUnavailable ||= page.omittedUnavailable === true;
    cursor = page.nextCursor; count++;
    if (page.hasMore) assert.ok(cursor, 'reader pagination must have a cursor');
  } while (page.hasMore && count < maxPages);
  return { summary: { pages: count, distinctReturned: rows.size, hasMore: page.hasMore,
    omittedForReview, omittedUnavailable, admission: 'existing_reader_guards_unchanged' }, rows: [...rows.values()] };
}

console.log('Audit phase: anonymous inventories (counts are not admission or evidence).');
report.inventory.publicApprovedFindingRows = (await checked(client.from('world_contributor_research_v1')
  .select('id', {count:'exact',head:true}).eq('privacy_scope','public').in('status',['approved','canonical']))).count;
report.inventory.approvedTopicRows = (await checked(client.from('topic_cards_public')
  .select('id', {count:'exact',head:true}).eq('status','approved'))).count;
const overview = await getGalleriesOverview({ force:true, publicSourceOnly:true, client });
const galleries = buildPublicGalleryCatalog2029(overview);
report.inventory.galleries = { available: galleries.items.length,
  images: galleries.items.reduce((sum,g)=>sum+g.imageCount,0), partial:galleries.coverage.partial };

console.log('Audit phase: existing classified and exact-reviewed Zvi readers.');
const approved = await pages(fetchZviApprovedFindingsPage, 6, 50);
const reviewed = await pages(fetchZviReviewedFindingsPage, 13, 20);
report.findingWindows = { classified:approved.summary, reviewed:reviewed.summary,
  unionDistinct:new Set([...approved.rows,...reviewed.rows].map(r=>r.id)).size };

console.log('Audit phase: number, exact source and finding entry paths.');
for (const value of [14,45,456,1118,1237,1820]) {
  const window = await pages(options=>fetchZviNumberFindingsPage({...options,value}),2,25);
  assert.ok(window.rows.every(row=>row.claimedNumber===value));
  report.numberPaths.push({value,...window.summary,
    pathKind:'via_stored_number_not_direct_topic_edge', findingIds:window.rows.slice(0,3).map(r=>r.id)});
}
const origin = approved.rows.find(r=>r.sourceRef);
if(origin){
  const result = await fetchZviSourceFindingsPage({client,sourceRef:origin.sourceRef,pageSize:25});
  assert.ok(result.rows.every(r=>r.sourceRef===origin.sourceRef));
  report.sourcePath={sourceRef:origin.sourceRef,returned:result.rows.length,hasMore:result.hasMore,
    omittedForReview:result.omittedForReview,omittedUnavailable:result.omittedUnavailable};
}
const other = (await checked(client.from('world_contributor_research_v1').select('id,source_ref')
  .eq('privacy_scope','public').in('status',['approved','canonical'])
  .or(`source_contributor_id.neq.${ZVI_SOURCE_CONTRIBUTOR_ID},source_contributor_id.is.null`).order('id').limit(2))).data || [];
const samples = [...new Map([...approved.rows.slice(0,1),...reviewed.rows.slice(0,1),...other].map(r=>[r.id,r])).values()];
for(const sample of samples){
  try {
    const finding=await fetchWorldPublicFindingById(sample.id,{cache:false});
    report.exactFindings.push({id:sample.id,sourceRef:sample.sourceRef||sample.source_ref,
      status:finding?'available':'withheld_or_unavailable',kind:finding?.kind||null});
  }catch {report.exactFindings.push({id:sample.id,status:'read_error_no_fallback'});}
}

// Reproduce a field-loss gap in the existing general-list projection without
// changing the reader, source, metadata or graph. The consumer is Beit Midrash.
const canonical = (await checked(client.from('world_contributor_research_v1')
  .select('id,created_at,kind,statement,value,source,source_ref,status,privacy_scope,meta,promoted_node_id')
  .eq('privacy_scope','public').eq('status','canonical').not('promoted_node_id','is',null).order('id').limit(5))).data || [];
for(const row of canonical){
  const full=findWorldPublicResearchFinding(buildWorldAllResearchProjection({researchObjects:[row]}),row.id);
  if(!full?.documentedTreeConnected)continue;
  const missing={...row};delete missing.promoted_node_id;
  const list=findWorldPublicResearchFinding(buildWorldAllResearchProjection({researchObjects:[missing]}),row.id);
  report.listProjectionGap={findingId:row.id,completeDocumentedAttachment:full.documentedTreeConnected,
    omittedPromotedIdAttachment:list?.documentedTreeConnected??null,
    codePath:'fetchWorldAllResearchProjection -> BeitMidrash2029Page',
    state:'reproduced_not_fixed_not_claimed_as_current_World_default'};
  break;
}

console.log('Audit phase: actual Topic media, graph provenance and flight story readers.');
const topics = (await checked(client.from('topic_cards_public').select('slug,node_id,numbers,image_ids')
  .eq('status','approved').in('slug',['1237','gapfill-1118','2701-bereshit']))).data || [];
for(const topic of topics){
  const node = (await checked(client.from('nodes').select('id,type,is_active').eq('id',topic.node_id).maybeSingle())).data;
  const context = await fetchTopicSourceContext({topicSlug:topic.slug,client});
  report.topics.push({slug:topic.slug,nodeId:topic.node_id,nodeActive:node?.is_active===true,
    declaredNumbers:topic.numbers,declaredImageOccurrences:topic.image_ids?.length||0,
    sourceObjectsReturned:context?.items?.length||0,sourceContextAvailable:!!context});
  const findings = await fetchCanonicalGraphEntityFindings(topic.node_id,{relationLimit:50});
  const opened = normalizeOpenedRelations(findings,{anchorNodeId:topic.node_id});
  report.graphWindows.push({slug:topic.slug,nodeActive:node?.is_active===true,
    status:opened.status,edgeRefs:(opened.relations||[]).map(r=>r.edgeRef),
    note:'existing_bounded_edges_not_new_findings_or_active_node_proof'});
}
const sequence=await fetchStoryTreeSequence2029({anchorNodeId:'78fe15e1-6fc5-4641-b1cd-831a75c5bab7'});
report.stories={anchor:'78fe15e1-6fc5-4641-b1cd-831a75c5bab7',status:sequence.status,coverage:sequence.coverage,
  sourceRefs:(sequence.stories||[]).map(s=>s.sourceRef)};
report.requests={count:requests.length,methods:[...new Set(requests.map(r=>r.method))],
  paths:[...new Set(requests.map(r=>r.path))],writes:0,models:0};
console.log(JSON.stringify(report,null,2));
