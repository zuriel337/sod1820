-- G3 People 2029 — public-safe Person read resolver.
-- Branch-only candidate; no live apply in this commit.
--
-- EXTEND_EXISTING:
--   * reads canonical public.persons as the identity root
--   * resolves Account + canonical Contributor lenses without creating another Person store
--   * does not infer identity/capability from names, emails or free-text role labels
--   * does not invent lifecycle/online state; person_state/person_daily have no live owner data yet
--   * public metrics count only approved/published shared contributions
--   * private/hidden source material and raw identity/contact fields are never returned
--
-- Public capability sources:
--   researcher = protected users.is_researcher OR explicit contributor.kind='researcher'
--   writer     = contributor.kind in ('writer','author')
--   author     = contributor.kind='author'
--   contributor= at least one public linked Contributor
--   vip        = explicit contributor.vip
-- senior_level and contributor.role text are presentation/legacy inputs only and never authoritative here.

create or replace function public.person_public_profile_v1(
  p_person_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
with person_row as (
  select
    p.person_id,
    p.account_user_id,
    p.first_seen,
    p.last_seen,
    p.created_at,
    u.username,
    u.display_name as user_display_name,
    u.avatar_url as user_avatar_url,
    u.created_at as account_created_at,
    coalesce(u.is_researcher,false) as account_is_researcher
  from public.persons p
  left join public.users u on u.id = p.account_user_id
  where p.person_id = p_person_id
),
linked_ids as (
  select c.id as contributor_id, 0 as source_priority
  from person_row pr
  join public.contributors c
    on pr.account_user_id is not null
   and c.user_id = pr.account_user_id

  union all

  select c.id as contributor_id, 1 as source_priority
  from person_row pr
  join public.identity_edges ie
    on ie.person_id = pr.person_id
   and ie.kind = 'legacy_seed'
  join public.contributors c
    on ie.legacy_id = 'contributor:' || c.id::text
),
linked_contributors as (
  select
    c.*,
    min(li.source_priority) as source_priority
  from linked_ids li
  join public.contributors c on c.id = li.contributor_id
  where nullif(btrim(coalesce(c.merged_into,'')),'') is null
  group by c.id
),
public_contributors as (
  select lc.*
  from linked_contributors lc
  where coalesce(lc.active,true)
    and not coalesce(lc.locked,false)
    and coalesce(lc.kind,'community') <> 'private'
),
primary_contributor as (
  select pc.*
  from public_contributors pc
  order by
    pc.source_priority,
    case pc.kind
      when 'researcher' then 0
      when 'writer' then 1
      when 'author' then 2
      when 'contributor' then 3
      when 'community' then 4
      when 'vip' then 5
      when 'external' then 6
      else 7
    end,
    pc.created_at,
    pc.id
  limit 1
),
eligibility as (
  select
    pr.*,
    (
      pr.account_user_id is not null
      or exists(select 1 from public_contributors)
    ) as is_public_eligible
  from person_row pr
),
public_contributions as (
  select distinct rc.id, rc.intent, rc.origin, rc.research_state, rc.status,
         rc.projected_insight_id, rc.created_at, rc.image_url, rc.media
  from eligibility e
  join public.research_contributions rc
    on (
      (e.account_user_id is not null and rc.author_user_id = e.account_user_id)
      or rc.author_contributor_id in (select id from public_contributors)
    )
  where e.is_public_eligible
    and rc.status in ('approved','published')
),
metric_row as (
  select
    count(*)::int as contribution_count,
    count(*) filter (
      where exists (
        select 1
        from public.contribution_links cl
        where cl.from_contribution_id = pc.id
          and cl.target_type = 'openweb_message'
      )
    )::int as message_count,
    count(*) filter (
      where pc.research_state in ('validated','canonical')
    )::int as validated_contribution_count,
    count(*) filter (
      where pc.projected_insight_id is not null
    )::int as projected_insight_count,
    count(*) filter (
      where nullif(btrim(coalesce(pc.image_url,'')),'') is not null
         or (pc.media is not null and pc.media <> '{}'::jsonb and pc.media <> '[]'::jsonb)
    )::int as media_count
  from public_contributions pc
),
activity_days as (
  select count(distinct day)::int as active_days
  from (
    select pc.created_at::date as day
    from public_contributions pc
    union
    select ua.created_at::date as day
    from eligibility e
    join public.user_activity ua on ua.user_id = e.account_user_id
    where e.account_user_id is not null
  ) d
),
capabilities as (
  select
    (
      coalesce((select account_is_researcher from eligibility),false)
      or exists(select 1 from public_contributors where kind='researcher')
    ) as researcher,
    exists(select 1 from public_contributors where kind in ('writer','author')) as writer,
    exists(select 1 from public_contributors where kind='author') as author,
    exists(select 1 from public_contributors) as contributor,
    exists(select 1 from public_contributors where coalesce(vip,false)) as vip
),
standing as (
  select
    case
      when c.researcher
       and e.account_user_id is not null
      then public.researcher_reputation(e.account_user_id)
      else null
    end as dossier
  from capabilities c
  cross join eligibility e
),
identity_count as (
  select
    (
      case when e.account_user_id is not null then 1 else 0 end
      + (select count(*) from public.identity_edges ie where ie.person_id=e.person_id)
    )::int as n
  from eligibility e
)
select
  case
    when not e.is_public_eligible then null
    else jsonb_build_object(
      'version','person-public-resolver-v1',
      'person',jsonb_build_object(
        'personRef','person:' || e.person_id::text || ':self',
        'displayName',coalesce(
          nullif(btrim(e.user_display_name),''),
          nullif(btrim(pc.display_name),''),
          nullif(btrim(e.username),''),
          'חבר קהילה'
        ),
        'username',nullif(btrim(e.username),''),
        'avatarUrl',coalesce(
          nullif(btrim(e.user_avatar_url),''),
          nullif(btrim(pc.avatar_url),'')
        ),
        'joinedAt',e.account_created_at,
        'firstSeen',e.first_seen,
        'lastSeen',e.last_seen,
        'activityState',null
      ),
      'identityCount',(select n from identity_count),
      'capabilities',jsonb_build_object(
        'researcher',c.researcher,
        'writer',c.writer,
        'author',c.author,
        'contributor',c.contributor,
        'vip',c.vip
      ),
      'metrics',jsonb_build_object(
        'messages',coalesce(m.message_count,0),
        'activeDays',coalesce(a.active_days,0),
        'hints',0,
        'media',coalesce(m.media_count,0),
        'findings',0,
        'sources',0,
        'methods',0,
        'els',0,
        'publications',0,
        'openThreads',0,
        'tenureDays',greatest(0,(current_date - e.first_seen::date))
      ),
      'communityImpact',jsonb_build_object(
        'score',null,
        'reactionsReceived',0,
        'uniqueResponders',0,
        'repliesReceived',0,
        'explain','[]'::jsonb
      ),
      'researchStanding',
        case
          when c.researcher and s.dossier is not null
          then jsonb_build_object(
            'level',null,
            'label',s.dossier->>'rank',
            'summary',null,
            'explain',jsonb_build_array(
              'accepted=' || coalesce(s.dossier->>'accepted','0'),
              'validated=' || coalesce(s.dossier->>'validated','0'),
              'promoted=' || coalesce(s.dossier->>'promoted_to_insights','0')
            ),
            'calibrationVersion',null
          )
          else null
        end,
      'whyNow','[]'::jsonb,
      'publicEvidence',jsonb_build_object(
        'contributionCount',coalesce(m.contribution_count,0),
        'validatedContributionCount',coalesce(m.validated_contribution_count,0),
        'projectedInsightCount',coalesce(m.projected_insight_count,0)
      )
    )
  end
from eligibility e
left join primary_contributor pc on true
cross join metric_row m
cross join activity_days a
cross join capabilities c
cross join standing s
$function$;

revoke all on function public.person_public_profile_v1(uuid) from public;
grant execute on function public.person_public_profile_v1(uuid) to anon, authenticated;

comment on function public.person_public_profile_v1(uuid) is
  'Public-safe Person Profile 2029 resolver over canonical persons. Returns null for ineligible/private-only Persons and never exposes contact/raw identity/source identifiers. Lifecycle is intentionally not inferred.';

create or replace function public.people_public_rows_v1(
  p_limit integer default 250,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
with bounded as (
  select
    least(greatest(coalesce(p_limit,250),1),500) as lim,
    greatest(coalesce(p_offset,0),0) as off
),
eligible_persons as (
  select p.person_id,p.last_seen
  from public.persons p
  where p.account_user_id is not null
     or exists (
       select 1
       from public.identity_edges ie
       join public.contributors c
         on ie.kind='legacy_seed'
        and ie.legacy_id='contributor:' || c.id::text
       where ie.person_id=p.person_id
         and nullif(btrim(coalesce(c.merged_into,'')),'') is null
         and coalesce(c.active,true)
         and not coalesce(c.locked,false)
         and coalesce(c.kind,'community') <> 'private'
     )
),
page as (
  select ep.person_id
  from eligible_persons ep
  order by ep.last_seen desc nulls last,ep.person_id
  limit (select lim from bounded)
  offset (select off from bounded)
),
profiles as (
  select public.person_public_profile_v1(page.person_id) as profile
  from page
)
select coalesce(
  jsonb_agg(profile) filter(where profile is not null),
  '[]'::jsonb
)
from profiles
$function$;

revoke all on function public.people_public_rows_v1(integer,integer) from public;
grant execute on function public.people_public_rows_v1(integer,integer) to anon, authenticated;

comment on function public.people_public_rows_v1(integer,integer) is
  'Public-safe bounded People 2029 row resolver. Returns canonical Person profiles only; source identities are never independent rows.';
