-- Actual SQL assertions against both installed functions; duplicate-sensitive and ordered.
create or replace function public.lab_parity(v bigint, lim integer, cur text)
returns jsonb language plpgsql security invoker as $$
declare old_rows jsonb; new_rows jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(r)-'ordinality' order by ordinality),'[]'::jsonb)
 into old_rows from public.fn_number_lookup(v,lim,cur) with ordinality r;
 select coalesce(jsonb_agg(to_jsonb(r)-'ordinality' order by ordinality),'[]'::jsonb)
 into new_rows from public.fn_number_lookup_2029_page(v,lim,cur) with ordinality r;
 if old_rows is distinct from new_rows then
  raise exception 'parity failure role=% value=% limit=% cursor=%',current_user,v,lim,cur;
 end if;
 return jsonb_build_object('rows',jsonb_array_length(new_rows),'total_count',new_rows->0->'total_count');
end $$;
create or replace function public.lab_error(sql_text text) returns jsonb
language plpgsql security invoker as $$
declare st text; msg text;
begin
 execute sql_text;
 return jsonb_build_object('state',null);
exception when others then
 get stacked diagnostics st=returned_sqlstate,msg=message_text;
 return jsonb_build_object('state',st,'message',msg);
end $$;
grant execute on function public.lab_parity(bigint,integer,text),public.lab_error(text) to anon,authenticated,service_role,lab_admin,lab_denied;
