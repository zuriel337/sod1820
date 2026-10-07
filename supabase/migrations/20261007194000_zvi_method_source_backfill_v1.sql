-- ZVI method/source backfill v1
-- Branch-only. Adds research candidates/approved-by-existing-standing-trigger only.
-- Does NOT canonicalize, publish, or widen access.

-- 1) Exact source transform: פשרה -> ובג״ץ in Atbash.
-- Registry declares Atbash final-letter-insensitive, so engine ובגצ and source ובג״ץ
-- are the same canonical letter sequence after final-form/punctuation normalization.
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  'relation',
  'פשרה באתב״ש → ובג״ץ; נרמול המנוע מחזיר ובגצ, והערך המחושב הוא 101.',
  101,
  array['פשרה','ובגץ','אתבש','101']::text[],
  'research_triage',
  'channel_updates:bd6c9e6b-fa15-4c91-ba75-7f3b66bcc2cd#zvi-method-backfill:atbash-peshara',
  'צבי (OPOC)',
  true,
  jsonb_build_object(
    'method','אתבש',
    'claimed_method','אתבש',
    'engine_method_tested','אתבש',
    'claimed_expression','פשרה',
    'claimed_transform','ובגץ',
    'engine_transform', public.fn_name_research('פשרה')->'transforms'->'atbash'->>'word',
    'engine_result', public.atbash_calc('פשרה'),
    'verified_via','fn_name_research+atbash_calc',
    'verification_state','match',
    'normalization', jsonb_build_object(
      'final_letter_sensitive', false,
      'punctuation_ignored', true
    ),
    'method_version_snapshot', public.fn_method_version_snapshot(array['אתבש'])
  ),
  'candidate',
  'private',
  jsonb_build_object(
    'ext', jsonb_build_object(
      'extraction_integrity', jsonb_build_object(
        'fidelity_status','verified_exact',
        'basis','source occurrence + canonical Atbash transform'
      ),
      'presentation', jsonb_build_object(
        'v',1,
        'variants',jsonb_build_object(
          'he',jsonb_build_object(
            'title','אתב״ש: פשרה → ובג״ץ',
            'summary','טענת המקור על טרנספורם אתב״ש שוחזרה במנוע הקנוני; צורת ץ הסופית מנורמלת לצ לפי הגדרת השיטה.',
            'source_label','צבי (OPOC) · הודעת מקור'
          )
        )
      )
    )
  )
from public.channel_updates cu
join public.gematria_methods gm on gm.method_key='אתבש'
where cu.id='bd6c9e6b-fa15-4c91-ba75-7f3b66bcc2cd'::uuid
  and cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
  and gm.active=true and gm.in_engine=true and gm.deterministic=true
  and gm.final_letter_sensitive=false
  and public.atbash_calc('פשרה')=101
  and public.fn_name_research('פשרה')->'transforms'->'atbash'->>'word'='ובגצ'
  and not exists (
    select 1 from public.research_objects ro
    where public.fn_research_source_uid(ro.source_ref)
          = public.fn_research_source_uid('channel_updates:bd6c9e6b-fa15-4c91-ba75-7f3b66bcc2cd#zvi-method-backfill:atbash-peshara')
      and public.fn_research_claim_uid(ro.statement)
          = public.fn_research_claim_uid('פשרה באתב״ש → ובג״ץ; נרמול המנוע מחזיר ובגצ, והערך המחושב הוא 101.')
  );

-- 2) Shofar source: preserve source-attested Miluy variant without forcing generic fn_miluy.
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  'observation',
  'אלוהים במילוי ה׳ עם יוד = 300 — טענת מקור; וריאנט המילוי טרם קושר לזהות מנוע קנונית נפרדת.',
  300,
  array['אלוהים','מילוי','300','שופר']::text[],
  'research_triage',
  'channel_updates:36066382-23de-46e5-a642-7a579a8b3247#zvi-method-backfill:miluy-heh-yud-300',
  'צבי (OPOC)',
  false,
  jsonb_build_object(
    'claimed_method','מילוי',
    'claimed_expression','אלוהים',
    'claimed_value',300,
    'source_method_variant','ה׳ עם יוד',
    'generic_fn_miluy_result', public.fn_miluy('אלוהים'),
    'verification_state','method_variant_unresolved',
    'source_method_basis','source_occurrence_explicit_variant'
  ),
  'candidate',
  'private',
  jsonb_build_object(
    'ext', jsonb_build_object(
      'extraction_integrity', jsonb_build_object(
        'fidelity_status','verified_exact',
        'basis','verbatim source claim; method variant intentionally unresolved'
      ),
      'presentation', jsonb_build_object(
        'v',1,
        'variants',jsonb_build_object(
          'he',jsonb_build_object(
            'title','טענת מקור: אלוהים במילוי ה׳ עם יוד · 300',
            'summary','המקור מציין וריאנט מילוי מפורש. הוא נשמר להצגה ולמחקר, אך אינו מסומן כמאומת עד שהווריאנט יקבל זהות מנוע קנונית.',
            'source_label','צבי (OPOC) · הודעת מקור'
          )
        )
      )
    )
  )
from public.channel_updates cu
where cu.id='36066382-23de-46e5-a642-7a579a8b3247'::uuid
  and cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
  and not exists (
    select 1 from public.research_objects ro
    where public.fn_research_source_uid(ro.source_ref)
          = public.fn_research_source_uid('channel_updates:36066382-23de-46e5-a642-7a579a8b3247#zvi-method-backfill:miluy-heh-yud-300')
      and public.fn_research_claim_uid(ro.statement)
          = public.fn_research_claim_uid('אלוהים במילוי ה׳ עם יוד = 300 — טענת מקור; וריאנט המילוי טרם קושר לזהות מנוע קנונית נפרדת.')
  );

-- 3) Shofar source: preserve "אחורית" exactly, without assuming אלוקים == אלהים.
insert into public.research_objects
  (kind, statement, value, terms, source, source_ref, contributor,
   engine_verified, engine_detail, status, privacy_scope, meta)
select
  'observation',
  'אלוקים בגימטריא אחורית = 200 — טענת מקור; התאמה ל־משולש מילה קיימת עבור האיות אלהים, אך זהות הייצוג אלוקים↔אלהים טרם הוכרעה.',
  200,
  array['אלוקים','אלהים','אחורית','200','שופר']::text[],
  'research_triage',
  'channel_updates:36066382-23de-46e5-a642-7a579a8b3247#zvi-method-backfill:ahorit-200',
  'צבי (OPOC)',
  false,
  jsonb_build_object(
    'claimed_expression','אלוקים',
    'claimed_value',200,
    'source_method_label','אחורית',
    'candidate_canonical_method','משולש מילה',
    'candidate_engine_expression','אלהים',
    'candidate_engine_result', public.triangle_word_calc('אלהים'),
    'verification_state','partial_needs_review',
    'unresolved_reason','source orthography אלוקים vs engine expression אלהים is not yet identity-resolved'
  ),
  'candidate',
  'private',
  jsonb_build_object(
    'ext', jsonb_build_object(
      'extraction_integrity', jsonb_build_object(
        'fidelity_status','verified_exact',
        'basis','verbatim source claim; representation identity intentionally unresolved'
      ),
      'presentation', jsonb_build_object(
        'v',1,
        'variants',jsonb_build_object(
          'he',jsonb_build_object(
            'title','טענת מקור: אלוקים באחורית · 200',
            'summary','הטענה נשמרת כשיטת מקור. קיימת התאמה מספרית למנוע עבור האיות אלהים, אך המערכת אינה ממזגת איותים בלי זהות קנונית.',
            'source_label','צבי (OPOC) · הודעת מקור'
          )
        )
      )
    )
  )
from public.channel_updates cu
where cu.id='36066382-23de-46e5-a642-7a579a8b3247'::uuid
  and cu.contributor_id='c66f0464-0928-490e-be9b-66d8a87e7fc8'::uuid
  and public.triangle_word_calc('אלהים')=200
  and not exists (
    select 1 from public.research_objects ro
    where public.fn_research_source_uid(ro.source_ref)
          = public.fn_research_source_uid('channel_updates:36066382-23de-46e5-a642-7a579a8b3247#zvi-method-backfill:ahorit-200')
      and public.fn_research_claim_uid(ro.statement)
          = public.fn_research_claim_uid('אלוקים בגימטריא אחורית = 200 — טענת מקור; התאמה ל־משולש מילה קיימת עבור האיות אלהים, אך זהות הייצוג אלוקים↔אלהים טרם הוכרעה.')
  );
