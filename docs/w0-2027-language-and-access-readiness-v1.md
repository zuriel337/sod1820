# SOD1820 — W0 2027 LANGUAGE + ACCESS/PREMIUM READINESS V1

**Status:** W0 REQUIREMENT · EXTEND_EXISTING · DOCS ONLY · NOT IMPLEMENTED · NO RELEASE

**Human Gate:** ZURIEL, 2026-09-09

## 0. Decision

Before W1 UI implementation, the 2027 product architecture must be structurally ready for both:

1. **multi-language projection**, and
2. **future Premium / Deep Premium / registered / private / admin access projection**.

This does **not** activate translations, subscriptions, payments or premium delivery now. It means the Shell, Research Context, routing, identity, World projections, Heichal, My Workspace, Raziel, Books, Number, ELS, Posts and future admin surfaces must be designed so those capabilities can be enabled later **without a structural rewrite**.

OWNER CHECK = **EXTEND_EXISTING**.

Existing owners remain authoritative:
- `content_translation_law` — language/localization projection;
- `site_flags_lock_law` — global capability availability (open / closed / registered-only / admin bypass);
- `truth_axes_foundation_law` — publication/access is orthogonal to truth/governance;
- existing auth/security/access owners — authorization and caller identity;
- `subscription_architecture` — existing conceptual subscription direction, not yet treated as implemented billing/entitlement runtime;
- Product Map / System Frame / Research Context owners — presentation and continuity only, never independent access truth.

No new language store, premium store, entitlement engine, lock law, route tree or parallel product state is created by this requirement.

---

## 1. Language-ready invariant

**Language changes representation; it must not fork product identity or research state.**

A locale change must preserve, where valid:
- stable entity identity;
- current focus;
- Research root;
- Journey/path position;
- Heichal tool/context;
- exact source/ELS/book locus;
- return/reopen target;
- authorization/access state;
- saved/personal ownership state.

Example:

`1820 → Book → Passage 42 → Heichal`

Switch Hebrew → English:

`1820 → same Book identity → same Passage identity → same Heichal context`

Only the available localized representation/copy changes.

### Global action

W0 reserves one semantic capability:

`change_language`

Its UI placement is not canonical. It may appear in Header, account/More, command palette, mobile sheet or other adaptive projection.

### Directionality

The Shell must be designed using logical layout semantics so it can support:
- Hebrew / Arabic → RTL;
- English / French / Spanish / Portuguese / German / Russian → LTR.

Do not build a Hebrew layout that later requires a second English layout. Responsive composition may adapt, but capability identity and navigation semantics stay one.

---

## 2. Premium/access-ready invariant

**Access changes retrieval and available controls; it never changes truth.**

The 2027 architecture must be able to project the same stable identity at different authorized depths without duplicating the entity or building separate premium pages.

Target access projections remain conceptually:
- Public;
- signed-in / registered where applicable;
- Premium;
- Deep Premium;
- Admin Research / privileged roles.

These are access projections, not truth ranks.

### Critical distinction

Three questions must remain separate:

1. **Is the capability globally available?** → `site_flags_lock_law`.
2. **Is this caller entitled/authorized to retrieve it?** → auth/access/entitlement owner.
3. **What is the publication/access state of this knowledge/content object?** → truth/publication-access owner.

Do not collapse those into one `premium=true` field or page-local lock.

---

## 3. Content locking / opening requirement

Future ZURIEL control must allow content/capabilities to be exposed or restricted through canonical owners without redesigning every surface.

The architecture must support, where the applicable owner allows:
- public content;
- registered-only content;
- Premium content;
- deeper authorized Premium content;
- private/personal content;
- admin-only/raw/candidate/unresolved content;
- globally paused/under-construction capabilities.

### Projection rule

A locked item may still have a safe public projection when product/SEO policy allows, for example:
- title/identity;
- bounded teaser/summary;
- access requirement;
- permitted metadata.

But unauthorized payload must not be sent to the client and hidden with CSS.

**Server/data boundary first; UI lock second.**

---

## 4. Same URL / same identity where possible

Premium must not create a second site such as:
- `/premium-number/1820` as a duplicate identity;
- `/en-number/1820` as a duplicate semantic identity;
- separate Premium World / Premium Book / Premium ELS truth stores.

Preferred model:

`stable identity + context + locale projection + authorized depth projection`

The exact URL/localization strategy is resolved later under SEO/localization work, but semantic identity remains one.

A deep link to an inaccessible destination must resolve honestly to an access-gated projection, not silently redirect to unrelated content or pretend the underlying data was loaded.

---

## 5. Shell requirements before W1

The Adaptive Shell must be ready to consume, without owning:
- locale/direction state;
- access/entitlement state;
- account identity;
- capability availability;
- current focus/context;
- safe access depth indicator where useful.

Potential surfaces:
- Global Orientation Header may expose compact language/access/account controls;
- Command Surface may expose `change_language`, `open_account`, upgrade/access actions where authorized;
- My Workspace owns user-facing account/subscription/entitlement projection;
- World/Book/Number/Post/ELS renderers consume access decisions;
- Raziel consumes only the same authorized context/payload available to the caller.

Raziel must never reveal deeper content merely because the model can infer or retrieve it through another path.

---

## 6. Premium-ready does not mean billing-ready

W0 must not pretend subscription/payment infrastructure is complete.

The requirement is architectural readiness:
- no page-specific premium hardcoding;
- no client-only hiding of protected payloads;
- no duplicated Premium identities;
- no entitlement logic inside visual components;
- no premium-specific truth taxonomy;
- no locale-specific premium state;
- no separate Raziel memory/truth per tier.

Actual commercial packaging, payment provider integration, entitlement issuance/revocation, pricing, trials, renewal, cancellation and billing recovery remain later gated work under their existing/future-resolved owners.

---

## 7. Cross-product acceptance requirements

Before affected surfaces are called ready, prove at the relevant implementation/release gates:

1. locale switch preserves identity/context and changes RTL/LTR correctly;
2. locale switch does not fork saved research/Journey state;
3. public user cannot retrieve Premium/private payload through direct API/deep link/cache/Raziel;
4. access change while a page is open is revalidated at the next protected action/read as designed;
5. logout/account switch cannot retain privileged payload in personal/AI/context surfaces;
6. same entity can render public vs authorized depth without duplicate identity;
7. globally closed capability remains closed in every locale and every launcher;
8. Premium/Deep prominence never implies stronger truth;
9. exact return/reopen handles lost entitlement honestly;
10. mobile/desktop both preserve the same language/access semantics.

---

## 8. Sequence decision

The intended order is:

**W0 architecture closure**
→ **independent Claude challenge + reconciliation**
→ **Visual Foundation / Design tokens**
→ **W1 Adaptive Shell built language-ready + access-ready**
→ **later localization/translation implementation under `content_translation_law`**
→ **later Premium/subscription/entitlement implementation and release gates**

Thus the design can be finalized once, with the structural hooks already present, instead of reopening the global shell when languages or Premium are activated.

---

## 9. Non-claims

This document does not claim:
- Premium is currently implemented;
- billing/subscription runtime is production-ready;
- every existing content row already has an access classification;
- all translations already exist;
- locale-aware SEO routing is already resolved;
- current UI lock behavior is complete across every route.

Those are verified separately at their relevant workstreams.

**W0 remains ACTIVE.**
