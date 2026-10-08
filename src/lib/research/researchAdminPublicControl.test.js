import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PROJECTOR_MODE, PUBLICATION_RPC, isPublishedScope, publicationControlFor,
  researchReaderForMode, resolveProjectorMode, setResearchObjectPublication,
} from "./researchViewMode.js";
import * as golden from "./goldenProjectorModes.js";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const MIGRATION = read("../../../supabase/migrations/20261008100000_research_admin_public_control_v1.sql");

test("World and Projector share ONE mode resolver (same module, same semantics)", () => {
  assert.equal(golden.resolveProjectorMode, resolveProjectorMode);
  assert.equal(golden.PROJECTOR_MODE, PROJECTOR_MODE);
  const world = read("../../pages/World2029Page.jsx");
  const projector = read("../../components/experience2029/GoldenProjectorModeLayer2029.jsx");
  for (const src of [world, projector]) {
    assert.match(src, /useResearchViewMode/);
    assert.match(src, /ResearchViewModeSwitch2029/);
  }
  assert.doesNotMatch(world, /adminToolsOpen|setAdminMode/, "ad-hoc admin-tools open/close removed from World");
  assert.doesNotMatch(world, /"כלי מנהל"\}>|סגור כלי מנהל/);
});

test("non-admin always fails closed to PUBLIC_VIEW; admin defaults to ADMIN_ALL", () => {
  assert.equal(resolveProjectorMode({ isAdmin: false, requested: PROJECTOR_MODE.ADMIN_ALL }), PROJECTOR_MODE.PUBLIC_VIEW);
  assert.equal(resolveProjectorMode({ isAdmin: true }), PROJECTOR_MODE.ADMIN_ALL);
  assert.equal(resolveProjectorMode({ isAdmin: true, requested: PROJECTOR_MODE.PUBLIC_VIEW }), PROJECTOR_MODE.PUBLIC_VIEW);
});

test("PUBLIC_VIEW never uses the admin session client; ADMIN_ALL does", () => {
  const session = { who: "session" };
  const anon = { who: "anon" };
  const opts = { sessionClient: session, anonClient: () => anon };
  assert.equal(researchReaderForMode(PROJECTOR_MODE.PUBLIC_VIEW, opts), anon);
  assert.equal(researchReaderForMode(PROJECTOR_MODE.ADMIN_ALL, opts), session);
  assert.equal(researchReaderForMode(undefined, opts), anon);
});

test("publication control: public => החזר לפרטי, otherwise פרסם לציבור; public_candidate is NOT published", () => {
  assert.equal(publicationControlFor({ privacy_scope: "public" }).label, "החזר לפרטי");
  for (const scope of ["private", "family_shared", "public_candidate", null]) {
    const c = publicationControlFor({ privacy_scope: scope });
    assert.equal(c.label, "פרסם לציבור");
    assert.equal(c.published, false);
  }
  assert.equal(isPublishedScope("public_candidate"), false);
  assert.equal(publicationControlFor({ privacy_scope: "private", meta: { ext: { personal_scope: { scope: "person_only" } } } }).disabled, true);
});

test("publication control ignores governance/verification: PUBLIC != CANONICAL, PUBLICATION != GOVERNANCE", () => {
  const canonicalPrivate = publicationControlFor({ privacy_scope: "private", status: "canonical", engine_verified: true });
  const candidatePublic = publicationControlFor({ privacy_scope: "public", status: "candidate", engine_verified: false });
  assert.equal(canonicalPrivate.published, false); // P1
  assert.equal(candidatePublic.published, true);   // P2
});

test("setResearchObjectPublication calls only the dedicated RPC, never the governance RPC", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: { ok: true, privacy_scope: "public" }, error: null }; } };
  const res = await setResearchObjectPublication("id-1", true, { client });
  assert.equal(res.ok, true);
  assert.deepEqual(calls, [[PUBLICATION_RPC, { p_id: "id-1", p_publish: true, p_note: null }]]);
  assert.notEqual(PUBLICATION_RPC, "admin_research_review");
  const failing = { rpc: async () => ({ data: null, error: { message: "admin only" } }) };
  assert.deepEqual(await setResearchObjectPublication("id-1", true, { client: failing }), { ok: false, error: "admin only" });
});

test("Projector admin research rows carry the publication control; PUBLIC_VIEW universe has no admin fetch", async () => {
  assert.match(read("../../components/experience2029/GoldenProjectorModeLayer2029.jsx"), /ResearchPublicationControl2029/);
  const u = golden.buildGoldenAdminUniverse({ pack: { rows: [] }, researchRowsByNumber: { 1: [{ id: "a", kind: "fact", statement: "x", value: 1, source_ref: "r:1", privacy_scope: "private", status: "approved", engine_detail: {} }] } });
  const item = u.layers[golden.ADMIN_LAYER.RESEARCH][0];
  assert.equal(item.privacyScope, "private");
  assert.equal(publicationControlFor({ privacy_scope: item.privacyScope, meta: item.meta }).label, "פרסם לציבור");
});

test("World research reads are routed through the mode-selected client (no admin payload in PUBLIC_VIEW)", () => {
  const world = read("../../pages/World2029Page.jsx");
  assert.match(world, /researchReaderForMode\(isAdmin \? viewMode\.mode : PROJECTOR_MODE\.PUBLIC_VIEW\)/);
  assert.match(world, /researchClient/);
  assert.match(read("./entityHubProjection.js"), /client: researchClient/);
});

test("migration: additive 'public', RPC admin-only, person_only fail-closed, policy exact, no governance writes", () => {
  assert.match(MIGRATION, /array\['private','family_shared','public_candidate','public'\]/);
  assert.match(MIGRATION, /security definer/);
  assert.match(MIGRATION, /raise exception 'admin only'/);
  assert.match(MIGRATION, /person_only_cannot_publish/);
  assert.match(MIGRATION, /revoke all on function public\.admin_research_set_publication_v1\(uuid, boolean, text\) from public, anon/);
  assert.match(MIGRATION, /using \(\s*privacy_scope = 'public'\s*and coalesce\(meta #>> '\{ext,personal_scope,scope\}', ''\) <> 'person_only'\s*\)/);
  assert.doesNotMatch(MIGRATION, /public_candidate'\s*\)\s*$/m);
  const upd = MIGRATION.slice(MIGRATION.indexOf("update public.research_objects"), MIGRATION.indexOf("return jsonb_build_object(\n    'ok', true"));
  assert.doesNotMatch(upd, /status\s*=|engine_verified\s*=|engine_detail\s*=|promoted_node_id\s*=|source\s*=|contributor\s*=/);
  assert.doesNotMatch(MIGRATION, /ro_admin_read|ro_dossier_read/, "existing policies untouched");
  assert.doesNotMatch(MIGRATION, /admin_research_review\(/);
});
