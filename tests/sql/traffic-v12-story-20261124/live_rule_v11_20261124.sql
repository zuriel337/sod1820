-- Exact live copy, read 24.11.2026 from canonical Supabase: traffic_intelligence_law v11 (description md5 525452c0…, metadata md5 888a9535…).
-- v10 is a stand-in (inactive; the guard only reads its governed metadata keys). Table and indexes as live (rule-relevant ones).
create extension if not exists pgcrypto;
create table public.nodes (id uuid primary key default gen_random_uuid(), type text, label text, description text,
  metadata jsonb default '{}'::jsonb, is_active boolean default true, created_at timestamptz default now(), rule_id text, rule_version integer default 1,
  depends_on text[], supersedes_version integer, weight smallint default 1, hebrew_date text, axis_theme text, gallery_id uuid, identity_key text);
create unique index nodes_one_active_rule_per_id_uidx on public.nodes (rule_id) where type='rule' and is_active = true and rule_id is not null;
create unique index nodes_identity_rule_uidx on public.nodes (rule_id, rule_version) where type='rule' and rule_id is not null;
create table public.work_log (id uuid primary key, topic text, what_we_did text);
create table public.project_codex (id serial primary key, slug text unique);
-- v10: stand-in (inactive; only its required metadata keys matter to the guard). v11: exact live text and metadata (24.11.2026).
insert into public.nodes (type,label,description,metadata,is_active,rule_id,rule_version,supersedes_version,weight)
values ('rule','Traffic Intelligence v10 (stand-in)','v10 stand-in','{"phase": 1, "status": "locked", "compaction_v1": {"classification": "OWNER", "canonical_owner": "traffic_intelligence_law"}, "owner_routing": {"resolution": "RESOLVED", "canonical_owner": "traffic_intelligence_law"}, "g3_disposition_v1": {"classification": "KEEP_CANONICAL_OWNER"}}',false,'traffic_intelligence_law',10,9,1),
       ('rule','Traffic Intelligence v11 — 2029 Journey Pulse / One Journey Event Family',$v11$חוזה ההגדרות של Traffic Intelligence — מקור-אמת יחיד לכל האנליטיקה (נעול ע"י צוריאל).

1. כניסה אנושית (Human Entrance): Session שסווג כאנושי (is_bot=false) ובוצע בו לפחות אירוע view. נספרת פעם אחת לסשן. המונח «כניסה» שמור לבני-אדם; «כניסת בוט» (is_bot=true) = הגדרה נפרדת השמורה לעתיד.

2. סשן (Session): חלון GA-style — session_id מתאפס אחרי 30 דק' חוסר-פעילות (זהה למודל GA; src/lib/identity.js). לכן סשנים שלנו ו-GA מוגדרים זהה, והפער הוא הבדל-מדידה ולא הבדל-הגדרה.

3. מבקר (Visitor): ישות ייחודית כפי שניתן לזהותה באמצעים הזמינים באותו זמן. משתמש מחובר → זיהוי לפי person_id (יציב). אנונימי → זיהוי לפי מזהים זמינים (Cookies/Storage), ולכן עשוי להשתנות עקב מגבלות דפדפן (ITP). מדד המבקרים האנונימיים הוא חסם-עליון בלבד.

4. נטישה (Bounce): כניסה אנושית עם צפייה בודדת ובלי אף אירוע-אינטראקציה. אירועי-מערכת (heartbeat/presence וכד') אינם נחשבים אינטראקציה. אינטראקציה מוגדרת: search, cross_search, use, save, journey, add, open.

5. פער מדידה (Measurement Gap): (first-party − GA) / GA על חלון החפיפה, מחושב חי. מדד השוואתי בלבד — אינו משמש לתיקון אוטומטי של נתוני-המקור (לא «מתקנים» מספרים לפי GA ולא להפך). מוצג תמיד עם שני המספרים הגולמיים והסבר, לעולם לא כ«אמת מוחלטת».

6. Quality Score (פאזה 2): סכום-משוקלל גלוי — עומק, זמן, חיפוש, שימוש-בכלי, חזרה. תמיד מציג את מרכיבי-הציון (לא מספר-קסם). המשקלים ניתנים לשינוי בעתיד, אך כל שינוי יתועד.

7. המרה (Conversion): Reserved for Phase 3. קרדיטים/מנויים אינם פעילים עדיין; לא נמדדת המרה עד שהמודל העסקי יופעל.

8. מקור-אמת (Source of Truth): כל מדד מוצג במערכת ממקור קנוני אחד בלבד — fn_human_entrances (הגדרה) ו-traffic_daily (ביצועים). כל רכיב UI קורא מאותו מקור ואינו מחשב את המדד באופן עצמאי. הרחבת canonical_ui_components_law לרמת האנליטיקה.

מימוש: fn_human_entrances(from,to) = SRF ברמת-סשן, מקור-האמת. traffic_daily = טבלת-צבירה יומית (רענון בקרון) לביצועים וגיזום-עתידי של events בלי לאבד היסטוריה. RPC לאדמין (admin_entries_daily / admin_entries_day_detail) קוראים מהם בלבד.

פאזות: 1-הבנת התנועה · 2-הבנת התנהגות · 3-המרות עסקיות (כשקרדיטים/מנויים פעילים).

[עדכון 7.8 — מסנן-בוט התנהגותי]: מעבר ל-is_bot (UA), מוגדר דגל suspected_bot במקור-האמת: כניסה חשודה = source=direct + country IS NULL (בלי vc cookie) + views=1 + interactions=0. תופס גלי JS-bots ש-UA לא תופס (למשל גל 8–13.7.2026, ~6,300 כניסות). מדיניות: השורה נשמרת עם דגל (לא נמחקת); traffic_daily.entrances = נטו (בלי חשודים), traffic_daily.suspected = כמות מסוננת; ה-UI מציג גולמי/חשוד/נטו בשקיפות. הכלל מתועד וניתן-לשינוי (לפי סעיף Quality/שינויים מתועדים). המדד מול GA מחושב על נטו.

[STATUS — Phase 1 LOCKED 7.8.2026]
Phase: 1
Status: Stable / Locked
Rule version: 2 (suspected_bot behavioral filter)
Canonical source: traffic_daily (perf) + fn_human_entrances (definition)
Last validation (window 8.7-6.8): raw entrances 24,443 = human net 16,224 + suspected 8,219; GA sessions 10,251; measurement gap raw +138% -> net +58%. Jul 8-13 bot flood flagged (42-88%/day), not deleted.
Clickable popular rows: on. Unified history 2015->now (Jetpack->GA->first-party), no auto-correction.

[PHASE 2.5 — חיבור חושים→מוח, 7.8.2026]
חוזה-סוכן (fn_ti_*): הדרך היחידה שסוכנים (מטטרון וכו׳) קוראים TI. אסור לסוכן לגעת ב-events/traffic_daily/admin_* ישירות.
  fn_ti_summary(from,to) → raw/suspected/net/human_pct.
  fn_ti_surface_activity(from,to) → פעילות לפי surface על נטו-אנושי.
  fn_ti_entity_demand(from,to) → ⭐ גשר-ישויות: landing_path → ישות (number/topic) → node בגרף → visits/depth/search_rate/engaged_rate. /number/<עברית> נפתר דרך url_decode+fn_ragil→ערך.
רה-חיווט: fn_metatron_weekly עבר לקרוא fn_ti_surface_activity + fn_ti_summary (במקום events גולמי) + מדור entity_demand חדש. מטטרון וה-UI = אותו עולם, מסונן-בוט התנהגותית.
נותר ב-2.5: (ד) הקרנת demand לגרף כ-edge type=demand_signal (metadata: period/visits/depth/search_rate/quality) — לא להעמיס nodes. (ה) כיור-המלצות: nodes type=recommendation status=pending+confidence+evidence — מטטרון מציע, צוריאל מאשר.

[PHASE 2.5 COMPLETE — 7.8.2026] לולאת חושים→מוח→המלצה→אישור→למידה חיה.
(ד) ti_demand_signals + edge type=demand_signal (from=node system «traffic_intelligence» → entity node). fn_ti_project_demand(from,to,period,min) — refreshable לפי period; אות כולל graph_presence (312: visits 950, presence=false).
(ה) recommendations (type/target_entity/reason/evidence/confidence/status/created_by/reviewed_by). fn_metatron_recommend: כלל1 create_entity (פער ביקוש↔ייצוג), כלל2 write_article (ביקוש+התכנסות טרייה). pending בלבד+evidence.
עקרון בטיחות (חקוק): מטטרון מגלה ומציע — לא נוגע בגרף. זרימה: signal→metatron→recommendation(pending)→admin_recommendation_review(approved/rejected/done, reviewed_by+reviewed_at)→פעולה.
אוטונומיה: cron ti-demand-daily (03:40) = fn_ti_daily (project 7d+30d → recommend). RPC אדמין: admin_recommendations / admin_recommendation_review.
בדיקת-קצה עברה: 312 עלייה בביקוש → demand_signal(presence=false) → מטטרון → recommendation create_entity pending confidence 1.0 evidence{visits:950} → ניתן-מעקב. לולאת-למידה אמיתית.

[עדכון 1.9.2026 — Clean Traffic Classification Foundation v1, Human-Gate ZURIEL, rule_version 3→4]
חוזה-סיווג קנוני נוסף מעל v3 הקיים (v3 לא שונה, לא נגעו — verified bytewise, hash 1a2e30ce9e4378b975cbf79710fb4cdb זהה before/after). שלוש הבחנות נעולות: is_bot=false ≠ Human proof · person_id ≠ Human proof · suspected_bot ≠ BOT אוטומטית.

CANONICAL TRI-STATE: classification ∈ {human,bot,unknown}.

POSITIVE HUMAN EVIDENCE ("Candidate A", קפוא — הרחבה טעונה Human-Gate נוסף): real_account (persons.account_user_id IS NOT NULL) ∨ search/cross_search ∨ save ∨ use ∨ journey ∨ share/share_story ∨ dwell≥15s (events.event_type='engagement', props.engaged_ms). לא-מספיק-לבד: add · open · click · internal_link_click · multi_page · session_span · person_id · is_bot=false.

POSITIVE BOT EVIDENCE: אך-ורק events.is_bot=true (סיגנל-קיים, לא detector-חדש). suspected_bot (v3) לעולם לא-נחשב positive bot evidence — עובר כ-legacy_suspected_bot/legacy_classification_reason, גלוי ולא-מוסתר (v3 = evidence/legacy classifier, לא אמת-אוניברסלית-סופית).

מימוש: פונקציה חדשה יחידה public.fn_ti_clean_classification(p_from,p_to) — מרכיבה מעל events+persons+fn_human_entrances, בלי לגעת ב-v3, בלי טבלה/store/engine חדש (המשך-משפחת fn_ti_*, "הדרך היחידה שסוכנים קוראים TI"). עמודות: clean_classification / clean_classification_reason / clean_classification_source / clean_classifier_version(='clean_traffic_foundation_v1') / clean_evidence(jsonb) / clean_eligible / legacy_suspected_bot / legacy_classification_reason. Grants: postgres בלבד (server-only, כמו כל משפחת fn_ti_*; תוקן בנפרד אחרי שנמצא PUBLIC-grant-דיפולטיבי לא-מכוון).

CLEAN VERIFIED HUMAN (clean_eligible=true כש-classification='human') הוא מדד שני, נפרד, לצד ה-LEGACY HUMAN ESTIMATE הקיים (fn_human_entrances not suspected_bot, ~83%) — לא מחליף, לא כותב-מעל, לא backfill. שני המדדים חיים במקביל, בעלי שמות מפורשים-שונים.

כיול אמפירי (חלון 30 יום, ~15.5K sessions, 3 סבבי-כיול READ-ONLY שקדמו למימוש): LEGACY≈83%. Candidate A (clean_eligible=human)≈11%, ≈89% unknown — הפרש מכוון, לא באג: UNKNOWN=first-class, לא=בוט ולא=מוסתר, לא=human בברירת-מחדל.

Provenance: work_log actor=CLAUDE (31.8–1.9.2026, 3 calibration passes) → Human-Gate approved_by=ZURIEL approved_at=2026-09-01 → מימוש על ענף claude/clean-traffic-classification-v1, migrations 20260901140000 + 20260901140500. PR#222 (gpt/traffic-temp-disk-fix) פורט-מחדש כ-reproducibility-only (זהות-hash מאומתת פעמיים, 31.8+1.9) — עדיין לא ב-main, לא נסגר.

[עדכון-פרובננס 1.9.2026 — תיקון-יישום, לא סמנטי]: נמצא ותוקן באג-יישום ב-fn_ti_clean_classification — has_account בדק person_id אחד שרירותי לכל session במקום כל ה-person_id-ים השונים באותו session. תוקן ל-EXISTS/bool_or על-פני כל הזהויות בסשן, בדיוק לפי נוסח-החוזה הקפוא ("if ANY identity representation in the session is linked to a verified account"). אפס שינוי-סמנטי לחוזה עצמו. migration: 20260901150000_clean_traffic_classification_account_evidence_fix. verified live: 1,348/1,348 session מקושרי-חשבון מסווגים HUMAN (100%).

[UPDATE 7.9.2026 — Attribution Decomposition v1, Human-Gate ZURIEL]
Arrival/source attribution is orthogonal to Clean Human/Bot/Unknown classification. Forward-only vocabulary: tagged_attributable = explicit src/utm/rid evidence; referrer_attributable = external referrer evidence without explicit tag; true_direct_candidate = no source signal but positive continuity evidence such as verified account/known returning identity; unknown_origin = no reliable source evidence. Direct is therefore a mixed bucket unless decomposed; it must never be treated as a proven acquisition source. events.via must read ?src before rid/utm/referrer for future events. No historical backfill, no source invention, no change to Clean Traffic evidence or classifier.

[UPDATE 7.9.2026 — Traffic Intelligence Semantic Closure v6 · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING. No new analytics store/engine/warehouse. Clean Traffic v1 evidence set remains frozen and unchanged.

REPORTING TIME CONTRACT: raw event timestamps remain UTC/provenance. Canonical SOD1820 reporting-day projection is Asia/Jerusalem. Historical traffic_daily rows are not silently re-bucketed or overwritten by this decision.

VIEW TAXONOMY: PAGE_VIEW = events.surface='page' AND event_type='view'. PAGE_VIEW is distinct from DOMAIN_VIEW / CONTENT_VIEW / IMPRESSION. Existing legacy views remains historical/backward-compatible provenance; new decision consumers must migrate to explicit page_views/all_views semantics rather than treating every event_type='view' as a page navigation. page_engaged/page_bounce must be derived from page_views, not domain-view duplication.

BOT OBSERVABILITY BOUNDARY: events ingestion currently drops client-marked bots before insert, so Clean BOT=0 in events is structurally non-observing and MUST NOT be interpreted as zero bot/crawler traffic. Edge/crawl telemetry remains the complementary bot-observation layer. Do not re-ingest crawler flood merely to populate Clean BOT.

DEMAND / METATRON TRUTH: observed visits, legacy estimate, clean_human, clean_unknown, and clean_bot are separate evidence axes. human_visits must not be inferred by aliasing visits. Demand signals and recommendations must expose Clean composition and Rank, Don't Hide; UNKNOWN is first-class and Human Gate remains required.

SESSION ANOMALY: HUMAN != NORMAL and ANOMALY != BOT. Anomaly is an orthogonal evidence axis over session behavior and must never auto-reclassify Clean Human/Bot/Unknown. It is an EXTENSION POINT after the semantic MUST closure.

MUST FOUNDATION NOW implementation: (1) fn_ti_report_day(timestamptz) Asia/Jerusalem reporting helper; (2) additive explicit page_views/all_views/page_engaged/page_bounce outputs while preserving legacy views compatibility; (3) additive Clean composition on entity-demand/demand-signals and downstream decision evidence; (4) explicit bot-observability documentation. No historical destructive rewrite.

FOUNDATION VERDICT: substrate FOUNDATION SUFFICIENT; semantic closure requires the four MUST items above before advanced analytics automation. Foundation → Projection → Experience.

[UPDATE 9.9.2026 — GA4 MEASURED TRUTH AXIS · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING traffic_intelligence_law. GA4 is a canonical measured-source axis, not a second analytics owner.

GA4 MEASURED TRUTH: Metrics explicitly reported by Google Analytics (for example activeUsers, sessions, screenPageViews, countryId) are authoritative for what GA4 measured for that metric/window/dimension. They must be labeled GA4_MEASURED and preserved raw; they are not auto-corrected to first-party values.

NOT HUMAN-PROOF: GA4 Active Users are not equivalent to Clean Verified Human. Bot/automation contamination can exist inside GA4, especially when country-level spikes are anomalous. Therefore GA4_MEASURED, LEGACY HUMAN ESTIMATE, CLEAN VERIFIED HUMAN, CLEAN UNKNOWN, CLEAN BOT and edge/crawl observability remain separate evidence axes.

COUNTRY INTERPRETATION: countryId=IL is authoritative for GA4-measured Israel activity, but must not be relabeled as proven-human traffic. Comparative statements must name the metric exactly (e.g. “GA4 Active Users in Israel”).

HUMAN-GATE SNAPSHOT (screenshot supplied by ZURIEL): 45-day comparison, Israel Active Users current=4212, previous≈3246, delta=+966, +29.76%. This establishes that the 45-day GA4 Active Users trend for Israel is UP, while shorter first-party windows may simultaneously soften. No contradiction: window+metric+measurement layer differ.

GLOBAL BOT CAUTION: extreme concurrent rises in Singapore/China are a contamination warning for global GA4 totals; never infer real-human growth from global Active Users without Clean/edge cross-check.

REPORTING RULE: Always emit metric + geography + window + source layer together. Example: “GA4_MEASURED Active Users · Israel · 45d vs prior 45d = +29.76%.” Never shorten this to “human traffic +29.76%.”

[UPDATE 9.9.2026 — GA4 Israel measured-truth reconciliation v8 · Human-Gate ZURIEL]
GA4_MEASURED is a canonical measured-source axis: it is truth about what GA4 measured for the declared metric/window/dimension, not proof of human identity. Exact screenshot windows corrected to 50d: current 2026-07-21..2026-09-08 vs previous 2026-06-01..2026-07-20. Israel New users = 3,861 current, +603, +18.51%, implying ~3,258 previous. Israel Active users = 4,212 current, +966, +29.76%, implying ~3,246 previous. First-party cross-check is supportive only: events country evidence begins 2026-08-06, therefore exact Israel prior-window new-user comparison is unavailable locally and must not be fabricated. Global SG/CN spikes remain bot-risk caution; country alone never changes Clean Human/Bot/Unknown classification. No auto-correction between GA4 and first-party.

[UPDATE 27.9.2026 — SYSTEM PULSE 2029 PUBLIC METRICS CONTRACT V1 · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING. System Pulse is a projection over existing Traffic / Reality / Community / Corpus owners. It creates no analytics store, event system, community store, ranking engine or second truth.

PUBLIC PRESENCE TRUTH. A value labeled users / visitors / active people / people online MUST equal the canonical measured population for its explicitly labeled window. It MUST NOT be multiplied, padded, rounded upward by a promotional factor, or forced to a minimum floor. A product desire for stronger social proof never changes the measured human count.

PAIRED PUBLIC SOCIAL-PROOF PATTERN. Public Experience MAY intentionally show at least two truthful measures together when a fuller sense of activity is useful: (A) people/visitors active in an explicit window and (B) activity volume in an explicit window such as page views, research actions, computations, searches or openings. These remain separately labeled and MUST NOT be summed or presented as users. Example shape: “20 פעילים עכשיו · 56 צפיות ב־5 דקות”. A third longer-window measure such as “109 מבקרים ב־30 דקות” may be shown when space/context justifies it.

SYSTEM PULSE PROJECTION. The 2029 public pulse has bounded axes, each retaining its owner: presence/activity -> Traffic Intelligence; meaningful Now/convergence -> Reality/Global Now; Gematria corpus growth -> public accessible verified+published gematria_words projection; community activity -> public/approved Research Contribution projection; communication -> live channel_updates; personal attention -> existing private DM/notification/follow owners and NEVER Global Now.

CALCULATOR ACTIVITY. Calculator 2029 may expose a contextual mini-pulse. Canonical compute means one settled server/canonical method-profile computation for a non-empty expression. Browser Fast Preview/keystrokes are not compute; choosing another method is not another compute. Public metrics may include computations today, unique computing sessions/researchers for the explicit window, and active calculator sessions now. Labels must distinguish computations from people.

SEARCH ACTIVITY. Public Experience may show aggregate search/research counts but MUST NOT expose another user’s search terms. Canonical future decision consumers read the Traffic semantic event path. search_log remains legacy/provenance/reconciliation input until parity is proven. Current observed DRIFT (27.9.2026): traffic_daily.searches=0 while search_log contains active searches; do not publish a canonical search total from traffic_daily until reconciled.

CORPUS PULSE. Public Gematria corpus count/growth is based only on records that are verified, published and publicly accessible under the governing access policy. Internal/verified-but-unpublished rows never inflate a public corpus count. “New” uses the governed effective-publication/visibility moment, not a technical insert timestamp when those differ. Quiet periods display last meaningful public update rather than fabricate a live state.

COMMUNITY PULSE. Public community pulse consumes approved/public research_contributions (and owner-approved public projections over them). Legacy chat_messages is not the 2029 Community owner. direct_messages and user_notifications are private Personal Attention and are never aggregated into public “community messages” content; only safe aggregate counts may be used if explicitly governed later.

GLOBAL NOW != SYSTEM PULSE. System Pulse answers “what is active/changing?” with truthful aggregate state. Global Now answers “what became meaningful now?” through Reality/materiality semantics. High traffic does not make a finding true or important; new content does not automatically enter Global Now.

SURFACE PROJECTION. Home 2029 shows the bounded broad pulse; Calculator shows only Gematria/activity slice; Community shows the community slice; World may open the corresponding discovery lens; Admin/Control Plane may show full decomposition including bot/unknown/provenance. One underlying metric definition serves all projections.

LEGACY ABSORPTION. src/lib/systemEvents.js carries useful historical growth/informs/community/convergence projection ideas but is not a Source of Truth and must not become a parallel owner. Any 2029 reuse absorbs those presentation semantics into the current owner tree. Public legacy Hot Numbers/search-term link clouds remain non-canonical for Home 2029 and must not be reintroduced as crawlable dynamic link farms.


[UPDATE 27.9.2026 — PUBLIC AUDIENCE-SIZE DEFER V2 · Human-Gate ZURIEL]
PUBLIC DEFAULT CHANGED. The initial 2029 public System Pulse MUST NOT show audience-size / people-online / active-user / visitor-count metrics on Home, Calculator or other public surfaces by default. Traffic Intelligence continues measuring those metrics internally for Admin/Control Plane, operations, diagnostics and future product decisions.

PUBLICATION GATE. Any future public display of audience-size metrics requires a new explicit Human-Gate decision by ZURIEL. Until then, public Experience MUST omit those counts entirely rather than substitute an estimate, multiplier, minimum floor or vague social-proof number.

PUBLIC PULSE FOCUS. Initial public Pulse emphasizes observable product/research activity, not audience size. Eligible aggregate axes include: searches/research actions; canonical Calculator computations; public approved contributions; active public contributors/writers in an explicit time window; public Gematria corpus growth; public channel/update activity; and meaningful Reality/Global Now projections under their own owners.

WRITER/CONTRIBUTOR COUNT. “Active writers/contributors” means distinct public contributor identities associated with approved/public contributions in the stated window, resolved through existing Person/Contributor identity owners. Do not count private/pending/hidden contributions or infer multiple writers from aliases. The metric is aggregate; names are shown only where the underlying public contribution already authorizes public attribution.

ACTIVITY != AUDIENCE. Search count, compute count, contribution count and writer/contributor count are activity measures and MUST NOT be presented as users/visitors. Public Pulse may combine them in one compact strip because each keeps its own label and time window.

V9 PRESERVATION. v9 truthful-presence semantics remain valid for any place audience-size is later shown: exact measured population, explicit window, no multiplier/floor, no summing views into users. v10 only changes the default public projection from SHOW-PAIRED to DEFER-AUDIENCE-SIZE.


[UPDATE 27.9.2026 — JOURNEY 2029 PUBLIC PULSE V1 · Human-Gate ZURIEL]
OWNER CHECK=EXTEND_EXISTING. Traffic Intelligence measures Journey activity; Research Workspace v5 owns Journey semantics. No Journey analytics table/store is created.

CANONICAL EVENT FAMILY. New 2029 Journey telemetry uses events.surface=journey_2029 with event_type in {start,step,save,resume,fork,complete}. Every event carries only bounded non-private semantic props such as journey_kind, journey_mode, source_surface and root_type. Raw search terms, person-ref values, names, family data, private source text and other personal content MUST NOT be emitted into public Journey telemetry props. Existing events.journey_id may carry an authorized Path identity internally when appropriate; it is never public display content.

PUBLIC “יצאו למסע” METRIC. Count only canonical journey_2029/start events. The public metric “חוקרים שיצאו למסע” is the number of distinct canonical Traffic visitor/principal identities that emitted at least one valid start in the stated window. “מסעות שהתחילו” is the count of start events. These are product-activity metrics, not total site audience metrics, and may be shown even while generic visitor/user counts remain deferred under v10.

DEDUPE. Repeated start emissions for the same active Journey identity/session/root must be idempotently/deterministically deduplicated by the implementation. Steps/save/resume/fork do not increment starts. Resume is continuity, not a new Journey start unless the user explicitly begins a distinct fork/new Path.

KIND BREAKDOWN. Public aggregate may show bounded counts by journey_kind (discovery, number_expression, person_life, name, els, source_book, topic_event, general_research) when privacy thresholds/presentation policy permit. It must never expose the underlying private root/search/person content.

LEGACY EXCLUSION. surface=journey/start, journey_trace/step, ResearchProvider.trackResearch(journey), journey_saves and user_research.journeys are historical/legacy signals only and MUST NOT feed the Journey 2029 public metric. Current observed legacy traffic (27.9.2026, prior 7d: surface=journey/start and journey_trace/step present) is explicitly excluded.

SEARCH AND JOURNEY REMAIN DISTINCT. A search event remains a search metric. Only a valid Journey 2029 start per Research Workspace v5 enters Journey Pulse. This prevents search volume from inflating journey participation.
$v11$,$m${"phase": 1, "status": "locked", "compaction_v1": {"gate": "G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_V1", "owner_family": "traffic_analytics", "classified_at": "2026-09-15", "classification": "OWNER", "canonical_owner": "traffic_intelligence_law"}, "owner_routing": {"domain": "traffic_analytics", "source": "SOD1820_MASTER_OWNER_INDEX/project_codex._index/existing_owner_contracts", "version": 1, "confidence": "high", "resolution": "RESOLVED", "normalized_at": "2026-09-08", "canonical_owner": "traffic_intelligence_law"}, "source_of_truth": ["fn_human_entrances", "traffic_daily"], "clean_traffic_v1": {"branch": "claude/clean-traffic-classification-v1", "function": "public.fn_ti_clean_classification(p_from date, p_to date)", "migrations": ["20260901140000_clean_traffic_classification_foundation_v1", "20260901140500_clean_traffic_classification_revoke_public_execute", "20260901150000_clean_traffic_classification_account_evidence_fix"], "approved_at": "2026-09-01", "approved_by": "ZURIEL", "v3_modified": false, "bot_evidence": "events.is_bot=true only (existing raw signal, no new detector)", "contract_version": "clean_traffic_foundation_v1", "v3_hash_verified": "1a2e30ce9e4378b975cbf79710fb4cdb", "not_sufficient_alone": ["add", "open", "click", "internal_link_click", "multi_page", "session_span", "person_id", "is_bot=false"], "human_evidence_frozen": ["real_account", "search", "cross_search", "save", "use", "journey", "share", "share_story", "dwell>=15s"], "legacy_metric_preserved": true, "suspected_bot_v3_relation": "never treated as positive bot evidence; passed through as legacy_suspected_bot/legacy_classification_reason"}, "behavioral_bot_v3": {"signature": "direct + single_view + zero_interaction + numeric landing (/numbers or /number/*)", "approved_at": "2026-08-26T22:11:59.537149+00:00", "approved_by": "ZURIEL", "v2_preserved": true, "country_policy": "country is evidence only; no country blocking", "engagement_classifier": "not used in v3 until pagehide verified"}, "g3_disposition_v1": {"gate": "G3_IMPLEMENTATION_COMPACTION_ARCHIVE_PASS", "reason": "canonical owner survives into G3 unless explicitly superseded through owner gate", "classified_at": "2026-09-15", "classification": "KEEP_CANONICAL_OWNER", "normal_startup": true, "no_automatic_runtime_inheritance": true}, "semantic_closure_v6": {"approved_at": "2026-09-07", "approved_by": "ZURIEL", "owner_check": "EXTEND_EXISTING", "anomaly_orthogonal": true, "clean_v1_unchanged": true, "page_view_contract": "surface=page AND event_type=view", "reporting_timezone": "Asia/Jerusalem", "historical_rebucket": false, "must_foundation_now": ["report_day_helper", "page_view_split", "clean_demand_composition", "bot_observability_boundary"], "implementation_state": "approved_not_yet_implemented", "legacy_views_preserved": true, "raw_timestamp_timezone": "UTC", "bot_zero_structural_non_observation": true}, "system_pulse_2029_v1": {"approved_at": "2026-09-27", "approved_by": "ZURIEL", "known_drift": ["traffic_daily.searches=0 while search_log active on 2026-09-27"], "owner_check": "EXTEND_EXISTING", "no_new_store": true, "no_promotional_floor": true, "paired_public_metrics": ["active_people", "activity_volume"], "public_corpus_requires": ["verified", "published", "publicly_accessible"], "legacy_systemEvents_role": "projection_input_only_not_owner", "method_change_is_compute": false, "no_user_count_multiplier": true, "personal_attention_public": false, "public_search_terms_visible": false, "calculator_compute_semantics": "canonical_settled_expression_compute_only", "optional_longer_window_metric": "visitors_30m", "global_now_distinct_from_pulse": true, "preview_keystrokes_are_compute": false}, "system_pulse_2029_v2": {"approved_at": "2026-09-27", "approved_by": "ZURIEL", "public_focus": ["searches_research_actions", "calculator_computations", "approved_public_contributions", "active_public_contributors_writers", "public_corpus_growth", "public_channel_update_activity", "global_now_meaningful_projection"], "active_writer_definition": "distinct public contributor identities with approved/public contributions in explicit window", "public_audience_size_default": "DEFERRED_NOT_SHOWN", "activity_metrics_are_not_user_metrics": true, "internal_audience_measurement_preserved": true, "public_audience_size_requires_future_human_gate": true}, "journey_pulse_2029_v1": {"approved_at": "2026-09-27", "approved_by": "ZURIEL", "event_types": ["start", "step", "save", "resume", "fork", "complete"], "owner_check": "EXTEND_EXISTING", "event_surface": "journey_2029", "legacy_excluded": ["surface=journey/start", "journey_trace/step", "trackResearch(journey)", "journey_saves", "user_research.journeys"], "public_people_metric": "distinct canonical Traffic identities with journey_2029/start in window", "public_journeys_metric": "count of journey_2029/start after dedupe", "private_payload_forbidden": true, "search_is_separate_metric": true, "generic_audience_count_still_deferred": true}, "ga4_measured_truth_axis_v7": {"approved_at": "2026-09-09", "approved_by": "ZURIEL", "human_proof": false, "owner_check": "EXTEND_EXISTING", "source_layer": "GA4_MEASURED", "israel_snapshot": {"delta": 966, "pct_change": 29.76, "window_days": 45, "active_users_current": 4212, "active_users_previous_approx": 3246}, "country_dimension": "countryId", "global_bot_caution": true, "no_auto_correction": true}, "attribution_decomposition_v1": {"states": ["tagged_attributable", "referrer_attributable", "true_direct_candidate", "unknown_origin"], "approved_at": "2026-09-07", "approved_by": "ZURIEL", "forward_only": true, "classifier_unchanged": true, "implementation_branch": "gpt/product-traffic-forward-attribution-v1"}}$m$::jsonb,true,'traffic_intelligence_law',11,10,1);
