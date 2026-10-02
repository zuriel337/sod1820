import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const migration = fs.readFileSync(
  "supabase/migrations/20261002183846_name_shared_numbers_jsonb_cast_fix_v1.sql",
  "utf8",
);

test("fn_shared_numbers guards jsonb cast before integer conversion", () => {
  assert.match(
    migration,
    /case\s+when\s+jsonb_typeof\(m\.value\)\s*=\s*'number'[\s\S]*?then\s+\(m\.value\s*#>>\s*'\{\}'\)::int[\s\S]*?else\s+null[\s\S]*?end\s+as\s+val/i,
  );
});

test("fn_shared_numbers keeps compatibility metadata out of numeric rows", () => {
  assert.match(migration, /where\s+val\s+is\s+not\s+null\s+and\s+val\s*>\s*0/i);
  assert.doesNotMatch(migration, /\(m\.value\)::int/i);
});

test("fix preserves existing excluded high-cost methods", () => {
  for (const key of ["הכפלה", "הכפלה_גדול", "קדמי_גדול", "ריבוע_גדול"]) {
    assert.ok(migration.includes(key), `missing preserved exclusion: ${key}`);
  }
});
