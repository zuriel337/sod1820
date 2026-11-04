# Adopted Post backdrop in Community

User request: reuse the Post background beneath Community and adapt it to the existing three color presets.

Base: `eaba6dc5c2376ba9b0c8fea5988f63b9e9f9ca76`, continuing isolated `gpt/community-auth-publish-media-20261031`. Source artwork: general Post desktop and portrait WebP from verified `gpt/posts-integrated-backgrounds-20261030` at `657945e674794bdbb224118d7f48c9db11ec11c8`. The files are byte-identical; no Post code, series-specific artwork or unrelated session changes were imported.

The decorative layer mounts only with Community, uses the portrait below 760px and remains behind controls without intercepting input. Existing semantic page colors supply the readability veil. Night retains the photograph's depth; Day is faint and desaturated; Parchment is warm and subdued. No animation, new theme, palette store or global Frame change. Missing artwork leaves the existing semantic page background and readable content.

Built browser acceptance covers 320/360/390/1440, all three presets, direct old-chat hash entry, loaded-scope sorting/search, small accessible filters and old-chat preservation. Source build and integrated Preview build, graph/lazy, isolation, hardening and Legacy lock are required. No live product writes or model calls.

During acceptance, restored compact Community sign-in keyboard focus, Escape/close return and typed-email retention after the prior shared-entry integration. It still delegates Auth to the canonical AccountEntry2029. Public Auth settings are supplied by the intercepted browser fixture; no provider or server permission changed.

Protected Preview completion evidence, exact SHA/deployment ID, test results and passive ownership release are recorded in the task receipt and work log. No main merge or Production deployment.
