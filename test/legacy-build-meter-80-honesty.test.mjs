import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BUILD_PROGRESS,
  BUILD_PUBLIC_PROGRESS,
  FIRST_STAGE_RELEASE_GATES,
} from "../src/lib/knowledgeMap.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public 80% is an explicitly dated estimate, not fabricated G4 closure", () => {
  assert.equal(BUILD_PUBLIC_PROGRESS.percent, 80);
  assert.match(BUILD_PUBLIC_PROGRESS.label, /הערכ/);
  assert.match(BUILD_PUBLIC_PROGRESS.updatedAt, /2026/);
  assert.equal(BUILD_PUBLIC_PROGRESS.auditedClosedGates, 4);
  assert.equal(BUILD_PUBLIC_PROGRESS.auditedTotalGates, 6);
  assert.equal(BUILD_PROGRESS, 67);
  assert.equal(FIRST_STAGE_RELEASE_GATES.find(g => g.id === "G3.5").state, "active");
  assert.equal(FIRST_STAGE_RELEASE_GATES.find(g => g.id === "G4").state, "pending");
});

test("visible Legacy site uses estimate and retains honest opening caveats", () => {
  const footer = source("src/components/layout/Footer.jsx");
  const map = source("src/pages/NavigationCenterPage.jsx");
  const navbar = source("src/components/layout/Navbar.jsx");
  const admin = source("src/components/RazielGlobalShell.jsx");
  for (const file of [footer, map, navbar, admin]) {
    assert.match(file, /BUILD_PUBLIC_PROGRESS/);
  }
  assert.match(footer, /BUILD_PUBLIC_PROGRESS\.percent/);
  assert.match(footer, /BUILD_PROGRESS/);
  assert.match(footer, /prefers-reduced-motion/);
  assert.match(map, /FIRST_STAGE_RELEASE_GATES/);
  assert.match(map, /Golden/);
  assert.match(map, /אישור/);
});
