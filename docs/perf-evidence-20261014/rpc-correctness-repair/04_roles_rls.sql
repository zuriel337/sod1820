-- LOCAL lab replica of the live access contract (policies/grants read from live catalog, structure only; no identities, no data)
alter table gematria_words enable row level security; alter table bidim enable row level security; alter table gematria_methods enable row level security;
drop policy if exists bidim_public_read on bidim; drop policy if exists anon_read_verified_gematria on gematria_words; drop policy if exists gm_read on gematria_methods;
create policy bidim_public_read on bidim for select using (exists (select 1 from gematria_words gw where gw.id=bidim.word_id and gw.is_verified=true and gw.is_published=true));
create policy anon_read_verified_gematria on gematria_words for select using ((is_encrypted=false or is_encrypted is null) and is_verified=true and is_published=true);
create policy gm_read on gematria_methods for select using (true);
grant usage on schema public to anon, authenticated, lab_admin;
grant select on bidim, gematria_words, gematria_methods to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
