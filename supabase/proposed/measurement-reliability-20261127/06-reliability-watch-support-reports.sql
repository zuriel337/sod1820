-- PROPOSAL ONLY - NOT APPLIED (S1/S2, 27.11.2026). Needs ZURIEL's explicit approval for this exact file. COORDINATE WITH #1528 (one writer for fn_reliability_watch).
-- Owner: Reliability (fn_reliability_watch). Based on the LIVE definition read 27.11.2026 (md5 db5e1827ba3128023f992456778aacbe, which includes the 24.11 family-silence alert).
-- NOTE: #1528's supabase/proposed/app-health-incidents-20261123/apply.sql pins an OLDER md5 (3cc04b93...) and would refuse to run: its detector must be re-derived from the live text.
-- Change: (1) the recurring-incident alert stops reading issue_report events (free text no longer enters analytics); (2) a new block (c) alerts on >= 2 issue reports in 60 minutes
-- by COUNTING rows of the support store (public.feedback, context 'issue_report'). It never copies or shows what a person wrote.
\set ON_ERROR_STOP on
begin;
  set local lock_timeout = '5s';
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
    if position('(c) support reports (27.11.2026)' in v_def) > 0 then return; end if;  -- already applied
    if md5(v_def) <> 'db5e1827ba3128023f992456778aacbe' then raise exception 'fn_reliability_watch changed since the 27.11.2026 read (md5 %); re-read before applying', md5(v_def); end if;
    if (length(v_def) - length(replace(v_def, v_o1, ''))) / length(v_o1) <> 1 then raise exception 'anchor 1: not found exactly once'; end if;
    if right(v_def, length(v_ot)) <> v_ot then raise exception 'anchor 2 (function tail): unexpected'; end if;
    v_def := replace(v_def, v_o1, v_n1);
    execute left(v_def, length(v_def) - length(v_ot)) || v_nt;
  end $$;
commit;
