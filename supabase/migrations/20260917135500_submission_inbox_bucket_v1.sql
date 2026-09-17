-- G3_SUBMISSION_INBOX_STORAGE_V1
-- Private physical intake boundary for unreviewed person/contributor submissions.
-- This is subordinate to existing Research Intake / contributor identity semantics;
-- it is NOT a new semantic store, registry, truth layer, or publication system.

insert into storage.buckets (id, name, public)
values ('submission-inbox', 'submission-inbox', false)
on conflict (id) do update
set public = false;

-- Deliberately no anon/authenticated storage.objects policies are added here.
-- The bucket remains private/server-mediated by default. Future user-facing upload
-- flows must use a governed signed/ticketed upload path and must not weaken this
-- read boundary merely to make uploads convenient.
