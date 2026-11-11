CREATE OR REPLACE FUNCTION public.wa_add_word(p_phrase text, p_source text DEFAULT 'wa-group'::text, p_note text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v text := btrim(coalesce(p_phrase,'')); v_gate jsonb; v_action text;
begin
  if v = '' or v !~ '[א-ת]' then return 'empty'; end if;
  if char_length(v) > 80 then return 'too_long'; end if;
  if _word_is_spam(v) then return 'rejected_spam'; end if;
  if exists (select 1 from gematria_blocklist b where v ilike '%'||b.pattern||'%') then return 'blocked'; end if;

  v_gate := fn_corpus_admission_gate(v, coalesce(p_source,'wa-group'), null, null, null);
  v_action := v_gate->>'action';
  if v_action = 'existing' then return 'exists'; end if;
  if v_action = 'review' then
    insert into word_review_queue (original_text, extracted, reason, kind, word_count, flags, similar_words, source, hits)
    values (v, v, coalesce(p_note,'possible_variant'), 'phrase', 1,
      jsonb_build_object('identity_classification','POSSIBLE_VARIANT'), v_gate->'identity'->'candidates', p_source, 1)
    on conflict (extracted) do update set hits = word_review_queue.hits + 1, updated_at = now();
    return 'possible_variant_queued';
  end if;

  insert into gematria_words
    (phrase, ragil, misratar, miluy, kadmi, gadol, siduri, atbash, albam, ribua, is_verified, source, category, notes, visibility_reason)
  values
    (v, ragil_calc(v), mistater_calc(v), miluy_calc(v), kadmi_calc(v), gadol_calc(v),
     siduri_calc(v), atbash_calc(v), albam_calc(v), ribua_calc(v),
     false, p_source, 'קבוצת וואטסאפ', p_note, 'pending_wa');
  return 'queued';
exception when others then return 'error';
end; $function$
