-- G3 People / Identity Review 2029 — ADMIN READ-ONLY RPC CANDIDATE.
-- BRANCH-ONLY DOCUMENTATION. NOT A MIGRATION. DO NOT APPLY DIRECTLY.
-- When authorized, generate the real migration through the canonical Supabase migration workflow.
--
-- OWNER CHECK: EXTEND_EXISTING
-- person_foundation_contract_law v6 + identity_architecture_law v1
-- + researcher_page_law v2 + writer_material_home_law v4.
--
-- Privacy boundary:
-- - admin only;
-- - returns no raw email/phone;
-- - compares verified source email to site account internally and returns only match state;
-- - no merge/claim/delete/write side effect.

create or replace function public.admin_people_identity_review_v1(
  p_scope text default 'recent',
  p_limit integer default 250
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_scope text := case when p_scope in ('recent','verified','all') then p_scope else 'recent' end;
  v_limit integer := greatest(1, least(coalesce(p_limit,250),500));
  v_rows jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if not public.rd_is_admin() then
    raise exception 'admin only';
  end if;

  with source_ids as (
    select
      s.user_id as source_id,
      min(coalesce(nullif(s.display_name,''),s.user_name,'')) as display_name,
      lower(btrim(max(s.email))) as email_n,
      bool_or(s.email_verified) as email_verified,
      count(*)::integer as messages,
      count(distinct date(s.created_at))::integer as active_days,
      min(s.created_at) as first_seen,
      max(s.created_at) as last_seen,
      count(*) filter (where s.original_moderation_state='blocked')::integer as blocked
    from public.g3_openweb_import_stage s
    where s.user_id is not null
      and btrim(s.user_id)<>''
      and (
        v_scope='all'
        or (v_scope='verified' and s.email_verified is true)
        or (v_scope='recent' and s.created_at >= now()-interval '6 months')
      )
    group by s.user_id
  ),
  name_stats as (
    select
      lower(regexp_replace(btrim(coalesce(nullif(s.display_name,''),s.user_name,'')),'\\s+',' ','g')) as name_n,
      count(distinct s.user_id)::integer as historical_same_name_ids,
      count(distinct s.user_id) filter(where s.email_verified)::integer as verified_same_name_ids
    from public.g3_openweb_import_stage s
    where s.user_id is not null and btrim(s.user_id)<>''
    group by 1
  ),
  openweb_contributor_map as (
    select
      cl.target_id as source_id,
      case
        when count(distinct rc.author_contributor_id) filter(where rc.author_contributor_id is not null)=1
        then (array_agg(distinct rc.author_contributor_id) filter(where rc.author_contributor_id is not null))[1]
        else null
      end as contributor_id,
      count(distinct rc.author_contributor_id) filter(where rc.author_contributor_id is not null)::integer as contributor_id_count
    from public.contribution_links cl
    join public.research_contributions rc
      on rc.id=cl.from_contribution_id
    where cl.target_type='openweb_user'
    group by cl.target_id
  ),
  normalized as (
    select
      q.source_id,
      q.display_name,
      q.email_verified,
      q.messages,
      q.active_days,
      q.first_seen,
      q.last_seen,
      round(q.blocked::numeric/nullif(q.messages,0),4) as blocked_ratio,
      n.historical_same_name_ids,
      n.verified_same_name_ids,
      c.id as contributor_id,
      c.slug as contributor_slug,
      c.kind as contributor_kind,
      c.role as contributor_role,
      c.source as contributor_source,
      (c.user_id is not null) as linked_user,
      coalesce(m.contributor_id_count,0) as contributor_id_count,
      u.id as site_user_id,
      u.display_name as site_display_name,
      u.username as site_username
    from source_ids q
    join name_stats n
      on n.name_n=lower(regexp_replace(btrim(q.display_name),'\\s+',' ','g'))
    left join openweb_contributor_map m
      on m.source_id=q.source_id
    left join public.contributors c
      on c.id=m.contributor_id
    left join public.users u
      on q.email_verified
     and q.email_n is not null
     and lower(btrim(u.email))=q.email_n
  ),
  classified as (
    select n.*,
      case
        when n.contributor_id_count<>1
          then 'REVIEW'
        when n.site_user_id is not null
          and (
            lower(coalesce(n.site_display_name,''))=lower(n.display_name)
            or lower(coalesce(n.site_username,''))=lower(n.display_name)
          )
          then 'SITE_ACCOUNT_ANCHOR'
        when n.site_user_id is not null
          then 'SITE_ACCOUNT_EMAIL_MATCH_REVIEW_NAME'
        when n.email_verified and n.historical_same_name_ids=1
          then 'VERIFIED_UNIQUE_ANCHOR'
        when n.email_verified and n.historical_same_name_ids>1 and n.verified_same_name_ids=1
          then 'VERIFIED_PRIMARY_WITH_COLLISION_TAIL'
        when not n.email_verified
          and n.messages>=100 and n.active_days>=30 and n.blocked_ratio<0.20
          then 'LONG_LIVED_UNVERIFIED'
        when not n.email_verified and n.blocked_ratio>=0.80
          then 'HIGH_BLOCK_NOISE'
        when not n.email_verified and n.active_days=1 and n.messages<=3
          then 'ONE_DAY_THIN'
        else 'REVIEW'
      end as identity_state
    from normalized n
  ),
  bounded as (
    select *
    from classified
    order by
      case identity_state
        when 'SITE_ACCOUNT_ANCHOR' then 1
        when 'SITE_ACCOUNT_EMAIL_MATCH_REVIEW_NAME' then 2
        when 'VERIFIED_UNIQUE_ANCHOR' then 3
        when 'VERIFIED_PRIMARY_WITH_COLLISION_TAIL' then 4
        when 'LONG_LIVED_UNVERIFIED' then 5
        when 'REVIEW' then 6
        when 'HIGH_BLOCK_NOISE' then 7
        else 8
      end,
      messages desc,
      last_seen desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'source_id',source_id,
    'contributor_id',contributor_id,
    'contributor_slug',contributor_slug,
    'display_name',display_name,
    'identity_state',identity_state,
    'email_verified',email_verified,
    'site_account_match',(site_user_id is not null),
    'site_display_name',site_display_name,
    'site_username',site_username,
    'messages',messages,
    'active_days',active_days,
    'first_seen',first_seen,
    'last_seen',last_seen,
    'blocked_ratio',blocked_ratio,
    'historical_same_name_ids',historical_same_name_ids,
    'verified_same_name_ids',verified_same_name_ids,
    'linked_user',linked_user,
    'contributor_id_count',contributor_id_count,
    'contributor_kind',contributor_kind,
    'contributor_role',contributor_role,
    'contributor_source',contributor_source
  ) order by messages desc),'[]'::jsonb)
  into v_rows
  from bounded;

  select jsonb_build_object(
    'rows',count(*),
    'site_accounts',count(*) filter(where identity_state in ('SITE_ACCOUNT_ANCHOR','SITE_ACCOUNT_EMAIL_MATCH_REVIEW_NAME')),
    'verified_anchors',count(*) filter(where identity_state in ('VERIFIED_UNIQUE_ANCHOR','VERIFIED_PRIMARY_WITH_COLLISION_TAIL')),
    'review',count(*) filter(where identity_state not in ('SITE_ACCOUNT_ANCHOR','VERIFIED_UNIQUE_ANCHOR'))
  )
  into v_summary
  from (
    select value->>'identity_state' identity_state
    from jsonb_array_elements(v_rows)
  ) q;

  return jsonb_build_object(
    'generated_at',now(),
    'scope',v_scope,
    'summary',coalesce(v_summary,'{}'::jsonb),
    'rows',v_rows
  );
end
$function$;

revoke all on function public.admin_people_identity_review_v1(text, integer) from public, anon;
grant execute on function public.admin_people_identity_review_v1(text, integer) to authenticated;
