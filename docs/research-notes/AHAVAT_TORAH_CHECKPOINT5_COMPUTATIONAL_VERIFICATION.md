# Ahavat Torah — Checkpoint 5 computational verification

Date: 2026-10-22  
Source identity: `book:hebrewbooks:5635`  
Authorial loci: PDF p.14 (Birkat Kohanim), PDF p.71 (doubled words)  
Status: canonical-engine verification + reproducible corpus reconstruction; one contradiction preserved

## 1. Birkat Kohanim edge tokens — engine verified

The source names the first and last word of each of the three priestly blessings:

`יברכך וישמרך · יאר ויחנך · ישא שלום`

On 2026-10-22 the six tokens were submitted to the live canonical SOD1820
Gematria path, `public.fn_method_value('רגיל', text)`, through the canonical
read-only Supabase connection. No local arithmetic implementation was used as
the truth authority.

| Ordinal | Token | Canonical רגיל result |
|---:|---|---:|
| 1 | יברכך | 252 |
| 2 | וישמרך | 576 |
| 3 | יאר | 211 |
| 4 | ויחנך | 94 |
| 5 | ישא | 311 |
| 6 | שלום | 376 |
|  | **Combined phrase** | **1,820** |

Verdict: `ENGINE_VERIFIED`. The authorial token-selection witness and the
canonical engine result agree exactly.

## 2. Doubled-word corpus — counting contract

The reconstruction uses the repository's existing canonical Torah/ELS verse
text, `tools/els/data/tk-vtext.txt`, with the first five books bounded by
`tk-vchap.txt` and `tk-meta.json`. The scanned Torah slice contains 5,846 verses
and has SHA-256:

`e03370ff796fcbc8f990f3f104d016d622aee896c2ee9b5a148d09e3469790c2`

The bounded procedure is implemented in
`scripts/research/ahavat-torah-doubled-words.mjs`:

1. scan within each Torah verse only;
2. preserve the source's space-separated word boundaries;
3. ignore only the parasha markers `פ` and `ס`;
4. select adjacent tokens whose unpointed spelling is exactly equal;
5. order occurrences by canonical Torah order.

This contract is necessary because `public/torah-verses.json` is a display
projection that joins maqaf-linked tokens (`לך־לך` → `לךלך`). It is therefore
not an adequate word-boundary source for this particular claim.

## 3. Reconstructed results

| Scenario | Occurrences | `דרש דרש` ordinal | First | Last |
|---|---:|---:|---|---|
| Raw exact adjacent-token scan | 90 | 46 | בראשית 1:26, `הרמש הרמש` | דברים 32:39, `אני אני` |
| Exclude only בראשית 12:1, `לך לך` | 89 | 45 | same | same |
| Exclude both different-lexeme cases: בראשית 12:1 `לך לך` and שמות 15:25 `שם שם` | 88 | 44 | same | same |

The raw scan independently reproduces both of the author's boundary anchors.
The author's exact total (`פ״ט` = 89) and midpoint claim (`דרש דרש` = item 45)
are also reproduced exactly — but only when `לך לך` is removed and `שם שם` is
retained.

The prose on p.71, however, appears to instruct the reader to exclude both
`לך לך` and `שם שם` because they represent different lexemes/roots. The
different-lexeme `שם שם` that fits that description is שמות 15:25 (`שָׁם שָׂם`,
“there he placed”), at raw ordinal 36. Applying both stated exclusions yields
88 occurrences and moves `דרש דרש` to ordinal 44.

Verdict: `CORPUS_RECONSTRUCTED · CONTRADICTION_PRESERVED`. The corpus has been
reproduced far enough to isolate the discrepancy, but the source claim is not
force-corrected. Possible explanations that remain unproven include a different
word-boundary tradition, an unstated inclusion elsewhere, or a simple counting
slip in the printed passage.

## 4. Reproduction

```bash
node scripts/research/ahavat-torah-doubled-words.mjs
node --test test/ahavat-torah-doubled-words.test.mjs
```

The test fixes the three observable outcomes separately: 90/46 raw, 89/45 with
only `לך לך` excluded, and 88/44 with both stated different-lexeme exclusions.
This prevents a future presentation layer from silently choosing the convenient
89/45 result while hiding the second exclusion.

## 5. Updated status

- CP5-WG-05 Birkat Kohanim: source witness `VISUALLY_VERIFIED`; numeric result
  `ENGINE_VERIFIED` at 1,820.
- CP5-WG-02 doubled words: source witness `VISUALLY_VERIFIED`; corpus
  `RECONSTRUCTED`; the exclusion contract remains `UNRESOLVED` because the
  printed prose and canonical scan do not close simultaneously.
- DS-03 (`79,976 ↔ 110,976`) and DS-04 (`304,812 ↔ 304,830`) are untouched by
  this pass and remain open.

