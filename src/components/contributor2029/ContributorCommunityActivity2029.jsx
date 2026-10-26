import React, { useEffect, useRef, useState } from "react";
import { fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, VERIFIED_ARCHIVE_PROFILES } from "../../lib/community/communityArchive.js";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { PublicCommunityActivity2029 } from "../community2029/CommunityLive2029.jsx";
import { validCommunityAuthorKey, communityPersonHref } from "../../lib/community/communityPersonNavigation.js";
import "../../pages/community2029.css";

// This is only a connection to the existing community author reader/view.
// Source catalogue publications are never converted into community messages.
export default function ContributorCommunityActivity2029({ authorKey, enabled = true, filter = "all", sort = "newest", initial = null, onReply }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, loading: true, rows: [], offset: 0 });
  const [summary, setSummary] = useState({ key: null });
  const pending = useRef(false);
  const valid = validCommunityAuthorKey(authorKey);
  const requestKey = `${authorKey || ""}:${enabled}:${filter}:${sort}:${attempt}`;
  const request = useRef(requestKey); request.current = requestKey;
  useEffect(() => {
    if (!enabled || !valid) return;
    let alive = true; pending.current = false;
    if (attempt === 0 && sort === "newest" && initial?.authorKey === authorKey && initial.filter === filter) {
      const page = initial.page;
      setState({ key: authorKey, loading: false, rows: page.rows, count: page.count, offset: page.nextOffset, lastPageSize: page.rows.length });
      setSummary({ key: authorKey, ...initial.summary });
      return () => { alive = false; };
    }
    setState({ key: authorKey, loading: true, rows: [], offset: 0 });
    const client = getPublicResearchClient();
    fetchPublicAuthorActivityPage(authorKey, { limit: 20, filter, sort, client }).then(page => {
      if (alive) setState({ key: authorKey, loading: false, rows: page.rows, count: page.count, offset: page.nextOffset, lastPageSize: page.rows.length });
    }).catch(() => { if (alive) setState({ key: authorKey, loading: false, rows: [], offset: 0, error: true }); });
    fetchCommunityAuthorSummary(authorKey, { client }).then(value => { if (alive) setSummary({ key: authorKey, ...value }); })
      .catch(() => { if (alive) setSummary({ key: authorKey }); });
    return () => { alive = false; };
  }, [authorKey, enabled, valid, filter, sort, initial, attempt]);
  async function loadMore() {
    if (pending.current || state.key !== authorKey || (state.count == null ? state.lastPageSize < 20 : state.offset >= state.count)) return;
    const key = request.current;
    pending.current = true;
    setState(value => ({ ...value, loadingMore: true, error: false }));
    try {
      const page = await fetchPublicAuthorActivityPage(authorKey, { offset: state.offset, limit: 20, filter, sort, client: getPublicResearchClient() });
      if (key === request.current) setState(value => ({ ...value, rows: [...new Map([...value.rows, ...page.rows].map(row => [row.id, row])).values()], count: page.count, offset: page.nextOffset, lastPageSize: page.rows.length, loadingMore: false }));
    } catch { if (key === request.current) setState(value => ({ ...value, loadingMore: false, error: true })); }
    finally { if (key === request.current) pending.current = false; }
  }
  if (!enabled) return null;
  const data = state.key === authorKey ? state : { loading: true, rows: [] };
  const detail = summary.key === authorKey ? summary : {};
  const baseline = VERIFIED_ARCHIVE_PROFILES[authorKey];
  const fullHref = valid && !initial ? communityPersonHref(authorKey) : null;
  return <PublicCommunityActivity2029 rows={data.rows} count={data.count} loading={valid && data.loading} error={!valid || data.error ? "לא הצלחנו לטעון את פעילות הכותב בקהילה." : ""}
    onRetry={() => setAttempt(value => value + 1)} hasMore={data.count == null ? data.lastPageSize === 20 : data.offset < data.count} onLoadMore={loadMore} loadingMore={data.loadingMore}
    fullHref={fullHref} firstAt={detail.firstAt} likesTotal={detail.archiveLikes ?? (baseline?.isPrivate === false ? baseline.likes : null)}
    likesSource={detail.archiveLikes != null ? "public_community_author_summary" : "verified_archive_profile_baseline"}
    itemLabel={filter === "chat" ? "הודעות" : "פריטי פעילות"} onReply={onReply} />;
}
