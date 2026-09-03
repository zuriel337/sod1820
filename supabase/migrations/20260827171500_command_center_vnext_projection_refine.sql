-- Refine Command Center vNext projection after live source-distribution check.
-- Comments are actual replies/comments; other external research contributions are a distinct source.
-- System/admin/AI broadcasts are not Incoming Attention.

create or replace function public.admin_attention_feed_v1(
  p_include_handled boolean default false,
  p_limit integer default 800
)
returns table(
  attention_key text, source_type text, source_ref text, source_group text,
  actor_name text, title text, body text, context_label text, context_ref text,
  created_at timestamptz, status text, handled boolean, available_actions jsonb, metadata jsonb
)
language sql stable security definer set search_path=public as $$
with admin_ok as (
  select exists(select 1 from public.users u where u.id=auth.uid() and u.role='admin') ok
), raw(attention_key,source_type,source_ref,source_group,actor_name,title,body,context_label,context_ref,created_at,status,available_actions,metadata) as (
  select 'comment:'||c.id::text,'comment',c.id::text,
    coalesce(nullif(c.origin,''),nullif(c.target_type,''),'תגובות'),
    coalesce(c.author_name,'משתמש'),coalesce(nullif(c.title,''),'תגובה'),c.body,
    trim(both ' · ' from concat_ws(' · ',c.target_type,c.target_id,c.convergence_slug)),
    coalesce(c.convergence_slug,c.target_id,c.parent_id::text),c.created_at,coalesce(c.status,'new'),
    jsonb_build_array('handled','raziel','open'),
    jsonb_build_object('parent_id',c.parent_id,'target_type',c.target_type,'target_id',c.target_id,'intent',c.intent,'origin',c.origin)
  from public.research_contributions c,admin_ok a
  where a.ok and c.author_user_id is distinct from auth.uid()
    and coalesce(c.status,'') not in ('hidden','rejected')
    and (c.parent_id is not null or c.intent='תגובה')

  union all
  select 'contribution:'||c.id::text,'research_contribution',c.id::text,
    coalesce(nullif(c.origin,''),'תרומות מחקר'),coalesce(c.author_name,'משתמש'),
    coalesce(nullif(c.title,''),coalesce(c.intent,'תרומת מחקר')),c.body,
    trim(both ' · ' from concat_ws(' · ',c.target_type,c.target_id,c.convergence_slug)),
    coalesce(c.convergence_slug,c.target_id),c.created_at,coalesce(c.status,'new'),
    jsonb_build_array('handled','raziel','research_review','open'),
    jsonb_build_object('target_type',c.target_type,'target_id',c.target_id,'intent',c.intent,'origin',c.origin,'gematria_claim',c.gematria_claim)
  from public.research_contributions c,admin_ok a
  where a.ok and c.author_user_id is distinct from auth.uid()
    and coalesce(c.status,'') not in ('hidden','rejected')
    and c.parent_id is null and coalesce(c.intent,'')<>'תגובה'
    and coalesce(c.origin,'') not in ('auto-post','auto-core','broadcast')

  union all
  select 'hint:'||h.id::text,'community_hint',h.id::text,'דיווחי רמזים',coalesce(h.reporter_name,'גולש'),
    case when h.number is not null then 'רמז #'||h.number::text else 'דיווח רמז' end,coalesce(h.description,''),
    trim(both ' · ' from concat_ws(' · ',case when h.image_url is not null then 'עם תמונה' end,case when h.number is not null then 'מספר '||h.number::text end)),
    h.source_url,h.created_at,h.status,
    case when h.image_url is not null then jsonb_build_array('handled','raziel','gallery_review','open') else jsonb_build_array('handled','raziel','research_review','open') end,
    jsonb_build_object('number',h.number,'all_numbers',h.all_numbers,'image_url',h.image_url,'source_url',h.source_url,'occurred_at',h.occurred_at)
  from public.community_hints h,admin_ok a where a.ok and h.status='pending'

  union all
  select 'contact:'||m.id::text,'contact',m.id::text,'פניות',coalesce(m.name,m.email,'גולש'),coalesce(m.subject,'פנייה'),m.message,m.email,null,m.created_at,
    case when coalesce(m.read,false) then 'read' else 'new' end,jsonb_build_array('handled','raziel','reply','open'),jsonb_build_object('email',m.email,'read',m.read)
  from public.contact_messages m,admin_ok a where a.ok

  union all
  select 'dm:'||d.id::text,'direct_message',d.id::text,'הודעות',coalesce(u.display_name,u.email,'משתמש'),'הודעה פרטית',d.body,'הודעה פרטית אל צוריאל',d.from_user::text,d.created_at,
    case when d.read_at is null then 'new' else 'read' end,jsonb_build_array('handled','raziel','reply','open'),jsonb_build_object('from_user',d.from_user,'to_user',d.to_user,'read_at',d.read_at)
  from public.direct_messages d left join public.users u on u.id=d.from_user,admin_ok a where a.ok and d.to_user=auth.uid()

  union all
  select 'els:'||e.id::text,'els',e.id::text,'ELS',coalesce(e.author_name,'גולש'),coalesce(e.title,e.search_term,'ELS'),coalesce(e.description,e.search_term,''),
    trim(both ' · ' from concat_ws(' · ',e.torah_book,e.torah_section,case when e.skip_distance is not null then 'דילוג '||e.skip_distance::text end)),e.slug,e.created_at,e.status,
    jsonb_build_array('handled','raziel','els_review','open'),jsonb_build_object('search_term',e.search_term,'primary_number',e.primary_number,'engine_detail',e.engine_detail,'visibility',e.visibility)
  from public.els_records e,admin_ok a where a.ok and e.status in ('draft','pending','candidate') and e.owner_user_id is distinct from auth.uid()

  union all
  select 'wa:'||w.id::text,'whatsapp',w.id::text,coalesce(w.group_id,'WhatsApp'),coalesce(w.sender_name,w.sender,'WhatsApp'),'WhatsApp',coalesce(w.text_in,''),
    coalesce(w.action,w.bot_mode,'WhatsApp'),w.msg_id,w.created_at,coalesce(w.action,'new'),jsonb_build_array('handled','raziel','reply','open'),
    jsonb_build_object('group_id',w.group_id,'sender',w.sender,'msg_id',w.msg_id,'reply_out',w.reply_out,'bot_mode',w.bot_mode,'value',w.value)
  from public.wa_bot_log w,admin_ok a where a.ok and coalesce(w.text_in,'')<>''

  union all
  select 'channel:'||c.id::text,'channel',c.id::text,coalesce(c.channel,'ערוץ'),coalesce(c.speaker,c.credit,c.source,'ערוץ'),'עדכון ערוץ',c.text,
    coalesce(c.channel,c.source),c.link_url,c.created_at,coalesce(c.status,'new'),jsonb_build_array('handled','raziel','open'),
    jsonb_build_object('channel',c.channel,'source',c.source,'speaker',c.speaker,'credit',c.credit,'link_url',c.link_url,'ext_msg_id',c.ext_msg_id)
  from public.channel_updates c,admin_ok a
  where a.ok and coalesce(c.source,'') not in ('system','admin','ai')
    and lower(coalesce(c.credit,'')) not in ('sod1820','סוד 1820','סוד 1820','המערכת','רזיאל · ai')
    and coalesce(c.credit,'') not like '%1237%'

  union all
  select 'research:'||r.id::text,'research_object',r.id::text,coalesce(r.source,'מחקר'),coalesce(r.contributor,'מערכת'),coalesce(r.kind,'מועמד מחקר'),r.statement,
    coalesce(r.source_ref,r.source),r.source_ref,r.created_at,r.status,jsonb_build_array('handled','raziel','research_review','open'),
    jsonb_build_object('value',r.value,'terms',r.terms,'relates',r.relates,'confidence',r.confidence,'engine_verified',r.engine_verified,'privacy_scope',r.privacy_scope)
  from public.research_objects r,admin_ok a where a.ok and r.status='candidate'
), marked as (
  select r.*,(i.id is not null) handled
  from raw r left join public.research_items i
    on i.user_id=auth.uid() and i.bucket='handled' and i.entity_type=r.source_type and i.entity_ref=r.source_ref
)
select attention_key,source_type,source_ref,source_group,actor_name,title,body,context_label,context_ref,created_at,status,handled,available_actions,metadata
from marked where p_include_handled or not handled order by created_at desc limit greatest(1,least(coalesce(p_limit,800),2000));
$$;

grant execute on function public.admin_attention_feed_v1(boolean,integer) to authenticated;
