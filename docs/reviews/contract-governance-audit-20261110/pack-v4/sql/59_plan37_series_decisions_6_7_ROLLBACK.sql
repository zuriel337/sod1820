-- SOD1820 · PLAN37 (project_codex id 37) — ROLLBACK of the appended record of ZURIEL's series decisions 6–7 — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 11.11.2026 against the live row read the same day (length 618963, md5 c06a461d21a661953b297370bca72138).
-- Requires ZURIEL's explicit approval of this exact file (SHA-256 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Append-only: the existing 618963 characters are not touched; the result is checked; nothing is deleted.
begin;
do $s59$
declare v_app text := $rec$

### 12.58 — 11.11.2026: הכרעות צוריאל על חברות בסדרות «מה קורה הבורא» ו«מימד חמש» (החלטות 6–7)

1. «מה קורה הבורא» (החלטה 6): כל פוסט ציבורי שהמחבר שלו בדיוק «אלון לוי» שייך לסדרה, עם או בלי התגית. זהות היוצר אומתה ב־11.11.2026 (קריאה בלבד): כל 13 הפוסטים — 54, 5021, 5035, 5042, 5069, 5076, 5081, 5092, 5108, 5117, 5119, 5122, 5131 — מטמיעים את ערוץ «אלון לוי - מה קורה הבורא» (youtube.com/@alonlevifaithfull) או נכתבו מסרטון שלו. מחבר מדויק בלבד; פוסטים של מחברים אחרים אינם נכללים; קרדיט היוצר נשאר של הפוסט; אין עותקים. מחליף את כלל ״רק התגית המדויקת״ של DEC-SERIES-005.
2. «מימד חמש» (החלטה 7): שיוך כפול לפוסטים 5003 (מטריקס) ו־5004 (משחקי הדיונון). הם נשארים במשפחה/בקטגוריה «הצופן בסרטים» ושומרים את שדה המחבר שלהם; אין עותק ואין מפרסם מומצא. מחליף, לשני הפוסטים האלה בלבד, את ההוצאה מ«מימד חמש» שב־DEC-SERIES-003.
3. תשעת הפוסטים האחרים בקטגוריה «מימד חמש» ממפרסם אחר (2, 29, 45, 5037, 5068, 5109, 5116, 5127, 5130) לא נוספו; הכרעה פרטנית ממתינה (DEC-SERIES-002). לא נוצר שם סדרה חדש. Series, Category, Medium ו־Representation נשארים צירים נפרדים.
4. מימוש: ענף ccr-b2565041-d94syf (קוד ובדיקות בלבד; לא מוזג ולא נפרס). PR #1296 (טיוטה) לא שונה. רישום זה אינו הרשאת מיזוג או פרסום.$rec$;
begin
  if (select length(body) from public.project_codex where id = 37) <> 618963 + length(v_app)
     or (select right(body, length(v_app)) from public.project_codex where id = 37) <> v_app then
    raise exception 'S59: PLAN37 is not base || record (changed after 50_?)'; end if;
  update public.project_codex set body = left(body, 618963), updated_at = now() where id = 37;
  if (select md5(body) from public.project_codex where id = 37) <> 'c06a461d21a661953b297370bca72138' then raise exception 'S59: base not restored exactly'; end if;
end $s59$;
commit;
