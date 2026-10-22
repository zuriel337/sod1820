\set ON_ERROR_STOP on

\ir els-native-save-fixture.sql
\ir ../supabase/migrations/20261022151109_replace_els_matrix_axis_v1.sql

insert into public.els_records(
  id, owner_user_id, search_term, scope, skip_distance, direction, start_index,
  corpus_id, term_norm, positions, title, description, status, visibility, slug, self_published
) values (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000001',
  'בן כנבתרי', 'torah', 5, 'fwd', 100,
  'test-corpus-torah', 'בןכנבתרי',
  '{"findings":[{"t":"בן כנבתרי"},{"t":"אור"}]}'::jsonb,
  'בית ירד', 'לפני ההחלפה', 'published', 'public', 'beit-yarad', true
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

-- A failed canonical gate must leave every saved field unchanged.
do $$
begin
  begin
    perform public.replace_els_matrix_axis_v1(
      '55555555-5555-5555-5555-555555555555',
      'בן כנבתרי', 'torah', 5, 'fwd', 100,
      'בית', 'torah', 2, 'fwd', -1,
      null, null, 'must not persist', null
    );
    raise exception 'mismatch unexpectedly accepted';
  exception when check_violation then null;
  end;
  if exists (
    select 1 from public.els_records
    where id = '55555555-5555-5555-5555-555555555555'
      and (search_term <> 'בן כנבתרי' or description = 'must not persist')
  ) then raise exception 'failed replacement was not atomic'; end if;
end;
$$;

select public.replace_els_matrix_axis_v1(
  '55555555-5555-5555-5555-555555555555',
  'בן כנבתרי', 'torah', 5, 'fwd', 100,
  'בית', 'torah', 2, 'fwd', 2490,
  '{"findings":[{"t":"בן כנבתרי"},{"t":"אור"}]}'::jsonb,
  null, 'הציר הראשי הוחלף', '{"engineVersion":"fixture"}'::jsonb
);

do $$
begin
  if not exists (
    select 1 from public.els_records
    where id = '55555555-5555-5555-5555-555555555555'
      and title = 'בית ירד'
      and slug = 'beit-yarad'
      and search_term = 'בית'
      and skip_distance = 2 and direction = 'fwd' and start_index = 2490
      and corpus_id = 'test-corpus-torah' and term_norm = 'בית'
      and status = 'pending' and visibility = 'private'
      and description = 'הציר הראשי הוחלף'
      and jsonb_array_length(positions -> 'findings') = 1
      and positions #>> '{findings,0,t}' = 'אור'
  ) then raise exception 'same-row axis replacement contract failed'; end if;
end;
$$;

-- The expected old identity is a compare-and-swap guard against stale tabs.
do $$
begin
  begin
    perform public.replace_els_matrix_axis_v1(
      '55555555-5555-5555-5555-555555555555',
      'בן כנבתרי', 'torah', 5, 'fwd', 100,
      'אור', 'torah', 2, 'back', 30,
      null, null, null, null
    );
    raise exception 'stale identity unexpectedly accepted';
  exception when serialization_failure then null;
  end;
end;
$$;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.replace_els_matrix_axis_v1(uuid,text,text,integer,text,integer,text,text,integer,text,integer,jsonb,text,text,jsonb)',
    'execute'
  ) then raise exception 'anon execute must be revoked'; end if;
  if not has_function_privilege(
    'authenticated',
    'public.replace_els_matrix_axis_v1(uuid,text,text,integer,text,integer,text,text,integer,text,integer,jsonb,text,text,jsonb)',
    'execute'
  ) then raise exception 'authenticated execute is required'; end if;
end;
$$;

select 'ELS same-row primary-axis replacement: PASS';
