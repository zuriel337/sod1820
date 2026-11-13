-- M0-A · Legacy tables closed to client writes - PROPOSED (production DB change, needs explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-E / §6 item 5; owner decision 12.11.2026: "close all seven"; no row is deleted.
-- Evidence (12.11.2026, read-only): no 2029 code writes these tables. lab_notes / lab_messages are written and read only by the
-- service-role Edge functions lab-reflect and wa-mora (service_role bypasses RLS and keeps its grants). The single client helper
-- that wrote chat_messages (src/lib/supabase.js sendChatMessage) has no importer.
--
--   table                   before (client)                                   after
--   words                   anon/auth INSERT (true), public SELECT            SELECT unchanged; INSERT closed
--   syncs                   anon/auth INSERT (true), public SELECT            SELECT unchanged; INSERT closed
--   chat_messages           anon/auth INSERT (length checks), public SELECT   SELECT unchanged (0 rows); INSERT closed
--   chiddush_submissions    anon/auth INSERT (true), admin SELECT             admin SELECT unchanged; INSERT closed
--   metatron_beta_feedback  anon/auth INSERT (true), no SELECT                INSERT closed
--   lab_notes               anon/auth INSERT/UPDATE/DELETE grants, public SELECT    all client writes closed; SELECT admin only
--   lab_messages            anon/auth INSERT/UPDATE/DELETE grants, public SELECT    all client writes closed; SELECT admin only
-- The admin-checked UPDATE/DELETE policies on lab_* are kept as they are (admin-only, inert without a client grant).
-- Rollback: supabase/proposed/ROLLBACK_20261112130500_m0a_legacy_client_writes_close.sql. Test: tests/sql/m0a_db_permissions_v1.sql.

revoke insert, update, delete on public.words, public.syncs, public.chat_messages, public.chiddush_submissions,
  public.metatron_beta_feedback, public.lab_notes, public.lab_messages from anon, authenticated;

drop policy if exists anon_insert_words on public.words;
drop policy if exists anon_insert_syncs on public.syncs;
drop policy if exists chat_public_insert on public.chat_messages;
drop policy if exists chiddush_public_insert on public.chiddush_submissions;
drop policy if exists beta_feedback_insert on public.metatron_beta_feedback;
drop policy if exists lab_notes_insert on public.lab_notes;
drop policy if exists lab_messages_insert on public.lab_messages;

-- lab_* reads: administrators only.
drop policy if exists lab_notes_read on public.lab_notes;
drop policy if exists lab_messages_read on public.lab_messages;
create policy lab_notes_admin_read on public.lab_notes for select to authenticated using ((select public.rd_is_admin()));
create policy lab_messages_admin_read on public.lab_messages for select to authenticated using ((select public.rd_is_admin()));
revoke select on public.lab_notes, public.lab_messages from anon;
