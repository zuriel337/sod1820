# Decisions that are missing (one place, plain language)

Nothing below was decided by the extraction. Each line is a question for ZURIEL; the package that raised it has the detail. Releases (merge, SQL apply, deployment, ruleset change) are separate approvals for exact commits; none was done.

> **Update 14.11.2026 (evening):** ZURIEL adopted the choices listed in section 0b (journal `d558163b`, "ZURIEL POLICY CHOICES", 20:34 UTC). The items they answer are marked **ADOPTED** below and are **not asked again**; they are policy preferences, not approvals to merge, deploy, run SQL, change a ruleset or delete. The current text of the choices and how the package reflects them is in section 6 of [`foundation-package-20261114.md`](foundation-package-20261114.md).

## 0. Already approved by ZURIEL — pending implementation (not an open question)

| # | Decision (approved) | Status in the extracted packages | What implementation still needs |
|---|---|---|---|
| A-1 | **Visitor identification**: measure pages and arrival sources; a **browser identifier for guests**, an **account identifier for signed-in members**, detail visible to the administrator. The older "anonymous by default" position is not restored. | **Pending implementation.** Pages: implemented (P4, PR #1337). Browser id: only on visits (`track_visit`), not on engagement / actions / content views / arrival. Account id: **not implemented anywhere**. Administrator detail: partly (the `site_visits` readers are more correct after P4; the new terminal's reader does not see the public build's visits). | Design, not a new approval of the decision: which browser id the events carry (`sod_vid` or `sod_id`); a database function that records the signed-in user on the server and the worker forwarding the member's token for that one call (a client-supplied account id is only a claim; today the worker answers every measurement request with the anonymous key); the validators and worker tests that state "no identity" are changed in the same change; the new terminal's reader (`page/view` events) or `site_visits` declared canonical. Detail: `docs/reviews/measurement-20261113/identity-gap.md` (PR #1337). |

The open design questions that belong to A-1 are in section B, items 7a–7c. They do not reopen the decision.


## 0b. Adopted by ZURIEL on 14.11.2026 (policy choices, not execution approvals)

| Item | Adopted |
|---|---|
| D-1 (gallery size) | 120 MiB limit per **new** gallery file (not a total capacity); existing files retained |
| N-3 (`note.parent_message_id`) | retain the opaque parent identifier, without exposing hidden message content; the technical review verifies the scope (done by Codex, aggregates only) |
| O-3 / O-4 (required checks) | required checks after the CI fix; the administrator bypass is kept only for a documented emergency on ZURIEL's explicit instruction |
| O-1 / O-2 (CL-16) | CL-16 is part of the reviewed package; ordinary future law correction uses a new version rather than reviving a retired one; conditional on a controlled rollback of the guard itself |
| O-7 (DDL) | planned for measured low traffic, sequential steps with verification; on a lock timeout stop and inspect, no automatic retry loop |
| non-bypass identity | none confirmed; none is inferred; no claim that enforcement was exercised on one |

## A. Product / content

1. **Upload size, gallery (P1, D-1).** Today a visitor can upload a file of any size to the gallery. The security change (who may upload where, and which file types) does not depend on the answer. May the gallery refuse files above **120 MiB**? **ADOPTED 14.11.2026: yes, 120 MiB per new file, existing files retained (section 0b); the SQL header records the adoption.**
2. **Unverified findings «טרם אומת» (P3, README §13).** Where else may they show before entry: Zvi's own lists and the Beit Midrash examples? researcher pages? video, single book, ELS? Is the wording next to «מצב בדיקה: אומת» clear? Is a third of the feed window the right share? One uniform label in admin tables? **Confirm the stricter admission** (a candidate with a phone number, e-mail, owner mention, excluded material, no research role or a non-live source stays out of the feed and out of opening by id, as on the finding pages). Apply the same contact-detail check to the share-card endpoint?
3. **Contract pointer (P3).** Approve the database write that points `canonical_ui_components_law` to Design Contract V2 §8.3? And attach the dated approval record of ZURIEL's 12.11 decision (the G1 rule only checks that a dated "Human Gate" line exists; whether the decision is authentic is a human gate).
4. **Two upload routes the public worker already blocks (P1, D-2).** The anonymous report-a-hint photo and the signed-in cipher card fail in the worker today. Open them in the worker or close them on the server too?
5. **N14 — public `/number/<n>` links from Raziel / ai-analyze / wa-raziel (deferred with Raziel; 22 files).** Ship it together with the next Edge bundle, or drop it?

## B. Measurement (P4)

6. **Visit counts change at the release date** (the double rows disappear, the missing in-app page views appear; unique visitors unchanged; old periods are not comparable). Where should the marker be recorded (admin note on the history table, a day-context field, the law text), and do you want a de-duplicated historical series (D1, D7)?
7. **Visitor identification — the approved decision (A-1) is pending implementation; these are design questions for it, not a new decision.**
   * 7a. **Which id and where.** Should engagement, actions, content views and arrival carry the browser id, and which one (the visit's `sod_vid` or the identity spine's `sod_id`; the database very probably then creates a person for every public browser) (D2)?
   * 7b. **Account id.** The worker must forward the member's token for these calls and a database function must record the user on the server; the browser alone cannot do it safely (D3). Approve building both (a database step and a worker change)?
   * 7c. **Reading it.** Should the new terminal read `page/view` events with identity, or should `site_visits` be declared canonical (D4)? Adapt the arrival / share / join / hot-posts readers to `events` (D5)? Wider arrival detail (utm, click ids, GA4/Meta) (D6)? Are the budgets right (120 visits, 240 engagement, 60 actions per window per 10 minutes) (D8)?

## C. Enforcement and release (P2)

8. **CL-16 timing.** "Apply after M0" has no technical reason (all 23 M0 SQL files were read; none touches the rule tree). Keep it as a scheduling preference, or release it (O-1)? **ADOPTED 14.11.2026: CL-16 is part of the reviewed package (section 0b); it is its own line (D10) of the execution request.**
9. **Law v7 rollback.** After CL-16 the documented rollback of the law v7 supersession no longer runs (it would be a revival). Accept, run it first, or approve a revival then (O-2)? **ADOPTED 14.11.2026: ordinary future law correction uses a new version; the old v7 rollback stays refused as a revival and it is not claimed to work under the new guard; the controlled rollback of the guard itself is what is verified.**
10. **Required checks.** Approve the nine names that can be required with no workflow change (O-3) **(ADOPTED 14.11.2026: after the CI fix, K1 after R1)**; keep or remove the admin bypass of the ruleset (O-4) **(ADOPTED: kept, only for a documented emergency on ZURIEL's explicit instruction)**; never require `Production Canary Gate` (O-5); rename the two jobs called `gate` and later add the aggregator for the four path-filtered gates (O-6). Changing the ruleset is a separate approval.
11. **Restriction sources** (O-7) and **approval for every new store under an existing owner** (O-8).

## D. Release order

12a. **Merge method (new, from the ruleset read of 13.11).** `protect-main` has `required_linear_history`, so a merge commit on `main` is possible only under the admin bypass. The release requests ask for a **squash merge** (one commit; the approval is for the content of the head, checked by tree equality after the merge). Alternatives: rebase merge, or a merge commit under the bypass (recorded as a bypass). Which one?
12b. **How to prove that required checks hold (new).** A red pull request tried under an identity that bypasses the ruleset proves nothing. The request for the ruleset asks for the check on a non-bypass identity (a collaborator without the admin role); without such an identity the result must be reported as "rule present, enforcement not exercised against a non-bypass identity". Is there an account for that test, or is the admin bypass (O-4) decided first? **ANSWER 14.11.2026: no account for that test was confirmed and none is inferred; the result is reported as "rule present, enforcement not exercised against a non-bypass identity".**
12. **Database.** Each step is its own approval for an exact commit. P1: steps 1, 2, 4, 5, 6, 7, 8, 9, 10 (step 9 after step 1; step 8 no longer waits: decision 1 is adopted). P3: step 11 (the new site works before or after it; old tabs keep working). P2: CL-16 (independent). No step of one package depends on a step of another.
13. **Code.** The four pull requests touch different lines of `live-contracts-2029.yml` and merge in any order (trial integration of all four: no textual conflict; 121 contract tests, the 51 G1 smoke tests and the 53 enforcement scenarios pass on the merged tree). Merging code is not a deployment and applies no SQL.
14. **Edge.** The Edge bundles of #1321 stay out. Before any future M0 Edge deployment its rollback manifests must be refreshed so that the live `wa-raziel` v22 and `ai-analyze` v92 are retained (Codex review note).
