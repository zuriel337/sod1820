-- PHASE 1 · ZURIEL Human Gate (work_log befe06ce) · evidence 1bed2e14 / c592aa11.
-- (1) unchanged-phrase UPDATE no longer deletes HISTORICAL rows (only already-governed rows refresh).
--     Phrase-CHANGE invalidation is preserved exactly.
-- (2) the governed upsert can no longer RELABEL a historical row as 'governed'
--     (DO UPDATE applies only when the conflicting row is already governed).
CREATE OR REPLACE FUNCTION public.bidim_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  m record; v bigint; pr int;
  v_run uuid := gen_random_uuid();
  v_bid text;
begin
  if TG_OP = 'DELETE' then
    delete from public.bidim where word_id = OLD.id;
  elsif TG_OP = 'UPDATE' then
    if NEW.phrase is distinct from OLD.phrase then
      delete from public.bidim where word_id = OLD.id;
    else
      delete from public.bidim b
       where b.word_id = OLD.id
         and b.provenance_state = 'governed'
         and public.fn_method_is_scannable(b.method);
      update public.bidim b
         set category = NEW.category, is_verified = NEW.is_verified
       where b.word_id = OLD.id;
    end if;
  end if;

  if TG_OP not in ('INSERT', 'UPDATE') or not NEW.is_verified then
    return null;
  end if;

  for m in
    select s.method_key, s.category, s.operator, s.method_version, s.dependency_versions, s.sort_order
    from public.v_method_states s where s.scannable order by s.sort_order
  loop
    begin
      v := public.fn_method_value(m.method_key, NEW.phrase);
    exception when others then
      v := null;
    end;

    if v is not null then
      pr := case m.method_key when 'רגיל' then 1 when 'מסתתר' then 1 when 'קדמי' then 1
                              when 'מילוי' then 2 when 'אתבש' then 3 else 4 end;
      v_bid := public.fn_bidim_id(NEW.id, m.method_key, m.method_version,
                 case when m.category = 'composite' then m.operator else null end);

      insert into public.bidim (word_id, phrase, method, value, priority, category, is_verified,
                                bid_id, method_version, operator, dependency_version_snapshot,
                                computed_at, engine_run_id, provenance_state)
      values (NEW.id, NEW.phrase, m.method_key, v, pr, NEW.category, NEW.is_verified,
              v_bid, m.method_version,
              case when m.category = 'composite' then m.operator else null end,
              case when m.category = 'composite' then m.dependency_versions else null end,
              now(), v_run, 'governed')
      on conflict (bid_id) do update set
        value = excluded.value, phrase = excluded.phrase, is_verified = excluded.is_verified,
        category = excluded.category, priority = excluded.priority,
        method_version = excluded.method_version, operator = excluded.operator,
        dependency_version_snapshot = excluded.dependency_version_snapshot,
        computed_at = excluded.computed_at, engine_run_id = excluded.engine_run_id,
        provenance_state = 'governed'
      where public.bidim.provenance_state = 'governed';
    end if;
  end loop;
  return null;
end;
$function$;
