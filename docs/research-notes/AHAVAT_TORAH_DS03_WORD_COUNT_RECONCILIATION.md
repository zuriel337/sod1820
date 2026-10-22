# אהבת תורה — DS-03 word-count reconciliation

> Status: branch-only research correction, 2026-10-22. No database write, merge,
> deploy, canonical promotion, or Production change.

## Outcome

The apparent `79,976 ↔ 110,976` source contradiction is closed. The final line of
the `תיבות התורה` table on PDF p.41 reads:

`ס״ה ע״ט אלף תתקע״ו`

The disputed glyph is **ט**, not final **ם**. The normalized author count is
therefore **79,976**. The earlier `110,976` reading is withdrawn as a visual
transcription error; it is not preserved as a competing source value.

The whole DS-03 dataset is now closed. The Torah-total source witness, the
edition-specific clean word-boundary reproduction, all 54 per-parasha rows, and
all five cumulative book checkpoints have been reconciled.

## Direct source witnesses

The same total is not confined to two passages. A targeted full-PDF search followed
by direct visual inspection found five explicit witnesses:

| PDF page | Local wording | Status |
|---|---|---|
| 12 | `חפשתי ומצאתי כי בתורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |
| 25 | `... מתיבות התורה אשר הם ע״ט אלף תתקע״ו` | VISUALLY_VERIFIED |
| 30 | `בכל התורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |
| 41 | `ס״ה ע״ט אלף תתקע״ו` | VISUALLY_VERIFIED; corrects the prior p.41 read |
| 51 | `כי בתורה יש ע״ט אלף תתקע״ו תיבות` | VISUALLY_VERIFIED |

Source object: `book:hebrewbooks:5635`

PDF SHA-256: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`

## Reproducible local-corpus diagnostic

`scripts/research/ahavat-torah-word-count.mjs` audits the repository's Torah
display projection without pretending that it is a clean word corpus:

| Measure | Result |
|---|---:|
| Torah verses in `tk-vtext.txt` | 5,846 |
| whitespace tokens | 80,849 |
| standalone `פ` / `ס` section markers | 670 |
| display words after marker removal | 80,179 |
| delta from the author's 79,976 | +203 |
| Hebrew letters in the display projection after marker removal | 305,599 |
| canonical Torah letters in `tk-letters.txt` | 304,805 |
| letter delta | +794 |

The 80,179 result is therefore **not** a failed verification of the author. The
repository documentation identifies `tk-vtext.txt` as a verse-display projection,
and the file visibly contains edition/variant annotations such as
`בספרי ספרד ואשכנז`. Its 794-letter surplus independently proves that it is not the
same population as the canonical 304,805-letter Torah stream.

## Clean-corpus closure: 79,977 versus 79,976

`scripts/research/ahavat-torah-clean-word-corpus.mjs` compares two external word
projections without vendoring either source:

1. the five Koren-aligned static MAM JSON files served by ElevAlma; and
2. the five Michigan-Claremont Koren files published by TorahBibleCodes from the
   Rips text.

Both projections flatten to **exactly the same 304,805-letter sequence** as the
repository's canonical Torah prefix. All three normalized sequences have SHA-256:

`9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4`

The resulting counts are:

| Book | maqaf-split ketiv | Koren/Rips spaces | Delta |
|---|---:|---:|---:|
| Genesis | 20,612 | 20,612 | 0 |
| Exodus | 16,713 | 16,713 | 0 |
| Leviticus | 11,950 | 11,950 | 0 |
| Numbers | 16,408 | 16,408 | 0 |
| Deuteronomy | 14,294 | 14,293 | +1 |
| **Torah** | **79,977** | **79,976** | **+1** |

The complete boundary-set comparison has exactly one MAM-only boundary and zero
Koren/Rips-only boundaries. It is at canonical letter boundary **300,674**, in
Deuteronomy 32:6:

- maqaf-split ketiv: `ה | ליהוה` from `הֲ־לַיהוָה` — two words;
- Koren/Rips space contract: `הליהוה` — one word.

Thus the author's **79,976** is computationally reproduced by treating this
interrogative-he construction as one word. The independently published 79,977
count uses the otherwise identical letter stream and differs only because it
splits the Hebrew maqaf at this locus. `אשדת` in Deuteronomy 33:2 is ketiv-only
and remains one word in this audit; it is not the source of the delta.

Reproduction command (paths point to locally downloaded source files):

```sh
node scripts/research/ahavat-torah-clean-word-corpus.mjs \
  --mam-dir /path/to/elev-alma-corpus \
  --koren-dir /path/to/TorahBibleCodes_Go/texts
```

Provenance pinned on 2026-10-22:

- ElevAlma corpus URL pattern:
  `https://codigos.elevalma.com/data/corpus/{Genesis,Exodus,Leviticus,Numbers,Deuteronomy}.json`
- ElevAlma methodology:
  `https://codigos.elevalma.com/en/blog/numeros-tanaj-versiculos-palabras-letras`
- TorahBibleCodes source:
  `https://github.com/TorahBibleCodes/TorahBibleCodes_Go`, commit
  `5000c8924df26f48683b8baa3fc71249c77731c4`
- The TorahBibleCodes files declare all rights reserved. They were used as a
  read-only comparison source and are deliberately not copied into this repository.

## Per-parasha closure

Direct 600dpi inspection of the `תיבות התורה` paragraph on PDF p.41 was checked
against `scripts/research/ahavat-torah-parasha-word-count.mjs`. The script counts
the Koren-aligned MAM verses by the traditional weekly-reading boundaries and
applies the already-proven Koren/Rips boundary at Deuteronomy 32:6. Every printed
parasha value is reproduced.

| ספר | פרשה: מספר תיבות |
|---|---|
| בראשית | בראשית 1,931 · נח 1,861 · לך לך 1,686 · וירא 2,085 · חיי שרה 1,402 · תולדות 1,432 · ויצא 2,021 · וישלח 1,976 · וישב 1,558 · מקץ 2,022 · ויגש 1,480 · ויחי 1,158 |
| שמות | שמות 1,763 · וארא 1,748 · בא 1,655 · בשלח 1,681 · יתרו 1,105 · משפטים 1,462 · תרומה 1,145 · תצוה 1,412 · כי תשא 2,002 · ויקהל 1,558 · פקודי 1,182 |
| ויקרא | ויקרא 1,673 · צו 1,353 · שמיני 1,238 · תזריע 1,010 · מצורע 1,274 · אחרי מות 1,170 · קדושים 868 · אמור 1,614 · בהר 737 · בחוקותי 1,013 |
| במדבר | במדבר 1,823 · נשא 2,264 · בהעלותך 1,840 · שלח 1,540 · קרח 1,409 · חקת 1,245 · בלק 1,455 · פינחס 1,887 · מטות 1,484 · מסעי 1,461 |
| דברים | דברים 1,548 · ואתחנן 1,878 · עקב 1,747 · ראה 1,932 · שופטים 1,523 · כי תצא 1,582 · כי תבא 1,747 · נצבים 657 · וילך 553 · האזינו 614 · וזאת הברכה 512 |

The source prints **cumulative**, not independent, checkpoints after each book:

| ספר שהושלם | סכום הספר | הסכום המצטבר | קריאת המקור |
|---|---:|---:|---|
| בראשית | 20,612 | 20,612 | `כ׳ אלף תרי״ב` |
| שמות | 16,713 | 37,325 | `ל״ז אלף שכ״ה` |
| ויקרא | 11,950 | 49,275 | `מ״ט אלף רע״ה` |
| במדבר | 16,408 | 65,683 | `ס״ה אלף תרפ״ג` |
| דברים | 14,293 | 79,976 | `ע״ט אלף תתקע״ו` |

The former pass-1 public rows (for example, Bereshit `1,131` and Noach `1,000`)
were OCR/transcription errors and are withdrawn rather than retained as competing
values. The author uses the short labels `תשא`, `אחרי`, `תצא`, `תבא`, and `ברכה`;
the normalized dataset expands them to the conventional parasha names.

## Truth-state split

- **SOURCE TOTAL:** CLOSED / VISUALLY_VERIFIED — 79,976, five witnesses.
- **PRIOR 110,976 READING:** CORRECTED / WITHDRAWN.
- **LOCAL DISPLAY-PROJECTION AUDIT:** REPRODUCIBLE — 80,179 under the declared
  whitespace contract, but unsuitable for canonical word-total verification.
- **PER-PARASHA TABLE:** CLOSED — all 54 rows match the clean corpus.
- **CUMULATIVE BOOK CHECKPOINTS:** CLOSED — 20,612 → 37,325 → 49,275 →
  65,683 → 79,976; the earlier description of these as independent book
  subtotals was corrected.
- **CLEAN EDITION-SPECIFIC WORD-BOUNDARY REPRODUCTION:** CLOSED — both word
  projections equal the local 304,805-letter stream; the only boundary delta is
  `ה | ליהוה` versus `הליהוה` at Deuteronomy 32:6.

## Next action

DS-03 has no remaining numeric rows. Continue to DS-04 (`אותיות התורה`, pp.41–42),
where the per-parasha letter rows and the final 304,8xx glyph still require an
equivalent source/corpus reconciliation. Do not use `tk-vtext.txt` as a canonical
word-count source.
