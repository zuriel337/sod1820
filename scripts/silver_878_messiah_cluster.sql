-- ============================================================================
-- קידום אשכול 878 / משיח / סובב עולם לישויות כסף (silver) — 2026-06-16
-- מקור: תיקיית החידושים (insights). כל הערכים אומתו במנוע הרשמי בלבד
-- (ragil_calc / mistater_calc / miluy_calc / atbash_calc / gadol_calc).
-- gematria_engine_law: אסור לחשב מהזיכרון — רק דרך פונקציות המערכת.
-- ============================================================================

-- 1) קידום 5 ביטויים קנוניים לישויות כסף (add_entity tier='silver')
select add_entity('דבר מתוך דבר','גאולה',4,'silver');   -- רגיל 878 = משיח (מילוי 878)
select add_entity('רוח אלהים','אלוהות',4,'silver');      -- רגיל 300 → מילוי-דמילוי 3333 (שורש 333)
select add_entity('סובב עולם','בריאה',4,'silver');       -- רגיל 216 = יראה · גדול 776 = ביאת המשיח
select add_entity('אדם דוד שלמה','גאולה',4,'silver');    -- מסתתר 358 = משיח (שושלת אד״ם)
select add_entity('בן פרצי','גאולה',4,'silver');         -- מסתתר 358 = משיח (שושלת פרץ)

-- 2) תיקון ישות 'משיח' הקיימת (metadata.value היה null → 358), שמירת כסף
update nodes
set metadata = metadata || jsonb_build_object('value',358,'world',coalesce(metadata->>'world','גאולה'),'tier','silver')
where type='entity' and label='משיח';

-- 3) עוגנים קדושים חדשים למד ההתכנסות (convergence_meter):
--    878 = "דבר מתוך דבר / משיח (מילוי)"
--    216 = "יראה / סובב עולם"
--    300 = "רוח אלהים"
--    333 = "שורש 333 — רוח אלהים / דבר מתוך דבר"
--    (ראו מיגרציה convergence_meter_add_878_cluster_anchors — anchors jsonb בתוך הפונקציה)

-- 4) קשרי גרף — אשכול הכסף (לא לאבד הצלבות; חוק העץ האחד)
with e(a,b,rel) as (values
  ('משיח','דבר מתוך דבר','related'),     -- משיח מילוי 878 = דבר מתוך דבר רגיל
  ('משיח','אדם דוד שלמה','related'),     -- 358 מסתתר
  ('משיח','בן פרצי','related'),          -- 358 מסתתר
  ('אדם דוד שלמה','בן פרצי','related'),  -- שני קווי שושלת על 358
  ('רוח אלהים','דבר מתוך דבר','related') -- שורש 333 משותף
),
pairs as (
  select na.id as fa, nb.id as fb, e.rel from e
  join nodes na on na.type='entity' and na.label=e.a
  join nodes nb on nb.type='entity' and nb.label=e.b
),
b2 as (
  select fa as from_node, fb as to_node, rel from pairs
  union all
  select fb, fa, rel from pairs
)
insert into edges (from_node, to_node, relation_type, weight, metadata)
select from_node, to_node, rel, 2, jsonb_build_object('source','silver_cluster_v1')
from b2
where not exists (select 1 from edges x where x.from_node=b2.from_node and x.to_node=b2.to_node);

-- תוצאה (convergence_meter): 358→89 · 878→78 · 776→67 · 216/300→44
