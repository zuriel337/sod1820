do $$ begin if not exists (select 1 from vault.secrets where name='WA_WEBHOOK_TOKEN') then perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'WA_WEBHOOK_TOKEN','SOD1820 Green API webhook bearer token'); end if; end $$;
create or replace function public.wa_webhook_is_authorized(p_token text) returns boolean language sql stable security definer set search_path to 'public','vault' as $$ select coalesce(nullif(p_token,'') is not null and p_token=(select decrypted_secret from vault.decrypted_secrets where name='WA_WEBHOOK_TOKEN' order by created_at desc limit 1),false); $$;
revoke all on function public.wa_webhook_is_authorized(text) from public, anon, authenticated;
grant execute on function public.wa_webhook_is_authorized(text) to service_role, postgres;
