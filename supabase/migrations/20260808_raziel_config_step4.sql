-- ============================================================================
-- חוקת רזיאל · שלב 4 — איחוד נתיבי זיכרון/זהות (Freeze-safe · additive-only)
-- ----------------------------------------------------------------------------
-- מטרה: רזיאל אחד → זהות אחת → זיכרון אחד לפי משתמש → אותם נתיבי קריאה/כתיבה.
--
-- מה שנמצא (אימות מול הקוד החי, עם ציטוטים):
--   · קריאת-זיכרון-לפרומפט: **כל שלושת הערוצים** דרך fn_raziel_context (גשר-זהות
--     uid↔טלפון ב-wa_account_links). wa-christina · ai-analyze(מפקדה) · number-researcher.
--   · כתיבה: wa + מפקדה(ai-analyze) → fn_raziel_remember (קנוני). אתר(number-researcher)
--     → REST ישיר, כי הוא שומר data.context_snapshot ל-Replay שהכותב-הקנוני לא תומך בו.
--     צוריאל: «אתר — לא לשנות, רק לאמת». מאומת, ומתועד כפער-כתיבה דחוי.
--   · העקיפה היחידה שנותרה: getMyAgentMemory (לקוח, קריאה ישירה מסוננת RLS-uid, לא
--     מגושרת) — **קוד-מת** (0 קוראים; הוחלף ב-getMyWaMemory). הוסר בשלב זה.
--
-- ⛔ לא עושה: לא נוגע ב-raziel_brain/core · לא במודל (routing=false) · לא ב-reliability
--    (נשאר לא-מחובר) · לא יוצר טבלת-זיכרון חדשה · לא פונקציית-recall חדשה · לא מקור-אמת
--    מקביל · לא נוגע בפונקציות-הגשר (fn_raziel_context/remember/identity) שהערוצים מסתמכים
--    עליהן. before=שלב3 · after=שלב3 + תיעוד ארכיטקטורת-הזיכרון + הסרת העקיפה המתה.
-- ============================================================================

-- ── 0) before: snapshot מלא של קונפיג v3 ─────────────────────────────────────
insert into public.raziel_config_snapshot (config_version, channel, context_type, returned)
select config_version, '__config_full__', 'v3_before_step4', config
from public.raziel_config where id = 1;

-- ── 1) v4: תיעוד ארכיטקטורת-הזיכרון המאוחדת (הצהרתי; המקור החי הוא הקוד+הגשר) ──
update public.raziel_config set
  config_version = 4,
  updated_at = now(),
  note = 'שלב 4 — נתיבי זיכרון/זהות מאוחדים (מאומת). לא מחובר מודל; reliability עדיין לא-מחובר.',
  config = config || jsonb_build_object(
    'memory_architecture', jsonb_build_object(
      'version', 4,
      'single_source', 'agent_user_memory',      -- אין טבלת-זיכרון חדשה
      'read_bridge', 'fn_raziel_context',         -- כל שלושת הערוצים
      'write_bridge', 'fn_raziel_remember',       -- wa + מפקדה
      'identity_resolution', 'fn_raziel_identity + wa_account_links (uid↔phone)',
      'no_new_table', true, 'no_new_recall_fn', true, 'no_parallel_truth', true,

      'channels', jsonb_build_object(
        'wa', jsonb_build_object('read','fn_raziel_context','write','fn_raziel_remember','identity','fn_raziel_identity','status','verified'),
        'command_ai_analyze', jsonb_build_object('read','fn_raziel_context','write','fn_raziel_remember','identity','auth_uid(token)','status','verified'),
        'site_number_researcher', jsonb_build_object('read','fn_raziel_context','write','direct_rest(+data.replay)','identity','auth_uid(token)','status','verified_read_deferred_write','note','כתיבה ישירה בגלל data.context_snapshot ל-Replay; אתר — לא שונה')
      ),

      -- זיכרון אינו ידע: המסלול הקנוני נשאר, זיכרון לעולם לא הופך אוטומטית ל-node
      'promotion_path', jsonb_build_array('conversation','candidate','evidence','decision_ledger','tree'),

      'guarantees', jsonb_build_object(
        'G1_no_admin_leak',  jsonb_build_object('kept',true,'enforced_at','context_types.*.expose_admin + fn_raziel_context privacy'),
        'G2_personal_ne_tree', jsonb_build_object('kept',true,'enforced_at','אין trigger memory→nodes · 0 nodes sourced_from_memory · decision_ledger הוא השער'),
        'G3_privacy_in_group', jsonb_build_object('kept',true,'enforced_at','fn_raziel_context: channel like %@g.us → personal_memory_allowed=false, summary=null'),
        'G4_replay_intact',  jsonb_build_object('kept',true,'enforced_at','snapshot chain · האתר שומר data.context_snapshot')
      ),

      'removed_bypass', 'getMyAgentMemory (client, non-bridged RLS-uid) — הוסר; מוחלף ב-getMyWaMemory (מגושר)',
      'deferred', 'הרחבת fn_raziel_remember ב-p_data(jsonb) אופציונלי כדי שהאתר יאמץ את הכותב הקנוני בלי לאבד Replay — שלב עתידי, דורש אישור'
    )
  )
where id = 1;

-- ── 2) after: שמירת תוצאות הוכחת-הקבלה (על הזהות האמיתית) ─────────────────────
insert into public.raziel_config_snapshot (config_version, channel, context_type, returned)
values (4, '__acceptance__', 'v4_memory_proof', jsonb_build_object(
  'A_site_command_see_wa', jsonb_build_object('summary_present',true,'recent_conversation_n',10,'personal_memory_allowed',true,'zuriel_mem','wa=38 · site=9'),
  'B_same_bridge_all_channels', true,
  'C_isolation_other_user', jsonb_build_object('other_recent_n',0,'other_summary_eq_zuriel',false),
  'D_group_privacy', jsonb_build_object('personal_memory_allowed',false,'summary',null),
  'E_no_auto_node', jsonb_build_object('nodes_sourced_from_memory',0,'triggers_on_memory',0,'label_coincidences',6,'note','חפיפות-מחרוזת בלבד; 4/6 ה-nodes קדמו לזיכרון'),
  'F_persistence_server_side', 47
));
