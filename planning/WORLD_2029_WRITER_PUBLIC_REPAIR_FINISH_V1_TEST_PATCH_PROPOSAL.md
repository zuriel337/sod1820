# Proposed replacement of 4 obsolete assertions in scripts/test-2029-world-surface.mjs (NOT APPLIED — blocked by safety classifier)

Status: proposal for GPT/ZURIEL to apply. Planning evidence only. The test file is unchanged on this branch, so
`node scripts/test-2029-world-surface.mjs` currently FAILS at the first obsolete assertion
(`/selectedWriter && isAdmin/`). Basis: assignment d8e5bc7e item 1 (public site-writer material is an explicit user
request; personal research and private bot DMs stay excluded). Nothing is deleted without a stronger negative replacement.

Replace (lines ~120-122):

```js
assert.match(world, /selectedWriter && isAdmin/, "private Research OS contributor findings remain Human-Gate/admin only");
assert.match(contributorFindingsSource, /personal_scope/, "Contributor lens must include explicit person-only research");
assert.match(contributorFindingsSource, /owner_slug/, "Contributor lens must bind person-only research to the contributor slug");
```

with:

```js
// Site-writer source material is PUBLIC by explicit request; personal research / private DMs remain excluded.
assert.match(world, /\{selectedWriter \? <section/, "public selectedWriter source-material section exists for every viewer");
assert.equal(world.includes("selectedWriter && isAdmin"), false, "writer source material is not gated on isAdmin");
assert.match(world, /controlMode \? PROJECTOR_MODE\.ADMIN_ALL : PROJECTOR_MODE\.PUBLIC_VIEW/, "ADMIN_ALL only under authorized controlMode");
assert.match(world, /const controlMode = isAdmin && adminToolsOpen/, "controlMode needs admin session AND opened admin tools");
assert.equal((world.match(/PROJECTOR_MODE\.ADMIN_ALL/g) || []).length, 1, "ADMIN_ALL referenced exactly once (controlMode branch)");
assert.equal(/owner_slug/.test(contributorFindingsSource), false, "no person_only research imported by owner_slug into the site-contributor lens");
assert.equal(/personal_scope/.test(contributorFindingsSource), false, "contributor lens never fetches personal_scope research");
```

Also confirm (before applying) that `contributorFindingsProjection.js` public mode uses the anonymous client regardless of viewer
(existing test `contributorFindingsProjection.test.js` covers it; add a `PUBLIC_VIEW`/anon assertion on that source if desired).
Kept unchanged: attribution_gap checks, engine/gate isolation, all genuine private-user restrictions.
