CREATE OR REPLACE FUNCTION public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text, p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint, p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb, p_is_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_person uuid;
begin
  -- ⛔ בוטים (זחלני-חיפוש/סקרייפרים) לא נרשמים — הם היו ~68% מהטבלה וניפחו את ה-DB בלי ערך.
  --    נתוני-זחילה אמיתיים ממילא מגיעים מ-GSC. לביטול: הסר את שתי השורות הבאות.
  if coalesce(p_is_bot,false) then return; end if;

  v_person := public.resolve_person(p_sod_id, p_app_context, p_via);
  insert into events (ts, sod_id, person_id, session_id, surface, event_type, path, ref_host,
                      via, app_context, device, journey_id, depth_reached, utm, is_bot, props)
    values (now(), p_sod_id, v_person, p_session_id, p_surface, p_event_type, p_path, p_ref_host,
            p_via, p_app_context, p_device, p_journey_id, p_depth, p_utm, false, p_props);
end $function$;
