-- BOOKS_2029_PUBLIC_RESEARCH_PROJECTION_V1
--
-- Stage 2 only: create the bounded, surface-specific public read model. This
-- migration intentionally publishes zero rows. A later Human-Gate migration
-- must record an approved decision_ledger cohort and insert exact reviewed
-- snapshots before any research becomes readable here.
--
-- Important boundaries:
--   * research_objects remains ungranted to anon/authenticated.
--   * privacy_scope/status/verification on research_objects are untouched.
--   * public_candidate alone never enters this projection.
--   * raw research_objects.meta/evidence/engine_detail are not copied.

create table if not exists public.book_research_public_v1 (
  id uuid primary key
    references public.research_objects(id) on delete restrict,
  book_node_id uuid not null
    references public.nodes(id) on delete restrict,
  decision_ledger_id uuid not null
    references public.decision_ledger(id) on delete restrict,

  -- Safe, immutable-at-publication snapshot used by the existing Book reader.
  created_at timestamptz not null,
  kind text not null,
  statement text not null,
  terms text[] not null default '{}'::text[],
  value integer,
  source text,
  source_ref text not null,
  contributor text,
  confidence integer,
  engine_verified boolean,
  engine_detail jsonb not null default '{}'::jsonb,
  status text not null,
  privacy_scope text not null default 'public',
  meta jsonb not null default '{}'::jsonb,

  publication_state text not null default 'review',
  source_snapshot_md5 text not null,
  published_at timestamptz,
  projected_at timestamptz not null default now(),

  constraint book_research_public_v1_statement_not_blank
    check (btrim(statement) <> ''),
  constraint book_research_public_v1_source_ref_not_blank
    check (btrim(source_ref) <> ''),
  constraint book_research_public_v1_engine_detail_object
    check (jsonb_typeof(engine_detail) = 'object'),
  constraint book_research_public_v1_engine_detail_allowlist
    check ((engine_detail - 'verification_state') = '{}'::jsonb),
  constraint book_research_public_v1_public_scope_only
    check (privacy_scope = 'public'),
  constraint book_research_public_v1_empty_meta_only
    check (meta = '{}'::jsonb),
  constraint book_research_public_v1_state_check
    check (publication_state = any (array['review','published','withdrawn'])),
  constraint book_research_public_v1_publication_time_check
    check (
      (publication_state = 'review' and published_at is null)
      or (publication_state = any (array['published','withdrawn']) and published_at is not null)
    ),
  constraint book_research_public_v1_snapshot_md5_check
    check (source_snapshot_md5 ~ '^[0-9a-f]{32}$')
);

comment on table public.book_research_public_v1 is
  'Books 2029 public research read model. Empty by default. Rows are sanitized, Human-Gate-bound snapshots of research_objects; this table is a projection, never a second truth store.';
comment on column public.book_research_public_v1.decision_ledger_id is
  'Required Human-Gate publication decision. Never granted to public API roles.';
comment on column public.book_research_public_v1.source_snapshot_md5 is
  'Drift checksum for the reviewed safe-field snapshot; not a security primitive and never granted to public API roles.';
comment on column public.book_research_public_v1.engine_detail is
  'Sanitized engine detail: verification_state only. Raw engine_detail remains protected on research_objects.';
comment on column public.book_research_public_v1.meta is
  'Always empty in the public projection. Raw research_objects.meta remains protected.';

create index if not exists book_research_public_v1_book_state_created_idx
  on public.book_research_public_v1 (book_node_id, publication_state, created_at desc, id);

alter table public.book_research_public_v1 enable row level security;

drop policy if exists book_research_public_v1_read on public.book_research_public_v1;
create policy book_research_public_v1_read
  on public.book_research_public_v1
  for select
  to anon, authenticated
  using (publication_state = 'published');

-- Explicit public API contract. Internal decision/checksum/state columns stay
-- column-inaccessible even for rows admitted by RLS.
revoke all on table public.book_research_public_v1 from public, anon, authenticated;
grant select (
  id, book_node_id, created_at, kind, statement, terms, value, source,
  source_ref, contributor, confidence, engine_verified, engine_detail,
  status, privacy_scope, meta, published_at
) on table public.book_research_public_v1 to anon, authenticated;

-- Release tooling may materialize a separately approved cohort. Browser roles
-- receive no INSERT/UPDATE/DELETE privilege and no publication RPC is added.
grant select, insert, update, delete on table public.book_research_public_v1 to service_role;
