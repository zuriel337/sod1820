-- openweb_sso_secret() — קורא את ה-access token של OpenWeb SSO מה-Vault.
-- דפוס קנוני זהה ל-public.gsc_secrets(): SECURITY DEFINER, search_path נעול, service_role בלבד.
-- הסוד עצמו (OPENWEB_SSO_SHARED_SECRET) אוחסן ב-vault.secrets ב-27.8.2026 — לא נכתב לקוד/יומן.
-- הצרכן היחיד: Edge Function `openweb-sso` (הנדסת codeA→codeB מול spot.im).

create or replace function public.openweb_sso_secret()
returns table (access_token text)
language sql
security definer
set search_path to ''
as $$
  select (
    select decrypted_secret
      from vault.decrypted_secrets
     where name = 'OPENWEB_SSO_SHARED_SECRET'
     order by created_at desc
     limit 1
  );
$$;

-- ⛔ אף פעם לא ל-anon/authenticated — הסוד מגיע רק לשרת (rls_client_read_protocol).
revoke all on function public.openweb_sso_secret() from public, anon, authenticated;
grant execute on function public.openweb_sso_secret() to service_role;
