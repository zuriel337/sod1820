import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("Life Journey 2029 extends the existing Person owner and unified entry", () => {
  const app = read("src/App2029.jsx");
  const page = read("src/pages/LifeJourney2029Page.jsx");
  const journey = read("src/components/PersonJourney.jsx");
  const home = read("src/pages/Home2029Page.jsx");
  const css = read("src/components/person-journey.css");
  const vercel = JSON.parse(read("vercel.json"));

  assert.match(app, /path="\/2029\/journey" element=\{<LifeJourney2029Page \/>\}/);
  assert.match(page, /data-experience-surface="life-journey-2029"/);
  assert.match(page, /<PersonJourney variant="2029"/);

  assert.match(home, /buildUnifiedResearchEntry/);
  assert.match(home, /navigate\("\/2029\/journey"\)/);
  assert.doesNotMatch(home, /const numeric = \/\^\\d\+\$\//);

  assert.match(journey, /upsertSelfProfile/);
  assert.match(journey, /upsertFamilyMember/);
  assert.match(journey, /upsertFamilyRelation/);
  assert.match(journey, /birthdate_iso/);
  assert.match(journey, /getNameMulti/);
  assert.match(journey, /runPersonalDateResearch/);
  assert.match(journey, /createSupabasePersonalDateCrossProvider/);
  assert.match(journey, /buildAccessDescriptor/);
  assert.match(journey, /verified_authority:\s*\{ source: "supabase_auth", subject_verified: true \}/);
  assert.doesNotMatch(journey, /fn_cross_name_date/);
  assert.doesNotMatch(journey, /\.from\(["'](?:nodes|edges)["']\)/);

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
