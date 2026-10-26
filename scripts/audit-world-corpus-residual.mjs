// Offline audit SQL composer. No database credentials or execution path.
// Reuse the exact staged cohort SELECTs; never execute migration bodies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { extractCompoundClaims, verifyCandidate, computeExtractionIntegrity } from '../src/lib/triage.js';
import { METHODS } from '../src/lib/gematria.js';

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

export function selectNextNumericResidualIds() {
  const previous = readReviewJson('world-corpus-residual-evidence-20261026.json');
  const reviewed = new Set(previous.replays.map(r => r.id));
  return previous.partitions.filter(p => p.lane === 'gematria').flatMap(p => p.ids)
    .filter(id => !reviewed.has(id)).sort().slice(0,40);
}

export function replayNumericResidualBatch(evidence = readNumericResidualBatch()) {
  const ids = selectNextNumericResidualIds();
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
        requireEvidence(c.method === 'רגיל' && !/[0-9+×÷=]/u.test(c.expression), 'Mixed input cannot be direct gematria');
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
      && calculations.every(c => c.verification === 'match'
        && (!c.extractionIntegrity || c.extractionIntegrity.fidelityStatus === 'complete'))
      && calculations.some(c => c.claimed === row.value) && row.targets?.length === 1
      && !['hypothesis','question'].includes(row.kind), 'Unready finding cannot be recommended for the tree');
    return {row,plan,source,calculations};
  });
}

export function buildNumericResidualReceiptSql(evidence = readNumericResidualBatch()) {
  return buildSelectedReceiptSql(replayNumericResidualBatch(evidence));
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
        AND ro.value=s.value AND to_jsonb(ro.terms)=s.terms
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
      (SELECT jsonb_agg(to_jsonb(m)) FROM public.gematria_methods m WHERE m.method_key='רגיל') methods`);
}

export function buildNumericResidualReview(evidence = readNumericResidualBatch(), receipt = readNumericResidualReceipt()) {
  const selected = replayNumericResidualBatch(evidence);
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
  requireEvidence(receipt && !Number.isNaN(Date.parse(receipt.checked_at))
    && /^[a-f0-9]{32}$/u.test(receipt.engine_definition_md5)
    && receipt.methods?.length === 1 && receipt.methods[0].method_key === 'רגיל'
    && receipt.methods[0].in_engine === true, 'Missing canonical receipt');
  requireEvidence(receipt.claims?.length === selected.length && new Set(receipt.claims.map(r => r.id)).size === selected.length,
    'Incomplete current claim receipt');
  const expected = selected.flatMap(r => r.calculations.flatMap(c => c.engineInputs.map(i => ({id:r.row.id,...i}))));
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
  if (mode === 'numeric-batch-sql') process.stdout.write(buildNumericResidualReceiptSql() + '\n');
  else if (mode === 'numeric-batch') process.stdout.write(JSON.stringify(buildNumericResidualReview(),null,2) + '\n');
  else if (mode === 'image-review-sql') process.stdout.write(buildImageSourceReceiptSql() + '\n');
  else if (mode === 'image-review') process.stdout.write(JSON.stringify(buildImageSourceReport(),null,2) + '\n');
  else process.stdout.write(buildResidualAuditSql(mode) + '\n');
}
