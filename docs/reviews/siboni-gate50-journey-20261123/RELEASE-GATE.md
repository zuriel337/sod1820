# Gate 50 — release gate, no automatic production action

Source issue #1494 · draft PR #1519.

## Current physical source
- Bucket: `gallery` (public), key `Book/zion50.pdf`.
- Expected MIME `application/pdf`, size `1322143`, SHA256 `35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c`.
- This exact source is the **second email** (#113), not the earlier edition.
- An authenticated Storage metadata observation confirms object existence and byte size. **An independent anonymous GET and SHA256 downloaded from Storage are still outstanding**; no release until both succeed.

## Existing book identity / rendering
The public Book reader does not auto-publish from a static manifest. It requires exactly one current active `nodes(type=book)` row with `metadata.slug` matching the manifest, `metadata.source_ref_prefixes` containing exactly one `book:...` reference, and `metadata.identity_tiers.digital_object` matching the exact public PDF URL, bytes, hash and MIME. The existing `publicBookSourceAvailable2029` additionally HEAD-checks the public PDF at request time. This is an intentional fail-closed gate.

### Proposed Book-node data, for independent admin review

```sql
-- REVIEW ONLY; DO NOT run as a migration or auto-deploy.
-- All changes in production require a separately approved, exact scoped DB release.
select jsonb_pretty(jsonb_build_object(
  'slug', 'hamasa-leshaar-hahamishim-zion-siboni',
  'route', '/book/hamasa-leshaar-hahamishim-zion-siboni',
  'space', 'core',
  'author', jsonb_build_object('name_he','ציון דוד סיבוני'),
  'digital_page_count', 110,
  'section_count', 8,
  'source_ref_prefixes', jsonb_build_array('book:hamasa-leshaar-hahamishim-zion-siboni'),
  'identity_tiers', jsonb_build_object(
    'book', jsonb_build_object(
      'title', 'המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית',
      'identity_key', 'book:hamasa-leshaar-hahamishim-zion-siboni'
    ),
    'witness', jsonb_build_object(
      'provider','ציון דוד סיבוני · מייל שני מיום 22.11.2026',
      'identity','witness:siboni:2026-11-22:email-113'
    ),
    'edition', jsonb_build_object(
      'status','author_submitted_latest_updated_covers',
      'date','2026-11-22'
    ),
    'locator', jsonb_build_object('kind','pdf_page','pattern','book:hamasa-leshaar-hahamishim-zion-siboni#p<PDF_PAGE>'),
    'digital_object', jsonb_build_object(
      'bucket','gallery',
      'path','Book/zion50.pdf',
      'mime','application/pdf',
      'size_bytes',1322143,
      'sha256','35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c'
    )
  ),
  'coverage_2029', jsonb_build_object(
    'structural_sections','EIGHT GATES + APPENDICES SOURCE-MAPPED',
    'engine_verified','NOT_ESTABLISHED',
    'source_exhaustion','NOT_ESTABLISHED'
  )
));
```

This query is a **read-only payload preview** and is not a record creation command. The author/publication owner must admit exactly one source-native Book identity after duplicate/ACL review. It must not auto-create verified research objects or reality-graph edges from authored gematria claims.

## Staged / release activation sequence
1. Read current active source/publication rules, latest main SHA and active writer assignment; validate the source URL as anonymous user and hash the full GET.
2. Verify no existing same-identity Book node/source binding; review `nodes` metadata above, contributor identity, storage path and attribution.
3. Explicitly approve a **single bounded DB mutation** to create the Book node, initially inactive if the public code isn't deployed. Keep a reversible node ID and no duplicate slug.
4. Run CI + protected preview and verify anonymous `/book/hamasa-leshaar-hahamishim-zion-siboni`, PDF navigation 1/8/36/98/110, mobile 320/390 and desktop 1440, all palettes, accessibility, SEO, LCP/CLS and no extra eager imports.
5. With exact SHA/deployment and admin approval, merge/deploy and activate public Book identity in a controlled release order. No homepage/Now live link before route works.
6. Once public book address is verified: introduce one compact Home Royal card **below existing pinned lead** and one canonical `Now` feed update. Do not replace latest post or write a separate feed. Use copy below.

## Copy
**Home:** המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית · ציון דוד סיבוני · שמונה שערים ונספח מיוחד על 97 · 974 / 973 / 50 · ״למסע ולקריאת הספר״.
**Now:** חדש בספרייה: המסע לשער החמישים, מחקר מאת ציון דוד סיבוני. בין הבינה המלאכותית, תורת הרמז ושער הנון — לקריאת שמונת השערים והנספח על 97.

## Current implementation boundary
`src/components/books2029/SiboniGate50Journey2029.jsx` is an isolated scoped Royal component, loaded lazily by the existing public Book route **only when readerState=ready**. No global frame redesign. User explicitly authorized GPT to take over visual implementation while Claude is unavailable; any later parallel writer must check scope ownership first.
