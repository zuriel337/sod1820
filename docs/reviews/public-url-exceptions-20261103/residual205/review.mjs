// Evidence overlay for the frozen205, inside the existing reconciliation only.
// Missing original bytes, a status page and an external link are distinct facts.
import { readFileSync } from "node:fs";
const evidence = name => JSON.parse(readFileSync(new URL(`./evidence/${name}`, import.meta.url)));
const http = new Map(evidence("live-http.json").rows.map(row => [row.sourceUrl, row]));
const identities = new Map(evidence("identities-source-check.json").rows.map(row => [row.source_slug, row]));
const facebook = new Set(evidence("facebook-source-check.json").rows.map(row => row.public_witness_post_id));
const decode = value => { try { return decodeURIComponent(value).replace(/\/+$/, ""); } catch { return value; } };

export function reviewResidual205(row) {
  const observed = http.get(row.sourceUrl);
  if (!observed) return row;
  const path = decode(row.sourceUrl), identity = identities.get(path.slice(1));
  const detail = {
    source: "residual205/evidence/live-http.json",
    baselineSha: "b80ad895a23b51107fd58d533d4dd93f6d4c431f",
    httpStatus: observed.status, contentType: observed.contentType,
    browser: "Legacy browser access denied/empty; not proof of deletion, restriction or a working reader",
    contentRestored: false,
  };
  if (path.startsWith("/audio/")) {
    if (!observed.htmlDocument || observed.audioMagic) throw Error("audio review evidence changed");
    Object.assign(detail, {
      legacyState:"already_broken_audio_returns_html", cutover:"existing_failure_recommended_deferral_not_accepted",
      next:"Recover original-path-to-bytes bindings from a dated media backup or the source export/provider; no filename matching",
    });
    row.launchImpact = "193 existing Legacy audio failures; restoration/explicit deferral pending, not a newly proven cutover loss";
  } else if (identity?.restricted_draft) {
    if (Number(identity.exact_redirect_identities) !== 1 || Number(identity.matched_post_identities) !== 1) throw Error("ambiguous restricted identity");
    row.status="intentionally_closed"; row.reason="exact_existing_restricted_draft_identity";
    row.launchImpact="none; keep public404 and existing private access boundary; no publication";
    Object.assign(detail,{legacyState:"restricted_existing_identity",cutover:"correctly_restricted",next:"Keep existing public exclusion; no draft content or private identifiers exported"});
  } else if (path === "/image") {
    row.status="invalid"; row.reason="disabled_search_tab_literal_not_a_public_link";
    row.launchImpact="none; SearchTabs renders this soon:true entry as a span, not an anchor; proper404 retained";
    Object.assign(detail,{legacyState:"source_only_disabled_tab",cutover:"not_an_existing_public_document",next:"Keep disabled tab and correct404; do not create a fake image-search destination"});
  } else if (/\/videos\//.test(path)) {
    if (!facebook.has(path.startsWith("/86AND26/") ? 1341 : 1362)) throw Error("missing exact external source witness");
    row.status="resolved"; row.reason="exact_external_source_link_state";
    row.launchImpact="exact provider identity/link restored; Facebook playback/access unverified, no video-content recovery claim";
    Object.assign(detail,{legacyState:"malformed_relative_external_embed",cutover:"exact_source_continuation_resolved_playback_unverified",next:"Open the exact provider video; deleted/login/region/provider restrictions remain external and unverified"});
  } else if (identity?.forum_boundary) {
    row.reason="exact_existing_forum_identity_excluded_by_public_post_boundary";
    row.launchImpact="potential cutover content loss: exact identity and anonymous visibility established; live Legacy rendering could not be accepted";
    Object.assign(detail,{legacyState:"existing_anon_readable_forum_identity_live_ui_unverified",cutover:"blocker_until_exact_forum_continuation_or_explicit_decision",next:"Provide the existing Forum Post identity a bounded public read continuation without relaxing regular Post P0-A or inventing a research-contribution UUID"});
  } else if (observed.status === 404) {
    Object.assign(detail,{legacyState:"already_broken_404_no_exact_identity",cutover:"existing_failure_recommended_deferral_not_accepted",next:"Recover exact original Post identity from source/backup; retain404 instead of guessing a similar title"});
    row.launchImpact="existing Legacy404, not a proven working link lost by cutover; source recovery/explicit deferral pending";
  } else {
    Object.assign(detail,{legacyState:"undetermined_historical_wordpress_page",cutover:"possible_blocker_requires_original_page_or_live_reader_evidence",next:"Recover the original lecture-index WP page/export and exact mapping; menu-item-3809 is a navigation ID, not a proven page ID"});
    row.reason="historical_wordpress_lecture_index_identity_unresolved";
    row.launchImpact="generic HTML206 and denied browser do not establish original lecture-index content; explanation is not recovery";
  }
  row.legacyReview=detail;
  return row;
}
