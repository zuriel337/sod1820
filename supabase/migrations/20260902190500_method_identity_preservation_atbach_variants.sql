-- SOD1820 — Method Identity Preservation + source-attested Atbach variants
-- ZURIEL Human-Gate: 2026-09-02
-- DB was applied and live-verified first on canonical project linswmnnkjxvweumprav.
-- This migration records the live delta for repo parity. It does NOT activate or implement either new method.

BEGIN;

-- canonical_methods_registry_law v3
UPDATE public.nodes
SET is_active = false
WHERE type = 'rule'
  AND rule_id = 'canonical_methods_registry_law'
  AND rule_version = 2
  AND is_active = true;

INSERT INTO public.nodes (
  id, type, label, description, is_active,
  rule_id, rule_version, supersedes_version, created_at
)
SELECT
  gen_random_uuid(), 'rule',
  'רישום השיטות הקנוני — זהות נשמרת לפני מימוש',
  'public.gematria_methods הוא מקור האמת היחיד לזהות ולמחזור-החיים של שיטות גימטריה; אין מספר קשיח של שיטות. registered, source_attested, reconstructed, executable, engine_verified, active, scannable, stored, displayed ו-published/canonical הם מצבים נפרדים ואסור להסיק אחד מהשני.\n\n[עדכון v3, ZURIEL Human-Gate, 2.9.2026 — METHOD IDENTITY PRESERVATION]\n1. SOURCE-ATTESTED METHOD IDENTITY MUST NOT DISAPPEAR. כאשר מקור מזוהה — ספר, כתב-יד, תוכנה היסטורית, תמונה, חוקר או מסורת — מציג שיטה מובחנת בשם/וריאנט/פרוצדורה יציבה, ויש מספיק ראיה להבחין בזהותה כשיטה, זהות השיטה נרשמת ב-gematria_methods גם אם נוסחתה טרם שוחזרה, אינה בשימוש ואינה נתמכת במנוע. AI רשאי להציע; רישום זהות חדשה ל-Registry דורש Human Gate.\n2. REGISTERED ≠ UNDERSTOOD ≠ VERIFIED ≠ ACTIVE. שיטה לא-משוחזרת נשמרת במצב fail-closed: active=false, in_engine=false, scannable=false, function=NULL, execution_kind=unimplemented. אין להפעיל, לסרוק, לחשב אוטומטית או להציג כתוצאה מאומתת עד Reconstruction+Verification+Human Gate המתאימים.\n3. SOURCE-NATIVE LABEL + PROVENANCE ARE LOAD-BEARING. יש לשמר את שם השיטה כפי שהמקור מציגו ואת מראה-המקום/הייצוג; normalized method_key הוא זהות טכנית בלבד. מיפוי source-label→canonical method הוא מסקנת מחקר נפרדת ואינו מוחק את התווית המקורית.\n4. SAME LABEL ≠ SAME METHOD. שתי מסורות/מקורות עם שם דומה או כללי (למשל א״ט–ב״ח) נשמרות כזהויות נפרדות כאשר המקור עצמו מבדיל ביניהן או כאשר תוצאותיהן אינן תואמות; אסור למזג או ליצור alias עד שהסמנטיקה/הטרנספורמציה הוכחה. גם implementation קיים בשם כללי אינו גובר על וריאנטי-המקור.\n5. SOURCE CLAIM ≠ ENGINE VERIFIED. אפשר לשמור תוצאת-מקור עם method_unknown/not_tested גם כאשר השיטה רשומה-unimplemented; אין לסמן match/engine_verified בלי הרצה קנונית.\n6. NO PARALLEL METHOD STORE. זהות של שיטת גימטריה חיה באותו gematria_methods; מחקר על נוסחתה/היסטוריה/סתירות נשמר ב-Research OS. כלל/פרוצדורה מספר שאינם שיטת-גימטריה אינם נדחפים ל-Registry בכוח — נשארים research_objects/rules לפי הבית הקיים.\n7. PRESERVE BEFORE ACTIVATE. עדיף שיטה רשומה-לא-פעילה עם provenance אמיתי על שיטה שנעלמה מפני שטרם הבנו אותה; אך עדיף UNKNOWN אמיתי על נוסחה מומצאת.\n\nv2 נשמר כהיסטוריה. Foundation→Projection→Experience; Preserve capability, truth and provenance — not necessarily the legacy interface.',
  true, 'canonical_methods_registry_law', 3, 2, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.nodes
  WHERE type='rule' AND rule_id='canonical_methods_registry_law' AND rule_version=3
);

-- method_lifecycle v2
UPDATE public.nodes
SET is_active = false
WHERE type = 'rule'
  AND rule_id = 'method_lifecycle'
  AND rule_version = 1
  AND is_active = true;

INSERT INTO public.nodes (
  id, type, label, description, is_active,
  rule_id, rule_version, supersedes_version, created_at
)
SELECT
  gen_random_uuid(), 'rule',
  'מחזור־חיי שיטה v2 — שמירת זהות לפני שחזור',
  'חוק נעול, ZURIEL Human-Gate, 2.9.2026. supersedes method_lifecycle v1 בלי למחוק היסטוריה.\n\nמחזור-החיים אינו עוד שער לינארי שמוחק שיטה עד אימות. השלבים המחקריים: SOURCE_ATTESTED → REGISTERED_UNRESOLVED → RECONSTRUCTED → VERIFIED. ACTIVE ו-SCANNABLE הם שערי Human-Gate תפעוליים נפרדים; CANONICAL semantic definition ו-PUBLISHED/DISPLAYED נפרדים גם הם.\n\n• SOURCE_ATTESTED: המקור מציג שיטה/וריאנט מובחנים. זו עובדת-מקור, לא אימות נוסחה.\n• REGISTERED_UNRESOLVED: זהות נשמרת ב-gematria_methods עם provenance; formula/function יכולות להיות UNKNOWN. ברירת-המחדל: execution_kind=unimplemented, function=NULL, in_engine=false, active=false, scannable=false.\n• RECONSTRUCTED: נמצאה נוסחה/טבלה מועמדת המסבירה את המקור; עדיין לא match ולא canonical אוטומטי.\n• VERIFIED: fixtures/מקור/מנוע מאמתים את ההגדרה לפי החוזה הרלוונטי.\n• ACTIVE: Human Gate מאשר שימוש בחישוב/מוצר. ACTIVE≠SCANNABLE.\n• SCANNABLE: Human Gate נפרד מאשר השתתפות בסריקות/Discovery.\n\nMethod Reconstruction נשאר חסום נגד target-fitting: מותר שחזור של כלל קבוע ודטרמיניסטי מן המקור/משפחת-שיטות; אסור לבחור מניפולציה חופשית רק כדי לפגוע בערך יעד. אם לא שוחזר — לא ממציאים, אבל גם לא מוחקים: נשאר REGISTERED_UNRESOLVED.\n\nPROVENANCE חובה בכל מעבר: source-native label, source_ref/representation, מי הביא/שחזר, תאריך, claimed result אם קיים, proposed canonical mapping, method/version שנבדקו ותוצאת verification. מקור אמין מעלה priority לבדיקה אך אינו מחליף אימות.\n\nVARIANT LAW: source variants שנבדלים בשם-מלא, attribution, טבלה, output או procedure הם identities נפרדות עד הוכחת same-method. Alias הוא מסקנה, לא ברירת-מחדל. דוגמת כיול חיה: מקור-הגלריה מבחין בין א״ט–ב״ח רבנו חנאל לבין א״ט–ב״ח רש״י; על «סוף יצר הרע» המקור מציג 844 מול 2024, בעוד generic אטבח החי מחזיר 539. לכן שלוש הזהויות אינן מתמזגות בלי adjudication.\n\nBOUNDARY: broader book/research rules that are not gematria method identities stay ב-research_objects/nodes; no Book Engine, no parallel registry. SOURCE ACCEPTED ≠ ENGINE VERIFIED; REGISTERED ≠ ACTIVE; ACTIVE ≠ SCANNABLE; CANONICAL ≠ PUBLISHED.',
  true, 'method_lifecycle', 2, 1, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.nodes
  WHERE type='rule' AND rule_id='method_lifecycle' AND rule_version=2
);

-- Source-attested method identities only. No formula is inferred here.
INSERT INTO public.gematria_methods (
  id, sort_order, method_key, display_label, category, sub, soul, db_column,
  in_engine, function, active, deterministic, source_of_truth,
  required_entitlement, input_schema, output_schema, token_cost, version,
  mathematical_family, order_sensitive, word_boundary_sensitive,
  per_word_reset, full_phrase_continuation, final_letter_sensitive,
  whitespace_normalization, punctuation_normalization, derived_from,
  dependency_rules, dependency_version, dependency_verified_at,
  scannable, execution_kind, operator, dependency_versions
)
SELECT
  gen_random_uuid(), 31, 'אטבח_רבנו_חנאל', 'א״ט־ב״ח · רבנו חנאל', 'base',
  'SOURCE-ATTESTED VARIANT · exact substitution table/formula unresolved',
  null, null, false, null, false, true,
  'SOURCE-ATTESTED ONLY — gallery corpus: 32 OCR rows (2015-12..2024-08) carry «א״ט - ב״ח רבנו חנ...»; exact line «חילוף טקסט <- א״ט - ב״ח רבנו חנאל» also preserved. Calibration image gallery_images:f0de9d2d-4da3-4d08-81e3-ceb8df7f77bd shows claimed 844 for «סוף יצר הרע». Formula NOT reconstructed; NOT mapped to generic אטבח; ZURIEL Human-Gate 2026-09-02.',
  'public', null, null, 0, 1, null, true, true, null, null, null,
  null, null, null, '[]'::jsonb, 1, null, false, 'unimplemented', null, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.gematria_methods WHERE method_key='אטבח_רבנו_חנאל'
);

INSERT INTO public.gematria_methods (
  id, sort_order, method_key, display_label, category, sub, soul, db_column,
  in_engine, function, active, deterministic, source_of_truth,
  required_entitlement, input_schema, output_schema, token_cost, version,
  mathematical_family, order_sensitive, word_boundary_sensitive,
  per_word_reset, full_phrase_continuation, final_letter_sensitive,
  whitespace_normalization, punctuation_normalization, derived_from,
  dependency_rules, dependency_version, dependency_verified_at,
  scannable, execution_kind, operator, dependency_versions
)
SELECT
  gen_random_uuid(), 32, 'אטבח_רשי', 'א״ט־ב״ח · רש״י', 'base',
  'SOURCE-ATTESTED VARIANT · exact substitution table/formula unresolved',
  null, null, false, null, false, true,
  'SOURCE-ATTESTED ONLY — gallery corpus: 308 OCR rows (2013-11..2026-05) carry an א״ט–ב״ח רש״י label. Calibration image gallery_images:f0de9d2d-4da3-4d08-81e3-ceb8df7f77bd explicitly shows «א״ט - ב״ח רש״י 2024» for «סוף יצר הרע». Formula NOT reconstructed; NOT mapped to generic אטבח; ZURIEL Human-Gate 2026-09-02.',
  'public', null, null, 0, 1, null, true, true, null, null, null,
  null, null, null, '[]'::jsonb, 1, null, false, 'unimplemented', null, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.gematria_methods WHERE method_key='אטבח_רשי'
);

COMMIT;
