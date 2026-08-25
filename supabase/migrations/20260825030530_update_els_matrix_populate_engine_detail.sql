-- Pass 3 (els_pass3_engine_detail_population), edit-in-place path: same additive treatment as
-- save_els_matrix -- one new p_engine_detail jsonb param, coalesced so an edit that doesn't supply a
-- fresh envelope never blanks an existing one. Drop the old 4-arg overload immediately (same
-- CREATE-OR-REPLACE-creates-a-second-overload risk as save_els_matrix, this repo has hit it before).
CREATE OR REPLACE FUNCTION public.update_els_matrix(p_id uuid, p_positions jsonb DEFAULT NULL::jsonb, p_image_url text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_engine_detail jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_admin boolean; v_owner uuid;
begin
  if v_uid is null then raise exception 'must be logged in'; end if;
  select owner_user_id into v_owner from public.els_records where id = p_id;
  v_admin := exists(select 1 from public.users u where u.id = v_uid and u.role = 'admin');
  if not (v_admin or (v_owner is not null and v_owner = v_uid)) then
    raise exception 'not authorized';
  end if;
  update public.els_records set
    positions   = coalesce(p_positions, positions),
    image_url   = case when p_image_url is not null then nullif(p_image_url,'') else image_url end,
    description = case when p_description is not null then nullif(p_description,'') else description end,
    engine_detail = coalesce(p_engine_detail, engine_detail)
  where id = p_id;
end; $function$;

drop function if exists public.update_els_matrix(uuid, jsonb, text, text);
