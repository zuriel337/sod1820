// Offline audit SQL composer. No database credentials or execution path.
// Reuse the exact staged cohort SELECTs; never execute migration bodies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { extractCompoundClaims, verifyCandidate, computeExtractionIntegrity } from '../src/lib/triage.js';
import { METHODS } from '../src/lib/gematria.js';
import { extractCandidates } from '../src/lib/analysisFlow.js';
import { verifyWorldConstantStatement } from '../src/lib/research/worldLegacyReplayProjection.js';

export const COHORT_FILES = [
  ['20261026121500_zvi_safe_auto_tree_promotion_v2.sql', '_zvi_safe_auto_promotion_v2'],
  ['20261026121011_zvi_context_number_auto_tree_promotion_v3.sql', '_zvi_context_reviewed_v3'],
  ['20261026121450_zvi_structured_value_auto_tree_promotion_v4.sql', '_zvi_structured_value_reviewed_v4'],
  ['20261026131528_zvi_explicit_match_auto_tree_promotion_v5.sql', '_zvi_explicit_match_reviewed_v5'],
];
const FIXED_FILES = [
  ['20261026132133_zvi_deterministic_regular_auto_tree_promotion_v6.sql', '_zvi_deterministic_selected_v6', '_zvi_deterministic_ready_v6'],
  ['20261026134034_zvi_deterministic_terms_auto_tree_promotion_v7.sql', '_zvi_deterministic_selected_v7', '_zvi_deterministic_ready_v7'],
];
const readMigration = (file) => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');

export function assessReplay(row) {
  const plainHebrew = /^[א-ת]+(?: [א-ת]+)*$/u.test(row.phrase || '');
  const numericMatch = Number.isFinite(row.computed) && Number.isFinite(row.value)
    && row.computed === row.value && row.claimed === String(row.value);
  return {
    id: row.id,
    calculation: row.computed == null ? 'unavailable' : numericMatch ? 'match' : 'mismatch',
    inputScope: plainHebrew ? 'plain_hebrew' : 'requires_expression_parse',
    sourceTokensPresent: row.phrase_letters_in_source === true && row.value_in_source === true,
    // This is an overlap hint, not authorization to merge or count independence.
    overlap: row.same_exact_term_ids?.length ? 'same_source_value_and_term'
      : row.same_source_value_ids?.length ? 'same_source_value_only' : 'new_source_value_pair',
    automaticPromotion: false,
  };
}

export function assertReadOnly(sql) {
  if (!/^\s*(?:SELECT|WITH)\b/iu.test(sql)
      || /;|\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|LOCK|DO|PERFORM|SET|INTO|COPY|GRANT|REVOKE|CALL)\b/iu.test(sql)
      || /\b(?:admin_|project_contribution|upsert_|set_config|pg_sleep)/iu.test(sql)) {
    throw new Error('Audit must consist of one read-only SELECT');
  }
  return sql;
}

export function extractCohortSelect(migration, table) {
  const marker = `CREATE TEMP TABLE ${table}\n  ON COMMIT DROP\n  AS\n`;
  const start = migration.indexOf(marker);
  if (start < 0 || migration.indexOf(marker, start + marker.length) >= 0) throw new Error(`Missing or ambiguous cohort: ${table}`);
  const end = migration.indexOf(';', start + marker.length);
  if (end < 0) throw new Error('Unterminated cohort');
  return assertReadOnly(migration.slice(start + marker.length, end).trim());
}

export function buildResidualCtes() {
  const ctes = COHORT_FILES.map(([file, table], index) => `cohort_v${index + 2} AS (\n${extractCohortSelect(readMigration(file), table)}\n)`);
  for (const [index, [file, table]] of COHORT_FILES.entries()) {
    const v = index + 2;
    if (v === 2) continue;
    const readyTable = table.replace('_reviewed_', '_ready_');
    const query = extractCohortSelect(readMigration(file), readyTable).replaceAll(table, `cohort_v${v}`);
    ctes.push(`ready_v${v} AS (${query})`);
  }
  for (const [file, table, ready] of FIXED_FILES) {
    const migration = readMigration(file);
    const block = migration.match(new RegExp(`INSERT INTO ${table} \\(([^)]+)\\)\\s+VALUES([\\s\\S]*?);`, 'u'));
    if (!block) throw new Error(`Missing explicit batch: ${table}`);
    const columns = block[1].split(',').map((s) => s.trim());
    if (columns.some((s) => !/^[a-z_]+$/u.test(s))) throw new Error('Invalid column');
    // Only fixed UUID/integer tuples. Cast IDs explicitly for Postgres VALUES.
    if (!/^\s*(?:\('[0-9a-f-]{36}',[\d,\s]+\),?\s*)+$/u.test(block[2])) throw new Error('Invalid fixed cohort values');
    const values = block[2].replace(/'([0-9a-f-]{36})'/gu, "'$1'::uuid");
    ctes.push(`${table} (${columns.join(',')}) AS (VALUES ${values})`);
    ctes.push(`cohort_v${file.includes('_v6.') ? 6 : 7} AS (${extractCohortSelect(migration, ready)})`);
  }
  ctes.push(`reviewed AS (${[2,3,4,5,6,7].map((v) => `SELECT id, 'v${v}'::text AS batch FROM cohort_v${v}`).join(' UNION ALL ')})`);
  ctes.push(`prepared AS (
    SELECT id FROM cohort_v2 WHERE representative_rank=1
    UNION ALL SELECT id FROM ready_v3 WHERE representative_rank=1
    UNION ALL SELECT id FROM ready_v4 WHERE representative_rank=1
    UNION ALL SELECT id FROM ready_v5 WHERE representative_rank=1
    UNION ALL SELECT id FROM cohort_v6
    UNION ALL SELECT id FROM cohort_v7
  )`);
  ctes.push(`source_bound AS (
    SELECT ro.id,ro.status,ro.kind,ro.statement,ro.terms,ro.value,ro.engine_verified,
      ro.engine_detail,ro.meta,ro.source_ref,ro.promoted_node_id,
      cu.id AS source_id,cu.image_url,
      EXISTS (SELECT 1 FROM reviewed b WHERE b.id=ro.id) AS already_reviewed,
      EXISTS (SELECT 1 FROM prepared b WHERE b.id=ro.id) AS already_prepared
    FROM public.research_objects ro
    JOIN public.channel_updates cu ON split_part(ro.source_ref,'#',1)='channel_updates:'||cu.id::text
    WHERE ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}(#.*)?$'
      AND cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
      AND cu.status='live' AND cu.page_only IS FALSE AND cu.channel='torat-haremez'
      AND ro.privacy_scope='public'
  )`);
  ctes.push(`residual AS (
    SELECT * FROM source_bound WHERE status='approved' AND promoted_node_id IS NULL AND NOT already_reviewed
  )`);
  // Routing hints only: lexical signals never verify a claim, identity, or shape.
  ctes.push(`signals AS (
    SELECT r.*,
      coalesce(r.meta#>>'{ext,wa_channel_intake,media_ocr_pending}','false')='true'
        OR coalesce(r.meta#>>'{ext,wa_channel_intake,media_transcription_pending}','false')='true' AS media_pending,
      r.meta#>'{ext,spatial_research}' IS NOT NULL OR r.statement ~ '(מרחבי|מרחבית|קוביי?ה|פירמיד|פאון|תלת.ממד|צירים)' AS spatial_hint,
      r.meta#>'{ext,constant_research}' IS NOT NULL OR r.meta#>'{ext,constant_evaluation}' IS NOT NULL
        OR r.statement ~ '(π|פאי|אוילר)' AS constants_hint,
      r.statement ~ '(דילוג|צופן|צפנים|ELS)' AS els_hint,
      r.statement ~ '(אנגלית|ארמית|תעתיק|תרגום|שפות|לטינית)' AS language_hint,
      r.meta#>'{ext,gematria}' IS NOT NULL OR cardinality(coalesce(r.terms,'{}'))>0 AND r.value IS NOT NULL AS numeric_hint,
      r.statement ~ '[=×÷+]' AS formula_hint,
      coalesce(r.engine_detail->>'verification_state','') AS verification,
      nullif(btrim(r.image_url),'') IS NOT NULL AS has_image,
      (SELECT count(*) FROM public.nodes n WHERE n.type='number' AND n.label=r.value::text
        AND n.is_active IS TRUE AND coalesce(n.metadata->>'space','core')='core') AS target_count
    FROM residual r
  )`);
  ctes.push(`classified AS (
    SELECT s.*,
      CASE WHEN media_pending THEN 'media_ocr'
        WHEN els_hint THEN 'els'
        WHEN constants_hint THEN 'constants'
        WHEN spatial_hint THEN 'spatial'
        WHEN language_hint THEN 'language'
        WHEN numeric_hint THEN 'gematria'
        WHEN formula_hint THEN 'formula'
        ELSE 'text_insight' END AS lane,
      CASE WHEN verification IN ('mismatch','conflict','partial') THEN 'conflicting_or_partial'
        WHEN media_pending THEN 'media_pending'
        WHEN kind IN ('hypothesis','question') THEN 'interpretation_or_question'
        WHEN value IS NULL THEN 'no_structured_value'
        WHEN target_count<>1 THEN 'target_not_unique_or_missing'
        ELSE 'needs_source_bounded_replay' END AS next_step,
      -- Exact same source locus AND full claim payload only. Same number is not dedup.
      md5(jsonb_build_array(source_ref,kind,statement,terms,value,engine_detail,meta)::text) AS exact_signature
    FROM signals s
  )`);
  ctes.push(`ranked AS (
    SELECT c.*,
      first_value(id) OVER (PARTITION BY exact_signature ORDER BY length(coalesce(statement,'')) DESC,id) AS representative_id,
      row_number() OVER (PARTITION BY exact_signature ORDER BY length(coalesce(statement,'')) DESC,id) AS duplicate_rank
    FROM classified c
  )`);
  return `WITH ${ctes.join(',\n')}`;
}

export function buildResidualAuditSql(mode = 'summary') {
  const ctes = buildResidualCtes();
  if (mode === 'replay') return assertReadOnly(`${ctes}, explicit_checks AS (
    SELECT r.id,r.source_id,r.source_ref,r.value,r.statement,
      r.engine_detail#>>'{verification,method}' method,
      r.engine_detail#>>'{verification,phrase}' phrase,
      public.fn_method_value(r.engine_detail#>>'{verification,method}',r.engine_detail#>>'{verification,phrase}') computed,
      r.engine_detail#>>'{verification,claimed}' claimed,
      position(regexp_replace(r.engine_detail#>>'{verification,phrase}','[^א-ת]','','g')
        in regexp_replace(cu.text,'[^א-ת]','','g'))>0 AS phrase_letters_in_source,
      coalesce(cu.text,'') ~ ('(^|[^0-9])'||r.value::text||'([^0-9]|$)') AS value_in_source,
      r.meta#>>'{ext,extraction_integrity,fidelity_status}' fidelity,
      ARRAY(SELECT covered.id FROM source_bound covered
        WHERE covered.source_id=r.source_id AND covered.value=r.value
          AND (covered.already_prepared OR covered.promoted_node_id IS NOT NULL)
        ORDER BY covered.id) AS same_source_value_ids,
      ARRAY(SELECT covered.id FROM source_bound covered
        WHERE covered.source_id=r.source_id AND covered.value=r.value
          AND (covered.already_prepared OR covered.promoted_node_id IS NOT NULL)
          AND (r.engine_detail#>>'{verification,phrase}'=ANY(covered.terms)
            OR r.engine_detail#>>'{verification,phrase}'=covered.engine_detail#>>'{verification,phrase}')
        ORDER BY covered.id) AS same_exact_term_ids,
      ARRAY(SELECT covered.id FROM source_bound covered
        WHERE covered.source_id=r.source_id AND covered.value=r.value
          AND (covered.already_prepared OR covered.promoted_node_id IS NOT NULL)
          AND position(r.engine_detail#>>'{verification,phrase}' in covered.statement)>0
        ORDER BY covered.id) AS phrase_in_representative_text_ids
    FROM ranked r JOIN public.channel_updates cu ON cu.id=r.source_id
    WHERE r.lane='gematria' AND r.next_step='needs_source_bounded_replay'
      AND jsonb_typeof(r.engine_detail->'verification')='object'
      AND cardinality(r.terms)=1
      AND r.terms[1]=r.engine_detail#>>'{verification,phrase}'
      AND nullif(r.engine_detail#>>'{verification,method}','') IS NOT NULL
  ) SELECT * FROM explicit_checks ORDER BY id`);
  let select;
  if (mode === 'rows') {
    select = `SELECT id,source_ref,source_id,kind,lane,next_step,value,verification,target_count,has_image,
      representative_id,duplicate_rank,statement,terms,engine_detail,meta FROM ranked ORDER BY lane,id`;
  } else if (mode === 'evidence') {
    select = `SELECT lane,next_step,count(*) AS rows,jsonb_agg(id ORDER BY id) AS ids FROM ranked GROUP BY lane,next_step ORDER BY lane,next_step`;
  } else if (mode === 'summary') {
    select = `SELECT jsonb_build_object(
      'source_bound_statuses',(SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) AS n FROM source_bound GROUP BY status) x),
      'reviewed_memberships',(SELECT count(*) FROM reviewed),
      'reviewed_unique_ids',(SELECT count(DISTINCT id) FROM reviewed),
      'prepared_representatives',(SELECT count(*) FROM prepared),
      'overlapping_ids',(SELECT count(*) FROM (SELECT id FROM reviewed GROUP BY id HAVING count(*)>1) x),
      'batch_counts',(SELECT jsonb_object_agg(batch,n) FROM (SELECT batch,count(*) n FROM reviewed GROUP BY batch) x),
      'residual_rows',(SELECT count(*) FROM ranked),
      'residual_sources',(SELECT count(DISTINCT source_id) FROM ranked),
      'exact_duplicate_occurrences',(SELECT count(*) FROM ranked WHERE duplicate_rank>1),
      'partition',(SELECT jsonb_agg(to_jsonb(x) ORDER BY lane,next_step) FROM (
        SELECT lane,next_step,count(*) rows,count(*) FILTER (WHERE has_image) with_image
        FROM ranked GROUP BY lane,next_step) x),
      'snapshot_digest',(SELECT md5(string_agg(id::text||'|'||exact_signature||'|'||lane||'|'||next_step,E'\\n' ORDER BY id)) FROM ranked)
    ) AS audit`;
  } else throw new Error(`Unknown audit mode: ${mode}`);
  return assertReadOnly(`${ctes}\n${select}`);
}

const readReviewJson = name => JSON.parse(readFileSync(new URL(`../docs/reviews/${name}`, import.meta.url), 'utf8'));
const hash = text => createHash('md5').update(text).digest('hex');
const requireEvidence = (condition, message) => { if (!condition) throw new Error(message); };
export const readNumericResidualBatch = () => readReviewJson('world-numeric-residual-batch-20261026.json');
export const readNumericResidualReceipt = () => readReviewJson('world-numeric-residual-receipt-20261026.json');
export const readNumericResidualBatch2 = () => readReviewJson('world-numeric-residual-batch2-20261026.json');
export const readNumericResidualReceipt2 = () => readReviewJson('world-numeric-residual-receipt2-20261026.json');

// Continuous, read-only inventory pass. Screening is NOT the manual 40-case review
// and never grants tree/publication eligibility. Reuses the same frozen universe.
export function selectContinuationRows() {
  const previous = readReviewJson('world-corpus-residual-evidence-20261026.json');
  const done = new Set([...previous.replays,...readNumericResidualBatch().rows,...readNumericResidualBatch2().rows].map(r=>r.id));
  return previous.partitions.flatMap(p=>p.ids.filter(id=>!done.has(id)).map(id=>({id,lane:p.lane,nextStep:p.next_step})))
    .sort((a,b)=>a.id.localeCompare(b.id));
}

export function buildContinuationReadSql(page) {
  requireEvidence(Number.isInteger(page) && page >= 0, 'Invalid continuation page');
  const ids=selectContinuationRows().slice(page*40,(page+1)*40).map(r=>r.id);
  requireEvidence(ids.length>0 && ids.every(id=>/^[a-f0-9-]{36}$/u.test(id)), 'Empty continuation page');
  return buildBoundedPublicSourceReadSql(ids,page);
}

function buildBoundedPublicSourceReadSql(ids,page) {
  requireEvidence(ids.length>0 && ids.length<=40 && ids.every(id=>/^[a-f0-9-]{36}$/u.test(id)), 'Invalid bounded source IDs');
  return assertReadOnly(`WITH selected(id) AS (VALUES ${ids.map(id=>`('${id}'::uuid)`).join(',')}),
    admitted AS (
      SELECT ro.id,ro.kind,ro.statement,ro.terms,ro.value,ro.source_ref,ro.status,ro.privacy_scope,
        ro.promoted_node_id,ro.meta#>'{ext,revision}' revision,
        public.fn_research_source_uid(ro.source_ref) source_uid,
        public.fn_research_claim_uid(ro.statement) claim_uid,
        cu.id source_id,ro.meta#>>'{ext,wa_channel_intake,media_ocr_pending}' ocr_pending,
        ro.meta#>>'{ext,wa_channel_intake,media_transcription_pending}' transcription_pending,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id',n.id,'label',n.label) ORDER BY n.id),'[]'::jsonb)
          FROM public.nodes n WHERE n.type='number' AND n.label=ro.value::text AND n.is_active IS TRUE
            AND coalesce(n.metadata->>'space','core')='core') targets
      FROM selected s JOIN public.research_objects ro ON ro.id=s.id
      JOIN public.channel_updates cu ON split_part(ro.source_ref,'#',1)='channel_updates:'||cu.id::text
      WHERE ro.status='approved' AND ro.privacy_scope='public' AND ro.promoted_node_id IS NULL
        AND ro.meta#>'{ext,revision}' IS NULL
        AND ro.source_ref ~ '^channel_updates:[0-9a-f-]{36}(#.*)?$'
        AND coalesce(lower(btrim(ro.meta#>>'{ext,personal_scope,scope}')),'')<>'person_only'
        AND coalesce(lower(btrim(ro.source)),'') NOT IN ('old_chat','openweb_legacy','or-geula')
        AND coalesce(btrim(ro.contributor),'')<>'אור הגאולה'
        AND cu.status='live' AND cu.page_only IS FALSE AND cu.channel='torat-haremez'
        AND cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid),
    sources AS (SELECT cu.id,cu.text,md5(cu.text) md5,cu.image_url,cu.created_at,
        cu.status,cu.page_only,cu.channel,cu.contributor_id
      FROM public.channel_updates cu WHERE cu.id IN (SELECT source_id FROM admitted))
    SELECT now() checked_at,${page} page,
      (SELECT jsonb_agg(jsonb_build_object('id',s.id,'finding',to_jsonb(a)) ORDER BY s.id)
        FROM selected s LEFT JOIN admitted a ON a.id=s.id) rows,
      (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM sources c) sources`);
}

export const readContinuationEvidence = () => readReviewJson('world-corpus-continuation-evidence-20261026.json');
export const readContinuationReceipt = () => readReviewJson('world-corpus-continuation-receipt-20261026.json');
export const continuationFingerprint = e => createHash('sha256')
  .update(JSON.stringify({pages:e.pages,rows:e.rows,sources:e.sources})).digest('hex');

export function screenContinuation(evidence = readContinuationEvidence()) {
  const selection=selectContinuationRows();
  requireEvidence(evidence.rows?.length===selection.length && evidence.pages?.length===Math.ceil(selection.length/40)
    && evidence.rows.every((r,i)=>r.id===selection[i].id), 'Continuation coverage drift');
  for(const [index,p] of evidence.pages.entries()) requireEvidence(p.page===index
    && !Number.isNaN(Date.parse(p.checkedAt))
    && JSON.stringify(p.ids)===JSON.stringify(selection.slice(index*40,(index+1)*40).map(r=>r.id)), 'Continuation page drift');
  const sources=new Map(evidence.sources.map(s=>[s.id,s]));
  requireEvidence(sources.size===evidence.sources.length, 'Duplicate continuation source');
  for(const s of sources.values()) requireEvidence(s.md5===hash(s.text) && s.status==='live'
    && s.page_only===false && s.channel==='torat-haremez'
    && s.contributor_id==='c66f0464-0928-490e-be9b-66d8a87e7fc8', 'Continuation source drift/access');

  // Existing extraction proposes bounded source-line candidates. A calculation
  // match is NOT approval of that extraction, a linked finding, or its story.
  const checks=[], unsupported=[];
  for(const source of sources.values()) {
    let start=0;
    for(const line of source.text.split('\n')) {
      const sourceSpan={start,end:start+line.length,excerpt:line}; start+=line.length+1;
      for(const c of extractCandidates(line).filter(c=>c.type==='explicit-claim')) {
        const phrase=c.norm || c.text, method=c.method || 'רגיל';
        const exact=phrase.length>0 && /^[א-ת\s"'׳״\-]+$/u.test(phrase) && line.includes(phrase)
          && Number.isSafeInteger(c.value) && new RegExp(`(^|[^0-9])${c.value}([^0-9]|$)`,'u').test(line);
        const supported=['רגיל','מילוי'].includes(method)
          && (c.method || !/מילוי|מסתתר|סידורי|משולש|גדול|ריבוע|אלבם|את.?בש/u.test(line));
        if(!exact || !supported) {
          unsupported.push({sourceId:source.id,sourceSpan,expression:c.text,claimed:c.value,
            method:c.method || null,reason:!exact?'exact_source_binding_unresolved':'method_context_unresolved'});
          continue;
        }
        const engine=METHODS.find(m=>m.key===method);
        const computed=engine?.fn(phrase);
        if(!Number.isSafeInteger(computed)) {
          unsupported.push({sourceId:source.id,sourceSpan,expression:c.text,claimed:c.value,method,reason:'engine_result_unavailable'});
          continue;
        }
        checks.push({sourceId:source.id,sourceMd5:source.md5,sourceSpan,expression:phrase,claimed:c.value,
          method,methodBasis:c.method?'extracted_label':'existing_regular_default',computed,
          calculation:computed===c.value?'match':'mismatch',extractionVerified:false,
          engineKey:hash(JSON.stringify([method,phrase])),sourceClaimVerified:false});
      }
    }
  }
  const rows=evidence.rows.map((entry,i)=>{
    const r=entry.finding, selected=selection[i];
    if(!r) return {...selected,admitted:false,recommendation:'דורש בדיקה',reason:'current_public_admission_unavailable',
      strength:null,score:null,sourceCount:null,target:null,automaticPromotion:false,execute:false};
    const s=sources.get(r.source_id);
    requireEvidence(r.id===entry.id && s && r.status==='approved' && r.privacy_scope==='public'
      && r.promoted_node_id===null && r.revision===null
      && r.source_ref.split('#')[0]===`channel_updates:${s.id}`
      && r.source_uid?.startsWith(`channel_updates:${s.id}`) && r.claim_uid?.length, 'Continuation admission drift');
    const linked=checks.filter(c=>c.sourceId===s.id && c.claimed===r.value
      && (r.terms || []).includes(c.expression));
    const mediaOnly=s.text.trim()==='📷 עדכון' || /^\[Image [^\]]+\]$/u.test(s.text.trim());
    const reason=mediaOnly?'uninspected_media_source':selected.lane==='els'?'canonical_els_replay_required'
      :selected.lane==='constants'?'exact_formula_precision_required':selected.lane==='spatial'?'geometry_source_review_required'
      :selected.lane==='language'?'language_source_review_required'
      :['hypothesis','question'].includes(r.kind)?'interpretation_or_question_not_verified'
      :linked.some(c=>c.calculation==='mismatch')?'source_candidate_mismatch_requires_review'
      :linked.length?'matched_operand_is_not_full_claim_verification':'source_claim_review_required';
    return {...selected,id:r.id,admitted:true,title:r.statement,kind:r.kind,value:r.value,sourceRef:r.source_ref,
      sourceId:s.id,sourceMd5:s.md5,sourceUid:r.source_uid,claimUid:r.claim_uid,
      recommendation:mediaOnly?'דורש OCR או תמלול':'דורש בדיקה',reason,
      candidateChecks:linked.map(c=>({engineKey:c.engineKey,sourceSpan:c.sourceSpan,calculation:c.calculation,expression:c.expression,claimed:c.claimed})),
      sourceImage:s.image_url,mediaInspected:false,sourceClaimVerified:false,
      strength:null,score:null,scoreTargetId:null,sourceCount:null,independentSourcesAdded:0,target:null,
      retainIds:[r.id],automaticPromotion:false,execute:false,suppress:false,publicationChanged:false};
  });
  const manualReviews=evidence.manualReviews || [];
  requireEvidence(new Set(manualReviews.map(r=>r.id)).size===manualReviews.length, 'Duplicate manual review');
  for(const review of manualReviews) {
    const row=rows.find(r=>r.id===review.id), original=evidence.rows.find(r=>r.id===review.id)?.finding;
    requireEvidence(row?.admitted && review.scope==='literal_numeric_claim_only'
      && review.reason?.length && review.publicationChanged===false
      && review.geometryVerified===false && review.interpretationVerified===false
      && !['hypothesis','question'].includes(original.kind)
      && original.targets.length===1 && original.terms.length>0
      && JSON.stringify(review.expressions)===JSON.stringify(original.terms)
      && original.terms.every(phrase=>row.candidateChecks.some(c=>c.expression===phrase
        && c.claimed===original.value && c.calculation==='match')),
    'Unready manual numeric recommendation');
    row.recommendation='מתאים לעץ';row.reason='manually_reviewed_numeric_scope';row.target=original.targets[0];
    row.manualReview={...review,calculationScopeVerified:true};
  }
  const constantDiagnostics=rows.filter(r=>r.admitted && r.lane==='constants').map(r=>({
    id:r.id,scope:'imported_statement_only',sourceVerified:false,mediaInspected:false,
    diagnostic:verifyWorldConstantStatement(r.title),automaticPromotion:false,execute:false}));
  const groups=(values,key)=>{
    const map=new Map(); for(const value of values){const k=key(value);if(k===null)continue;
      const list=map.get(k)||[];list.push(value);map.set(k,list);}
    return [...map.values()].filter(g=>g.length>1);
  };
  const repeatedSourceTexts=groups([...sources.values()],s=>s.text.trim()==='📷 עדכון'?null:s.text)
    .map(g=>({sourceIds:g.map(s=>s.id),textMd5:g[0].md5,identicalText:true,fullerVersion:null,
      imageLocators:g.map(s=>s.image_url),independentSourcesAdded:0,merge:false}));
  const identityGroups=groups(rows.filter(r=>r.admitted),r=>JSON.stringify([r.sourceUid,r.claimUid]))
    .map(g=>({findingIds:g.map(r=>r.id),sameCanonicalIdentity:true,
      // Identity collision still needs payload/context review before suppression.
      longestStatementId:[...g].sort((a,b)=>b.title.length-a.title.length||a.id.localeCompare(b.id))[0].id,
      fullContentInterchangeable:false,merge:false,suppress:false}));
  const inputs=[...new Map(checks.map(c=>[c.engineKey,{key:c.engineKey,phrase:c.expression,method:c.method,expected:c.computed}])).values()]
    .sort((a,b)=>a.key.localeCompare(b.key));
  return {base:evidence.base,screeningOnly:true,manualReviewCompleted:false,rows,checks,unsupported,inputs,
    repeatedSourceTexts,identityGroups,constantDiagnostics,counts:{screened:rows.length,sources:sources.size,
      admitted:rows.filter(r=>r.admitted).length,accessHeld:rows.filter(r=>!r.admitted).length,
      byLane:rows.reduce((a,r)=>(a[r.lane]=(a[r.lane]||0)+1,a),{}),
      byReason:rows.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{}),
      candidateCalculations:checks.length,uniqueEngineInputs:inputs.length,
      matchingCandidates:checks.filter(c=>c.calculation==='match').length,
      mismatchingCandidates:checks.filter(c=>c.calculation==='mismatch').length,
      manuallyReviewedNumericScopes:manualReviews.length,newTreeRecommendations:manualReviews.length,promoted:0,deleted:0},execute:false};
}

export function buildContinuationReplaySql(page, evidence = readContinuationEvidence()) {
  const inputs=screenContinuation(evidence).inputs.slice(page*40,(page+1)*40);
  requireEvidence(Number.isInteger(page) && page>=0 && inputs.length>0, 'Invalid continuation engine page');
  const quote=s=>`'${String(s).replaceAll("'","''")}'`;
  return assertReadOnly(`WITH inputs(key,phrase,method,expected) AS (VALUES ${inputs.map(i=>
    `(${quote(i.key)},${quote(i.phrase)},${quote(i.method)},${i.expected}::bigint)`).join(',')})
    SELECT now() checked_at,${page} page,
      md5(pg_get_functiondef('public.fn_method_value(text,text)'::regprocedure)) engine_definition_md5,
      (SELECT jsonb_agg(jsonb_build_object('key',i.key,'phrase',i.phrase,'method',i.method,'expected',i.expected,
        'computed',public.fn_method_value(i.method,i.phrase),'in_engine',EXISTS(
          SELECT 1 FROM public.gematria_methods m WHERE m.method_key=i.method AND m.in_engine IS TRUE)) ORDER BY i.key)
        FROM inputs i) checks`);
}

export function validateContinuationReceipt(evidence = readContinuationEvidence(), receipt = readContinuationReceipt()) {
  requireEvidence(receipt.inventoryFingerprint===continuationFingerprint(evidence), 'Continuation inventory fingerprint drift');
  const screen=screenContinuation(evidence), checks=receipt.pages?.flatMap(p=>p.checks)||[];
  requireEvidence(receipt.pages?.length===Math.ceil(screen.inputs.length/40)
    && new Set(receipt.pages.map(p=>p.engine_definition_md5)).size===1
    && receipt.pages.every((p,i)=>p.page===i && /^[a-f0-9]{32}$/u.test(p.engine_definition_md5)
      && !Number.isNaN(Date.parse(p.checked_at))
      && JSON.stringify(p.checks?.map(c=>c.key))===JSON.stringify(screen.inputs.slice(i*40,(i+1)*40).map(c=>c.key)))
    && checks.length===screen.inputs.length && screen.inputs.every(i=>checks.filter(c=>
      c.key===i.key && c.phrase===i.phrase && c.method===i.method && c.expected===i.expected
      && c.computed===i.expected && c.in_engine===true).length===1), 'Continuation canonical receipt drift');
  return screen;
}

export function selectSourceTextReviewRows() {
  return validateContinuationReceipt().rows
    .filter(r=>r.reason==='matched_operand_is_not_full_claim_verification').slice(0,40);
}

export const buildSourceTextReviewReadSql = () => buildBoundedPublicSourceReadSql(selectSourceTextReviewRows().map(r=>r.id),0);

export const readSourceTextReview = () => readReviewJson('world-source-text-review-20261026.json');
export const readSourceTextReceipt = () => readReviewJson('world-source-text-receipt-20261026.json');
export const sourceTextReviewFingerprint = evidence => createHash('sha256').update(JSON.stringify(evidence)).digest('hex');

// Review the other claims of already-read sources once per source family.
// Selection is explicit and disjoint from prior manual reviews; no new parser.
export function selectSourceFamilyRows() {
  const prior=readSourceTextReview(),continuation=readContinuationEvidence();
  const done=new Set([...prior.rows,...continuation.manualReviews].map(r=>r.id));
  const sourceIds=new Set(prior.sources.map(s=>s.id));
  return validateContinuationReceipt().rows.filter(r=>!done.has(r.id) && sourceIds.has(r.sourceId));
}
export function buildSourceFamilyReadSql(page) {
  requireEvidence(Number.isInteger(page) && page>=0, 'Invalid family page');
  return buildBoundedPublicSourceReadSql(selectSourceFamilyRows().slice(page*40,(page+1)*40).map(r=>r.id),page);
}

export const readSourceFamilyReview = () => readReviewJson('world-source-family-review-20261026.json');
export const readSourceFamilyReceipt = () => readReviewJson('world-source-family-receipt-20261026.json');

// Fixed manual classification, not a runtime triage/ranking/dedup system.
export function replaySourceFamilyReview(evidence = readSourceFamilyReview()) {
  const ids=selectSourceFamilyRows().map(r=>r.id),prior=readSourceTextReview();
  requireEvidence(JSON.stringify(evidence.rows?.map(r=>r.id))===JSON.stringify(ids)
    && JSON.stringify(evidence.reviews?.map(r=>r.id))===JSON.stringify(ids)
    && evidence.pages?.length===Math.ceil(ids.length/40), 'Family coverage drift');
  for(const [i,p] of evidence.pages.entries()) requireEvidence(p.page===i
    && !Number.isNaN(Date.parse(p.checkedAt))
    && JSON.stringify(p.ids)===JSON.stringify(ids.slice(i*40,(i+1)*40)), 'Family page drift');
  requireEvidence(evidence.sources?.length===prior.sources.length
    && new Set(evidence.sources.map(s=>s.id)).size===evidence.sources.length
    && evidence.families?.length===evidence.sources.length, 'Family source coverage drift');
  for(const [i,s] of evidence.sources.entries()) {
    const old=prior.sources.find(p=>p.id===s.id),family=evidence.families[i];
    requireEvidence(old && s.text===old.text && s.md5===hash(s.text) && s.image_url===old.image_url
      && s.status==='live' && s.page_only===false && s.channel==='torat-haremez'
      && s.contributor_id==='c66f0464-0928-490e-be9b-66d8a87e7fc8'
      && family.sourceId===s.id && family.reviewNote?.length
      && JSON.stringify(family.priorReviewIds)===JSON.stringify(prior.rows.filter(r=>r.finding.source_id===s.id).map(r=>r.id)),
    'Family source/previous review drift');
  }
  return evidence.rows.map(({id,finding:row},index)=>{
    const plan=evidence.reviews[index],source=evidence.sources.find(s=>s.id===row?.source_id);
    requireEvidence(row?.id===id && source && row.status==='approved' && row.privacy_scope==='public'
      && row.promoted_node_id===null && row.revision===null
      && row.source_ref.split('#')[0]===`channel_updates:${source.id}`
      && plan.sourceContext?.start===0 && plan.sourceContext.end===source.text.length
      && plan.reason?.length && plan.category?.length
      && ['wholeSourceVerified','interpretationVerified','corpusCountsVerified','mediaInspected','publicationChanged'].every(k=>plan[k]===false),
    'Family admission/scope drift');
    const calculations=plan.checks.map((c,i)=>{
      const p=c.operandSpan;
      requireEvidence(p?.start>=0 && Number.isInteger(p.start) && p.end===p.start+c.expression.length
        && source.text.slice(p.start,p.end)===c.expression && /[א-ת]/u.test(c.expression)
        && /^[א-ת\u0591-\u05c7\s"'׳״,_־\-]+$/u.test(c.expression) && c.method==='רגיל'
        && c.sourceContext?.start===0 && c.sourceContext.end===source.text.length, 'Family operand drift');
      requireEvidence(c.claimed===null ? c.claimBasis==='source_operand_calculation'
        : c.claimBasis==='manual_full_source_context' && Number.isSafeInteger(c.claimed)
          && new RegExp(`(^|[^0-9])${c.claimed}([^0-9]|$)`,'u').test(source.text), 'Family invented source value');
      const computed=METHODS.find(m=>m.key===c.method).fn(c.expression);
      const trace=c.claimed===null?null:verifyCandidate({type:'explicit-claim',text:c.expression,method:c.method,value:c.claimed}).engine_detail;
      return {...c,type:'atomic',computed,trace,verification:c.claimed===null?'system_calculation':computed===c.claimed?'match':'mismatch',
        engineInputs:[{role:`atomic_${i}`,phrase:c.expression,method:c.method,expected:computed}]};
    });
    for(const [i,c] of plan.compoundSlices.entries()) {
      const p=c.sourceSpan;
      requireEvidence(p?.start>=0 && Number.isInteger(p.start) && p.end===p.start+c.expression.length
        && p.excerpt===c.expression && source.text.slice(p.start,p.end)===c.expression, 'Family equation span drift');
      const claims=extractCompoundClaims(c.expression);
      requireEvidence(claims.length===1, 'Family extraction unresolved');
      const trace=claims[0],operands=trace.operands || (trace.operand?[trace.operand]:[]);
      requireEvidence(operands.every(o=>o.ok && o.method==='רגיל') && (trace.skipUsed || 0)===0, 'Family operand method unresolved');
      calculations.push({...c,type:'compound',trace,computed:trace.result,
        verification:trace.status==='ENGINE_VERIFIED_COMPOSITE'?'match':'mismatch',
        extractionIntegrity:computeExtractionIntegrity([trace],[]),extractionScope:'source_span_only',
        engineInputs:operands.map((o,j)=>({role:`compound_${i}_operand_${j}`,phrase:o.phrase,method:o.method,expected:o.value}))});
    }
    if(plan.recommendation==='מתאים לעץ' || plan.category==='numeric_scope_overlap') {
      requireEvidence(plan.numericScopeComplete===true && ['numeric_claim','derivation','numeric_scope_overlap'].includes(plan.category)
        && !['hypothesis','question'].includes(row.kind) && row.targets.length===1 && calculations.length>0
        && calculations.every(c=>c.verification==='match' && (!c.extractionIntegrity || c.extractionIntegrity.fidelityStatus==='complete'))
        && calculations.some(c=>c.computed===row.value), 'Unready family numeric scope');
    } else requireEvidence(plan.numericScopeComplete===false, 'Unsupported family completeness');
    if(plan.category==='source_representation') requireEvidence(plan.recommendation==='כפילות'
      && row.statement.length>0 && source.text.startsWith(row.statement), 'Unproven source copy');
    if(plan.category==='numeric_scope_overlap') {
      const other=prior.reviews.find(p=>p.id===plan.overlapPriorId),old=prior.rows.find(r=>r.id===plan.overlapPriorId)?.finding;
      requireEvidence(plan.recommendation==='כפילות' && other?.recommendation==='מתאים לעץ'
        && old?.source_id===source.id && old.value===row.value && plan.compoundSlices.length>0
        && plan.compoundSlices.every(c=>other.compoundSlices.some(o=>JSON.stringify(o)===JSON.stringify(c))), 'Unproven family scope overlap');
    } else requireEvidence(!plan.overlapPriorId, 'Unexpected prior overlap');
    requireEvidence(['מתאים לעץ','כפילות','דורש בדיקה','דורש מקור','דורש OCR או תמלול','לא מתאים'].includes(plan.recommendation)
      && (plan.recommendation!=='כפילות' || ['source_representation','numeric_scope_overlap'].includes(plan.category))
      && (plan.recommendation!=='לא מתאים' || plan.category==='research_question' && row.kind==='question'), 'Family disposition drift');
    return {row,plan,source,calculations};
  });
}

export const buildSourceFamilyReceiptSql = (evidence = readSourceFamilyReview()) => buildSelectedReceiptSql(replaySourceFamilyReview(evidence));

export function buildSourceFamilyReport(evidence = readSourceFamilyReview(), receipt = readSourceFamilyReceipt()) {
  requireEvidence(receipt.evidenceFingerprint===sourceTextReviewFingerprint(evidence), 'Family evidence fingerprint drift');
  const selected=replaySourceFamilyReview(evidence),checks=validateSelectedReceipt(selected,receipt);
  const rows=selected.map(({row:r,plan:p,source:s,calculations})=>{
    const live=receipt.claims.find(c=>c.id===r.id);validateLiveClaim(r,s,live);
    return {id:r.id,title:r.statement,category:p.category,recommendation:p.recommendation,reason:p.reason,
      sourceRef:r.source_ref,sourceId:s.id,sourceMd5:s.md5,
      sourceNote:evidence.families.find(f=>f.sourceId===s.id).reviewNote,calculations,
      target:p.recommendation==='מתאים לעץ'?live.targets[0]:null,
      strength:null,score:null,scoreTargetId:null,sourceCount:null,independentSourcesAdded:0,
      duplicateOf:p.overlapPriorId || null,identityOverlapIds:live.identity_overlaps.map(o=>o.id),
      retainIds:[r.id,...live.identity_overlaps.map(o=>o.id)],
      fullerSource:p.category==='source_representation'?`channel_updates:${s.id}`:null,
      fullSourceCopy:p.category==='source_representation'?r.statement===s.text:null,
      media:{imageUrl:s.image_url,markers:s.text.match(/\[Image [^\]]+\]/gu)||[],inspected:false},
      numericScopeComplete:p.numericScopeComplete,wholeSourceVerified:false,interpretationVerified:false,corpusCountsVerified:false,
      requiresGovernedRepresentation:true,automaticPromotion:false,publicationChanged:false,suppress:false,execute:false};
  });
  const groups=new Map();for(const s of evidence.sources){const g=groups.get(s.text)||[];g.push(s);groups.set(s.text,g);}
  const repeatedSourceTexts=[...groups.values()].filter(g=>g.length>1).map(g=>({sourceIds:g.map(s=>s.id),
    findingIds:rows.filter(r=>g.some(s=>s.id===r.sourceId)).map(r=>r.id),fullerTextVersion:null,
    sameTextOnly:true,independentSourcesAdded:0,merge:false,suppress:false}));
  return {base:evidence.base,checkedAt:receipt.checked_at,rows,repeatedSourceTexts,
    counts:{classified:rows.length,sourceFamilies:evidence.sources.length,canonicalChecks:checks.length,
      atomicChecks:rows.flatMap(r=>r.calculations).filter(c=>c.type==='atomic').length,
      compoundChecks:rows.flatMap(r=>r.calculations).filter(c=>c.type==='compound').length,
      byRecommendation:rows.reduce((a,r)=>(a[r.recommendation]=(a[r.recommendation]||0)+1,a),{}),
      byCategory:rows.reduce((a,r)=>(a[r.category]=(a[r.category]||0)+1,a),{}),promoted:0,deleted:0},execute:false};
}

// Fixed manual source review. Reuses canonical atomic/compound replay and receipt
// gates; does not change the candidate screen, parser, method registry or runtime.
export function replaySourceTextReview(evidence = readSourceTextReview()) {
  const ids=selectSourceTextReviewRows().map(r=>r.id);
  requireEvidence(evidence.rows?.length===40 && evidence.reviews?.length===40
    && JSON.stringify(evidence.rows.map(r=>r.id))===JSON.stringify(ids)
    && JSON.stringify(evidence.reviews.map(r=>r.id))===JSON.stringify(ids), 'Source text review coverage drift');
  requireEvidence(!Number.isNaN(Date.parse(evidence.checkedAt))
    && new Set(evidence.sources.map(s=>s.id)).size===evidence.sources.length, 'Invalid source snapshot');
  for(const s of evidence.sources) requireEvidence(hash(s.text)===s.md5 && s.status==='live'
    && s.page_only===false && s.channel==='torat-haremez'
    && s.contributor_id==='c66f0464-0928-490e-be9b-66d8a87e7fc8', 'Source text access/drift');
  return evidence.rows.map(({id,finding:row},index)=>{
    const plan=evidence.reviews[index],source=evidence.sources.find(s=>s.id===row?.source_id);
    requireEvidence(row?.id===id && source && row.status==='approved' && row.privacy_scope==='public'
      && row.promoted_node_id===null && row.revision===null
      && row.source_ref.split('#')[0]===`channel_updates:${source.id}`, 'Source text admission drift');
    requireEvidence(plan.reason?.length>0 && plan.scope==='numeric_source_slices_only'
      && ['wholeSourceVerified','corpusCountsVerified','interpretationVerified','mediaInspected','publicationChanged'].every(k=>plan[k]===false)
      && ['מתאים לעץ','כפילות','דורש בדיקה','דורש מקור','דורש OCR או תמלול'].includes(plan.recommendation), 'Missing scoped review');
    const calculations=plan.checks.map((c,i)=>{
      const span=c.operandSpan;
      requireEvidence(span && Number.isInteger(span.start) && span.start>=0
        && span.end===span.start+c.expression.length && source.text.slice(span.start,span.end)===c.expression
        && c.sourceContext?.start===0 && c.sourceContext.end===source.text.length
        && /[א-ת]/u.test(c.expression) && /^[א-ת\u0591-\u05c7\s"'׳״,_־\-]+$/u.test(c.expression)
        && c.method==='רגיל', 'Exact source operand drift');
      requireEvidence(c.claimed===null ? c.claimBasis==='source_operand_calculation'
        : c.claimBasis==='manual_full_source_context' && Number.isSafeInteger(c.claimed)
          && new RegExp(`(^|[^0-9])${c.claimed}([^0-9]|$)`,'u').test(source.text), 'Invented source value');
      const trace=c.claimed===null ? null : verifyCandidate({type:'explicit-claim',text:c.expression,method:c.method,value:c.claimed}).engine_detail;
      const computed=METHODS.find(m=>m.key===c.method).fn(c.expression);
      return {...c,type:'atomic',computed,trace,verification:c.claimed===null?'system_calculation':computed===c.claimed?'match':'mismatch',
        engineInputs:[{role:`atomic_${i}`,phrase:c.expression,method:c.method,expected:computed}]};
    });
    const compounds=plan.compoundSlices.map((c,i)=>{
      requireEvidence(c.sourceSpan?.start>=0 && c.sourceSpan.end===c.sourceSpan.start+c.expression.length
        && source.text.slice(c.sourceSpan.start,c.sourceSpan.end)===c.expression
        && c.sourceSpan.excerpt===c.expression, 'Compound source span drift');
      const claims=extractCompoundClaims(c.expression);
      requireEvidence(claims.length===1, 'Ambiguous shared source extraction');
      const trace=claims[0],operands=trace.operands || (trace.operand?[trace.operand]:[]);
      requireEvidence(operands.every(o=>o.ok && o.method==='רגיל'), 'Unresolved source method');
      return {...c,type:'compound',trace,computed:trace.result,verification:trace.status==='ENGINE_VERIFIED_COMPOSITE'?'match':'mismatch',
        extractionIntegrity:computeExtractionIntegrity([trace],[]),extractionScope:'source_span_only',
        engineInputs:operands.map((o,j)=>({role:`compound_${i}_operand_${j}`,phrase:o.phrase,method:o.method,expected:o.value}))};
    });
    if(plan.recommendation==='מתאים לעץ' || plan.recommendation==='כפילות') {
      requireEvidence(plan.numericScopeComplete===true && calculations.length>0 && row.targets.length===1
        && !['hypothesis','question'].includes(row.kind)
        && calculations.every(c=>c.verification==='match' || c.verification==='system_calculation'
          && compounds.some(p=>(p.trace.operands || []).some(o=>o.phrase===c.expression && o.value===c.computed)))
        && calculations.some(c=>c.claimed===row.value)
        && compounds.every(c=>c.verification==='match' && (c.trace.skipUsed || 0)===0
          && c.extractionIntegrity.fidelityStatus==='complete'), 'Unready numeric scope');
    }
    if(plan.recommendation==='כפילות') {
      const other=evidence.rows.find(r=>r.id===plan.duplicateOf)?.finding;
      const otherSource=evidence.sources.find(s=>s.id===other?.source_id);
      const otherPlan=evidence.reviews.find(r=>r.id===plan.duplicateOf);
      requireEvidence(other && other.id!==id && otherSource?.text===source.text && otherPlan?.recommendation==='מתאים לעץ'
        && JSON.stringify(otherPlan.checks)===JSON.stringify(plan.checks), 'Unproven duplicate scope');
    } else requireEvidence(plan.duplicateOf===null, 'Unexpected duplicate decision');
    return {row,plan,source,calculations:[...calculations,...compounds]};
  });
}

export const buildSourceTextReceiptSql = (evidence = readSourceTextReview()) => buildSelectedReceiptSql(replaySourceTextReview(evidence));

export function buildSourceTextReport(evidence = readSourceTextReview(), receipt = readSourceTextReceipt()) {
  requireEvidence(receipt.evidenceFingerprint===sourceTextReviewFingerprint(evidence), 'Source text evidence fingerprint drift');
  const selected=replaySourceTextReview(evidence),expected=validateSelectedReceipt(selected,receipt);
  const rows=selected.map(({row:r,plan:p,source:s,calculations})=>{
    const live=receipt.claims.find(c=>c.id===r.id);validateLiveClaim(r,s,live);
    return {id:r.id,title:r.statement,recommendation:p.recommendation,reason:p.reason,
      sourceRef:r.source_ref,sourceId:s.id,sourceMd5:s.md5,calculations,
      target:p.recommendation==='מתאים לעץ'?live.targets[0]:null,
      strength:null,score:null,scoreTargetId:null,sourceCount:null,independentSourcesAdded:0,
      duplicateOf:p.duplicateOf,identityOverlapIds:live.identity_overlaps.map(o=>o.id),
      retainIds:[r.id,...live.identity_overlaps.map(o=>o.id)],
      media:{imageUrl:s.image_url,markers:s.text.match(/\[Image [^\]]+\]/gu)||[],inspected:false},
      wholeSourceVerified:false,interpretationVerified:false,corpusCountsVerified:false,
      numericScopeComplete:p.numericScopeComplete,requiresGovernedRepresentation:true,
      automaticPromotion:false,suppress:false,publicationChanged:false,execute:false};
  });
  const textGroups=new Map();
  for(const s of evidence.sources) {const group=textGroups.get(s.text)||[];group.push(s.id);textGroups.set(s.text,group);}
  const repeatedSourceTexts=[...textGroups.values()].filter(ids=>ids.length>1).map(ids=>({sourceIds:ids,
    findingIds:rows.filter(r=>ids.includes(r.sourceId)).map(r=>r.id),fullerTextVersion:null,
    sameTextOnly:true,independentSourcesAdded:0,merge:false,suppress:false}));
  return {base:evidence.base,checkedAt:receipt.checked_at,rows,repeatedSourceTexts,
    counts:{reviewed:40,sourceMessages:evidence.sources.length,canonicalChecks:expected.length,
      atomicChecks:rows.flatMap(r=>r.calculations).filter(c=>c.type==='atomic').length,
      compoundChecks:rows.flatMap(r=>r.calculations).filter(c=>c.type==='compound').length,
      byRecommendation:rows.reduce((a,r)=>(a[r.recommendation]=(a[r.recommendation]||0)+1,a),{}),promoted:0,deleted:0},execute:false};
}

export function selectNextNumericResidualIds(batch = 1) {
  requireEvidence(batch === 1 || batch === 2, 'Unknown fixed numeric batch');
  const previous = readReviewJson('world-corpus-residual-evidence-20261026.json');
  const reviewed = new Set(previous.replays.map(r => r.id));
  if (batch === 2) for (const row of readNumericResidualBatch().rows) reviewed.add(row.id);
  return previous.partitions.filter(p => p.lane === 'gematria').flatMap(p => p.ids)
    .filter(id => !reviewed.has(id)).sort().slice(0,40);
}

export function replayNumericResidualBatch(evidence = readNumericResidualBatch(), batch = 1) {
  const ids = selectNextNumericResidualIds(batch);
  requireEvidence(evidence.rows?.length === 40 && evidence.reviewPlan?.length === 40
    && ids.every(id => evidence.rows.filter(r => r.id === id).length === 1
      && evidence.reviewPlan.filter(r => r.id === id).length === 1), 'Wrong exact 40-case batch');
  requireEvidence(Array.isArray(evidence.sources)
    && new Set(evidence.sources.map(s => s.id)).size === evidence.sources.length, 'Duplicate source record');
  for (const source of evidence.sources) {
    requireEvidence(hash(source.text) === source.md5 && source.status === 'live'
      && source.channel === 'torat-haremez' && source.page_only === false
      && source.contributor_id === 'c66f0464-0928-490e-be9b-66d8a87e7fc8'
      && source.has_image === Boolean(source.image_url?.trim()), 'Source drift/access mismatch');
  }
  return ids.map(id => {
    const row = evidence.rows.find(r => r.id === id), plan = evidence.reviewPlan.find(p => p.id === id);
    const source = evidence.sources.find(s => s.id === row.source_id);
    requireEvidence(source && row.admitted && row.status === 'approved' && row.privacy_scope === 'public'
      && row.promoted_node_id === null && row.revision === null
      && row.source_ref.split('#')[0] === `channel_updates:${source.id}`, 'Row admission drift');
    requireEvidence(plan.automaticPromotion === false && plan.strength === null && plan.score === null
      && plan.scoreTargetId === null && plan.sourceCount === null && plan.independentSourcesAdded === 0,
    'Invented score, independence or automatic admission');
    requireEvidence(['מתאים לעץ','דורש בדיקה','דורש מקור','דורש OCR או תמלול'].includes(plan.recommendation)
      && typeof plan.reason === 'string' && plan.reason.length > 0, 'Missing reviewed disposition');
    const calculations = plan.calculations.map((c,index) => {
      const span = c.sourceSpan;
      requireEvidence(span && Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0
        && span.end > span.start && source.text.slice(span.start,span.end) === span.excerpt
        && span.excerpt.includes(c.expression) && Number.isSafeInteger(c.claimed), 'Calculation/source span drift');
      if (c.type === 'atomic') {
        requireEvidence((c.method === 'רגיל' || batch === 2 && c.method === 'מילוי' && /מילוי/u.test(span.excerpt))
          && !/[0-9+×÷=]/u.test(c.expression), 'Mixed input cannot be direct gematria');
        if (batch === 2) requireEvidence(typeof c.diagnosticOnly === 'boolean'
          && (c.diagnosticOnly ? c.claimed === row.value && c.diagnosticReason?.length > 0
            : new RegExp(`(^|[^0-9])${c.claimed}([^0-9]|$)`, 'u').test(span.excerpt)),
        'Missing source claim value or diagnostic provenance');
        const replay = verifyCandidate({type:'explicit-claim',text:c.expression,method:c.method,value:c.claimed});
        return {...c,index,trace:replay.engine_detail,verification:replay.engine_verified === true ? 'match' : 'mismatch',
          engineInputs:[{role:`calculation_${index}`,phrase:c.expression,method:c.method,
            expected:replay.engine_detail.computed}]};
      }
      requireEvidence(c.type === 'compound' && c.method === null, 'Unknown typed calculation');
      const claims = extractCompoundClaims(c.expression);
      requireEvidence(claims.length === 1, 'Ambiguous/missing shared extraction');
      const claim = claims[0];
      const operands = claim.operands || (claim.operand ? [claim.operand] : []);
      requireEvidence(operands.every(o => o.ok && o.method === 'רגיל')
        && (claim.skipUsed === undefined || claim.skipUsed === 0), 'Unresolved operand/skip');
      const match = claim.status === 'ENGINE_VERIFIED_COMPOSITE' && claim.result === c.claimed;
      return {...c,index,trace:claim,verification:match ? 'match' : 'mismatch',
        extractionIntegrity:computeExtractionIntegrity([claim],[]),
        extractionScope:'source_span_only',
        engineInputs:operands.map((o,i) => ({role:`calculation_${index}_operand_${i}`,
          phrase:o.phrase,method:o.method,expected:o.value}))};
    });
    if (plan.recommendation === 'מתאים לעץ') requireEvidence(calculations.length > 0
      && calculations.every(c => !c.diagnosticOnly && c.verification === 'match'
        && (!c.extractionIntegrity || c.extractionIntegrity.fidelityStatus === 'complete'))
      && calculations.some(c => c.claimed === row.value) && row.targets?.length === 1
      && !['hypothesis','question'].includes(row.kind)
      // This fixed follow-up admits only its reviewed equation/family scopes.
      // Matching isolated leaves cannot approve a prose derivation or overlap.
      && (batch !== 2 || plan.kind === 'numeric_family' && calculations.every(c => c.type === 'atomic')
        || plan.kind === 'derivation' && calculations.some(c => c.type === 'compound' && c.claimed === row.value)),
    'Unready finding cannot be recommended for the tree');
    return {row,plan,source,calculations};
  });
}

export function buildNumericResidualReceiptSql(evidence = readNumericResidualBatch(), batch = 1) {
  return buildSelectedReceiptSql(replayNumericResidualBatch(evidence,batch));
}

// Same bounded source/identity/method SELECT for both text and image evidence.
function buildSelectedReceiptSql(selected) {
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;
  const values = selected.map(({row:r,source:s}) => `(${quote(r.id)}::uuid,${quote(r.source_ref)},`
    + `${quote(s.id)}::uuid,${quote(s.md5)},${quote(r.source_uid)},${quote(hash(r.claim_uid))},${quote(hash(r.statement))},`
    + `${quote(JSON.stringify(r.terms))}::jsonb,${r.value}::integer,${quote(r.kind)},`
    + `${s.image_url === null ? 'NULL::text' : quote(s.image_url)})`).join(',\n');
  const inputs = selected.flatMap(r => r.calculations.flatMap(c => c.engineInputs.map(i => ({id:r.row.id,...i}))));
  requireEvidence(inputs.length > 0 && inputs.every(i => Number.isSafeInteger(i.expected)), 'Missing engine inputs');
  const leaves = inputs.map(i => `(${quote(i.id)}::uuid,${quote(i.role)},${quote(i.phrase)},`
    + `${quote(i.method)},${i.expected}::integer)`).join(',\n');
  return assertReadOnly(`WITH selected(id,source_ref,source_id,source_md5,source_uid,claim_uid_md5,
      statement_md5,terms,value,kind,image_url) AS (VALUES ${values}),
    leaves(id,role,phrase,method,expected) AS (VALUES ${leaves}),
    checks AS (SELECT s.id,s.source_ref,s.source_md5,s.source_uid,
      public.fn_research_claim_uid(ro.statement) claim_uid,s.statement_md5,
      coalesce(ro.status='approved' AND ro.privacy_scope='public' AND ro.promoted_node_id IS NULL
        AND ro.meta#>'{ext,revision}' IS NULL,false) admitted,
      coalesce(lower(btrim(ro.meta#>>'{ext,personal_scope,scope}')),'')<>'person_only'
        AND coalesce(lower(btrim(ro.source)),'') NOT IN ('old_chat','openweb_legacy','or-geula')
        AND coalesce(btrim(ro.contributor),'')<>'אור הגאולה' general_scope,
      coalesce(ro.source_ref=s.source_ref AND md5(ro.statement)=s.statement_md5 AND ro.kind=s.kind
        AND ro.value IS NOT DISTINCT FROM s.value AND to_jsonb(ro.terms)=s.terms
        AND public.fn_research_source_uid(ro.source_ref)=s.source_uid
        AND md5(public.fn_research_claim_uid(ro.statement))=s.claim_uid_md5,false) exact_claim,
      coalesce(cu.status='live' AND cu.page_only IS FALSE AND cu.channel='torat-haremez'
        AND cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
        AND md5(cu.text)=s.source_md5 AND cu.image_url IS NOT DISTINCT FROM s.image_url,false) exact_source,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('id',n.id,'label',n.label) ORDER BY n.id),'[]'::jsonb)
        FROM public.nodes n WHERE n.type='number' AND n.label=s.value::text AND n.is_active IS TRUE
          AND coalesce(n.metadata->>'space','core')='core') targets,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('id',other.id,'statement',other.statement,
        'kind',other.kind,'terms',other.terms,'value',other.value,'source_ref',other.source_ref,
        'source_uid',public.fn_research_source_uid(other.source_ref),
        'claim_uid',public.fn_research_claim_uid(other.statement)) ORDER BY length(other.statement) DESC,other.id),'[]'::jsonb)
        FROM public.research_objects other WHERE other.id<>s.id AND other.status IN ('approved','canonical')
          AND other.privacy_scope='public' AND public.fn_research_source_uid(other.source_ref)=s.source_uid
          AND public.fn_research_claim_uid(other.statement)=public.fn_research_claim_uid(ro.statement)
          AND coalesce(lower(btrim(other.meta#>>'{ext,personal_scope,scope}')),'')<>'person_only'
          AND coalesce(lower(btrim(other.source)),'') NOT IN ('old_chat','openweb_legacy','or-geula')
          AND coalesce(btrim(other.contributor),'')<>'אור הגאולה') identity_overlaps
      FROM selected s LEFT JOIN public.research_objects ro ON ro.id=s.id
        LEFT JOIN public.channel_updates cu ON cu.id=s.source_id),
    replay AS (SELECT i.*,public.fn_method_value(i.method,i.phrase) computed,
      EXISTS(SELECT 1 FROM public.gematria_methods m WHERE m.method_key=i.method AND m.in_engine IS TRUE) method_in_engine
      FROM leaves i)
    SELECT now() checked_at,(SELECT jsonb_agg(c ORDER BY c.id) FROM checks c) claims,
      (SELECT jsonb_agg(r ORDER BY r.id,r.role) FROM replay r) engine_replays,
      md5(pg_get_functiondef('public.fn_method_value(text,text)'::regprocedure)) engine_definition_md5,
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.method_key) FROM public.gematria_methods m
        WHERE m.method_key IN (SELECT DISTINCT method FROM leaves)) methods`);
}

export function buildNumericResidualReview(evidence = readNumericResidualBatch(), receipt = readNumericResidualReceipt(), batch = 1) {
  const selected = replayNumericResidualBatch(evidence,batch);
  const expected = validateSelectedReceipt(selected, receipt);
  const rows = selected.map(({row:r,plan:p,source:s,calculations}) => {
    const live = receipt.claims.find(c => c.id === r.id);
    validateLiveClaim(r,s,live);
    // Identity overlap is not proof that all content is interchangeable. Never suppress.
    const overlaps = live.identity_overlaps;
    const interchangeable = overlaps.length > 0 && overlaps.every(o => o.kind === r.kind && o.value === r.value
      && JSON.stringify(o.terms) === JSON.stringify(r.terms));
    const fullest = interchangeable ? [r,...overlaps].sort((a,b) =>
      b.statement.length-a.statement.length || a.id.localeCompare(b.id))[0].id : null;
    return {id:r.id,title:r.statement,kind:p.kind,recommendation:p.recommendation,reason:p.reason,
      strength:null,score:null,scoreTargetId:null,target:p.recommendation === 'מתאים לעץ' ? live.targets[0] : null,
      sourceRef:r.source_ref,sourceId:s.id,sourceMd5:s.md5,sourceImage:s.image_url,
      sourceCount:null,independentSourcesAdded:0,
      calculations,canonicalChecks:receipt.engine_replays.filter(c => c.id === r.id),
      media:{...r.media,inspected:false,markers:s.text.match(/\[Image [^\]]+\]/gu) || []},
      identityOverlapIds:overlaps.map(o => o.id),recommendedFullestIdentityVersion:fullest,
      identityOverlapNeedsReview:overlaps.length > 0,retainIds:[r.id,...overlaps.map(o=>o.id)],
      interpretationVerified:false,corpusCountVerified:false,suppress:false,automaticPromotion:false,
      publicationChanged:false,execute:false};
  });
  const textGroups = new Map();
  for (const s of evidence.sources) {
    if (s.text === '📷 עדכון') continue; // A shared placeholder is not duplicate source content.
    const group = textGroups.get(s.text) || []; group.push(s.id); textGroups.set(s.text,group);
  }
  const repeatedSourceTexts = [...textGroups.values()].filter(ids => ids.length > 1)
    .map(ids => ({sourceIds:ids.sort(),findingIds:rows.filter(r=>ids.includes(r.sourceId)).map(r=>r.id),
      sourceTextOnly:true,independentSourcesAdded:0,merge:false}));
  return {base:evidence.base,checkedAt:receipt.checked_at,rows,repeatedSourceTexts,
    counts:{reviewed:rows.length,sourceMessages:evidence.sources.length,
      withCalculationReplay:rows.filter(r=>r.calculations.length).length,
      calculations:rows.reduce((n,r)=>n+r.calculations.length,0),canonicalChecks:expected.length,
      byRecommendation:rows.reduce((a,r)=>(a[r.recommendation]=(a[r.recommendation]||0)+1,a),{}),
      newFindings:0,promoted:0,deleted:0},execute:false};
}

function validateSelectedReceipt(selected, receipt) {
  const expected = selected.flatMap(r => r.calculations.flatMap(c => c.engineInputs.map(i => ({id:r.row.id,...i}))));
  const methods = [...new Set(expected.map(e => e.method))];
  requireEvidence(receipt && !Number.isNaN(Date.parse(receipt.checked_at))
    && /^[a-f0-9]{32}$/u.test(receipt.engine_definition_md5)
    && receipt.methods?.length === methods.length && methods.every(key =>
      receipt.methods.filter(m => m.method_key === key && m.in_engine === true).length === 1), 'Missing canonical receipt');
  requireEvidence(receipt.claims?.length === selected.length && new Set(receipt.claims.map(r => r.id)).size === selected.length,
    'Incomplete current claim receipt');
  requireEvidence(receipt.engine_replays?.length === expected.length && expected.every(e =>
    receipt.engine_replays.filter(r => r.id === e.id && r.role === e.role && r.phrase === e.phrase
      && r.method === e.method && r.expected === e.expected && r.computed === e.expected
      && r.method_in_engine === true).length === 1), 'Canonical engine parity drift');
  return expected;
}

function validateLiveClaim(r,s,live) {
  requireEvidence(live && ['admitted','general_scope','exact_claim','exact_source'].every(k => live[k] === true)
    && live.source_ref === r.source_ref && live.source_md5 === s.md5 && live.source_uid === r.source_uid
    && live.claim_uid === r.claim_uid && live.statement_md5 === hash(r.statement)
    && JSON.stringify(live.targets) === JSON.stringify(r.targets || []), 'Live source/identity/target drift');
  requireEvidence(Array.isArray(live.identity_overlaps) && live.identity_overlaps.every(o =>
    o.id !== r.id && o.source_uid === r.source_uid && o.claim_uid === r.claim_uid), 'Unproven identity overlap');
}

export const readImageSourceReview = () => readReviewJson('world-image-source-review-20261026.json');
export const readImageSourceReceipt = () => readReviewJson('world-image-source-receipt-20261026.json');

// Offline review of a fixed seven-case follow-up, not an OCR/parser/runtime service.
export function replayImageSourceReview(evidence = readImageSourceReview()) {
  const prior = replayNumericResidualBatch().filter(r => r.plan.kind === 'media');
  requireEvidence(prior.length === 7 && evidence.rows?.length === 7 && evidence.reviewPlan?.length === 7
    && evidence.sources?.length === 7, 'Wrong seven-image follow-up');
  return prior.map(({row,source}) => {
    const snapshot = evidence.rows.filter(r => r.id === row.id);
    const sources = evidence.sources.filter(s => s.id === source.id);
    const plans = evidence.reviewPlan.filter(p => p.id === row.id), plan = plans[0];
    requireEvidence(snapshot.length === 1 && sources.length === 1 && plans.length === 1
      && JSON.stringify(snapshot[0]) === JSON.stringify(row)
      && JSON.stringify(sources[0]) === JSON.stringify(source), 'Prior source/claim snapshot drift');
    requireEvidence(plan.strength === null && plan.score === null && plan.scoreTargetId === null
      && plan.sourceCount === null && plan.independentSourcesAdded === 0 && plan.automaticPromotion === false,
    'Invented score or authority');
    requireEvidence(plan.media.sourceLocator === source.image_url
      && plan.transcription.fullImage === false && plan.transcription.humanApproved === false
      && plan.transcription.method === 'assistant_visual_inspection', 'Media/transcription provenance drift');
    if (plan.media.inspected) {
      requireEvidence(source.image_url.startsWith('https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/')
        && plan.media.access === 'public_url' && plan.media.downloadAttempted === true
        && /^[0-9a-f]{64}$/u.test(plan.media.sha256) && plan.media.bytes > 0
        && plan.media.width > 0 && plan.media.height > 0
        && plan.transcription.status === 'candidate_region_transcription' && plan.regions.length > 0,
      'Image access/fingerprint unavailable');
    } else {
      const objectId = source.image_url.replace(/^storage-object:/u,'');
      const access = evidence.storageChecks?.find(s => s.objectId === objectId);
      requireEvidence(source.image_url === `storage-object:${objectId}` && access?.public === false
        && access.downloadAttempted === false && plan.media.downloadAttempted === false
        && plan.media.access === 'nonpublic_storage_object'
        && plan.media.sha256 === null && plan.media.bytes === null && plan.regions.length === 0
        && plan.transcription.status === 'unavailable' && plan.recommendation === 'דורש OCR או תמלול',
      'Blocked image must remain unavailable');
    }
    const regions = new Map(plan.regions.map(r => [r.key,r]));
    requireEvidence(regions.size === plan.regions.length && plan.regions.every(r =>
      r.text?.length && r.note?.length && r.box?.length === 4 && r.box.every(n => Number.isFinite(n) && n >= 0 && n <= 1)
      && r.box[2] > 0 && r.box[3] > 0 && r.box[0]+r.box[2] <= 1 && r.box[1]+r.box[3] <= 1),
    'Invalid visual region');
    requireEvidence(new Set(plan.calculations.map(c => c.key)).size === plan.calculations.length, 'Duplicate calculation key');
    const calculations = plan.calculations.map((c,index) => {
      requireEvidence(c.claimed === null || Number.isSafeInteger(c.claimed), 'Invalid claimed value');
      requireEvidence(typeof c.diagnosticOnly === 'boolean' && Array.isArray(c.regions)
        && c.regions.every(k => regions.has(k)), 'Missing image-region binding');
      const regionText = c.regions.map(k => regions.get(k).text).join('\n');
      if (!c.diagnosticOnly) requireEvidence(plan.media.inspected && c.regions.length > 0,
        'Uninspected image cannot support a source claim');
      else requireEvidence(c.regions.length === 0, 'Historical diagnostic cannot pretend to be a visual quote');
      if (c.type === 'atomic') {
        requireEvidence(c.method === 'רגיל' && !/[0-9+×÷=]/u.test(c.expression)
          && (c.diagnosticOnly ? row.terms.includes(c.expression) : regionText.includes(c.expression)),
        'Unbound atomic transcription');
        const replay = c.claimed === null
          ? {engine_detail:{phrase:c.expression,method:c.method,claimed:null,computed:METHODS.find(m=>m.key===c.method).fn(c.expression)}}
          : verifyCandidate({type:'explicit-claim',text:c.expression,method:c.method,value:c.claimed});
        requireEvidence(Number.isSafeInteger(replay.engine_detail?.computed), 'Missing canonical local result');
        return {...c,index,trace:replay.engine_detail,
          verification:c.claimed === null ? 'engine_result' : replay.engine_verified === true ? 'match' : 'mismatch',
          engineInputs:[{role:`image_${c.key}`,phrase:c.expression,method:c.method,expected:replay.engine_detail.computed}]};
      }
      requireEvidence(c.type === 'compound' && c.constructed === true && c.constructionReason?.length
        && c.method === null && Number.isSafeInteger(c.claimed), 'Missing typed derivation provenance');
      const claims = extractCompoundClaims(c.expression), claim = claims[0];
      requireEvidence(claims.length === 1 && (claim.skipUsed === undefined || claim.skipUsed === 0)
        && claim.result === c.claimed, 'Ambiguous shared extraction');
      const operands = claim.operands || (claim.operand ? [claim.operand] : []);
      requireEvidence(operands.length > 0 && operands.every(o => o.ok && o.method === 'רגיל'
        && (c.diagnosticOnly ? row.terms.includes(o.phrase) : regionText.includes(o.phrase))),
      'Unbound compound operand');
      return {...c,index,trace:claim,verification:claim.status === 'ENGINE_VERIFIED_COMPOSITE' ? 'match' : 'mismatch',
        extractionIntegrity:computeExtractionIntegrity([claim],[]),extractionScope:'constructed_from_visual_regions',
        engineInputs:operands.map((o,i) => ({role:`image_${c.key}_${i}`,phrase:o.phrase,method:o.method,expected:o.value}))};
    });
    requireEvidence(['מתאים לעץ','דורש בדיקה','דורש OCR או תמלול'].includes(plan.recommendation)
      && plan.reason?.length && plan.gaps?.length && plan.geometry.verified === false, 'Missing bounded disposition');
    if (plan.recommendation === 'מתאים לעץ') requireEvidence(plan.media.inspected && row.targets.length === 1
      && calculations.length > 0 && calculations.every(c => !c.diagnosticOnly && c.verification !== 'mismatch')
      && calculations.some(c => c.claimed === row.value && c.verification === 'match'), 'Unready image recommendation');
    return {row,source,plan,calculations};
  });
}

export function buildImageSourceReceiptSql(evidence = readImageSourceReview()) {
  return buildSelectedReceiptSql(replayImageSourceReview(evidence));
}

export function buildImageSourceReport(evidence = readImageSourceReview(), receipt = readImageSourceReceipt()) {
  const selected = replayImageSourceReview(evidence), checks = validateSelectedReceipt(selected,receipt);
  const rows = selected.map(({row:r,source:s,plan:p,calculations}) => {
    const live = receipt.claims.find(c => c.id === r.id); validateLiveClaim(r,s,live);
    return {id:r.id,title:p.title,originalStatement:r.statement,sourceRef:r.source_ref,sourceId:s.id,
      sourceImage:p.media.inspected ? s.image_url : null,media:p.media,transcription:p.transcription,
      regions:p.regions,recommendation:p.recommendation,reason:p.reason,gaps:p.gaps,calculations,
      target:p.recommendation === 'מתאים לעץ' ? live.targets[0] : null,
      strength:null,score:null,scoreTargetId:null,sourceCount:null,independentSourcesAdded:0,
      interpretationVerified:false,geometry:p.geometry,identityOverlapIds:live.identity_overlaps.map(o=>o.id),
      retainIds:[r.id,...live.identity_overlaps.map(o=>o.id)],fullerFindingVersion:null,
      execute:false,suppress:false,automaticPromotion:false,publicationChanged:false};
  });
  requireEvidence(evidence.visualReuse?.length === 1 && evidence.visualReuse.every(g =>
    g.findingIds.length === 2 && new Set(g.findingIds).size === 2
    && g.findingIds.every(id => rows.some(r => r.id === id && r.media.inspected))
    && JSON.stringify(g.sourceIds) === JSON.stringify(g.findingIds.map(id => rows.find(r => r.id === id).sourceId))
    && g.findingIds.includes(g.fullerContextFindingId) && g.findingIds.includes(g.retainOriginalDetailFindingId)
    && g.sameFinding === false && g.byteIdentical === false && g.merge === false && g.suppress === false
    && g.independentSourcesAdded === 0), 'Visual reuse is not finding dedup authority');
  return {base:evidence.base,checkedAt:receipt.checked_at,rows,visualReuse:evidence.visualReuse,
    counts:{reviewed:rows.length,newCorpusRecords:0,imagesInspected:rows.filter(r=>r.media.inspected).length,
      imageAccessHeld:rows.filter(r=>!r.media.inspected).length,calculations:rows.flatMap(r=>r.calculations).length,
      canonicalChecks:checks.length,byRecommendation:rows.reduce((a,r)=>(a[r.recommendation]=(a[r.recommendation]||0)+1,a),{}),
      newFindings:0,promoted:0,deleted:0},execute:false};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || 'summary';
  if (mode === 'source-family') process.stdout.write(JSON.stringify(buildSourceFamilyReport(),null,2)+'\n');
  else if (mode === 'source-family-read-sql') process.stdout.write(buildSourceFamilyReadSql(Number(process.argv[3]))+'\n');
  else if (mode === 'source-family-receipt-sql') process.stdout.write(buildSourceFamilyReceiptSql()+'\n');
  else if (mode === 'source-text') process.stdout.write(JSON.stringify(buildSourceTextReport(),null,2)+'\n');
  else if (mode === 'source-text-read-sql') process.stdout.write(buildSourceTextReviewReadSql()+'\n');
  else if (mode === 'source-text-receipt-sql') process.stdout.write(buildSourceTextReceiptSql()+'\n');
  else if (mode === 'continuation') process.stdout.write(JSON.stringify(validateContinuationReceipt(),null,2)+'\n');
  else if (mode === 'continuation-read-sql') process.stdout.write(buildContinuationReadSql(Number(process.argv[3]))+'\n');
  else if (mode === 'continuation-replay-sql') process.stdout.write(buildContinuationReplaySql(Number(process.argv[3]))+'\n');
  else if (mode === 'numeric-batch-sql') process.stdout.write(buildNumericResidualReceiptSql() + '\n');
  else if (mode === 'numeric-batch') process.stdout.write(JSON.stringify(buildNumericResidualReview(),null,2) + '\n');
  else if (mode === 'numeric-batch2-sql') process.stdout.write(buildNumericResidualReceiptSql(readNumericResidualBatch2(),2) + '\n');
  else if (mode === 'numeric-batch2') process.stdout.write(JSON.stringify(buildNumericResidualReview(readNumericResidualBatch2(),readNumericResidualReceipt2(),2),null,2) + '\n');
  else if (mode === 'image-review-sql') process.stdout.write(buildImageSourceReceiptSql() + '\n');
  else if (mode === 'image-review') process.stdout.write(JSON.stringify(buildImageSourceReport(),null,2) + '\n');
  else process.stdout.write(buildResidualAuditSql(mode) + '\n');
}
