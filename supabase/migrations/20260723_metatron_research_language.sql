-- 🕎 שפת-המחקר של SOD1820 (Research Extractor → מטטרון). הוחל ב-DB 23.7.2026; קובץ לתיעוד/שחזור.
-- כל מקור בעולם (וואטסאפ/אתר/OCR/קול/מסמך/פורום) מסתיים ב-5 סוגי-אובייקטים בלבד.
-- מטטרון קורא רק את השפה הזו — לא אכפת לו מהמקור. עץ-עובדות אחד: candidate → אישור → קנוני בגרף.
create table if not exists public.research_objects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('fact','relation','observation','hypothesis','question')),
  statement text not null,
  terms text[] default '{}',
  value int,
  relates text[] default '{}',
  source text,
  source_ref text,
  contributor text,
  confidence int,
  engine_verified boolean,      -- fact/relation אומת מול fn_all_methods
  engine_detail jsonb,
  evidence text,
  status text not null default 'candidate',   -- candidate | approved | rejected | canonical
  promoted_node_id uuid,
  parent_id uuid references public.research_objects(id) on delete set null,
  meta jsonb default '{}'::jsonb
);
alter table public.research_objects enable row level security;   -- server-only + RPC אדמין
create index if not exists ro_kind_status_idx on public.research_objects(kind, status, created_at desc);
create index if not exists ro_value_idx on public.research_objects(value) where value is not null;
create index if not exists ro_dedup_idx on public.research_objects(source_ref, kind, statement);

-- פיד-ביקורת (אדמין)
create or replace function public.admin_research_feed(p_status text default 'candidate', p_kind text default null, p_limit int default 100)
returns setof public.research_objects language sql security definer set search_path=public stable as $$
  select * from public.research_objects
  where status = p_status and (p_kind is null or kind = p_kind)
  order by created_at desc limit greatest(1, least(p_limit, 500));
$$;

-- מטא-מחקר: השאלות שמטטרון שואל בלי תלות במקור
create or replace function public.research_meta()
returns jsonb language sql security definer set search_path=public stable as $$
  select jsonb_build_object(
    'by_kind', (select jsonb_object_agg(kind, c) from (select kind, count(*) c from research_objects group by kind) x),
    'by_status', (select jsonb_object_agg(status, c) from (select status, count(*) c from research_objects group by status) y),
    'open_questions', (select count(*) from research_objects where kind='question' and status='candidate'),
    'hypotheses_confirmed', (select count(*) from research_objects where kind='hypothesis' and status='canonical'),
    'repeated_observations', (select coalesce(jsonb_agg(jsonb_build_object('value',value,'times',c)),'[]'::jsonb)
                              from (select value, count(distinct contributor) c from research_objects
                                    where kind in ('observation','fact') and value is not null
                                    group by value having count(distinct contributor) >= 2 order by c desc limit 10) z)
  );
$$;

-- שער-החקיקה: אישור/דחייה. אישור fact/relation → insight node + edge למספר בגרף.
create or replace function public.admin_research_review(p_id uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_admin boolean; r public.research_objects; v_num uuid; v_ins uuid;
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if auth.uid() is not null and not coalesce(v_admin,false) then raise exception 'admin only'; end if;
  select * into r from public.research_objects where id = p_id;
  if not found then return jsonb_build_object('ok',false,'error','not found'); end if;
  if p_decision = 'reject' then
    update public.research_objects set status='rejected' where id=p_id;
    return jsonb_build_object('ok',true,'status','rejected');
  end if;
  if r.kind in ('fact','relation') then
    if r.value is not null then
      select id into v_num from public.nodes where type='number' and label = r.value::text limit 1;
      if v_num is null then
        insert into public.nodes(type,label,description,metadata,is_active)
        values ('number', r.value::text, 'מספר '||r.value, jsonb_build_object('via','research_extractor'), true)
        returning id into v_num;
      end if;
    end if;
    insert into public.nodes(type,label,description,metadata,is_active)
    values ('insight', left(r.statement,120), r.statement,
            jsonb_build_object('kind',r.kind,'value',r.value,'terms',r.terms,'relates',r.relates,
                               'contributor',r.contributor,'source',r.source,'engine_verified',r.engine_verified),
            true)
    returning id into v_ins;
    if v_num is not null then
      insert into public.edges(from_node,to_node,relation_type,metadata)
      values (v_ins, v_num, 'has_value', jsonb_build_object('via','research_extractor'));
    end if;
    update public.research_objects set status='canonical', promoted_node_id=v_ins where id=p_id;
    return jsonb_build_object('ok',true,'status','canonical','insight_node',v_ins,'number_node',v_num);
  else
    update public.research_objects set status='approved' where id=p_id;
    return jsonb_build_object('ok',true,'status','approved','kind',r.kind);
  end if;
end; $$;

revoke all on function public.admin_research_feed(text,text,int) from public, anon;
revoke all on function public.admin_research_review(uuid,text) from public, anon;
revoke all on function public.research_meta() from public, anon;
grant execute on function public.admin_research_feed(text,text,int) to authenticated, service_role;
grant execute on function public.admin_research_review(uuid,text) to authenticated, service_role;
grant execute on function public.research_meta() to authenticated, service_role;

-- קרון (הוחל בנפרד): 'research-extract-scan' כל שעה → GET research-extract?mode=scan&hours=3
