-- SOD1820 Research Path Foundation v1
-- Human-Gate approved by ZURIEL, 2026-09-07.
-- Foundation only: stable Path identity + immutable-ish revision lineage.
-- Legacy /journey UI, journey_saves, user_research.journeys and ELS engine are NOT replaced here.
-- Path Identity != Revision != Branch != User Save/Resume != Research Context != Claim.

create table if not exists public.research_paths (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by_user_id uuid null,
  parent_path_id uuid null references public.research_paths(id) on delete restrict,
  branch_point_revision_id uuid null,
  branch_point_step_index integer null check (branch_point_step_index is null or branch_point_step_index >= 0),
  identity_metadata jsonb not null default '{}'::jsonb,
  constraint research_paths_branch_fields_ck check (
    (parent_path_id is null and branch_point_revision_id is null and branch_point_step_index is null)
    or
    (parent_path_id is not null and branch_point_revision_id is not null and branch_point_step_index is not null)
  )
);

create table if not exists public.research_path_revisions (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.research_paths(id) on delete restrict,
  revision_no integer not null check (revision_no > 0),
  parent_revision_id uuid null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid null,
  governance_status text not null default 'candidate' check (governance_status in ('candidate','approved','canonical','rejected')),
  published_at timestamptz null,
  access_scope text not null default 'private',
  steps jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  representation jsonb not null default '{}'::jsonb,
  constraint research_path_revisions_steps_array_ck check (jsonb_typeof(steps) = 'array'),
  constraint research_path_revisions_path_revision_uq unique (path_id, revision_no),
  constraint research_path_revisions_path_id_id_uq unique (path_id, id)
);

-- A revision may descend only from a revision of the SAME Path identity.
alter table public.research_path_revisions
  add constraint research_path_revisions_parent_same_path_fk
  foreign key (path_id, parent_revision_id)
  references public.research_path_revisions(path_id, id)
  on delete restrict;

-- A forked Path must point to a revision that actually belongs to its parent Path.
alter table public.research_paths
  add constraint research_paths_branch_point_parent_fk
  foreign key (parent_path_id, branch_point_revision_id)
  references public.research_path_revisions(path_id, id)
  on delete restrict;

create index if not exists research_paths_parent_idx
  on public.research_paths(parent_path_id)
  where parent_path_id is not null;

create index if not exists research_path_revisions_path_created_idx
  on public.research_path_revisions(path_id, created_at desc);

create index if not exists research_path_revisions_governance_idx
  on public.research_path_revisions(governance_status, created_at desc);

alter table public.research_paths enable row level security;
alter table public.research_path_revisions enable row level security;

-- Closed-by-default Foundation. No client read/write path is authorized in this slice.
revoke all on table public.research_paths from anon, authenticated;
revoke all on table public.research_path_revisions from anon, authenticated;
grant all on table public.research_paths to service_role;
grant all on table public.research_path_revisions to service_role;

comment on table public.research_paths is
  'Canonical Research Path identity. Not a user save, claim, Research Context snapshot, or legacy Journey UI record.';
comment on table public.research_path_revisions is
  'Versioned ordered Research Path content. Governance and publication/access remain orthogonal; steps reference existing identities via contract, not a second entity system.';
comment on column public.research_path_revisions.steps is
  'Ordered step envelopes. v1 contract expects step_index/entity_type,entity_ref,locator,label_key where available; enforcement beyond array-shape belongs to a later bounded writer/validator slice.';
