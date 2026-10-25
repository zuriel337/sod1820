import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("Life Journey 2029 extends the existing Person owner and unified entry", () => {
  const app = read("src/App2029.jsx");
  const page = read("src/pages/LifeJourney2029Page.jsx");
  const journey = read("src/components/PersonJourney.jsx");
  const personContext = read("src/lib/research/lifeJourneyPersonContext.js");
  const familyClaimAdapter = read("src/lib/research/familyClaimAdapter.js");
  const familyInvitationSender = read("supabase/functions/send-family-invitation-email/index.ts");
  const familyInvitationEmail = read("supabase/functions/_shared/familyInvitationEmail.js");
  const capabilities = read("src/components/experience2029/LifeJourneyCapabilities2029.jsx");
  const nameAdapter = read("src/components/experience2029/LifeJourneyName2029.jsx");
  const nameResearch = read("src/lib/research/lifeJourneyNameResearch.js");
  const supabaseClient = read("src/lib/supabase.js");
  const dateAdapter = read("src/components/experience2029/LifeJourneyDate2029.jsx");
  const dateMatrix = read("src/lib/research/lifeJourneyDateMatrix.js");
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
  assert.match(journey, /birth_place/);
  assert.match(journey, /runLifeJourneyNameResearch/);
  assert.match(journey, /variant === "2029"/);
  assert.match(journey, /getNameMulti/);
  assert.match(journey, /getNameProtocol/);
  assert.match(journey, /birthdate:\s*null/);
  assert.match(journey, /runPersonalDateResearch/);
  assert.match(journey, /CanonicalProgress/);
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
  assert.match(journey, /familyBirthTimeline/);
  assert.match(journey, /data-experience-capability="life-journey-birth-timeline"/);
  assert.match(journey, /לא נוצר Event store חדש/);
  assert.doesNotMatch(journey, /upsertLifeEvent|insertLifeEvent|life_event_store/);
  assert.doesNotMatch(journey, /geocod|mapbox|google\.maps/i);
  assert.match(journey, /data-experience-capability="life-journey-account-continuity"/);
  assert.match(journey, /מנגנון Claim קנוני קיים/);
  assert.match(journey, /אינו מעתיק מחקר פרטי ואינו מעניק גישה/);
  assert.match(journey, /const principal = auth\.loading \? "auth:pending" : auth\.user\?\.id \|\| "guest"/);
  assert.match(journey, /<PrincipalPersonJourney key=\{principal\}/);
  assert.doesNotMatch(journey, /fn_create_family_invitation|fn_redeem_family_invitation/);
  assert.match(journey, /listMyFamilyClaims/);
  assert.match(journey, /createFamilyInvitation/);
  assert.match(journey, /redeemFamilyInvitation/);
  assert.match(journey, /revokeFamilyClaim/);
  assert.match(journey, /sendFamilyInvitationEmail/);
  assert.match(journey, /shareFamilyInvitationPrivately/);
  assert.match(journey, /קוד חד־פעמי · מוצג רק בזיכרון המסך הנוכחי/);
  assert.match(journey, /המייל נשלח רק בלחיצה/);
  assert.match(journey, /autoComplete="off"/);
  assert.match(journey, /החיבור מאמת זהות בלבד/);
  assert.doesNotMatch(journey, /invitation(?:Tokens|Emails)[^\n]*(?:localStorage|sessionStorage|setResearchContext|track)/);
  assert.match(familyClaimAdapter, /fn_list_my_family_claims/);
  assert.match(familyClaimAdapter, /fn_create_family_invitation/);
  assert.match(familyClaimAdapter, /fn_redeem_family_invitation/);
  assert.match(familyClaimAdapter, /fn_revoke_family_claim/);
  assert.match(familyClaimAdapter, /send-family-invitation-email/);
  assert.match(familyClaimAdapter, /navigator\?\.share/);
  assert.match(familyClaimAdapter, /body: \{ claim_id: claim, raw_token: token, recipient_email: email \}/);
  assert.doesNotMatch(familyClaimAdapter, /token_hash|attempts|reviewed_by|claimant_person_id|\bmeta\b|localStorage|sessionStorage|URLSearchParams|track\(|console\./);
  assert.match(familyInvitationSender, /admin\.auth\.getUser\(bearer\)/);
  assert.match(familyInvitationSender, /authorizeFamilyInvitationEmail/);
  assert.match(familyInvitationSender, /Idempotency-Key/);
  assert.doesNotMatch(familyInvitationSender, /console\.|providerResponse\.(?:text|json)\(/);
  assert.match(familyInvitationEmail, /<html lang="he" dir="rtl">/);
  assert.match(familyInvitationEmail, /url\.search = ""/);
  assert.match(journey, /continueResearchPath/);
  assert.match(personContext, /life_journey_person_context_v1/);
  assert.match(personContext, /buildExactReturnPatch/);
  assert.match(personContext, /stableIdentityDigest/);
  assert.match(personContext, /life-journey-finding:/);
  assert.match(personContext, /buildLifeJourneyHintReferencePatch/);
  assert.match(personContext, /\/2029\/number\/\$\{value\}/);
  assert.match(nameAdapter, /runLifeJourneyNameResearch/);
  assert.match(nameAdapter, /fetchNameLab:\s*false/);
  assert.doesNotMatch(nameAdapter, /runNameLabReflectionRuntime|createNameLabReflectionRuntimeProviders|שלושה קלפים/);
  assert.match(nameAdapter, /life_journey_gematria/);
  assert.match(nameAdapter, /המשך למטריצת השם והתאריך/);
  assert.match(nameResearch, /fetchCanonicalGematriaFindings/);
  assert.match(nameResearch, /nameLabTrackListsToUniversalFindings/);
  assert.match(nameResearch, /aggregateFindings/);
  assert.match(nameResearch, /life_journey_name_research_els_boundary/);
  assert.match(supabaseClient, /export async function getNameMultiWithoutEls/);
  assert.match(supabaseClient, /p_opts:\s*\{ skip_els: '1' \}/);
  assert.match(dateAdapter, /runLifeJourneyDateMatrixResearch/);
  assert.match(dateAdapter, /createSupabaseLifeJourneyDateMatrixProviders/);
  assert.match(dateAdapter, /רשימות הגימטריה המלאות/);
  assert.match(dateAdapter, /סיים וחזור למסע החיים/);
  assert.match(dateAdapter, /ELS נשאר מחוץ לשלב הזה/);
  assert.match(dateMatrix, /fn_all_methods/);
  assert.match(dateMatrix, /createGematriaRelationW2Executor/);
  assert.match(dateMatrix, /INTAKE_DIRECT_PAIR/);
  assert.match(dateMatrix, /searchedPairCount/);
  assert.doesNotMatch(dateMatrix, /fn_cross_research|NameLab|tarot|קלפים/i);
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

  const privateFlow = [journey, personContext, familyClaimAdapter, nameAdapter, nameResearch, dateAdapter, elsAdapter, elsSurface, hints].join("\n");
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
