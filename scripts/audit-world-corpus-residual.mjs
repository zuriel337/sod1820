// Offline audit SQL composer. No database credentials or execution path.
// Reuse the exact staged cohort SELECTs; never execute migration bodies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(buildResidualAuditSql(process.argv[2] || 'summary') + '\n');
}
