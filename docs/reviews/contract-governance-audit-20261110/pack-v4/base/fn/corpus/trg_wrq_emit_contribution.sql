CREATE OR REPLACE FUNCTION public.trg_wrq_emit_contribution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_val bigint;
begin
  if (new.status in ('approved','verified','created'))
     and (old.status is distinct from new.status)
     and new.submitted_by is not null then
     begin v_val := fn_ragil(new.extracted); exception when others then v_val := null; end;
     insert into contribution_events(user_id, kind, ref, value, source, metadata)
       values (new.submitted_by, 'word_approved', new.extracted, v_val, 'word_review_queue',
               jsonb_build_object('queue_id', new.id, 'status', new.status));
  end if;
  return new;
end $function$
