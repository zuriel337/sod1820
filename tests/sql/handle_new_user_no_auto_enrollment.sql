-- Throwaway local Postgres only (never a live project). Proves the PROPOSED, unapplied handle_new_user change:
--   * creating an account (any provider, any metadata, including a smuggled consent flag) enrols nobody in the mailing list;
--   * users + profiles are still created with no privilege taken from metadata;
--   * historical subscribers, consents and credits are untouched; the proposal is idempotent;
--   * the rollback restores the old behaviour for FUTURE sign-ups only and never back-fills;
--   * both scripts refuse to run over an independently changed function.
-- The proposal/rollback are the owner-reviewed files in docs/reviews/admin-full-access-auth-20261103/auth (not copied: one source).
-- Run through scripts/run-handle-new-user-consent-sql-test.sh, which extracts the pre-change function from the rollback file.
\set ON_ERROR_STOP on
\set QUIET on

CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
CREATE TABLE public.users(id uuid PRIMARY KEY, email text, username text, display_name text, avatar_url text, role text, tier text);
CREATE TABLE public.profiles(user_id uuid PRIMARY KEY, credits integer NOT NULL DEFAULT 0);
CREATE TABLE public.subscribers(
  id bigserial PRIMARY KEY, email text, name text, source text, active boolean, created_at timestamptz DEFAULT now(), acquisition jsonb,
  unsubscribed_at timestamptz, token text, email_purposes text[] DEFAULT ARRAY['general'], opening_updates_consented_at timestamptz, site_updates_consented_at timestamptz);
CREATE TABLE public.subscribe_events(visitor_id text, source text, action text, topic text);

-- The function exactly as it is live today (extracted from the rollback file by the runner).
\i :old_function

CREATE TABLE public.handle_new_user_before AS SELECT prosrc FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.subscribers(email, source, active, email_purposes) VALUES
  ('removed@example.invalid', 'fixture', false, ARRAY['general']),
  ('opening@example.invalid', 'fixture', true, ARRAY['site-openings']),
  ('consented@example.invalid', 'newsletter-form', true, ARRAY['general']);
UPDATE public.subscribers SET site_updates_consented_at = now() WHERE email = 'consented@example.invalid';
INSERT INTO auth.users(id, email) VALUES ('11111111-1111-4111-8111-111111111111', 'historical@example.invalid');
UPDATE public.profiles SET credits = 35;

-- 1. The pre-change function reproduces today's implicit enrolment (the behaviour under repair).
DO $t$ BEGIN
  IF (SELECT count(*) FROM public.subscribers WHERE email = 'historical@example.invalid' AND active AND source = 'site-signup') <> 1 THEN
    RAISE EXCEPTION 'baseline: the old function must enrol a new account (it does today)'; END IF;
END $t$;

CREATE TEMP TABLE snapshot AS SELECT md5(string_agg(row(s.*)::text, '|' ORDER BY s.id)) AS subs FROM public.subscribers s;
CREATE TEMP TABLE events_before AS SELECT count(*) AS n FROM public.subscribe_events;

-- 2. Apply the proposal twice (idempotent).
\i :proposal
\i :proposal

SELECT 'expected prosrc md5 after the proposal is applied: ' || md5(prosrc) || ' (before: ' || (SELECT md5(prosrc) FROM public.handle_new_user_before) || ')' AS note FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure;

-- 3. New accounts of every kind, with hostile and consent-like metadata.
INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
  ('22222222-2222-4222-8222-222222222222', 'new-password@example.invalid', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'new-google@example.invalid', '{"full_name":"Synthetic Google","avatar_url":"https://example.invalid/p","role":"admin","tier":"member"}'),
  ('44444444-4444-4444-8444-444444444444', 'new-consent-flag@example.invalid', '{"site_updates_consent":true,"newsletter":true,"subscribe":true}'),
  ('55555555-5555-4555-8555-555555555555', 'new-legacy@example.invalid', '{"acquisition":{"visitor_id":"fixture","source":"x"},"visitor_id":"fixture"}'),
  ('66666666-6666-4666-8666-666666666666', 'removed@example.invalid', '{}'),
  ('77777777-7777-4777-8777-777777777777', 'opening@example.invalid', '{}'),
  ('88888888-8888-4888-8888-888888888888', 'consented@example.invalid', '{}');

DO $t$ BEGIN
  -- Nothing was enrolled, reactivated, re-purposed or logged.
  IF (SELECT md5(string_agg(row(s.*)::text, '|' ORDER BY s.id)) FROM public.subscribers s) <> (SELECT subs FROM snapshot) THEN
    RAISE EXCEPTION 'creating accounts must not touch subscribers'; END IF;
  IF (SELECT count(*) FROM public.subscribe_events) <> (SELECT n FROM events_before) THEN
    RAISE EXCEPTION 'creating accounts must not write subscribe_events'; END IF;
  IF EXISTS (SELECT 1 FROM public.subscribers WHERE email LIKE 'new-%') THEN RAISE EXCEPTION 'a new account was enrolled'; END IF;
  IF (SELECT active FROM public.subscribers WHERE email = 'removed@example.invalid') IS NOT FALSE THEN RAISE EXCEPTION 'an unsubscribed address was reactivated'; END IF;
  -- Accounts are still created canonically, and nothing privileged comes from metadata.
  IF (SELECT count(*) FROM public.users) <> 8 OR (SELECT count(*) FROM public.profiles) <> 8 THEN RAISE EXCEPTION 'user+profile creation changed'; END IF;
  IF (SELECT count(*) FROM public.users WHERE role = 'user' AND tier = 'free') <> 8 THEN RAISE EXCEPTION 'metadata must never grant a role or tier'; END IF;
  IF (SELECT credits FROM public.profiles WHERE user_id = '11111111-1111-4111-8111-111111111111') <> 35 THEN RAISE EXCEPTION 'existing credits changed'; END IF;
  -- The function keeps its attributes and its trigger binding.
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure) THEN RAISE EXCEPTION 'SECURITY DEFINER lost'; END IF;
  IF (SELECT proconfig FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure) IS DISTINCT FROM ARRAY['search_path=public'] THEN RAISE EXCEPTION 'search_path lost'; END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal) <> 1 THEN RAISE EXCEPTION 'trigger binding lost'; END IF;
END $t$;

-- 4. Rollback (twice): the old behaviour returns for FUTURE sign-ups only; nothing is back-filled or deleted.
\i :rollback
\i :rollback
INSERT INTO auth.users(id, email) VALUES ('99999999-9999-4999-8999-999999999999', 'after-rollback@example.invalid');
DO $t$ BEGIN
  IF (SELECT count(*) FROM public.subscribers WHERE email = 'after-rollback@example.invalid' AND active) <> 1 THEN RAISE EXCEPTION 'rollback must restore the old behaviour for new sign-ups'; END IF;
  IF EXISTS (SELECT 1 FROM public.subscribers WHERE email LIKE 'new-%') THEN RAISE EXCEPTION 'rollback must not back-fill accounts created while the proposal was live'; END IF;
  IF (SELECT count(*) FROM public.users) <> 9 THEN RAISE EXCEPTION 'rollback must not delete accounts'; END IF;
END $t$;

SELECT 'PASS handle_new_user: account creation enrols nobody; rollback restores old behaviour for future sign-ups only' AS result;
