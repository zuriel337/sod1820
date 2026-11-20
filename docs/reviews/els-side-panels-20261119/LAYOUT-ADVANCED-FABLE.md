# ELS tool placement — ZURIEL approved layout

Branch ccr-06bc2910-pgarr4. Main 0def5fafe merged into this branch before implementation. No new branch or global frame changes.

Desktop retains pinned inspectors on the left of the matrix (Discovery independently open plus findings/results/save). Mobile retains inline inspectors below the matrix, with a two-column local tool strip. Advanced search is moved out of the top query box into a full-width collapsible section below the matrix. Its summary reports the term, corpus, skip range, changed settings and active work. Collapsing preserves the mounted form/results and does not cancel work; choosing another search mode retains the existing stop behavior. Fullscreen uses the same form in an on-demand overlay, so a closed search does not consume matrix height.

Discovery exposes “הרחב עם Fable” beside the local launch, opening the existing lazy card with cost/coverage and explicit submit. It no longer requires the depth tab followed by a disclosure. No backend flag, environment variable, provider request, limits, deduplication or results algorithm changed. Manual word search remains available. The existing card still gates paid work; opening options is not starting a scan.

Validation: 6 focused unit tests; 6 distinct native browser cases passed across the runs (search drafts/collapse at 320/390/1440 and three themes; explicit Fable entry; unified rail; mobile/wide panel geometry; fullscreen; joint engine/Fable findings). Fullscreen initially failed its matrix-height assertion; fixed by keeping the closed advanced area out of fullscreen flow, then reran successfully. npm run build and shell budget PASS on final code. No thresholds changed. No paid model calls. No complete CI-green claim; prior branch CI blockers are outside this layout slice.

Delivery to ZURIEL/main session only. Production/SQL/flags unchanged; no Preview, merge to main or deployment performed.
