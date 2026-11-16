
### mobile

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |
|---|---|---|---|---|---|---|---|
| O1 | 6/6 | 6,842 → 1,660 (**-5,182**, p 0.002) | probe / paint | 784 / 106 → 23 / 5 | 6,842 → 3,710 (**-3,132**, p 0.002) | 1,802 → 1,660 (**-142**, p 0.002) | 0.000 / 0.000 |
| O3 | 6/6 | 7,144 → 1,776 (**-5,368**, p 0.002) | paint / paint | 794 / 106 → 28 / 8 | 7,072 → 3,786 (**-3,286**, p 0.002) | 1,794 → 1,776 (**-18**, p 0.149) | 0.000 / 0.139 |
| V1 | 6/6 | 6,952 → 1,714 (**-5,238**, p 0.002) | paint / paint | 794 / 107 → 26 / 6 | 6,912 → 3,569 (**-3,343**, p 0.002) | 1,864 → 1,714 (**-150**, p 0.002) | 0.000 / 0.001 |
| M1 | 6/6 | 6,908 → 1,700 (**-5,208**, p 0.002) | probe / paint | 784 / 106 → 25 / 7 | 6,908 → 4,292 (**-2,616**, p 0.002) | 1,810 → 1,690 (**-120**, p 0.002) | 0.000 / 0.000 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|---|
| O1 | 151 → 157 | 6715 → 1456 | 8,352 → 5,164 (**-3,188**, p 0.002) | 266 → 433 (2 → 3 files) | 8,352 → 8,902 (**+550**, p 0.002) | 8,410 → 5,254 (**-3,156**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| O3 | 151 → 157 | 6904 → 1504 | 8,210 → 4,869 (**-3,341**, p 0.002) | 201 → 369 (2 → 3 files) | 8,210 → 8,494 (**+284**, p 0.002) | 8,264 → 4,994 (**-3,270**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| V1 | 519 → 229 | 6776 → 1513 | 9,706 → 6,290 (**-3,416**, p 0.002) | 519 → 457 (1 → 2 files) | 9,706 → 8,858 (**-848**, p 0.002) | 9,762 → 6,320 (**-3,442**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |
| M1 | 148 → 84 | 6746 → 1486 | 9,751 → 4,996 (**-4,755**, p 0.002) | 546 → 351 (6 → 7 files) | 9,826 → 8,712 (**-1,114**, p 0.002) | 9,792 → 5,028 (**-4,764**, p 0.002) | IMG.sod29-canonical-media-image.is-primary |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)

| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |
|---|---|---|---|---|
| O1 | 6,842 → 7,592 (**+750**, p 0.002) | 0 → 337 (**+337**, p 0.002) | 0 → 0 (**+0**, p 1.000) | adopted/byline/0 ×6 |
| O3 | 7,072 → 7,370 (**+298**, p 0.009) | 0 → 335 (**+335**, p 0.002) | 0 → 502 (**+502**, p 0.002) | adopted/title/0 ×6 |
| V1 | 6,912 → 7,362 (**+450**, p 0.015) | 0 → 347 (**+347**, p 0.002) | 0 → 454 (**+454**, p 0.002) | adopted/title/0 ×6 |
| M1 | 6,908 → 7,968 (**+1,060**, p 0.002) | 0 → 340 (**+340**, p 0.002) | 0 → 485 (**+485**, p 0.002) | adopted/title/0 ×6 |

### desktop

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | source A / B | KB / requests finished before the text A → B | lab probe A → B (ms) | first contentful paint A → B | CLS max A / B |
|---|---|---|---|---|---|---|---|
| O1 | 6/6 | 2,384 → 1,686 (**-698**, p 0.002) | probe / paint | 787 / 106 → 198 / 30 | 2,384 → 1,763 (**-621**, p 0.002) | 1,504 → 1,686 (**+182**, p 0.002) | 0.005 / 0.005 |
| O3 | 6/6 | 2,702 → 1,888 (**-814**, p 0.002) | paint / paint | 836 / 108 → 360 / 32 | 2,382 → 2,134 (**-248**, p 0.065) | 1,486 → 1,888 (**+402**, p 0.002) | 0.006 / 0.007 |
| V1 | 6/6 | 2,748 → 1,824 (**-924**, p 0.002) | paint / paint | 787 / 108 → 284 / 32 | 2,458 → 2,053 (**-405**, p 0.004) | 1,504 → 1,824 (**+320**, p 0.002) | 0.006 / 0.007 |
| M1 | 6/6 | 2,570 → 1,626 (**-944**, p 0.002) | paint / paint | 787 / 106 → 161 / 29 | 2,388 → 1,795 (**-593**, p 0.002) | 1,496 → 1,626 (**+130**, p 0.002) | 0.006 / 0.007 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB A → B | cover starts A → B | cover finishes A → B | requested article images: KB A → B | all requested finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|---|
| O1 | 151 → 109 | 2341 → 1352 | 2,829 → 1,910 (**-919**, p 0.002) | 266 → 304 (2 → 3 files) | 2,829 → 2,902 (**+73**, p 0.015) | 2,734 → 1,918 (**-816**, p 0.002) | ARTICLE.sod29-reading-post |
| O3 | 151 → 109 | 2326 → 1401 | 2,774 → 1,948 (**-826**, p 0.002) | 201 → 273 (2 → 3 files) | 2,774 → 3,350 (**+576**, p 0.002) | 2,768 → 2,318 (**-450**, p 0.002) | ARTICLE.sod29-reading-post |
| V1 | 519 → 126 | 2398 → 1402 | 3,111 → 1,900 (**-1,211**, p 0.002) | 519 → 251 (1 → 2 files) | 3,111 → 3,196 (**+85**, p 0.310) | 2,814 → 2,188 (**-626**, p 0.002) | ARTICLE.sod29-reading-post |
| M1 | 148 → 84 | 2335 → 1354 | 2,956 → 1,890 (**-1,066**, p 0.002) | 446 → 281 (4 → 5 files) | 2,974 → 2,840 (**-134**, p 0.002) | 2,652 → 1,804 (**-848**, p 0.002) | ARTICLE.sod29-reading-post |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article; the tools load when used)

| post | page ready A → B (ms) | open "פרטי הפוסט" → share usable A → B (ms) | go to the end → comment archive A → B (ms) | adoption B (place / correction px) |
|---|---|---|---|---|
| O1 | 2,384 → 2,528 (**+144**, p 0.002) | 0 → 318 (**+318**, p 0.002) | 0 → 0 (**+0**, p 1.000) | adopted/title/0 ×6 |
| O3 | 2,382 → 2,976 (**+594**, p 0.002) | 0 → 324 (**+324**, p 0.002) | 0 → 692 (**+692**, p 0.002) | adopted/title/0 ×6 |
| V1 | 2,458 → 2,802 (**+344**, p 0.002) | 0 → 319 (**+319**, p 0.002) | 0 → 408 (**+408**, p 0.002) | adopted/title/0 ×6 |
| M1 | 2,388 → 2,494 (**+106**, p 0.015) | 0 → 324 (**+324**, p 0.002) | 0 → 514 (**+514**, p 0.002) | adopted/title/0 ×6 |
