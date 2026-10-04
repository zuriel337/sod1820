-- WA_TRUSTED_AUTHOR_TREE_ROUTING_V1
-- Extend the existing canonical WhatsApp source registry; do not create a parallel registry.

alter table public.channel_ingest_sources
  add column if not exists intake_mode text not null default 'off',
  add column if not exists outgoing_contributor text null;

alter table public.channel_ingest_sources
  drop constraint if exists channel_ingest_sources_intake_mode_check;

alter table public.channel_ingest_sources
  add constraint channel_ingest_sources_intake_mode_check
  check (intake_mode in ('research_first','story_first_selective','off'));

update public.channel_ingest_sources
set intake_mode = case
  when channel in ('torat-haremez','gilui-yomi','sfot-vheker') then 'research_first'
  when channel = 'or-geula' then 'story_first_selective'
  when channel = 'ki-la-hamelucha-gematria' then 'research_first'
  else intake_mode
end;

-- The connected WhatsApp account's manual outgoing messages are ZURIEL-authored.
-- Bot/API sends remain identified separately as Raziel AI in the ingest function.
update public.channel_ingest_sources
set outgoing_contributor = 'ZURIEL',
    use_sender_name = true,
    capture_outgoing = true,
    intake_mode = 'research_first'
where channel = 'ki-la-hamelucha-gematria';
