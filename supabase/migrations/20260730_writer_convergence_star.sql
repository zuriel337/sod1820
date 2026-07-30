-- ✦ סמל-כתב: הודעת-פורום שהולידה התכנסות (canonical).
-- research_contributions.convergence_slug → מצביע ל-topic_card שנוצר מההודעה.
-- הפורום (ForumFeed/Discourse) מציג ⭐ «יצר התכנסות»; דף-הכתב (ContributorPage) מציג את
-- ההתכנסויות שהכתב יצר (topic_cards.created_by) עם כוכב-זהב. עדשות בלבד — לא מקור חדש.

alter table public.research_contributions add column if not exists convergence_slug text;

-- SELECT הוא table-level ל-anon+authenticated → העמודה מכוסה אוטומטית (rls_client_read_protocol).
-- topic_cards כבר קריא ללקוח (getResearcherConvergences קורא approved לפי created_by).
