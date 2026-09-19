import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildWorldContextualProminence,
  classifyWorldPresentationDensity,
  explainWorldRelation,
  filterWorldRelations,
  orderWorldRelations,
  worldDensityCounts,
  worldProjectionCounts,
  worldRelationCounterpart,
  worldRelationFacets,
} from "../src/lib/research/world2029Presentation.js";
import { numberAnchorToUniversalFinding } from "../src/lib/research/numberAnchorFinding.js";
import {
  WORLD_APPROVED_CONTRIBUTOR_SLUGS,
  buildWorldContributorLens,
  buildWorldLandingContributorProjection,
  contributionTouchesWorldAnchor,
} from "../src/lib/research/worldContributorLens.js";
import {
  GOLDEN_WORLD_JOURNEY_878,
  projectGoldenJourney878,
} from "../src/lib/research/worldJourneyProjection.js";
import {
  WORLD_RESEARCH_ATTENTION,
  WORLD_RESEARCH_FILTER_DEFAULTS,
  buildWorldResearchControl,
  filterWorldResearchFindings,
  researchFindingAxes,
} from "../src/lib/research/worldResearchControl.js";
import { buildWorldDiscoveryStream, topicRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { buildTopicListQuery } from "../src/lib/research/topicConvergence.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const world = read("src/pages/World2029Page.jsx");
const app = read("src/App2029.jsx");
const legacyApp = read("src/App.jsx");
const sitemapSource = read("api/sitemap.js");
const vercelConfig = JSON.parse(read("vercel.json"));
const experienceContext = read("src/lib/experienceContext.js");
const graphAdapter = read("src/lib/research/entityGraphFinding.js");
const adminMigration = read("supabase/migrations/20260917191500_world_admin_graph_read_v1.sql");
const prominenceHelper = read("src/lib/research/worldContextualProminence.js");
const prominenceInputs = read("src/lib/research/worldProminenceInputs.js");
const entityHubProjection = read("src/lib/research/entityHubProjection.js");
const worldCss = read("src/pages/world2029-human.css");
const contributorLensSource = read("src/lib/research/worldContributorLens.js");
const worldJourneySource = read("src/lib/research/worldJourneyProjection.js");

// Beit Midrash public cutover: World owns discovery; Topic canonical URLs survive.
assert.match(sitemapSource, /loc:\s*'\/world'/, "World must be admitted to the canonical sitemap");
assert.equal(sitemapSource.includes("loc: '/beit-midrash'"), false, "retired Beit Midrash must not remain in sitemap");
assert.match(sitemapSource, /\/topic\//, "canonical Topic/Convergence URLs must remain in sitemap");
const legacyRedirects = Array.isArray(vercelConfig.redirects) ? vercelConfig.redirects : [];
assert.equal(legacyRedirects.some((r) => r.source === "/beit-midrash" && r.destination === "/world" && r.permanent === true && !r.has), true);
assert.equal(legacyRedirects.some((r) => r.source === "/beit-midrash/(.*)" && r.destination === "/world" && r.permanent === true), true);
assert.equal(legacyRedirects.some((r) => r.source === "/beit-midrash" && r.destination === "/gematria" && r.has?.some?.((h) => h.type === "query" && h.key === "tab" && h.value === "calc")), true);
assert.match(legacyApp, /path="\/beit-midrash" element=\{<Navigate to="\/world" replace \/>\}/);
assert.match(legacyApp, /path="\/beit-midrash\/:method" element=\{<Navigate to="\/world" replace \/>\}/);

// World is content inside the one shared Frame, not its own shell/control system.
assert.match(world, /FrameState/);
assert.match(world, /use2029Shell/);
assert.match(world, /shell\.openCommand\(\)/);
assert.match(world, /shell\.openAttention\(\)/);
assert.equal(world.includes("shell.openRaziel()"), false);
assert.equal(world.includes('to="/heichal"'), false);
assert.equal(world.includes("shareOrCopy"), false);
assert.equal(world.includes("NumberDrawer"), false);
assert.equal(world.includes("AskRaziel"), false);
assert.equal(world.includes("UserCenter"), false);
assert.equal(world.includes('status="LIVE"'), false);
assert.match(world, /status="עולם · גילוי"/);

// Landing World Core replaces the decorative orbit with real, accessible navigation over
// the already-loaded landing facets. It owns no new taxonomy/data and keeps motion optional.
assert.match(world, /function WorldCoreMap/);
assert.match(world, /aria-label="לב העולם"/);
assert.match(world, /aria-label="פתח חיפוש בעולם"/);
assert.match(world, /onSearch=\{\(\) => shell\.openCommand\(\)\}/);
assert.match(world, /aria-controls=\{landingSectionId\(facet\.key\)\}/);
assert.match(world, /section\.scrollIntoView/);
assert.match(world, /בחר שער כדי לקפוץ ישר אליו/);
assert.match(world, /חוקרים וכתבים/);
assert.match(world, /מסע 878/);
assert.match(world, /התכנסות היא מקום שבו כמה ביטויים/);
assert.equal(world.includes("מפגש"), false, "2029 World public convergence vocabulary must not fall back to meeting labels");
assert.match(world, /התכנסויות לפי חוקר/);
assert.equal(world.includes('className="sod29-orbit-map"'), false, "World landing must not keep the old decorative-only orbit map");
assert.match(worldCss, /sod29-world-core-map/);
assert.match(worldCss, /sod29-world-core-ring/);
assert.match(worldCss, /@media\(prefers-reduced-motion:reduce\)[\s\S]*sod29-world-core-ring\{animation:none!important\}/);
assert.match(world, /מה חדש בעולם\?/);
assert.match(world, /sod29-world-live-stream/);
assert.match(world, /sod29-world-spatial-gateway/);
assert.match(worldCss, /sod29-world-discovery-entrance/);
assert.match(worldCss, /sod29-world-stream-list/);
assert.match(world, /sod29-world-all-convergences/);
assert.match(world, /כל ההתכנסויות/);
assert.match(world, /ALL_CONVERGENCES_PAGE_SIZE = 24/);
assert.match(world, /fetchTopicCreatorOptions/);
assert.match(world, /includeTotal: true/);
assert.match(world, /loadMoreConvergences/);
assert.match(world, /to=\{card\.href\}/);
assert.match(worldCss, /sod29-world-catalog-grid/);
assert.match(worldCss, /sod29-world-catalog-card/);
const creatorQuery = buildTopicListQuery({ creator: "צבי (OPOC)", q: "1820", limit: 24, offset: 24 });
assert.equal(creatorQuery.creator, "צבי (OPOC)");
assert.equal(creatorQuery.search, "1820");
assert.equal(creatorQuery.rangeStart, 24);


const discoveryFixture = buildWorldDiscoveryStream([
  { id: "a", slug: "a", title: "חדש א", created_by: "AI", approved_at: "2026-09-19T12:00:00Z", numbers: [888] },
  { id: "b", slug: "b", title: "חדש ב", created_by: "צבי", approved_at: "2026-09-19T13:00:00Z", numbers: [1020] },
  { id: "c", slug: "c", title: "חדש ג", created_by: "מנוע · זהב אחר", approved_at: "2026-09-18T13:00:00Z", numbers: [358] },
  { id: "d", slug: "d", title: "חדש ד", created_by: "שם לא מאושר", approved_at: "2026-09-17T13:00:00Z", numbers: [777] },
], {
  limit: 10,
  publicPeople: [{ displayName: "צבי (OPOC)", aliases: ["צבי"] }],
});
assert.deepEqual(discoveryFixture.items.map((item) => item.label), ["חדש ב", "חדש א", "חדש ג", "חדש ד"]);
assert.deepEqual(discoveryFixture.creators, ["AI", "צבי (OPOC)", "מנוע · זהב אחר", "מקור ציבורי"]);
assert.equal(topicRowToWorldUpdate({ id: "x", title: "X", created_by: "AI" }).creator, "AI");
assert.equal(topicRowToWorldUpdate({ id: "y", title: "Y", created_by: "שם לא מאושר" }).creator, "מקור ציבורי");
assert.equal(discoveryFixture.note.includes("truth rank"), true);

// World Research Control Plane extends existing Truth/Research axes instead of inventing a store or status vocabulary.
assert.match(world, /WORLD RESEARCH CONTROL/);
assert.match(world, /RESEARCH INBOX/);
assert.match(world, /מצב מחקר/);
assert.match(world, /מצב ממשל/);
assert.match(world, /Processing state עדיין לא מחובר/);
assert.match(world, /Publication state עדיין לא מחובר/);
assert.match(world, /privacy_scope=public_candidate אינו Published/);
assert.match(world, /WORLD_RESEARCH_ATTENTION/);
assert.match(world, /filterWorldResearchFindings/);
assert.match(worldCss, /sod29-world-research-control/);
assert.match(worldCss, /sod29-world-research-filters/);

const controlFindings = [
  {
    id: "private-candidate",
    status: "candidate",
    access: { tier: "private" },
    verification: { verification_state: "not_tested" },
    projection: { dimensions: { researchObjectKind: "observation" } },
    source: { sourceRef: "chat:1" },
  },
  {
    id: "public-approved",
    status: "approved",
    access: { tier: "public_candidate" },
    verification: { verification_state: "match" },
    projection: { dimensions: { researchObjectKind: "relation" } },
  },
  {
    id: "canonical-private",
    status: "canonical",
    access: { tier: "private" },
    verification: { verification_state: null },
    projection: { dimensions: { researchObjectKind: "fact" } },
  },
];
assert.deepEqual(researchFindingAxes(controlFindings[0]), {
  kind: "observation", access: "private", governance: "candidate", verification: "not_tested",
});
const control = buildWorldResearchControl(controlFindings);
assert.equal(control.total, 3);
assert.equal(control.byAccess.private, 2);
assert.equal(control.byGovernance.approved, 1);
assert.equal(control.attention.needs_verification, 2);
assert.equal(control.attention.public_candidate, 1);
assert.equal(control.capabilities.processingState, false, "World must not invent raw→processed without Research Intake projection");
assert.equal(control.capabilities.publicationState, false, "public_candidate is not Published");
assert.equal(control.capabilities.rawSource, true);
assert.equal(filterWorldResearchFindings(controlFindings, { ...WORLD_RESEARCH_FILTER_DEFAULTS, attention: "approved" }).length, 1);
assert.equal(filterWorldResearchFindings(controlFindings, { ...WORLD_RESEARCH_FILTER_DEFAULTS, access: "private" }).length, 2);
assert.equal(WORLD_RESEARCH_ATTENTION.public_candidate.label, "מועמד לציבור");

// 2029 World owns orientation, not the legacy Number UI. Number remains a separate product home.
assert.match(world, /WORLD_LANES/);
assert.match(world, /מה אתה רוצה לראות עכשיו\?/);
assert.match(world, /פרופיל עוגן · אוצרות מחקרית מתפתחת/);
assert.match(world, /דף המספר נשאר הבית הייעודי לחישוב ולביטוי/);
assert.match(world, /לדף המספר ←/);
assert.equal(world.includes("getNumberAnchor"), false, "World must not revive the legacy Number-page anchor reader");
assert.equal(world.includes("NumberHubOpening2029"), false, "World must not import/copy the Number-page UI");
assert.equal(world.includes("מרכז העולם"), false, "anchored World must not repeat the same identity in a second center section");
assert.equal(world.includes("sod29-world-stage"), false, "legacy-looking duplicate anchor stage must stay removed from the 2029 hierarchy");
assert.equal(world.includes("sod29-anchor-core"), false, "anchor identity must not be rendered twice before the profile");
assert.equal(world.includes("sod29-orbit-metrics"), false, "availability counts belong to orientation lanes, not a competing metrics block");
assert.match(world, /מתחילים במהות, ואז בוחרים את השכבה/);
for (const lane of ["overview", "media", "calculations", "sources", "relations", "research", "timeline"]) {
  assert.match(world, new RegExp(`activeLane === ["']${lane}["']|key: ["']${lane}["']`), `World orientation lane missing: ${lane}`);
}

// Anchor Profile is consumed through the 2029 Entity projection + existing Universal Finding adapter.
assert.match(entityHubProjection, /numberAnchorToUniversalFinding/);
assert.match(entityHubProjection, /from\("number_anchors"\)/);
assert.match(entityHubProjection, /anchorProfile/);
const anchorFinding = numberAnchorToUniversalFinding({
  value: 1820,
  category: "יסודות",
  fact: "1820 = עוגן",
  hint: "הקשר מחקרי",
  created_at: "2026-09-01T00:00:00Z",
});
assert.equal(anchorFinding.source.sourceRef, "number_anchors:1820");
assert.equal(anchorFinding.projection.dimensions.legacyNumberAnchor.semanticBoundary, "curated-context-not-verified-fact");
assert.equal(anchorFinding.projection.dimensions.legacyNumberAnchor.fact, "1820 = עוגן");

// Media projection consumes existing graph adjacency + published gallery representation.
// It must not revive legacy Gallery/Museum presentation authority.
assert.match(entityHubProjection, /fetchWorldMediaProjection/);
assert.match(entityHubProjection, /from\("gallery_images"\)/);
assert.match(entityHubProjection, /eq\("published", 1\)/);
assert.match(entityHubProjection, /curator_hidden\.is\.null,curator_hidden\.eq\.false/);
assert.match(entityHubProjection, /projectionReason: `reality_graph:\$\{relationType\}`/);
assert.match(entityHubProjection, /row\.published !== 1 \|\| row\.curator_hidden === true/, "media builder must fail closed on unpublished/hidden rows");
assert.equal(/WORLD_MEDIA_FIELDS\s*=\s*"[^"]*importance/.test(entityHubProjection), false, "legacy gallery importance must not enter the 2029 media payload");
assert.equal(/\b[ab]\.importance\b/.test(entityHubProjection), false, "legacy gallery importance must not affect 2029 World media order");
assert.match(entityHubProjection, /Legacy gallery importance is intentionally NOT a[\s\S]*World ranking signal/);
assert.match(world, /key: "media", label: "תמונות"/);
assert.match(world, /sod29-world-media-grid/);
assert.match(world, /<img src=\{item\.thumbUrl \|\| item\.imageUrl\}/);
assert.match(world, /התמונה עצמה אינה הוכחה או דירוג אמת/);
assert.equal(world.includes("MuseumGallery"), false);
assert.equal(world.includes("MuseumGate"), false);
assert.equal(world.includes("getGalleriesOverview"), false);

// World consumes the released shared Experience Context.
assert.match(world, /EXPERIENCE_SURFACE/);
assert.match(world, /resolveExperienceContext/);
assert.match(world, /surface:\s*EXPERIENCE_SURFACE\.WORLD/);
assert.match(world, /WORLD_EXPERIENCE\.experience\.question/);
assert.match(world, /WORLD_EXPERIENCE\.brand\.identity/);
assert.match(world, /WORLD_EXPERIENCE\.brand\.canonicalLatinIdentity/);
assert.match(experienceContext, /\[EXPERIENCE_SURFACE\.WORLD\]/);
assert.match(experienceContext, /question:\s*"מה מתחבר\?"/);
assert.match(experienceContext, /semanticsSurviveDowngrade:\s*true/);

// Brand is consumed semantically. World must not invent or substitute protected artwork locally.
assert.equal(world.includes("/logo.png"), false);
assert.equal(world.includes("master_crown_transparent"), false);
assert.equal(world.includes("WorldBrand"), false);

// Cross-cutting capabilities stay in shared owners; no World-specific variants.
// Match WorldContext as an identifier/token, not as the prefix of the canonical
// buildWorldContextualProminence() presentation helper.
assert.equal(/\bWorldContext\b/.test(world), false, "WorldContext must not be created inside World");
for (const forbidden of [
  "WorldFrame", "WorldNavigation", "WorldRaziel", "WorldSearch",
  "WorldCommand", "WorldWorkspace", "WorldShare", "WorldTrace", "WorldEntitlement",
]) assert.equal(world.includes(forbidden), false, `${forbidden} must not be created inside World`);
assert.equal(world.includes("site_flags"), false);
assert.equal(world.includes("platform_tiers"), false);
assert.equal(world.includes("operationalTraceContract"), false);

// No manual arrangement path. World organization stays rule-driven and automatic.
for (const forbidden of ["draggable", "onDragStart", "onDrop", "manualOrder", "WorldRanking"]) {
  assert.equal(world.includes(forbidden), false, `manual/parallel organization leaked: ${forbidden}`);
}
assert.match(world, /filterWorldRelations/);
assert.match(world, /orderWorldRelations/);
assert.match(world, /explainWorldRelation/);
assert.match(world, /למה כאן\?/);
assert.match(world, /סינון קשרים/);
assert.match(world, /מיון קשרים/);

// Admin mode consumes the existing Auth owner and is visibility-only.
assert.match(world, /useAuth/);
assert.match(world, /const \{ isAdmin \} = useAuth\(\)/);
assert.match(world, /מצב מנהל/);
assert.match(world, /מצב מנהל אינו עוקף הרשאות בדפדפן/);
assert.match(world, /גישה ·/);
assert.match(world, /ממשל ·/);
assert.match(world, /אימות ·/);
assert.equal(/canonicalize|publishFinding|setGovernance|updateAccess/.test(world), false, "World admin view must not become a truth/publication writer");

// Admin contributor lens is a bounded projection over EXACTLY the four Human-Gate-approved identities.
assert.deepEqual(WORLD_APPROVED_CONTRIBUTOR_SLUGS, ["tzvi-opoc", "shimon-haimov", "yaniv-levi", "shachar-kandro"]);
assert.match(world, /fetchWorldContributorLens/);
assert.match(world, /חוקר \/ כותב/);
assert.match(world, /כרגע מאושרים ב־World רק צבי, שמעון חיימוב, יניב לוי ויצחק שחר קנדרו/);
assert.equal(world.includes("עמית מייק רוב"), false, "no fifth contributor may leak into the approved World filter");
assert.match(contributorLensSource, /admin_all_contributions/);
assert.match(contributorLensSource, /convergences_for_author/);
assert.equal(contributorLensSource.includes(".insert("), false);
assert.equal(contributorLensSource.includes(".update("), false);
assert.equal(contributorLensSource.includes(".upsert("), false);

const contributorFixture = buildWorldContributorLens({
  contributors: [
    { id: "tzvi-id", slug: "tzvi-opoc", display_name: "צבי (OPOC)", wa_names: ["צבי"] },
    { id: "shimon-id", slug: "shimon-haimov", display_name: "שמעון חיימוב", wa_names: [] },
    { id: "yaniv-id", slug: "yaniv-levi", display_name: "יניב לוי", wa_names: [] },
    { id: "shachar-id", slug: "shachar-kandro", display_name: "יצחק שחר קנדרו", wa_names: ["שחר יצחק קנדרו"] },
    { id: "fifth-id", slug: "not-approved", display_name: "לא מאושר", wa_names: [] },
  ],
  contributions: [
    { id: "c1", author_contributor_id: "tzvi-id", target_type: "number", target_id: "1020", convergence_slug: "tzvi-1020", gematria_claim: { value: 1020 } },
    { id: "c2", author_contributor_id: "yaniv-id", target_type: "number", target_id: "1820", gematria_claim: { value: 1820 } },
    { id: "c3", author_contributor_id: "fifth-id", target_type: "number", target_id: "1820", gematria_claim: { value: 1820 } },
  ],
  authorConvergences: [
    { id: "v1", author: "יניב לוי", value: 1820, phrases: ["א"], author_phrases: ["ב"] },
    { id: "v2", author: "לא מאושר", value: 1820, phrases: ["ג"] },
  ],
  researchRows: [
    { id: "r1", contributor: "צבי (OPOC)", meta: { contributor_id: "tzvi-id" } },
  ],
  topicRows: [{ slug: "tzvi-1020" }],
  anchor: { type: "number", label: "1820" },
});
assert.equal(contributorFixture.contributors.length, 4);
assert.equal(contributorFixture.bySlug["yaniv-levi"].convergences.length, 1);
assert.equal(contributorFixture.bySlug["yaniv-levi"].relevantContributions.length, 1);
assert.equal(contributorFixture.bySlug["tzvi-opoc"].researchObjectIds.includes("r1"), true);
assert.equal(contributorFixture.bySlug["not-approved"], undefined);
assert.equal(contributionTouchesWorldAnchor({ target_type: "number", target_id: "1820" }, { type: "number", label: "1820" }), true);

const publicLandingFixture = buildWorldLandingContributorProjection({
  contributors: [
    { id: "tzvi-id", slug: "tzvi-opoc", display_name: "צבי (OPOC)", wa_names: ["צבי"] },
    { id: "shimon-id", slug: "shimon-haimov", display_name: "שמעון חיימוב", wa_names: [] },
    { id: "yaniv-id", slug: "yaniv-levi", display_name: "יניב לוי", wa_names: [] },
    { id: "shachar-id", slug: "shachar-kandro", display_name: "יצחק שחר קנדרו", wa_names: [] },
    { id: "fifth-id", slug: "not-approved", display_name: "לא מאושר", wa_names: [] },
  ],
  publicContributions: [
    { id: "p1", author_contributor_id: "yaniv-id", title: "מפגש יניב", target_type: "number", target_id: "1820", convergence_slug: "yaniv-1820", gematria_claim: { value: 1820 } },
    { id: "p2", author_contributor_id: "fifth-id", title: "לא אמור להיכנס", target_type: "number", target_id: "999", convergence_slug: "fifth-999", gematria_claim: { value: 999 } },
  ],
});
assert.equal(publicLandingFixture.people.length, 4);
assert.equal(publicLandingFixture.bySlug["yaniv-levi"].meetings.length, 1);
assert.equal(publicLandingFixture.bySlug["not-approved"], undefined);
const publicLandingFetcherSlice = contributorLensSource.slice(
  contributorLensSource.indexOf("export async function fetchWorldLandingContributorProjection"),
  contributorLensSource.indexOf("export async function fetchWorldContributorLens"),
);
assert.equal(publicLandingFetcherSlice.includes("convergences_for_author"), false, "public landing must not consume the legacy unfiltered author convergence RPC");
assert.match(publicLandingFetcherSlice, /research_contributions/);
assert.match(publicLandingFetcherSlice, /\.eq\("status", "approved"\)/);

const golden878 = projectGoldenJourney878({
  topicRows: [
    { slug: "charvot-barzel-1202", title: "מפגש 1202", numbers: [1202, 878], highlight_numbers: [1202], meter_score: 92 },
    { slug: "atzirut-hageula", title: "מפגש 776", numbers: [776, 878], highlight_numbers: [776], meter_score: 90 },
    { slug: "meeting-1010", title: "מפגש 1010", numbers: [878, 588, 1010], highlight_numbers: [1010], meter_score: 82 },
    { slug: "duplicate-1010", title: "עוד 1010", numbers: [878, 1010], highlight_numbers: [1010], meter_score: 70 },
  ],
});
assert.equal(golden878.id, GOLDEN_WORLD_JOURNEY_878.id);
assert.equal(golden878.rootValue, 878);
assert.deepEqual(golden878.paths.map((path) => path.targetValue), [1202, 776, 1010]);
assert.match(worldJourneySource, /fetchTopicCardList/);
assert.equal(/\.rpc\(\s*["']fn_number_journey["']/.test(worldJourneySource), false, "public Golden Journey must not call the privileged Number/Journey projection");
assert.match(worldJourneySource, /number:\s*GOLDEN_WORLD_JOURNEY_878\.rootValue/);
assert.match(worldJourneySource, /rankByMeterScore:\s*true/);
assert.equal(worldJourneySource.includes("journey_classic_seed"), false);
assert.equal(worldJourneySource.includes("journey_seeds"), false);
assert.match(world, /sod29-world-journey-rail/);
assert.match(world, /journeyVisitedValues/);
assert.equal(world.includes('shell.go("/journey'), false, "Golden Journey must remain inside World/Research Context in 2029");

// Full Gematria visibility consumes Numeric Research's existing bounded/source-exhaustive contract.
// World no longer hard-caps the rendered reverse lookup at 10 and owns no parallel order.
assert.match(entityHubProjection, /lookupWindow: \{ limit: 500 \}/);
assert.equal(world.includes("out.length >= 10"), false, "World must not hide canonical lookup rows behind the old 10-row display cap");
assert.match(world, /כל רשימת הגימטריות של/);
assert.match(world, /סינון גימטריה לפי שיטה/);
assert.match(world, /סינון גימטריה לפי סוג/);
assert.match(world, /מקור קנוני מלא לפי סדר fn_number_lookup/);

// Admin graph visibility extends the canonical root-of-trust authorization only.
assert.match(adminMigration, /CREATE POLICY nodes_admin_read/i);
assert.match(adminMigration, /CREATE POLICY edges_admin_read/i);
assert.match(adminMigration, /FOR SELECT/i);
assert.match(adminMigration, /TO authenticated/i);
assert.match(adminMigration, /public\.rd_is_admin\(\)/);
assert.equal(/FOR (INSERT|UPDATE|DELETE)/i.test(adminMigration), false, "admin visibility migration must be read-only");
assert.equal(adminMigration.includes("nodes_public_read"), false, "public graph policy must not be weakened");
assert.equal(adminMigration.includes("edges_public_read"), false, "public graph policy must not be weakened");

// Public World copy speaks discovery/product language, not implementation/debug language.
for (const oldCopy of [
  "קורא רק דרך ה־2029 read models הפעילים", "אין fallback שקט ל־Legacy", "World הוא projection",
  "מגיעים מאותו System Frame", "אין projection זמין לעוגן הזה", "המציאות המחקרית פתוחה", "מפת המחקר של המציאות",
]) assert.equal(world.includes(oldCopy), false, `debug/research-default copy leaked: ${oldCopy}`);
assert.match(world, /מה חדש בעולם\?/);
assert.match(world, /DISCOVERY WORLD/);

// No silent substitute: explicit native states exist for loading/error/empty/unavailable.
for (const kind of ["loading", "error", "empty", "unavailable"]) assert.match(world, new RegExp(`kind="${kind}"`));
assert.match(world, /חומר שלא נטען אינו מוחלף במידע אחר/);
assert.match(app, /path="\/world"/);

// Every World -> Books transition goes through the shared Frame so return_exact is snapshotted.
assert.equal(world.includes('to="/books"'), false);
assert.match(world, /import \{ Link \} from "react-router-dom"/, "canonical Topic identities should be crawlable real links");
const shellBookTransitions = [...world.matchAll(/shell\.go\((?:`|")\/books/g)].length;
assert.equal(shellBookTransitions, 3);
assert.match(world, /fetchEntityHubProjection\(\{ nodeId: targetNodeId/);
assert.match(world, /shell\.openInspect\(/);
assert.match(world, /returnTo:\s*\{[\s\S]*href: "\/world"/);

// Graph adapter exposes only bounded relation-endpoint display context, never raw metadata.
assert.match(graphAdapter, /function projectedNodeContext/);
assert.match(graphAdapter, /curation:/);
assert.match(graphAdapter, /signal:/);
assert.match(graphAdapter, /from: projectedNodeContext\(from\)/);
assert.match(graphAdapter, /to: projectedNodeContext\(to\)/);

// Density gracefully covers rich / medium / sparse.
const sparse = { identity: { nodeId: "s", type: "number", label: "122" }, timeline: [{ id: "identity", at: "2026-01-01T00:00:00Z" }] };
const medium = { identity: { nodeId: "m", type: "number", label: "604" }, graph: { relations: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}` })) }, timeline: Array.from({ length: 6 }, (_, i) => ({ id: `t${i}` })) };
const rich = { identity: { nodeId: "r", type: "number", label: "1820" }, graph: { relations: Array.from({ length: 30 }, (_, i) => ({ id: `r${i}` })) } };
const multiChannelRich = { identity: { nodeId: "r2", type: "number", label: "358" }, graph: { relations: [{ id: "a" }] }, research: { findings: [{ id: "b" }] }, sources: [{ ref: "c" }] };
assert.equal(classifyWorldPresentationDensity(null), "unavailable");
assert.equal(classifyWorldPresentationDensity(sparse), "sparse");
assert.equal(classifyWorldPresentationDensity(medium), "medium");
assert.equal(classifyWorldPresentationDensity(rich), "rich");
assert.equal(classifyWorldPresentationDensity(multiChannelRich), "rich");
assert.deepEqual(worldProjectionCounts(sparse), { relations: 0, findings: 0, sources: 0, worlds: 0, timeline: 1 });
assert.deepEqual(worldDensityCounts(sparse), { relations: 0, findings: 0, sources: 0, worlds: 0, timeline: 0 });

// Automatic relation projection: contextual curation visibility without an opaque truth score.
const relation = (id, label, type, tier = null, relationType = "related", createdAt = `2026-09-${id}T00:00:00Z`) => ({
  id,
  provenance: { createdAt },
  projection: { relations: [{
    id,
    fromNodeId: "1820-node",
    toNodeId: `${id}-node`,
    relationType,
    from: { id: "1820-node", type: "number", label: "1820", curation: { tier: null }, signal: {} },
    to: { id: `${id}-node`, type, label, space: "core", curation: { tier }, signal: {} },
  }] },
});
const relations = [
  relation("10", "360", "number", null, "equals"),
  relation("11", "חתימת זהב", "entity", "gold", "related"),
  relation("12", "1020", "number", null, "cross"),
];
assert.equal(worldRelationCounterpart(relations[0], "1820-node").label, "360");
assert.deepEqual(worldRelationFacets(relations, "1820-node"), [{ type: "number", count: 2 }, { type: "entity", count: 1 }]);
assert.deepEqual(filterWorldRelations(relations, { currentNodeId: "1820-node", filter: "number" }).map(x => x.id), ["10", "12"]);
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "recommended" }).map(x => x.id), ["11", "10", "12"], "Compatibility relation list still preserves Gold visibility before neutral reader order");
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "number_asc" }).map(x => x.id), ["10", "12", "11"]);
assert.deepEqual(orderWorldRelations(relations, { currentNodeId: "1820-node", sort: "number_desc" }).map(x => x.id), ["12", "10", "11"]);
const why = explainWorldRelation(relations[1], "1820-node");
assert.match(why.reasons.join(" "), /אוצרות אנושי: gold/);
assert.match(why.disclaimer, /אינו דירוג אמת/);

// ── G3 contextual prominence Golden calibration ──────────────────────────────
const graphRelation = ({ anchorNodeId, id, label, type = "entity", tier = null, role = null, relationType = "related", meter = null, importance = null }) => ({
  id,
  projection: { relations: [{
    id,
    fromNodeId: anchorNodeId,
    toNodeId: `${id}-node`,
    relationType,
    from: { id: anchorNodeId, type: "number", label: anchorNodeId.replace("-node", ""), curation: {}, signal: {} },
    to: { id: `${id}-node`, type, label, curation: { tier, role }, signal: { meter, importance } },
  }] },
  source: { sourceRef: `edge:${id}` },
  evidence: { refs: [`edge:${id}`] },
});

const golden1820 = {
  identity: { nodeId: "1820-node", type: "number", label: "1820" },
  graph: { relations: [
    graphRelation({ anchorNodeId: "1820-node", id: "site-signature", label: "סוד אלף שמונה מאות עשרים כי לה המלוכה", tier: "gold", role: "signature", relationType: "equals", importance: 5 }),
    graphRelation({ anchorNodeId: "1820-node", id: "research-signature", label: "מספר שמות יהוה בכל התורה", tier: "gold", role: "signature", relationType: "equals", importance: 5 }),
    graphRelation({ anchorNodeId: "1820-node", id: "1020", label: "1020 — השגחה פרטית ותורה", type: "convergence", relationType: "converges_on" }),
  ] },
  research: {
    rows: [{
      id: "time-axis", kind: "relation", statement: "ציר הזמן של 1820", value: 1820,
      terms: ["1820", "עת"], relates: ["358"], source_ref: "fn_all_methods", privacy_scope: "public_candidate",
      engine_verified: true, engine_detail: { verification_state: "match" },
      meta: { ext: { presentation: { variants: { he: { title: "1820 — עת, היום והמשיח בימינו" } } } } },
    }],
    findings: [],
  },
  topics: { rows: [{ id: "topic-tenth", slug: "tevet-asiri-hitgalut", title: "עשרה בטבת — יום התגלות המשיח", status: "approved", meter_score: 90 }], findings: [] },
  sources: [
    { type: "verse", ref: "דברים 27:18", label: "דברים 27:18 — ארור משגה עור בדרך" },
    { type: "verse", ref: "תהלים 96:12", label: "תהלים 96:12 — יעלז שדי וכל אשר בו" },
  ],
};
const p1820 = buildWorldContextualProminence(golden1820, {
  access: { boundary: "current_session_rls" },
  crossMethodStrength: { signal: "CORE_AXIS_CANDIDATE", phrase_count: 109, methods: ["רגיל", "קדמי"], dependent_methods: ["רגיל+משולש"], dependent_phrase_count: 39 },
}, { limit: 7 });
assert.ok(p1820.items.length >= 4 && p1820.items.length <= 7, "1820 bounded attention bundle stays within 4–7 when material exists");
assert.equal(p1820.items.filter((item) => item.explainWhy.humanCuration.tier === "gold").length, 2, "both relevant 1820 Gold signatures remain discoverable");
assert.ok(p1820.items.some((item) => item.familyKey === "verse-source"), "1820 must gain a source/verse family instead of seven near-duplicate gematria rows");
assert.equal(p1820.contextSignals.crossMethodStrength.signal, "CORE_AXIS_CANDIDATE");
assert.equal(p1820.contextSignals.accessBoundary, "governed_readers_current_session_rls_before_composition");
assert.equal(Object.hasOwn(p1820, "score"), false, "no universal score may be emitted");

const golden358 = {
  identity: { nodeId: "358-node", type: "number", label: "358" },
  graph: { relations: [
    graphRelation({ anchorNodeId: "358-node", id: "mashiach", label: "משיח", tier: "silver", relationType: "equals" }),
    graphRelation({ anchorNodeId: "358-node", id: "nachash", label: "נחש", relationType: "equals" }),
  ] },
  research: {
    rows: [{
      id: "verse-358-held", kind: "observation", statement: "פסוק 358 — procedure held", value: 358,
      terms: ["358"], source_ref: "posts:976", privacy_scope: "public_candidate", engine_verified: false,
      engine_detail: { status: "NOT_REPRODUCED_UNDER_CURRENT_CONVENTION" },
    }, {
      id: "time-bridge", kind: "relation", statement: "בימינו = 358", terms: ["358", "בימינו"],
      source_ref: "verified gematria_words", privacy_scope: "public_candidate", engine_verified: true,
    }],
    findings: [],
  },
  topics: { rows: [{ id: "bereshit", slug: "bereshit", title: "בראשית — החללית לירח", status: "approved", occurred_at: "2019-02-21" }], findings: [] },
  sources: [],
};
const p358 = buildWorldContextualProminence(golden358, {}, { limit: 6 });
assert.equal(p358.items[0].id, "research:verse-358-held", "decision-changing negative/control may outrank positive-looking Silver material");
assert.ok(p358.items.some((item) => item.label === "משיח" && item.explainWhy.humanCuration.tier === "silver"), "Silver stays discoverable but is not treated as truth or forced #1");
assert.equal(p358.items[0].explainWhy.uncertainty.state, "negative_or_open");

const golden321 = {
  identity: { nodeId: "321-node", type: "number", label: "321" },
  graph: { relations: [
    graphRelation({ anchorNodeId: "321-node", id: "elohim", label: "אלהים", type: "word", relationType: "is_kadmi_of" }),
    graphRelation({ anchorNodeId: "321-node", id: "inner-knowing", label: "ידיעה מבפנים", type: "word", relationType: "equals_word" }),
    graphRelation({ anchorNodeId: "321-node", id: "123", label: "123", type: "number", relationType: "reverse_of" }),
    graphRelation({ anchorNodeId: "321-node", id: "3210", label: "3210", type: "number", relationType: "scale_x10" }),
  ] },
  research: {
    rows: [{ id: "321-dossier", kind: "relation", statement: "321 dossier", value: 321, terms: ["321"], privacy_scope: "public_candidate", status: "approved" }],
    findings: [],
  },
  topics: { rows: [], findings: [] },
  sources: [],
};
const p321 = buildWorldContextualProminence(golden321, {}, { limit: 7 });
assert.equal(p321.items.length, 5, "attention budget is not a quota: 321 must not receive filler merely to reach seven");
assert.equal(p321.items.some((item) => item.explainWhy.humanCuration.tier), false, "321 works without Gold/Silver dependency");
assert.equal(buildWorldContextualProminence(golden321, {}, { limit: 2 }).items.length, 4, "bounded attention target stays at least four when enough real material exists");

// Verification truth boundary: legacy engine_verified is inspectable but may not outrank an explicit match.
const verificationBoundary = {
  identity: { nodeId: "v", type: "number", label: "1820" },
  graph: { relations: [] }, topics: { rows: [], findings: [] }, sources: [],
  research: { rows: [
    { id: "a-legacy", statement: "legacy boolean only", value: 1820, privacy_scope: "public_candidate", engine_verified: true, engine_detail: {} },
    { id: "z-match", statement: "explicit match", value: 1820, privacy_scope: "public_candidate", engine_verified: false, engine_detail: { verification_state: "match" } },
  ], findings: [] },
};
const pVerification = buildWorldContextualProminence(verificationBoundary, {}, { limit: 4 });
assert.equal(pVerification.items[0].id, "research:z-match", "explicit verification state must outrank legacy engine_verified compatibility boolean");
assert.equal(pVerification.items.find((item) => item.id === "research:a-legacy").explainWhy.signalOnly.legacyEngineVerified, true);
assert.equal(pVerification.items.find((item) => item.id === "research:a-legacy").explainWhy.researchStrengthSignals.includes("engine_match"), false);

// Dependency grouping includes the root row itself, not only siblings that point at the same parent.
const dependencyData = {
  identity: { nodeId: "x", type: "number", label: "1820" }, graph: { relations: [] }, topics: { rows: [], findings: [] }, sources: [],
  research: { rows: [
    { id: "parent-1", statement: "Parent dossier", value: 1820, privacy_scope: "public_candidate", engine_detail: { verification_state: "not_tested" } },
    { id: "child-a", parent_id: "parent-1", statement: "A", value: 1820, privacy_scope: "public_candidate", engine_detail: { verification_state: "match" } },
    { id: "child-b", parent_id: "parent-1", statement: "B", value: 1820, privacy_scope: "public_candidate", engine_detail: { verification_state: "not_tested" } },
  ], findings: [] },
};
const dependencyProjection = buildWorldContextualProminence(dependencyData, {
  researchSupplements: [
    { id: "parent-1", parent_id: null },
    { id: "child-a", parent_id: "parent-1" },
    { id: "child-b", parent_id: "parent-1" },
  ],
}, { limit: 7 });
assert.equal(dependencyProjection.items.length, 1, "parent + descendants collapse into one dependency group before contextual rank");
assert.equal(dependencyProjection.items[0].id, "research:child-a", "best-supported representative may stand for the dependency group");
assert.equal(dependencyProjection.items[0].explainWhy.dependency.memberCount, 3);
assert.ok(dependencyProjection.items[0].explainWhy.researchStrengthSignals.includes("dependency_grouped_before_rank"));

// Same convergence projected through Graph + Topic is one artifact group; richer Topic signals merge into the direct graph representative.
const convergenceDedup = {
  identity: { nodeId: "1820-node", type: "number", label: "1820" },
  graph: { relations: [graphRelation({ anchorNodeId: "1820-node", id: "conv", label: "עטרת תפארתכם", type: "convergence", relationType: "contains" })] },
  research: { rows: [], findings: [] },
  topics: {
    rows: [{ id: "card-1", slug: "ateret", title: "עטרת תפארתכם", subtitle: "פרטי התכנסות", status: "approved", meter_score: 95, quality: 9 }],
    findings: [{ identity: { sourceIdentity: { owner: "topic_cards", id: "card-1" }, entityRef: "node:conv-node" }, source: { sourceRef: "topic_cards:card-1" }, evidence: { refs: ["topic_cards:card-1", "nodes:conv-node"] }, verification: { verification_state: null } }],
  },
  sources: [],
};
const pConvergenceDedup = buildWorldContextualProminence(convergenceDedup, {}, { limit: 7 });
assert.equal(pConvergenceDedup.items.length, 1, "same convergence identity must not inflate rank through graph+topic representations");
assert.equal(pConvergenceDedup.items[0].kind, "graph-relation", "direct typed relation remains the representative");
assert.equal(pConvergenceDedup.items[0].summary, "פרטי התכנסות", "richer topic presentation is merged without duplicating identity");
assert.equal(pConvergenceDedup.items[0].explainWhy.signalOnly.meter, 95, "source-native meter can survive as a late same-family signal without becoming Truth");

// Same-family source-native signals are late tie-breakers, not cross-family universal weights.
const topicSignalTie = {
  identity: { nodeId: "t", type: "number", label: "358" }, graph: { relations: [] }, research: { rows: [], findings: [] }, sources: [],
  topics: { rows: [
    { id: "low", title: "נמוך", status: "approved", meter_score: 50, quality: 5 },
    { id: "high", title: "גבוה", status: "approved", meter_score: 90, quality: 5 },
  ], findings: [] },
};
const pTopicSignals = buildWorldContextualProminence(topicSignalTie, {}, { limit: 4 });
assert.equal(pTopicSignals.items[0].label, "גבוה", "within the same convergence family an existing meter may break a presentation tie");

// Event access is resolved before composition by the current-session governed reader/RLS.
// A public reader simply does not return the private research row; the composer neither invents nor leaks it.
const eventData = {
  identity: { nodeId: "event-node", type: "event", label: "חיסול נסראללה" },
  graph: { relations: [{
    id: "post-edge",
    projection: { relations: [{
      fromNodeId: "event-node", toNodeId: "post-node", relationType: "documents",
      from: { id: "event-node", type: "event", label: "חיסול נסראללה", curation: {}, signal: {} },
      to: { id: "post-node", type: "post", label: "פוסט המקור", curation: {}, signal: {} },
    }] },
  }] },
  research: { rows: [], findings: [] }, topics: { rows: [], findings: [] }, sources: [],
};
const publicEventInputs = {
  access: { boundary: "current_session_rls", eventContext: true },
  eventContext: {
    nodeId: "event-node",
    occurredAt: "2024-09-29T06:29:04+00:00",
    post: { id: 92, wp_id: 34200, date: "2024-09-29T06:29:04+00:00" },
    researchRows: [],
  },
};
const eventPublic = buildWorldContextualProminence(eventData, publicEventInputs, { limit: 6, timeAware: true });
assert.equal(eventPublic.items.some((item) => item.kind === "research"), false);
assert.equal(eventPublic.items.some((item) => item.kind === "temporal-control"), false, "composer must not manufacture a conflict from evidence the authorized reader did not return");
assert.equal(eventPublic.items.length, 1, "public Event stays sparse rather than filling with inaccessible material");

const authorizedEventInputs = {
  access: { boundary: "current_session_rls", eventContext: true },
  eventContext: {
    ...publicEventInputs.eventContext,
    researchRows: [{
      id: "event-triple", kind: "relation", statement: "שם/יום/שעה", value: 1820,
      terms: ["358", "18:20"], source_ref: "posts:92#event:2024-09-27:חיסול-נסראללה",
      privacy_scope: "private", engine_verified: true,
    }],
  },
};
const eventAuthorized = buildWorldContextualProminence(eventData, authorizedEventInputs, { limit: 6, timeAware: true });
assert.ok(eventAuthorized.items.some((item) => item.id === "research:event-triple"), "authorized reader output may participate without copying or changing its access state");
assert.ok(eventAuthorized.items.some((item) => item.kind === "temporal-control"), "authorized Event projection keeps event time vs research provenance date explicit rather than silently normalizing");

// The live-input adapter is bounded and read-only, consumes existing tables/views under current-session RLS,
// and never reconstructs privacy_scope policy or uses a privileged-key bypass.
assert.match(prominenceInputs, /cross_method_strength/);
assert.match(prominenceInputs, /parent_id,evidence,owner_person_id,meta/);
assert.match(prominenceInputs, /post_wp_id/);
assert.match(prominenceInputs, /posts:\$\{post\.id\}/);
assert.match(prominenceInputs, /current_session_rls/);
assert.equal(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(prominenceInputs), false, "prominence input reader must remain read-only");
assert.equal(/create table|create view|create function/i.test(prominenceInputs), false, "no new ranking store/view/function may be created");
assert.equal(/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/.test(prominenceInputs), false, "reader must not carry a privileged service-role credential");
assert.equal(/\.eq\(["']privacy_scope["']/.test(prominenceInputs), false, "projection must not duplicate source-owned privacy policy");

const helper = read("src/lib/research/world2029Presentation.js");
assert.match(helper, /does NOT rank truth/i);
assert.equal(/confidence\s*=/.test(helper), false);
assert.equal(helper.includes("universalScore"), false);
assert.match(helper, /buildWorldContextualProminence/);
assert.equal(prominenceHelper.includes("universalScore"), false);
assert.equal(prominenceHelper.includes("Gold=100"), false);
assert.equal(/score\s*:/.test(prominenceHelper), false, "contextual prominence helper must not emit/maintain a numeric rank score");
assert.equal(prominenceHelper.includes("PUBLIC_RESEARCH_ACCESS"), false, "composer must consume authorized reader output rather than invent a second access vocabulary");
assert.match(prominenceHelper, /engine_detail\.verification_state is verification authority/);
assert.match(prominenceHelper, /DEDUP \/ SAME-ARTIFACT \/ DEPENDENCY GROUPING BEFORE RANK/);

console.log("2029 native World surface acceptance: PASS");
