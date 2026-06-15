-- פונקציית מסתתר ב-Postgres — שכפול מדויק של src/lib/gematria.js (mistater)
-- חוק misratar_multi (נעול): מילה-מילה, הרווח שובר את הרצף. GEM: סופיות=ערך רגיל.
-- אומת מול המנוע הרשמי: 0 אי-הסכמות על 5,785 ביטויים רב-מיליים.
create or replace function mistater_calc(input text) returns int
language plpgsql immutable as $$
declare
  gem jsonb := '{"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400}'::jsonb;
  word text; total int := 0; letters int[]; ch text; i int;
begin
  if input is null then return 0; end if;
  for word in select regexp_split_to_table(input, '\s+') loop
    letters := array[]::int[];
    for i in 1..char_length(word) loop
      ch := substr(word, i, 1);
      if gem ? ch then letters := letters || (gem->>ch)::int; end if;
    end loop;
    if array_length(letters, 1) is not null then
      for i in 1..(array_length(letters, 1) - 1) loop
        total := total + abs(letters[i] - letters[i + 1]);
      end loop;
    end if;
  end loop;
  return total;
end;
$$;
