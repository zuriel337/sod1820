-- G3_CANONICAL_LONG_TASK_PROGRESS_V3
-- Human Gate: ZURIEL 2026-09-29
-- OWNER CHECK: EXTEND_EXISTING canonical_ui_components_law under Experience Governance.
-- Fresh current-main recovery: v6 already owns Universal Problem Report; extend it additively to v7.
-- Branch-only migration: DO NOT apply before explicit release authorization.
-- No schema/table/store/engine is created.

do $$
declare
  v_prev public.nodes%rowtype;
  v_metadata jsonb;
  v_components jsonb;
begin
  select *
  into v_prev
  from public.nodes
  where type='rule'
    and rule_id='canonical_ui_components_law'
    and is_active=true
  order by rule_version desc
  limit 1
  for update;

  if v_prev.id is null then
    raise exception 'canonical_ui_components_law active owner not found';
  end if;

  if v_prev.rule_version <> 6 then
    raise exception 'expected canonical_ui_components_law v6, found v%', v_prev.rule_version;
  end if;

  if exists (
    select 1 from public.nodes
    where type='rule'
      and rule_id='canonical_ui_components_law'
      and rule_version=7
  ) then
    raise exception 'canonical_ui_components_law v7 already exists';
  end if;

  v_components := coalesce(v_prev.metadata->'canonical_components', '[]'::jsonb);
  if not (v_components ? 'CanonicalProgress') then
    v_components := v_components || '["CanonicalProgress"]'::jsonb;
  end if;

  v_metadata := jsonb_set(
    coalesce(v_prev.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'human_gate_v7', 'ZURIEL 2026-09-29',
        'canonical_progress_component', 'src/components/CanonicalProgress.jsx',
        'canonical_progress_owner_check', 'EXTEND_EXISTING',
        'canonical_progress_no_fake_percent', true,
        'canonical_progress_no_fake_eta', true,
        'canonical_progress_safe_operational_stages_only', true,
        'canonical_progress_long_wait_companion', true,
        'canonical_progress_cls_stable_slot', true,
        'canonical_progress_preserves_issue_report_v6', true
      ),
    '{canonical_components}',
    v_components,
    true
  );

  update public.nodes
  set is_active=false
  where id=v_prev.id;

  insert into public.nodes (
    type,label,description,metadata,is_active,rule_id,rule_version,depends_on,
    supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key
  )
  values (
    'rule',
    'רכיבי־UI קנוניים v7 — Problem Report + Long-task Presence',
    coalesce(v_prev.description,'') || E'\n\n'
      || '—— v7 (Human-Gate ZURIEL 29.9.2026) — CANONICAL LONG-TASK FEEDBACK / WAITING EXPERIENCE ——' || E'\n'
      || 'סיווג: experience/ui/components. OWNER CHECK: EXTEND_EXISTING. v7 מוסיף CanonicalProgress מעל v6 החי ושומר במלואם את IssueReport וכל metadata/depends_on הקיימים. אין Progress Store/System/Law חדש.' || E'\n\n'
      || '1. ONE PROGRESS PRESENCE. כל Surface חדש/2029 שמציג פעולה מורגשת בזמן משתמש ב-CanonicalProgress ישירות או דרך wrapper קנוני כגון FrameState(kind=loading). אין ELSProgress/BookSpinner/AIThinkingBar/ResearchLoader מקומיים.' || E'\n'
      || '2. REAL PROGRESS ONLY. אחוז מוצג רק כאשר engine/workflow מספק progress אמיתי או current/total אמיתיים. זמן שחלף לעולם אינו מומר לאחוז השלמה. כאשר אין אחוז אמיתי, המצב נשאר indeterminate במפורש.' || E'\n'
      || '3. NO FAKE ETA. אין לנחש זמן לסיום. ETA מותר רק אם runtime owner מספק estimate אמיתי, והוא מסומן כהערכה.' || E'\n'
      || '4. EXPLAIN THE WAIT. המתנה משמעותית מציגה phase/שלבי workflow בטוחים למשתמש. אלה שלבים תפעוליים ידועים מהמנוע/worker/projection — לא chain-of-thought, prompt, scratchpad או reasoning פנימי של מודל.' || E'\n'
      || '5. LONG WAIT BECOMES USEFUL. פעולה ידועה כארוכה או פעולה שעברה את long-wait threshold רשאית להציג שכבת ״בינתיים״: תוצאות חלקיות שכבר הושלמו, הקשר/מקור, הסבר שיטה קצר או ניווט בטוח. תוכן ההמתנה מסומן כהקשר ואינו מתחזה לתוצאה הממתינה.' || E'\n'
      || '6. EXPENSIVE DOMAINS MUST REPORT STAGES. ELS scans, deep research/graph scans, batch source processing, media/OCR ingestion ועבודות כבדות דומות חייבות לחשוף phase events בטוחים ל-CanonicalProgress כאשר ה-runtime שלהן נבנה. Spinner גנרי אינו target state.' || E'\n'
      || '7. BACKGROUND/CANCEL MUST BE REAL. minimize/background/cancel מוצגים רק אם job/runtime owner תומך באמת ב-persistence/cancellation. UI לא מבטיח עבודה ברקע שתמות בניווט.' || E'\n'
      || '8. CLS-STABLE SLOT. Loading→Ready שומר geometry יציב ככל האפשר; אין להכניס/להסיר שורת loading שמקפיצה תוכן שכבר צויר. אותו slot משנה state/copy במקום להיעלם בפתאומיות.' || E'\n'
      || '9. ACCESSIBLE STATUS. aria-busy/live/progressbar, keyboard-safe controls ו-prefers-reduced-motion הם חלק מהחוזה. Motion אינו אינדיקציה יחידה.' || E'\n'
      || '10. LOCALIZATION READY. visible waiting copy רשאי להתחלף דרך content_translation_law/props קיימים; locale אינו יוצר progress component נוסף ואינו משנה operational truth.' || E'\n'
      || '11. TRUTH SAFE. progress/engagement אינם משנים Finding/Claim/Evidence/Verification/Governance. חומר חלקי/בינתיים נשאר מובחן מהתוצאה שעדיין מחושבת.' || E'\n'
      || '12. DEFAULT PRESENTATION TIMING. ה-primitive שומר slot מיד; סביב 3s הוא רשאי לפתוח הסבר של שלבים, וסביב 12s שכבת long-wait companion. Domain שיודע מראש שהפעולה כבדה רשאי לפתוח long form מהתחלה. thresholds הם presentation בלבד, לא operational truth.' || E'\n'
      || '13. MIGRATION. זהו forward law ל-2029/new/redesigned surfaces. Legacy loaders עוברים אליו כשה-surface שלהם נכנס redesign או כשה-loader משתנה מהותית; אין mass rewrite עיוור.',
    v_metadata,
    true,
    'canonical_ui_components_law',
    7,
    v_prev.depends_on,
    6,
    v_prev.weight,
    v_prev.hebrew_date,
    v_prev.axis_theme,
    v_prev.gallery_id,
    v_prev.identity_key
  );
end
$$;
