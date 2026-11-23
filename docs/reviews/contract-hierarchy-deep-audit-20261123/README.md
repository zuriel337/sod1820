# SOD1820 — ביקורת עומק של היררכיית החוזים, בעלויות וחיבורים יסודיים
**23.11.2026 · BRANCH-ONLY · מחקר/ניתוב בלבד · אין שינוי חוק חי, DB, UI, הרשאות או פרסום**

> **עיקרון מרכזי:** לא להקים חוזה־על נוסף. `SOD1820_MASTER_OWNER_INDEX.md` הוא נקודת כניסה לניווט בלבד. חוק פעיל נבחר ב־`public.nodes WHERE type='rule' AND is_active=true`. תיקיית ביקורת זו היא **צילום מצב נגזר**, לא Registry, לא חוזה נוסף ולא מקור אמת.

## תוצאה מספרית מה־SSOT
| ממד | תוצאה |
|---|---:|
| רשומות חוק היסטוריות (`public.nodes.type='rule'`) | **475** |
| רשומות חוק פעילות | **87** |
| מזהי `rule_id` פעילים שונים | **87** |
| חוקים פעילים עם יותר מגרסה פעילה אחת לאותו `rule_id` | **0** |
| חוקים פעילים עם `owner_routing.domain` ו־`canonical_owner` | **87/87** |
| 13 אזורי ניתוב באינדקס | **13** |
| תחומי `owner_routing.domain` פעילים | **25** |
| רשומות `project_codex` | **35** |
| מקורות סמכות עצמי־שורש בשדה הבעלות | **22** |
| חוקים בעלי הורה שהוא חוק פעיל אחר | **39** |
| חוקים שבעליהם הוא `project_codex.<slug>` | **19** |
| חוקים שבעליהם מסמך | **7** |
| מחזורי תלות בהיררכיית **בעלות** | **0** |
| הפניות `depends_on` לחוקים פעילים | **109** |
| קבוצות תלות מעגלית בגרף `depends_on` | **3** |
| זוגות תלות דו־כיוונית ישירה | **9** |
| אזכורי `depends_on` שאין להם יעד פעיל | **20**, מתוך **13 הפניות שונות** |

ההפניות שאינן פעילות **אינן מחוקות**: 12 מזהי חוק מצביעים לרשומות היסטוריות בלתי־פעילות שנשמרו במסד, ועוד הפניה למסמך עיצוב V1. יש לברר האם אלה עקבות היסטוריים או תלות תפעולית שגויה. 50 חוקים פעילים אינם מגדירים `depends_on` מפורש — אין להסיק שאינם שייכים להיררכיה, כי הם כן מגדירים בעלים.

## היררכיית הניווט הנגזרת — בלי חוק־על חדש
```text
SOD1820 MASTER OWNER INDEX (router only, authority lookup)
  ├─ A Foundation / Release (6 active rules)
  ├─ B Agent Coordination (1)
  ├─ C Research OS / Context (4)
  ├─ D Research Intake / Representation (9)
  ├─ E Truth / Time (6)
  ├─ F One Reality / World / Rank (6)
  ├─ G Gematria / Number / Methods (17)
  ├─ H ELS / Cipher (4)
  ├─ I Raziel (8)
  ├─ J Person / Security / Access / Follow (8)
  ├─ K Publishing / Content / Localization (7)
  ├─ L Experience / Brand / Design (8)
  └─ M Traffic / System Operations (3)
       ↓ domain
       ↓ ACTIVE canonical owner (node/project_codex/approved document)
       ↓ child active rule, engine method, research finding, source
```

הקבוצות הן **מפתח ניווט** מתוך אינדקס הבעלים; הן אינן ישויות שמקבלות סמכות לדרוס את החוקים. חלק מ־39 חוקי המשנה מצביעים לחוק־שורש, ואחד משרשר את בעלותו בשתי קפיצות: `workspace_layout_standard → research_workspace_law → docs/research-studio-v1-contract.md`. השאר במסלול ישיר או מופנים למסמך בעלים קיים.

הקובץ [active-owner-crosswalk.json](./active-owner-crosswalk.json) מכיל את **כל 87 החוקים**, עם גרסה פעילה, תחום, בעלים, מזהה node וקשרי תלות מסווגים. הוא עוזר לבדוק את המקור, אך אינו משנה אותו.

## חשוב: שתי רשתות שונות
- **בעלות/היררכיית סמכות:** `metadata.owner_routing.canonical_owner`. זהו הכיוון החד־משמעי של ״מי אחראי על החוק״; בסריקה לא נמצאו בו מעגלים.
- **תלות/שימוש/אינטגרציה:** `nodes.depends_on`. הקשר יכול להיות דו־כיווני מבחינת שימוש ב־runtime או תיעוד. זה **לא** הורה סמכותי. שימוש בו כעץ להורדה טופולוגית מייצר מעגלים.

### תשעת זוגות התלות הדו־כיוונית שמחייבים סיווג
1. `research_strategy_layer_law ↔ research_workspace_law`
2. `person_foundation_contract_law ↔ truth_axes_foundation_law`
3. `research_intake_foundation_contract_law ↔ truth_axes_foundation_law`
4. `experience_governance_foundation_v1_law ↔ sod1820_canonical_identity_law`
5. `experience_governance_foundation_v1_law ↔ research_gold_hints_law`
6. `content_translation_law ↔ experience_governance_foundation_v1_law`
7. `content_translation_law ↔ truth_axes_foundation_law`
8. `platform_tiers_law ↔ raziel_companion_layer_law`
9. `raziel_routing_law ↔ system_suggestions_law`

ה־SCC המלאים הם בגדלים 12, 2, 2 (ראו JSON). **זו לא הוכחה לסתירה בסעיפי התוכן**, אלא הוכחה שקשר `depends_on` אינו היררכיית בעלות נקייה.

## אי־התאמות ונקודות צמצום, בסדר טיפול
| דחיפות | מזהה/מסמך | ממצא נבדק | החלטת טיפול מוצעת |
|---|---|---|---|
| P0 | `brand_design` — חמישה חוקים פעילים | `canonical_owner='SOD1820_DESIGN_CONTRACT_V1.md'`, בעוד ראש קובץ V1 ב־main קובע **SUPERSEDED by V2** ו־Master Index קורא ל־V2 סמכות 2029 | לאחד את **הפניות הבעלות** אל V2 לאחר בדיקת תתי־החוקים והאישור המתאים. לא למחוק V1 |
| P0 | `legacy_content_protocol@v2` | החוק מסומן פעיל למרות שהמוצר Legacy פרש ב־5.11.2026; לא קיימים חוקים פעילים שתלויים בו; הוא מחזיק תלות היסטורית ל־Intake v13 | **לפרוש את החוק הפעיל בלי ליצור Legacy v3**, לשמר את v2 ואת `@13` כהיסטוריה; לעבור דרך פרוטוקול האישור של המסד |
| P1 | `project_codex.gematria_engine` | גוף ההסבר אומר `canonical_methods_registry_law current v5`; החוק החי v6 | לתקן **מסמך הפניה** שיצביע לגרסה הפעילה, או לתצורת `latest active` ללא מספר קשיח. אין שינוי חוק/מנוע |
| P1 | `depends_on` בחוקים פעילים | 20 אזכורי תלות ל־12 מזהי חוקים היסטוריים לא פעילים, והפניה אחת למסמך V1 | לסווג כל הפניה: live dependency / historical provenance / superseded alias / document owner. לא למחוק אוטומטית |
| P1 | `depends_on` | 3 קבוצות מעגליות, 9 זוגות הדדיים | להבחין בין dependency תפעולי, ownership ו־evidence; לשמור runtime לגיטימי ולנקות רק טענות סמכות לא נכונות |
| P2 | `project_codex.convergence_law` | בחלק ההיסטורי נאמר `topic_cards` אמת ההתכנסות, אך **הקדמת המסמך עצמו** מסמנת זאת כמוחלף ב־`reality_graph_law v8` + `cross_vs_convergence_criteria v4` | להשאיר כהיסטוריה בלבד, לצמצם הפניות מסוכנים למסמך הישן; **לא** ליצור Convergence Owner חדש |
| P2 | `project_codex.sod1820-master-architecture-draft` | תיעוד DRAFT מפורש | לשמר כתכנון בלבד; לא להניח מעל 87 החוקים הפעילים |
| P2 | סקירות/מסירות מחקר | מסמכי סקירה/Seed/Topic Preview עלולים להיראות כ״חוזים״ | להשתמש ב־`owner-first`: מקור → חישוב/עדות → ממצא → חוזה מנהל → טופיק/קהל; מסמך סקירה אינו סמכות |

**סטטוס תיקון בפועל:** הסיווג והמפה הושלמו בענף זה; **שום** הפניה חיה ב־`nodes` או `project_codex` לא שונתה. כל הצעות הטיפול מחייבות ביקורת תוכן ואישור כתיבה נפרדים.

## החיבור היסודי לדוגמת הגימטריה

```text
גימטריה / Numeric — תחת קבוצה G
  ├─ canonical_methods_registry_law v6
  │   └─ public.gematria_methods (method_key + identity, e.g. רגיל, קדמי/משולש, מסתתר)
  ├─ project_codex.gematria_engine + gematria_engine_law v2
  │   └─ canonical execution + method/version/trace
  ├─ project_codex.numeric_rule_family_index
  │   └─ zero_scale_law, shitat_haechad_alef_law, moment_clock_law ...
  └─ reality_graph_law v8
      └─ cross_vs_convergence_criteria v4
          └─ cross-method intersection / research convergence — not a new method
  + truth_axes_foundation_law v3 (claim vs verification vs publication)
  + research_intake_foundation_contract_law v14 (provenance/application)
  + research_strategy_layer_law v17 (bounded context selection)
```

בדיקה חיה של `gematria_methods`: **41** שיטות רשומות, **32** פעילות, **28** `scannable`. לדוגמה `method_key='קדמי'` מוצג ״משולש״ בעוד `משולש מילה` ו־`משולש הפוך` הם זהויות אחרות. לא מחברים לפי label בלבד. **חפיפה בין רגיל/משולש/מסתתר = ממצא מחקרי**, לא חוזה חדש ולא שוויון בין שיטות. החפיפה משויכת לחוק Cross/Convergence הקיים ולחשבונות המקוריים לפי שיטת־מנוע.

## המיקום הנכון למחקרי הבחירות, הרכבת, טופיקים ישנים
- אין ״חוזה בחירות״ חדש בשכבה העליונה. ענף מחקר או מפת־טופיק הם **נתוני דומיין** תחת החוזים, ולא הבעלים של חוקים.
- כל צילום נשמר בבית המקור שלו עם `sourceRef`; שיטת האפס מופעלת כנגזרת מסומנת; רגע שידור נשמר תחת `moment_clock_law`; שינוי מספר חדשותי נשמר כ־snapshot נוסף; תוצאה וחפיפה נבדקות לפי אותו engine/truth/cross.
- רזיאל, טופיק, דף מספר, Search או UI עתידי הם **צרכנים** של אותה אמת. בשלב הזה **לא** מחברים רזיאל, לא בונים Preview ולא עושים פריסה.
- מסמך־ענף `One Tree Branch Contract v2` הוא מעטפת לא־בעלת סמכות שמיועדת להקרנות רבות. אין לקדם Seed שלו או 234 רשומות סקירה לחוזה־על.

## סיכום הביקורת
**רמת אמינות:** עומק מבני מלא של 87 החוקים הפעילים + 35 רשומות `project_codex`; דגימת סתירות תוכניות בין בעלים, בדיקת V1/V2 וקישור רגיל/משולש/מסתתר. **אין טענה** שנעשתה השוואה סמנטית משפט־משפט של כל 475 הרשומות ההיסטוריות או של כל המסמכים ארוכי־הטקסט. כל שינוי מחייב בדיקת Owner חי ופירוט ה־drift לפני אישור Human Gate.

ההמלצה המעודכנת: **לתקן את חמש הפניות בעלות Design V1→V2 בגרסאות המשך מאושרות, לפרוש את `legacy_content_protocol` במקום לייצר לו v3, ולתקן את מצביע gematria v5→latest active**. אחר כך לסווג את התלויות המעגליות. זוהי המלצת תיקון ולא הכרזה על שינוי שבוצע במסד. לא להגדיל עומק היררכיה בלי צורך; לא לפתוח owner/contract/store/registry חדש.

## דלתת תיקון אחרי הבהרת הבעלים — Legacy אינו מוצר פעיל

- המשתמש הבהיר ש־Legacy אינו קיים עוד כמוצר. חוקי ה־owner העדכניים מאשרים: Production = 2029 בלבד; Legacy פרש ב־5.11.2026.
- בסריקה חיה נמצאו **87** חוקים פעילים ורק **חוק אחד ששמו Legacy**: `legacy_content_protocol v2`. אפס חוקים פעילים מפנים אליו ב־`depends_on` או ב־`canonical_owner`. לכן לא נכון ליצור v3 עבורו. המסלול המוצע: **פרישה (is_active=false), ללא מחיקה**.
- 26 חוקים פעילים מזכירים Legacy או WordPress בגוף הטקסט, ורובם כפרובננס/השוואה/חסימת סמכות ישנה. אין לשכתב את גופי הגרסאות הקנוניים בעקבות חיפוש מחרוזת; שכתוב גורף היה יוצר גרסאות מיותרות ומאבד היסטוריה.
- `project_codex.project_overview` ו־`project_codex.data_model_map` מתארים עובדות היסטוריות (למשל פריסה אוטומטית של main, מספר שיטות/פוסטים ישן, שימוש ב־WordPress). `project_codex.raziel_mind_architecture` הוא מפרט מימוש היסטורי, ומפנה בחלקו לחוקים שפרשו. מומלץ להוסיף בראשם **אזהרת current-first קצרה**, בלי לשכתב את הגוף.
- **תיקון סתירה נוסף באינדקס:** `public.rules_active` ב־Supabase *כיום כן מכיל* `is_active=true` בתנאי התצוגה. שורת ה־Master Owner Index שטענה אחרת נבדקה ותוקנה **בענף בלבד**. אין צורך בהחלפת ה־view החי.
- כתיבה במסד אינה שינוי documentation בלבד: ה־trigger `fn_rule_compaction_integrity_guard_v1` חוסם שינוי `owner_routing.canonical_owner` או `description` במקום; יש לייצר גרסאות חדשות לבעלי־המותג, לפרוש את Legacy ולהשאיר היסטוריה. עבור שינוי בעלים נדרש `SUPERSEDE_EXISTING + human_gate` עם הפניית work_log אמיתית.
- חבילת SQL ומניפסט: [approved-release-only-reference-repair.sql](./approved-release-only-reference-repair.sql) ו־[reference-repair-manifest-20261123.json](./reference-repair-manifest-20261123.json). **הם לא הופעלו במסד.**
