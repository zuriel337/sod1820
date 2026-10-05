# SOD1820 — 2029 PUBLIC BETA EVIDENCE LEARNING PLAN v1

**Date:** 2026-10-06  
**Status:** PROGRAM / ANALYTICS + PRODUCT-LEARNING MAP · HUMAN-GATE CONTROLLED  
**Scope:** Legacy evidence baseline → G4/Public Beta → G5 product decisions → G6 international evidence.  
**Owner direction:** extend existing Traffic Intelligence / Analytics / Control Plane owners; do not create a second analytics truth system.

## 1. Why this exists

The Legacy/current site already contains enough first-party evidence to improve 2029 before and after Public Cutover. The goal is not merely to count visits. The goal is to learn:

- which users are plausibly human vs bot/AI/automation;
- what people actually search for and calculate;
- which surfaces/paths attract, engage or lose them;
- where they come from;
- which countries/devices/locales behave differently;
- which journeys lead to search, save, share, signup, return and later paid entitlement;
- what changes after a release, experiment or product decision;
- which system recommendations are supported by data rather than intuition.

Analytics remains evidence, not semantic truth and not authorization.

## 2. Current read-only baseline · 2026-10-06

### Data already available

Current first-party stores include approximately:

- `site_visits`: 344k+ visit rows;
- `visitor_events`: 423k+ behavioral rows;
- `page_views`: 92k+ rows;
- `search_log`: 86k+ internal searches;
- `user_activity`: 18k+ authenticated activity rows;
- `legacy_traffic`: imported Jetpack/WordPress historical traffic;
- `traffic_history`: long-term historical rollups, including monthly history back to 2015;
- `traffic_daily`: first-party human/suspected-session rollup;
- `edge_geo_log`: country + Edge classification evidence for browser/goodbot/AI/bot;
- monthly `events_YYYY_MM` partitions for detailed session/event correlation.

Raw behavioral telemetry is already bounded to the existing 120-day retention policy; long-term trend evidence stays in rollups/history.

### Bot vs human-like evidence

Bot classification in `site_visits` begins on **2026-08-04**; earlier zero-bot periods must not be read as proof of clean human traffic.

From the point that classifier is present:

- since first bot classification: 261,155 visits; 188,426 bot-labelled = **72.2%**; 72,729 non-bot-labelled;
- last 30 days: 190,601 visits; 154,785 bot-labelled = **81.2%**;
- last 7 days: 69,640 visits; 60,014 bot-labelled = **86.2%**.

This is visit-level heuristic classification, not proof of a person.

The canonical two-layer Traffic Intelligence view is more useful:

**Last 7 days**
- Edge: 289,133 request hits;
- browser: 26,670;
- goodbot + AI + bot: 262,463 = **90.8% of Edge hits**;
- first-party after-JS/session layer: 2,575 raw sessions;
- human-like net: 2,569;
- suspected automation: 6;
- human-like share of first-party sessions: **99.8%**.

**Last 30 days**
- Edge: 751,782 hits;
- browser: 139,410;
- goodbot + AI + bot: 612,372 = **81.5% of Edge hits**;
- first-party: 15,407 raw sessions;
- human-like net: 10,885;
- suspected automation: 4,522;
- human-like share: **70.6%**.

These two layers are deliberately different units: Edge request pressure vs after-JS first-party sessions. Never add or compare them as if they were the same denominator.

Recent 7-day first-party human-like sessions are concentrated in Israel (2,064), followed by US (190), unknown country (187), with SG only 20 and no suspected SG sessions in that exact recent window. This supports using the post-quarantine window as a cleaner behavioral baseline while still treating `human-like` as heuristic, not identity proof.

### Acquisition / bounce evidence · last 30 days

Human-like session evidence currently shows:

- direct: 6,298 sessions; ~12.4% bounce;
- Google: 4,256; ~39.4% bounce;
- Facebook: 159; ~60.4% bounce;
- referral: 71; ~7.0% bounce;
- ChatGPT: 41; ~24.4% bounce;
- WhatsApp-tagged: 37; ~45.9% bounce.

Device split:
- desktop: 5,728 human-like sessions; ~16.3% bounce;
- mobile: 5,159; ~32.4% bounce.

These are product signals, not permanent truths; instrumentation/classification changes must be marked on the timeline.

### Internal search baseline

`search_log` currently contains 86,404 recorded searches from 2026-06-16 onward:

- Hebrew-script searches: 57,595;
- numeric searches: 28,809;
- Latin-script searches recorded in this table: **0**.

Do **not** conclude “there is no English demand.” The correct conclusion is: this specific internal-search logger has no Latin-script evidence. English demand must also be measured from Search Console/GA4/referrers, locale/routes and future 2029 search telemetry.

Examples of heavily repeated Legacy/current internal terms include `מערב`, `גאולה`, `1820`, `358`, `משיח`, `776`, `1237`, `26`, `541`, `86`. These are useful prioritization evidence, not automatic editorial ranking.

## 3. Measurement identity: never collapse Human/Bot/Unknown

Use explicit layers:

1. **EDGE_GOODBOT** — allowed known search/AI crawler where classified;
2. **EDGE_AI** — public AI crawler/agent traffic where classified;
3. **EDGE_BADBOT** — blocked/hostile/generic bot classification;
4. **EDGE_BROWSER_UNKNOWN** — browser-like request; not Human proof;
5. **FIRST_PARTY_SUSPECTED** — JS/session-level automation heuristic;
6. **FIRST_PARTY_HUMAN_LIKE** — non-suspected first-party session; still not identity proof;
7. **AUTHENTICATED_USER** — authenticated principal; stronger identity, still separate from engagement;
8. **ENGAGED_HUMAN_SIGNAL** — session with meaningful multi-view/interaction/dwell/search/save/share etc.

A quarantine/JS proof may move a request through an abuse gate; it never upgrades the request to Human.

## 4. One evidence envelope across 2029

Every meaningful 2029 interaction should correlate, where applicable:

- timestamp + release/deployed SHA;
- session/visitor/principal-safe reference;
- surface: Home / World / Topic / Post / Book/Source / Number / ELS / Journey / Community / Workspace / Raziel;
- canonical entity/subject;
- capability/action;
- Research Context / trace / interaction id;
- acquisition source/referrer/campaign/share intent;
- country;
- device/browser class;
- locale;
- auth/access tier;
- traffic class;
- experiment/variant;
- success/failure/fallback;
- latency/cost/query/egress attributes for expensive work;
- downstream product signals: save/share/follow/signup/return/payment later.

No page-local analytics schema may become a competing truth.

## 5. Time axes

The Control Plane must support:

### Operational
- last 5 minutes;
- 1 hour;
- 6/24 hours.

### Product
- calendar day;
- week;
- month;
- year;
- rolling 7/30/90 days.

### Learning
- exact pre-release vs post-release windows keyed to deployed SHA;
- experiment A/B or phased rollout;
- first-seen/signup cohorts;
- return/retention windows;
- weekday/weekend and Israel day-context overlays where relevant;
- holiday/Shabbat context as annotation, not a causal conclusion.

Historical metrics must disclose instrumentation/classifier changes so a graph never pretends that incompatible periods are directly equivalent.

## 6. Public Beta Evidence Window

After required G4 Goldens + Pre-Cutover Security Gate + ZURIEL Cutover Human Gate:

**Open 2029 as Public Beta and measure before locking G5 product economics.**

Default evidence window:
- at least **two full weekly cycles (~14 days)**;
- extend when the window is dominated by holidays, exceptional bot waves, instrumentation changes or insufficient traffic;
- G5 architecture may continue, but final Free/Registered/Premium/Credits allocation should consume this evidence window.

Minimum questions before G5 allocation:

- which surfaces are entered vs actually used;
- top internal searches / numbers / ELS intents / Raziel tools;
- save/share/follow/signup/return rates;
- mobile vs desktop friction;
- top acquisition channels and their engagement/return quality;
- where users abandon journeys;
- expensive capability usage and cost per useful outcome;
- which user intents repeatedly hit BUILDING/unavailable states;
- authenticated vs anonymous retention;
- abuse/bot pressure by route/capability;
- which features show repeated demand strong enough to justify Premium/Credits.

## 7. Governed self-learning loop

The system may learn from itself only through an evidence-to-recommendation loop:

`OBSERVE → AGGREGATE → COMPARE → DETECT → RECOMMEND → HUMAN/OWNER DECIDE → EXPERIMENT/CHANGE → MEASURE → KEEP/REVERT`

Examples of allowed recommendations:

- “mobile bounce on Post increased after SHA X”;
- “Number searches for a cluster increased 3× over 30d”;
- “users repeatedly reach a BUILDING capability from World”;
- “Google traffic reaches a page but rarely continues to research”;
- “a Raziel tool is expensive and produces low save/return signals”;
- “English/Latin demand is visible in GSC but absent from internal search instrumentation”;
- “SG Unknown fell after quarantine while goodbot remained stable.”

Analytics may **not** automatically:

- change canonical truth/ranking;
- publish content;
- change pricing or entitlement;
- block a country;
- alter strict levels, Turnstile, ASN/datacenter filters or rate limits;
- grant credits;
- change DB/RLS/grants;
- retire a route/source/engine;
- declare a person/bot identity.

Those changes route to existing owners and Human Gates.

## 7.5 Surface coverage law for present + future 2029

The evidence rail is not complete if it covers only routes that happen to exist today.

Every surface/capability that reaches OPEN/Golden/Public must inherit the shared Launch Contract from `docs/2029-control-plane-attention-observability-plan-v1.md`.

Coverage inventory includes both current and planned surfaces:

- Home / Global Now;
- World;
- Posts / Post;
- Topic / Convergence;
- Books / Sources;
- Number / Expression;
- Gematria / Calculator;
- ELS / Cipher;
- Cipher Library + Cipher detail;
- Heichal;
- Journey;
- Search / Command / Resolve;
- Archive;
- Video / Media;
- Community;
- Workspace / Personal Area;
- public Person/User/Contributor pages;
- Auth / Onboarding;
- Researcher / Research Room / Dossier;
- Raziel + tool executions;
- Follow / Attention / Notifications;
- Credits / Premium / Entitlements;
- future Voice / Audio / Spatial / XR.

A not-yet-built surface may be registered as BUILDING with an expected owner/route family and no invented metrics. Once implementation starts, launch acceptance must prove the common evidence envelope before OPEN/Golden.

## 8. Control Plane projection

Add one unified Evidence / Analytics projection to the internal Control Plane, reusing owner-native data.

Required filters:

- time axis / custom comparison window;
- Legacy vs 2029;
- surface/capability;
- acquisition source;
- country;
- device;
- locale;
- traffic class;
- anonymous/authenticated/access tier;
- release SHA / before-after;
- experiment.

Required views:

- Human-like vs Unknown vs bot/goodbot/AI composition;
- visitors/sessions/views;
- engagement/bounce/dwell/scroll;
- journey funnels;
- internal search, number and cipher intent;
- retention/return;
- saves/shares/follows/signups;
- errors/fallback/unavailable;
- performance/cost/egress;
- release-SHA before/after;
- Google Web / Discover / Image / Video / News / Google News where the source exposes data;
- GA4 + first-party + Vercel Web Analytics trend comparison without denominator merging;
- Clarity qualitative drill-out for session/heatmap evidence;
- per-surface instrumentation coverage / missing-signal state;
- Attention inbox + recommendation queue with owner/evidence links.

The Control Plane is a projection, not a new analytics owner/store.

## 9. Legacy → 2029 learning use

Use Legacy/current evidence to shape 2029:

- preserve historically strong content/search intents;
- identify high-entry / high-bounce pages requiring better orientation;
- prioritize mobile because its bounce is materially higher in the current first-party window;
- preserve discoverability from Google while improving onward research journeys;
- distinguish old SEO landing traffic from intentional 2029 product navigation;
- use numeric/Hebrew search patterns to seed Number/Search affordances;
- do not assume missing English internal searches mean no English market;
- carry historical traffic only as baseline/provenance, never as a requirement to recreate Legacy UX.

## 10. Data-source expansion

The first-party DB already supports the core loop. External evidence should extend, not replace, it.

Current/target expansion:

- GA4 remains the quantitative external usage/acquisition source;
- Search Console daily sync must expose Search-type identity rather than only the default Web slice: Web plus Discover/Image/Video/News/Google News where Google returns data;
- Microsoft Clarity should initialize on the isolated 2029 runtime as well as Legacy/current runtime, while remaining a qualitative external evidence source rather than a product store;
- Vercel Web Analytics may be shown as an independent comparison source when its server credential is configured;
- Web Vitals/RUM remains first-party 2029 performance evidence;
- external source unavailability/configuration gaps are visible in Control Plane, never converted to zero.

External analytics remain evidence sources, not canonical product state.

## 11. Acceptance before calling the system “learning”

The lane is complete enough for Public Beta when:

- every core public surface emits the common envelope or a mapped compatible projection;
- traffic-class denominators are explicit;
- day/week/month/year + release-window comparison works;
- the Control Plane can answer one end-to-end question from acquisition → surface → capability → outcome;
- recommendations link to evidence and confidence/window;
- no recommendation can mutate production without the applicable owner/Human Gate;
- raw-retention limits and long-term rollups are preserved;
- one pre/post release experiment can be replayed and independently recomputed.
