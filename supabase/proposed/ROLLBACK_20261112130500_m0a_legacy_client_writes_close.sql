-- Rollback of 20261112130500_m0a_legacy_client_writes_close.sql: the exact grants and policies read from the live catalogue on 12.11.2026.
grant insert on public.words, public.syncs, public.chat_messages, public.chiddush_submissions, public.metatron_beta_feedback to anon, authenticated;
grant insert, update, delete on public.lab_notes, public.lab_messages to anon, authenticated;
grant select on public.lab_notes, public.lab_messages to anon;

drop policy if exists lab_notes_admin_read on public.lab_notes;
drop policy if exists lab_messages_admin_read on public.lab_messages;
create policy lab_notes_read on public.lab_notes for select to public using (true);
create policy lab_messages_read on public.lab_messages for select to public using (true);

create policy anon_insert_words on public.words for insert to anon with check (true);
create policy anon_insert_syncs on public.syncs for insert to anon with check (true);
create policy chat_public_insert on public.chat_messages for insert to public
  with check (((length(content) >= 1) AND (length(content) <= 1000) AND ((length(author) >= 1) AND (length(author) <= 60))));
create policy chiddush_public_insert on public.chiddush_submissions for insert to anon, authenticated with check (true);
create policy beta_feedback_insert on public.metatron_beta_feedback for insert to anon, authenticated with check (true);
create policy lab_notes_insert on public.lab_notes for insert to public with check (true);
create policy lab_messages_insert on public.lab_messages for insert to public with check (true);
