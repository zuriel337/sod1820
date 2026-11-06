import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("save panel: a guest sees a sign-in link, only a member gets the form and the library links", async () => {
  const panel = await read("src/components/experience2029/ElsSavePanel2029.jsx");
  assert.match(panel, /!user \? <div className="els29-native-save-guest">/);
  assert.match(panel, /href="\/login"/);
  assert.match(panel, /\{user \? <a className="sod29-action" href="\/els\?library=mine">/);
  // The member path is unchanged: private by default, explanation required.
  assert.match(panel, /isPublic: false/);
  assert.match(panel, /description\.trim\(\)\.length >= 12/);
});

test("library: owner actions exist only on the personal, non-compact view", async () => {
  const library = await read("src/components/experience2029/ElsSavedLibrary2029.jsx");
  assert.match(library, /personal && !compact && onChanged \? <CipherOwnerActions/);
  assert.match(library, /<CipherCard key=\{row\.id\} row=\{row\} personal=\{personal\} onOpen=\{onOpen\} onChanged=\{data\.reload\} \/>/);
  // The compact folder never offers destructive actions.
  assert.match(library, /<CipherCard key=\{row\.id\} row=\{row\} personal=\{!!user\} compact onOpen=\{onOpen\} \/>/);
  // Approved (published) evidence cannot be renamed or deleted from the owner UI.
  assert.match(library, /const approved = row\.status === "published"/);
  assert.match(library, /\{approved \? null : <button[^\n]*>שנה שם/);
  assert.match(library, /\{approved \? null : <button[^\n]*>מחק</);
  // Deleting and making public both require an explicit confirmation step.
  assert.match(library, /aria-label="אישור מחיקה"/);
  assert.match(library, /aria-label="אישור הצגה בתיק הציבורי"/);
});

test("data layer and migration: owner-only RPCs, published rows locked, anon has no access", async () => {
  const lib = await read("src/lib/elsMatrices.js");
  assert.match(lib, /rpc\("rename_my_els_matrix", \{ p_id: id, p_title: title \}\)/);
  assert.match(lib, /rpc\("delete_my_els_matrix", \{ p_id: id \}\)/);
  const sql = await read("supabase/migrations/20261106090000_els_owner_manage_v1.sql");
  for (const fn of ["rename_my_els_matrix", "delete_my_els_matrix"]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}[^;]*from public, anon`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}[^;]*to authenticated`));
  }
  assert.equal((sql.match(/security definer/g) || []).length, 2);
  assert.equal((sql.match(/set search_path to 'public'/g) || []).length, 2);
  assert.equal((sql.match(/'not_owner'/g) || []).length, 2);
  assert.equal((sql.match(/'published_locked'/g) || []).length, 2);
  assert.match(sql, /delete from public\.els_records where id = p_id/);
});

test("tool dock: one labelled straight row for Classic and Research", async () => {
  const css = await read("src/components/experience2029/systemToolDock2029.css");
  assert.match(css, /\[data-tool-owner\]:not\(\.has-context-trail\)\{\s*display:flex;flex-direction:row;flex-wrap:nowrap/);
  assert.match(css, /\.sod29-bar-zone\{display:contents\}/);
  assert.match(css, /\.sod29-bar-zone>button>small\{\s*position:static;display:block/);
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.doesNotMatch(native, /id: "search", label: "חיפוש בצופן"/);
  assert.match(native, /\["findings", "סריקה וממצאים", "סריקה", "els"\], \["results", "תוצאות", "תוצאות", "posts"\], \["research", "שמירה", "שמירה", "books"\]/);
});

test("public release: Research is open, AI shows 'soon', four dock tools in one row", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /const aiAvailable = !publicClassic && Boolean\(matrixReading \|\| typeof onRazielMatrix === "function"\)/);
  assert.match(native, /shortLabel: "AI בקרוב", icon: "discovery", disabled: true/);
  assert.match(native, /data-soon="true"/);
  const dock = await read("src/components/experience2029/SystemToolDock2029.jsx");
  assert.match(dock, /disabled=\{action\.disabled\}/);
  assert.match(dock, /if \(!action\.disabled\) onInvoke/);
  const switcher = await read("src/components/experience2029/ElsMatrixProfileSwitch.jsx");
  assert.match(switcher, /allowed\.includes\(option\.key\)/);
  const worker = await read("public-reading-deploy/transport.js");
  // Publication stays administrator-only: only rename and delete of the member's own record are admitted.
  assert.match(worker, /rpc === "rename_my_els_matrix" \|\| rpc === "delete_my_els_matrix"/);
  assert.doesNotMatch(worker, /rpc === "self_publish_matrix"/);
  const library = await read("src/components/experience2029/ElsSavedLibrary2029.jsx");
  assert.match(library, /publicReadingActionsLocked\(isAdmin\)/);
});
