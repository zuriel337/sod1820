# 2029 · Post connections and legacy tags · Draft implementation contract

Status: proposal, not activated. No production or database migration.

## Ownership
Extend existing reality_graph_law v8; respect graph_privacy_foundation_law, unified_tags_law v1, truth_axes_foundation_law and publishing_conventions. Do not create a parallel graph, tag store, or publication authority.

## Post footer
1. Primary section: "החיבורים בעץ", max six verified public links, with expansion to more. Series, content units, number entities, events, persons and public sources use their canonical entity references. Never fabricate links or expose private research claims.
2. Optional "המשך המסע": at most two directly grounded related units.
3. Secondary collapsed disclosure: "תגיות וסיווגים", on ALL posts, including historical posts. Show original post.tags and post.categories, visually small and readable in both themes. Plain text when no canonical public destination exists. Preserve original order and avoid duplicates.
4. A tag is not a verified graph edge, a series, or an editorial endorsement. Do not auto-create indexed thin tag pages.
5. Keep existing tags, canonical URLs, metadata, and SEO until audited migration; tags table is intended canonical registry, but post_tags is absent as of 2026-11-10. Avoid bulk migration.

## Series decisions (owner approved 2026-11-10)
Collection name confirmed by ZURIEL on 2026-11-11: «הצופן בסרטים», the existing category of posts 5003 and 5004. No new series or category; data unchanged.
- מה קורה הבורא: all public posts with verified author exactly אלון לוי; tag not required.
- מטריקס post 5003 and משחקי הדיונון post 5004: dual membership מימד חמש and the site's הצופן בסרטים collection/category. A collection/family is not automatically a new series.
- All other author exceptions remain unapproved. Do not infer membership from a title or channel.
- One post, multiple approved relations, no content duplication.

## Implementation acceptance gates
- Query and projection both implement author-only admission for אלון לוי, including missing series tag; exclude draft/forum/suppressed posts.
- Query and projection both admit 5003/5004 to מימד חמש without admitting other authors accidentally.
- Keep counts, Home preview, series listing and follow consistent; verify the shared reader and cache.
- Footer appears on desktop/mobile and both themes, keyboard-accessible disclosure, no private links.
- Regression tests for old posts, duplicates, SEO and 2029 routes.
- No main merge, production deploy, database write or contract activation without separate verified acceptance.
