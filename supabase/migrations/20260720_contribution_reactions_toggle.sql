-- 👍 ריאקציות לתרומות-מחקר — עמודת reactions jsonb: { "👍": ["uid|v:visitor", …] }.
-- toggle: מוסיף/מסיר את זהות-המשתמש (auth.uid, או v:<visitor> לאורח) מהמערך של האימוג'י.
-- SECURITY DEFINER — עוקף RLS לעדכון. הקריאה של reactions דרך policy הקיים (מאושרות גלויות).
create or replace function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_key text;
  v_arr jsonb;
  v_reactions jsonb;
begin
  v_key := coalesce(auth.uid()::text, nullif('v:' || coalesce(nullif(btrim(p_visitor), ''), ''), 'v:'));
  if v_key is null then raise exception 'no identity'; end if;
  if p_emoji not in ('👍','💡','🔥','🙏','✨') then raise exception 'bad emoji'; end if;

  select reactions into v_reactions from public.research_contributions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  v_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);

  if v_arr ? v_key then
    v_arr := (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements_text(v_arr) e where e <> v_key);
  else
    v_arr := v_arr || to_jsonb(v_key);
  end if;

  v_reactions := jsonb_set(v_reactions, array[p_emoji], v_arr);
  update public.research_contributions set reactions = v_reactions where id = p_id;
  return v_reactions;
end $$;

grant execute on function public.toggle_contribution_reaction(uuid, text, text) to anon, authenticated;
