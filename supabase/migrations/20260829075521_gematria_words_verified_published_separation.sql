-- Verified != Published minimal foundation separation for gematria_words.
--
-- is_verified keeps its existing meaning: ENGINE VERIFICATION (unchanged).
-- is_published is a NEW, independent PUBLICATION / PUBLIC-ACCESS axis.
--
-- Human-Gate direction (ZURIEL, 2026-08-29): stop engine verification from
-- automatically publishing rows. No richer publication workflow, no status
-- enum, no parallel lifecycle -- the smallest correct separation only.
--
-- Grandfather rule: every row that is publicly exposed today (is_verified=true)
-- must remain exposed after this migration. Rows not currently public must not
-- become public by accident (is_published defaults to false).

-- 1) Schema: new column, safe default (nothing new is published by default)
alter table public.gematria_words
  add column is_published boolean not null default false;

-- 2) Grandfather backfill: preserve exactly today's exposure.
--    trg_bidim_sync fires on ANY UPDATE (no column filter) and would otherwise
--    trigger a full, pointless bidim rebuild for all 12,592 verified rows here
--    (is_verified is unchanged by this backfill) -- disabled for this statement only.
alter table public.gematria_words disable trigger trg_bidim_sync;
update public.gematria_words set is_published = true where is_verified = true;
alter table public.gematria_words enable trigger trg_bidim_sync;

-- 3) RLS: publication now requires BOTH verified and published.
--    Encryption clause unchanged/independent, as before.
drop policy if exists "anon_read_verified_gematria" on public.gematria_words;
create policy "anon_read_verified_gematria" on public.gematria_words
  for select
  using (
    ((is_encrypted = false) or (is_encrypted is null))
    and is_verified = true
    and is_published = true
  );

-- 4) Writers: 6 live, SECURITY DEFINER, admin-role-gated writers set
--    gematria_words.is_verified=true directly today, and under the OLD
--    single-flag RLS that already meant immediate publication. This is
--    exactly the "existing explicit Human-Gate approve/publish behavior"
--    the task direction said to preserve explicitly rather than lose to
--    the new is_published default. Every other statement in each function
--    is preserved byte-for-byte; only is_published=true is added alongside
--    each existing is_verified=true write.
--
--    Writers intentionally NOT touched (no is_verified=true write exists):
--    wa_add_word (queues / sets is_verified=false explicitly),
--    wa_add_vip_word (queues, never inserts a word row),
--    admin_add_alias / admin_edit_alias (alias-carrier rows stay unverified
--    by column default).

-- 4a) resolve_word_review (word_review_queue approve/edit -> corpus)
CREATE OR REPLACE FUNCTION public.resolve_word_review(p_id uuid, p_action text, p_edit text DEFAULT NULL::text, p_by text DEFAULT 'admin'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v record; v_phrase text; v_add_result text; v_word_id uuid;
begin
  select * into v from word_review_queue where id = p_id;
  if not found then return 'not_found'; end if;
  v_phrase := btrim(coalesce(nullif(p_edit,''), v.extracted));
  if p_action in ('approve','edit') then
    v_add_result := wa_add_word(v_phrase, coalesce(v.source,'review'), null);
    if v_add_result = 'possible_variant_queued' then
      update word_review_queue set status='merged', extracted=v_phrase, decided_by=p_by, decided_at=now(), updated_at=now() where id=p_id;
      return 'possible_variant_redirected:' || v_phrase;
    end if;
    select (fn_resolve_word_identity(v_phrase)->>'word_id')::uuid into v_word_id;
    if v_word_id is not null then
      update gematria_words
        set is_verified = true, is_published = true, visibility_reason = 'approved_by_admin', visibility_changed_at = now()
        where id = v_word_id and is_verified is distinct from true;
    end if;
    update word_review_queue set status='approved', extracted=v_phrase, decided_by=p_by, decided_at=now(), updated_at=now() where id=p_id;
    return 'approved:' || coalesce(v_add_result,'unknown');
  elsif p_action = 'reject' then
    update word_review_queue set status='rejected', decided_by=p_by, decided_at=now() where id=p_id; return 'rejected';
  elsif p_action in ('block','hide') then
    update word_review_queue set status='blocked', decided_by=p_by, decided_at=now() where id=p_id; return 'blocked';
  elsif p_action = 'merge' then
    update word_review_queue set status='merged', decided_by=p_by, decided_at=now() where id=p_id; return 'merged';
  elsif p_action = 'delete' then
    delete from word_review_queue where id=p_id; return 'deleted';
  end if;
  return 'noop';
end $function$;

-- 4b) add_entity
CREATE OR REPLACE FUNCTION public.add_entity(p_label text, p_world text, p_weight integer DEFAULT 3, p_tier text DEFAULT NULL::text, p_category text DEFAULT 'ישות'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ragil int; v_node uuid; v_gate jsonb; v_action text; v_word_id uuid;
begin
  if not exists (select 1 from users where id = auth.uid() and role = 'admin') then
    return 'error: forbidden (admin only)';
  end if;
  if p_label is null or length(trim(p_label)) = 0 then return 'skip: empty'; end if;
  p_label := trim(p_label);
  v_ragil := ragil_calc(p_label);
  select id into v_node from nodes where type='entity' and label = p_label limit 1;
  if v_node is null then
    insert into nodes (type, label, weight, is_active, metadata)
    values ('entity', p_label, p_weight, true,
      jsonb_build_object('world', p_world, 'value', v_ragil, 'source', 'entity_expansion_v1')
      || case when p_tier is not null then jsonb_build_object('tier', p_tier) else '{}'::jsonb end)
    returning id into v_node;
  end if;
  v_gate := fn_corpus_admission_gate(p_label, 'entity_expansion_v1', null, null, null);
  v_action := v_gate->>'action';
  if v_action = 'existing' then
    v_word_id := (v_gate->'identity'->>'word_id')::uuid;
    update gematria_words set is_verified = true, is_published = true, node_id = coalesce(node_id, v_node)
      where id = v_word_id and (is_verified is distinct from true or node_id is null);
    return p_label || ' = ' || v_ragil || ' (existing)';
  end if;
  insert into gematria_words (phrase, ragil, miluy, misratar, kadmi, gadol, siduri, atbash, albam,
    is_verified, is_published, category, source, node_id, created_by)
  values (p_label, v_ragil, miluy_calc(p_label), mistater_calc(p_label), kadmi_calc(p_label),
    gadol_calc(p_label), siduri_calc(p_label), atbash_calc(p_label), albam_calc(p_label),
    true, true, p_category, 'entity_expansion_v1', v_node, auth.uid());
  return p_label || ' = ' || v_ragil || case when v_action='review' then ' (possible_variant)' else '' end;
end; $function$;

-- 4c) admin_add_word
CREATE OR REPLACE FUNCTION public.admin_add_word(p_phrase text, p_vals jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_admin boolean; v_phrase text := btrim(p_phrase); v_gate jsonb; v_action text;
begin
  select (role = 'admin') into v_admin from users where id = auth.uid();
  if not coalesce(v_admin, false) then return 'denied'; end if;
  if v_phrase = '' then return 'empty'; end if;
  v_gate := fn_corpus_admission_gate(v_phrase, 'admin_curated', null, null, null);
  v_action := v_gate->>'action';
  if v_action = 'existing' then return 'exists'; end if;
  insert into gematria_words
    (phrase, ragil, misratar, miluy, kadmi, gadol, siduri, atbash, albam, ribua, ribua_gadol, hakpala, hakpala_gadol, miluy_demiluy, is_verified, is_published, source, category, created_by)
  values
    (v_phrase,
     coalesce((p_vals->>'ragil')::int, ragil_calc(v_phrase)),
     (p_vals->>'misratar')::int, (p_vals->>'miluy')::int, (p_vals->>'kadmi')::int, (p_vals->>'gadol')::int,
     (p_vals->>'siduri')::int, (p_vals->>'atbash')::int, (p_vals->>'albam')::int, (p_vals->>'ribua')::int,
     (p_vals->>'ribua_gadol')::int, (p_vals->>'hakpala')::int, (p_vals->>'hakpala_gadol')::int, (p_vals->>'miluy_demiluy')::int,
     true, true, 'admin_curated', 'מהחיפושים', auth.uid());
  return case when v_action = 'review' then 'added_possible_variant' else 'added' end;
end; $function$;

-- 4d) admin_promote_contrib_card
CREATE OR REPLACE FUNCTION public.admin_promote_contrib_card(p_slug text, p_card_key text, p_phrases text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_added int := 0; v_skipped int := 0; ph text; v_gate jsonb;
begin
  if not exists(select 1 from users where id = auth.uid() and role = 'admin') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  foreach ph in array coalesce(p_phrases, array[]::text[]) loop
    ph := btrim(ph);
    continue when ph = '' or ph !~ '[א-ת]' or char_length(ph) > 60;
    v_gate := fn_corpus_admission_gate(ph, 'contributor:'||p_slug, null, p_slug, null);
    if v_gate->>'action' = 'existing' then
      v_skipped := v_skipped + 1;
    else
      insert into gematria_words(phrase, ragil, misratar, gadol, siduri, miluy, kadmi, atbash, albam, ribua,
                                 miluy_demiluy, ribua_gadol, kadmi_gadol, hakpala, hakpala_gadol,
                                 all_values, source, category, notes, is_verified, is_published, created_by)
      values (ph, fn_ragil(ph), fn_misratar(ph), fn_gadol(ph), fn_siduri(ph), fn_miluy(ph), fn_kadmi(ph),
              fn_atbash(ph), fn_albam(ph), fn_ribua(ph),
              miluy_demiluy_calc(ph), ribua_gadol_calc(ph), kadmi_gadol_calc(ph), hakpala_calc(ph), hakpala_gadol_calc(ph),
              (select array_agg(distinct v order by v) from unnest(array[
                 fn_ragil(ph)::bigint, fn_misratar(ph)::bigint, fn_gadol(ph)::bigint, fn_siduri(ph)::bigint,
                 fn_miluy(ph)::bigint, fn_kadmi(ph)::bigint, fn_atbash(ph)::bigint, fn_albam(ph)::bigint,
                 fn_ribua(ph)::bigint, miluy_demiluy_calc(ph)::bigint, ribua_gadol_calc(ph)::bigint, kadmi_gadol_calc(ph)::bigint]) v where v is not null),
              'contributor:'||p_slug, 'מאגר_ערכים', 'אושר מדף-החוקר '||p_slug||' ע"י אדמין', true, true, auth.uid());
      v_added := v_added + 1;
    end if;
  end loop;

  update contributors set
    media = (select jsonb_agg(case when (e->>'f' = p_card_key or e->>'msg_id' = p_card_key)
              then e || jsonb_build_object('status','approved','approved_at', now()::text)
              else e end)
             from jsonb_array_elements(media) e),
    updated_at = now()
  where slug = p_slug;

  return jsonb_build_object('ok', true, 'added', v_added, 'skipped_existing', v_skipped);
end $function$;

-- 4e) promote_finding_to_dict
CREATE OR REPLACE FUNCTION public.promote_finding_to_dict(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_claim text; v_author text; v_vals int[]; v_seg text; v_phrase text; v_rag int;
  v_added text[] := '{}'; v_dup text[] := '{}'; v_bad text[] := '{}'; v_variant text[] := '{}';
  v_gate jsonb; v_action text;
begin
  if not exists(select 1 from users u where u.id=auth.uid() and u.role='admin') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  select gematria_claim->>'claim', author_name into v_claim, v_author
    from research_contributions where id = p_id;
  if v_claim is null or v_claim = '' then return jsonb_build_object('ok', false, 'error', 'no_claim'); end if;
  select array_agg(m[1]::int) into v_vals from regexp_matches(v_claim, '(\d+)', 'g') m;
  v_vals := coalesce(v_vals, '{}');
  for v_seg in select unnest(regexp_split_to_array(v_claim, '[=×xX*+()\[\]{}<>,;./\n–—-]')) loop
    v_phrase := btrim(regexp_replace(v_seg, '[^א-ת ]', '', 'g'));
    v_phrase := btrim(regexp_replace(v_phrase, ' +', ' ', 'g'));
    if v_phrase = '' or char_length(replace(v_phrase, ' ', '')) < 2 then continue; end if;
    if v_phrase !~ '^[א-ת]+( [א-ת]+)*$' then continue; end if;
    v_rag := ragil_calc(v_phrase);
    if not (v_rag = any(v_vals)) then
      if not (v_phrase = any(v_bad)) then v_bad := array_append(v_bad, v_phrase); end if;
      continue;
    end if;
    v_gate := fn_corpus_admission_gate(v_phrase, 'contribution:'||coalesce(nullif(v_author,''),'כתב'), p_id::text, v_author, v_rag);
    v_action := v_gate->>'action';
    if v_action = 'existing' then
      if not (v_phrase = any(v_dup)) then v_dup := array_append(v_dup, v_phrase); end if;
      continue;
    end if;
    if v_action = 'review' then
      if not (v_phrase = any(v_variant)) then v_variant := array_append(v_variant, v_phrase); end if;
    end if;
    insert into gematria_words(phrase, source, category, tags, is_verified, is_published, notes, created_by)
      values(v_phrase, coalesce(nullif(v_author,''), 'כתב'), 'רמזי כתבים',
             array[coalesce(nullif(v_author,''), 'כתב')], true, true, 'קודם מממצא-וואטסאפ (' || p_id || ')', auth.uid());
    v_added := array_append(v_added, v_phrase);
  end loop;
  return jsonb_build_object('ok', true, 'added', v_added, 'in_dict', v_dup, 'unverified', v_bad, 'possible_variant', v_variant, 'author', v_author);
end $function$;

-- 4f) wizard_build_convergence (core_phrases branch only -- candidate_phrases stays is_verified=false, untouched)
CREATE OR REPLACE FUNCTION public.wizard_build_convergence(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin text; v_slug text; v_value int; v_insight uuid; v_author text; v_cross text;
  v_core text[] := '{}'; v_cand text[] := '{}'; v_warn text[] := '{}';
  v_event bigint; v_card uuid; v_contrib uuid; v_decision uuid; v_node uuid;
  v_p text; v_r int; v_anchor text; v_bullets jsonb; v_cands jsonb;
  v_auid uuid; v_acid uuid; v_gate jsonb;
begin
  select coalesce(nullif(u.email,''),'admin') into v_admin from users u where u.id=auth.uid() and u.role='admin';
  if v_admin is null then return jsonb_build_object('error','forbidden'); end if;

  v_value  := (p->>'value')::int;
  v_slug   := nullif(p->>'slug','');
  v_insight := nullif(p->>'insight_id','')::uuid;
  v_author := coalesce(nullif(p->>'author',''),'חבר הקהילה');
  v_cross  := nullif(p->>'cross_note','');
  if v_value is null or v_slug is null then return jsonb_build_object('error','missing_value_or_slug'); end if;
  if exists (select 1 from topic_cards where slug=v_slug) then return jsonb_build_object('error','slug_exists','slug',v_slug); end if;

  for v_p in select jsonb_array_elements_text(coalesce(p->'core_phrases','[]'::jsonb)) loop
    v_r := fn_ragil(v_p);
    if v_r = v_value then
      v_core := array_append(v_core, v_p);
      v_gate := fn_corpus_admission_gate(v_p, 'wizard:'||v_author, v_slug, v_author, v_value);
      if v_gate->>'action' <> 'existing' then
        insert into gematria_words(phrase,source,category,is_verified,is_published,space,scale_level,created_by)
        values(v_p,'wizard:'||v_author, coalesce(p->>'domain','חידושי גולשים'), true, true,'core',0, auth.uid());
      else
        update gematria_words set is_verified=true, is_published=true, unverified_reason=null
          where id = (v_gate->'identity'->>'word_id')::uuid and not is_verified;
      end if;
    else
      v_warn := array_append(v_warn, v_p||' = '||v_r||' ≠ '||v_value);
    end if;
  end loop;

  for v_p in select jsonb_array_elements_text(coalesce(p->'candidate_phrases','[]'::jsonb)) loop
    v_r := fn_ragil(v_p);
    if v_r = v_value then
      v_cand := array_append(v_cand, v_p);
      v_gate := fn_corpus_admission_gate(v_p, 'wizard:'||v_author, v_slug, v_author, v_value);
      if v_gate->>'action' = 'new' or v_gate->>'action' = 'review' then
        insert into gematria_words(phrase,source,category,is_verified,space,scale_level,created_by)
        values(v_p,'wizard:'||v_author, coalesce(p->>'domain','חידושי גולשים'), false,'core',0, auth.uid());
      end if;
    else
      v_warn := array_append(v_warn, v_p||' = '||v_r||' ≠ '||v_value);
    end if;
  end loop;

  if array_length(v_core,1) is null then
    return jsonb_build_object('error','no_valid_core','warnings',to_jsonb(v_warn));
  end if;
  v_anchor := v_core[1];

  insert into discovery_events(value,kind,member_count,sample,title,status)
  values(v_value,'contributor_finding', coalesce(array_length(v_core,1),0)+coalesce(array_length(v_cand,1),0),
         coalesce(v_core,'{}') || coalesce(v_cand,'{}'), 'אשכול '||v_value||' — '||v_author,'new')
  returning id into v_event;

  foreach v_p in array v_core loop
    if v_p <> v_anchor then
      insert into relation_evidence(relation_type,method,a_phrase,b_phrase,value,note,source,engine_verified,status)
      values('convergence_candidate','רגיל',v_anchor,v_p,v_value,'גרעין אשכול-'||v_value||'. מאומת במנוע.','wizard:'||v_slug,true,'confirmed');
    end if;
  end loop;
  if array_length(v_cand,1) is not null then
    foreach v_p in array v_cand loop
      insert into relation_evidence(relation_type,method,a_phrase,b_phrase,value,note,source,engine_verified,status)
      values('convergence_candidate','רגיל',v_anchor,v_p,v_value,'מורחב — מועמד.','wizard:'||v_slug,true,'candidate');
    end loop;
  end if;
  if v_cross is not null then
    insert into relation_evidence(relation_type,method,a_phrase,b_phrase,value,note,source,engine_verified,status)
    values('cross_anchor','רגיל',v_anchor,v_cross,v_value,'חוליית-הצלבה: '||v_cross,'wizard:'||v_slug,true,'confirmed');
  end if;

  select coalesce(jsonb_agg(x||' = '||v_value),'[]'::jsonb) from unnest(v_core) x into v_bullets;
  select coalesce(jsonb_agg(x||' = '||v_value||' (מועמד)'),'[]'::jsonb) from unnest(v_cand) x into v_cands;

  insert into decision_ledger(decision_type,subject_type,subject_ref,domain,methods,candidate,ai_model,ai_score,ai_reasoning,
    rules_version,human_decision,decided_by,human_reason,provenance,source_event_id,result_ref,agents_involved,created_by_agent,status)
  values('convergence','number',v_value::text, coalesce(p->>'domain','gematria'), array['רגיל'],
    jsonb_build_object('theme',coalesce(p->>'title','אשכול '||v_value),'confirmed_core',v_bullets,'left_as_candidate',v_cands,'cross',coalesce(v_cross,'')),
    'wizard (admin)', 0.8, 'אשכול ragil='||v_value||' אושר דרך אשף-האדמין. כל הערכים אומתו ב-fn_ragil.',
    to_jsonb(array['equality_vs_convergence','partial_convergence_approval','unified_discovery_architecture']),
    case when array_length(v_cand,1) is null then 'approve' else 'modify' end, v_admin,
    'אושר דרך אשף התקנון. גרעין: '||array_to_string(v_core,' · '), jsonb_build_object('who',v_author,'value',v_value,'source',coalesce(v_insight::text,'')),
    v_event, jsonb_build_object('writer',v_author,'topic_card_slug',v_slug), array['wizard','metatron'], 'admin:'||v_admin,'applied')
  returning id into v_decision;

  insert into topic_cards(slug,title,subtitle,search_terms,numbers,highlight_numbers,findings,status,quality,meter_score,created_by,approved_at)
  values(v_slug, coalesce(nullif(p->>'title',''),'התכנסות '||v_value), coalesce(p->>'subtitle',''),
    v_core, array[v_value], array[v_value],
    jsonb_build_object('headline','הגרעין המאושר — עובדה מאומתת במנוע',
      'hint',coalesce(nullif(p->>'hint',''),'המספר '||v_value||' מקשר בין הביטויים. רמז בלבד, לא נבואה.'),
      'writer',v_author,'writer_convergence',true,'bullets',v_bullets,'candidates',v_cands,
      'caveat','עובדה = ערכי הגימטריה במנוע הרשמי. הקישורים התמטיים = רמז משלים, לא נבואה.'),
    'approved', coalesce((p->>'quality')::int,7), coalesce((p->>'meter')::int,72), v_author, now())
  returning id into v_card;

  begin v_node := sync_convergence(v_card); exception when others then v_node := null; end;

  v_auid := nullif(p->>'author_user_id','')::uuid;
  v_acid := nullif(p->>'author_contributor_id','')::uuid;
  if v_auid is null or v_acid is null then
    select c.user_id, c.id into v_auid, v_acid from contributors c
     where c.display_name = v_author or v_author = any(coalesce(c.wa_names,'{}')) limit 1;
  end if;

  insert into research_contributions(author_user_id,author_contributor_id,author_name,intent,origin,research_state,status,
    target_type,target_id,title,body,gematria_claim,convergence_slug,projected_insight_id)
  values(v_auid, v_acid, v_author,'חידוש','beit_midrash','validated','approved',
    'number', v_value::text, coalesce(nullif(p->>'title',''),'אשכול '||v_value),
    coalesce(nullif(p->>'body',''), array_to_string(v_core,' = ')||' = '||v_value),
    jsonb_build_object('value',v_value,'claim',array_to_string(v_core,' = ')||' = '||v_value,'verified',true),
    v_slug, v_insight)
  returning id into v_contrib;

  if v_insight is not null then
    update insights set
      panel_data = coalesce(panel_data,'{}'::jsonb) || jsonb_build_object('convergence_slug',v_slug,'contribution_id',v_contrib::text,'author',v_author),
      related_phrases = coalesce(related_phrases, coalesce(v_core,'{}') || coalesce(v_cand,'{}')),
      related_numbers = coalesce(related_numbers, array[v_value]),
      method_tags = coalesce(nullif(method_tags,'{}'), array['רגיל']),
      gematria_pairs = case when gematria_pairs is null or gematria_pairs = '{}'::jsonb
        then jsonb_build_object('members', jsonb_build_array(
               jsonb_build_object('phrase',v_core[1],'ragil',v_value),
               jsonb_build_object('phrase',coalesce(v_core[2],v_core[1]),'ragil',v_value)))
        else gematria_pairs end,
      convergence_score = greatest(coalesce(convergence_score,0),6), updated_at=now()
    where id=v_insight;
  end if;

  return jsonb_build_object('ok',true,'slug',v_slug,'topic_id',v_card,'contribution_id',v_contrib,
    'event_id',v_event,'decision_id',v_decision,'node_id',v_node,
    'core',to_jsonb(v_core),'candidates',to_jsonb(v_cand),'warnings',to_jsonb(v_warn));
end; $function$;
