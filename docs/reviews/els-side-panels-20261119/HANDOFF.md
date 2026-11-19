# ELS side inspector regression

Base: `fefc39e95ea7a8a99d6d143476037d57581709ae` (merged #1397).
Branch: `ccr-06bc2910-pgarr4`, continued locally; no new branch.

The Research `.has-discovery` wrapper forced all inspectors into grid row 2 across the entire layout, even when Discovery was closed. Restore the existing desktop side-column positioning and the mobile inline layout. Discovery remains independently open alongside scan/findings, results or save. Reserve the same Research column width when switching/closing the secondary tool so the matrix and its internal pan do not jump. Fullscreen retains its existing overlay placement and shared DOM.

Per ZURIEL’s correction, local action buttons remain paired in equal columns on mobile and desktop. A container query reduces redundant nested padding, not text size; concise visible labels retain the full accessible action names. Action buttons retain 44px minimum targets and compact equal heights. No changes above the matrix. No frame component, global dock, engine, persistence or Fable request changes.

Browser acceptance checks desktop side alignment, no overlap, equal stage height, Discovery open/closed with each tool, 320/360/390/1024/1280/1440 widths, all three themes, matrix pan, wide layout, Classic, regular/crossed search and fullscreen. The wide-layout assertion measures the combined matrix-and-inspector workspace now that the inspectors occupy side columns, and separately checks that the matrix remains the larger portion. Existing pan/height assertions remain.

Release boundary: branch-only correction. No merge, Preview, deployment, SQL writes, flags or paid AI calls. The previously reported public-release eager-file budget blocker is separate and is not fixed by this CSS correction. Standard npm build success must not be reported as public-release success.

Validation: six targeted native Chromium scenarios passed (zero skips). The final paired-action correction receives a separate browser rerun with screenshot capture and same-row/44–56px action-height assertions. Four discovery-control unit tests passed. `npm run build` and the standard shell budget passed without baseline changes. CI and public deployment are separate, not claimed here.

Final visual correction: Discovery launch and local scan actions remain equal paired buttons, 48px minimum. At narrow inspector widths the three result-view buttons use two columns, 56px height, and a centered odd final button. Labels remain 16px and full accessible names are retained. This follows Design V2 §§14.3–14.4 and ZURIEL’s explicit request; no changes above the matrix.

Royal refinement: direct Discovery controls and the view selector now use the existing `r29-btn` family and primary variant from `royal2029.css`, already loaded by Discovery. Local legacy decoration is excluded from those controls; no shared Royal stylesheet or frame import was changed. Latest local verification includes Discovery in six widths/three themes, equal paired actions, compact targets, screenshots, and standard build/shell budget. See TRACKING-AUDIT.md for the separate read-only analytics investigation and fresh live deployment observation.
