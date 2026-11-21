# Open Royal visual iteration — same draft #1469

Requested by ZURIEL after reviewing the enclosing card; no deployment or merge.

Source: `0d17448b4ae0727f2c29841fc6481a3d30bc956f`; incoming head `4d4a3419943248079996a6ef19414570dc1d8320`; freshly fetched main remains `d353b62a520a009b130970dc82c17ad00a43ad96`. Canonical readonly work_log_current returned no matching active Royal/System Frame writer before edits. No database or contract write.

Shared quiet intro on World/Heichal/Books now has no enclosing border, rounding or shadow, a softly blended canonical frame background and one gold bottom rule. Existing title, area medallion, description and context navigation remain. No new image, crown, dependency or navigation system. The existing global crown remains intact. The help trigger in SystemFrame2029 and RoyalIntro2029 now shares a small unfilled/unframed appearance and a 44px minimum touch height. Its old visual bulk came from the initial sod29-action style and the lazy r29-btn + r29-palace-help styles (pill padding, border/background and an additional question-mark circle). Both trigger renderings were updated, preserving lazy loading, keyboard operation and focus return.

[Actual browser screenshots](preview.html): World/Heichal/Books, mobile 390×844 and desktop 1440×900. ELS /code is also captured as requested: it **still uses the existing palace Compact design**, with the quieter help button. It was not switched to the quiet layout. Browser-local public-read fixture, no authenticated write or live deployment; Heichal gate override is browser-only as in the preceding review.

Final-source `npm run build` and its unchanged shell budget passed: eager JS 203433 gzip bytes / 17 files, frame JS 46175 / 3 files, frame CSS 34327. No thresholds/baselines changed in this iteration. These are compiled sizes, not new LCP/useful-content timing results. The previous report's residual Books desktop performance limitation remains open; no release-readiness claim.

Browser checks use the existing royal-quiet-intro-checks-2029.browser.py with only its output directory changed to this folder. They cover 3 routes × 4 widths × 3 themes, reduced motion, keyboard opening/Escape/focus, links/icons, RTL, overflow/overlap and zero palace requests on quiet routes; also fresh introVariant=none and guest Here gating. Initial exploratory runs were superseded/cancelled when the style changed; only the final stable run is the acceptance evidence. Public-reading build and full repeated performance comparison were not rerun for this visual review. Real owner action integration remains pending as described in the preceding review.

Scope: only pageIntro2029.css, royalIntro2029.css and the two existing help-trigger renderings. No post/media/actions/left-panel code changes. Status: branch-only, draft, awaiting visual feedback and existing performance/integration closure.
