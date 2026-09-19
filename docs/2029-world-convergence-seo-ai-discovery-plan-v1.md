# SOD1820 — WORLD / CONVERGENCE SEO + AI DISCOVERY PLAN V1

**Status:** PLANNING / NAVIGATION · PARTIAL LIVE EXECUTION · Human-Gate direction approved by ZURIEL 2026-09-19  
**Mode:** EXTEND_EXISTING · no new SEO registry, Feed Store, Topic Store, AI truth store or parallel graph  
**Canonical project:** `linswmnnkjxvweumprav`  
**Primary owners consumed:** Experience Governance v7 · Research Workspace v4 · Research Strategy v15 · Reality Graph v8 · Truth Axes v3 · existing route/SEO/applySeo/sitemap owners

This document is an execution map. It does not replace active owners or authorize canonicalization/publication by itself.

---

## 1. Product / identity model

The public tree is:

```
World = discovery / breadth / freshness / navigation
  ↓
Convergence = stable public research identity
  canonical URL: /topic/:slug
  public label: התכנסות
  ↓
Number / Expression = exact numeric/detail home
Book / Source / Witness = source home
Researcher / Person = attribution lens
Heichal = deep action/research
Journey = path continuity
Raziel = contextual AI companion
```

### Locked invariants

- Internal storage/compatibility may continue to use `topic_cards`, `topic`, and `convergence`.
- Human-facing Hebrew uses **התכנסות / התכנסויות**.
- `/topic/:slug` remains the canonical public address unless a future explicit Human-Gate URL migration is approved after inbound/SEO audit.
- World may show the same Convergence in many contexts; it does not mint a second URL/identity.
- World discovery, Number, Researcher and Source projections link to the same Convergence identity.
- Convergence != Fact != Canonical Interpretation.
- Ranking/freshness/prominence never upgrades truth.

---

## 2. Current live baseline / DRIFT

Verified 2026-09-19:

- World 2029 Discovery entrance is LIVE on main.
- `/world` has page-level `applySeo({ path: "/world" })`.
- `/world` is now in the canonical sitemap STATIC list (released via PR #555).
- `/topic/:slug` is Class A in the route/SEO matrix.
- canonical sitemap already emits approved `topic_cards_public` as `/topic/:slug`.
- `topic_cards_public` currently contains **205** public Topics/Convergences.
- App2029 does not yet own a native `/topic/:slug` renderer; that canonical address still survives through LegacyDocumentHandoff.
- `lock_convergence_tree` was re-verified as the availability owner for the retired legacy `/numbers` Convergence Tree surface. Canonical `/topic/:slug` does not consume that flag and remains a separate public Topic identity route.
- Therefore `sitemap-public` removing only `/numbers` is consistent with the live route boundary; Topic URLs must not be removed merely because the old tree is locked.

These are migration/SEO parity gaps, not permission to change canonical URLs or bulk-deindex existing public content.

---

## 3. NOW — SEO parity and safety foundation

Beit Midrash public convergence routing is already retired LIVE. Do the remaining items before retiring the Legacy Topic renderer behind `/topic/:slug`.

### N1 — World sitemap admission — DONE / LIVE

Released via PR #555: `/world` is now in the existing sitemap owner as the public discovery/product hub.

Acceptance:
- one canonical URL: `https://sod1820.co.il/world`;
- page canonical, sitemap URL and OG URL agree;
- no duplicate `/2029/world` or query-state canonical identity;
- sitemap lastmod/changefreq is bounded and meaningful.

### N2 — Convergence capability-aware sitemap parity — RESOLVED / NO TOPIC CHANGE

Live verification corrected an earlier assumption:
- `lock_convergence_tree` governs the legacy `/numbers` tree.
- Canonical `/topic/:slug` does not consume that flag.
- `sitemap-public` removing only `/numbers` is therefore aligned with the current capability boundary.

Do **not** remove `/topic/*` from sitemap based on `lock_convergence_tree`. If Topic availability later gets its own owner-backed capability state, sitemap projection must consume that same state then — not before.

### N3 — Preserve /topic/:slug while native replacement is missing

Do **not** delete/redirect Legacy Topic rendering yet.

Gate:
```
native Topic 2029 renderer
+ canonical/meta parity
+ structured-data parity
+ sitemap parity
+ OG/share parity
+ bot/no-side-effect parity
+ real-browser acceptance
= Legacy Topic renderer eligible for retirement
```

### N4 — Indexability audit before changing policy

Current public != automatically future indexable, but existing indexability is SEO history.

### Census result — 2026-09-19

Live `topic_cards_public` baseline:
- 205 total;
- 0 empty titles;
- 0 without Numbers;
- 0 duplicate normalized-title groups;
- 172 without subtitle;
- 199 object-shaped `findings`;
- 198 with `caveat`;
- 187 with `hint`;
- 100 with `phrases` and source-style authored content;
- 16 with images;
- 10 with explicit `occurred_at`.

Implication: subtitle/image absence is **not** enough to classify a page as thin. Most semantic body material lives in source-authored `findings`, so Search admission must inspect meaningful authored content/provenance, not metadata completeness alone.

Before any bulk noindex/index change:
- census all public Topics;
- detect thin/duplicate/near-duplicate pages;
- identify source-backed vs weak/synthetic pages;
- identify inbound/search traffic if available;
- preserve currently valuable indexed URLs by default;
- propose an index-admission rule separately;
- Human Gate approves any bulk deindex policy.

No meter_score-only admission.

---

## 4. NEXT — Native Convergence 2029

Build the new renderer at the **same canonical address**:

`/topic/:slug`

### Required human-first structure

1. H1 — Convergence title.
2. concise answer: “מה ההתכנסות הזאת?”
3. “למה הדברים האלה מתכנסים כאן?”
4. key Numbers / Expressions.
5. Findings / calculations.
6. verification state where owner-backed.
7. sources / witnesses / locators.
8. people / attribution.
9. related Convergences.
10. open questions / unresolved material where public-safe.
11. actions: Number / Source / World / Raziel / Heichal / Journey.

The default public opening must be readable prose and semantic HTML, not a research dashboard.

### Crawlable identity links

Public stable identities use real links where an address exists:
- `/topic/:slug`
- `/number/:phrase`
- `/book/:slug`
- approved researcher route

Research Context can enhance transitions, but must not replace crawlable public links.

### Legacy Topic compatibility

Storage identity and old field names are compatibility details. Do not rename tables merely for UI vocabulary.

---

## 5. NEXT — Search indexability contract for Convergences

Create one bounded Search admission decision under the existing SEO owner.

Candidate dimensions for audit/testing:
- stable canonical Convergence identity;
- meaningful title/summary/body;
- sufficient unique public content;
- source/evidence coverage;
- duplicate/thin-content detection;
- publication/access state;
- no autogenerated empty shells;
- canonical source/internal-link usefulness.

Explicit non-signals:
- meter_score alone;
- raw count alone;
- AI generation alone;
- graph proximity alone;
- being public alone.

Possible states are representation/SEO decisions, not Truth states:
- public + index;
- public + noindex,follow.

Do not introduce a second governance enum/table just for SEO.

---

## 6. NEXT — SEO / structured representation

Every native Convergence page should consume the existing SEO primitives and provide:

- title;
- human description;
- canonical URL;
- robots decision;
- datePublished/dateModified only when semantically valid;
- OG/share representation;
- representative image only when owner-backed;
- BreadcrumbList;
- WebPage/Article-like structured representation only when schema semantics truly fit;
- author/contributor only when attribution is proven;
- `isPartOf` SOD1820 / World relationship.

Structured data must not claim a Finding is a Fact.

---

## 7. NEXT — AI-readable without “AI SEO pages”

One public truth, multiple representations.

### Semantic content blocks

The page should expose machine-readable structure corresponding to the visible content:

- canonical identity;
- concise summary;
- entities/Numbers/Expressions;
- Findings;
- calculations/methods;
- verification;
- sources/provenance;
- attribution;
- unresolved questions;
- related Convergences.

AI/search consumers must be able to distinguish:

`Calculation ≠ Finding ≠ Claim ≠ Source Attestation ≠ Interpretation ≠ Canonical Fact`.

### No hidden alternate AI truth

Do not create:
- AI-only Topic text;
- separate AI Convergence database;
- “LLM facts” store;
- machine-only canonical interpretation.

If a machine representation exists, it projects the same owner-backed material.

---

## 8. LATER — Public machine projection / agents

After native Topic + Search admission + provenance parity are proven, add a bounded read-only public representation if justified.

Candidate:
`/api/public/topic/:slug`

It may expose:
- canonical_url;
- identity;
- summary;
- public Findings;
- source refs + human labels;
- verification/governance/publication distinctions;
- related canonical identities;
- modified timestamp.

Requirements:
- same access/publication gates as the page;
- no privileged payload;
- no new truth owner;
- cache/version semantics;
- crawler reads cause no user/research side effects.

---

## 9. LATER — Feeds / freshness / AI discovery

World “מה חדש” should eventually drive reusable public discovery outputs from the same public events/data, not parallel stores:

- RSS;
- JSON Feed;
- optional IndexNow/publishing notification if still useful;
- bounded public “latest Convergences” endpoint.

One meaningful public update may project to:
World freshness → Topic lastmod → sitemap/feed update.

Do not update lastmod on ordinary render/page view.

---

## 10. LATER — multilingual / hreflang

Sequence:

`Hebrew canonical source → English Golden Locale → parity acceptance → additional locales`

Rules:
- same Convergence identity across locales;
- translation is representation, not copied truth;
- language-specific Expressions/calculations retain their own provenance;
- hreflang only when a real localized representation exists;
- no fake alternate URLs for untranslated content.

---

## 11. World as SEO + AI discovery hub

`/world` is a public discovery/product hub, not the canonical URL for each contained identity.

Its semantic/crawlable content should include bounded sections such as:
- latest public Convergences;
- Numbers;
- Books/Sources;
- researchers;
- journeys.

Spatial presentation is additive. DOM/static semantic fallback remains usable for humans, search crawlers and accessibility.

World internal links should expose the canonical identity graph without claiming graph proximity is evidence.

---

## 12. Legacy / Beit Midrash disposition

### PUBLIC BEIT MIDRASH — DONE / LIVE

PR #555 completed the deliberate public cutover:
- `/beit-midrash` → permanent redirect to `/world`;
- `/beit-midrash/*` → permanent redirect to `/world`;
- legacy calculator query intents resolve to `/gematria`;
- `/beit-midrash` removed from sitemap and `/world` admitted;
- public navigation/internal convergence links moved to World.

### PRESERVED

The cutover did **not** delete or rename:
- `topic_cards` / `topic_cards_public`;
- Convergence nodes/edges;
- research provenance;
- `/topic/:slug`;
- source/contributor relationships;
- calculator capability.

### TEMPORARY INTERNAL COMPATIBILITY

Legacy implementation may remain internally for calculator compatibility until the native calculator path fully replaces it. It is not a public Convergence home.

### LEGACY TOPIC RENDERER — KEEP UNTIL PARITY

The remaining Legacy dependency is the renderer behind canonical `/topic/:slug`. It retires only after the native 2029 Topic renderer has canonical/meta/robots/sitemap/OG/structured-data/browser parity.

---

## 13. Execution order

### NOW
1. planning/docs locked and live-state reconciled;
2. **DONE:** `/world` sitemap admission + public Beit-Midrash→World cutover;
3. **DONE / clarified:** no Topic sitemap filtering under the legacy `lock_convergence_tree` flag;
4. **DONE:** public Topic census baseline;
5. **IN PROGRESS:** native Topic 2029 renderer + exact-head acceptance (PR #557).

### NEXT
6. native `/topic/:slug`;
7. canonical/meta/robots/OG/structured-data parity;
8. crawlable internal-link graph;
9. Search indexability contract;
10. Legacy Topic renderer retirement after parity.

### LATER
11. public machine projection/API if justified;
12. RSS/JSON Feed/IndexNow-style freshness;
13. English Golden + hreflang;
14. broader agent discovery;
15. post-migration cleanup/retirement of remaining internal calculator compatibility after native replacement.

---

## 14. Acceptance gates

A Convergence/Topic migration is not complete until all apply:

- identity parity;
- canonical URL parity;
- access/publication parity;
- title/description parity or deliberate improvement;
- robots/indexability explicit;
- sitemap parity;
- OG/share parity;
- structured-data validity;
- provenance/source distinctions preserved;
- semantic HTML / accessible fallback;
- bot read has no side effects;
- World → Topic → Number/Source/Researcher links work;
- exact-return Research Context still works for humans;
- rich/medium/sparse Topic fixtures;
- duplicate/thin-content controls;
- mobile/desktop/reduced-motion/browser acceptance;
- no Legacy deletion before replacement proof.

---

## 15. Human-Gate decisions

### HG-1 — Existing 205 public Topic URLs

**Recommended default:** preserve their current public/indexable behavior during migration; run the census first. Do not bulk-deindex existing URLs merely because a new admission policy is being designed.

Human Gate needed before any bulk noindex/deindex operation.

### HG-2 — /beit-midrash SEO routes — RESOLVED / LIVE

ZURIEL authorized immediate simplification. PR #555 permanently redirects the public Beit Midrash route family to World while preserving Topic identities/data and calculator intent. No further Human-Gate decision is needed for that public route cutover.

### HG-3 — Public machine endpoint / feed

Recommended: defer implementation until the native Topic renderer and indexability contract are proven. Architecture is preserved now; no new endpoint required for the first SEO release.
