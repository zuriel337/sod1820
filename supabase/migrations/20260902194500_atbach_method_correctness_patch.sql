-- ATBACH METHOD CORRECTNESS PATCH — ZURIEL Human Gate, 2026-09-02
--
-- Scope:
--   1) Preserve generic method_key='אטבח' v1 and all historical bidim rows, but
--      remove it from governed scanning by setting scannable=false and correcting
--      its unsupported Maharshal attribution to an explicit LEGACY HYBRID label.
--   2) Implement the already-registered source identity אטבח_רבנו_חנאל additively.
--      It remains active=false and scannable=false. This migration only makes the
--      definition executable and fixture-verified; it does NOT activate it.
--   3) Leave אטבח_רשי untouched/unimplemented.
--   4) No bidim backfill/delete/rewrite.
--
-- Source-exact Rabenu Chananel reconstruction:
--   final glyphs normalize to base letters, then involution pairs
--   א↔ט · ב↔ח · ג↔ז · ד↔ו · ה↔נ · י↔צ · כ↔פ · ל↔ע · מ↔ס · ק↔ת · ר↔ש
--   The transformed representation is scored with canonical fn_ragil.

create or replace function public.fn_atbach_rabenu_hananel_transform(p text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select translate(
           translate(coalesce(p, ''), 'ךםןףץ', 'כמנפצ'),
           'אבגדהוזחטיכלמנסעפצקרשת',
           'טחזונדגבאצפעסהמלכיתשרק'
         );
$function$;

comment on function public.fn_atbach_rabenu_hananel_transform(text) is
  'Source-exact א״ט-ב״ח Rabenu Chananel transform, reconstructed/verified 2026-09-02. Final glyphs normalize to base letters, then pairs א-ט ב-ח ג-ז ד-ו ה-נ י-צ כ-פ ל-ע מ-ס ק-ת ר-ש. Preserves non-Hebrew representation characters; scoring is separate via fn_ragil.';

create or replace function public.fn_atbach_rabenu_hananel(p text)
returns integer
language sql
immutable
set search_path to 'public'
as $function$
  select public.fn_ragil(public.fn_atbach_rabenu_hananel_transform(p));
$function$;

comment on function public.fn_atbach_rabenu_hananel(text) is
  'Numeric scorer for source-exact א״ט-ב״ח Rabenu Chananel transform. Calls fn_atbach_rabenu_hananel_transform then canonical fn_ragil. Registered identity remains inactive/non-scannable until a separate Human Gate.';

grant execute on function public.fn_atbach_rabenu_hananel_transform(text) to anon, authenticated, service_role;
grant execute on function public.fn_atbach_rabenu_hananel(text) to anon, authenticated, service_role;

-- Hard fixture gate. Any mismatch aborts the migration atomically.
do $fixture_gate$
declare
  r record;
  v_actual integer;
begin
  -- Direct historical transformed-text control.
  if public.fn_atbach_rabenu_hananel_transform('סהדה') <> 'מנונ' then
    raise exception 'ATBACH Rabenu Chananel fixture failed: סהדה transform expected מנונ, got %',
      public.fn_atbach_rabenu_hananel_transform('סהדה');
  end if;

  -- Exact transformed-text witness preserved in the 2024 source-software image.
  if public.fn_atbach_rabenu_hananel_transform('מלכות שמים מלכות בית דוד ובניין בית המקדש')
       <> 'סעפדק רסצס סעפדק חצק ודו דחהצצה חצק נסתור' then
    raise exception 'ATBACH Rabenu Chananel transformed-text witness failed for מלכות שמים...';
  end if;

  for r in
    select * from (values
      ('סהדה'::text, 146::integer),
      ('סוף יצר הרע', 844),
      ('המשיח פועל בימינו', 783),
      ('דוד בן ישי בהתשעז', 800),
      ('גאולת פורים', 664),
      ('מלכות שמים מלכות בית דוד ובניין בית המקדש', 2368)
    ) as f(phrase, expected)
  loop
    v_actual := public.fn_atbach_rabenu_hananel(r.phrase);
    if v_actual is distinct from r.expected then
      raise exception 'ATBACH Rabenu Chananel numeric fixture failed: phrase=% expected=% actual=%',
        r.phrase, r.expected, v_actual;
    end if;
  end loop;
end
$fixture_gate$;

-- Quarantine the historical generic identity without changing its formula/version
-- or touching any persisted bidim result. active=true is intentionally preserved:
-- Engine Governance then classifies it as historical_public (Rank, Don't Hide),
-- rather than governed/scannable evidence.
update public.gematria_methods
set scannable = false,
    sub = 'LEGACY HYBRID v1 · historical SOD1820 substitution; attribution unresolved',
    soul = 'LEGACY formula preserved for provenance; not source-exact Rabenu Chananel and not verified as Maharshal/Rashi',
    source_of_truth = 'LEGACY SOD1820 engine v1 (fn_atbach), preserved unchanged for historical provenance. Method-definition reconciliation 2026-09-02 proved it is not source-exact Rabenu Chananel and its prior Maharshal attribution was unsupported. ZURIEL Human Gate: quarantine from governed scanning; Rank, Don''t Hide.'
where method_key = 'אטבח'
  and version = 1
  and function = 'fn_atbach';

if not found then
  raise exception 'Expected legacy אטבח v1 -> fn_atbach registry row not found; refusing silent patch';
end if;

-- Promote only the DEFINITION/verification state of the existing source identity.
-- Activation and scan admission remain explicitly closed.
update public.gematria_methods
set function = 'fn_atbach_rabenu_hananel',
    execution_kind = 'sql_function',
    in_engine = true,
    active = false,
    scannable = false,
    deterministic = true,
    version = 2,
    mathematical_family = 'base_additive_substitution',
    order_sensitive = false,
    word_boundary_sensitive = false,
    per_word_reset = false,
    full_phrase_continuation = true,
    final_letter_sensitive = false,
    sub = 'SOURCE-EXACT RECONSTRUCTION · Rabenu Chananel · verified fixtures · inactive/non-scannable',
    soul = null,
    source_of_truth = 'Direct Rabenu Chananel textual witness + SOD1820 source-software corpus. Definition: normalize final glyphs to bases; pairs א↔ט ב↔ח ג↔ז ד↔ו ה↔נ י↔צ כ↔פ ל↔ע מ↔ס ק↔ת ר↔ש; score transformed representation with canonical fn_ragil. Verified 2026-09-02 against historical סהדה→מנון and five independent source-software fixtures. ZURIEL Human Gate authorized implementation only; activation/scanning remain closed.',
    dependency_version = 2,
    dependency_verified_at = now(),
    dependency_rules = '[]'::jsonb,
    dependency_versions = '{}'::jsonb
where method_key = 'אטבח_רבנו_חנאל'
  and active = false
  and scannable = false;

if not found then
  raise exception 'Expected registered inactive identity אטבח_רבנו_חנאל not found; refusing silent patch';
end if;

-- Postconditions inside the same transaction.
do $post_gate$
declare
  legacy_state record;
  rabenu_state record;
begin
  select * into legacy_state from public.v_method_states where method_key='אטבח';
  if not found or legacy_state.scannable or legacy_state.method_version <> 1 or legacy_state.function <> 'fn_atbach' then
    raise exception 'Legacy אטבח quarantine postcondition failed';
  end if;

  select * into rabenu_state from public.v_method_states where method_key='אטבח_רבנו_חנאל';
  if not found
     or rabenu_state.active
     or rabenu_state.scannable
     or not rabenu_state.executable
     or not rabenu_state.engine_verified
     or rabenu_state.method_version <> 2
     or rabenu_state.function <> 'fn_atbach_rabenu_hananel' then
    raise exception 'Rabenu Chananel method-state postcondition failed';
  end if;
end
$post_gate$;
