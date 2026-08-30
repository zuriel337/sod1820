-- MF-G3 — GRAPH PRIVACY FOUNDATION (minimum closure, additive)
--
-- Closes the last MUST FOUNDATION NOW from the One Tree / Reality Graph expansion gate.
--
-- WHO OWNS PRIVACY (answered from live evidence, 30.8.2026):
--   NOT the canonical entity  — 0 person nodes exist while public.persons holds 68,380 rows;
--                               personal identity already lives OUTSIDE the graph.
--   NOT the representation    — settled by MF-G1: representation identity is carried by
--                               metadata->>'gallery_image_id', not by privacy.
--   YES the research claim    — research_objects.privacy_scope (+ owner_person_id) already
--                               governs 432 private / 147 public_candidate / 6 owner-scoped
--                               rows, and admin_research_review already refuses promotion
--                               unless the claim is public_candidate.
--   PARTIALLY the relation    — when the relation is itself personal (family_input, 6 rows,
--                               all owner-scoped).
--   YES the projection layer  — as the ENFORCEMENT POINT. Precedent: raziel_group_privacy_law
--                               ("מה שלא מוחזר לא דולף").
--
-- WHAT WAS MISSING: nodes/edges had ZERO privacy columns and both client read policies were
-- qual = true. The graph had no enforcement point at all — privacy was only ever enforced
-- upstream, at the Intake gate. That is sufficient today (0 private objects have ever reached
-- the graph: promoted_node_id is NULL for all 579 rows) but it is not a foundation.
--
-- MINIMUM CLOSURE = reuse the ALREADY-CANONICAL dimension instead of inventing one.
--   entity_structure_law §5 already defines: "space = מי רואה (core/lab/private)".
--   This migration makes that declared dimension actually ENFORCED, with NO schema change,
--   NO new table, NO second graph, NO entity-identity change and NO backfill.
--
-- BLAST RADIUS (measured live BEFORE applying, on the real corpus):
--   nodes visible under the new predicate : 5953 / 5953   (zero rows become hidden)
--   edges visible under the new predicate : 5135 / 5135   (zero rows become hidden)
--   space values in use                   : NULL (→ core) x5952, 'lab' x1, 'private' x0
--   => The replacement is PROVABLY EQUIVALENT to qual = true on today's corpus.
--      No existing public data is flipped to private by this migration.

-- ---------------------------------------------------------------------------
-- 1. Canonical space predicate — ONE definition, used by every graph read policy.
--    Pure, IMMUTABLE, no data access, no side effects. NULL space is treated as
--    'core' so that every historical row (5952 of them) stays public by default:
--    absence of a declaration is NEVER interpreted as a privacy claim.
-- ---------------------------------------------------------------------------
create or replace function public.fn_graph_space_is_public(p_metadata jsonb)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(p_metadata->>'space', 'core') <> 'private';
$$;

comment on function public.fn_graph_space_is_public(jsonb) is
  'MF-G3 canonical graph privacy predicate. space vocabulary is entity_structure_law §5 (core/lab/private). NULL/absent = core = public. Single source of truth for nodes/edges read policies and for any space-aware projection surface. See rule graph_privacy_foundation_law.';

revoke all on function public.fn_graph_space_is_public(jsonb) from public;
grant execute on function public.fn_graph_space_is_public(jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Enforcement point — replace the two qual = true client read policies.
--    Provably equivalent today (5953/5953 and 5135/5135 still visible), but the
--    graph now HAS a privacy boundary instead of asserting there is none.
-- ---------------------------------------------------------------------------
drop policy if exists nodes_public_read on public.nodes;
create policy nodes_public_read on public.nodes
  for select to anon, authenticated
  using (public.fn_graph_space_is_public(metadata));

drop policy if exists edges_public_read on public.edges;
create policy edges_public_read on public.edges
  for select to anon, authenticated
  using (public.fn_graph_space_is_public(metadata));

-- ---------------------------------------------------------------------------
-- 3. Governance rule (additive node, no historical text touched).
-- ---------------------------------------------------------------------------
insert into public.nodes (type, label, description, rule_id, rule_version, is_active, weight, metadata)
values (
  'rule',
  '🔒 Graph Privacy Foundation Law — מי בעל-הפרטיות בגרף',
  E'חוק-יסוד לפרטיות בגרף (MF-G3, Human-Gate ZURIEL 30.8.2026, additive). מרחיב את entity_structure_law §5 (space) ואת unified_graph_law — לא מחליף אותם ולא יוצר גרף/מאגר שני.\n\n'
  || E'1. בעלוּת-הפרטיות — הטענה, לא הישות. פרטיות שייכת ל**טענת-המחקר** (research_objects.privacy_scope + owner_person_id), לא לישות הקנונית. מספר, פסוק, מילה או התכנסות אינם "פרטיים" — מה שפרטי הוא מי טען מה עליהם, מתי ובאיזה הקשר. ראיה חיה: 0 nodes מסוג person מול 68,380 שורות ב-persons — הזהות האישית כבר חיה מחוץ לגרף, ושם היא נשארת.\n\n'
  || E'2. ייצוג אינו בעל-פרטיות. זהות-הייצוג נקבעה ב-MF-G1 (metadata->>''gallery_image_id''). ייצוג יורש את הנראוּת של הישות שהוא מייצג — הוא לא קובע אותה.\n\n'
  || E'3. קשר פרטי כשהוא-עצמו אישי. relation_type שמקודד מידע אישי (למשל family_input) נושא פרטיות בזכות עצמו ומוגן ברמת ה-edge, לא רק ברמת הצמתים.\n\n'
  || E'4. אוצר-מילים יחיד: space ∈ core | lab | private (entity_structure_law §5). **NULL/חסר = core = ציבורי.** היעדר-הצהרה לעולם אינו נקרא כטענת-פרטיות — אחרת 5,952 שורות היסטוריות היו נעלמות בשקט.\n\n'
  || E'5. נקודת-האכיפה = שכבת-הגישה/ההקרנה. הכלל: «מה שלא מוחזר לא דולף» (raziel_group_privacy_law). מומש כ-RLS על nodes/edges דרך הפרדיקט הקנוני היחיד public.fn_graph_space_is_public(metadata). אסור פרדיקט-פרטיות מקביל, אסור לשכפל את הלוגיקה inline בקוד לקוח.\n\n'
  || E'6. חוק-ההתפשטות (Propagation Law) — קידום טענה לעולם אינו משנה את ה-space של הישות המוזכרת. טענה פרטית המזכירה את 1820 אינה הופכת את 1820 לפרטי, וקידום טענה ל-public_candidate אינו הופך ישות פרטית לציבורית. שער-הקידום (admin_research_review) מסרב לקנוניזציה כל עוד הטענה אינה public_candidate — זו החוליה שמנעה עד היום דליפה כלשהי: 0 מתוך 579 טענות הגיעו אי-פעם לגרף (promoted_node_id IS NULL בכולן).\n\n'
  || E'7. אין היפוך אוטומטי לשום כיוון. ציבורי→פרטי דורש Human-Gate מפורש (מסתיר תוכן קיים). פרטי→ציבורי דורש Human-Gate מפורש (חושף תוכן). אסור לגזור אף אחד מהם מגיל, מסטטוס, מכותב או מהיוריסטיקה.\n\n'
  || E'8. מגבלה מוצהרת (EXTENSION POINT, לא MUST NOW): קוראים מסוג SECURITY DEFINER (פונקציות הקרנה בבעלות postgres) עוקפים RLS מעצם הגדרתם ולכן אינם space-aware. זה מקובל כרגע ורק כרגע, כי בגרף קיימים 0 צמתים ו-0 קשתות פרטיים. **הרגע שבו ייכתב ה-node הפרטי הראשון — חובה קודם להפוך את פונקציות ההקרנה ל-space-aware דרך אותו פרדיקט קנוני.** זהו תנאי-סף, לא המלצה.\n\n'
  || E'9. הפרדה שאסור לטשטש: privacy_scope=''private'' ב-research_objects פירושו כיום «טרם אושר למועמדות ציבורית» (ברירת-מחדל קשיחה בכל כותבי ה-Intake) — זה **אינו** «סודי». פרטיות-הקשר-מחקרי ≠ פרטיות-ישות. חוק זה מגדיר את השנייה; הראשונה נשארת בשכבת ה-Intake.',
  'graph_privacy_foundation_law',
  1,
  true,
  5,
  jsonb_build_object(
    'space', 'core',
    'classification', 'MUST FOUNDATION NOW',
    'gate', 'MF-G3',
    'extends', jsonb_build_array('entity_structure_law', 'unified_graph_law', 'raziel_group_privacy_law'),
    'enforcement_predicate', 'public.fn_graph_space_is_public(metadata)',
    'schema_change', false,
    'backfill', false,
    'blast_radius_nodes_hidden', 0,
    'blast_radius_edges_hidden', 0,
    'human_gate', 'ZURIEL 2026-08-30'
  )
)
-- Inference clause must match the MF-G1 partial index predicate exactly:
--   nodes_identity_rule_uidx (rule_id, rule_version) WHERE type='rule' AND rule_id IS NOT NULL
on conflict (rule_id, rule_version) where type = 'rule' and rule_id is not null do nothing;
