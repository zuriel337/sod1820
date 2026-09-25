import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const projection = read("src/lib/research/peopleIdentityProjection.js");
const page = read("src/pages/PeopleIdentityReview2029Page.jsx");
const sql = read("docs/g3-people-identity-review-admin-rpc-v1.sql");
const app = read("src/App2029.jsx");

assert.match(projection, /admin_people_identity_review_v1/);
assert.doesNotMatch(projection, /\.from\(["'](?:contributors|users|g3_openweb_import_stage)["']\)/);
assert.match(projection, /VERIFIED_PRIMARY_WITH_COLLISION_TAIL/);
assert.match(projection, /HIGH_BLOCK_NOISE/);
assert.match(projection, /ONE_DAY_THIN/);

assert.match(page, /useAuth/);
assert.match(page, /!isAdmin/);
assert.match(page, /אין מיילים גולמיים במסך/);
assert.match(page, /אין Merge \/ Claim \/ Delete/);
assert.doesNotMatch(page, /email\s*[:=]/i);

// Current branch intentionally does not wire a route while App2029 has another active writer.
assert.doesNotMatch(app, /PeopleIdentityReview2029Page/);
assert.doesNotMatch(app, /\/2029\/admin\/people/);

assert.match(sql, /create or replace function public\.admin_people_identity_review_v1/i);
assert.match(sql, /security definer/i);
assert.match(sql, /rd_is_admin\(\)/i);
assert.match(sql, /revoke all on function public\.admin_people_identity_review_v1\(text, integer\) from public, anon/i);
assert.match(sql, /grant execute on function public\.admin_people_identity_review_v1\(text, integer\) to authenticated/i);
assert.doesNotMatch(sql, /jsonb_build_object\([^)]*'email'/is);
assert.doesNotMatch(sql, /\b(insert|update|delete|merge|truncate)\b\s+(?:into\s+|from\s+|table\s+)?public\./i);

console.log("people identity review 2029 contract: PASS");
