# SOD1820 — ELS Capability Audit (the "78-capability" gate)

**Status:** READ-ONLY audit. No engine change, no schema change, no UI, no migration, no merge, no deploy.
**Actor:** Claude — ELS agent (session `els2`)
**Branch:** `claude/els2-b45k5h`
**Human-Gate:** ZURIEL
**Date:** 2026-08-18 (Asia/Jerusalem)

**Answers the open inter-agent memo** (`work_log` d5e02c7d, 2026-08-17; repeated in d5fdf45e, 2026-08-18):

> *"Next: ELS agent performs the read-only 78-capability Capability → Object → Value → Cost → Coverage → Risk → Decision Impact audit … check the strategic additions for overlap before choosing implementation priorities."*

**Inputs read:** `docs/els-capability-map.md`, `docs/research-object-map.md`, `docs/els-foundation-addendum.md`
(branches `gpt/research-object-map`, `gpt/els-foundation-integration`), `docs/sod1820-research-time-and-extensible-laws.md`,
`docs/MASTER_STATE_STRATEGIC_ADDENDA.md`, `docs/SESSION_HANDOFF_SOD1820.md`, `tools/els/README.md`,
**the canonical engine source** `tools/els/els-code.template.html` (3,914 lines, 196 functions),
`src/components/TzofenEmbed.jsx`, `src/lib/elsMatrices.js`, `public.els_records` schema, and `work_log`.

**What is new here vs. the strategy documents:** the strategy documents describe *what should exist*.
This audit checks **every capability against the actual engine source and the actual database**, so each row carries
a verifiable status and evidence pointer. Eight coverage gaps below (GAP-1…GAP-8) were found by reading code, not by planning.

---

## תקציר לצוריאל (עברית)

1. **הביקורת בוצעה READ-ONLY.** לא נגעתי במנוע, ב-DB, ב-UI ובפריסה. זה מסמך-שער בלבד, ממתין לאישורך.
2. **הרוב כבר קיים.** מתוך **85 היכולות** ברשימה: **72 חיות במנוע הקנוני** · 2 קיימות רק בענף לא-ממוזג · 2 חלקיות · 1 «קוד מת» · 7 חסרות · 1 «אסור לבנות». הפער האמיתי איננו ברשימת-היכולות אלא ב**שכבה האסטרטגית** (סעיף 6).
3. **המנוע חזק הרבה יותר מהממשק.** יש 11 עדשות, 8 מחוללי-מועמדים, מונטה-קרלו, חתימה, נדירות, שרשרת-אזורים — הפער האמיתי הוא **חשיפה ומיקוד, לא יכולת**.
4. **GAP-1 (הכי חשוב):** חלון-הסטטיסטיקה אינו חלון-התצוגה. דירוג-המוצלב ומונטה-קרלו מחושבים על מלבן של **±30 שורות**, בעוד שהמסך מציג ומחפש **±33 שורות** (`blockOf`). המספרים נכונים לעצמם — אבל הם **לא על התמונה שרואים**.
5. **GAP-2:** רוחב-החלון `CW=min(S,80)` קבוע-בקוד בשלושה מקומות. זה כבר גרם לאובדן ממצא אמיתי («מלך אוסטרי × הקיסר»). זו הסיבה שגאומטריה היא יכולת-מחקר ולא כפתור-תצוגה.
6. **GAP-3:** `st.ctxR` (גובה-החלון) קיים ב-state אבל **אף פקד לא משנה אותו** — פרמטר-מחקר מוקפא.
7. **GAP-4:** `findAtSkips` (דילוגים שרירותיים) **כתוב ועובד — ואף פעם לא נקרא**. יכולת שלמה שמונחת ללא נתיב-UI. הכי זול לפתוח מכל הרשימה.
8. **GAP-5:** `els_records` **לא שומרת גאומטריה, גרסת-מנוע, מספר-מופע או פרמטרים.** לכן «Snapshot משוחזר» ו-«geometry provenance» אינם אפשריים היום — לא כי חסר UI, אלא כי חסרות עמודות.
9. **GAP-6:** אין Worker/WASM. כל חישוב כבד חוסם את הדפדפן; `clusterStat` נמדד ~3.8 שניות.
10. **GAP-7:** ELS **לא מחובר ל-Research Bus** של סביבת-המחקר — «➕ הוסף למחקר» לא קיים בצופן, בניגוד ל-`research_workspace_law`.
11. **GAP-8:** 4 פונקציות מתות במנוע (`findAtSkips`, `buildComments`, `qualityForMatrix`, `removeFromGallery`).
12. **המנוע מפוצל בין ענפים.** Split/Join (8 צורות), `scopeRange` ו-State-Contract חיים רק ב-`claude/els-work-area` (Preview, לא מוזג). כל תכנון שמניח שהם קיימים — שגוי היום.
13. **סדר-עדיפות מומלץ (לפי «כמה החלטה משתנה ליחידת עלות»):** GAP-1 → GAP-4 → GAP-3/GAP-2 (גאומטריה) → GAP-5 (עמודות provenance) → «ממצא → ציר ראשי» → GAP-7 → GAP-6.
14. **מה שאסור:** מנוע שני, מנוע-קירוב (`maxMismatches`), הרחבת-מרחב אוטומטית, פרימיום שהופך מועמד לעובדה.
15. **מספר «78»:** לא קיימת בשום מקום ברפוזיטורי רשימה מסודרת של 78 יכולות — זו הפניה למספר, לא לרשימה. שחזרתי את הרשימה משבעת המצאים במפת-היכולות: **98 שורות גולמיות → 13 כפילויות → 85 יכולות ייחודיות**, כלומר כיסוי רחב מ-78. הפירוט המלא בסעיף 2.

---

## 1. Method

1. **Register build.** Every capability listed in `docs/els-capability-map.md` §3.1, §5.1, §6, §7, §8, §9, §19 was extracted verbatim into a register and given a stable ID.
2. **Deduplication.** Rows repeated across sections were merged into one ID; every merge is listed in §2 so the count reconciles.
3. **Verification.** For each ID, the canonical engine source, the host bridge and the database were searched for an implementation. A capability is only marked LIVE when a call path exists (definition alone is not coverage — see GAP-8).
4. **Gate.** Each ID was then evaluated on the six declared dimensions (Object · Value · Cost · Coverage · Risk · Decision Impact) plus the six status determinations required by `research-object-map.md` §24 (exists / partial / duplicate / DATA-RESEARCH-INTELLIGENCE / dependency / experience tier).
5. **Overlap check.** The 20 strategic roadmap items (`sod1820-research-time-and-extensible-laws.md` §15) were mapped back onto register IDs to find overlap, novelty and duplication (§6).

**Not done deliberately:** no benchmark runs, no engine edits, no DB writes, no UI proposals beyond what already exists in the approved strategy documents.

## 2. Reconciliation with the "78" figure

The number **78** appears in `research-object-map.md` §24, `MASTER_STATE_STRATEGIC_ADDENDA.md` and the handoff, but
**no enumerated list of 78 ELS capabilities exists anywhere in the repository or in `work_log`.** It is a reference to a count, not to a list.
The register was therefore rebuilt from the map's own inventories:

| Source section | Raw rows |
|---|---|
| §3.1 Direct manipulation | 26 |
| §5.1 Search layer | 20 |
| §6 Finding actions | 11 |
| §7 Occurrence & proximity | 9 |
| §8 Ranking / statistics | 11 |
| §9 Candidate generators | 8 |
| §19 Save / share / research case | 13 |
| **Raw total** | **98** |

Thirteen rows are the same capability listed twice in different sections:

| Duplicate row | Merged into |
|---|---|
| §6 Focus | A05 Focus/center |
| §6 Draw line | A14 Draw finding line |
| §6 Change color | A12 Change finding color |
| §6 Expand | A15 Expand finding |
| §6 Hide/remove | A16 Remove finding |
| §6 Open source/verse context | A23 Verse reading |
| §7 Finding colors | A11 Color findings |
| §7 Expand all occurrences | A15 Expand finding |
| §7 Finding line | A14 Draw finding line |
| §8 Notable skip classification | D03 Notable occurrences |
| §19 Share link | A26 Share link |
| §19 PNG / share card | A25 Matrix PNG / share card |
| §19 Challenges | C05 Challenge a finding |

98 − 13 = **85 unique capabilities** (A 26 · B 20 · C 5 · D 6 · E 10 · F 8 · G 10) — a superset of the "78" reference.
Nothing was dropped to make a number fit, and every merged row is listed above so the arithmetic can be checked.

**Status distribution:** ✅ LIVE 72 · 🟡 BRANCH 2 · 🟠 PARTIAL 2 · 💤 DEAD 1 · ❌ MISSING 7 · ⛔ NEVER 1.

> **For ZURIEL:** if a literal 78-item list exists outside the repository (chat/spreadsheet), send it and I will diff it against this register in one pass. Until then, this register is the working canon and it covers more than 78.

## 3. Legend

**Status**

| Code | Meaning |
|---|---|
| ✅ LIVE | Implemented and reachable in the canonical built engine on this branch |
| 🟡 BRANCH | Implemented, but only on unmerged `claude/els-work-area` (Preview) — not in production reality |
| 🟠 PARTIAL | Exists but incomplete, constant-locked, or exposed only to admin |
| 💤 DEAD | Code exists, no call path — the capability is written but unreachable |
| ❌ MISSING | Not implemented anywhere |
| ⛔ NEVER | Explicitly forbidden by the map (§24) |

**Layer** — `D` DATA · `R` RESEARCH · `I` INTELLIGENCE (the separation is non-negotiable).
**Tier** — `A` Simple/Explorer · `B` Researcher · `C` Deep/Premium.
**Cost** — `S` (<50 ms / one control) · `M` (visible work / a panel) · `L` (blocking compute or new storage).

---

## 4. The register

Evidence points to `tools/els/els-code.template.html` (the canonical source; `public/tzofen.html` is its build output) unless another file is named.

### Family A — Matrix & display (map §3.1) — 26 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| A01 | Pan / drag | Matrix State | R | A | ✅ LIVE | `enablePan()` |
| A02 | Pinch zoom | Matrix State | R | A | ✅ LIVE | `enablePan()` touch handlers |
| A03 | Zoom − / + | Matrix State | R | A | ✅ LIVE | `setZoom()`, `st.zoom` |
| A04 | Fit to screen | Matrix State | R | A | ✅ LIVE | `fitMatrixToScreen()`, `markedBBox()` |
| A05 | Focus / center on axis | Matrix State | R | A | ✅ LIVE | `centerMain()`, `st.focus` |
| A06 | Tap letter → exact location | Evidence | D | A | ✅ LIVE | `locateLetter()` :1093, `verseAt()` :1091 |
| A07 | Theme — Royal dark | Matrix State | R | A | ✅ LIVE | `applyView()`, `data-theme="royal"` :941 |
| A08 | Theme — Classic light | Matrix State | R | A | ✅ LIVE | `data-theme="classic"` :943 |
| A09 | Theme — Parchment (קלף) | Matrix State | R | A | ✅ LIVE | `data-theme="klaf"` :942 |
| A10 | Niqqud display | Source | D | B | ✅ LIVE | `ensureNiqqud()`, `st.niqqud` |
| A11 | Color findings (palette) | Finding group | R | A | ✅ LIVE | `colorSets()` |
| A12 | Change finding color | Finding | R | B | ✅ LIVE | `recolorOnly()` |
| A13 | Show / hide axis | Axis | R | B | ✅ LIVE | `st.hideMain` :1260 (persisted on save) |
| A14 | Draw finding line | Finding | R | B | ✅ LIVE | `buildLineStrip()`, `st.lineFor` |
| A15 | Expand finding | Finding | R | B | ✅ LIVE | `buildOccPanel()`, `renderOccList()` |
| A16 | Remove finding | Finding | R | B | ✅ LIVE | word-list delete handler |
| A17 | Manual finding reorder | Finding group | R | B | ✅ LIVE | move up/down handlers |
| A18 | Manual cell selection | Evidence | R | B | ✅ LIVE | `st.selMode`, `updateSelBar()` |
| A19 | Heat map | Finding group | R | B | ✅ LIVE | `computeHeat()` :2960, `heatColor()` |
| A20 | 3D view | Matrix State | R | B | ✅ LIVE | `enable3D()` :3156 — tilt of the same matrix, **not** spatial analysis |
| A21 | Film / reveal | Matrix State | R | B | ✅ LIVE | `playReveal()` :2533, `armReveal()` |
| A22 | Presentation mode | Matrix State | R | B | ✅ LIVE | `startPresent()` :2609 |
| A23 | Verse reading | Source | D | B | ✅ LIVE | `ensureVerseText()`, `highlightVerse()` |
| A24 | Verse span | Evidence | D | B | ✅ LIVE | `verseSpan()` :1098 |
| A25 | Matrix PNG / share card | Snapshot | R | B | ✅ LIVE | `downloadMatrixPNG()` :2486, `buildShareCard()` :2446 |
| A26 | Share link | Snapshot | R | B | ✅ LIVE | `shareLink()`, `encodeMatrix()` :2337 |

**Gate (family A).** *Value:* this family is the entire reason a finding can be inspected at all; it is the researcher's eye.
*Cost:* S each, all main-thread, no engine call. *Coverage:* none — display operations add no search space (A06/A23/A24 add **evidence** coverage: text location).
*Risk:* **visualization is not evidence** — A19–A22 are the most persuasive and the least probative; a heat map and a film make a weak finding look strong.
*Decision impact:* A06/A23/A24 can change a decision (a finding that lands on an unexpected verse), A01–A05 and A19–A22 cannot; they only change what is looked at.
*Dependencies:* none. *Duplicates:* A11/A12 are the group and per-item forms of one mechanism — merge in any future UI, do not build a third.

### Family B — Search (map §5.1) — 20 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| B01 | Normal ELS search | Axis / Term | R | A | ✅ LIVE | `run()`, `findAll()` :1128, `fwd()` :1110 |
| B02 | Simple cross search | Finding | R | A | ✅ LIVE | `runCrossSimple()` :1677 |
| B03 | Add a word to current matrix | Term | R | A | ✅ LIVE | `addXTerm()`, `addLensWord()`, `recomputeWords()` |
| B04 | Torah scope (default) | Source | D | A | ✅ LIVE | `scopeN()` :1067, `TORAH_N=304805` :1066 |
| B05 | Full Tanakh / Deep scope | Source | D | B | ✅ LIVE (gated) | `tanakhLocked()`, `gate("tanakh")` :1536 |
| B06 | Multi-term cross search | Cluster | R | C | ✅ LIVE | `crossFindMulti()` :1611 |
| B07 | Free convergence (no fixed axis) | Cluster | R | C | ✅ LIVE | `crossFindFree()` :1705 |
| B08 | Bridge (engine finds the axis) | Axis | R | C | ✅ LIVE | `runBridge()` :1782, `chooseAxis()` :1652 |
| B09 | All-sides / mirror cross | Cluster | R | C | ✅ LIVE | `runCrossSides()` :1745, `sidesForms()` :1742 |
| B10 | Split / Join — 8 forms | Term | R | B/C | 🟡 BRANCH | `FORMS` registry exists **only** on `claude/els-work-area` (commit 2dbb658) |
| B11 | Atbash / Albam / Abgad / reverse | Term | R | C | ✅ LIVE | `lensMirror()` :1858 (advanced/admin lens) |
| B12 | Arbitrary skip series | Axis | R | C | 💤 DEAD | `findAtSkips()` :1132 — **zero call sites in 3,914 lines** |
| B13 | Power-of-2 / Fibonacci / prime skips | Axis | R | C | ❌ MISSING | `notable()` :1171 classifies skips, it does not search them; no Fibonacci anywhere |
| B14 | Single-book scope | Source | D | C | ❌ MISSING | `scopeN()` is `torah \| tanakh` only |
| B15 | Wildcard patterns | Term | R | C | ✅ LIVE | `scanPattern()` :1910, `lensPattern()` |
| B16 | Neighborhood / radius search | Cluster | R | B/C | ✅ LIVE | `lensRadius()` :1890, `scanNeighborhood()` :1872 |
| B17 | Spelling variants (FORMS registry) | Term | R | C | 🟡 BRANCH | same registry as B10 |
| B18 | Multilingual candidate derivation | Candidate | I | C | ❌ MISSING | no derivation path; corpus is Hebrew-only by construction |
| B19 | Letters before / after a finding | Evidence | D | B | 🟠 PARTIAL | `scanAxisLineNow()` :2042 returns **words** on the axis continuation; raw letter context is not exposed |
| B20 | Approximate / mismatch search | — | — | — | ⛔ NEVER | correctly absent; forbidden by map §24 |

**Gate (family B).**

| ID | Value | Cost | Coverage | Risk | Decision impact |
|---|---|---|---|---|---|
| B01–B03 | the product itself | S–M | baseline | none beyond ranking | every research decision starts here |
| B04/B05 | scope is the biggest single lever on rarity | B05 = L (4× corpus, measured slow cases) | ×4 search space | a Tanakh hit is **not** as rare as a Torah hit — must never be compared naively | changes whether a finding is notable at all |
| B06–B09 | convergence is "the successful search" (`els_single_engine_law`) | M–L | multi-term space | multiple comparisons: more terms ⇒ more accidental crossings | promotes a single finding to a cluster claim |
| B10/B17 | orthographic variants are a real research dimension | M | ×8 forms | form explosion inflates hit counts if the null model is not adjusted | **blocked**: not merged, so no decision may assume it |
| B11 | classical ciphers, cheap because window-bounded | S | mirrors only | cipher space is large; post-hoc cipher choice is a hidden degree of freedom | supports/undermines a mirror hypothesis |
| B12 | opens skip families that today cannot be asked at all | S to expose, M–L to run | large | unbounded skip lists = unbounded search space; needs a declared bound | **highest cheap decision impact** — the code is already written |
| B13 | tests "is this skip structurally special?" | M | bounded families | numerology-by-selection if families are chosen after seeing the result | only if pre-registered before the search |
| B14 | book-level rarity is the honest denominator for book-local claims | M | narrower, cleaner | small corpora produce more spurious short hits | changes rarity denominators |
| B15/B16 | cheap discovery around an existing axis | M | window-local | wall-of-candidates fatigue | feeds F-family ranking |
| B18 | future non-Hebrew inputs | L | new corpora | translation is interpretation, not data | none until a source corpus exists |
| B19 | reading context is how a finding becomes meaningful | S | evidence only | over-reading adjacent letters | supports/kills a reading |
| B20 | — | — | — | destroys falsifiability | ⛔ do not build |

### Family C — Finding actions (map §6, deduplicated) — 5 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| C01 | Open exact occurrence | Evidence | D | B | ✅ LIVE | `renderOccList()`, `toggleHit()` |
| C02 | **Finding → primary axis** (promotion) | Axis / Research Path | R | B | ❌ MISSING | `chooseAxis()` :1652 selects an axis *inside* a cross run; there is no promote-and-return loop |
| C03 | Add to research case | Research Case | R | A/B | ❌ MISSING | `TzofenEmbed` emits only `ready/search/save/contribute/delete/navigate/quality/gate` — no `research:add` |
| C04 | Compare findings / matrices | Experiment | R | C | ❌ MISSING | no comparison surface anywhere |
| C05 | Challenge a finding | Interpretation | I | C | ❌ MISSING | generic `addContribution()` exists on the host (`src/lib/contributions.js`); no ELS path |

**Gate (family C).**

| ID | Value | Cost | Coverage | Risk | Decision impact |
|---|---|---|---|---|---|
| C01 | evidence access | S | — | — | grounds every claim |
| C02 | closes the research loop `find → inspect → promote → search again → return` | M (state + back stack) | none directly — it **reuses** existing search | uncontrolled chaining = unbounded expansion; each hop must be recorded | high: turns one matrix into an investigation |
| C03 | ELS stops being an island; `research_workspace_law` requires it | S–M (Bus already exists site-side) | none | duplicate "saved" concepts (`els_records` vs `research_items`) if wired carelessly | medium: enables cross-tool work |
| C04 | the only honest way to show geometry/scope sensitivity | M–L | none | comparison invites cherry-picking the flattering view | high — feeds Challenge |
| C05 | adversarial review of one's own finding | M | none | ritual challenge without a null model is theatre | high: the difference between candidate and verified |

### Family D — Occurrence & proximity (map §7, deduplicated) — 6 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| D01 | Occurrence count | Finding | D | A | ✅ LIVE | `showSearchStat()` :1508 |
| D02 | Occurrence picker | Finding | R | B | ✅ LIVE | `buildOccPanel()`, `renderOccList()` |
| D03 | Notable occurrences | Finding | R | B | ✅ LIVE | `notable()` :1171 + `SIGNIFICANT` set :1170 |
| D04 | Range / filter by skip | Finding | R | B | ✅ LIVE | `st.occMin` / `st.occMax` :3383 |
| D05 | Proximity meter | Finding | R | B | ✅ LIVE | `st.crossPure`, `proxF()` :1580 |
| D06 | Show N findings | Finding group | R | B | ✅ LIVE | `st.showN` :1158 |

**Gate (family D).** *Value:* turns a raw hit list into a research selection. *Cost:* S (all local, on already-computed hits).
*Coverage:* none — these filter existing results. *Risk:* **selection is the main hidden degree of freedom in ELS.** D03's `SIGNIFICANT` set is a
hard-coded editorial list of 49 numbers; presenting a skip as "מספר מוכר" is an interpretation baked into DATA presentation.
*Decision impact:* D03–D05 change which occurrence is investigated, and therefore change everything downstream. *Recommendation:* the `SIGNIFICANT` list
should eventually become a registered research law (see S18) with a version, not an anonymous constant.

### Family E — Ranking, statistics, verification (map §8, deduplicated) — 10 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| E01 | Gap / proximity ranking | Finding | R | B | ✅ LIVE | `gapF()` / `proxF()` :1580 (tightness × proximity, commit da5c4ba) |
| E02 | Strength score | Finding | R | B | ✅ LIVE | `strengthOf()` :1998 |
| E03 | Rarity | Finding | R | B | ✅ LIVE | `rarityOf()` :1575 (`faMemo` cache) |
| E04 | Quality score / stars | Matrix State | R | B | ✅ LIVE | `qualityCalc()` :3485, `starsFromTotal()` |
| E05 | Signature | Matrix State | R | C | ✅ LIVE | `computeSignature()` :1974 |
| E06 | Anchors | Finding | R | C | ✅ LIVE | `lensAnchor()`, `anchSkips` |
| E07 | Angle / parallel classification | Finding | R | C | ✅ LIVE | `gridStep()` + parallel-diagonal weighting |
| E08 | Zone chain | Cluster | R | C | ✅ LIVE | `zoneChain()` :3261, `analyzeZone()` :3213 |
| E09 | Monte Carlo (null model) | Experiment | R | C | ✅ LIVE | `runMonteCarlo()` :3003, `clusterStat()` :2980 |
| E10 | Zone Monte Carlo | Experiment | R | C | ✅ LIVE | `zoneMonteCarlo()` :3243 (TR=200 :3253) |

**Gate (family E).** *Value:* the only defence against "impressive picture = truth"; E09/E10 are the only capabilities in the whole register that can
*reduce* confidence. *Cost:* E01–E07 S–M; E09/E10 L (`clusterStat` measured ~3.8 s inside save; TR=200 trials is a small sample).
*Coverage:* no new search space; they add **interpretive** coverage. *Risk:* a score presented as proof — `ranking is not truth`; and a null model with
200 trials cannot support strong rarity claims. *Decision impact:* the highest in the register — E09/E10 decide whether a finding is publishable.
*Open calibration item (unchanged, not addressed here):* `strengthOf()` weights `gapF` ≈ ×20 versus `lenF`/`rarF` ≈ ×2 — length and rarity are plausibly underweighted.
Any change requires proposal → benchmark → saved-finding regression → Human-Gate.

### Family F — Candidate generators (map §9) — 8 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| F01 | `suggestCluster` — nearby word cluster | Candidate | R | B | ✅ LIVE | :2757 |
| F02 | `autoTerms` — terms from axis/neighbourhood | Candidate | R | B | ✅ LIVE | :1373 |
| F03 | `scanCandidates` — dictionary inside window | Candidate | R | B | ✅ LIVE | :2090 (`DICT`, 85 terms :1150) |
| F04 | `scanNeighborhood` — nearby words | Candidate | R | B | ✅ LIVE | :1872 |
| F05 | `gemGen` — numerical candidates | Candidate | R | C | ✅ LIVE | :1394 |
| F06 | `discoverHotAreas` — candidate regions | Candidate | R | C | ✅ LIVE | :2142 |
| F07 | `buildHypotheses` — research hypotheses | Hypothesis | I | C | ✅ LIVE | :2191 |
| F08 | `scanAxisLineNow` — words on axis continuation | Candidate | R | C | ✅ LIVE | :2042 |

**Gate (family F).** *Value:* the engine already proposes the next research step — this is the substrate an AI Navigator would sit on, so **the Navigator is a
ranking/presentation layer, not a new engine**. *Cost:* M each (window-local scans), F03 scales with `DICT`. *Coverage:* window-local only — a candidate
generator never leaves the displayed window, which makes GAP-1 and GAP-2 directly relevant to their honesty. *Risk:* wall-of-candidates; and a dictionary of
85 hand-picked terms is itself an editorial prior (`DICT` :1150) — candidates are pre-selected by theme. *Decision impact:* medium — they change what is looked at
next; they never establish a fact. *Recommendation:* `DICT` should be declared as a registered, versioned list (same argument as `SIGNIFICANT` in D03).

### Family G — Save / share / research case (map §19, deduplicated) — 10 capabilities

| ID | Capability | Object | Layer | Tier | Status | Evidence |
|---|---|---|---|---|---|---|
| G01 | Save matrix to cloud | Snapshot | D | B | ✅ LIVE | `performSaveToGallery()` :1239 → `postMessage save` → `save_els_matrix` |
| G02 | Anonymous save | Snapshot | D | A | 🟠 PARTIAL | `saveMatrixAnon()` exists in `src/lib/elsMatrices.js`; the ELS path sends anonymous users to `gate("save")` |
| G03 | Update a saved matrix | Snapshot | D | B | ✅ LIVE | `TzofenEmbed` "updated" status |
| G04 | Variants | Snapshot | R | B | ✅ LIVE | `getAllVariants()`, `mergeVariant()` |
| G05 | Duplicate detection | Snapshot | R | B | ✅ LIVE | `getDuplicatesOf()` |
| G06 | Gallery | Snapshot | D | A | ✅ LIVE | `renderGallery()`, `SavedMatricesGallery.jsx` |
| G07 | Load a saved matrix | Matrix State | R | A | ✅ LIVE | `loadMatrix()` :2310, `decodeMatrix()` :2339 |
| G08 | Contribution from ELS | Research Case | R | B | ✅ LIVE | `postMessage contribute` → `addContribution()` |
| G09 | Researcher dossier | Research Case | R | C | ✅ LIVE | `elsToDossier()` → `admin_els_to_dossier` |
| G10 | Human moderation | Decision | D | — | ✅ LIVE | `moderateMatrix()`, `ElsModerationTab.jsx`, `pending → published` |

**Gate (family G).** *Value:* this is the memory of the research; `els_records` is the intended research repository (README "phase B").
*Cost:* S per save; storage is trivial. *Coverage:* none. *Risk:* **GAP-5** — the stored row cannot reproduce the research state (no geometry, no engine
version, no occurrence index, no parameters), so a "saved matrix" is a picture with a term, not a reproducible snapshot. Also `home_hidden`/`self_published`
mean visibility is a product decision mixed into a research record. *Decision impact:* G10 is the Human-Gate itself — the highest-authority capability here.

---

## 5. Verified gaps (found by reading the engine, not by planning)

These are the audit's own findings. Every one is reproducible from the source on this branch.

### GAP-1 — the statistics window is not the displayed window
`crossFindMulti()` evaluates candidate anchor occurrences inside `RH=30, CW=min(S,80), c0=mainCol−40` (:1624), and `zoneMonteCarlo()` computes both
the observed statistic and the null model inside the same `RH=30` rectangle (:3249–3253). The window that is actually **rendered and searched** by
`blockOf()` is `RH = 18 + st.ctxR*5 = 33` rows (:2660). Horizontally the two agree (`c0 = mainCol − 40` when `CW = 80`); vertically they do not.
**Consequence:** cross-candidate ranking and the Monte-Carlo p-value describe a 61-row rectangle, while the user sees, searches (`findInBlock()`),
and adds words into a 67-row rectangle. The numbers are internally consistent but they are **not about the picture on screen**.
*Severity:* medium. *Fix class:* one shared window contract used by render, search and statistics. *Cost:* S–M. *Must be fixed before GAP-3.*

### GAP-2 — geometry is a hard-coded constant
`CW = Math.min(S, 80)` appears three times (:1624, :2661, :3249) and is never a parameter. The measured case «מלך אוסטרי × הקיסר» showed this can hide a
real in-window finding. Geometry therefore changes the research space while being invisible to the researcher — exactly the "hidden degree of freedom"
the strategy documents forbid. *Severity:* high (research validity). *Cost:* M for a declared control, L if multi-geometry comparison follows.

### GAP-3 — `st.ctxR` is a frozen research parameter
`st.ctxR` is initialised to `3` (:1151) and read once (:2660). **No control mutates it.** The vertical research window is effectively a constant that
looks like state. Exposing it is cheap — but doing so before GAP-1 widens the render/statistics mismatch instead of fixing it.

### GAP-4 — `findAtSkips()` is written and unreachable
`findAtSkips(raw, skips, from, to, cap)` (:1132) implements arbitrary skip-list search. A whole-file scan finds **no call site**. This is the single
cheapest real capability in the register: the search code already exists and only needs a bounded, declared entry point (B12, and B13 on top of it).

### GAP-5 — `els_records` cannot reproduce a research state
Stored columns: `search_term · scope · skip_distance · direction · positions · title · description · image_url · primary_number · anchor_numbers · status · visibility · owner/visitor · slug`.
**Absent:** geometry (`cw`, `ctxR`), occurrence index, engine version / build hash, ranking inputs, cipher/FORM used, search-space contract, method provenance.
A saved record is therefore a *picture plus a term*, not a Snapshot in the sense of the strategy documents. Research Path / Snapshot / geometry provenance
(S19, S01) are blocked at the **storage** layer, not the UI layer. *Cost:* additive columns only — no rewrite, no data loss.

### GAP-6 — no Worker, no WASM: every heavy capability blocks the browser
No `Worker` reference exists in the engine. `clusterStat()` (:2980) was measured at ~3.8 s inside save; `zoneMonteCarlo()` uses `TR = 200` trials (:3253),
a sample small enough that rarity claims from it should be stated with explicit uncertainty. Two saved Tanakh records («אריאל מלך» 652 · 33852) still do not
load within 400 s — a known, still-open performance case.

### GAP-7 — ELS is not connected to the Research Bus
`research_workspace_law` requires the three canonical actions (**➕ הוסף למחקר · ⭐ שמור · 🔗 שתף**) in every tool. `TzofenEmbed.jsx` handles
`ready / search / save / contribute / delete / navigate / quality / gate` and emits **no** `research:add`. ELS saves to `els_records`; the workspace saves to
`research_items`. Two memories, no bridge (C03).

### GAP-8 — four functions exist with no call path
`findAtSkips` (GAP-4), `buildComments`, `qualityForMatrix`, `removeFromGallery`. `qualityForMatrix()` (:3658) means saved matrices carry no computed quality;
`removeFromGallery()` (:1264) is superseded by the host `postMessage delete` path (:1302). Dead code in a 3,914-line single-file engine is a maintenance
and audit hazard: it reads as coverage that is not there.

### GAP-9 — the engine exists in two unmerged lines
The canonical built engine on this branch does **not** contain the `FORMS` registry (Split/Join, 8 forms), `scopeRange`, or the `elsState`/`emitState`
State-Contract. Those live only on `claude/els-work-area` (commits 7f066e2 · 2dbb658 · ce148f0), Preview-only, never merged. Any roadmap that assumes
B10/B17 exist is planning on top of code that is not in production. **Merging or discarding that branch is a prerequisite for an honest roadmap.**

---

## 6. Overlap check — the 20 strategic roadmap items vs. the register

Source: `docs/sod1820-research-time-and-extensible-laws.md` §15 (the additions that had not yet been checked against the capability list).

| # | Strategic item | Maps to | Overlap verdict |
|---|---|---|---|
| S01 | Geometry / window-width control (`cw`) | GAP-2; distinct from A03/A04 | **New research capability.** Not a duplicate of zoom/fit — those are visual, this changes the search space |
| S02 | Finding → Main Axis | C02 | Same capability, already registered as missing. No new object needed |
| S03 | Axis / secondary-axis exploration | C02 + B08 | Partial overlap: `runBridge()` already lets the engine choose an axis; only the **promotion loop** is missing |
| S04 | Registered skip-pattern research | B13, on top of B12 | Overlaps GAP-4: B12's dead code is the prerequisite. Do not build a second skip path |
| S05 | Single-book scope | B14 | Same. Requires a book index over the existing corpus, not a new corpus |
| S06 | Orthographic variants via FORMS | B10 / B17 | **Already built on `claude/els-work-area`** — the decision is merge-or-drop (GAP-9), not build |
| S07 | Before / after-letter transformations | B19 | Partial: `scanAxisLineNow()` covers words, not raw letters |
| S08 | Matrix comparison | C04 | Same. Depends on GAP-5 (comparison needs reproducible states) |
| S09 | Multi-geometry / structured-form analysis | S01 + C04, scoring touches E02/E04 | New — **and it must not silently replace the existing ranking** (map §8) |
| S10 | 3D spatial analysis on the same finding state | A20 | Overlap: a 3D **view** already exists (`enable3D()` tilt). "Spatial analysis" is a different, unbuilt capability. Naming them alike will cause a duplicate engine |
| S11 | Quality-model calibration | E02 / E04 | Not a new capability — a measurement project on existing code |
| S12 | AI Research Navigator | F01–F08 as substrate | **No new engine needed**: eight generators already produce candidates. The Navigator is ranking + presentation over them |
| S13 | AI Research Budget | new; prices B05, E09, E10, F03 | New governance layer, no engine change |
| S14 | AI Challenge Mode | C05, evidence from E09/E10/S01 | New surface over existing statistics |
| S15 | Research Context integration | C03 / GAP-7 | Same item as the Bus wiring. One job, not two |
| S16 | Timeline / Temporal Anchors / date candidates | no ELS register ID | **New and site-wide.** Belongs to the shared graph, not to ELS. Risk of a second timeline if built inside the engine |
| S17 | Numerical Scale Families (×10 / ÷10, leading-digit) | overlaps F05 `gemGen` | Must extend the existing numerical generator, not add a parallel one |
| S18 | Extensible Research Law Registry | would absorb D03 `SIGNIFICANT` (:1170), F03 `DICT` (:1150), E-family weights | **Highest structural value.** Three editorial constants are already acting as unversioned laws inside the engine |
| S19 | Research Path / Timeline / Snapshot | C02 + G01–G07 + GAP-5 | Blocked by storage (GAP-5), not by UI |
| S20 | Device-adaptive compute routing | GAP-6 | New; must not fork the engine (`els_single_engine_law`) |

**Overlap summary:** of 20 strategic items, **9 are already-registered capabilities** (S02, S03, S04, S05, S06, S07, S08, S11, S15), **4 are layers over
existing engine code** (S09, S12, S14, S17), **2 are blocked by storage or branch state** (S19, S06), and **5 are genuinely new** (S01, S13, S16, S18, S20).
No strategic item requires a second engine, a second tree or a second database.

---

## 7. Dependency chain (what blocks what)

```
GAP-1  shared window contract
  └─► GAP-3  expose ctxR ──┐
GAP-2  declared cw          ├─► S01 geometry control ─► S09 multi-geometry ─► S14 challenge (geometry sensitivity)
                            │
GAP-5  provenance columns ──┴─► S19 snapshot/replay ─► S08 matrix comparison
GAP-4  findAtSkips entry point ─► B12 ─► B13/S04 skip families
GAP-9  merge-or-drop els-work-area ─► B10/B17/S06 (and the State Contract that C03 needs)
GAP-7  research:add bridge ─► C03 ─► S15 Research Context
GAP-6  worker/compute ─► S20 routing ─► honest E09/E10 sample sizes, B05 at scale
C02 finding→axis ─► S02/S03 ─► S19 research path
S18 law registry ─► versions D03 SIGNIFICANT, F03 DICT, E02 weights
```

Two items block a disproportionate amount of the roadmap: **GAP-5** (nothing reproducible without it) and **GAP-9** (nothing honest while the engine is split).

---

## 8. Recommended priority — by decision impact per unit cost

Ranked by the gate's own criterion: *can the result change a decision, and what does it cost?*

| Rank | Item | Cost | Why first |
|---|---|---|---|
| 1 | **GAP-9** — merge or drop `claude/els-work-area` | S (decision, not code) | Every other estimate is wrong while two engine lines exist. Pure Human-Gate decision |
| 2 | **GAP-1** — one window contract for render + search + statistics | S–M | Corrects what the p-values and rankings actually describe. Prerequisite for geometry work |
| 3 | **GAP-4** — bounded entry point for `findAtSkips` | S | Whole capability already written; unlocks B12 → B13/S04 |
| 4 | **GAP-5** — additive provenance columns on `els_records` | S–M | Unblocks S19, S08, geometry provenance. Additive only, no data loss, no rewrite |
| 5 | **C02** — Finding → primary axis (+ back) | M | Closes the research loop; highest research value of any single UI capability |
| 6 | **GAP-2 / S01** — declared geometry control | M | Real validity issue (measured finding loss), but only honest after GAP-1 |
| 7 | **GAP-7 / C03** — `research:add` bridge | S–M | Law-compliance (`research_workspace_law`); the Bus already exists site-side |
| 8 | **S18** — register `SIGNIFICANT`, `DICT`, ranking weights as versioned laws | M | Turns three hidden editorial priors into inspectable, versioned rules |
| 9 | **GAP-6 / S20** — Worker before more compute | L | Required before B05-at-scale, larger `TR`, or `clusterStat` in the normal flow |
| 10 | **S11** — strength-model calibration | M (measurement) | Real, but a measurement project; must not ride along with UI work |

Deliberately **not** in the top ten: 3D spatial analysis (S10), multilingual derivation (B18), Timeline/Temporal (S16 — site-wide, not ELS),
AI Navigator/Budget (S12/S13 — they sit on top of items 1–8 and are wasted effort before them).

---

## 9. Confirmed "do not build" (unchanged, re-verified)

- A second ELS engine, a React reimplementation, a second corpus, a second research database — `els_single_engine_law`. Verified: one engine, one corpus (`tools/els/data/tk-letters.txt`), one embed path (`/tzofen.html?embed=1`).
- Approximate / `maxMismatches` search (B20) — verified absent.
- Silent search-space shrinking for performance, automatic 8-form Tanakh expansion before Worker support, AI that changes search parameters, premium paths that promote candidates to facts, hidden geometry changes without provenance.
- A parallel timeline, a parallel numerical engine, or a parallel candidate generator for S16/S17/S12 — extend the existing ones.

---

## 10. Open items for ZURIEL (Human-Gate)

1. **`claude/els-work-area`** — merge (bringing Split/Join, `scopeRange`, State Contract) or drop? Everything downstream depends on the answer.
2. Is there a literal **78-item list** outside the repository? If yes, send it and I will diff it against this register.
3. `SIGNIFICANT` (49 numbers) and `DICT` (85 terms) are editorial priors compiled into the engine — should they become registered, versioned research laws (S18)?
4. GAP-5's columns are additive and safe, but they touch a live table — approval needed before any migration is even drafted.

Nothing in this list blocks the audit itself; the audit is complete as delivered.

---

## 11. What this audit did not do

No code was changed, no schema was changed, no migration was drafted, no benchmark was run, no UI was proposed beyond what the approved strategy documents
already contain, nothing was merged, nothing was deployed, and no capability was promoted to canonical. A GAP finding is a **finding**, not authorisation to build.
