import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const telemetry = read("src/lib/research/journey2029Telemetry.js");
const provider = read("src/lib/research/ResearchProvider.jsx");
const world = read("src/pages/World2029Page.jsx");
const home = read("src/pages/Home2029Page.jsx");
const migration = read("supabase/migrations/20260927121500_journey_2029_pulse_v1.sql");

assert.match(telemetry, /emit\("journey_2029", eventType/);
assert.match(telemetry, /journey_kind/);
assert.match(telemetry, /journey_mode/);
assert.match(telemetry, /source_surface/);
assert.match(telemetry, /root_type/);
assert.match(telemetry, /journey_instance/);
assert.doesNotMatch(telemetry, /person_ref|search_term|query_text|family_name/i);

assert.match(provider, /startResearchJourney/);
assert.match(provider, /saveCurrentResearchPath/);
assert.match(provider, /emitJourney2029\("start"/);
assert.match(provider, /recordResearchJourneyEvent/);

assert.doesNotMatch(world, /research\.addJourney/);
assert.match(world, /startResearchJourney/);
assert.match(world, /saveCurrentResearchPath/);
assert.match(world, /recordResearchJourneyEvent\?\.\("step"/);
assert.match(world, /research\.pathResume\?\.latest/);
assert.match(world, /resumeResearchPath/);
assert.match(world, /journeyKind: "number_expression"/);
assert.match(world, /journeyMode: "guided"/);

assert.match(home, /getJourneyPulse/);
assert.match(home, /journey_2029_people_today/);
assert.match(home, /journey_2029_starts_today/);
assert.match(home, /journey_2029_starts_7d/);
assert.doesNotMatch(home, /active_now|now_visitors|people_online/);

assert.match(migration, /create or replace function public\.journey_pulse\(\)/i);
assert.match(migration, /e\.surface = 'journey_2029'/);
assert.match(migration, /e\.event_type = 'start'/);
assert.match(migration, /public\.fn_ti_report_day\(e\.ts\)/);
assert.match(migration, /journey_2029_people_today/);
assert.match(migration, /journey_2029_starts_today/);
assert.match(migration, /journey_2029_starts_7d/);
assert.match(migration, /'researchers_today'/);
assert.match(migration, /'journeys_today'/);
assert.match(migration, /'recent_numbers'/);
assert.match(migration, /revoke all on function public\.journey_pulse\(\) from public/i);
assert.match(migration, /grant execute on function public\.journey_pulse\(\) to anon, authenticated, service_role/i);

console.log("Journey 2029 pulse acceptance: PASS");
