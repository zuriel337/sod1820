import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("supabase/functions/g3-openweb-import-once/index.ts", "utf8");

assert.match(src, /status:\s*410/);
assert.match(src, /retired/i);
assert.doesNotMatch(src, /createClient/);
assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);
assert.doesNotMatch(src, /IMPORT_TOKEN|searchParams\.get\(["']token["']\)/);
assert.doesNotMatch(src, /g3_openweb_import_batch|g3_openweb_import_stage_batch/);
assert.doesNotMatch(src, /fetch\(source\)|csv-parse/);

console.log("g3-openweb-import-once retirement contract: OK");
