# «בני ההיכל» inventory (read-only, 11.11.2026; origin/main d6662fdcb; live DB; live site; deployed Edge)
LIVE (user/Raziel visible):
1 src/components/SubscribeGate.jsx:43 visible copy «זה לא אזור המנויים «בני ההיכל»» (+ :11 code comment)
2 api/og.js:118-119 OG title/desc/card for /members: «בני ההיכל · …» «אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים» card 'הצטרפו להיכל'; vs og.js:529 + App2029.jsx:350 /members = «אנשים בקהילה»
3 src/lib/marketing.js:87 comment: members_signup: "CompleteRegistration" // הצטרפות לבני ההיכל (moved from :85 by #1301)
4 Edge ai-analyze deployed v91 (ezbr 2c810072…): Raziel guide line «/members — מנוי מתקדם (בני ההיכל)» (repo :2659)
5 public/heichal.html (Legacy Heichal 3D hall, created 2026-06-11 daff8af1, last #593 2026-09-20) LIVE 200 at sod1820.co.il/heichal.html: «השער ייפתח למוזמנים בלבד — רק בני ההיכל», «🔐 רק בני ההיכל»; fetches DB table gates via REST (anon)
6 public/preview.html (Legacy preview, created 2026-06-08, last 2026-06-14) LIVE 200: «קריאת העומק — לבני ההיכל», «🔒 בני ההיכל», «הצטרף אל בני ההיכל»
   -> both NOT listed in REMOVAL.md residues -> CLAUDE.md rule 1: report as contradiction (Legacy UI served live); do not remove without decision
   other public/*.html also live 200 (book, entity-hub-observatory-1237, journey-preview-1237, kolombia, tzofen) — not classified here
DB:
7 gates row key 'heichal' title 'החדר הסודי' world 'השער ייפתח למוזמנים בלבד — רק בני ההיכל.' (read only by public/heichal.html)
8 page_content 'beit-midrash/mistater' «הצטרפו לבני ההיכל» (no 2029 reader)
9 nodes active: spec bnei_haheichal (label); rule number_page_law v1 (desc+meta; stage 3); specs site_master_plan, site_menu (desc; in 21_)
  nodes inactive (history): ecosystem_gates_activity_feed v2, learning_sharing_architecture v1, master_vision_6_layers v1, subscribe_gate_law v1,v2, vision_page_principles v2, 'שפת עיצוב — ההיכל המלכותי' v1
10 project_codex #13 number_page_1820 (STALE banner in 22_); project_codex_backup_20260820 (backup)
11 work_log: what_we_did 13, open_threads 7, topic 1 (history)
DOCS (history): SOD1820_CLAUDE_SESSION_EXPORT.md:38 (PayPlus recurring «בני ההיכל»), docs/work-journal.md:195, supabase/migrations/20260723_drop_redundant_users_economy_columns.sql:4 comment
NO 2029 member-tier display found (users.tier free x229; profiles.tier 0)
