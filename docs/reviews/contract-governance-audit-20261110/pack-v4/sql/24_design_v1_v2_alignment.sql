-- SOD1820 · Decision 5 — V1→V2 design-contract owner alignment (pinpoint G3-freeze exemption) — PROPOSAL ONLY. NOT EXECUTED.
-- Prepared 10–11.11.2026 against origin/main 932aba4bdd8eaa7030c57932ce9606f9ca5ebe18 and live DB rows read the same day.
-- Requires ZURIEL's explicit approval of this exact file (md5 in the handoff report) before any execution (CLAUDE.md §0.4).
-- Every block refuses to run if the live row differs from the reviewed base (md5 guards) and verifies its result. Nothing is deleted.
-- Decision 5 (ZURIEL 11.11.2026): pinpoint exemption from the ד5 G3 freeze for the V1→V2 design-contract owner alignment ONLY.
-- Exempted (frozen, generic G3 reason): brand_spelling_law v1→v2, canonical_colors_law v2→v3, logo_integrity_law v3→v4, sod1820_canonical_identity_law v5→v6.
-- Not frozen (no exemption needed): research_workspace_law v5→v6 (metadata visual_owner only).
-- NOT included: canonical_ui_components_law (no V1 reference found live 11.11.2026). The exemption is not a DB-write approval.
begin;

-- ── brand_spelling_law: v1 → v2 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='brand_spelling_law' and is_active for update;
  if not found then raise exception 'S24 brand_spelling_law: no active version (drift)'; end if;
  if v_base.rule_version <> 1 then raise exception 'S24 brand_spelling_law: active version is v% (expected v1)', v_base.rule_version; end if;
  if md5(v_base.description) <> 'c46d41b030771dbe1c73fa72735d3cb6' then raise exception 'S24 brand_spelling_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> 'bf215b1bbc830113f9bc3fa1cbaeb5b6' then raise exception 'S24 brand_spelling_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='brand_spelling_law' and rule_version > 1) then
    raise exception 'S24 brand_spelling_law: a version above v1 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$כתיב המותג — «סוד 1820» (עברית, עם רווח) · «sod1820» (אנגלית, בלי רווח)$sod_lbl$, $sod_txt$חוק כתיב שם-המותג. כשהמותג בעברית = «סוד 1820» — חובה רווח בין «סוד» ל-«1820», לעולם לא «סוד1820» צמוד. כשהמותג באנגלית/לטינית = «sod1820» או «SOD1820» — ללא רווח (וכן הדומיין sod1820.co.il). חל על כל טקסט מוצג או נוצר: פוסטים, כרטיסים/thumbnails, כתוביות וקרדיטים («תרגום ועריכה: סוד 1820»), טיקרים/שידורים, פרסונות-AI (רזיאל/גבריאל/חוקר-המספרים), שיתופים, כותרות SEO ו-fallbacks. הצורה הקנונית בקוד כבר «✦ סוד 1820» (PostsPage/nameCard/printDoc/MaftechShowcase) — יש ליישר אליה. תוקן 3.9.2026 (בקשת צוריאל): 6 פוסטי מימד-חמש (קרדיט «תרגום ועריכה»), 2 rules, 3 הודעות טיקר, ו-20 מופעים ב-13 קבצי-קוד (fallbacks/פרסונות/הערות).

[v2 · 11.11.2026 · יישור בעלים — החרגה נקודתית מהקפאת G3 (החלטת צוריאל 5, 11.11.2026)] בעל חוזה העיצוב: SOD1820_DESIGN_CONTRACT_V2.md (SOD1820_DESIGN_CONTRACT_V1.md נשמר כהיסטוריה). כללי הכתיב לא השתנו.$sod_txt$, $sod_meta${"added_by": "agent", "compaction_v1": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "brand_design", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md"}, "date": "2026-09-03", "for": "ZURIEL", "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "scoped semantic contract currently unique enough to remain active; G3 implementation must consume it rather than legacy UI/code, and final G3 compaction may absorb/archive it after proving semantic preservation"}, "owner_routing": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "confidence": "high", "domain": "brand_design", "normalized_at": "2026-11-11", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "v2_owner_alignment": {"change": "design-contract owner V1 → V2 (V1 kept as history)", "frozen_exemption": {"g3_disposition_v1_unchanged": true, "g3_freeze_kept_for_everything_else": true, "scope": "V1→V2 owner alignment only"}, "human_gate": "ZURIEL 2026-11-11 (החלטה 5 — החרגה נקודתית מהקפאת G3 ליישור V1→V2 בלבד)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}}$sod_meta$::jsonb, true, 'brand_spelling_law', 2,
          v_base.depends_on, 1, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> 'e409e33ffe4bcf91bc71ea3b81bd035c' then
    raise exception 'S24 brand_spelling_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='brand_spelling_law' and is_active) <> 1 then
    raise exception 'S24 brand_spelling_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── canonical_colors_law: v2 → v3 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='canonical_colors_law' and is_active for update;
  if not found then raise exception 'S24 canonical_colors_law: no active version (drift)'; end if;
  if v_base.rule_version <> 2 then raise exception 'S24 canonical_colors_law: active version is v% (expected v2)', v_base.rule_version; end if;
  if md5(v_base.description) <> '1bee730eb63ac9ebfbb362ff13ecf620' then raise exception 'S24 canonical_colors_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '99c723cdb63739e86880230657de1558' then raise exception 'S24 canonical_colors_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='canonical_colors_law' and rule_version > 2) then
    raise exception 'S24 canonical_colors_law: a version above v2 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$חוק הצבעים הקנוני v3 — Semantic Theme Roles / One Palette Tree$sod_lbl$, $sod_txt$פלטת הזהב הקנונית נשמרת, אך רכיבי UI חדשים/מוסבים אינם בוחרים צבע לפי hex או יורשים צבע מקרי מהורה. צבעי ממשק נקבעים לפי תפקיד סמנטי דרך הפלטה האפקטיבית של המסך.\n\n[v2 · Human-Gate ZURIEL 8.9.2026] ONE THEME TREE: Theme preference → effective route mode → semantic palette → semantic control/status role → canonical component → surface.\n1. CONTROL ROLES: primary / secondary / ghost / disabled / focus. כל role מגדיר background/text/border/hover/focus לפי dark/light/lab. רכיב מבקש role; אינו יודע צבע.\n2. STATUS ROLES: building / success / warning / danger / info. סטטוס אינו יורש color מהלינק/הורה ואינו משתמש בצבע עולם. לדוגמה «סגור · בבנייה» = status.building בכל משטח.\n3. CONTRAST: טקסט על רקע אקסנט חייב להשתמש onAccent/on-role המקביל; אין זהב-על-זהב ואין תכלת-על-כהה רק בגלל inheritance.\n4. OWNERSHIP: palette.js/usePalette הוא owner של צבעי content+controls; chromeTheme.js נשאר owner של Navbar/Footer chrome; worlds.js נשאר owner של צבעי עולם/סיווג סמנטי; אין לערבב את שלושת התחומים.\n5. MIGRATION: אין mass restyle עיוור. מעבירים קודם רכיבים משותפים ו-Golden Cases; legacy נשאר עד redesign/audit. צבע מקומי מותר רק כשהוא נושא משמעות סמנטית בעלת owner מפורש או בתוך legacy self-contained שלא הוכנס למיגרציה.\n6. NEW CODE: אין color:inherit לסטטוס קנוני, אין hex/RGBA מקומי לכפתור/באדג׳ קנוני, ואין palette נפרדת לעמוד. אם חסר role — מרחיבים את palette owner, לא ממציאים צבע מקומי.\n\nהכלל ההיסטורי נשמר: זהב על רקע כהה; על רקע זהב הטקסט כהה. v2 מרחיב אותו לשכבת semantic roles ולא מבטל את זהות המותג.

[v3 · 11.11.2026 · יישור בעלים — החרגה נקודתית מהקפאת G3 (החלטת צוריאל 5, 11.11.2026)] בעל חוזה העיצוב: SOD1820_DESIGN_CONTRACT_V2.md (SOD1820_DESIGN_CONTRACT_V1.md נשמר כהיסטוריה). ערכי הצבע, התפקידים הסמנטיים ומקור האמת לא השתנו.$sod_txt$, $sod_meta${"canonical_implementation": "src/lib/palette.js", "compaction_v1": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "brand_design", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md"}, "control_roles": ["primary", "secondary", "ghost", "disabled", "focus"], "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "scoped semantic contract currently unique enough to remain active; G3 implementation must consume it rather than legacy UI/code, and final G3 compaction may absorb/archive it after proving semantic preservation"}, "human_gate_v2": "ZURIEL 2026-09-08", "iron": true, "legacy_palette_v1": {"gold": "#d4af37", "goldBright": "#f6e27a", "goldLight": "#e8c840", "ink_on_gold": "#1a0e00"}, "migration": "shared-components-first; no blind repository-wide restyle", "owner_check": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "confidence": "high", "domain": "brand_design", "normalized_at": "2026-11-11", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "resolution": "RESOLVED_G2_COMPACTION"}, "separate_owners": {"chrome": "chromeTheme.js", "content_controls": "palette.js/usePalette", "world_semantics": "worlds.js"}, "status_roles": ["building", "success", "warning", "danger", "info"], "theme_chain": ["themeMode", "effectiveMode", "usePalette", "semantic role", "canonical component", "surface"], "v3_owner_alignment": {"change": "design-contract owner V1 → V2 (V1 kept as history)", "frozen_exemption": {"g3_disposition_v1_unchanged": true, "g3_freeze_kept_for_everything_else": true, "scope": "V1→V2 owner alignment only"}, "human_gate": "ZURIEL 2026-11-11 (החלטה 5 — החרגה נקודתית מהקפאת G3 ליישור V1→V2 בלבד)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}}$sod_meta$::jsonb, true, 'canonical_colors_law', 3,
          v_base.depends_on, 2, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '4acdef410c49fb89d0907ea80caa4d74' then
    raise exception 'S24 canonical_colors_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='canonical_colors_law' and is_active) <> 1 then
    raise exception 'S24 canonical_colors_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── logo_integrity_law: v3 → v4 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='logo_integrity_law' and is_active for update;
  if not found then raise exception 'S24 logo_integrity_law: no active version (drift)'; end if;
  if v_base.rule_version <> 3 then raise exception 'S24 logo_integrity_law: active version is v% (expected v3)', v_base.rule_version; end if;
  if md5(v_base.description) <> '907e50b6ab2fced3a58241aedc0ddd78' then raise exception 'S24 logo_integrity_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '05e8fcab68e2d45d6733fe5e86ef94b8' then raise exception 'S24 logo_integrity_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='logo_integrity_law' and rule_version > 3) then
    raise exception 'S24 logo_integrity_law: a version above v3 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Brand Mark Integrity v4 — Full Hebrew Lockup Only · Crown Never Alone$sod_lbl$, $sod_txt$
Human-Gate ZURIEL · 1.10.2026. EXTEND_EXISTING under SOD1820_DESIGN_CONTRACT_V2.md (written under V1; V1 is kept as history).

1. CANONICAL LOGO = ONE INSEPARABLE LOCKUP. The SOD1820 logo is always the approved crown artwork together with the exact protected Hebrew wordmark «כי לה׳ המלוכה». Crown and wordmark are one visual identity.
2. CROWN NEVER ALONE. The crown must never be used by itself as a logo, watermark, avatar, thumbnail mark, favicon brand substitute, video corner mark, share mark or any other branded projection.
3. NO CROPPING / NO WORDMARK REMOVAL. Never crop, hide, remove or replace the Hebrew wordmark. If a surface is too small to preserve the full lockup legibly, omit the brand mark or use a non-logo neutral UI symbol; do not substitute crown-only.
4. NO ENGLISH INSIDE THE LOGO. «KINGDOM RISE», «SOD1820» and any other Latin/English copy are not part of the canonical logo artwork.
5. HEBREW VIDEO RULE. In authored Hebrew video, the in-video brand mark is the full canonical lockup only: crown + «כי לה׳ המלוכה». No English words are added to the logo.
6. INTRO / OUTRO DOMAIN EXCEPTION. At the beginning and/or ending of an authored Hebrew video, the separate live-text domain «sod1820.co.il» may be added beneath or near the full canonical logo. The domain is supporting information, never part of the logo artwork, and is not required during the body of the video.
7. EXACT ARTWORK. The crown and protected Hebrew wordmark are not regenerated, redrawn, retyped, morphed or reconstructed by AI. They are composited as exact protected artwork after any generated scene/background.
8. SMALL USE. Small placement is allowed only by proportional scaling of the full lockup while preserving the Hebrew words. No crown-only small variant exists.
9. HERITAGE. /logo.png remains preserved as Heritage compatibility where legacy runtime still depends on it; it does not redefine Primary 2029 identity.
10. ONE OWNER. This rule extends SOD1820_DESIGN_CONTRACT_V2.md (formerly V1) / sod1820_canonical_identity_law and creates no parallel Brand System, Store, Registry or media-specific branding system.

[v4 · 11.11.2026 · יישור בעלים — החרגה נקודתית מהקפאת G3 (החלטת צוריאל 5, 11.11.2026)] בעל חוזה העיצוב: SOD1820_DESIGN_CONTRACT_V2.md (SOD1820_DESIGN_CONTRACT_V1.md נשמר כהיסטוריה). כללי שלמות הסימן והלוקאפ לא השתנו.$sod_txt$, $sod_meta${"added_by": "צוריאל", "added_date": "2026-07-14", "approved_reference": {"actual_mime": "image/jpeg", "created_at": "2026-09-17T09:25:45.159Z", "file_id": "1Y3lDxlwRCJroaiUwBB8XTbtrMrJy-uvc", "provider": "google_drive", "role": "APPROVED_ARTWORK_REFERENCE_NOT_TRANSPARENT_MASTER", "size_bytes": 406511, "title": "sod1820-upload-test-middle-logo.png"}, "asset_pack_state": "MASTER_LOCKUP_APPROVED", "canonical_logo": "/logo.png", "canonical_logo_semantics": {"crown": "approved_blue_gold_crown", "crown_alone_forbidden": true, "english_inside_logo": false, "hebrew_wordmark": "כי לה׳ המלוכה", "inseparable_full_lockup": true}, "canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "compaction_v1": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "brand_design", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md"}, "exact_master_asset": {"allowed_transformations": ["uniform_scale", "whole_lockup_position", "opacity", "external_glow_behind_lockup"], "byte_size": 2405610, "crown_position_locked": true, "file_name": "sod1820_primary_hebrew_lockup_transparent_v1.png", "forbidden_transformations": ["move_crown_relative_to_wordmark", "move_wordmark_relative_to_crown", "change_spacing", "change_relative_scale", "crop_wordmark", "crop_crown", "warp", "redraw", "regenerate", "retype"], "geometry_locked": true, "height": 1506, "human_gate": "ZURIEL 2026-10-01", "mime": "image/png", "mode": "RGBA", "relative_scale_locked": true, "sha256": "d543689eb92bb2a01bb9d5cf1f3907b6fbb7f092c8cf0395c14815e072184b34", "status": "APPROVED_EXACT_MASTER_PNG", "symmetry_locked": true, "width": 1664, "wordmark_position_locked": true}, "forbidden": ["crown-icon.png (כתר בלבד)", "favicon.svg (✦)", "favicon.ico (לא קיים)", "purpose:maskable"], "forbidden_primary_variants": ["crown_only", "icon_crown_crop", "wordmark_removed", "english_inside_logo", "kingdom_rise_inside_logo"], "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "scoped semantic contract currently unique enough to remain active; G3 implementation must consume it rather than legacy UI/code, and final G3 compaction may absorb/archive it after proving semantic preservation"}, "heritage_logo": {"path": "/logo.png", "preserve": true, "primary_2029": false, "role": "HERITAGE_COMPATIBILITY"}, "human_gate": "ZURIEL 2026-10-01", "no_heritage_fallback_for_primary_2029": true, "owner_check": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "confidence": "high", "domain": "brand_design", "normalized_at": "2026-11-11", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "primary_2029": {"canonical_hebrew_identity": "סוד 1820", "canonical_latin_identity": "SOD1820", "heritage_wordmark": "כי לה׳ המלוכה", "master_mark": "blue_gold_crown", "protected": true}, "required_asset_pack": ["hebrew_master_lockup_transparent", "asset_metadata_dimensions_checksum_clearspace"], "supersedes_logo_integrity_version": 2, "v4_owner_alignment": {"change": "design-contract owner V1 → V2 (V1 kept as history)", "frozen_exemption": {"g3_disposition_v1_unchanged": true, "g3_freeze_kept_for_everything_else": true, "scope": "V1→V2 owner alignment only"}, "human_gate": "ZURIEL 2026-11-11 (החלטה 5 — החרגה נקודתית מהקפאת G3 ליישור V1→V2 בלבד)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}, "video_hebrew": {"body_logo": "FULL_LOCKUP_ONLY", "domain_is_logo": false, "english_words_in_logo": false, "intro_outro_domain": "sod1820.co.il"}}$sod_meta$::jsonb, true, 'logo_integrity_law', 4,
          v_base.depends_on, 3, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '831d3a87ecdc0052874525200f4eb39f' then
    raise exception 'S24 logo_integrity_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='logo_integrity_law' and is_active) <> 1 then
    raise exception 'S24 logo_integrity_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── sod1820_canonical_identity_law: v5 → v6 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='sod1820_canonical_identity_law' and is_active for update;
  if not found then raise exception 'S24 sod1820_canonical_identity_law: no active version (drift)'; end if;
  if v_base.rule_version <> 5 then raise exception 'S24 sod1820_canonical_identity_law: active version is v% (expected v5)', v_base.rule_version; end if;
  if md5(v_base.description) <> '4d0d256bd950e10afe58f43c07fe8056' then raise exception 'S24 sod1820_canonical_identity_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '6e2d675d00746467d90b7e6b3ce87c01' then raise exception 'S24 sod1820_canonical_identity_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='sod1820_canonical_identity_law' and rule_version > 5) then
    raise exception 'S24 sod1820_canonical_identity_law: a version above v5 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Brand Core 2029 v6 — Inseparable Crown + Hebrew Wordmark$sod_lbl$, $sod_txt$Human-Gate ZURIEL 17.9.2026. EXTEND_EXISTING only under SOD1820_DESIGN_CONTRACT_V2.md (written under V1; V1 is kept as history). v3 preserves v2 identity/mark/expression/lens/color decisions and locks the second Brand Core layer across site, World, Heichal, Raziel, posts, Share Cards, AI image/video generation, Remotion and future projections. TYPOGRAPHY: the protected Hebrew heritage wordmark «כי לה׳ המלוכה» is artwork, not live font text, and must not be retyped/redrawn in branded lockups. Live typography consumes existing semantic roles F.ui / F.body / F.display / F.numeric and existing type scale; no new brand-font owner. MOTION: brand artwork may translate, scale, fade, reveal, receive restrained glow/light sweep/depth/orbit context, but must not morph, redraw, distort or regenerate. Motion meaning is canonical; exact duration/composition is surface projection. Consume existing designTokens.MOTION and reduced-motion behavior; Remotion maps the same tokens to frames, not a separate motion system. AI BRAND CONTEXT: every SOD1820 branded generation derives from this canonical identity, mark, expressions by locale, color-role ownership, typography roles, voice/truth constraints, environment role and safe-area requirement. Generative AI creates scene/environment candidates, not the Master Mark or protected Hebrew wordmark. Canonical brand assets are composited as exact overlays after generation. SAFE AREAS: every branded representation reserves a brand-safe/focal region that survives target crop; exact coordinates vary by aspect/surface and are projection. Required brand text is not baked into generated backgrounds. REQUIRED ASSET PACK: one canonical Master Crown transparent asset; one protected Hebrew heritage wordmark transparent asset; one Hebrew master lockup Crown+wordmark; one icon/crown crop; asset metadata including dimensions/checksum/clear-space. KINGDOM RISE, SOD1820, URL and content titles remain live typography by default unless a separately approved exact artwork asset exists. CANONICAL = identity, protected artwork, expression mapping, semantic typography roles, motion semantics, AI brand-generation constraints, safe-area principle and required asset identities. PROJECTION = size, placement, crop/aspect, exact timing, scene/background, density, optional expression/URL/title and safe-area coordinates. No Brand System/Store/Registry, no motion engine, no media registry, no palette owner and no video-specific brand system are created.

[UPDATE v4 · Human-Gate ZURIEL · 17.9.2026 — EXPERIENCE PROJECTION MATRIX · EXTEND_EXISTING]
BRAND CORE IS RENDERER-AGNOSTIC. The canonical SOD1820 context is composed once and consumed by Web/UI, interactive motion, Canvas, GPU 3D, AI image/video generation, Share Cards, Remotion, audio/narration and future XR. There is no separate image/video/3D/audio brand.
Every renderer resolves, as applicable: canonical identity; Master Mark; protected Hebrew wordmark; locale/public expression; color roles; typography roles; surface voice role; motion vocabulary; spatial tier; voice mode; caption mode; environment role; AI visual freedom; safe area; truth-safe constraints; and performance/accessibility fallback.
AI may generate environment/scene/atmosphere/spatial candidates but never regenerate the protected Master Crown or Hebrew wordmark and never bake required brand text into uncontrolled pixels. Canonical artwork is composited deterministically.
CANONICAL = identity/artwork, semantic color and typography roles, voice character, motion vocabulary, spatial/audio invariants, AI constraints, safe-area principle and fallback semantics. PROJECTION = renderer, spatial tier, exact TTS provider/model, timing/easing/camera/lighting/material/fog/particles/audio mix/layout/crop and optional title/URL/expression.
OWNER CHECK: Brand stays under the Design Contract / this identity law; Experience v5 owns contextual audio-motion-spatial behavior; Raziel and Publishing keep their existing voice owners. One composed runtime context, no new store/registry/system.

[UPDATE v5 · Human-Gate ZURIEL · 1.10.2026 — PRIMARY LOCKUP FINALIZATION]
The Primary SOD1820 logo is one inseparable protected artwork lockup: approved crown + exact Hebrew wordmark «כי לה׳ המלוכה». Crown-only is forbidden on every branded surface, including small marks and video watermarks. The former icon_crown_crop requirement is superseded and removed. No English wording is part of the logo. For authored Hebrew video, the full lockup is used throughout; only in intro/outro may the separate live-text domain «sod1820.co.il» be added as supporting information. KINGDOM RISE may remain historical/optional English-language copy outside the logo when a separately governed English surface needs it, but it is never part of the canonical logo and is not used in the Hebrew video lockup.

[v6 · 11.11.2026 · יישור בעלים — החרגה נקודתית מהקפאת G3 (החלטת צוריאל 5, 11.11.2026)] בעל חוזה העיצוב: SOD1820_DESIGN_CONTRACT_V2.md (SOD1820_DESIGN_CONTRACT_V1.md נשמר כהיסטוריה). החלטות הזהות, הסימן, הביטוי, העדשות והצבע לא השתנו.$sod_txt$, $sod_meta${"ai_brand_context": {"composite_canonical_assets_after_generation": true, "consume_color_roles": true, "consume_environment_role": true, "consume_identity": true, "consume_locale_expression": true, "consume_safe_area": true, "consume_typography_roles": true, "consume_voice_truth_constraints": true, "generate_scene_not_logo": true}, "asset_pack_state": "MASTER_LOCKUP_APPROVED", "canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "compaction_v1": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "classification": "CHILD_OF_OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "brand_design", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md"}, "exact_master_asset": {"allowed_transformations": ["uniform_scale", "whole_lockup_position", "opacity", "external_glow_behind_lockup"], "byte_size": 2405610, "crown_position_locked": true, "file_name": "sod1820_primary_hebrew_lockup_transparent_v1.png", "forbidden_transformations": ["move_crown_relative_to_wordmark", "move_wordmark_relative_to_crown", "change_spacing", "change_relative_scale", "crop_wordmark", "crop_crown", "warp", "redraw", "regenerate", "retype"], "geometry_locked": true, "height": 1506, "human_gate": "ZURIEL 2026-10-01", "mime": "image/png", "mode": "RGBA", "relative_scale_locked": true, "sha256": "d543689eb92bb2a01bb9d5cf1f3907b6fbb7f092c8cf0395c14815e072184b34", "status": "APPROVED_EXACT_MASTER_PNG", "symmetry_locked": true, "width": 1664, "wordmark_position_locked": true}, "experience_projection_matrix_v1": {"context_fields": ["canonical_identity", "master_mark", "protected_wordmark", "locale_expression", "color_roles", "typography_roles", "surface_voice_role", "motion_vocabulary", "spatial_tier", "voice_mode", "caption_mode", "environment_role", "ai_visual_freedom", "safe_area", "truth_constraints", "performance_fallback"], "experience_owner": "experience_governance_foundation_v1_law v5", "human_gate": "ZURIEL 2026-09-17", "no_new_store_registry": true, "no_separate_media_branding": true, "one_context_many_renderers": true, "renderers": ["web_ui", "interactive_motion", "canvas", "gpu_3d", "ai_image", "ai_video", "share_card", "remotion", "audio_narration", "future_xr"]}, "g3_disposition_v1": {"classification": "KEEP_SCOPED_SEMANTIC", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "scoped semantic contract currently unique enough to remain active; G3 implementation must consume it rather than legacy UI/code, and final G3 compaction may absorb/archive it after proving semantic preservation"}, "hebrew_video_projection": {"brand_mark": "hebrew_master_lockup_transparent", "domain_separate_live_text": true, "intro_outro_optional_domain": "sod1820.co.il", "kingdom_rise": false}, "human_gate": "ZURIEL 2026-10-01", "inherits_rule": "sod1820_canonical_identity_law v2", "motion": {"canonical_semantics": ["translate", "scale", "fade", "reveal", "restrained_glow", "light_sweep", "depth", "orbit_context"], "forbidden": ["morph_master_mark", "redraw_master_mark", "distort_master_mark", "regenerate_master_mark", "retype_or_redraw_hebrew_wordmark"], "owner": "src/lib/designTokens.js:MOTION", "reduced_motion_required": true, "remotion_is_projection": true}, "no_new_system": true, "owner_check": "EXTEND_EXISTING", "owner_routing": {"canonical_owner": "SOD1820_DESIGN_CONTRACT_V2.md", "confidence": "high", "domain": "brand_design", "normalized_at": "2026-11-11", "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "resolution": "RESOLVED", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1}, "previous_canonical_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "primary_lockup": {"crown": "approved_blue_gold_crown", "crown_alone_forbidden": true, "english_inside_logo": false, "hebrew_wordmark": "כי לה׳ המלוכה", "inseparable": true}, "projection_fields": ["size", "placement", "crop", "aspect_ratio", "exact_timing", "scene_background", "density", "optional_expression", "optional_url", "optional_title", "safe_area_coordinates"], "removed_asset_identity": "icon_crown_crop", "required_asset_pack": ["hebrew_master_lockup_transparent", "asset_metadata_dimensions_checksum_clearspace"], "safe_area": {"coordinates_projection": true, "no_required_brand_text_baked_into_background": true, "principle_canonical": true, "survive_crop": true}, "supersedes_identity_version": 4, "typography": {"heritage_wordmark_is_artwork": true, "live_roles": ["F.ui", "F.body", "F.display", "F.numeric"], "new_font_owner": false}, "v6_owner_alignment": {"change": "design-contract owner V1 → V2 (V1 kept as history)", "frozen_exemption": {"g3_disposition_v1_unchanged": true, "g3_freeze_kept_for_everything_else": true, "scope": "V1→V2 owner alignment only"}, "human_gate": "ZURIEL 2026-11-11 (החלטה 5 — החרגה נקודתית מהקפאת G3 ליישור V1→V2 בלבד)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}, "video_brand_frame_projection_v1": {"aspect_ratio": "9:16", "center_content_must_remain_open": true, "cta_73_position": "NEAR_END_BEFORE_OUTRO", "frame_candidate_file": "sod1820_video_header_20_30_v1.png", "frame_candidate_sha256": "4449b9ae242110b3c95e618dc7a5c85af70797e05d3e01fcfe0d135f25ce1af3", "human_gate": "ZURIEL 2026-10-01", "logo_asset_sha256": "d543689eb92bb2a01bb9d5cf1f3907b6fbb7f092c8cf0395c14815e072184b34", "logo_must_be_exact_master_png": true, "long_full_height_columns_forbidden": true, "rendering_rule": "frame geometry may be ornamented/animated, but must preserve 20/30 bounds and exact canonical logo geometry", "side_descender_max_height_pct": 30, "status": "APPROVED_VIDEO_FRAME_GEOMETRY", "top_structure_max_height_pct": 20}}$sod_meta$::jsonb, true, 'sod1820_canonical_identity_law', 6,
          v_base.depends_on, 5, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '7fc06a4ebcc78e202ae2ff42b22a84d4' then
    raise exception 'S24 sod1820_canonical_identity_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='sod1820_canonical_identity_law' and is_active) <> 1 then
    raise exception 'S24 sod1820_canonical_identity_law: active version count is not 1';
  end if;
end
$sod_blk$;

-- ── research_workspace_law: v5 → v6 ───────────────────────────────────────────────
do $sod_blk$
declare
  v_base public.nodes%rowtype;
  v_new_id uuid;
begin
  select * into v_base from public.nodes
   where type='rule' and rule_id='research_workspace_law' and is_active for update;
  if not found then raise exception 'S24 research_workspace_law: no active version (drift)'; end if;
  if v_base.rule_version <> 5 then raise exception 'S24 research_workspace_law: active version is v% (expected v5)', v_base.rule_version; end if;
  if md5(v_base.description) <> '382683c7c6e98f7c7d3b6c19a9bb730a' then raise exception 'S24 research_workspace_law: description drift (md5 %)', md5(v_base.description); end if;
  if md5(v_base.metadata::text) <> '399bbac895ce6926fd29b31f1ccf8cc3' then raise exception 'S24 research_workspace_law: metadata drift (md5 %)', md5(v_base.metadata::text); end if;
  if exists (select 1 from public.nodes where type='rule' and rule_id='research_workspace_law' and rule_version > 5) then
    raise exception 'S24 research_workspace_law: a version above v5 already exists';
  end if;
  update public.nodes set is_active=false where id=v_base.id;
  insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,depends_on,supersedes_version,weight,hebrew_date,axis_theme,gallery_id,identity_key)
  values ('rule', $sod_lbl$Research Workspace v6 — Unified Journey 2029 / One Path Family$sod_lbl$, $sod_txt$[v2 · Human-Gate ZURIEL · 9.9.2026 — 2027 ADAPTIVE SUPERSESSION]

OWNER: Research OS / research workspace behavior. EXTEND_EXISTING; this v2 supersedes presentation-specific v1 while preserving its useful capability semantics and history.

CORE INVARIANTS
1. ONE RESEARCH OS. ResearchProvider/Research Context/Research Bus and the existing governed research/personal stores remain the shared substrate. No second Workspace, Context store, graph, saved-items system, Journey store or AI truth store may be created for a new surface.
2. CONTEXT NEVER DISAPPEARS. Subject/root, selection, dimensions/lens, Journey position and exact return references travel across Number/Phrase, Book, ELS, World, Heichal, Post and other projections through the canonical Research Context/Journey owners. Context is navigation/research state, never truth.
3. PAGE DUALITY. First-class products/content may remain directly addressable and SEO/deep-link capable while also participating in the shared Research OS. Heichal is optional deep-research mode, never a mandatory gateway.
4. PERSONAL IS A PROJECTION. My Workspace composes research items, saved state, Journeys, notifications/messages, contributions, profile, credits/access/preferences from their existing owners. It is not a duplicate research system.
5. SEMANTIC ACTIONS, NOT FIXED BUTTONS. Add-to-research, save, share, inspect, compare, run-tool, ask-Raziel, return-exact and related actions keep one semantic capability identity while presentation may be toolbar, dock, palette, rail, sheet, shortcut or contextual control. Reuse canonical components/readers when they exist.
6. LOCAL-FIRST WHERE ALREADY SUPPORTED, CLOUD SYNC WHERE AUTHORIZED. Do not destroy or orphan existing personal research state during shell migration.
7. PROGRESSIVE DISCLOSURE + MOBILE-FIRST remain product requirements: simple first use, deeper capability on demand, keyboard/mobile/accessibility equivalents for graph/drag interactions.
8. TRUTH/HUMAN GATE. Tool/AI output is typed research state with provenance; AI may calculate through governed engines, interpret, rank and recommend but does not independently canonicalize or publish.
9. EVENT/OBSERVABILITY CONTINUITY. Meaningful actions emit/track semantic events through existing event/telemetry owners. UI placement/button IDs are not analytical identity.
10. VISUAL LANGUAGE IS NOT OWNED HERE. Colors, typography, spacing, motion and theme belong to the Design/semantic-theme owners and may be redesigned without changing Research OS semantics.

2027 ADAPTIVE SHELL SUPERSESSION
- v1 wording that mandates a fixed Header + Navigation + Footer, a fixed desktop side column, one permanent Bottom Sheet form, a fixed four-zone screen, or a specific palette is historical presentation guidance and is superseded.
- The shell may project a persistent Orientation Header, a collapsible desktop Global Navigator/Sidebar, adaptive commands, contextual inspector, Raziel companion and My Workspace entry. Capability is stable; placement is responsive/task-specific.
- Full-focus/fullscreen Book/ELS/Heichal/World modes are allowed when orientation, context, return path, accessibility and safe overlay behavior remain recoverable.

NUMBER/PHRASE BRIDGE
Number/Phrase remains directly addressable and connected now; full redesign is deliberately deferred until the wider 2027 system is visible. Preserve current high-value capabilities: vitality/pulse; convergence snapshot/map; real method-switching state with downstream updates; cross-method/hidden intersections where governed; AI number analysis re-presentable through Raziel; Discovery Engine findings; sources/relations/Books/ELS/Posts/Galleries/Events; save/research/return continuity. Presentation may later be rebuilt from first principles without dropping these capability contracts.

IMPLEMENTATION-HONESTY
Historical v1 claims that a canonical <ToolActions> merge already existed were later proven stale. Current implementation must always be verified from origin/main before claiming a component is implemented. Preserve capability intent, not stale implementation claims.


[UPDATE v3 · Human-Gate ZURIEL · 15.9.2026 — G2 FINAL COMPACTION / RESEARCH OS CHILD CONSOLIDATION, additive; EXTEND_EXISTING]
6. ONE RESEARCH OS, FEWER ACTIVE MICRO-LAWS. Historical UI/product rules such as Insight Card, Pearl, Research Dossier, Tzuriel Lab, four Research Space lenses, generic tools-interconnect and fixed researcher-page composition are preserved as provenance but no longer participate in normal active routing. Their useful capability survives as projections/actions over this owner + Research Context + domain owners.
7. CONTRIBUTOR/RESEARCHER IS A LENS, NOT A STORE. Contributor pages/projected dossiers query the same canonical Posts, Findings, Media, Sources, Events, ELS results, Contributions and relations with attribution/provenance. No contributor-specific truth/content ontology. Legacy contributor media/content remains migration evidence only.
8. RESEARCH CONTRIBUTIONS ARE AN INPUT PIPELINE, NOT A SECOND GOVERNANCE SYSTEM. Existing research_contributions data may continue to store community/research input. Any local moderation/research_state vocabulary cannot outrank Truth Axes. Candidate/approved/canonical/published transitions follow current Truth/Human-Gate owners; old contribution UI/lifecycle wording is historical where it conflicts.
9. JOURNEY GUARDS ARE RUNTIME SAFETY, NOT SEMANTIC OWNER. The historical sessionStorage AI-message guard remains implementation provenance. G3 replay/idempotency/failure-recovery must provide general protection under Foundation/Research runtime; no separate Journey-AI law is required for routing.
10. SPATIAL/LAYERED/3D ARE OPTIONAL PROJECTIONS, NOT A MANDATORY RESEARCH ARCHITECTURE LAYER. All renderers consume the same Research State/Findings/provenance. Current Experience/Design owners decide rendering depth. Legacy wording that 3D is “first-class NOW” does not force a renderer, route or product inheritance in G3.
11. INTERPRETIVE FRAMEWORKS ARE RESEARCH CONTENT/LENSES. Source-supported facts and interpretations remain truth-distinct under Truth Axes. Tarot/astrology/mythology or other interpretive traditions, where researched, are opt-in research material, not global system law.
12. KEEP DIRECT INVARIANTS SMALL. `research_object_identity_invariant_law` remains a direct live invariant because it enforces source-native object identity. `workspace_layout_standard` remains the scoped adaptive-layout child. Everything else should route through this Workspace owner, Research Strategy, Intake, Truth or the relevant domain owner.
OWNER CHECK: EXTEND_EXISTING research_workspace_law. No new workspace/context/journey/store/graph.

[UPDATE v4 · Human-Gate ZURIEL · 17.9.2026 — ONE CONTEXT / SURFACE TRANSITION CONTRACT · EXTEND_EXISTING]

1. ONE SEMANTIC SUBJECT, MANY PRODUCT HOMES. Moving between World, Number/Expression, Heichal, Books/Sources, ELS, Journey, Workspace, Raziel and Inspect/Trace changes the projection/task mode, not the underlying identity, truth or Research OS. A surface never mints a duplicate subject merely because the user entered a different product home.

2. SURFACE ROLE CONTRACT. World answers “מה מתחבר?” and owns breadth/discovery/contextual orientation. Number/Expression is the canonical-detail home for a Number or exact Expression and answers “מהו הדבר הזה בדיוק?” through governed projections; it does not own engine truth. Heichal answers “איך בודקים?” and is the action/deep-research home for calculate/compare/search/run/inspect operations. Books/Sources is the exact witness/source/locator home. ELS is the specialized cipher/search/replay home. Journey answers “לאן זה מוביל?” and owns path continuity/why-transition/exact-return state. Workspace is the personal saved/resumable projection. Raziel answers “מה כדאי לעשות עכשיו?” as the same companion over the current context and may act in-place without forcing navigation. Inspect/Trace/Explain-Why is the precision/provenance layer. Posts/Public Content remain narrative/public representations over the same identities and research.

3. TRANSITION ROUTING. From any surface: choosing a stable Number/Expression and asking for exact identity/detail routes to Number/Expression; asking to calculate/compare/test/run a capability routes to Heichal; asking for the exact witness/locator routes to Books/Sources; asking for ELS search/coordinates/replay routes to ELS; asking to preserve/continue the path routes to Journey; asking to manage saved/personal research routes to Workspace; asking what to do next invokes Raziel in the current surface when possible; asking why/how exactly opens Inspect/Trace. These are semantic transitions, not URL-specific rules.

4. CONTEXT HANDOFF IS LOSSLESS WITHIN AUTHORIZATION. Subject/root, exact selection, lens/dimensions, Journey position, why-transition, source/selection provenance where applicable, returnTo/exact-return and authorized personal context travel across transitions. Privacy/access filtering happens before composition. URL/route/display label are representations, never identity authority.

5. WORLD SATURATION / EXIT GATE. World must not absorb every downstream capability. World is sufficient for an Anchor when it can: (a) orient the user human-first; (b) show the bounded important/typed connections honestly; (c) explain why an item is here; and (d) route any requested deepening to the correct product home while preserving exact return. After this gate, additional exact calculation detail, source inspection, tool execution, path management or personal management belongs to the relevant home rather than making World larger.

6. NUMBER/EXPRESSION IS DETAIL, NOT A SECOND ENGINE. Number/Expression may compose identity profile, governed Gematria/method results, sources, relations, Research OS material, events/media/people and current curated anchor profile. Exact Expression remains distinct from Number and Concept. The surface never recalculates locally, never owns method truth and never duplicates World/Heichal stores.

7. DEPENDENCY-AWARE IMPLEMENTATION DIRECTION. Do not wait for World to become an all-purpose finished universe before building the rest of the tree. Once the World Exit Gate is satisfied for representative rich/medium/sparse anchors, the next dependency is the canonical Number/Expression detail home, because World needs a stable deepening target. Then establish Heichal + Books/Sources deep-work/source paths; prove Journey exact-return across multiple homes; ELS remains the early Golden specialized experience; Raziel text/tools consumes the same Context after the underlying homes/capabilities are real. This is a dependency handoff, not permission to bypass lower engine/Research OS/access rails.

8. ONE TREE ACCEPTANCE. A representative path such as World(1820) -> Number(1820) -> Expression -> Source -> Heichal action -> ELS/other capability -> Journey -> exact return must preserve identity, semantic state, provenance, access and why-transition without copying truth or requiring a parallel context store.

OWNER CHECK: EXTEND_EXISTING research_workspace_law, consuming Reality Graph, Research Strategy/Context, Truth and Experience surface-role governance. No navigation store, surface graph, Number store, Journey graph, Context DB or page-specific truth system is created.

[UPDATE 27.9.2026 — UNIFIED JOURNEY 2029 / ONE PATH FAMILY · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING. Journey remains a Research OS capability under this Workspace/Research Context lineage. No second Journey engine, graph, context, history store or Life-Journey store is created.

CANONICAL 2029 DURABLE SUBSTRATE. research_paths is the stable Journey/Path identity and research_path_revisions is its revision lineage. A saved/resumable 2029 Journey MUST persist through the existing bounded Research Path RPC/runtime family. research_plans is not a Journey store. Legacy journey_saves and user_research.journeys remain preserved compatibility/history input only and MUST NOT become authority for new Journey 2029 or its public metrics.

JOURNEY IDENTITY. Path identity != revision != branch != Research Context != Finding != telemetry event. Research Context may carry journey.kind=research_path plus path/revision/position to preserve exact return. Forking creates a branch Path with preserved parent/revision/step lineage, not a duplicate truth tree.

ONE FAMILY, MANY KINDS. All new Journey experiences consume the same Path/Context contract and differ only by journey_kind / lenses / subject. Initial controlled kinds: discovery, number_expression, person_life, name, els, source_book, topic_event, general_research. guided/organic is a journey_mode over the same kind, never a second store/system. New kinds require owner-approved semantic extension, not a new Journey implementation.

START SEMANTICS. Opening a page, typing a query, executing one search, computing one number, or viewing one result is NOT by itself a Journey start. A 2029 Journey starts when either (a) the person explicitly invokes Start/Continue Journey for a valid Research Context, or (b) the person makes the first semantic transition from a valid root result/context into a connected second research state while Journey mode is active. Repeated steps in the same active Journey do not create additional starts.

DISCOVERY/SEARCH JOURNEY. Search remains a Discovery action. It becomes journey_kind=discovery only when the user explicitly starts/continues a Journey or follows a connected result into the first Journey transition. Search totals and Journey totals remain separate. Raw search terms are not public Journey telemetry.

NUMBER/EXPRESSION JOURNEY. Traversal from a Number/Expression root across governed relations, methods, sources, ELS, Topics/Convergences or other connected Findings uses journey_kind=number_expression and the same Research Path substrate. A method click or calculation alone is not a Journey start.

PERSON/LIFE JOURNEY. journey_kind=person_life is a person-ref-scoped traversal across authorized Findings/relations about a person. The current Legacy PersonJourney.jsx foundation establishes self/family identity only and is NOT yet the full Person/Life Journey; save_self/add_member/add_relation events do not count as Journey starts. A true Person/Life Journey begins only when the person context enters Finding/relationship traversal under the unified 2029 contract. Private person/name/family values must never be copied into public telemetry.

NAME JOURNEY. journey_kind=name traverses Universal Findings produced for a Name subject across governed lenses. NameLab findings may feed it, but Name Journey is traversal, not a Finding and not Person/Life Journey.

ELS JOURNEY. journey_kind=els consumes the canonical ELS identity/replay coordinates through Research Context and Research Path. Existing ELS breadcrumb/replay capability is a consumer; it must not own a parallel Journey store.

SOURCE/TOPIC/EVENT JOURNEYS. Books/Sources and Topic/Event roots remain ordinary kinds over the same Path identity/revision contract. Their exact locators/provenance travel in authorized Research Context/Path representations.

LEGACY EXCLUSION. Legacy JourneyPage, journey_saves, user_research.journeys, surface=journey telemetry, journey_trace telemetry and historical addJourney collections may be preserved for continuity/migration evidence but MUST NOT be counted as Journey 2029 starts and MUST NOT be silently blended into 2029 public Pulse. Migration is adapter-first and explicit.

CURRENT DRIFT / IMPLEMENTATION STATE 27.9.2026. research_paths=0 and research_path_revisions=0 live rows despite a live save/resume/fork runtime. World 2029 Golden Journey 878 still consumes ResearchProvider.addJourney/user-research Journey state rather than research_paths. No Journey2029 route/page is present. PersonJourney.jsx is foundation-only and explicitly says cross-Finding traversal is future. These are implementation gaps, not permission to create parallel systems.

[v6 · 11.11.2026 · יישור בעלים (החלטת צוריאל 5, 11.11.2026)] בעל חוזה העיצוב: SOD1820_DESIGN_CONTRACT_V2.md (SOD1820_DESIGN_CONTRACT_V1.md נשמר כהיסטוריה). סמנטיקת סביבת המחקר לא השתנתה.$sod_txt$, $sod_meta${"architecture": "adaptive_2027", "compaction_v1": {"canonical_owner": "research_workspace_law", "classification": "OWNER", "classified_at": "2026-09-15", "gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "research_os"}, "context_continuity": true, "fixed_layout_required": false, "fullscreen_allowed_with_context": true, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER", "classified_at": "2026-09-15", "gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "no_automatic_runtime_inheritance": true, "normal_startup": true, "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate"}, "heichal_optional_deep_mode": true, "journey_2029_v1": {"approved_at": "2026-09-27", "approved_by": "ZURIEL", "compute_alone_is_journey": false, "durable_path_store": "research_paths", "exact_return_required": true, "journey_kinds": ["discovery", "number_expression", "person_life", "name", "els", "source_book", "topic_event", "general_research"], "journey_modes": ["organic", "guided"], "legacy_excluded_from_2029_count": ["journey_saves", "user_research.journeys", "legacy JourneyPage telemetry", "ResearchProvider.addJourney legacy collection"], "live_drift": {"journey2029_surface_present": false, "person_life_finding_traversal_built": false, "research_path_revisions_rows": 0, "research_paths_rows": 0, "world_878_uses_legacy_addJourney": true}, "no_new_journey_store": true, "owner_check": "EXTEND_EXISTING", "person_foundation_actions_are_journey_start": false, "revision_store": "research_path_revisions", "search_alone_is_journey": false}, "my_workspace_projection": true, "number_phrase_bridge": "CONNECT NOW · REDESIGN LATER", "one_research_os": true, "owner_routing": {"canonical_owner": "docs/research-studio-v1-contract.md", "domain": "research_os", "normalized_at": "2026-09-09", "resolution": "EXTEND_EXISTING"}, "page_duality": "direct+SEO and integrated Research OS", "previous_visual_owner": "SOD1820_DESIGN_CONTRACT_V1.md", "supersession_note": "v1 preserved as history; v2 supersedes presentation-specific layout/palette/product-naming clauses", "surface_transition_v1": {"human_gate": "ZURIEL 2026-09-17", "next_dependency_after_world": "NUMBER_EXPRESSION", "no_new_system": true, "principle": "ONE_CONTEXT_MANY_PRODUCT_HOMES", "world_exit_gate": true}, "v6_owner_alignment": {"change": "design-contract owner V1 → V2 (V1 kept as history)", "human_gate": "ZURIEL 2026-11-11 (החלטה 5 — הפניות לחוזה העיצוב התקף)", "owner_check": "EXTEND_EXISTING", "semantics_changed": false}, "visual_owner": "SOD1820_DESIGN_CONTRACT_V2.md"}$sod_meta$::jsonb, true, 'research_workspace_law', 6,
          v_base.depends_on, 5, v_base.weight, v_base.hebrew_date, v_base.axis_theme, v_base.gallery_id, v_base.identity_key)
  returning id into v_new_id;
  if (select md5(description) from public.nodes where id=v_new_id) <> '7220cc852c3b74da52900462aede9718' then
    raise exception 'S24 research_workspace_law: new description md5 mismatch';
  end if;
  if (select count(*) from public.nodes where type='rule' and rule_id='research_workspace_law' and is_active) <> 1 then
    raise exception 'S24 research_workspace_law: active version count is not 1';
  end if;
end
$sod_blk$;

commit;
