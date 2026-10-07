-- ZVI simple gematria backfill v1
-- Branch-only deterministic intake. Adds private research artifacts only.
-- No canonicalization/publication; every row is gated by the canonical רגיל engine.

with single_claims(source_id, kind, statement, expression, claimed_value, terms, slug) as (
  values
    ('5d4357c9-7921-4c6c-a40d-1ad29ddbd28e'::uuid,'observation','בראשית = 913','בראשית',913,array['בראשית','913']::text[],'bereshit-913'),
    ('ebe50a0c-912a-41ef-aa4a-97d8c846c244'::uuid,'question','למה מיכאל בגימטריא 101?','מיכאל',101,array['מיכאל','101']::text[],'michael-101-question'),
    ('63d07245-6fb2-4970-806a-0e777ae16967'::uuid,'observation','ברוך מחיה המתים = 786','ברוך מחיה המתים',786,array['ברוך מחיה המתים','786','תשפו']::text[],'baruch-mechaye-786'),
    ('de3b4c56-5ab1-4f96-bf06-d7e915de7ff0'::uuid,'observation','שבע ברכות = 1000','שבע ברכות',1000,array['שבע ברכות','1000']::text[],'sheva-brachot-1000'),
    ('bbf73c85-437e-4afd-b5ce-8c58683cc4a1'::uuid,'observation','ובחרת בחיים = 686','ובחרת בחיים',686,array['ובחרת בחיים','686']::text[],'uvacharta-bachaim-686'),
    ('d30951a5-544e-4301-9565-4b5979592a32'::uuid,'observation','ירמיהו = 271','ירמיהו',271,array['ירמיהו','271']::text[],'yirmiyahu-271'),
    ('a26cf646-a042-4b21-83cd-2bb267c2a1d2'::uuid,'observation','ים = 50','ים',50,array['ים','50']::text[],'yam-50'),
    ('7c59cf5b-39aa-41f2-8e4f-cd2fee2726e8'::uuid,'observation','ישראל בעל שם טוב = 1000','ישראל בעל שם טוב',1000,array['ישראל בעל שם טוב','1000']::text[],'besht-1000')
),
verified_single as (
  select c.*, public.fn_ragil(c.expression) engine_result
  from single_claims c
  join public.channel_updates cu on cu.id=c.source_id
  join public.gematria_methods gm on gm.method_key='רגיל'
  where cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
    and gm.active=true and gm.in_engine=true and gm.deterministic=true
    and gm.function='fn_ragil'
    and public.fn_ragil(c.expression)=c.claimed_value
)
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  v.kind,
  v.statement,
  v.claimed_value,
  v.terms,
  'research_triage',
  'channel_updates:'||v.source_id::text||'#zvi-simple-backfill:'||v.slug,
  'צבי (OPOC)',
  true,
  jsonb_build_object(
    'method','רגיל',
    'claimed_method','רגיל',
    'engine_method_tested','רגיל',
    'claimed_expression',v.expression,
    'claimed_value',v.claimed_value,
    'engine_result',v.engine_result,
    'verified_via','fn_ragil',
    'verification_state','match',
    'method_version_snapshot',public.fn_method_version_snapshot(array['רגיל'])
  ),
  'candidate',
  'private',
  jsonb_build_object(
    'ext',jsonb_build_object(
      'extraction_integrity',jsonb_build_object(
        'fidelity_status','verified_exact',
        'basis','explicit source claim + canonical fn_ragil verification'
      ),
      'presentation',jsonb_build_object(
        'v',1,
        'variants',jsonb_build_object(
          'he',jsonb_build_object(
            'title',v.statement,
            'summary','הערך המפורש בהודעת המקור שוחזר במנוע הגימטריה הקנוני.',
            'source_label','צבי (OPOC) · הודעת מקור'
          )
        )
      )
    )
  )
from verified_single v
where not exists (
  select 1 from public.research_objects ro
  where public.fn_research_source_uid(ro.source_ref)
        = public.fn_research_source_uid('channel_updates:'||v.source_id::text||'#zvi-simple-backfill:'||v.slug)
    and public.fn_research_claim_uid(ro.statement)=public.fn_research_claim_uid(v.statement)
);

-- Pair equality: both expressions independently verified.
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  'relation',
  'מודה אני לפניך = אשה = 306',
  306,
  array['מודה אני לפניך','אשה','306']::text[],
  'research_triage',
  'channel_updates:0bddbec3-7c72-41fb-a5a2-a54aff2b7f52#zvi-simple-backfill:modeh-isha-306',
  'צבי (OPOC)',
  true,
  jsonb_build_object(
    'method','רגיל',
    'values',jsonb_build_object('מודה אני לפניך',public.fn_ragil('מודה אני לפניך'),'אשה',public.fn_ragil('אשה')),
    'verified_via','fn_ragil',
    'verification_state','match',
    'method_version_snapshot',public.fn_method_version_snapshot(array['רגיל'])
  ),
  'candidate',
  'private',
  jsonb_build_object('ext',jsonb_build_object(
    'extraction_integrity',jsonb_build_object('fidelity_status','verified_exact','basis','two explicit source expressions + canonical fn_ragil verification'),
    'presentation',jsonb_build_object('v',1,'variants',jsonb_build_object('he',jsonb_build_object(
      'title','מודה אני לפניך = אשה = 306',
      'summary','שני הביטויים שוחזרו בנפרד במנוע הקנוני ונמצאו שווים ל־306.',
      'source_label','צבי (OPOC) · הודעת מקור'
    )))
  ))
from public.channel_updates cu
where cu.id='0bddbec3-7c72-41fb-a5a2-a54aff2b7f52'::uuid
  and cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
  and public.fn_ragil('מודה אני לפניך')=306
  and public.fn_ragil('אשה')=306
  and not exists (
    select 1 from public.research_objects ro
    where public.fn_research_source_uid(ro.source_ref)
          = public.fn_research_source_uid('channel_updates:0bddbec3-7c72-41fb-a5a2-a54aff2b7f52#zvi-simple-backfill:modeh-isha-306')
      and public.fn_research_claim_uid(ro.statement)=public.fn_research_claim_uid('מודה אני לפניך = אשה = 306')
  );

-- Triple equality: all three expressions independently verified.
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  'relation',
  'תשפ״ז = ותשועה = והושעת = 787',
  787,
  array['תשפז','ותשועה','והושעת','787']::text[],
  'research_triage',
  'channel_updates:3c338877-a574-49c0-90b3-ecd99ef0962a#zvi-simple-backfill:787-family',
  'צבי (OPOC)',
  true,
  jsonb_build_object(
    'method','רגיל',
    'values',jsonb_build_object(
      'תשפז',public.fn_ragil('תשפז'),
      'ותשועה',public.fn_ragil('ותשועה'),
      'והושעת',public.fn_ragil('והושעת')
    ),
    'verified_via','fn_ragil',
    'verification_state','match',
    'method_version_snapshot',public.fn_method_version_snapshot(array['רגיל'])
  ),
  'candidate',
  'private',
  jsonb_build_object('ext',jsonb_build_object(
    'extraction_integrity',jsonb_build_object('fidelity_status','verified_exact','basis','three explicit source expressions + canonical fn_ragil verification'),
    'presentation',jsonb_build_object('v',1,'variants',jsonb_build_object('he',jsonb_build_object(
      'title','תשפ״ז · ותשועה · והושעת = 787',
      'summary','שלושת הביטויים שוחזרו במנוע הקנוני ונמצאו שווים ל־787.',
      'source_label','צבי (OPOC) · הודעת מקור'
    )))
  ))
from public.channel_updates cu
where cu.id='3c338877-a574-49c0-90b3-ecd99ef0962a'::uuid
  and cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
  and public.fn_ragil('תשפז')=787
  and public.fn_ragil('ותשועה')=787
  and public.fn_ragil('והושעת')=787
  and not exists (
    select 1 from public.research_objects ro
    where public.fn_research_source_uid(ro.source_ref)
          = public.fn_research_source_uid('channel_updates:3c338877-a574-49c0-90b3-ecd99ef0962a#zvi-simple-backfill:787-family')
      and public.fn_research_claim_uid(ro.statement)=public.fn_research_claim_uid('תשפ״ז = ותשועה = והושעת = 787')
  );
