-- 🌳 עץ אחד: כל צופן-דילוג (els_records) = node בגרף המספרים.
-- primary_number = מרחק-הדילוג (המספר הכותרתי של הצופן).
-- anchor_numbers = [דילוג, גימטריית-המונח (רגיל=יסוד), גימטריית כל מילה-מוצלבת].
-- מחושב בצד-שרת דרך המנוע הרשמי (fn_ragil, gematria_engine_law) → מכסה כל מקור
-- (מנוע-התגליות / אדמין / רשום / גולש) אוטומטית, בלי תלות בצד-לקוח.
-- העדשה ההפוכה בדף-המספר (/number/:n) קוראת: primary_number=n OR n = ANY(anchor_numbers).
create or replace function public.els_fill_numbers()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_anchors int[] := array[]::int[];
  v_skip int := abs(coalesce(new.skip_distance, 0));
  v_g int;
  v_word text;
  f jsonb;
begin
  -- primary = מרחק-הדילוג, אלא אם נקבע ידנית מראש (לא דורסים קביעת-אדמין)
  if new.primary_number is null and v_skip > 0 then
    new.primary_number := v_skip;
  end if;

  if v_skip > 0 then v_anchors := v_anchors || v_skip; end if;

  begin v_g := public.fn_ragil(new.search_term); exception when others then v_g := null; end;
  if v_g is not null and v_g between 1 and 99999 then v_anchors := v_anchors || v_g; end if;

  if new.positions ? 'findings' and jsonb_typeof(new.positions->'findings') = 'array' then
    for f in select * from jsonb_array_elements(new.positions->'findings') loop
      v_word := coalesce(f->>'t', '');
      if length(btrim(v_word)) > 0 then
        begin v_g := public.fn_ragil(v_word); exception when others then v_g := null; end;
        if v_g is not null and v_g between 1 and 99999 then v_anchors := v_anchors || v_g; end if;
      end if;
    end loop;
  end if;

  if new.primary_number is not null and new.primary_number > 0 then
    v_anchors := v_anchors || new.primary_number;
  end if;

  select array(select distinct x from unnest(v_anchors) x where x is not null and x > 0 and x <= 99999)
    into new.anchor_numbers;

  return new;
end $$;

drop trigger if exists trg_els_fill_numbers on public.els_records;
create trigger trg_els_fill_numbers
  before insert or update on public.els_records
  for each row execute function public.els_fill_numbers();

-- backfill לכל הרשומות הקיימות
update public.els_records set primary_number = primary_number;
