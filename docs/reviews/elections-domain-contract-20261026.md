# Elections Domain Contract 2029 — reconciliation and branch-only pilot

Date: 2026-10-26

Branch: `gpt/system-self-model-contract-20261026`

State: branch-only research candidate; no canonical write, publication, flag change or deployment

## Outcome

The elections topic now has one non-visual domain contract that can feed World, Topic, Post,
Number, Person, Gallery, Search, Journey and Raziel without creating another graph, truth store,
research context or UI model.

The first compiled pilot covers the two Israeli election systems currently in scope:

1. Knesset 21 / 2019 — official result inputs, deterministic threshold/gap derivations and the
   historical Bennett/New Right gallery set.
2. Knesset 26 / 2026 — election date, current name/party/list mapping, existing site posts and the
   current numeric research set. No election result is invented before a sourced result exists.

The pilot contains 49 stable entity projections, 15 source-provenance records, 16 sourced facts,
14 versioned calculations/derivations, 8 attributed interpretations, 20 proposed relation candidates and 38
Universal Findings in the existing Research Result Bundle path.

## Existing contracts reused

| Concern | Existing owner | What this implementation does |
|---|---|---|
| Entity identity and relations | `reality_graph_law` | Keeps stable refs and relation candidates; never writes `nodes` or `edges` |
| Epistemic, verification, governance and publication axes | `truth_axes_foundation_law` | Keeps the four evidence lanes separate and leaves interpretations Human-Gate pending |
| Research context and Result Bundle | `research_workspace_law` | Reuses Universal Finding and the existing Research Result Bundle; no fourth research store |
| Research planning | `research_strategy_layer_law` | Gives Raziel the same context pack and evidence ids used by other consumers |
| Raziel behavior | `raziel_companion_layer_law` | Allows explanation and suggestions; denies canonical promotion and publication |
| Availability | `site_flags_lock_law` | Does not add or change a flag |
| Access | `platform_tiers_law` | Every source/evidence record declares its access tier; the current seed is public-only |
| Personal reality | `person_foundation_contract_law` | Carries no personal/user data and does not enter Personal Reality without authorization |
| Presentation | Design Contract V2 + System Frame | Carries no layout, style, component, color, motion, 3D or renderer instruction |

This is the domain companion to `src/lib/systemSelfModel2029.js`. The System Self-Model describes
what a surface is and which canonical rails it participates in; this elections contract carries the
truth-safe research payload. Neither one takes ownership from the systems above.

## Four lanes — never collapsed

| Lane | Meaning | Examples in the pilot |
|---|---|---|
| `source_provenance` | Where a statement or artifact came from | CEC result page, election timeline, reported list index, site posts, six gallery files |
| `source_fact` | What that source states or contains | 4,309,270 valid votes; 138,598 New Right votes; date; list membership; numbers seen in an image/post |
| `engine_calculation` | A versioned engine result or deterministic derivation | 140,052 threshold and 1,454 gap derived from official inputs; דוד=14, גאולה=45, אליהו=52, חותם=454, תמי=450, the 631 cluster, שרשר=1000, עופר וינטר במילוי=1820 |
| `interpretation` | An attributed reading over earlier evidence | 45↔54, 140,052→140\|052, 1,454→14\|54 or 1\|454, scale links to 1,400/4,500 |

An official source is not automatically an engine calculation. An engine result is not an
interpretation. An interpretation never becomes an official fact because several numbers converge.

## Names and election mapping

| Person | Election/list projection | Numeric evidence kept separately |
|---|---|---|
| נפתלי בנט | 2019 New Right historical branch; 2026 ביחד / ballot רק | standard 631 |
| עופר וינטר | 2026 עמך ישראל / ballot ך | standard 631; milui 1820 |
| איתן שוילי | 2026 שרשר לאהבה ואחדות העם / ballot צדק | שרשר=1000 |
| תמר (תמי) שוילי | reported as Eitan Shvili's wife and number 2 on the Sharshar list | תמי=450 |
| בנימין נתניהו | 2026 Likud / ballot מחל | נס נתניהו=631 |

The political/list statements retain their source ids. The gematria values retain their engine,
method and version. They meet only through proposed relations whose evidence remains inspectable.

## Web source spot-check — 2026-10-26

The five external pages used for the primary pilot returned HTTP 200 during the final check. The
rendered source material exposed the following bounded evidence:

- the Knesset 21 official results page labels itself “final official results” and shows 4,309,270
  valid votes and 138,598 votes for New Right;
- the official Knesset 26 timeline shows 27 October 2026;
- the reported Knesset 26 list index states that 38 lists were approved and contains the Bennett,
  Winter, Netanyahu, Beyahad, Amcha Israel and Sharshar mappings used by the seed;
- the Sharshar page names Tami, and the reported profile identifies Tami as number 2 on the list;
- the Amcha Israel party site was reachable.

The values 140,052 and 1,454 are therefore modeled as deterministic derivations over the official
Knesset 21 inputs, not misrepresented as literal text scraped from the official page.

## One Tree and Raziel handoff

`compileElectionsDomainBundle()` returns the immutable shared bundle. It includes indexes by lane,
entity, source, election cycle and number, plus one governed Research Result Bundle.

`projectElectionsDomainForConsumer()` returns the same refs and evidence ids to every consumer. It
does not render or locally recompute anything. The seed exports
`ELECTIONS_ISRAEL_21_26_RAZIEL_CONTEXT`, which is the ready-to-adopt Raziel handoff with these
explicit limits:

- may explain connections and label the evidence lanes;
- may suggest the next research action;
- must preserve attribution;
- may not promote a claim to canonical state;
- may not publish;
- may not perform local arithmetic.

This means Raziel and the visible tree can speak about the same research object without Raziel
becoming a second source of truth.

## Historical gallery reconciliation

The six located files are represented as sources and media entities:

- `byat-mshych-1237.jpg`
- `mkvnyt-4.5.jpg`
- `14000-bnt.jpg`
- `bnt-14.jpg`
- `bnt-14.png`
- `mndtym.jpg`

The first five retain their existing gallery/node refs. `mndtym.jpg` retains its gallery identity
without pretending that a graph node already exists. Numbers observed in OCR/source text remain
historical-source facts; the exact 1,454 gap derived from the official inputs is kept separate from
the rounded “about 1,400” wording in the archive.

## What was deliberately not changed

- no database or migration write;
- no `nodes`, `edges`, Research Object or publication write;
- no route, feature flag, sitemap or availability change;
- no World, Topic, Raziel, Personal Area or System Frame component change;
- no visual design, CSS, 3D scene or Claude-owned presentation file;
- no United States/Trump data yet — that remains the next election-cycle extension to the same
  contract, not a new tree.

## Safe adoption chain

1. Central migration session registers the eventual elections surfaces in the System Self-Model;
   it does not copy this domain data into the registry.
2. World/Topic session consumes the shared projection and removes equivalent hard-coded truth from
   its presentation layer.
3. Raziel session imports the exported context pack through its existing strategy/companion rail.
4. Personal Area consumes only an explicitly authorized projection if a personal journey requires
   it; the public election seed itself contains no personal data.
5. Claude receives the stable DTO and Design V2/System Frame constraints for the final visual
   interface. A later 3D renderer consumes the same ids and lanes without changing domain truth.
6. Human Gate decides which proposed relations, if any, become canonical Graph edges or published
   content.

## Acceptance evidence

- focused domain and System Self-Model tests pass;
- invalid source refs, missing engine versions, dangling evidence, duplicate ids, UI payloads and
  canonicalization claims fail closed;
- output is deeply immutable;
- all consumers receive the same entity/source/evidence identity set;
- Raziel's handoff denies promotion and publishing authority.
