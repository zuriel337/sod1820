# Decisions that are missing (one place, plain language)

Nothing below was decided by the extraction. Each line is a question for ZURIEL; the package that raised it has the detail. Releases (merge, SQL apply, deployment, ruleset change) are separate approvals for exact commits; none was done.

## 0. Already approved by ZURIEL — pending implementation (not an open question)

| # | Decision (approved) | Status in the extracted packages | What implementation still needs |
|---|---|---|---|
| A-1 | **Visitor identification**: measure pages and arrival sources; a **browser identifier for guests**, an **account identifier for signed-in members**, detail visible to the administrator. The older "anonymous by default" position is not restored. | **Pending implementation.** Pages: implemented (P4, PR #1337). Browser id: only on visits (`track_visit`), not on engagement / actions / content views / arrival. Account id: **not implemented anywhere**. Administrator detail: partly (the `site_visits` readers are more correct after P4; the new terminal's reader does not see the public build's visits). | Design, not a new approval of the decision: which browser id the events carry (`sod_vid` or `sod_id`); a database function that records the signed-in user on the server and the worker forwarding the member's token for that one call (a client-supplied account id is only a claim; today the worker answers every measurement request with the anonymous key); the validators and worker tests that state "no identity" are changed in the same change; the new terminal's reader (`page/view` events) or `site_visits` declared canonical. Detail: `docs/reviews/measurement-20261113/identity-gap.md` (PR #1337). |

The open design questions that belong to A-1 are in section B, items 7a–7c. They do not reopen the decision.


## A. Product / content

1. **Upload size, gallery (P1, D-1).** Today a visitor can upload a file of any size to the gallery. The security change (who may upload where, and which file types) does not depend on the answer. May the gallery refuse files above **120 MiB**? (Marked in the SQL file as not confirmed.)
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

8. **CL-16 timing.** "Apply after M0" has no technical reason (all 23 M0 SQL files were read; none touches the rule tree). Keep it as a scheduling preference, or release it (O-1)?
9. **Law v7 rollback.** After CL-16 the documented rollback of the law v7 supersession no longer runs (it would be a revival). Accept, run it first, or approve a revival then (O-2)?
10. **Required checks.** Approve the nine names that can be required with no workflow change (O-3); keep or remove the admin bypass of the ruleset (O-4); never require `Production Canary Gate` (O-5); rename the two jobs called `gate` and later add the aggregator for the four path-filtered gates (O-6). Changing the ruleset is a separate approval.
11. **Restriction sources** (O-7) and **approval for every new store under an existing owner** (O-8).

## D. Release order

12. **Database.** Each step is its own approval for an exact commit. P1: steps 1, 2, 4, 5, 6, 7, 8, 9, 10 (step 9 after step 1; step 8 waits for decision 1). P3: step 11 (the new site works before or after it; old tabs keep working). P2: CL-16 (independent). No step of one package depends on a step of another.
13. **Code.** The four pull requests touch different lines of `live-contracts-2029.yml` and merge in any order (trial integration of all four: no textual conflict; 121 contract tests, the 51 G1 smoke tests and the 53 enforcement scenarios pass on the merged tree). Merging code is not a deployment and applies no SQL.
14. **Edge.** The Edge bundles of #1321 stay out. Before any future M0 Edge deployment its rollback manifests must be refreshed so that the live `wa-raziel` v22 and `ai-analyze` v92 are retained (Codex review note).
