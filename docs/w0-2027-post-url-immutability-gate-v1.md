# SOD1820 — W0 2027 POST ROOT URL IMMUTABILITY GATE V1

**Status:** W0 HARD ROUTE/SEO INVARIANT · DOCS ONLY · BRANCH ONLY · NOT IMPLEMENTED  
**Owner check:** `EXTEND_EXISTING` — existing routing/SEO/content owners; no new route registry, post store or URL owner.  
**Human Gate:** ZURIEL, 2026-09-09.

## 0. Live facts verified before this addendum

Canonical Supabase project: `linswmnnkjxvweumprav`.

Live `posts` snapshot at verification:
- total posts = **1288**;
- non-empty slugs = **1288**;
- distinct slugs = **1288**;
- missing slug = **0**.

Current `origin/main` application routing still contains the canonical root post route:

`/:slug → PostBySlugRoute`

The existing W0 route/SEO matrix already records 0 collisions between the current literal top-level route set and live `posts.slug` at its verification snapshot. That snapshot is evidence only; future route creation must re-check live state.

---

## 1. Hard invariant — individual post URLs do not move

SOD1820 is a long-lived site with more than a decade of inbound links, indexing and external references.

Therefore, for the 2027 architecture:

**INDIVIDUAL POST URL = ROOT `/:slug` — PRESERVE.**

The normal 2027 redesign program does **not** migrate individual posts to `/post/:slug`, `/world/post/:slug`, `/content/:slug`, or any other namespace.

This protection applies to:
- the canonical URL;
- the post slug;
- post identity;
- inbound links;
- canonical/OG/SEO metadata continuity;
- direct entry from search engines, bookmarks and external links.

A future exceptional migration of an individual/root post URL would require a separate explicit ZURIEL Human-Gate decision plus an inbound/SEO/canonical-redirect audit. It is not authorized by W0/W1/W2 or by ordinary Shell redesign.

---

## 2. `/post` has a different job

`/post` may remain or evolve as the **Posts listing / Discover entry / archive-style navigation surface**.

It may appear clearly in the new Sidebar hierarchy as `פוסטים`.

This does **not** make `/post` the parent path of individual posts.

Expected navigation semantics:

`Sidebar → פוסטים → /post → user opens an item → /<existing-slug>`

So the new navigation can become clean and hierarchical without rewriting ten years of public post addresses.

---

## 3. Posts are a protected subset of Route Class A

The general W0 Class-A rule says high-value public identity/SEO addresses must be preserved or deliberately migrated only after audit.

Posts receive a stricter rule:

**POST-A / ROOT-IMMUTABLE**

Default disposition:
- presentation = `ADAPT`;
- reading renderer = may redesign;
- surrounding list/category/discovery surfaces = may adapt/consolidate after parity/audit;
- content/source ownership = preserved;
- individual canonical URL = **immutable by default**;
- root slug = **reserved against future product routes**.

`Preserve capability, not legacy interface` does not authorize changing the canonical root URL of a post.

---

## 4. Mechanical top-level route collision gate

Before registering **any new literal top-level route** in the 2027 product, the implementation/release gate must compare the proposed first path segment against **live `posts.slug`**.

Examples requiring the gate:
- `/world`
- `/studio`
- `/inbox`
- `/מסעות`
- `/עולם`
- any future single-segment root product route.

### PASS
No live post owns that slug → route may continue through normal owner/SEO/release review.

### COLLISION
A live post already owns that slug → **the new product route loses by default**.

Required response:
1. do not shadow the post;
2. choose another name or a namespaced route;
3. do not silently redirect the post;
4. do not rename the post merely for product-navigation convenience;
5. only an explicit exceptional Human-Gate migration may override this rule.

The collision gate must happen **before** route registration/merge, not after a production regression.

---

## 5. Live check beats static slug list

A static export of all current slugs may be kept as audit evidence, but it is **not** the authority and must never become a second URL registry.

Reason: the moment a new post is published, a 1288-item snapshot is stale.

Canonical check source remains:

`public.posts.slug` in canonical Supabase.

Preferred implementation direction for W1/build-gate work:
- mechanical preflight/CI or release check against the live/canonical content source;
- fail loudly on collision;
- report the conflicting post identity/slug;
- no automatic rename of either side.

If CI cannot safely query production, a generated snapshot may assist CI **only when paired with a release-time live check**. Snapshot ≠ SSOT.

---

## 6. Publication and research separation remains unchanged

Protecting post URLs does not merge Content Publication with Research Intake.

- a published post remains a content/source object under its existing publishing owner;
- a research claim extracted from a post is separately verified/governed;
- post publication does not imply research truth;
- research canonicalization does not require changing or republishing the source post;
- the 2027 World may connect the post to Numbers, Topics, Books, ELS, Persons, Events and Findings without altering the post URL.

---

## 7. W1 / future acceptance rule

Any Shell/Sidebar/routing work touching public navigation fails acceptance if it causes any of the following:

- an existing root post URL stops resolving to its post;
- a new literal route shadows an existing post slug;
- an individual post is moved under `/post/` without a separate Human-Gate migration;
- canonical metadata silently changes to a new path;
- a missing/conflicted post is silently replaced by Home or another product surface.

Expected invariant after migration:

**New Shell around old durable addresses.**

The interface may change A→Z; the root post address remains stable.

---

## 8. Relationship to existing W0 documents

This is a hardening addendum to, not a replacement for:
- `docs/w0-2027-route-seo-addressability-matrix-v1.md` §3 Root-post slug reservation law;
- Roadmap v5.4 direct-route/SEO continuity invariants;
- existing observability/SEO build gate;
- existing content/publishing ownership.

If generic Class-A wording can be read as permitting routine migration of root posts, this addendum is the more specific rule for Posts.

`POST URL PROTECTION != LEGACY UI PROTECTION`.

No route code, post row, slug, canonical URL, redirect or schema was changed by this document.
