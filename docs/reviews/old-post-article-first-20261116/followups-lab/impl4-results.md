# Fair phone re-run (16.11.2026, 14:03–14:16 UTC)

- **A:** the combined base `978662134`.
- **C:** `9852baf0b`, rebuilt without the analytics IDs, as A and B were built.
- **Setup:** phone, Slow 4G, 4× CPU; blocks interleaved A C C A; n = 6 per post and arm.
- **Columns:** "B" below means arm C.


### mobile

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |
|---|---|---|---|---|---|---|---|
| O1 | 6/6 | 6,955 → 1,766 (**-5,189**, p 0.002) | probe / paint | 773 / 105 → 26 / 8 | 6,955 → 3,612 (**-3,343**, p 0.002) | 1,794 → 1,766 (**-28**, p 0.071) | 0.000 / 0.000 |
| O3 | 6/6 | 7,068 → 1,834 (**-5,234**, p 0.002) | paint / paint | 794 / 106 → 31 / 10 | 6,984 → 3,807 (**-3,177**, p 0.002) | 1,824 → 1,834 (**+10**, p 0.788) | 0.000 / 0.000 |
| V1 | 6/6 | 7,016 → 1,768 (**-5,248**, p 0.002) | paint / paint | 794 / 107 → 28 / 7 | 6,973 → 3,606 (**-3,367**, p 0.002) | 1,798 → 1,768 (**-30**, p 0.258) | 0.000 / 0.002 |
| M1 | 6/6 | 6,894 → 1,766 (**-5,128**, p 0.002) | probe / paint | 794 / 106 → 28 / 8 | 6,894 → 4,134 (**-2,760**, p 0.002) | 1,794 → 1,766 (**-28**, p 0.513) | 0.000 / 0.000 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|---|
| O1 | 151 → 157 | 6820 → 1496 | 8,460 → 5,046 (**-3,414**, p 0.002) | 266 → 433 (2 → 3 files) | 8,460 → 9,076 (**+616**, p 0.002) | 8,518 → 5,186 (**-3,332**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| O3 | 151 → 157 | 6828 → 1542 | 8,130 → 4,910 (**-3,220**, p 0.002) | 201 → 369 (2 → 3 files) | 8,130 → 8,738 (**+608**, p 0.002) | 8,202 → 5,044 (**-3,158**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| V1 | 519 → 229 | 6823 → 1547 | 9,748 → 6,300 (**-3,448**, p 0.002) | 519 → 457 (1 → 2 files) | 9,748 → 8,986 (**-762**, p 0.002) | 9,796 → 6,334 (**-3,462**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| M1 | 148 → 84 | 6735 → 1492 | 9,732 → 4,837 (**-4,895**, p 0.002) | 546 → 351 (6 → 7 files) | 9,818 → 8,932 (**-886**, p 0.002) | 9,764 → 4,876 (**-4,888**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)

| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |
|---|---|---|---|---|
| O1 | 6,955 → 7,715 (**+760**, p 0.002) | 0 → 343 (**+343**, p 0.002) | 1 → 0 (**-1**, p 0.567) | adopted/byline/0 ×6 |
| O3 | 6,984 → 7,606 (**+622**, p 0.002) | 0 → 333 (**+333**, p 0.002) | 0 → 476 (**+476**, p 0.002) | adopted/title/0 ×6 |
| V1 | 6,973 → 7,496 (**+523**, p 0.002) | 0 → 350 (**+350**, p 0.002) | 0 → 506 (**+506**, p 0.002) | adopted/title/0 ×6 |
| M1 | 6,894 → 8,100 (**+1,206**, p 0.002) | 0 → 334 (**+334**, p 0.002) | 0 → 496 (**+496**, p 0.002) | adopted/title/0 ×6 |
