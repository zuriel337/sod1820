-- ============================================================================
-- Agent Registry — שכבת-ממשל (Freeze-safe · additive · לא-מחובר לניתוב)
-- ----------------------------------------------------------------------------
-- מרחיב את agent_identity הקיים (agents_team_law) — לא מערכת מקבילה.
-- מוסיף לכל מומחה: capabilities · does_not (גבולות) · permission_scope · חוזה.
-- עקרון-על (עקרון אי-ההסלמה): הרשאת-מומחה בפועל = min(expert.permission_scope,
--   user.context_type). מומחה לעולם לא מקבל הרשאת-על רק כי רזיאל קרא לו.
-- חוזה אחיד: intent → specialist → evidence → cross_check → Raziel synthesis.
-- ⛔ הצופן-בגדול = placeholder (phase=planned, active=false) — לא נבנה.
-- ⛔ לא מחבר ניתוב-אוטומטי; רזיאל עדיין לא מנתב למומחים אוטומטית.
-- ============================================================================

-- 1) עמודות-ממשל (nullable → קריאות קיימות לא נשברות)
alter table public.agent_identity add column if not exists capabilities jsonb;
alter table public.agent_identity add column if not exists does_not jsonb;
alter table public.agent_identity add column if not exists permission_scope text default 'public';
alter table public.agent_identity add column if not exists invocation_contract text;

-- 2) ממשל למומחים הקיימים (does / does_not / scope — לפי הגדרת צוריאל)
update public.agent_identity set
  capabilities = '["מתזמר","מצליב מומחים","מסביר","מסיק"]'::jsonb,
  does_not = '["לא מחליף את המנועים","לא מחשב/ממציא בעצמו"]'::jsonb,
  permission_scope = 'orchestrator',
  invocation_contract = 'רזיאל מזהה intent → קורא למומחה → מקבל evidence → מצליב → סינתזה. לא מבצע כל מומחיות בעצמו.'
where agent_id = 'raziel';

update public.agent_identity set
  capabilities = '["עוגנים","nodes","ידע קנוני","תזמור/ניתוב"]'::jsonb,
  does_not = '["לא ממציא קשרים","לא הופך התנהגות לידע"]'::jsonb,
  permission_scope = 'public'
where agent_id = 'metatron';

update public.agent_identity set
  capabilities = '["מקורות: תנ\"ך","פסוקים","הקשרים","הופעות"]'::jsonb,
  does_not = '["לא מפרש משמעות","לא ממציא מקור"]'::jsonb,
  permission_scope = 'public'
where agent_id = 'sandalphon';

update public.agent_identity set
  capabilities = '["גשרי-שפה","ordinal","תרגום בין-לשוני"]'::jsonb,
  does_not = '["לא קובע משמעות סופית"]'::jsonb,
  permission_scope = 'public'
where agent_id = 'gabriel';

update public.agent_identity set
  capabilities = '["שיטות פירוק-אותיות אישיות"]'::jsonb,
  does_not = '["לא קובע שההתכנסות אמיתית","לא מפרש לבד"]'::jsonb,
  permission_scope = 'public'
where agent_id = 'uriel';

update public.agent_identity set
  capabilities = '["מסגרות-פרשנות opt-in: טארוט/נומרולוגיה/אסטרולוגיה/I Ching/HD"]'::jsonb,
  does_not = '["לא אמת — מסגרת אחת בלבד","opt-in בלבד","לא נבואה"]'::jsonb,
  permission_scope = 'public'
where agent_id = 'aspaklaria';

update public.agent_identity set
  capabilities = '["ליווי-חוקר אישי","תהליך/חוויה"]'::jsonb,
  does_not = '["לא מקור-ידע","לא מפרש גימטריה"]'::jsonb,
  permission_scope = 'authenticated'   -- ליווי אישי → מוגבל לזהות המשתמש
where agent_id = 'hatishbi';

update public.agent_identity set
  capabilities = '["עוזר אישי לצוריאל","תפעול/ניהול"]'::jsonb,
  does_not = '["לא חשוף לגולש","אדמין בלבד"]'::jsonb,
  permission_scope = 'admin'   -- העוזר האישי — אך גם הוא מוגבל ל-min(admin, user)
where agent_id = 'michael';

-- 3) מומחי-יכולת (engines) שאינם עדיין ב-registry — כרשומות-מומחה
--    (layer=engine · user_facing=false · phase לפי מצב)
insert into public.agent_identity (agent_id, name, role, layer, domain, capabilities, does_not, permission_scope, invocation_contract, user_facing, active, phase, match_keywords)
values
  ('gematria_engine','מנוע הגימטריה','engine','engine','חישוב גימטריה בכל השיטות',
   '["חישובים","כל 19 השיטות","fn_ragil/fn_all_methods/atbash/kadmi/fn_misratar"]'::jsonb,
   '["לא מפרש לבד","לא ממציא ערכים","רק המנוע הרשמי"]'::jsonb,
   'public','רזיאל שולח ביטוי → המנוע מחזיר ערכים → רזיאל מפרש.', false, true, 'live',
   '["גימטריה","ערך","שווה","כמה","חישוב"]'::text[]),

  ('research_intelligence','מודיעין-מחקר','engine','engine','ביקוש · מגמות · חוזק-מחקרי (signals)',
   '["demand","trend","research_strength","fn_raziel_research_intel_scoped"]'::jsonb,
   '["לא הופך פופולריות לאמת","popularity ≠ strength ≠ canon","aggregate בלבד"]'::jsonb,
   'admin','רזיאל שואל signals → מקבל מסונן לפי context_type → מפרש ומתעדף. effective=min(admin,user).', false, true, 'live',
   '["ביקוש","מבוקש","חזק השבוע","טרנד","מגמה","מה לחקור"]'::text[]),

  ('els_cipher','דילוגי-אותיות (ELS)','engine','engine','חיפוש/ניתוח דילוגי-אותיות בתורה',
   '["חיפוש דילוגים","ניתוח מטריצה"]'::jsonb,
   '["לא קובע משמעות","לא נבואה","הצלבה נדרשת"]'::jsonb,
   'public','רזיאל שולח מילה/פרמטרים → ELS מחזיר ממצאי-דילוג → רזיאל מפריד עובדה מרמז.', false, true, 'live',
   '["דילוג","דילוגים","els","צופן","דילוגי אותיות"]'::text[]),

  ('big_letter_cipher','הצופן בגדול','engine','engine','חישובי גדול + כללי השיטה (עתידי)',
   '["חישובי גדול","כללי שיטת-הגדול"]'::jsonb,
   '["לא קובע שההתכנסות אמיתית","כפוף לחוק הבהרת-הגדול (סופיות שונות)"]'::jsonb,
   'public','[מתוכנן] רזיאל → intent=big_letter_cipher → specialist → evidence → cross_check → סינתזה.', false, false, 'planned',
   '["גדול","צופן בגדול","סופית"]'::text[])
on conflict (agent_id) do nothing;

-- 4) חוק-הרישום: החוזה + עקרון אי-ההסלמה + הסדר
insert into public.nodes (type, rule_id, label, description, is_active, metadata)
values ('rule','agent_registry_law','Agent Registry — מפת המומחים + ממשל-הרשאות',
  'רזיאל אינו מבצע כל מומחיות — הוא מזהה מתי צריך מומחה. כל מומחה ב-agent_identity נושא capabilities + does_not (גבולות) + permission_scope. חוזה אחיד: intent → specialist → evidence → cross_check → Raziel synthesis. עקרון אי-ההסלמה (חוק-ברזל): הרשאת-מומחה בפועל = min(expert.permission_scope, user.context_type) — מומחה לעולם לא מקבל הרשאת-על רק כי רזיאל קרא לו (מומחה admin שנקרא עבור גולש → public בלבד). כל מומחה: engine מחשב/שולף, רזיאל מפריד עובדה-מפרשנות ומסיק; אף מומחה לא קובע «אמת קנונית» — רק Candidate→Evidence→Decision→Tree. סדר-בנייה: (1)ייצוב רזיאל (2)מיפוי סוכנים (3)Registry (4)חוזה (5)הרשאות (6)ואז הצופן-בגדול לפי החוזה. הצופן-בגדול = phase=planned, לא נבנה עד השלמת 1-5.',
  true,
  jsonb_build_object(
    'contract','intent→specialist→evidence→cross_check→synthesis',
    'no_escalation','effective_scope = min(expert.permission_scope, user.context_type)',
    'scopes', jsonb_build_array('public','authenticated','admin'),
    'raziel_role','orchestrate·cross_check·explain·conclude — not replace engines',
    'build_order', jsonb_build_array('stabilize_raziel','map_agents','registry','contract','permissions','big_letter_cipher_last'),
    'wiring_status','map_only — auto-routing not wired'))
on conflict do nothing;

-- 5) raziel_config v8: agent_registry block (map-only)
update public.raziel_config set
  config_version = 8,
  updated_at = now(),
  note = 'Agent Registry — ממשל-מומחים (agent_identity מורחב). map-only, ניתוב לא-מחובר.',
  config = config || jsonb_build_object(
    'agent_registry', jsonb_build_object(
      'source','agent_identity (מורחב, לא מקביל)',
      'law','agent_registry_law',
      'governance_fields', jsonb_build_array('capabilities','does_not','permission_scope','invocation_contract'),
      'permission_principle','effective = min(expert.permission_scope, user.context_type) — no elevation via Raziel',
      'contract','intent → specialist → evidence → cross_check → Raziel synthesis',
      'experts', jsonb_build_array('gematria_engine','metatron(knowledge)','research_intelligence','els_cipher','sandalphon','gabriel','uriel','aspaklaria'),
      'planned', jsonb_build_array('big_letter_cipher'),
      'wiring_status','map_only'))
  where id = 1;
