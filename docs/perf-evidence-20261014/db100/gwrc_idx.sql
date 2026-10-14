create index concurrently gw_public_created on gematria_words (created_at desc nulls last) include (visibility_changed_at) where is_verified and is_published and (is_encrypted is null or is_encrypted = false);
create index concurrently gw_public_visibility on gematria_words (visibility_changed_at desc nulls last) include (created_at) where is_verified and is_published and (is_encrypted is null or is_encrypted = false);
create index concurrently gw_tags_gin on gematria_words using gin (tags) where is_verified;
create index concurrently rc_author_contrib_idx on research_contributions (author_contributor_id, created_at desc) where status = 'approved' and convergence_slug is not null;
create index concurrently rc_approved_created_idx on research_contributions (created_at desc) include (author_user_id, author_contributor_id, author_name) where status = 'approved';
