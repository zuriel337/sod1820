import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("Life Journey 2029 extends the existing Person owner and unified entry", () => {
  const app = read("src/App2029.jsx");
  const page = read("src/pages/LifeJourney2029Page.jsx");
  const journey = read("src/components/PersonJourney.jsx");
  const personContext = read("src/lib/research/lifeJourneyPersonContext.js");
  const capabilities = read("src/components/experience2029/LifeJourneyCapabilities2029.jsx");
  const nameAdapter = read("src/components/experience2029/LifeJourneyName2029.jsx");
  const dateAdapter = read("src/components/experience2029/LifeJourneyDate2029.jsx");
  const elsAdapter = read("src/lib/research/lifeJourneyElsAdapter.js");
  const elsSurface = read("src/components/experience2029/LifeJourneyEls2029.jsx");
  const hints = read("src/components/experience2029/LifeJourneyHints2029.jsx");
  const home = read("src/pages/Home2029Page.jsx");
  const css = read("src/components/person-journey.css");
  const vercel = JSON.parse(read("vercel.json"));

  assert.match(app, /path="\/2029\/journey" element=\{<Locked flag="lock_life_journey" requireFlag homeHref="\/2029"><LifeJourney2029Page \/><\/Locked>\}/);
  assert.match(page, /data-experience-surface="life-journey-2029"/);
  assert.match(page, /LifeJourneyCapabilities2029/);
  assert.match(page, /<PersonJourney variant="2029" CapabilitySurface=\{LifeJourneyCapabilities2029\}/);
  assert.doesNotMatch(journey, /lazy\(\(\) => import\("\.\/experience2029\/LifeJourney/);

  assert.match(home, /buildUnifiedResearchEntry/);
  assert.match(home, /navigate\("\/2029\/journey"\)/);
  assert.match(home, /useFeatureState\("lock_life_journey", \{ requireFlag: true \}\)/);
  assert.doesNotMatch(home, /const numeric = \/\^\\d\+\$\//);

  assert.match(journey, /upsertSelfProfile/);
  assert.match(journey, /upsertFamilyMember/);
  assert.match(journey, /upsertFamilyRelation/);
  assert.match(journey, /birthdate_iso/);
  assert.match(journey, /getNameMulti/);
  assert.match(journey, /getNameProtocol/);
  assert.match(journey, /runPersonalDateResearch/);
  assert.match(journey, /CanonicalProgress/);
  assert.match(journey, /birthdate:\s*null/);
  assert.match(journey, /createSupabasePersonalDateCrossProvider/);
  assert.match(journey, /buildAccessDescriptor/);
  assert.match(journey, /verified_authority:\s*\{ source: "supabase_auth", subject_verified: true \}/);
  assert.doesNotMatch(journey, /fn_cross_name_date/);
  assert.doesNotMatch(journey, /\.from\(["'](?:nodes|edges)["']\)/);

  assert.match(journey, /buildLifeJourneyCapabilityPatch/);
  assert.match(journey, /buildLifeJourneyExactReturnPatch/);
  assert.match(journey, /buildLifeJourneyFamilySelectionPatch/);
  assert.match(journey, /lifeJourneySelectedMemberRefs/);
  assert.match(journey, /family_research_explicit/);
  assert.match(journey, /Promise\.all\(selectedMembers\.map/);
  assert.match(journey, /חקור \$\{selectedFamilyRefs\.length\} אנשים יחד/);
  assert.match(journey, /מפת המחקר המשפחתית/);
  assert.match(journey, /ELS אינו משתתף בשלב הזה/);
  assert.match(journey, /continueResearchPath/);
  assert.match(personContext, /life_journey_person_context_v1/);
  assert.match(personContext, /buildExactReturnPatch/);
  assert.match(personContext, /buildLifeJourneyHintReferencePatch/);
  assert.match(personContext, /\/2029\/number\/\$\{value\}/);
  assert.match(nameAdapter, /getNameProtocol/);
  assert.match(nameAdapter, /buildJourney/);
  assert.match(nameAdapter, /המשך לשם ותאריך/);
  assert.match(dateAdapter, /runPersonalDateResearch/);
  assert.match(dateAdapter, /createSupabasePersonalDateCrossProvider/);
  assert.match(dateAdapter, /סיים וחזור למרכז המשפחתי/);
  assert.match(dateAdapter, /אינה מפעילה ELS/);
  assert.doesNotMatch(dateAdapter, /localStorage|sessionStorage|addHint|removeHint|\.insert\(|\.update\(/);
  assert.doesNotMatch(capabilities, /LifeJourneyEls2029|view === "els"/);
  assert.doesNotMatch(journey, /continueSelectedCapability\("els"|view="els"|שם ותאריך → ELS/);
  assert.match(elsAdapter, /prepareElsAutomaticResearchPlan/);
  assert.match(elsAdapter, /runElsAutomaticResearchSlice/);
  assert.match(elsAdapter, /verifyEls2029Selection/);
  assert.match(elsAdapter, /buildElsAdvancedLoadItem/);
  assert.match(elsSurface, /els-search-bridge/);
  assert.match(hints, /getMyHints/);
  assert.match(hints, /fallbackLocal:\s*false/);
  assert.match(hints, /buildLifeJourneyHintReferencePatch/);
  assert.match(hints, /פתח במספר/);
  assert.doesNotMatch(hints, /addHint|removeHint|\.insert\(|\.update\(/);

  const privateFlow = [journey, personContext, nameAdapter, dateAdapter, elsAdapter, elsSurface, hints].join("\n");
  assert.doesNotMatch(privateFlow, /\/2029\/journey\?/);
  assert.doesNotMatch(privateFlow, /channel_updates|community_hints|news/i);
  assert.doesNotMatch(privateFlow, /Raziel|רזיאל/);
  assert.doesNotMatch(privateFlow, /console\.(?:log|info|debug)/);
  assert.doesNotMatch(elsSurface, /Els2029Page|ElsAdvancedSearch2029|TzofenEmbed|ResearchProvider/);

  assert.ok(vercel.rewrites.some((row) => row.source === "/2029/journey" && row.destination === "/2029.html"));
  const headers = vercel.headers.find((row) => row.source === "/2029/journey")?.headers || [];
  assert.ok(headers.some((header) => header.key === "X-Robots-Tag" && /noindex/.test(header.value)));

  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width:520px\)/);
});

test("Life Journey source does not commit the personal Golden fixture", () => {
  const changedSources = [
    read("src/components/PersonJourney.jsx"),
    read("src/pages/LifeJourney2029Page.jsx"),
    read("src/pages/Home2029Page.jsx"),
  ].join("\n");

  assert.equal(changedSources.includes("איילה אברמוב"), false);
  assert.equal(changedSources.includes("15.2.1990"), false);
  assert.equal(changedSources.includes("1990-02-15"), false);
});
