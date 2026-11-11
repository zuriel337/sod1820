CREATE OR REPLACE FUNCTION public.admin_candidate_decide(p_candidate_id uuid, p_decision text, p_reason_code text DEFAULT NULL::text, p_human_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c public.research_candidates; did uuid; hd text; evref uuid; hr text; prov jsonb;
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then raise exception 'not authorized'; end if;
  if p_decision not in ('approve','partial','reject') then raise exception 'bad decision'; end if;
  select * into c from public.research_candidates where id=p_candidate_id and status='pending';
  if c.id is null then raise exception 'candidate not found or already decided'; end if;
  hd := case p_decision when 'approve' then 'approve' when 'partial' then 'modify' else 'reject' end;
  begin evref := (select (jsonb_array_elements_text(c.evidence_refs))::uuid limit 1); exception when others then evref := null; end;
  -- ⚖️ כלל סמנטי: דחייה = לא מאשר את המסקנה/החיבור לפי הראיות והקריטריון — לא קביעה שהנתון שגוי.
  hr := coalesce(p_human_reason, '');
  prov := jsonb_build_object('who', c.created_by_agent, 'when', current_date, 'source','research_candidate');
  if p_decision = 'reject' then
    hr := nullif(trim(hr),'');
    hr := coalesce(hr, 'לא מאשר את החיבור/המסקנה לפי הראיות והקריטריון הנוכחי.')
          || ' [סמנטיקה: דחיית-מועמד ≠ הנתון שקרי — הראיות נשמרות, ניתן לחזור בראיה/קריטריון חדשים.]';
    prov := prov || jsonb_build_object('reject_semantics','conclusion_not_approved_under_current_evidence__NOT_data_false');
  end if;
  insert into public.decision_ledger(decision_type, subject_type, subject_ref, domain, created_by_agent, decided_by,
    human_decision, reason_code, human_reason, ai_reasoning, rules_snapshot, evidence, evidence_ref, provenance, result_ref, status, candidate)
  values ('convergence', c.subject_type, c.subject_ref, 'discovery', c.created_by_agent, auth.uid()::text,
    hd, p_reason_code, nullif(hr,''),
    'שופט ההתכנסויות: '||c.recommendation||' · '||(c.why->>'method_count')||' שיטות',
    c.rules_snapshot, jsonb_build_object('from_candidate', c.id, 'evidence_refs', c.evidence_refs),
    evref, prov, jsonb_build_object('candidate_id', c.id, 'recommendation', c.recommendation), 
    case p_decision when 'reject' then 'rejected' else 'confirmed' end, c.why)
  returning id into did;
  update public.research_candidates set status='decided', decision_id=did, decided_at=now() where id=c.id;
  perform public.fn_detect_patterns(3,'metatron');
  perform public.fn_detect_pattern_contradictions();
  return jsonb_build_object('decision_id', did, 'decision', hd, 'reason_code', p_reason_code,
    'pattern_key', 'convergence|'||hd||'|'||coalesce(p_reason_code,'∅'),
    'learning','ההחלטה נכנסה ל-decision_ledger (snapshot+reason_code)'||
       case when p_decision='reject' then ' · דחייה נשמרה כ«חיבור לא-מאושר», לא כ«נתון שגוי»' else '' end||
       '; מנוע-הדפוסים רץ — זיהוי בלבד, בלי הפעלת Preference.');
end $function$
