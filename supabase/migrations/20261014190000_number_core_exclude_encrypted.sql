-- Applied live (migration number_core_exclude_encrypted_20261014) with owner approval.
-- The public branches of fn_number_dossier / fn_number_journey run as the RLS-bypassing owner; the lean row source now
-- excludes encrypted words, matching what an anonymous caller of fn_number_lookup already sees.
create or replace function public.fn_number_lookup_core(p_value bigint)
returns table(method text, phrase text, value bigint, bid_id text)
language sql stable
set search_path to 'public'
as $$
  select b.method, b.phrase, b.value, b.bid_id
  from public.bidim b
  join public.gematria_words gw on gw.id = b.word_id
  where b.value = p_value and gw.is_verified = true and coalesce(gw.is_published, false) = true and gw.is_encrypted is not true;
$$;
revoke all on function public.fn_number_lookup_core(bigint) from public, anon, authenticated;
