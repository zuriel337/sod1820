-- ROLLBACK for 06-reliability-watch-support-reports.sql. Restores the exact live 27.11.2026 text (md5 db5e1827...). NOT APPLIED.
\set ON_ERROR_STOP on
begin;
  do $$
  declare
    v_def text := pg_get_functiondef('public.fn_reliability_watch()'::regprocedure);
    v_o1 text := $q$and (surface = 'runtime_error' or event_type = 'issue_report')$q$;
    v_n1 text := $q$and surface = 'runtime_error'$q$;
    v_ot text := $q$
  end;
end;
$function$
$q$;
    v_nt text := $q$
  end;

  -- (c) support reports (27.11.2026): issue reports live in the authorized support store (public.feedback). COUNT ONLY, never the text.
  begin
    for r in
      select count(*) as n from public.feedback
      where context = 'issue_report' and created_at > now() - interval '60 minutes'
      having count(*) >= 2
    loop
      v_fp := md5('support_reports|issue_report');
      if not exists (select 1 from public.work_log where topic = '🚨 דיווחי תקלה חוזרים (אוטומטי)' and open_threads = 'fp:' || v_fp and created_at > now() - interval '6 hours') then
        insert into public.work_log(session_date, topic, what_we_did, status, open_threads)
        values (current_date, '🚨 דיווחי תקלה חוזרים (אוטומטי)',
          format('%s דיווחי תקלה ב-60 דקות האחרונות (מנגנון התמיכה). התוכן נקרא במנגנון התמיכה בלבד, לא כאן.', r.n), 'alert', 'fp:' || v_fp);
        begin
          perform public.notify_admin('🚨 סוד1820 — דיווחי תקלה חוזרים' || chr(10) || r.n || ' ב-60 דקות');
        exception when others then null;
        end;
      end if;
    end loop;
  exception when others then null;
  end;
end;
$function$
$q$;
  begin
    if position('(c) support reports (27.11.2026)' in v_def) = 0 then return; end if;  -- already rolled back
    if right(v_def, length(v_nt)) <> v_nt then raise exception 'unexpected tail; rollback by hand'; end if;
    v_def := replace(left(v_def, length(v_def) - length(v_nt)) || v_ot, v_n1, v_o1);
    if md5(v_def) <> 'db5e1827ba3128023f992456778aacbe' then raise exception 'the rest of fn_reliability_watch changed after the proposal; rollback by hand'; end if;
    execute v_def;
  end $$;
commit;
