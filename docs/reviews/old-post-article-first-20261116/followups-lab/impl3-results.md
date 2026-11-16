> **Not a fair comparison for page-ready and image completion.**
> - C (`9852baf0b`) was built with the production analytics IDs. A and B were built without them.
> - So gtag (165 KB) and fbevents (432 KB) loaded only in C, from about 5.1 s on the phone, competing with the page chunks. C's phone page-ready and "all requested images finished" are therefore later for a reason outside the change.
> - Text is not affected: it paints before the scripts start loading. The scripts draw nothing, so they add no layout shift.
> - The fair phone re-run (C rebuilt without the IDs) is `impl4-results.md`.

"B" in the column headers below means arm C.


### mobile

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |
|---|---|---|---|---|---|---|---|
| O1 | 6/6 | 6,891 → 1,724 (**-5,167**, p 0.002) | probe / paint | 784 / 106 → 25 / 6 | 6,891 → 3,563 (**-3,328**, p 0.002) | 1,816 → 1,724 (**-92**, p 0.002) | 0.000 / 0.000 |
| O3 | 6/6 | 7,008 → 1,882 (**-5,126**, p 0.002) | paint / paint | 794 / 106 → 35 / 13 | 6,961 → 3,820 (**-3,141**, p 0.002) | 1,836 → 1,882 (**+46**, p 0.331) | 0.000 / 0.000 |
| V1 | 6/6 | 7,112 → 1,782 (**-5,330**, p 0.002) | paint / paint | 794 / 107 → 30 / 8 | 7,080 → 3,636 (**-3,444**, p 0.002) | 1,868 → 1,782 (**-86**, p 0.310) | 0.000 / 0.002 |
| M1 | 6/6 | 6,999 → 1,720 (**-5,279**, p 0.002) | probe / paint | 773 / 105 → 27 / 8 | 6,999 → 4,137 (**-2,862**, p 0.002) | 1,850 → 1,720 (**-130**, p 0.039) | 0.000 / 0.000 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|---|
| O1 | 151 → 157 | 6766 → 1488 | 8,404 → 5,021 (**-3,383**, p 0.002) | 266 → 433 (2 → 3 files) | 8,404 → 11,306 (**+2,902**, p 0.002) | 8,464 → 5,176 (**-3,288**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| O3 | 151 → 157 | 6740 → 1566 | 8,048 → 4,894 (**-3,154**, p 0.002) | 201 → 369 (2 → 3 files) | 8,048 → 10,932 (**+2,884**, p 0.002) | 8,102 → 5,044 (**-3,058**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| V1 | 519 → 229 | 6898 → 1554 | 9,823 → 6,388 (**-3,435**, p 0.002) | 519 → 457 (1 → 2 files) | 9,823 → 12,020 (**+2,197**, p 0.002) | 9,874 → 6,418 (**-3,456**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| M1 | 148 → 84 | 6845 → 1534 | 9,842 → 4,828 (**-5,014**, p 0.002) | 546 → 351 (6 → 7 files) | 9,931 → 10,318 (**+387**, p 0.002) | 9,882 → 4,864 (**-5,018**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)

| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |
|---|---|---|---|---|
| O1 | 6,891 → 8,241 (**+1,350**, p 0.002) | 0 → 338 (**+338**, p 0.002) | 0 → 0 (**+0**, p 1.000) | adopted/byline/0 ×6 |
| O3 | 6,961 → 8,166 (**+1,205**, p 0.002) | 1 → 354 (**+353**, p 0.002) | 0 → 555 (**+555**, p 0.002) | adopted/title/0 ×6 |
| V1 | 7,080 → 8,246 (**+1,166**, p 0.002) | 0 → 338 (**+338**, p 0.002) | 0 → 574 (**+574**, p 0.002) | adopted/title/0 ×6 |
| M1 | 6,999 → 8,542 (**+1,543**, p 0.002) | 0 → 350 (**+350**, p 0.002) | 0 → 570 (**+570**, p 0.002) | adopted/title/0 ×6 |

### desktop

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |
|---|---|---|---|---|---|---|---|
| O1 | 6/6 | 2,383 → 1,698 (**-685**, p 0.002) | probe / paint | 787 / 106 → 240 / 30 | 2,383 → 1,723 (**-660**, p 0.002) | 1,496 → 1,698 (**+202**, p 0.002) | 0.005 / 0.005 |
| O3 | 6/6 | 2,692 → 1,882 (**-810**, p 0.002) | paint / paint | 812 / 108 → 427 / 33 | 2,396 → 2,200 (**-196**, p 0.041) | 1,504 → 1,882 (**+378**, p 0.002) | 0.006 / 0.006 |
| V1 | 6/6 | 2,696 → 1,810 (**-886**, p 0.002) | paint / paint | 787 / 108 → 274 / 31 | 2,404 → 1,871 (**-533**, p 0.002) | 1,502 → 1,810 (**+308**, p 0.002) | 0.006 / 0.006 |
| M1 | 6/6 | 2,506 → 1,648 (**-858**, p 0.002) | paint / paint | 787 / 106 → 209 / 30 | 2,363 → 1,692 (**-671**, p 0.002) | 1,482 → 1,648 (**+166**, p 0.002) | 0.006 / 0.006 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|---|
| O1 | 151 → 109 | 2320 → 1352 | 2,819 → 1,872 (**-947**, p 0.002) | 266 → 304 (2 → 3 files) | 2,819 → 3,096 (**+277**, p 0.002) | 2,714 → 1,936 (**-778**, p 0.002) | ARTICLE.sod29-reading-post |
| O3 | 151 → 109 | 2344 → 1398 | 2,780 → 1,916 (**-864**, p 0.002) | 201 → 273 (2 → 3 files) | 2,780 → 3,289 (**+509**, p 0.002) | 2,740 → 2,192 (**-548**, p 0.002) | ARTICLE.sod29-reading-post |
| V1 | 519 → 126 | 2341 → 1404 | 3,045 → 1,894 (**-1,151**, p 0.002) | 519 → 251 (1 → 2 files) | 3,045 → 3,226 (**+181**, p 0.002) | 2,778 → 2,114 (**-664**, p 0.002) | ARTICLE.sod29-reading-post |
| M1 | 148 → 84 | 2298 → 1354 | 2,917 → 1,832 (**-1,085**, p 0.002) | 446 → 281 (4 → 5 files) | 2,934 → 2,974 (**+40**, p 0.589) | 2,584 → 1,822 (**-762**, p 0.002) | ARTICLE.sod29-reading-post |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)

| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |
|---|---|---|---|---|
| O1 | 2,383 → 2,658 (**+275**, p 0.002) | 0 → 326 (**+326**, p 0.002) | 0 → 0 (**+0**, p 1.000) | adopted/title/0 ×6 |
| O3 | 2,396 → 2,903 (**+507**, p 0.002) | 0 → 322 (**+322**, p 0.002) | 0 → 594 (**+594**, p 0.002) | adopted/title/0 ×6 |
| V1 | 2,404 → 2,805 (**+401**, p 0.002) | 0 → 326 (**+326**, p 0.002) | 0 → 468 (**+468**, p 0.002) | adopted/title/0 ×6 |
| M1 | 2,363 → 2,560 (**+197**, p 0.002) | 0 → 321 (**+321**, p 0.002) | 0 → 720 (**+720**, p 0.002) | adopted/title/0 ×6 |
