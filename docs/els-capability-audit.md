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

---

## 12. LIVE RECONCILIATION — 2026-09-01 (`ELS_85_CAPABILITY_CANONICAL_CLOSURE`, actor=CLAUDE, Human-Gate ZURIEL)

**Status:** Sections 1–11 above are preserved **verbatim as historical provenance** — nothing above this line was edited, reworded, or deleted, per `everything_additive_law`/`NO-DISAPPEARING-CAPABILITY`. This section **supersedes only the status/evidence fields of the 85-row register**, re-verified line-by-line against `tools/els/els-code.template.html` (now 4,602 lines, up from 3,914 at the 18.8 audit), the live app (`src/lib/elsMatrices.js`, `TzofenEmbed.jsx`, `ElsWorkAreaPage.jsx`, `CipherPage.jsx`, `ElsModerationTab.jsx`), and canonical Supabase (`linswmnnkjxvweumprav`) on 2026-09-01. Every one of the 85 stable IDs from §4 keeps its original definition, family, and ID — none were renamed, merged, split, or dropped in this reconciliation.

**Do not read the 18.8 status column in §4 as current.** Read this section for current status; read §4 for what the capability *is* and its original evidence pointer.

### 12.1 Disposition counts (sum = 85, verified)

| Disposition | Count | vs. 18.8 baseline (LIVE 72 · BRANCH 2 · PARTIAL 2 · DEAD 1 · MISSING 7 · NEVER 1) |
|---|---:|---|
| LIVE/ABSORBED | 73 | +1 net (B10/B17 FORMS moved BRANCH→LIVE; A17 moved LIVE→UNKNOWN) |
| PARTIAL | 3 | C03 newly PARTIAL (was MISSING); B19/G02 unchanged |
| BUILDING | 0 | unchanged |
| PARKED | 7 | B12/B13/B14/B18 + C02/C04/C05 (maps to old DEAD(1)+MISSING(7) minus C03's upgrade) |
| SUPERSEDED | 0 | unchanged |
| NEVER | 1 | B20, unchanged |
| UNKNOWN | 1 | A17, downgraded from LIVE — no reorder mechanism found in the current 4,602-line engine despite targeted search; original audit cited no line number for this row either |
| **TOTAL** | **85** | **all 85 IDs accounted for — none disappeared** |

### 12.2 Per-family current disposition (ID-level detail; original ID/definition/evidence in §4 unchanged)

**Family A (26):** A01–A16, A18–A26 = **LIVE** (unchanged, re-confirmed live today). **A17 (manual finding reorder) = UNKNOWN** (downgraded from LIVE — see 12.1).

**Family B (20):** B01–B09, **B10 (Split/Join, 8 forms) = LIVE/ABSORBED** (upgraded from 🟡BRANCH — `FORMS` registry, `runForms`/`renderForms` confirmed absorbed into the single canonical engine on `main` today, no longer branch-only), B11, B15, B16, **B17 (spelling variants, same FORMS registry) = LIVE/ABSORBED** (same upgrade as B10) = all LIVE. **B12 (arbitrary skip series / `findAtSkips`) = PARKED** (still exactly zero call sites, re-grepped fresh today — GAP-4 fully unchanged since 18.8). **B13 (power-of-2/Fibonacci/prime skips) = PARKED**, **B14 (single-book scope) = PARKED**, **B18 (multilingual candidate derivation) = PARKED** (all three still zero implementation, correctly deprioritized, not forbidden). **B19 (letters before/after finding) = PARTIAL**, unchanged (`scanAxisLineNow` still word-level only). **B20 (approximate/mismatch search) = NEVER**, unchanged, correctly forbidden.

**Family C (5):** **C01 = LIVE.** **C02 (Finding → primary axis / Journey Trail / promote-to-axis) = PARKED** (tested, working implementation exists only on unmerged `gpt/els-research-journey-v2`; confirmed absent from `ElsWorkAreaPage.jsx` on `main` today). **C03 (Add to research case) = PARTIAL**, upgraded from MISSING — a "📌 הוסף למחקר" button now exists (`TzofenEmbed.jsx` → `elsStateToUniversalFindings` → `research_items` via `ResearchProvider`), a real capability gain since 18.8. It reaches only the workspace-membership tier: confirmed **zero** rows in `research_objects` tagged els/tzofen/cipher today — the durable/canonical tier is not reached, and the richer arbitrary-term add-finding protocol remains branch-only. **C04 (Compare findings/matrices) = PARKED**, **C05 (Challenge a finding) = PARKED** — no ELS-specific path found anywhere.

**Family D (6):** D01–D06 all **LIVE**, unchanged. D03's `SIGNIFICANT` set (49 numbers, `els-code.template.html` line ~1319) confirmed still a raw, unversioned constant — the S18 recommendation (register it as a versioned research law) remains open, unchanged since 18.8.

**Family E (10):** E01–E10 all **LIVE**, unchanged. Monte Carlo (E09) and Zone Monte Carlo (E10) both re-confirmed present and load-bearing.

**Family F (8):** F01–F08 all **LIVE**, unchanged. F03's `DICT` registry confirmed still live and still a raw unversioned constant (same S18 recommendation as D03, unchanged).

**Family G (10):** G01, G03–G10 = **LIVE** (G04/G05 — Variants/Duplicate-detection — confirmed live, correctly implemented in the host bridge `src/lib/elsMatrices.js` + `CipherPage.jsx`/`ElsModerationTab.jsx` rather than inside the iframe engine; this is the intended architectural split, not drift). G07 (Load a saved matrix) is **strengthened** versus 18.8: now a 3-tier exact-anchor-first restore (hitId → start+dir → skip-only fallback with explicit `load-error` reporting). **G02 (Anonymous save) = PARTIAL**, unchanged — the `save_els_matrix_anon` RPC exists and is live, but the client still routes anonymous users to a registration gate before save.

### 12.3 GAP-by-GAP reconciliation (original GAP-1…GAP-9, §5)

| GAP | 18.8 finding | 2026-09-01 status | Evidence |
|---|---|---|---|
| GAP-1 (stats window ≠ render window) | statistics computed on a different rectangle than what's shown/searched | **RESOLVED** | `researchGeometry(S,mainCol,mr)` (l.3313) is now the single function feeding `blockOf()` (render), the cross-search geometry, and `zoneMonteCarlo` (statistics) — verified by direct cross-reference of all three call sites in the current engine source, not by claim |
| GAP-2 (`CW` hard-coded 3×) | geometry a hidden constant | **RESOLVED** | `CW` now derived once inside `researchGeometry()`; all consumers read `_g.cw`/`b.cw` from the one function |
| GAP-3 (`ctxR` frozen) | no control mutates it | **RESOLVED** | `setCtxR()` is a real control with UI buttons (🔎−/🔎＋), invalidates dependent caches, feeds `researchGeometry()` |
| GAP-4 (`findAtSkips` unreachable) | written, zero call sites | **STILL FULLY OPEN** | re-grepped today: exactly 1 occurrence (its own definition), 0 callers — byte-for-byte the same situation as 18.8 |
| GAP-5 (`els_records` can't reproduce research state) | no geometry/version/occurrence columns | **PARTIALLY RESOLVED** | `engine_detail` jsonb column now exists and is populated for new saves (7 of 126 live rows today) with geometry/ctxR/occurrence/engineVersion/ranking/sampling. The other 119 rows (pre-fix) remain non-reproducible by design — accepted, not a live defect, no silent backfill performed or proposed |
| GAP-6 (no Worker/WASM) | every heavy capability blocks the browser | **RESOLVED** | `xfWorkers`, `findAllAdaptive`, `fwdParallel`, `crossFindMultiParallel` confirmed live (8 references) and load-bearing for full-Tanakh/cross searches |
| GAP-7 (ELS not connected to Research Bus) | `TzofenEmbed` emits no `research:add` | **PARTIALLY RESOLVED** | a "📌 הוסף למחקר" button now exists and creates real Universal Findings in `research_items`; does not reach `research_objects` (confirmed 0 rows) — see C03 |
| GAP-8 (4 dead functions) | `findAtSkips`, `buildComments`, `qualityForMatrix`, `removeFromGallery` | **STILL FULLY OPEN** | all 4 re-confirmed today with exactly zero call sites each, unchanged since 18.8 |
| GAP-9 (engine split across branches) | FORMS/`scopeRange`/State-Contract only on `claude/els-work-area` | **RESOLVED for its original scope** | FORMS/Split-Join, `scopeRange`/dispersal, and the `elsState()`/`emitState()` State-Contract all confirmed absorbed into the single canonical engine and actively consumed by `ElsWorkAreaPage.jsx` today. **Distinct newer branch-only items have since appeared** (Journey Trail/promote-to-axis/Focus-Fit on `gpt/els-research-journey-v2`; `MatrixStack3D` on `gpt/els-matrix-stack-peek-v1-clean`) — these are not the original GAP-9 items and are tracked separately (C02, and the Roadmap's 26.8.2026 PR Reconciliation Pass / Capability Preservation Ledger), not as "GAP-9 reopened" |

### 12.4 Specific named-item closures

- **D3 — Torah/Tanakh corpus identity.** `fn_els_corpus_id('torah')` and `fn_els_corpus_id('tanakh')` now return distinct, deterministic values (`0b022e8eef6f9c16` unchanged/preserved for Torah; the full untruncated sha256 of `tools/els/data/tk-letters.txt` for Tanakh). **CLOSED via PR #281** (merged to `main`, `0e286a81`). Not reopened here. B04/B05 in §4/12.2 are unaffected in reachability, only strengthened in identity soundness.
- **`els_finds`.** Confirmed live today: **exactly 1 row** (`יום משיח בא`, skip=583, dir=-1, start_pos=239480, `approved=true`, created 2026-06-16) — not 0. No current code path in `src/` or the engine reads or writes this table. **Disposition: PARKED, explicitly NOT retired** — a single approved, named, human-reviewed finding with real provenance must not be silently dropped from any future consolidation without an explicit decision on where that one row's provenance goes. This is a decision item, not a cleanup item.
- **`SIGNIFICANT`/`DICT` (S18).** Both confirmed still live, unchanged, still raw unversioned editorial constants embedded in the engine. Registering them as versioned research laws remains open, correctly classified as an extension point, not a Foundation blocker.

### 12.5 Foundation Gate — ELS domain only

# **ELS FOUNDATION SUFFICIENT**

`MUST FOUNDATION NOW = 0` **for the ELS capability domain specifically.** All genuinely Foundation-level risks that existed at the 18.8 audit — the geometry/render/statistics split (GAP-1/2/3), the two-engine-line split (GAP-9, original scope), the no-Worker performance ceiling (GAP-6), and the Torah/Tanakh corpus identity collision (D3) — are confirmed resolved at the code/DB level, not merely claimed. Everything still open (C02/C04/C05, Journey Trail/promote-to-axis/Focus-Fit UI, `MatrixStack3D`, GAP-4/GAP-8 dead code, B12/B13/B14/B18 unbuilt search modes, S18 unversioned constants, `els_finds`'s single-row provenance decision) is Projection, Experience, or governance-hygiene tier: none require a schema, identity-model, or data-migration change to add later.

**This verdict is domain-specific to ELS and does not declare the SOD1820 project, Research Studio v1, or any other workstream ready to leave Foundation.** It sits alongside — and does not supersede or generalize — the separately-closed `WS-CROSS-ENGINE`, Raziel, and Clean Traffic Classification Foundation Expansion Gates (`SOD1820_MASTER_STATE.md` §23.21–§23.23). Each Foundation-domain closure is independent; none of them together constitute a project-wide Foundation→Projection transition, which remains a separate decision reserved for ZURIEL.

### 12.6 Top remaining capabilities (ranked, unchanged from the completed reconciliation report)

1. GAP-4 → B12/B13 (`findAtSkips` entry point) — **highest value-per-cost, but explicitly NOT the next action per Human-Gate direction; remains an EXTENSION POINT / Projection capability, not scheduled here.**
2. C02 (Finding → primary axis / Journey Trail) — real, tested implementation exists on `gpt/els-research-journey-v2`; reconciliation, not fresh build.
3. S18 — register `SIGNIFICANT`/`DICT` as versioned research laws.
4. C03 completion — reach `research_objects`.
5. `els_finds`'s single row — decide its provenance destination.

None of the above is authorized for implementation by this closure. This section records priority for a future, separately-gated Projection-phase decision.

### 12.7 What this reconciliation did not do

No code was changed, no schema was changed, no migration was drafted or applied, no engine/UI/DB behavior changed, `findAtSkips` was not implemented, the Journey branch was not merged, `MatrixStack3D` was not merged, no capability was promoted to `research_objects`, and no capability was retired. This is a documentation/state-reconciliation closure at the Foundation level only.

**Provenance:** `work_log actor=CLAUDE task=ELS_85_CAPABILITY_LIVE_RECONCILIATION` (READ-ONLY pass, 2026-09-01) → `task=ELS_85_CAPABILITY_CANONICAL_CLOSURE` (this closure, docs-only, 2026-09-01). Cross-referenced against `docs/els-capability-workarea-unification.md` (disposition vocabulary, unchanged) and `SOD1820_MASTER_ROADMAP.md` `WS-ELS-CAPABILITY-AUDIT` / `SOD1820_MASTER_STATE.md` §23.24.

## 13. RESEARCH V1 BASELINE RECONCILIATION — 2026-10-20

**Exact code baseline:** `gpt/2029-unified-session-handoff-20261019` at
`f19f7cfcb5530d9632c99d345c22c8b0124b6292`.

**Live read boundary:** canonical Supabase project `linswmnnkjxvweumprav`, queried through
`sod1820_supabase_readonly`; no DB, RLS, permission, migration, `research_objects` or
`decision_ledger` write was made. The active
`SOD1820_2029_PERF_WAVE4_INTEGRATION_20261018` integration ownership remains a separate hard
boundary: none of its eight performance commits is part of this baseline.

This section supersedes the §12 status fields only. IDs, definitions and historical evidence in
§4 remain unchanged. A capability is `LIVE/ABSORBED` when a reachable current path exists;
`PARTIAL` when current primitives exist but the complete user contract does not; `PARKED` when
the capability is intentionally absent from the current runtime; and `NEVER` when it remains
forbidden. Existing data is evidence of current state, not authorization to mutate it.

### 13.1 Current disposition counts (sum = 85)

| Disposition | Count | Change from §12 |
|---|---:|---|
| LIVE/ABSORBED | 75 | +2: A17 is reachable in Native Classic; C03 reaches the existing Universal Workspace |
| PARTIAL | 5 | B19, C02, C04, C05, G02 |
| BUILDING | 0 | no row is hidden behind an unbounded “building” claim |
| PARKED | 4 | B12, B13, B14, B18 |
| SUPERSEDED | 0 | unchanged |
| NEVER | 1 | B20 |
| UNKNOWN | 0 | A17 resolved by a current reachable control path |
| **TOTAL** | **85** | **all stable IDs retained** |

### 13.2 ID-level current disposition

**Family A — Matrix & display (26):** A01–A26 = **LIVE/ABSORBED**. A17 is no longer
UNKNOWN: the public native findings rail exposes `move-up` / `move-down`, and the canonical
engine owns the ordered mutation. A20 still means the existing presentation tilt of one matrix;
it does **not** claim full spatial 3D.

**Family B — Search (20):** B01–B11, B15–B17 = **LIVE/ABSORBED**. B10/B17 consume the
canonical `FORMS` preview/plan path; B11 remains the existing window-local transform family.
B12/B13/B14/B18 = **PARKED**. B12/B13 are explicitly outside Research v1; B14 still has no
single-book execution scope; B18 still has no governed multilingual corpus adapter. B19 =
**PARTIAL**: source/line inspection is reachable, but the defined raw before/after-letter action
is not a complete standalone capability. B20 = **NEVER**.

**Family C — Finding actions (5):** C01 and C03 = **LIVE/ABSORBED**. C03 uses the existing
Universal Finding → Universal Workspace path and exact snapshot reference; it does not require a
new ELS store. C02 = **PARTIAL** on this exact baseline: `buildJourneyPromotion`,
`buildJourneyRestore`, engine exact-load/error handling and saved-Finding exact reopen exist, but
there is no public Finding → primary-axis trigger with an exact return control. C04 = **PARTIAL**:
bounded 2–4-term comparison returns separately labelled outcomes through the canonical page
adapter, but there is no side-by-side matrix comparison contract. C05 = **PARTIAL**: deterministic
seeded controls + FDR utilities and tests exist, but no complete public Challenge action exists.

**Family D — Occurrence & proximity (6):** D01–D06 = **LIVE/ABSORBED**.

**Family E — Ranking, statistics & verification (10):** E01–E10 = **LIVE/ABSORBED as
capabilities**. E09/E10 remain legacy exploratory Monte-Carlo presentation and are not
research-grade confirmation authority because their historical randomness is not replayable.
The newer seeded-control utility does not silently upgrade those labels or activate a public
Challenge flow.

**Family F — Candidate generators (8):** F01–F08 = **LIVE/ABSORBED**. They remain candidate
generators only and do not promote Truth, Canonical or Published state.

**Family G — Save/share/research case (10):** G01, G03–G10 = **LIVE/ABSORBED**. G02 =
**PARTIAL**: the live `save_els_matrix_anon` RPC and legacy anonymous path exist, while the native
Research private-save path deliberately requires an authenticated owner. This is an access-path
difference, not permission to change RLS or lifecycle semantics.

### 13.3 Live DB calibration (read-only)

Observed on 2026-10-20:

- `els_records`: **135** total; **24** with `start_index`; **27** with `corpus_id`; **17** with
  `engine_detail`; **127** with a `positions.findings` envelope.
- `els_finds`: **1** total / **1** approved; provenance remains parked, not deleted or migrated.
- existing ELS-linked rows: **1** in `research_items`, **10** in `research_objects`. These counts
  correct §12's old zero-row observation; Research v1 neither writes nor redesigns either table.
- live callable boundary includes `els_search_core_v1`, `els_search_page_v1`,
  `els_verify_batch_v1`, `els_verify_occurrence_v1`, `fn_els_corpus_id`, save/update/moderation RPCs
  and their internal/core counterparts. Availability does not itself prove every projection is
  complete.

### 13.4 Research v1 delta after this baseline

The only capability promoted by the next implementation stage is C02: a user-initiated verified
Finding becomes the primary axis through the existing exact-load path, and an exact return restores
the previous axis. B12/B13, full 3D, new persistence, `research_objects`, RLS/permissions,
production migrations and `decision_ledger` remain out of scope. The public profile cutover is an
Experience projection over the same mounted engine/state: Research defaults light, Classic remains
available, and profile entry itself performs no search, scan, controls/nulls or AI call.

## 14. RESEARCH V1 BRANCH-ONLY CLOSURE — 2026-10-20

**Candidate status:** `IMPLEMENTED + TESTED + branch-only PR_READY` on
`gpt/els-research-v1-closure-20261020`. This is review readiness only: no PR was opened, no merge,
Preview, deployment, feature-flag, live DB or Production action was performed.

### 14.1 Capability delta and invariant closure

- C02 is now **LIVE/ABSORBED** on this branch. A verified, currently displayed Finding occurrence
  can become the primary axis through the existing `load-matrix` contract. An explicit selected
  occurrence fails closed if its engine-owned `hitId` is not present in the Finding's shown set.
- Exact return is declared complete only after the engine has restored the original axis, term,
  scope, geometry, window profile, view settings, Finding order/colors and exact shown occurrences.
  The intermediate engine tick in which the axis is ready but Finding verification is still pending
  is not exposed as a completed return.
- The post-implementation 85-capability disposition is therefore **76 LIVE/ABSORBED + 4 PARTIAL
  (B19/C04/C05/G02) + 4 PARKED (B12/B13/B14/B18) + 1 NEVER (B20) = 85**.
- Research is the public default as a light 2D profile. Advanced tools start closed and perform no
  search/verification on entry. Classic is always reachable. The profile switch changes only the
  projection: the same mounted engine and state object retain axis, Findings, source/geometry,
  selection, Journey and Research Context; it performs no replay, search or AI call.
- No engine, state store, graph, Raziel surface, table or persistence tier was added. B12/B13, full
  3D, `research_objects`, RLS/permission changes, Production migrations and `decision_ledger`
  remain untouched.

### 14.2 Acceptance and regression evidence

All browser suites below were run serially with executable Chromium so Vite fixtures did not share
optimizer state:

- full Research v1 chain, in one browser test: canonical search → batch verification → matrix →
  Finding → source verses → private save → Universal Workspace add → exact reopen from the stored
  Journey snapshot → C02 promote/exact return → existing Raziel surface; opening Raziel emitted no
  automatic AI call;
- `test/els-native-ui-browser.test.mjs`: **36/36 pass**, including the chain above, C02, private-save
  privacy/race cases, widths 320/390/1440, touch targets and the `light` / `parchment` / `dark`
  palettes;
- `test/els-browser-cutover.test.mjs`: **26/26 pass** with the canonical verification oracle;
- `test/els-advanced-page-browser.test.mjs`: **1/1 pass**; entry produced zero advanced calls,
  explicit-open worked, and an exact load plus advanced form state survived a Classic round-trip
  without remounting the engine;
- `test/els-forms-preview-browser.test.mjs`: **1/1 pass**, with no search emitted by preview;
- non-browser ELS suite excluding the Wave4-owned artifact tests: **164 pass / 0 fail / 3 skip**;
  the three skips require a local PostgreSQL executable and are not product-code failures;
- privacy, Universal Finding, exact-reopen and Raziel boundary slice: **36/36 pass**;
- both production build targets passed (`legacy`, `2029`), followed by the 2029 bundle budget:
  **5/5 pass**. The existing unrelated large-chunk warnings remain warnings, not new ELS failures.

Bundle measurement uses the exact frozen base in a detached temporary worktree with the same
dependency installation:

| ELS 2029 route asset | exact base `f19f7cfc` | Research v1 candidate | delta |
|---|---:|---:|---:|
| JavaScript, raw | 167.92 kB | 172.97 kB | +5.05 kB (+3.01%) |
| JavaScript, gzip | 51.03 kB | 52.59 kB | +1.56 kB (+3.06%) |
| CSS, raw / gzip | 58.61 / 9.05 kB | 58.61 / 9.05 kB | 0 / 0 kB |

### 14.3 Wave4 ownership gate and test boundary

The final read-only `work_log_current` check still reports
`SOD1820_2029_PERF_WAVE4_INTEGRATION_20261018` as
`BEFORE_PASSIVE_ACTIVE_INTEGRATION_WRITER`, with exclusive integration branch/worktree/evidence
scope. Consequently **none** of the eight commits from
`gpt/perf-els-verse-payload-hardening-20261018` was integrated or copied. The three tests whose
source/artifact synchronization belongs to that wave—`els-browser-truth-census`,
`els-reference-presentation` and `els-verse-payload-defer`—remain outside this branch's admissible
write/test closure until that ownership is released or transferred. Running the generator would
rewrite the owned `tools/els`/`public/tzofen*` artifacts, so it was deliberately not used as a
workaround.

### 14.4 Branch provenance and passive status transfer

- `7895adc7` — 85-capability/live-DB baseline reconciliation;
- `868faadf` — light public Research, lossless Classic profile and C02 exact Journey;
- `ef5db7f0` — end-to-end browser acceptance chain plus mobile/theme/privacy coverage reuse.

The available Supabase connector is read-only, so it cannot append an `AFTER` row. The coordinator
may record this passive handoff as
`AFTER_BRANCH_ONLY_IMPLEMENTED_TESTED_PR_READY_SCOPE_RELEASED_PASSIVE`, explicitly retaining the
Wave4 exclusion above. This documentation transfer is not a DB mutation or release authorization.

## 15. WAVE4 RELEASE + RESEARCH V1 FINAL BRANCH CLOSURE — 2026-10-20

This section is additive and supersedes only the temporary ownership exclusion in §14.3. The
historical observation there was correct when it was recorded.

### 15.1 Live release and targeted eight-commit reconciliation

The read-only `work_log_current` recheck observed a newer row for
`SOD1820_2029_PERF_WAVE4_INTEGRATION_20261018` at `2026-10-20 08:50:05.087397+00`:
`AFTER_BRANCH_ONLY_SCOPE_RELEASED_BY_ZURIEL_HOLD`, with `RELEASED. No active writer scope retained`.
Its release authorization remains `NOT_AUTHORIZED`, so this release permitted branch-only scope
reconciliation but did not authorize a merge, PR, Preview, deployment or Production action.

The exact eight source commits on `gpt/perf-els-verse-payload-hardening-20261018` were already
present in the frozen Research base as patch-equivalent commits. All mapped commits are ancestors
of `f19f7cfcb5530d9632c99d345c22c8b0124b6292`; duplicate or empty cherry-picks were therefore not
created:

| Wave4 source | Equivalent commit in the frozen base | Change |
|---|---|---|
| `df10b4aa` | `e54014e0` | defer verse display payload |
| `4e8dcebb` | `6a664b48` | record payload evidence |
| `693892c1` | `563e17db` | harden verse payload artifacts |
| `7c512b11` | `1e8e437d` | record hardening evidence |
| `2119ad49` | `110efc04` | harden publication boundaries |
| `ba3bb64e` | `8cb9311f` | record publication evidence |
| `a3b09f01` | `d303739a` | close publication races |
| `ee139e63` | `28912385` | record race-safe evidence |

The path-level collision review found one later base commit, `0bf0e634`, that preserved the public
Legacy route but replaced the hardened Wave4 generator with an older 75-line generator. The first
deterministic build-sync test correctly failed at that boundary. With explicit user approval,
`a502efb6` reconciles both contracts: it restores the Wave4 validation, content-addressed payload,
atomic writes, cross-process lock, no-clobber external output and failure/race behavior, while
generating `public/tzofen-standalone.html` from the same template, corpus and render under the same
lock. The Legacy surface remains read-only, disables persistence and uses only the bounded offline
verification adapter; it does not add a discovery engine, state/store, graph or Raziel surface.

### 15.2 Final acceptance

- deterministic truth/build census: **9/9 pass**, now covering both public artifacts;
- Wave4 payload/path/failure/concurrency plus executable Chromium: **4/4 pass**;
- shared source-reference presentation: **2/2 pass**;
- broad non-browser ELS suite: **164 pass / 0 fail / 3 skip**; all skips are the unchanged local
  PostgreSQL-unavailable cases and this closure made no DB change;
- canonical browser cutover: **26/26 pass**;
- light Research entry + FORMS preview: **2/2 pass**;
- full native browser acceptance: **36/36 pass**, including search → verify → matrix → Finding →
  source → private save → Universal Workspace → exact reopen → C02 primary-axis promotion → exact
  return → existing Raziel; widths 320/390/1440 and light/parchment/dark all passed;
- privacy and Universal Finding supplemental slice: **23/23 pass**;
- `npm run build`: both `legacy` and `2029` production targets passed;
- `npm run test:2029-bundle-budget`: **5/5 pass**, entry graph 9 chunks / 174.1 KB gzip.

### 15.3 Before/after measurements

The original Wave3 → Wave4 hosted saving remains the reviewed performance result: hosted
`tzofen.html` moved from **2,489,355 B raw / 1,625,009 B gzip** to
**1,587,178 B raw / 944,225 B gzip**, a reduction of **902,177 B raw / 680,784 B gzip
(41.89%)**. Reconciliation preserved that artifact byte-for-byte.

| Artifact | Exact base `f19f7cfc` | Final candidate | Delta |
|---|---:|---:|---:|
| hosted `tzofen.html`, raw / gzip | 1,587,178 / 944,225 B | 1,587,178 / 944,225 B | 0 / 0 B |
| deferred verse asset, stored | 677,655 B | 677,655 B | 0 B |
| public Legacy standalone, raw / gzip | 2,490,605 / 1,625,901 B | 2,493,497 / 1,627,911 B | +2,892 / +2,010 B |
| ELS 2029 route JS, raw / gzip | 167.92 / 51.03 kB | 172.97 / 52.59 kB | +5.05 / +1.56 kB |
| ELS 2029 route CSS, raw / gzip | 58.61 / 9.05 kB | 58.61 / 9.05 kB | 0 / 0 kB |

The route delta is the Research v1 implementation already recorded in §14.2; the Wave4/Legacy
reconciliation changes no application `src/` file and adds no further route-bundle cost. Current
SHA-256 identities are `16b44c5b…` for hosted HTML, `13d17191…` for the deferred gzip payload and
`24ec449e…` for the generated public Legacy artifact.

### 15.4 Final branch-only state

The 85-capability disposition remains **76 LIVE/ABSORBED + 4 PARTIAL + 4 PARKED + 1 NEVER = 85**.
B12/B13, full 3D, `research_objects`, RLS/permissions, Production migrations and
`decision_ledger` were not implemented or changed. The candidate is
`IMPLEMENTED + TESTED + branch-only PR_READY`; no merge, PR, Preview, deployment, feature-flag,
live DB or Production action is part of this closure.

## 16. DYNAMIC TORAH-LANGUAGE CANDIDATE LEXICON — 2026-10-23

**Branch-only extension:** the explicit “nearby findings with continuation” and same-axis
continuation actions now consume `els_dynamic_candidate_lexicon_v1` inside the existing canonical
engine. The historical 85-term `DICT` remains a stable governed seed, but is no longer the complete
vocabulary presented as “all nearby findings”. On the first explicit scan only, the engine derives
a non-authoritative lexical cache from:

- canonical verse-display text for the active scope (Torah or Tanakh);
- the active verified axis and Findings;
- the already-visible public saved-matrix projection supplied through the existing library path.

No corpus payload is loaded on Research entry, ordinary search or profile switching. The derived
cache is not a store, graph, engine, learned truth or persistence tier. A lexical match remains
`CANDIDATE`; adding it still uses the existing canonical verification operation before it can become
a Finding. Private records are not made public: the engine can consume only records already exposed
to that viewer by the existing host/RLS read path. Failure to load verse text falls back visibly to
the governed/research terms and marks coverage partial.

The dynamic discovery projection is **Research-only**. Classic keeps manual matrix search and may
read the exact letters/source of a selected axis, but it sends no scan flag, does not load the corpus
lexicon and does not expose the bulk “nearby findings with continuation” action. This is a profile
boundary over the same mounted canonical engine, not a fork of engine or state.

Research discovery also applies `els_research_candidate_ranking_v1`. This is an explainable
**inspection-priority** contract, not a “strong finding” or Truth score. The bounded scan first
preserves verified Findings, visible research terms and the governed core instead of letting rare
corpus forms fill the cap. The displayed list remains ordered by exact distance to the primary axis;
only equal-distance ties use governed/research evidence, continuation count and corpus support.
Every reason is shown to the user, and canonical verification is still required before addition.

Measured vocabulary before candidate filtering: **85** historical seeds → **11,400** distinct
Torah-native terms of four letters or more, or **37,253** for full Tanakh, plus visible verified
research terms. Thus `אליהו` remains covered by the governed seed and corpus, `יבואו` is learned
from the canonical Tanakh language, and a contextual form such as `תשעו` can enter from a verified
active/public research Finding without hard-coding it globally.

This extends the existing F03/F-family candidate generators and active
`els_research_layer_law v9` `S2_DYNAMIC_LEXICON`; it does not add or renumber a capability. The
85-capability disposition therefore remains **76 LIVE/ABSORBED + 4 PARTIAL + 4 PARKED + 1 NEVER**.
B12/B13, approximate search, automatic truth promotion, `research_objects`, DB/RLS/permissions,
full 3D and Raziel implementation remain out of this delta.

Acceptance on the branch is green: 201 relevant Node tests passed with three isolated PostgreSQL
fixtures skipped because no local PostgreSQL service was available; the complete browser passes were
26/26 cutover and 41/41 native UI, with mobile flow, privacy fail-closed behavior and all three color
presets covered, plus 6/6 advanced/forms/deferred-payload checks. Both production builds and the 2029
bundle budget passed. Against `ac39b5ba`, each generated ELS HTML gained 6,381 raw bytes; gzip deltas
were +2,145 bytes for `tzofen.html` and +1,896 bytes for the standalone artifact. No Preview,
Production, database, RLS or permission action was performed.

## 17. RESEARCH STRUCTURAL PRIORITY PROJECTION — 2026-10-23

`els_structural_priority_scan_v1` is an explicit, Research-only projection over the existing
displayed-window candidate scan. It gives parallel families first inspection priority, then literal
axis intersections, then skips already classified by the existing `notable()` rules; exact distance
is considered after governed/visible verified research evidence inside the same structural class.
Exact and diagonal parallels belong to the same top class, so existing verified research evidence
can surface a known parallel before unrelated corpus noise without turning that evidence into proof.
It does not replace the normal
`els_research_candidate_ranking_v1` distance order, and the UI labels the result as inspection
priority rather than strength, proof or Truth.

Opening Research or the `מבנים` panel performs no scan. The dynamic lexicon and structural
projection run only after `סרוק מבנים בעדיפות`, return candidates without cell coordinates, and
route `אמת והוסף` through the existing canonical Finding verification. The same panel provides the
existing exact axis-continuation action; it creates no engine, state, store, graph or persisted law.

This absorbs the presentation/ranking use of existing E07 geometry and D03 notable-skip metadata.
It deliberately does **not** implement B12/B13 or registered skip-family search, does not change the
85-capability count, and does not add Raziel, schema, RLS, permission or Production behavior.

Branch acceptance is green: 186 focused Node contract tests passed with three isolated PostgreSQL
fixtures skipped because no local PostgreSQL service was available; browser acceptance passed 26/26
canonical cutover, 42/42 native UI (including mobile, privacy and all three palettes), and 6/6
Advanced/FORMS/deferred-payload checks. Both production build targets and the 5/5 2029 bundle budget
passed. Deterministic level-9 comparison measurements against branch head `20b9258e` are:

| Artifact | Before | Structural projection | Delta |
|---|---:|---:|---:|
| hosted `tzofen.html`, raw / gzip | 1,597,255 / 951,754 B | 1,602,419 / 953,063 B | +5,164 / +1,309 B |
| Legacy standalone, raw / gzip | 2,503,574 / 1,639,016 B | 2,508,738 / 1,640,371 B | +5,164 / +1,355 B |
| ELS 2029 route JS, raw / gzip | 190,813 / 56,597 B | 196,040 / 57,744 B | +5,227 / +1,147 B |
| ELS 2029 route CSS, raw / gzip | 67,611 / 10,190 B | 70,779 / 10,505 B | +3,168 / +315 B |

No Preview, Production, database, RLS, permission, merge or PR action was performed.

## 18. BOUNDED STRUCTURE SCAN PLANS — 2026-10-23

`els_structure_scan_plan_v1` turns the existing Research structural projection into one bounded,
declarative scan instead of a sequence of term-by-term actions. The user can select a quick, broad
or deep preset, then optionally declare minimum/maximum word length, maximum distance from the
primary axis, minimum group size and any combination of four result families:

- parallel axes;
- a corridor bounded by the primary axis and a parallel axis, including candidates between them;
- literal intersections with the primary axis;
- local candidate clusters.

The normalized engine boundary clamps length to **3–16 letters**, distance to **4–120 displayed
cells**, minimum group size to **2–6**, output to **12 groups** and each group to **10 members**.
Opening the panel, changing a preset or editing a setting performs no work; only the explicit scan
button invokes the already-mounted canonical engine. The scan uses the existing bounded displayed
window and dynamic candidate lexicon. It neither opens a new skip-family search nor implements
B12/B13.

Results are ordered and presented as structure groups, without exposing engine coordinates. One
`אמת והצג קבוצה` action sends the group's new terms through the existing canonical Findings batch
update. Every term must still pass canonical verification before display; membership in a proposed
group never creates a Finding, proof, score or Truth. No group store, graph, second engine or new
Research state was added. Classic remains unchanged and available over the same mounted engine.

Branch acceptance is green: the focused contract suite completed **187 pass / 0 fail / 3 skip**
(the three unchanged skips require local PostgreSQL), canonical browser cutover passed **26/26**,
the complete native browser suite passed **42/42**, and Advanced/FORMS/deferred-payload checks
passed **6/6**. Both production build targets passed, as did the **5/5** 2029 bundle budget. Mobile,
privacy, exact axis identity and all three palettes are included in those browser suites.

Deterministic level-9 comparison measurements against `fff25f03` are:

| Artifact | Before | Structure plans | Delta |
|---|---:|---:|---:|
| hosted `tzofen.html`, raw / gzip | 1,602,419 / 953,063 B | 1,608,908 / 954,935 B | +6,489 / +1,872 B |
| Legacy standalone, raw / gzip | 2,508,738 / 1,640,371 B | 2,515,227 / 1,642,313 B | +6,489 / +1,942 B |
| ELS 2029 route JS, raw / gzip | 196,040 / 57,744 B | 200,458 / 59,005 B | +4,418 / +1,261 B |
| ELS 2029 route CSS, raw / gzip | 70,779 / 10,505 B | 74,648 / 10,903 B | +3,869 / +398 B |

The 85-capability disposition remains **76 LIVE/ABSORBED + 4 PARTIAL + 4 PARKED + 1 NEVER**.
No Preview, Production, database, RLS, permission, merge or PR action was performed.

## 19. REPEATED MOTIFS AND RESPONSIVE RESEARCH GUIDANCE — 2026-10-23

The bounded Research structure plan now includes `motif` as an additive result family. The
`els_repeated_motif_projection_v1` projection identifies the same literal normalized term on two or
more distinct axes inside the already-displayed matrix window. Distinct occurrences remain separate
for inspection, while one `אמת והצג קבוצה` action sends the term only once through the existing
canonical Finding verifier. After verification, `פתח את הממצא החוזר` opens that same Finding so the
researcher can move between its verified occurrences and inspect each axis continuation. The
projection exposes occurrence order, direction, skip and distance required by the existing Research
UI, but does not expose cell arrays, starts or coordinates across the host boundary.

Every structure family now includes deterministic `למה לבדוק` and `הצעד הבא` guidance. These are
bounded inspection instructions, not an AI judgment, statistical strength, proof or Truth score.
Repeated motifs are therefore presented as a reason to compare occurrences and their source/axis
continuations, not as evidence that a narrative interpretation is correct. Existing parallel,
corridor, intersection and cluster behavior remains available in the same scan.

The explicit structure scan uses the same canonical `scanCandidates` implementation in yielded
batches. It reports completed/total lexical work to the existing host UI, keeps touch and cancel
controls responsive, and suppresses a late result after cancellation or axis replacement. Progress
messages correlate only the local `nativeSeq`; they repeat neither `hitId` nor coordinates. Opening
Research, opening the structures panel, choosing a preset and changing settings still perform no
scan. Classic remains unchanged and always available over the same mounted engine and state.

Acceptance on the branch is green after the final privacy classification: **265 pass / 0 fail / 3
skip** across the ELS test files (the three unchanged skips require local PostgreSQL), **26/26**
canonical browser cutover, and **42/42** native UI including mobile, all three palettes, private-save
isolation, exact axis preservation and the full Research v1 journey. The repeated-motif browser
scenario additionally proves live progress, canonical verification, opening the existing Finding
and mid-scan cancellation without a stale result. Both production build targets passed, and the
2029 bundle budget passed **5/5** with entry **9 chunks / 174.1 KB gzip**.

Deterministic level-9 measurements against `088ba31f` are:

| Artifact | Before | Repeated motifs + guidance | Delta |
|---|---:|---:|---:|
| hosted `tzofen.html`, raw / gzip | 1,609,470 / 955,074 B | 1,613,166 / 956,134 B | +3,696 / +1,060 B |
| Legacy standalone, raw / gzip | 2,515,789 / 1,642,387 B | 2,519,485 / 1,643,505 B | +3,696 / +1,118 B |

This extends the existing Research projection and does not add or renumber a capability. The
85-capability disposition remains **76 LIVE/ABSORBED + 4 PARTIAL + 4 PARKED + 1 NEVER**; C05 remains
partial and no significance/FDR claim is introduced. B12/B13, full 3D, `research_objects`, Raziel
implementation, schema/data changes, RLS/permissions, Production migrations and `decision_ledger`
remain outside this delta. No Preview, Production, database, RLS, permission, merge or PR action was
performed.
