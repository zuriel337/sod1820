-- 🌳 פורום — «תגובה מובחרת» עשירה (image + featured) על research_contributions.
-- מאפשר תגובה עם תמונה + ריבוע-גימטריה (gematria_claim.rows) + גשר + לינק-צופן + לינקי-מספר.
-- עץ אחד: הלינקים מצביעים לצמתים (/number/*), לא משכפלים תוכן. הרינדור: Discourse.jsx (FeaturedExtras).

alter table public.research_contributions
  add column if not exists image_url  text,
  add column if not exists is_featured boolean not null default false;

-- SELECT הוא table-level ל-anon+authenticated → העמודות החדשות מכוסות אוטומטית (rls_client_read_protocol).
