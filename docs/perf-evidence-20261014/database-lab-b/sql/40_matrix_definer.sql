-- ROLE B · parity matrix for the two definer RPCs: LIVE definition vs narrow-projection candidate (v3). Whole-jsonb equality + error parity, per caller context.
-- generated_at = now() is transaction-stable, so old and candidate are compared inside ONE transaction/statement.
\set ON_ERROR_STOP on
create or replace function lab_def_eq(kind text, p integer) returns table(v integer, k text, equal boolean, err_old text, err_new text, old_len integer, scope text, cu text, adm boolean)
language plpgsql as $$
declare o jsonb; n jsonb; eo text; en text;
begin
  begin if kind='dossier' then o := public.fn_number_dossier(p); else o := public.fn_number_journey(p); end if; exception when others then eo := sqlstate||':'||sqlerrm; end;
  begin if kind='dossier' then n := public.fn_number_dossier_v3(p); else n := public.fn_number_journey_v3(p); end if; exception when others then en := sqlstate||':'||sqlerrm; end;
  return query select p, kind, ((o is not distinct from n) and (eo is not distinct from en)), eo, en, length(o::text), o->>'projection_scope', current_user::text, (select public.rd_is_admin());
end $$;
grant execute on function lab_def_eq(text, integer) to anon, authenticated, lab_admin;
create or replace function lab_def_matrix() returns table(ctx text, v integer, k text, equal boolean, err_old text, err_new text, old_len integer, scope text, cu text, adm boolean)
language plpgsql as $$
declare vv integer; kk text; r record;
begin
  foreach kk in array array['dossier','journey'] loop
    foreach vv in array array[787,7871,7872,999999,0,-1,1,5,9,10,12,21,77,100,120,123,321,770,1000,1230,1820,7700,7710,100000,1000000,1000001,2147483647,-2147483648]::integer[] loop
      select * into r from lab_def_eq(kk, vv);
      ctx := coalesce(nullif(current_setting('lab.ctx', true),''),'?'); v := r.v; k := r.k; equal := r.equal; err_old := r.err_old; err_new := r.err_new; old_len := r.old_len; scope := r.scope; cu := r.cu; adm := r.adm; return next;
    end loop;
    select * into r from lab_def_eq(kk, null);   -- NULL input
    ctx := coalesce(nullif(current_setting('lab.ctx', true),''),'?'); v := null; k := r.k; equal := r.equal; err_old := r.err_old; err_new := r.err_new; old_len := r.old_len; scope := r.scope; cu := r.cu; adm := r.adm; return next;
  end loop;
end $$;
grant execute on function lab_def_matrix() to anon, authenticated, lab_admin;
