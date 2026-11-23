# SOD1820 / Zion Siboni Gate 50 — one canonical Now release item

**DO NOT EXECUTE BEFORE THE BOOK ROUTE HAS PASSED THE PUBLIC RELEASE GATE.** This is a proposal, not a production migration. Explicit exact approval and current DB schema/RLS recheck are required.

The existing Now feed reads `public.channel_updates` and admits **live, page_only=false** records on the `site-news` channel. This is the same current feed used by other site-release announcements; no new feed, table, background job or card store is needed.

## Proposed one-time row

```sql
-- REVIEW ONLY; requires explicit production DATA WRITE approval, after live reader URL verification.
-- Exactly one message per book edition; never reinsert if ext_msg_id exists.
insert into public.channel_updates
  (text, channel, source, status, page_only, ext_msg_id, link_url, credit, is_urgent, priority)
select
  'חדש בספרייה: המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית. מחקר מאת ציון דוד סיבוני. שמונה שערים של רמזים, גימטריאות ומסע אל שער הנון, ושני נספחים ונספח מיוחד על המספר 97. לקריאת הספר המקורי ולמסע השערים.',
  'site-news', 'admin', 'live', false,
  'site-news:book:siboni-gate50:email-113',
  '/book/hamasa-leshaar-hahamishim-zion-siboni',
  'סוד 1820', false, 100
where not exists (
  select 1 from public.channel_updates
  where ext_msg_id = 'site-news:book:siboni-gate50:email-113'
);
```

## Post-release acceptance
1. Public Book identity active, exact PDF has anonymous GET SHA256 verification, the Book route passes noindex/canonical and mobile reader checks.
2. The Home card is **automatically source-gated** via the existing `fetchPublicLibraryItem2029` (not a static announcement).
3. After explicit approval execute the above once, then query `channel_updates` by exact `ext_msg_id`, verify `status=live`, `page_only=false`, `link_url` and one visible Now item.
4. Re-run feed contract tests and confirm no duplication; if publication fails, rollback is to set `status` to a non-live state under an approved DB change (do not delete provenance).
