import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizePeopleIdentityRow,
  filterPeopleIdentityRows,
  peopleIdentityCounts,
} from "../src/lib/research/peopleIdentityProjection.js";

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
assert.match(sql, /target_type='openweb_user'/i);
assert.match(sql, /contribution_links/i);
assert.match(sql, /research_contributions/i);
assert.doesNotMatch(sql, /openweb-'\|\|q\.source_id/i);
assert.doesNotMatch(sql, /jsonb_build_object\([^)]*'email'/is);
assert.doesNotMatch(sql, /\b(insert|update|delete|merge|truncate)\b\s+(?:into\s+|from\s+|table\s+)?public\./i);

console.log("people identity review 2029 contract: PASS");


const behavioral = [
  normalizePeopleIdentityRow({ source_id:"a", display_name:"Alpha", identity_state:"SITE_ACCOUNT_ANCHOR", site_account_match:true, site_username:"alpha", messages:4, active_days:2, blocked_ratio:0.1 }),
  normalizePeopleIdentityRow({ source_id:"b", display_name:"Beta", identity_state:"VERIFIED_UNIQUE_ANCHOR", email_verified:true, messages:8, active_days:4, blocked_ratio:0 }),
  normalizePeopleIdentityRow({ source_id:"c", display_name:"Gamma", identity_state:"VERIFIED_PRIMARY_WITH_COLLISION_TAIL", email_verified:true, historical_same_name_ids:3, verified_same_name_ids:1, blocked_ratio:0.02 }),
  normalizePeopleIdentityRow({ source_id:"d", display_name:"Delta", identity_state:"LONG_LIVED_UNVERIFIED", messages:140, active_days:60, blocked_ratio:0.04 }),
  normalizePeopleIdentityRow({ source_id:"e", display_name:"Noise", identity_state:"HIGH_BLOCK_NOISE", blocked_ratio:9 }),
];

assert.equal(behavioral[4].blockedRatio, 1, "normalization must clamp ratios to 1");
assert.deepEqual(peopleIdentityCounts(behavioral), {
  all: 5, site: 1, verified: 1, collision: 1, unclaimed: 1, review: 1,
});
assert.deepEqual(filterPeopleIdentityRows(behavioral, { filter:"site" }).map((x) => x.displayName), ["Alpha"]);
assert.deepEqual(filterPeopleIdentityRows(behavioral, { filter:"collision" }).map((x) => x.displayName), ["Gamma"]);
assert.deepEqual(filterPeopleIdentityRows(behavioral, { query:"alpha" }).map((x) => x.displayName), ["Alpha"]);
assert.deepEqual(filterPeopleIdentityRows(behavioral, { query:"עוגן מאומת" }).map((x) => x.displayName), ["Beta"]);
