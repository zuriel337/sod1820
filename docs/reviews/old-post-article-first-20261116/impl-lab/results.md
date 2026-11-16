
### mobile

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | KB before the text A → B | requests before the text A → B | CLS max A / B |
|---|---|---|---|---|---|
| O1 | 6/6 | 6,826 → 3,316 (**-3,510**, p 0.002) | 773 → 181 | 102 → 30 | 0.000 / 0.000 |
| O3 | 6/6 | 7,010 → 3,386 (**-3,624**, p 0.002) | 794 → 184 | 103 → 30 | 0.000 / 0.000 |
| V1 | 6/6 | 6,942 → 3,358 (**-3,584**, p 0.002) | 794 → 183 | 103 → 30 | 0.000 / 0.000 |
| M1 | 6/6 | 6,973 → 3,318 (**-3,655**, p 0.002) | 784 → 181 | 102 → 30 | 0.000 / 0.000 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB | cover starts A → B | cover finishes A → B | all requested article images finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|
| O1 | 151 | 6,714 → 1,392 | 8,352 → 4,952 (**-3,400**, p 0.002) | 8,352 → 8,646 (**+294**, p 0.041) | 8,414 → 6,090 (**-2,324**, p 0.002) | IMG.aligncenter.size-full |
| O3 | 151 | 6,813 → 1,430 | 8,116 → 4,755 (**-3,361**, p 0.002) | 8,116 → 8,561 (**+445**, p 0.002) | 8,164 → 4,482 (**-3,682**, p 0.002) | IMG.alignnone.size-full |
| V1 | 519 | 6,796 → 1,424 | 9,722 → 8,716 (**-1,006**, p 0.002) | 9,722 → 10,896 (**+1,174**, p 0.002) | 9,774 → 3,396 (**-6,378**, p 0.002) | P.wp-block-paragraph |
| M1 | 148 | 6,841 → 1,392 | 9,839 → 7,101 (**-2,738**, p 0.002) | 9,922 → 10,020 (**+98**, p 0.394) | 9,880 → 8,378 (**-1,502**, p 0.002) | IMG.wp-image-36837 |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article, the tools load when used)

| post | tools ready A → B (ms) | page JS downloaded before tools ready A → B (KB) | adoption B |
|---|---|---|---|
| O1 | 6,826 → 7,372 (**+546**, p 0.009) | 583 → 511 | adopted/byline ×6 |
| O3 | 7,010 → 7,452 (**+442**, p 0.009) | 583 → 511 | adopted/title ×6 |
| V1 | 6,942 → 7,468 (**+526**, p 0.002) | 583 → 511 | adopted/title ×6 |
| M1 | 6,973 → 8,914 (**+1,941**, p 0.002) | 583 → 511 | adopted/title ×6 |

### desktop

**1. Text** (the post's own title and opening text visible)

| post | n | text visible A → B (ms) | KB before the text A → B | requests before the text A → B | CLS max A / B |
|---|---|---|---|---|---|
| O1 | 6/6 | 2,436 → 1,637 (**-799**, p 0.002) | 787 → 181 | 103 → 30 | 0.005 / 0.005 |
| O3 | 6/6 | 2,376 → 1,688 (**-688**, p 0.002) | 787 → 184 | 103 → 30 | 0.006 / 0.006 |
| V1 | 6/6 | 2,379 → 1,663 (**-716**, p 0.002) | 787 → 183 | 103 → 30 | 0.006 / 0.006 |
| M1 | 6/6 | 2,394 → 1,646 (**-748**, p 0.002) | 787 → 181 | 103 → 30 | 0.006 / 0.006 |

**2. Images** (measured separately; earlier text is not an image result)

| post | cover KB | cover starts A → B | cover finishes A → B | all requested article images finished A → B | LCP A → B | LCP element B |
|---|---|---|---|---|---|---|
| O1 | 151 | 2,366 → 1,331 | 2,863 → 1,849 (**-1,014**, p 0.002) | 2,863 → 2,811 (**-52**, p 0.045) | 2,758 → 1,984 (**-774**, p 0.093) | ARTICLE#sod29-ssr-article.sod29-reading-post |
| O3 | 151 | 2,312 → 1,374 | 2,756 → 1,898 (**-858**, p 0.002) | 2,756 → 2,854 (**+98**, p 0.002) | 2,780 → 2,098 (**-682**, p 0.240) | ARTICLE#sod29-ssr-article.sod29-reading-post |
| V1 | 519 | 2,320 → 1,362 | 3,034 → 2,482 (**-552**, p 0.002) | 3,034 → 3,130 (**+96**, p 0.026) | 2,802 → 2,758 (**-44**, p 0.589) | ARTICLE.sod29-reading-post |
| M1 | 148 | 2,328 → 1,344 | 2,938 → 1,858 (**-1,080**, p 0.002) | 2,964 → 2,952 (**-12**, p 0.240) | 2,626 → 2,392 (**-234**, p 0.699) | ARTICLE.sod29-reading-post |

**3. Tools** (A: the page renders with its tools; B: the page code has run and adopted the article, the tools load when used)

| post | tools ready A → B (ms) | page JS downloaded before tools ready A → B (KB) | adoption B |
|---|---|---|---|
| O1 | 2,436 → 2,400 (**-36**, p 0.132) | 583 → 511 | adopted/byline ×6 |
| O3 | 2,376 → 2,440 (**+64**, p 0.002) | 583 → 515 | adopted/title ×6 |
| V1 | 2,379 → 2,407 (**+28**, p 0.065) | 583 → 518 | adopted/title ×6 |
| M1 | 2,394 → 2,546 (**+152**, p 0.002) | 583 → 511 | adopted/title ×6 |
