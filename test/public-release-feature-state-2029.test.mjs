// Contract: in the public reading release, what the release opens to everyone is open to everyone, the administrator included.
//
// Why (5.11.2026): ZURIEL, signed in as the administrator, reported "דף המספר · נעול" in the rail and the maintenance page where the Books page
// should be, while a visitor sees both open. As a visitor the live rail never says "locked" for these areas (measured at 1440 at 1x, 4x and 6x CPU
// slowdown). For a signed-in administrator the hook took the state of these areas from the shared flag table: a new read on every navigation (the
// read scope includes the history key), "locked" while it was in flight, and closed for good if the flag row did not come back, because requireFlag
// fails closed even for the administrator ("a named launch gate must exist explicitly"). The database value alone cannot fix that: the earlier
// lock_number change in the database is read only by the administrator's session, never by a visitor.
//
// So in the public reading release a flag the release opens to everyone is open to everyone at once, with no read and no wait for sign-in.
//
// The check runs the REAL useFeatureState (esbuild bundle with the public-release switches on, react-dom/server) with the viewer shapes
// the app produces. No browser, no network, no react-test-renderer.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "feature-state-"));
after(() => rm(scratch, { recursive: true, force: true }));
await writeFile(join(scratch, "auth-stub.js"), 'export const useAuth = () => globalThis.__viewer;\n');
await writeFile(join(scratch, "supabase-stub.js"), "export const getSiteFlags = async () => ({});\n");
await writeFile(join(scratch, "router-stub.js"), "export const Link = () => null;\n");

async function load({ release }) {
  const outfile = join(scratch, `bundle-${release ? "release" : "plain"}.mjs`);
  await build({
    stdin: {
      contents: `
        import React from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { useFeatureState, resolveFeatureState } from "./src/components/MaintenanceLock.jsx";
        import { publicReadingFeatureLock } from "./src/lib/publicReadingRelease2029.js";
        export function probe(flag, options) {
          let out;
          function Probe() { out = useFeatureState(flag, options); return null; }
          renderToStaticMarkup(React.createElement(Probe));
          return out;
        }
        export { resolveFeatureState, publicReadingFeatureLock };
      `,
      loader: "jsx",
      resolveDir: root,
    },
    bundle: true, platform: "node", format: "esm", outfile, logLevel: "silent",
    define: {
      __SOD_2029_BUILD__: "true",
      "import.meta.env": JSON.stringify(release ? { VITE_PUBLIC_READING_RELEASE: "public-reading-20261101" } : {}),
      "process.env.NODE_ENV": '"production"',
    },
    loader: { ".css": "empty" },
    plugins: [{
      name: "stubs",
      setup(b) {
        b.onResolve({ filter: /\/AuthContext\.jsx$/ }, () => ({ path: join(scratch, "auth-stub.js") }));
        b.onResolve({ filter: /\/lib\/supabase\.js$/ }, () => ({ path: join(scratch, "supabase-stub.js") }));
        b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: join(scratch, "router-stub.js") }));
      },
    }],
    banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  });
  return import(pathToFileURL(outfile));
}
const rel = await load({ release: true });

const VIEWERS = {
  visitor: { user: null, isAdmin: false, loading: false },
  member: { user: { id: "u-member" }, isAdmin: false, loading: false },
  administrator: { user: { id: "u-admin" }, isAdmin: true, loading: false },
  "visitor, sign-in still loading": { user: null, isAdmin: false, loading: true },
  "administrator, sign-in still loading": { user: { id: "u-admin" }, isAdmin: true, loading: true },
};
const state = (viewer, flag, options = {}) => { globalThis.__viewer = VIEWERS[viewer]; return rel.probe(flag, options); };
const OPEN_IN_RELEASE = ["lock_world", "lock_number", "lock_gematria", "lock_books", "lock_els"];

test("the flags the release opens to everyone are open to every viewer, at once, with no read", () => {
  for (const flag of OPEN_IN_RELEASE) {
    assert.equal(rel.publicReadingFeatureLock(flag).enabled, false, `${flag} is open in the release policy`);
    for (const viewer of Object.keys(VIEWERS)) {
      for (const requireFlag of [true, false]) {
        const s = state(viewer, flag, { requireFlag });
        assert.equal(s.blocked, false, `${flag} · ${viewer} · requireFlag=${requireFlag}: not blocked`);
        assert.equal(s.loading, false, `${flag} · ${viewer}: nothing to wait for, so the rail never says locked while loading`);
        assert.equal(s.allowed, true);
      }
    }
  }
});

test("what the release keeps closed stays closed, and the visitor's ceiling is unchanged", () => {
  for (const flag of ["lock_heichal", "lock_life_journey", "lock_raziel_site"]) {
    assert.equal(rel.publicReadingFeatureLock(flag).enabled, true, `${flag} is closed in the release policy`);
    for (const viewer of ["visitor", "member"]) {
      const s = state(viewer, flag, { requireFlag: true });
      assert.equal(s.blocked, true, `${flag} · ${viewer}: closed`);
    }
    // while sign-in loads, a closed area stays pending (closed), exactly as before
    const pending = state("visitor, sign-in still loading", flag, { requireFlag: true });
    assert.equal(pending.loading, true);
    assert.equal(pending.blocked, true);
    // the administrator's closed areas are not changed by this fix (they still wait for the administrator's own read)
    assert.equal(state("administrator", flag, { requireFlag: true }).loading, true);
  }
});

test("the shape of the old failure: an administrator whose flag row did not come back is blocked by requireFlag", () => {
  // This is why an open flag must not depend on the administrator's read: the resolver fails closed without a flag row, even for the administrator.
  const failed = rel.resolveFeatureState(null, { user: { id: "u-admin" }, isAdmin: true, requireFlag: true });
  assert.equal(failed.blocked, true);
  const withRow = rel.resolveFeatureState({ enabled: false, mode: "all", message: "" }, { user: { id: "u-admin" }, isAdmin: true, requireFlag: true });
  assert.equal(withRow.blocked, false);
});

test("outside the release nothing changes: the hook still waits for its own read", async () => {
  const plain = await load({ release: false });
  globalThis.__viewer = VIEWERS.administrator;
  const s = plain.probe("lock_books", { requireFlag: true });
  assert.equal(s.loading, true, "a non-release build still asks the flag table");
});
