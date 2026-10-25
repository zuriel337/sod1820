# Owner-approved historical community biography

Branch: `gpt/community-manager-bios-20261025`.
Base: integrated central `aef4ac254927a6d534dbceb84a4e85bf9f90ef5d`.
Task: `COMMUNITY_MANAGER_BIOS_20261025`.
BEFORE: `17204066-582a-4a0c-b3ca-92a6c495642e`; refinement: `0f914b65-d1ec-4554-aaa2-18c9d32814c2`.

ZURIEL explicitly asked to add that Emily and Esther have managed the community for about ten years.
The supplied Emily screenshots identify `amiliy120` and show activity dated March 2016, before the
2023 start of the imported message archive. Management tenure is ZURIEL's statement; it is not an
account permission, a research capability, or a metric inferred from imported messages.

Emily is the verified existing source `e7581ab5-8c15-4832-b602-f361e41ff373`.
Her approved text is:

> מנהלת ותיקה בקהילת סוד 1820, פעילה ומלווה את הקהילה מזה כעשור.

The exact text was saved to her existing `contributors.bio` under the user's new explicit content
authorization. Her source dossier remains private, with unchanged kind and account binding. No
location, picture, email, role permission or private material was published.

The anonymous contributors reader correctly hides that private source dossier. Its bio is therefore
shown through the **existing** verified public archive-profile metadata, already used for approved
names, handles and historical likes. The source-only Person loader passes this explicit public
historical note to its existing bio field and renderer; it never fetches another private dossier's
bio or guesses an identity. There is no new profile store, public RPC, RLS policy or visual component.
The public annotation is a curated snapshot and must be kept consistent with later approved bio
edits until the canonical Person binding/public reader is completed.

An initial unshipped conditional-DB-bio approach was discarded when anonymous verification showed
the dossier remained inaccessible. Its unused `public_bio` JSON flag was removed with an exact
text/visibility guard; no flag, policy or permission change remains.

**Esther is pending identification.** Two distinct archive sources exist: `אסתר`
(`43276ef2-cc50-4fdd-b80c-c68876da6582`) and `Esther26`
(`99bcfb38-85be-4f38-89f0-7886f2f179e6`). A concise async question was sent to ZURIEL. Neither source
is edited or linked without the answer. Message volume is not identity evidence.

Checks: targeted loader, public projection, archive and writer-link tests; 2029 build and Production
lock. The local real-anonymous browser verifies Emily's existing bio panel at 390/1440, with API
responses unavailable and telemetry writes blocked. Final outcomes and exact HEAD are recorded in
the passive AFTER handoff. Tenure metrics, archive timestamps/counts, seven-axis meaning, R-ranks,
CSS and the pending Claude visual candidate are unchanged.

Only the isolated branch is committed/pushed. No main/central merge or Production deployment.
