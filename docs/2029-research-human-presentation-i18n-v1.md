# 2029 Research Human Presentation / i18n Projection v1

Status: branch-only implementation note. **Not a new owner, Translation Store, Presentation Store, registry, graph or truth system.**

Canonical owners consumed: `content_translation_law v4`, `experience_governance_foundation_v1_law v6`, `research_intake_foundation_contract_law v11`, `truth_axes_foundation_law v3`, `reality_graph_law v8`, `research_strategy_layer_law v15`, `research_workspace_law v3`.

## Live inventory — 2026-09-17

Canonical Supabase: `linswmnnkjxvweumprav`.

`research_objects` total: **737**.

Statement-script census (presentation-debt inventory, not source-language truth):

- Hebrew only: **537**
- Latin only: **15**
- mixed Hebrew + Latin: **160**
- neither Hebrew nor Latin letters: **25**

Kind: fact 67 · relation 143 · observation 476 · hypothesis 46 · question 5.

Governance: candidate 707 · approved 18 · canonical 12.

Privacy: private 571 · public_candidate 166.

Value: 558 with numeric `value`; 179 without. Source is populated on all 737 rows. Contributor is populated on 710 rows and absent on 27.

Top source families: `zvi_full_corpus_pass` 275; `wa-raziel` 88; `discovery-engine` 65; `amit_existing_corpus_stress_test` 48; `research_triage` 41; ספר הפליאה / HebrewBooks 6355 = 40; `zvi_unresolved_cleanup_pass` 18; `wordpress` 14.

Top contributors: צבי (OPOC) 297; GPT 98; DM 67; מערכת כי לה׳ המלוכה 67; עמית מייק רוב 48; ZURIEL 33; legacy_site_content 31; contributor absent 27.

Current durable presentation/language metadata: **0/737** rows have `meta.ext.presentation`; **0/737** carry explicit language metadata. Therefore script detection is only an inventory heuristic and must never be treated as source-language authority.

The 15 Latin-only statements are not a 15-item English source corpus. Live row inspection classifies them as: 3 technical family-relation statements with UUIDs; 7 mathematical/engine stress-test statements; 1 WordPress procedure/corpus-check research statement; 1 GPT cross-domain synthesis; 1 GPT formalization of a ZURIEL research direction; 1 temporary post↔gallery technical mapping; 1 GPT Da'at Tevunot dossier. **No inspected Latin-only `statement` is demonstrated to be a verbatim non-Hebrew Source Witness.** A real non-Hebrew witness, when present, remains source-owned and must carry its own language/provenance.

Heuristic presentation debt: 48 rows contain unmistakable raw/internal markers (UUID/snake-case/internal refs), while a broader technical-vocabulary/CAPS heuristic flags 113 mixed/Latin statements. These are prioritization signals only, not semantic classifications.

## Canonical storage/projection decision

Reuse the existing flexible extension primitive on the **same** `research_objects` row:

```text
research_objects.statement              = preserved historical/research statement
research_objects.source/source_ref      = preserved provenance / locator
research_objects.engine_detail          = exact calculation / verification facts
research_objects.status                 = governance
research_objects.privacy_scope          = access
research_objects.meta.ext.presentation  = human presentation representations
```

Shape:

```json
{
  "v": 1,
  "default_locale": "he",
  "statement_lang": "en",
  "statement_role": "research_statement",
  "source_witness_lang": "he",
  "variants": {
    "he": {
      "title": "כותרת אנושית",
      "summary": "סיכום אנושי קצר",
      "source_label": "שם מקור אנושי"
    },
    "en": {
      "title": "Normalized human title",
      "summary": "Normalized human summary of the same semantic object",
      "source_label": "Human source label"
    }
  },
  "compiled": {
    "mode": "research_extract_single_pass | backfill",
    "generated_by": "...",
    "model": "...",
    "generated_at": "...",
    "source_ref": "..."
  }
}
```

Locale changes **presentation only**. It never forks semantic identity, verification, governance, publication/access, exact expression identity or calculation result. Missing `en` remains explicitly missing; Latin script is not automatically labeled English and the renderer exposes a `raw_statement` fallback marker rather than laundering raw technical prose into normalized English.

Original/source witness and research statement remain separate concepts. A source-language witness is not overwritten by Hebrew/English presentation. A translation/summary is never a source witness. Gematria values never transfer through translation.

## Golden cases — RAW TODAY → proposed human presentation → preserved detail

### 321 / ידיעה מבפנים

Research object: `42608d86-f40e-4f90-b97f-dead07230275`.

RAW TODAY opens with technical dossier language (`321 — ANCHOR DOSSIER CHAIN`, `engine facts`, method names and structural relations).

Proposed Hebrew presentation:

- title: **321 — ידיעה מבפנים: אלהים, הטבע ושמירה**
- summary: **ב־321 נפגשים כמה צירים: אלהים בקדמי/משולש, ידיעה מבפנים ברגיל, הקשר ל־123/ענג והחיבור ל־3210 דרך שינוי קנה־מידה. הפרשנות המחקרית המאושרת קוראת את הציר כידיעה פנימית של הסדר בתוך הטבע וכגבול/שמירה; הפרשנות אינה עובדת מנוע.**

Underneath unchanged: full statement; exact engine facts in metadata; zero-scale rule application; Human-Gate interpretation state; approved governance; public_candidate access; source locator.

### 454 dossier

Research object: `196288f6-8edd-40e5-8f6d-3235638a88da`.

RAW TODAY is a long mixed Hebrew/English dossier with exact method checks, source branches and semantic caveats.

Proposed Hebrew presentation:

- title: **454 — חותם, תחום ונבואה**
- summary: **454 מרכז משפחת מחקר סביב חותם, גבול והשלמת גילוי: חותם ותחום שווים 454 ברגיל, נביאים מגיע ל־454 בקדמי, וענף 756 מחבר חותם במסתתר עם נון בגדול. מקורות מדניאל, ישעיהו וספר הפליאה נשמרים בנפרד מן הפרשנות הסמנטית.**

Underneath unchanged: all `engine_detail.checks`; exact expressions/methods/values; source refs; provenance; approved/private state; interpretation boundary.

### 506 semantic core

Research object: `5cf54de5-d4d6-496b-9463-3e340129a834`.

RAW TODAY opens `506 SEMANTIC CORE` and mixes historical-source synthesis with English structural terminology.

Proposed Hebrew presentation:

- title: **506 — עולם המחשבה: דעת, סוד, כוח ומערכת**
- summary: **עולם המחשבה שווה 506 ברגיל; דעת, סוד, כוח ומערכת מגיעים ל־506 במילוי בלבד. חומר היסטורי קושר את המשפחה לפנימיות ולגאולת הדעת. הערכים המחושבים נשמרים כעובדות נפרדות מן הקריאה הסמנטית.**

Underneath unchanged: verified component method/value map; posts/gallery locators; consolidation provenance; approved/private state; source interpretation remains interpretation.

### 1820

Example research object: `95e946c9-7ade-4d3c-8ed0-7504b6d9f1d4`.

RAW TODAY already Hebrew-readable but still research-technical and bundles several engine facts.

Proposed Hebrew presentation:

- title: **1820 — עת, היום והמשיח בימינו**
- summary: **כמה חישובים מאומתים מחברים את 1820 לשפת הזמן: עת, המשיח בימינו וזה היום עשה יהוה מגיעים ל־1820 בקדמי/משולש; בימינו מחבר גם 474 ו־358 בשיטות אחרות. זו שכבת חישוב; משמעות הזמן נחקרת בנפרד.**

Underneath unchanged: exact expressions/methods/results; candidate/public_candidate state; no semantic promotion. Other 1820 research objects remain separate and are composed contextually by World rather than merged into this row.

### Da'at Tevunot dossier

Research object: `a91491ac-30f1-4fc0-948b-9ccc638a1b2d`.

RAW TODAY is an English GPT-authored consolidated research dossier. The actual source witness is the fixed site PDF; the English statement is **not** the source witness.

Proposed Hebrew presentation:

- title: **דעת תבונות — מידה, יחס, זמן וייצוג**
- summary: **מפת המחקר מזהה בדעת תבונות מבנה של מציאות מדורגת ומדודה: יחסי סיבה והשפעה, מצבי הסתרה וגילוי, זמן מחזורי וליניארי, כ״ח עתים, ומערכת ייצוג נבואית שבה איכות הייצוג מגבילה את איכות הידיעה. זהו dossier מחקרי מועמד, לא פסיקה דוקטרינרית.**
- human source label: **דעת תבונות · PDF אתר SOD1820 · סעיפים א–קצ״ה**

Future normalized English may be compiled into `variants.en` on the same object; it must be natural product/research English rather than reusing the raw GPT dossier blindly.

Underneath unchanged: PDF storage locator; witness metadata; all section loci; research DNA; truth boundaries; candidate/private state; no graph/publication promotion.

### Mixed Hebrew-English calibration

Research object `023ba965-198a-4468-af7f-401beabfcbaf` (`RACHEL 238↔832 REPRESENTATION SYNTHESIS`) demonstrates why mixed script is not automatically “English source”. It is an analyst synthesis with Hebrew operands and English technical scaffolding. It should receive a Hebrew human presentation now and a normalized English variant later, while the deterministic 238↔832 representation metadata remains exact below.

## Forward intake

`supabase/functions/research-extract/index.ts` remains the same canonical extraction call. The branch changes its **single existing AI call** to return `title` + `summary` alongside the Hebrew research statement and writes those fields once to `meta.ext.presentation.variants.he`.

- no second AI call;
- no page-load AI translation;
- optional explicit `source_lang` may be supplied by intake;
- Hebrew-only source text may be safely inferred as `he`;
- Latin-only source text is not automatically inferred as English;
- presentation provenance records generator/model/time/source_ref;
- statement/source/source_ref/engine_detail/status/privacy are not overwritten.

Future locale compilation adds `variants.en`/other locales through the same shape. English normalization is therefore a first-class future path, not a raw-English fallback contract.

## Backfill plan

No live backfill is performed by this branch.

- **P1** — material surfaced now: World high-prominence anchors and current Golden cases, starting with 321 / 454 / 506 / 1820 / Da'at Tevunot and other currently surfaced technical-English/mixed rows. Compile once, inspect before/after, update only `meta.ext.presentation`.
- **P2** — approved / Human-Gold / public-candidate / active-anchor research not already covered by P1.
- **P3** — cold/private/archive material on demand or scheduled bounded batches.

Every update is idempotent and meta-only. Existing `research_object_revisions` UPDATE trigger preserves before-snapshots. No mass rewrite of `statement`; no access/governance transition; no canonicalization/publication; no source deletion.

## World Human Projection handoff

World can consume `finding.subject.label` as the localized human title and `finding.view.rendererHints.presentation.summary/sourceLabel` for richer type-specific cards. Raw is addressable by `finding.identity.sourceIdentity.researchObjectId` plus `projection.dimensions.presentation.rawStatementRef`; exact `source_ref` remains the locator.

Remaining World pass work is presentation composition only: “העיקר סביב…”, type-specific renderers, time-role wording (`created_at` research ingestion must become “נוסף למחקר”, not historical event time), ranking/explain-why, and Inspect/Trace affordances. This branch does **not** change `World2029Page` layout.
