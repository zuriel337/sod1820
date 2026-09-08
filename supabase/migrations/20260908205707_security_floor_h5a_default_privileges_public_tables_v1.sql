-- H5 STEP 1 OF 2 — ROOT CAUSE FIRST, residue second.
-- The TRUNCATE/TRIGGER/REFERENCES residue on ~307 tables is not historical debris: it is an
-- ACTIVE DEFAULT. pg_default_acl showed postgres granting anon=Dxtm and authenticated=Dxtm
-- on every NEW table in schema public (D=TRUNCATE, x=REFERENCES, t=TRIGGER, m=MAINTAIN).
-- Revoking existing tables WITHOUT fixing this would silently regress on the next migration,
-- which is why the default is corrected BEFORE any table sweep.
-- Scope: the postgres default only. Migrations (including this one) run as postgres, so this
-- is the default that governs every table this project creates.
-- Reversible: alter default privileges in schema public grant truncate, references, trigger
--             on tables to anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
