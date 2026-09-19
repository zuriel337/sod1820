-- G3_SYSTEM_UPGRADE_RADAR_V2 — EXTEND_EXISTING system_suggestions_law v2 / system-watchman.
--
-- Adds a third detector ("dependency_upgrade_radar") to the existing public.detect_suggestions(),
-- which is already invoked weekly by the existing system-watchman-weekly cron job through
-- public.system_watchman_run(false) -> public.detect_suggestions() -> public.suggest_add().
-- No new table/store/registry/cron job/Edge Function. No second maintenance/upgrade system.
--
-- WHAT IT DOES: checks a fixed, owner-reverified allowlist of decision-relevant runtime/platform
-- packages (the exact pinned versions in package.json/dependencies+devDependencies as of this
-- migration) against the official npm registry's "latest" dist-tag (an authoritative, structured,
-- single-host JSON feed — never HTML scraping, never an invented source). Classifies the semver
-- delta (major/minor/patch) using the plain semver rule that ANY hyphenated version string is a
-- pre-release identifier (semver.org §9), so alpha/beta/rc/canary/nightly tags are always excluded
-- from "latest" without needing to enumerate label names. Raises/dedupes a system_suggestions row
-- (category 'performance', which already has a UI mapping in SystemSuggestionsTab.jsx) through the
-- existing suggest_add() primitive — same dedupe/status/Human-Gate semantics as every other
-- detector. AI never decides/canonicalizes; ZURIEL remains the Human Gate via the existing
-- accept/reject/later flow.
--
-- SECURITY / FAIL-CLOSED:
--   * Outbound requests target exactly two allowlisted authoritative hosts:
--     https://registry.npmjs.org for npm packages and https://nodejs.org/dist/index.json for Node
--     LTS releases. No arbitrary page/host is accepted from input.
--   * Each request is unauthenticated (empty header array) — no secret/Vault value ever enters the
--     URL, a header, or the suggestion payload.
--   * Each request is bounded via extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '3000') (reset
--     after the loop), reusing the exact same extensions.http(...) synchronous-call pattern already
--     live in this project (see 20260829124609_m3_m4_admin_rpc_authorization_closure.sql and
--     20260808_infra_load_async_fb_publish.sql) rather than pg_net, whose http_get()/
--     http_collect_response() cannot complete synchronously inside one function call (the request
--     is only dispatched after the calling transaction commits — see the pg_net docs).
--   * Each package is wrapped in its own BEGIN/EXCEPTION so one registry timeout/error/malformed
--     response never blocks the others and never aborts the rest of the watchman pass (fail closed,
--     per package).
--   * This slice performs no repo edit, no package install, no deploy, and no auto-acceptance of a
--     suggestion — it only ever calls the existing suggest_add() write primitive, exactly like the
--     two detectors already in this function.
--
-- SCOPE — what this migration deliberately does NOT do (reported, not silently skipped):
--   * Node runtime is now monitored because Runtime Modernization established both .nvmrc and
--     package.json engines.node. The current baseline is Node 24.21.0 LTS and the official
--     https://nodejs.org/dist/index.json feed is used to detect newer Node 24 LTS patch/minor
--     releases only. A future LTS-major transition remains a Foundation decision, not an automatic
--     recommendation from this bounded V2 detector.
--   * Provider deprecation deadlines: no existing authoritative feed/config for this is wired in
--     the codebase today. Per the assignment's own instruction not to invent facts, this sub-slice
--     is left as a documented extension point, not implemented here.
--   * Future self-upgrade (auto-opening an isolated upgrade PR / auto-running CI-Goldens / routine
--     gate-clean auto-release under deploy_on_request v2) is intentionally NOT implemented. Today,
--     system_suggestions_law v2 is observe/detect/suggest/decide only — it never self-mutates. This
--     detector only ever writes a pending system_suggestions row for ZURIEL's Human Gate decision.
--     The extension point is: once a suggestion here is accepted, a future *governed agent adapter*
--     (not created by this migration) could open the branch/PR and let the existing CI/Goldens gate
--     it, with Major/Foundation-relevant upgrades still routed through Foundation gate/challenge.
--
-- Release: BRANCH_ONLY_NO_MERGE_NO_DEPLOY_NO_LIVE_APPLY for G3_SYSTEM_UPGRADE_RADAR_V2.
-- Not applied to canonical Supabase linswmnnkjxvweumprav by this branch build.

CREATE OR REPLACE FUNCTION public.detect_suggestions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  n_raised int := 0;
  r record; best record; worst record; gap numeric; conf int;
  pending_ct int;
  v_pkg record;
  v_resp record;
  v_latest text;
  v_cur_maj int; v_cur_min int; v_cur_pat int;
  v_lat_maj int; v_lat_min int; v_lat_pat int;
  v_delta text;
  v_dep_conf int;
  v_impact text;
  v_node_current text := '24.21.0';
  v_node_latest text;
  v_node_maj int; v_node_min int; v_node_pat int;
  v_node_lat_maj int; v_node_lat_min int; v_node_lat_pat int;
begin
  -- גלאי 1: השוואת סגנונות לפי continue-rate (דורש ≥40 ניתוחים לכל סגנון, ≥2 סגנונות)
  create temp table _st on commit drop as
    select l.style_key,
           count(*) n,
           round(100.0*count(*) filter (where l.continue_ct>0)/count(*),1) cont_rate
    from ai_analysis_log l
    group by l.style_key having count(*) >= 40;
  if (select count(*) from _st) >= 2 then
    select * into best from _st order by cont_rate desc limit 1;
    select * into worst from _st order by cont_rate asc limit 1;
    gap := best.cont_rate - worst.cont_rate;
    if gap >= 10 then
      conf := least(95, round(45 + gap + least(30, (best.n+worst.n)/10.0)));
      perform suggest_add(
        'ai', 'style_continue_rate',
        format('סגנון «%s» מוביל בהמשך-מחקר על פני «%s»', best.style_key, worst.style_key),
        format('היוריסטיקה מבוססת-נתונים (לא מובהקות סטטיסטית מלאה): «%s» השיג %s%% המשך-חקירה מול %s%% של «%s», על מדגם של %s+%s ניתוחים.',
               best.style_key, best.cont_rate, worst.cont_rate, worst.style_key, best.n, worst.n),
        jsonb_build_object('best', row_to_json(best), 'worst', row_to_json(worst), 'gap_points', gap),
        conf, best.n + worst.n,
        format('הפעלת «%s» כברירת-מחדל עשויה להעלות המשך-מחקר בעד ~%s נקודות', best.style_key, round(gap)),
        'style_continue_rate:' || best.style_key || '>' || worst.style_key
      );
      if found then n_raised := n_raised + 1; end if;
    end if;
  end if;

  -- גלאי 2: נודניק — הרבה ניתוחים ממתינים לדירוג שלך (הדירוג הוא מה שמלמד את המערכת)
  select count(*) into pending_ct from ai_analysis_log where admin_rating is null;
  if pending_ct >= 20 then
    perform suggest_add(
      'ai', 'pending_ratings',
      format('%s ניתוחי-AI ממתינים לדירוג שלך', pending_ct),
      'הדירוג שלך (👍/👎 + סיבה) הוא ה«אמת המחקרית» שמזינה את דו"חות-הסגנון. ככל שתדרג יותר — ההמלצות יהיו מבוססות יותר.',
      jsonb_build_object('pending', pending_ct),
      70, pending_ct,
      'דירוג עשוי לחדד את זיהוי-הסגנון המנצח', 'pending_ratings'
    );
    if found then n_raised := n_raised + 1; end if;
  end if;

  -- גלאי 3: רדאר שדרוגי-תלות — Foundation packages מול registry.npmjs.org בלבד (stable "latest").
  -- allowlist קשיח: שם חבילה + הגרסה הנעוצה כרגע ב-package.json (ידנית, כפי שנקרא בעת כתיבת
  -- המיגרציה הזו) — אין טבלת-Registry חדשה, זו רשימה קשיחה בקוד בלבד.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '3000');
  for v_pkg in
    select * from (values
      ('react',                 '19.3.0'),
      ('react-dom',              '19.3.0'),
      ('react-router-dom',       '7.18.4'),
      ('vite',                   '8.3.0'),
      ('@vitejs/plugin-react',   '6.1.1'),
      ('@supabase/supabase-js',  '2.116.0'),
      ('@vercel/edge',           '1.3.3'),
      ('@vercel/og',             '0.11.1'),
      ('@hebcal/core',           '6.9.2')
    ) as t(pkg_name, current_version)
  loop
    begin
      v_latest := null;
      select status, content into v_resp
        from extensions.http((
          'GET',
          'https://registry.npmjs.org/' || replace(v_pkg.pkg_name, '/', '%2F') || '/latest',
          array[]::extensions.http_header[],
          null,
          null
        )::extensions.http_request);

      if v_resp.status <> 200 or v_resp.content is null then
        continue; -- registry error/non-200 for this package: skip it, never abort the pass
      end if;

      v_latest := (v_resp.content::jsonb ->> 'version');
      -- semver.org §9: any hyphen marks a pre-release identifier. Reject rather than guess.
      if v_latest is null or v_latest = '' or v_latest ~ '-' then
        continue;
      end if;

      v_cur_maj := split_part(v_pkg.current_version, '.', 1)::int;
      v_cur_min := split_part(v_pkg.current_version, '.', 2)::int;
      v_cur_pat := split_part(v_pkg.current_version, '.', 3)::int;
      v_lat_maj := split_part(v_latest, '.', 1)::int;
      v_lat_min := split_part(v_latest, '.', 2)::int;
      v_lat_pat := split_part(v_latest, '.', 3)::int;

      v_delta := null;
      if v_lat_maj > v_cur_maj then
        v_delta := 'major'; v_dep_conf := 55;
      elsif v_lat_maj = v_cur_maj and v_lat_min > v_cur_min then
        v_delta := 'minor'; v_dep_conf := 75;
      elsif v_lat_maj = v_cur_maj and v_lat_min = v_cur_min and v_lat_pat > v_cur_pat then
        v_delta := 'patch'; v_dep_conf := 90;
      end if;
      -- v_delta stays null (no suggestion raised) whenever latest <= current — including when
      -- current is already the latest published stable version.

      if v_delta is not null then
        v_impact := case v_delta
          when 'patch' then format('שדרוג patch בטוח יחסית (%s → %s) — לבדוק Changelog לתיקוני אבטחה/תקלות', v_pkg.current_version, v_latest)
          when 'minor' then format('שדרוג minor (%s → %s) — תאימות-לאחור צפויה; לבדוק Changelog לפני שדרוג', v_pkg.current_version, v_latest)
          else format('שדרוג MAJOR (%s → %s) — עלול לכלול שינויים שוברי-תאימות; דורש בדיקת Foundation לפני שדרוג', v_pkg.current_version, v_latest)
        end;
        perform suggest_add(
          'performance', 'dependency_upgrade_radar',
          format('עדכון %s זמין: %s → %s (%s)', v_pkg.pkg_name, v_pkg.current_version, v_latest, v_delta),
          'נבדק מול רשם-החבילות הרשמי (registry.npmjs.org), תג ה-"latest" היציב בלבד; גרסאות alpha/beta/rc/canary/nightly לעולם אינן נספרות.',
          jsonb_build_object(
            'package', v_pkg.pkg_name,
            'current', v_pkg.current_version,
            'latest', v_latest,
            'delta', v_delta,
            'source', 'registry.npmjs.org'
          ),
          v_dep_conf, 1, v_impact,
          'dependency_upgrade:' || v_pkg.pkg_name || ':' || v_latest
        );
        if found then n_raised := n_raised + 1; end if;
      end if;
    exception when others then
      continue; -- fail closed: never let one package's failure break the watchman pass
    end;
  end loop;
  perform extensions.http_reset_curlopt();

  -- Node 24 LTS patch/minor radar — official Node distribution index only.
  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '3000');
    v_node_latest := null;
    select status, content into v_resp
      from extensions.http((
        'GET',
        'https://nodejs.org/dist/index.json',
        array[]::extensions.http_header[],
        null,
        null
      )::extensions.http_request);

    if v_resp.status = 200 and v_resp.content is not null then
      select regexp_replace(entry ->> 'version', '^v', '')
        into v_node_latest
      from jsonb_array_elements(v_resp.content::jsonb) entry
      where (entry ->> 'version') ~ '^v24[.][0-9]+[.][0-9]+$'
        and jsonb_typeof(entry -> 'lts') = 'string'
      order by
        split_part(regexp_replace(entry ->> 'version', '^v', ''), '.', 2)::int desc,
        split_part(regexp_replace(entry ->> 'version', '^v', ''), '.', 3)::int desc
      limit 1;
    end if;
    perform extensions.http_reset_curlopt();

    if v_node_latest is not null and v_node_latest !~ '-' then
      v_node_maj := split_part(v_node_current, '.', 1)::int;
      v_node_min := split_part(v_node_current, '.', 2)::int;
      v_node_pat := split_part(v_node_current, '.', 3)::int;
      v_node_lat_maj := split_part(v_node_latest, '.', 1)::int;
      v_node_lat_min := split_part(v_node_latest, '.', 2)::int;
      v_node_lat_pat := split_part(v_node_latest, '.', 3)::int;
      v_delta := null;

      if v_node_lat_maj = v_node_maj and v_node_lat_min > v_node_min then
        v_delta := 'minor'; v_dep_conf := 85;
      elsif v_node_lat_maj = v_node_maj and v_node_lat_min = v_node_min and v_node_lat_pat > v_node_pat then
        v_delta := 'patch'; v_dep_conf := 95;
      end if;

      if v_delta is not null then
        perform suggest_add(
          'performance', 'dependency_upgrade_radar',
          format('עדכון Node LTS זמין: %s → %s (%s)', v_node_current, v_node_latest, v_delta),
          'נבדק מול index.json הרשמי של nodejs.org. הרדאר נשאר בתוך Node 24 LTS; מעבר LTS-major דורש Foundation Gate נפרד.',
          jsonb_build_object(
            'package', 'node',
            'current', v_node_current,
            'latest', v_node_latest,
            'delta', v_delta,
            'source', 'nodejs.org/dist/index.json',
            'lts_major', 24
          ),
          v_dep_conf, 1,
          format('עדכון Node 24 LTS (%s → %s) עשוי לכלול תיקוני אבטחה/יציבות; להריץ CI מלא לפני שחרור', v_node_current, v_node_latest),
          'dependency_upgrade:node:' || v_node_latest
        );
        if found then n_raised := n_raised + 1; end if;
      end if;
    end if;
  exception when others then
    perform extensions.http_reset_curlopt();
    -- fail closed: Node registry/feed failure never blocks the rest of system-watchman
  end;

  return jsonb_build_object('raised', n_raised, 'checked_at', now());
end; $function$;
