// Offline audit only: anonymous public reads and existing Post readers. Nothing here
// is imported by the application or used as a runtime registry/taxonomy/claim store.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { isPublicPostMeasureSource } from '../src/lib/research/post2029ReadingProjection.js';
import { fetchNumberMethodProfile } from '../src/lib/research/numberCoreProjection.js';
import { projectTopicCardContent } from '../src/lib/research/topicConvergence.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const digest = value => createHash('sha256').update(String(value)).digest('hex');
const csvCell = value => {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
function csv(rows, columns) {
  return '\uFEFF' + [columns.map(csvCell).join(','), ...rows.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
}

// Public browser configuration already used by the application; never accept an
// authenticated session, service role or a credential supplied on the command line.
function publicConfiguration() {
  const source = readFileSync(resolve(root, 'src/lib/supabase.js'), 'utf8');
  const url = source.match(/export const SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  const key = source.match(/export const SUPABASE_ANON\s*=\s*['"]([^'"]+)['"]/i)?.[1];
  if (url !== 'https://linswmnnkjxvweumprav.supabase.co' || !key) throw Error('Canonical public client configuration unavailable');
  const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  if (claims.role !== 'anon') throw Error('This audit requires the existing anonymous public client');
  return { url, key };
}

async function publicRows(table, select, filter, config) {
  const rows = [], seen = new Set(); let cursor = null, exactCount = null;
  for (;;) {
    const url = new URL(config.url + '/rest/v1/' + table);
    url.searchParams.set('select', select); url.searchParams.set('order', 'id.asc'); url.searchParams.set('limit', '100');
    for (const [key, value] of Object.entries(filter)) url.searchParams.set(key, value);
    if (cursor != null) url.searchParams.set('id', 'gt.' + cursor);
    const response = await fetch(url, { headers: { apikey: config.key, Authorization: 'Bearer ' + config.key, Prefer: 'count=exact' }, signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw Error(`Public ${table} read failed: HTTP ${response.status}`);
    if (cursor == null) exactCount = Number(response.headers.get('content-range')?.split('/')[1]);
    const page = await response.json(); if (!Array.isArray(page)) throw Error('Unexpected public response shape');
    for (const row of page) { if (seen.has(String(row.id))) throw Error('Duplicate public ID during pagination'); seen.add(String(row.id)); rows.push(row); }
    if (!page.length || page.length < 100) break;
    const next = page.at(-1).id; if (String(next) === String(cursor)) throw Error('Pagination did not advance'); cursor = next;
    console.log(JSON.stringify({ stage: 'anonymous_read', table, rows: rows.length }));
  }
  if (Number.isFinite(exactCount) && rows.length !== exactCount) throw Error(`${table} changed during pagination; retry rather than publishing a partial inventory`);
  return rows;
}

// Runs inside an empty, local browser document. Source HTML remains detached;
// scripts/media are never mounted. Exact occurrence parsing comes from the live
// Post reader, not from a second gematria/parser implementation.
export async function analyzePostBatch(posts) {
  const { reading, series, background, character, depth, cards } = window.__postAudit;
  const result = [];
  const text = node => node.textContent.replace(/\s+/g, ' ').trim();
  const visible = node => !node.closest('script,style,template,pre,code,[hidden],[aria-hidden="true"]');
  for (const post of posts) {
    if (!reading.isPublicPostMeasureSource(post)) continue;
    const source = document.createElement('div'); source.innerHTML = String(post.content || '');
    const legacy = await reading.collectPostLegacyOccurrences2029(post, source);
    const saved = reading.collectPostCalculationOccurrences2029(post, source);
    const claims = [...saved, ...legacy].map(claim => ({ ...claim, auditState: claim.method && claim.value != null && claim.locator ? 'documented_tuple_not_engine_checked' : 'incomplete_source_context' }));
    const all = [...source.querySelectorAll('*')].filter(visible);
    const paragraphs = all.filter(node => node.matches('p'));
    const headings = all.filter(node => node.matches('h1,h2,h3,h4,h5,h6'));
    const idCounts = new Map(); for (const node of all.filter(n => n.id)) idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1);
    const alignedCenter = node => node.getAttribute('align') === 'center' || /text-align\s*:\s*center/i.test(node.getAttribute('style') || '');
    const smallInline = all.filter(node => { const m = node.getAttribute('style')?.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i); return m && Number(m[1]) < 14 && text(node); });
    const anchors = all.filter(node => node.matches('a[href]')).map((node, ordinal) => ({ ordinal, href: node.getAttribute('href'), text: text(node).slice(0,180), locator: node.id ? '#' + node.id : node.closest('[id]')?.id ? '#' + node.closest('[id]').id : null, binding: 'authored_hyperlink_not_graph_edge' }));
    const placements = reading.collectPostSourcePlacements2029(post, source);
    const media = all.filter(node => node.matches('img,video,audio,iframe')).map((node, ordinal) => ({ ordinal, kind: node.localName, ref: node.getAttribute('data-source-ref') || node.getAttribute('data-media-id') || node.getAttribute('src') || node.querySelector('source')?.getAttribute('src') || null, locator: node.id ? '#' + node.id : node.closest('[id]')?.id ? '#' + node.closest('[id]').id : null, hasAlt: node.localName === 'img' ? Boolean(node.getAttribute('alt')?.trim()) : null }));
    const keys = series.contentSeriesKeysForPost(post), backdrop = background.postBackground2029(post);
    const mismatchedSeries = series.CONTENT_SERIES_2029.filter(spec => series.hasExactMembership(post, spec) && spec.exactAuthor && post.author !== spec.exactAuthor).map(spec => ({ key: spec.key, expectedAuthor: spec.exactAuthor, actualAuthor: post.author || null, state: 'review_only_not_membership' }));
    const numericTags = reading.postMeasureNumbers(post);
    // Exercise the existing card consumer over a complete anonymous snapshot.
    // Snapshot lookups are NOT claimed as new network revalidation per Post.
    const snapshotClient = { from(table) {
      const filters = []; let numbers = null, bounds = null;
      const query = { select(){ return query; }, eq(k,v){ filters.push([k,v]); return query; }, overlaps(k,v){ numbers=v; return query; }, order(){ return query; }, range(a,b){ bounds=[a,b]; return query; }, limit(n){ bounds=[0,n-1]; return query; }, then(resolve,reject){
        let values = table === 'posts' ? [post] : cards;
        values = values.filter(row => filters.every(([k,v]) => String(row[k]) === String(v)) && (!numbers || row.numbers?.some(n => numbers.includes(Number(n)))));
        values = [...values].sort((a,b) => Number(a.id)-Number(b.id)); if(bounds) values=values.slice(bounds[0],bounds[1]+1);
        return Promise.resolve({data:values,error:null}).then(resolve,reject);
      } }; return query;
    } };
    const related = []; let offset = 0, cardState = numericTags.length ? 'ready' : 'not_tested';
    if (numericTags.length) for (;;) {
      const page = await reading.readPostConvergencePage2029(post, { client:snapshotClient, offset, pageSize:16 });
      if(page.status !== 'ready') { cardState=page.status; break; }
      related.push(...page.cards); if(!page.hasMore) break; offset=page.nextOffset;
    }
    for (const claim of claims) {
      if(claim.auditState !== 'documented_tuple_not_engine_checked') { claim.engineCheck={status:'incomplete_claim',resultMatch:'not_tested',steps:'not_tested'}; continue; }
      let profile=null;
      const check=await reading.checkPostCalculation2029(post,claim,{client:snapshotClient,profileReader:async expression=>{profile=await window.postAuditReadProfile(expression);return profile;},sourceDocument:document,checkSteps:false});
      const methodResolved=profile?.some(row=>row.methodKey===claim.method||row.displayLabel===claim.method);
      claim.engineCheck={status:check.status,resultMatch:check.resultMatch||'not_tested',reason:check.resultMatch==='mismatch'&&!methodResolved?'source_method_unresolved':null,steps:check.steps||'not_tested',canonicalMethod:check.focus?.method||null,currentCanonicalVersion:check.methodVersion||null,sourceMethodVersion:claim.methodVersion};
    }
    const boxes = all.filter(node => node.matches('.sod-gematria-box')).length;
    const equalityBlocks = all.filter(node => node.matches('p,li,td,h2,h3,h4,.gb-rows>div') && !node.querySelector('p,li,td,h2,h3,h4') && /[א-ת]/.test(text(node)) && /=/.test(text(node)) && /\d/.test(text(node))).map((node, ordinal) => ({ ordinal, text: text(node).slice(0,300), nativeId: node.id || null, state: 'equality_text_candidate_not_decoded_claim' }));
    const findings = [];
    if(mismatchedSeries.length) findings.push('series_author_review');
    if(keys.length > 1) findings.push('ambiguous_series');
    if(claims.some(c => c.auditState === 'incomplete_source_context')) findings.push('incomplete_calculation_context');
    if(claims.some(c => c.engineCheck.resultMatch==='mismatch')) findings.push('calculation_method_or_value_mismatch');
    if(claims.some(c => c.engineCheck.resultMatch==='failed')) findings.push('calculation_read_failed');
    if(equalityBlocks.length && !claims.length) findings.push('equality_text_without_saved_claims');
    if(headings.some(alignedCenter)) findings.push('authored_centered_subheading_review');
    if(paragraphs.some(p => alignedCenter(p) && text(p).length >= 160)) findings.push('authored_long_centered_prose');
    if(smallInline.length) findings.push('authored_small_text_review');
    if([...idCounts.values()].some(n => n > 1)) findings.push('duplicate_native_ids');
    if(media.some(m => m.kind === 'img' && !m.hasAlt)) findings.push('image_alt_review');
    if(media.some(m => m.kind === 'img') && !claims.length) findings.push('image_research_not_decoded');
    if(boxes && character.postCharacterFor(post) === 'plain') findings.push('plain_character_gematria_box_style_review');
    const cover = post.image_url || null;
    if(cover && media.some(m => m.kind==='img' && m.ref===cover)) findings.push('cover_repeated_in_body');
    const sixAxes = depth.projectCoverageChecks({
      calculations:{state:claims.length || equalityBlocks.length ? 'partial':'not_found',scope:'סימונים שמורים וטקסטי שוויון בגוף HTML. הופעה עם ביטוי, שיטה, ערך ומיקום נבדקה בקורא הקיים מול פרופיל המנוע הציבורי.',missing:'לא בוצע פענוח סמנטי של כלל המלל או OCR; צעדי חישוב לא נבדקו. התאמת תוצאה אינה אימות של הפוסט או הפרשנות.'},
      links:{state:'not_tested',scope:'נרשמו קישורי HTML בלבד.',missing:'לא בוצעה סריקת adjacency קנונית לכל פוסט; קישור או מספר משותף אינם edge.'},
      convergence:{state:cardState==='not_tested'?'not_tested':cardState!=='ready'?'failed':related.length?'partial':'not_found',scope:'הקורא הקיים מול תמונת מצב אנונימית מלאה של כרטיסים מאושרים, דרך תגיות מספריות בלבד.',missing:'לא נבדקו כל מסלולי הקשר האפשריים; אין בחירת ציון מרבי ואין ציון לפוסט.'},
      independence:{state:'partial',scope:'גוף ותגיות באותה קבוצת מקור; מיפוי הפניות מדיה מדויקות וכל ההופעות.',missing:'העתקות עם כתובת/מזהה שונה, תוכן חזותי ועצמאות מקורות חיצוניים דורשים בדיקה.'},
      editor:{state:'not_tested',scope:'נשמרו דירוגי הכרטיסים כנתונים של הכרטיס בלבד.',missing:'לא בוצעה קריאת אצירת זהב/יהלום לפוסט; אין ירושת איכות מכרטיס.'},
      approval:{state:'partial',scope:'הפוסט עבר את גבול התוכן הציבורי הקיים בקריאה אנונימית.',missing:'פרסום המקור אינו אישור לטענות, לפרשנות או לקשרים שבתוכו.'},
    });
    result.push({ id:post.id,slug:post.slug,title:post.title,author:post.author||null,categories:post.categories||[],tags:post.tags||[],source:post.source||null,publishedAt:post.date||null,ingestedAt:post.created_at||null,modifiedAt:post.modified||null,
      series:keys,seriesReview:mismatchedSeries,background:backdrop.key,backgroundReason:backdrop.reason,character:character.postCharacterFor(post),numericTags,
      structure:{bodyCharacters:text(source).length,paragraphs:paragraphs.length,headings:headings.length,nativeIds:idCounts.size,duplicateIds:[...idCounts].filter(([,n])=>n>1).map(([id,count])=>({id,count})),centeredSubheadings:headings.filter(alignedCenter).length,longCenteredParagraphs:paragraphs.filter(p=>alignedCenter(p)&&text(p).length>=160).length,smallInlineText:smallInline.length,gematriaBoxes:boxes},
      cover,media,links:anchors,sourcePlacements:placements,sourceGroups:depth.sourceGroups(placements),claims,equalityTextCandidates:equalityBlocks,convergenceCards:related,cardReadState:cardState,coverage:sixAxes,reviewFlags:findings });
  }
  return result;
}

export async function runAudit(output) {
  mkdirSync(output,{recursive:true}); const startedAt=new Date().toISOString(); const config=publicConfiguration();
  const posts=await publicRows('posts','id,slug,title,content,categories,tags,author,source,home_hidden,date,modified,created_at,image_url,images',{
    and:'(or(home_hidden.is.null,home_hidden.eq.false),or(tags.is.null,tags.not.ov.{טיוטה,פורום}),or(source.is.null,and(source.not.ilike.gpt-draft,source.not.ilike.web)))',slug:'not.is.null',
  },config);
  const admitted=posts.filter(isPublicPostMeasureSource);
  const fetchedCards=await publicRows('topic_cards_public','id,slug,title,numbers,status,quality,meter_score,findings',{status:'eq.approved'},config);
  const cards=fetchedCards.filter(row=>row?.id!=null&&row.slug?.trim()&&row.status==='approved'&&!projectTopicCardContent(row.findings).flags.doNotPublish);
  const publicClient=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:registryRows,error:registryError}=await publicClient.from('gematria_methods').select('method_key,db_column,display_label,category,sub,soul,sort_order,mathematical_family,execution_kind,operator,derived_from,source_of_truth,dependency_rules,dependency_version');
  if(registryError)throw Error('Public canonical method registry could not be read');
  const profileReads=new Map();
  const playwrightRequire=createRequire(process.env.POST_AUDIT_PLAYWRIGHT_PACKAGE || resolve(root,'package.json'));
  const {chromium}=playwrightRequire('playwright');
  const server=await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'offline-post-audit',configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url!=='/__post-audit__')return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="he" dir="rtl"><title>Offline Post audit</title><body></body></html>');});}}]});
  await server.listen(); const address=server.httpServer.address(),origin='http://127.0.0.1:'+address.port;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const rows=[]; const blocked=[];
  try{
    const page=await browser.newPage();
    await page.exposeFunction('postAuditReadProfile',expression=>{
      if(typeof expression!=='string'||!expression.trim()||expression.length>4096)throw Error('Invalid source expression');
      if(!profileReads.has(expression))profileReads.set(expression,fetchNumberMethodProfile(expression,{client:publicClient,registryRows}));
      return profileReads.get(expression);
    });
    await page.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();blocked.push({host:new URL(request.url()).hostname,method:request.method()});return route.abort();});
    if(page.routeWebSocket)await page.routeWebSocket('**/*',socket=>socket.close());
    await page.goto(origin+'/__post-audit__');
    await page.evaluate(async cards=>{window.__postAudit={cards,reading:await import('/src/lib/research/post2029ReadingProjection.js'),series:await import('/src/lib/research/contentSeries2029Identity.js'),background:await import('/src/lib/research/postBackground2029.js'),character:await import('/src/lib/postCharacters2029.js'),depth:await import('/src/lib/research/contextDepthProjection2029.js')};},cards);
    for(let start=0;start<admitted.length;start+=50){rows.push(...await page.evaluate(analyzePostBatch,admitted.slice(start,start+50)));console.log(JSON.stringify({stage:'existing_readers',posts:rows.length,total:admitted.length}));}
  }finally{await browser.close();await server.close();}
  if(rows.length!==admitted.length)throw Error('Incomplete source mapping');
  const sourceById=new Map(admitted.map(p=>[p.id,p]));
  for(const row of rows){row.sourceContentSha256=digest(sourceById.get(row.id).content||'');row.sourceContentMd5=createHash('md5').update(sourceById.get(row.id).content||'').digest('hex');}
  const countBy=(items,getKey)=>{const values={};for(const item of items)for(const key of [].concat(getKey(item)||[]))values[key]=(values[key]||0)+1;return Object.fromEntries(Object.entries(values).sort((a,b)=>b[1]-a[1]));};
  const artifacts=new Map();
  for(const row of rows)for(const placement of row.sourcePlacements.filter(p=>p.kind==='image')){const key=placement.artifactRef;if(!artifacts.has(key))artifacts.set(key,[]);artifacts.get(key).push({postId:row.id,slug:row.slug,...placement.occurrence});}
  const repeatedArtifacts=[...artifacts].filter(([,placements])=>new Set(placements.map(p=>p.postId)).size>1).map(([artifactRef,placements])=>({artifactRef,placements,dependency:'same_exact_reference_not_independent_evidence'}));
  const summary={posts:rows.length,sourceBytes:admitted.reduce((n,p)=>n+Buffer.byteLength(p.content||''),0),approvedPublicCardsRead:cards.length,series:countBy(rows,r=>r.series.length?r.series:['general']),backgrounds:countBy(rows,r=>r.background),characters:countBy(rows,r=>r.character),authors:countBy(rows,r=>r.author||'ללא מחבר מתועד'),categories:countBy(rows,r=>r.categories),reviewFlags:countBy(rows,r=>r.reviewFlags),claims:rows.reduce((n,r)=>n+r.claims.length,0),claimsWithDocumentedTuple:rows.flatMap(r=>r.claims).filter(c=>c.auditState==='documented_tuple_not_engine_checked').length,engineResults:countBy(rows.flatMap(r=>r.claims),c=>c.engineCheck.resultMatch),distinctProfileReads:profileReads.size,postsWithClaims:rows.filter(r=>r.claims.length).length,postsWithEqualityTextCandidates:rows.filter(r=>r.equalityTextCandidates.length).length,postsWithConvergenceCards:rows.filter(r=>r.convergenceCards.length).length,distinctRepeatedArtifactRefs:repeatedArtifacts.length};
  const audit={status:'PUBLIC_CORPUS_STRUCTURAL_MAPPING_COMPLETE_RESEARCH_ACCEPTANCE_OPEN',startedAt,completedAt:new Date().toISOString(),branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),base:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),publicBoundary:'Anonymous RLS + existing isPublicPostMeasureSource and card doNotPublish gate before counts; no private/suppressed counts or titles emitted',sourceWitness:'Per-Post content SHA256/MD5 and modified timestamp; inventory is a dated audit, never a runtime source registry',scope:'All admitted public Post HTML, explicit saved calculation occurrences, exact memberships, media references and public approved cards through the existing indirect-number reader. Qualified saved tuples use existing checkPostCalculation2029 + canonical public profile/registry against the fetched source snapshot. No trace/OCR or full canonical graph sweep.',summary,blockedBrowserRequests:{count:blocked.length,byHost:countBy(blocked,r=>r.host),transport:'All non-local browser requests aborted before transport; anonymous data/profile reads were made separately by Node.'},readings:{convergence:'Belongs to the matched card; source topic_cards_public; shared numeric tag path is indirect; no maximum selection.',quality:'Quality remains on each returned card; missing stays null; no Post rating or gold/diamond is inferred.',coverage:'Six separate check states with scope/missing per Post; row presence never means full coverage.',calculation:'Explicit saved annotation/legacy marking only; original expression/method/value/version/locator retained. Profile result parity is separate from untested trace steps and interpretation; missing source method versions stay missing.'},limits:['Private/draft/forum/admin corpus is excluded, not counted.','Every admitted public body was parsed structurally; this is not a visual, semantic, image/video/OCR or engine acceptance of every Post.','Canonical profile checks only cover complete explicit saved tuples; source revalidation inside the audit consumer uses the fetched snapshot. A separate live digest before/after is required in the final receipt.','Links are source hyperlinks and indirect card matches, not newly admitted graph edges.','Exact repeated artifact references are grouped; copies with different URLs/IDs and all external-source independence remain open.','No native source ID is invented; snapshot-bound anchors are explicitly labelled.','Full canonical graph adjacency and curated Post Gold/Diamond were not read.','Publication, ingestion and modification dates are distinct; no event time is assigned to gematria.'],posts:rows,repeatedArtifacts};
  writeFileSync(resolve(output,'posts-map.json'),JSON.stringify(audit,null,2)+'\n');
  const postCsv=rows.map(r=>({id:r.id,title:r.title,slug:r.slug,author:r.author,series:r.series.join(' | ')||'כללי',background:r.background,character:r.character,published_at:r.publishedAt,ingested_at:r.ingestedAt,modified_at:r.modifiedAt,categories:r.categories.join(' | '),numeric_tags:r.numericTags.join(' | '),paragraphs:r.structure.paragraphs,headings:r.structure.headings,saved_claims:r.claims.length,documented_tuples:r.claims.filter(c=>c.auditState==='documented_tuple_not_engine_checked').length,equality_text_candidates:r.equalityTextCandidates.length,images:r.media.filter(m=>m.kind==='img').length,authored_links:r.links.length,indirect_convergence_cards:r.convergenceCards.length,review_flags:r.reviewFlags.join(' | '),content_sha256:r.sourceContentSha256}));
  writeFileSync(resolve(output,'posts-map.csv'),csv(postCsv,Object.keys(postCsv[0]||{})));
  const claims=rows.flatMap(r=>r.claims.map(c=>({post_id:r.id,post_slug:r.slug,post_title:r.title,expression:c.expression,source_method:c.method,source_method_version:c.methodVersion,value:c.value,locator:c.locator,locator_precision:c.locatorPrecision,binding:c.binding,source_version:c.sourceVersion,state:c.auditState,engine_check:c.engineCheck.resultMatch,canonical_method:c.engineCheck.canonicalMethod,canonical_method_version:c.engineCheck.currentCanonicalVersion,steps_check:c.engineCheck.steps})));
  writeFileSync(resolve(output,'calculation-occurrences.csv'),csv(claims,['post_id','post_slug','post_title','expression','source_method','source_method_version','value','locator','locator_precision','binding','source_version','state','engine_check','canonical_method','canonical_method_version','steps_check']));
  const coverage=rows.flatMap(r=>r.coverage.map(c=>({post_id:r.id,post_slug:r.slug,dimension:c.key,label:c.label,state:c.state,scope:c.scope,missing:c.missing})));
  writeFileSync(resolve(output,'coverage-checks.csv'),csv(coverage,['post_id','post_slug','dimension','label','state','scope','missing']));
  writeFileSync(resolve(output,'summary.json'),JSON.stringify({...audit,posts:undefined,repeatedArtifacts:undefined},null,2)+'\n');
  writeAuditReports(audit,output);
  console.log(JSON.stringify({stage:'complete',output,summary})); return audit;
}

const SERIES_LABELS={general:'כללי — ללא שיוך מאושר לסדרה', 'dimension-five':'מימד חמש','sod-hashmal':'סוד החשמל','mah-kore-habora':'מה קורה הבורא'};
const REVIEW_LABELS={incomplete_calculation_context:'חישוב עם תיעוד חסר',calculation_method_or_value_mismatch:'שיטה או ערך שלא הותאמו למנוע',calculation_read_failed:'קריאת חישוב נכשלה',series_author_review:'שיוך סדרה דורש בדיקה',ambiguous_series:'כמה סדרות אפשריות',equality_text_without_saved_claims:'טקסט שוויון ללא סימון חישוב שמור',authored_centered_subheading_review:'כותרת ביניים ממורכזת במקור',authored_long_centered_prose:'פסקה ארוכה ממורכזת במקור',authored_small_text_review:'טקסט קטן מ־14px במקור',duplicate_native_ids:'מזהי מקטע כפולים במקור',image_alt_review:'תמונה ללא תיאור alt',image_research_not_decoded:'מחקר שבתמונה לא פוענח',plain_character_gematria_box_style_review:'תיבת גימטריה מחוץ לעיצוב המהודר',cover_repeated_in_body:'תמונת שער חוזרת בגוף המקור'};

export function writeAuditReports(audit,output){
  const s=audit.summary,claims=audit.posts.flatMap(row=>row.claims),unresolved=claims.filter(c=>c.engineCheck.reason==='source_method_unresolved').length;
  const md=['# מיפוי הפוסטים הציבוריים — 31.10.2026','',`נסרקו **${s.posts.toLocaleString('he-IL')} פוסטים ציבוריים** בגבול הקורא הקיים, בקריאה אנונימית. זהו מיפוי מבני מלא של הרשומות שהותרו לקריאה, ולא קבלה מחקרית או חזותית של כל הפוסטים.`,'','## החלטת היישור שאושרה','', 'כותרת הפוסט הראשית במרכז; כותרות ביניים ופסקאות לימין; כותרת תיבת גימטריה ושוויונות במרכז. ציטוט קצר או יצירה עם שורות קצרות יכולים לשמור על מרכוז מכוון. טור הקריאה עצמו ממורכז. האישור תועד בחוזה העיצוב הקיים; לא שוכתב HTML שמור ולא בוצעה המרה גורפת של כל מקור.','','## סדרות ורקעים','','| שיוך מאושר נוכחי | פוסטים |','|---|---:|',...Object.entries(s.backgrounds).map(([key,n])=>`| ${SERIES_LABELS[key]||key} | ${n} |`),'','הרקע הכללי הוא ברירת מחדל תקינה. שיוך לסדרה נלקח מהבעלים הקיים בלבד, כולל תנאי המחבר. קטגוריה, נושא, ערוץ, אופי עיצובי וסדרה נשארים דברים נפרדים. הרקעים המאוירים הנוכחיים פעילים בערכת לילה.','','## חישובים וקשרים','',`- ${s.postsWithEqualityTextCandidates} פוסטים מכילים טקסטים שנראים כשוויונות; זו רשימת מועמדים לפענוח, לא טענות חישוב מאומתות.`,`- ${s.postsWithClaims} פוסטים מכילים ${s.claims} הופעות חישוב שנקראו מהסימונים השמורים הקיימים.`,`- ב־${s.claimsWithDocumentedTuple} הופעות התקבלו ביטוי, תיאור שיטה, ערך ומיקום. ${s.engineResults.matched||0} תוצאות תאמו לפרופיל המנוע הקנוני.`,`- ${unresolved} הופעות לא נפתחו עם שיטה מזוהה: תיאורי סוגריים כגון „= שחקן 067” נקראו בידי מתאם הלגאסי כמועמדי שיטה ונחסמו בהכרעה הקנונית. אין כאן הוכחה לארבע שגיאות חשבון.`,`- ${s.engineResults.not_tested||0} הופעות נותרו ללא בדיקת מנוע בגלל תיעוד חסר. צעדי החישוב לא נבדקו גם כאשר התוצאה תאמה.`,`- ${s.postsWithConvergenceCards} פוסטים מצאו כרטיסים מאושרים במסלול התגית המספרית הקיים. החיבור עקיף; הציון והאיכות נשארים על הכרטיס. אין ציון לפוסט, בחירת ציון מרבי או יצירת edge.`,`- ${s.distinctRepeatedArtifactRefs} הפניות מדיה מדויקות מופיעות ביותר מפוסט אחד. כל ההופעות נשמרו; החזרה אינה יוצרת ראיה עצמאית.`,'','## רשימות בדיקה','','| סימון לבדיקה | פוסטים |','|---|---:|',...Object.entries(s.reviewFlags).map(([key,n])=>`| ${REVIEW_LABELS[key]||key} | ${n} |`),'','הסימונים על מרכוז, גודל, תמונת שער ו־alt מתארים את HTML המקור. ה־CSS הקיים עשוי כבר לנרמל או להסתיר חלק מהם; אין להסיק שכל הסימונים הם תקלות שנראות כעת בפריוויו. אין לשנות אוטומטית שירים, ציטוטים או קטגוריות מתוך הרשימה.','','## סדר עבודה מבודד להמשך','','1. לבדוק את עשרים הפוסטים עם סימונים שמורים: להשלים מקור/שיטה/ערך/מיקום במקום שניתן, ולחדד את פענוח תיאורי הסוגריים בלי לנחש שיטה.','2. להשוות את שלושים הפוסטים עם תיבת גימטריה מחוץ לאופי העיצובי המהודר; לתקן דרך רכיב/סגנון הפוסטים הקיים ולא באמצעות רשימת מזהים חדשה.','3. לעבור על טקסטי השוויונות ללא סימונים, לפי מקור ומקטע. פענוח מתמונה/וידאו דורש בדיקת מקור נפרדת.','4. לבדוק את עשרת שיוכי הסדרה המסומנים, דרך בעל הסיווג. אין להמציא סדרה או לשנות קטגוריות עולם.','5. לבצע קבלה חזותית לפי משפחות תוכן ולבדוק מעבר מממצא למספר וחזרה. קבלת כללי ההרשאה, הגרף ואצירת זהב/יהלום נשארת תחת הבעלים הקיימים.','','## מה נבדק ומה נשאר פתוח','','לכל פוסט יש שש שורות בדיקה נפרדות בקובץ coverage-checks.csv, כולל היקף וחוסרים. סריקת adjacency קנונית של כל הגרף, פענוח התמונות/הווידאו, אצירת זהב/יהלום, עצמאות מקורות עם מזהים שונים ובדיקה חזותית של כל פוסט לא בוצעו. תאריך פרסום, קליטה ושינוי נשמרו בנפרד; לא הומצא זמן אירוע לחישוב.','','הקבצים הם תמונת מצב לביקורת בלבד. הם אינם מקור נתונים למסך, מאגר מחקר, רשימת חברויות חדשה או מנוע. אין כתיבה למוצר, שינוי מעטפת/סרגלים/עולם/גלריות/אזור אישי, מיזוג ל־main או שינוי בייצור.','','## קבצים','','- posts-map.csv — שורה לכל פוסט.','- calculation-occurrences.csv — ביטוי, שיטה כפי שנכתבה, ערך, מיקום ותוצאת הבדיקה לכל הופעה שנקראה.','- coverage-checks.csv — שש בדיקות נפרדות לכל פוסט.','- posts-map.json — המיפוי המפורט, ההפניות וההופעות התלויות.','- posts-map.html — טבלה מקומית לחיפוש וסינון, ללא קריאות רשת.',''];
  writeFileSync(resolve(output,'REPORT.he.md'),md.join('\n'));
  const data=audit.posts.map(r=>({id:r.id,title:r.title,slug:r.slug,series:r.background,author:r.author||'לא מתועד בשדה המחבר',claims:r.claims.length,matched:r.claims.filter(c=>c.engineCheck.resultMatch==='matched').length,flags:r.reviewFlags}));
  const safeJson=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const html=`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מיפוי הפוסטים — 31.10.2026</title><style>body{font-family:Arial,sans-serif;margin:auto;padding:24px;max-width:1300px;line-height:1.6;color:#202126;background:#f7f4ed}h1{text-align:center;font-size:28px}p{max-width:90ch}label{display:inline-flex;flex-direction:column;gap:4px;margin:6px}input,select,button{font:inherit;min-height:44px;padding:6px 10px;border:1px solid #8b8981;border-radius:6px;background:white;color:inherit}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:right;padding:10px;border-bottom:1px solid #dad7d0;vertical-align:top}th{background:#e9e2d2}.table{overflow:auto}small{font-size:14px}.controls{display:flex;flex-wrap:wrap;align-items:end}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #2856a8}footer{margin:20px 0}</style><h1>מיפוי הפוסטים הציבוריים</h1><p><b>${s.posts.toLocaleString('he-IL')} פוסטים · ${s.postsWithClaims} עם סימוני חישוב שמורים · ${s.engineResults.matched||0} תוצאות תואמות למנוע · ${unresolved} תיאורי שיטה שלא זוהו</b></p><p>מיפוי מבני של כל הפוסטים הציבוריים שנקראו. שוויון בטקסט, מספר משותף וקישור אינם הוכחה או edge. התאמת תוצאה אינה אימות צעדים או פרשנות. סימוני העיצוב מתייחסים ל־HTML המקור; חלקם כבר מנורמלים בתצוגה.</p><p>החלטת היישור המאושרת: כותרת ראשית במרכז; כותרות ביניים ופסקאות לימין; גימטריה ושוויונות במרכז. ציטוטים קצרים ושירים יכולים לשמור על מרכוז מכוון.</p><div class="controls"><label>חיפוש<input id="search" type="search" placeholder="כותרת, מזהה או מחבר"></label><label>סדרה / רקע<select id="series"><option value="">הכול</option></select></label><label>סימון לבדיקה<select id="flag"><option value="">הכול</option></select></label><button id="clear">ניקוי</button></div><p id="status" aria-live="polite"></p><div class="table"><table><thead><tr><th>מזהה</th><th>פוסט</th><th>סדרה / רקע</th><th>סימוני חישוב</th><th>לבדיקה</th></tr></thead><tbody id="rows"></tbody></table></div><footer><button id="previous">הקודם</button> <button id="next">הבא</button><p>הטבלה מקומית ואינה מפעילה מנוע או קריאות רשת. פירוט מקור, מיקום, שש בדיקות הכיסוי ותוצאות המנוע נמצא בקובצי ה־CSV/JSON המצורפים.</p></footer><script>const data=${safeJson(data)},seriesNames=${safeJson(SERIES_LABELS)},flagNames=${safeJson(REVIEW_LABELS)};let page=0;const size=50,byId=id=>document.getElementById(id);for(const [key,label]of Object.entries(seriesNames)){const option=new Option(label,key);byId('series').add(option)}for(const [key,label]of Object.entries(flagNames)){const option=new Option(label,key);byId('flag').add(option)}function draw(){const term=byId('search').value.trim().toLocaleLowerCase(),series=byId('series').value,flag=byId('flag').value;const found=data.filter(r=>(!term||[r.id,r.title,r.slug,r.author].join(' ').toLocaleLowerCase().includes(term))&&(!series||r.series===series)&&(!flag||r.flags.includes(flag)));page=Math.min(page,Math.max(0,Math.ceil(found.length/size)-1));const body=byId('rows');body.replaceChildren();for(const r of found.slice(page*size,(page+1)*size)){const row=document.createElement('tr');for(const value of [r.id,r.title,seriesNames[r.series]||r.series,r.claims+' (תואמים: '+r.matched+')',r.flags.map(f=>flagNames[f]||f).join(' · ')||'לא סומן בבדיקה המבנית']){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}body.append(row)}byId('status').textContent=found.length+' פוסטים · עמוד '+(page+1)+' מתוך '+Math.max(1,Math.ceil(found.length/size));byId('previous').disabled=page===0;byId('next').disabled=(page+1)*size>=found.length}for(const id of ['search','series','flag'])byId(id).addEventListener('input',()=>{page=0;draw()});byId('previous').onclick=()=>{page--;draw()};byId('next').onclick=()=>{page++;draw()};byId('clear').onclick=()=>{for(const id of ['search','series','flag'])byId(id).value='';page=0;draw()};draw();</script></html>`;
  writeFileSync(resolve(output,'posts-map.html'),html);
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const output=resolve(process.argv[2]||'/workspace/shared/downloads/posts-full-map-20261031');
  await runAudit(output);
}
