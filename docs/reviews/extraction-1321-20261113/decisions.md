# Decisions that are missing (one place, plain language)

Nothing below was decided by the extraction. Each line is a question for ZURIEL; the package that raised it has the detail. Releases (merge, SQL apply, deployment, ruleset change) are separate approvals for exact commits; none was done.

## A. Product / content

1. **Upload size, gallery (P1, D-1).** Today a visitor can upload a file of any size to the gallery. The security change (who may upload where, and which file types) does not depend on the answer. May the gallery refuse files above **120 MiB**? (Marked in the SQL file as not confirmed.)
2. **Unverified findings «טרם אומת» (P3, README §13).** Where else may they show before entry: Zvi's own lists and the Beit Midrash examples? researcher pages? video, single book, ELS? Is the wording next to «מצב בדיקה: אומת» clear? Is a third of the feed window the right share? One uniform label in admin tables? **Confirm the stricter admission** (a candidate with a phone number, e-mail, owner mention, excluded material, no research role or a non-live source stays out of the feed and out of opening by id, as on the finding pages). Apply the same contact-detail check to the share-card endpoint?
3. **Contract pointer (P3).** Approve the database write that points `canonical_ui_components_law` to Design Contract V2 §8.3? And attach the dated approval record of ZURIEL's 12.11 decision (the G1 rule only checks that a dated "Human Gate" line exists; whether the decision is authentic is a human gate).
4. **Two upload routes the public worker already blocks (P1, D-2).** The anonymous report-a-hint photo and the signed-in cipher card fail in the worker today. Open them in the worker or close them on the server too?
5. **N14 — public `/number/<n>` links from Raziel / ai-analyze / wa-raziel (deferred with Raziel; 22 files).** Ship it together with the next Edge bundle, or drop it?

## B. Measurement (P4)

6. **Visit counts change at the release date** (the double rows disappear, the missing in-app page views appear; unique visitors unchanged; old periods are not comparable). Where should the marker be recorded (admin note on the history table, a day-context field, the law text), and do you want a de-duplicated historical series (D1, D7)?
7. **Identity.** Browser id for guests exists on visits only; **account id for signed-in users does not exist anywhere** and cannot be sent safely from the browser (the worker answers every measurement request with the anonymous key). What should be built, and with which id (D2, D3)? Should the new admin terminal read `page/view` events with identity, or should `site_visits` be declared canonical (D4)? Adapt the arrival / share / join / hot-posts readers to `events` (D5)? Wider arrival detail (utm, click ids, GA4/Meta) (D6)? Are the budgets right (120 visits, 240 engagement, 60 actions per window per 10 minutes) (D8)?

## C. Enforcement and release (P2)

8. **CL-16 timing.** "Apply after M0" has no technical reason (all 23 M0 SQL files were read; none touches the rule tree). Keep it as a scheduling preference, or release it (O-1)?
9. **Law v7 rollback.** After CL-16 the documented rollback of the law v7 supersession no longer runs (it would be a revival). Accept, run it first, or approve a revival then (O-2)?
10. **Required checks.** Approve the nine names that can be required with no workflow change (O-3); keep or remove the admin bypass of the ruleset (O-4); never require `Production Canary Gate` (O-5); rename the two jobs called `gate` and later add the aggregator for the four path-filtered gates (O-6). Changing the ruleset is a separate approval.
11. **Restriction sources** (O-7) and **approval for every new store under an existing owner** (O-8).

## D. Release order

12. **Database.** Each step is its own approval for an exact commit. P1: steps 1, 2, 4, 5, 6, 7, 8, 9, 10 (step 9 after step 1; step 8 waits for decision 1). P3: step 11 (the new site works before or after it; old tabs keep working). P2: CL-16 (independent). No step of one package depends on a step of another.
13. **Code.** The four pull requests touch different lines of `live-contracts-2029.yml` and merge in any order (trial integration of all four: no textual conflict; 121 contract tests, the 51 G1 smoke tests and the 53 enforcement scenarios pass on the merged tree). Merging code is not a deployment and applies no SQL.
14. **Edge.** The Edge bundles of #1321 stay out. Before any future M0 Edge deployment its rollback manifests must be refreshed so that the live `wa-raziel` v22 and `ai-analyze` v92 are retained (Codex review note).
