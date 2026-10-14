# Number research: RPC map and database-side measurement

**עודכן: השינוי הוחל לאחר אישור בעלים (migration `number_lookup_method_flags_20261014`).** תוצאות אחרי ההחלה בסוף המסמך. המדידות שלפני ההחלה:

Read-only. Project `linswmnnkjxvweumprav`, role `anon` inside `begin … rollback`, warm cache, one session
(no network, no browser). Nothing was applied; temp objects (`pg_temp`) lived only inside rolled-back transactions.
DB execution time, network time and browser time are different quantities and are **not** added here.

## Who calls what (client)

`researchNumber()` (`src/lib/research/numericResearchBase.js`) issues its lenses in one `Promise.all`; the first result is
shown only after the slowest lens returns.

| Lens requested | RPC | When requested today |
|---|---|---|
| `number_lookup` | `fn_number_lookup(p_value)` | default lens set |
| `number_dossier` | `fn_number_dossier(p_value)` | default lens set (and `gematria_reverse`, which also adds lookup) |
| `number_journey` | `fn_number_journey(p_value)` | only when the caller asks for it |

## Nesting (what actually repeats inside the database)

- `fn_number_dossier` public branch (the only branch an anonymous or non-admin caller reaches) runs `fn_number_lookup(p_value)` **once, unpaged**,
  then keeps only `method`, up to 12 `phrase`s per method and a per-method count. It uses none of the other 33 lookup columns.
- `fn_number_journey` public branch runs `fn_number_lookup` for up to **6 derived values** (root, ×10, ×100, mirror, mirror×10, mirror×100) and keeps `value, phrase, method`.
- `fn_number_lookup` evaluates `fn_method_evidence_class` (each call re-reads the registry and calls `fn_method_is_scannable/executable/engine_verified`)
  **per row, 2–4 times** (provenance text, `method_evidence_class`, `method_governed` → evidence_class again, sort key), although a number has ~24 distinct methods for ~185 rows.

So a number page that requests lookup + dossier executes the lookup body twice (second one nested inside dossier); the dossier's own time is ≈ its nested lookup.
Nested times are **contained in** the outer function's time, never additive.

## Measured (warm, anon, ms; `explain analyze` / `clock_timestamp`)

| Value | rows | `fn_number_lookup` | `fn_number_dossier` | `fn_number_journey` | Data scan only (bidim⨝words⨝methods) |
|---|---:|---:|---:|---:|---:|
| 1820 | 185 | 203 (178 avg of 3) | 211 (15 289 buffer hits vs 14 825 for lookup) | 110 | 4.6 |

Where the lookup time goes for 1820 (separate timings, 185 rows, 24 methods, 39 composite rows):
`fn_method_evidence_class` 84 per pass over all rows (used twice+), `fn_method_is_governed_evidence` 34, `…is_executable` 11, `…is_engine_verified` 10,
`fn_composite_calc` 51, plain data scan 4.6.

## Proposed change (DRAFT, needs the Human Gate; not applied)

1. Compute the four method-level flags once per **distinct method** (a `materialized` CTE) instead of per row.
2. A lean internal row source `fn_number_lookup_core(value) → (method, phrase, value, bid_id)` with the same joins and filters, used by the public branches of dossier and journey.

Files: `number-lookup-method-flags.DRAFT.sql` (guarded, stops on execution), `number-lookup.new-body.sql.tmpl`.

### Parity (read-only, `anon`)

Old vs new row set, both directions of `EXCEPT` over all 37 columns, values 0, 1, 26, 300, 363, 541, 613, 888, 1820, 2026, 5112, 99999 (incl. an empty result):
**0 differences each way, identical row counts** (18, 31, 197, 330, 141, 142, 133, 183, 185, 52, 15, 0).
Not covered by this run: row *order* (the proposed body must keep the existing `page_rows` ordering/paging tail verbatim), `p_limit`/`p_after_bid_id` paging,
`authenticated` and admin roles (the dossier/journey admin branches are unchanged by the proposal), and the encrypted-word RLS path under the definer role (the lean source reads the same tables
under the same caller context as today's nested call, but this has to be asserted by the isolated-database test before approval).

### Expected effect (DB execution only; lean source without composite calc)

| Value | `fn_number_lookup` today | lean core + flags once | share of today |
|---|---:|---:|---:|
| 1820 | 178 | 9.8 | 5% |
| 26 | 116 | 8.3 | 7% |
| 300 | 316 | 10.0 | 3% |
| 613 | 84 | 5.8 | 7% |

The full lookup keeps `fn_composite_calc` for composite rows (≈51 ms at 1820), so the public lookup would land near ~60 ms there; dossier and journey, which do not need it, would fall to roughly the lean-core cost plus their own small reads.
These are warm single-session numbers on the DB, not user-perceived time: network and browser time are unchanged, and cold-cache and concurrency effects are unmeasured.

## What must arrive before the first result is shown

Nothing in the lens set depends on another: `Promise.all` waits for the slowest. With today's functions that is the dossier (≈ lookup + extras). Reducing the dossier's nested lookup lowers that wait; making journey on-demand (already the case) keeps it out of the first result.

## אחרי ההחלה (אושר ע"י בעל האתר, הוחל 14.10.2026)

אומת לפני ההחלה (anon, בטרנזקציה שנגללה חזרה): `fn_number_lookup` החדש זהה לישן **כולל סדר ועימוד** (`p_limit` 10/ללא, עם `p_after_bid_id` ובלי) לערכים 26 ו־1820; מקור השורות הרזה זהה לישן ב־dossier (אגרגציה לפי שיטה) וב־journey (מונחים/שיטות/ספירה) לערכים 1, 26, 300, 363, 541, 613, 1820, 2026, 5112, 99999 תחת postgres (הקשר ה־definer שבו הענפים הללו רצים בפועל). לא נבדק במפורש תפקיד `authenticated` (הלוגיקה אינה תלויה בתפקיד מלבד RLS, שלא שונה).

הערה על RLS: בעל הפונקציות `postgres` עוקף RLS, כך שה־dossier/journey הציבוריים כבר קודם כללו את 16 המילים המוצפנות־מאומתות־מפורסמות; המקור הרזה שומר על ההתנהגות הזו בדיוק. **זה ממצא קיים שמצריך את החלטתך** (האם הענף הציבורי אמור לחשוף אותן).

תיקון מדידה: ה־110ms של `fn_number_journey` שדווחו קודם נמדדו בענף הפנימי (`session_user=postgres`), לא בציבורי. בציבורי (עם claims של anon) לפני התיקון לא נמדד.

| (חם, anon, 1820) | לפני | אחרי |
|---|---:|---:|
| `fn_number_lookup` | 178–203ms | 81ms |
| `fn_number_dossier` (ציבורי) | 211ms | 8.2–8.4ms |
| `fn_number_journey` (ציבורי) | לא נמדד | 21ms |

ACL נשמר: lookup/journey ל־anon/authenticated/service_role כמקודם, dossier ללא שינוי; `fn_number_lookup_core` — `postgres` בלבד. חזרה לאחור: `number-lookup.ROLLBACK.sql`.

## סינון מילים מוצפנות (אושר והוחל, migration `number_core_exclude_encrypted_20261014`)

`fn_number_lookup_core` מוציא עכשיו `is_encrypted`. אומת חי כ־anon: סכום הקבוצות ב־dossier שווה בדיוק למה שה־lookup הישיר מחזיר לאורח, בערכים 22, 77, 81, 92, 500, 1820; אפס ביטויים מוצפנים ב־dossier וב־journey. חזרה לאחור: `number-lookup.ROLLBACK.sql` (לא מחזיר את הסינון; להסירו יש להריץ את הגרסה הקודמת של הליבה ידנית).
