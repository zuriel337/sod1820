import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizePeopleIdentityRow,
  filterPeopleIdentityRows,
  peopleIdentityCounts,
} from "../src/lib/research/peopleIdentityProjection.js";
import {
  planPeopleIdentityAction,
  maySendHistoricalClaimInvite,
} from "../src/lib/research/peopleIdentityDecision.js";

const read = (p) => fs.readFileSync(p, "utf8");
const projection = read("src/lib/research/peopleIdentityProjection.js");
const decision = read("src/lib/research/peopleIdentityDecision.js");

assert.match(projection, /admin_people_identity_review_v1/);
assert.doesNotMatch(projection, /\.from\(["'](?:contributors|users|g3_openweb_import_stage)["']\)/);
assert.match(projection, /VERIFIED_PRIMARY_WITH_COLLISION_TAIL/);
assert.match(projection, /HIGH_BLOCK_NOISE/);
assert.match(projection, /ONE_DAY_THIN/);

assert.match(decision, /PRESERVE_SEPARATE/);
assert.match(decision, /INVITE_TO_CLAIM/);
assert.match(decision, /REVIEW_COLLISIONS_THEN_INVITE/);
assert.match(decision, /NO_OUTREACH/);
assert.match(decision, /ARCHIVE_ONLY/);
assert.match(decision, /HUMAN_REVIEW/);
assert.doesNotMatch(decision, /supabase|\.rpc\(|\.from\(/);
assert.match(decision, /מייל לא־מאומת אינו ראיית זהות/);

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
assert.deepEqual(filterPeopleIdentityRows(behavioral, { query:"עוגן מאומת" }).map((x) => x.displayName), ["Beta", "Gamma"]);

assert.equal(planPeopleIdentityAction(behavioral[0]).key, "REVIEW_EXISTING_ACCOUNT_LINK");
assert.equal(planPeopleIdentityAction(behavioral[1]).key, "INVITE_TO_CLAIM");
assert.equal(maySendHistoricalClaimInvite(behavioral[1]), true);
assert.equal(planPeopleIdentityAction(behavioral[2]).key, "REVIEW_COLLISIONS_THEN_INVITE");
assert.equal(maySendHistoricalClaimInvite(behavioral[2]), false);
assert.equal(planPeopleIdentityAction(behavioral[3]).key, "PRESERVE_UNCLAIMED");
assert.equal(planPeopleIdentityAction(behavioral[4]).key, "NO_OUTREACH");
assert.equal(
  planPeopleIdentityAction(behavioral[0], { preserveSeparate:true }).key,
  "PRESERVE_SEPARATE",
);
assert.equal(
  maySendHistoricalClaimInvite({ emailVerified:false, identityState:"REVIEW", siteAccountMatch:false }),
  false,
  "unverified historical email must never authorize outreach",
);

console.log("people identity projection infrastructure: PASS");
