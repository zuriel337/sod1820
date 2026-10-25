import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_MAX_FILES, uploadCommunityAttachment, validateCommunityAttachment } from "../../lib/community/communityAttachments.js";
import { applySeo } from "../../lib/seo.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, VERIFIED_ARCHIVE_PROFILES, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchCommunityAuthorSummary, fetchCommunityReplies, fetchCommunityReplyCounts, fetchLinkedAccountProfiles, fetchPublicAuthorActivityPage, legacyLikeCount, publishCommunityMessage } from "../../lib/community/communityArchive.js";
import { captureCommunityScrollAnchor, mergeCommunityRefreshRows, restoreCommunityScrollAnchor, startCommunityRefresh } from "../../lib/community/communityRefresh.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import CommunitySignIn from "./CommunitySignIn.jsx";
import LegacyAccountClaim from "./LegacyAccountClaim.jsx";
import { isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { communityWriterHref, resolveCommunityWriter } from "../../lib/community/communityWriterLink.js";
import { communityPersonReturnHref } from "../../lib/community/communityPersonNavigation.js";
import { writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import "../../pages/community2029.css";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const sinceFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const sourceLabels = { openweb: "הצ׳אט הישן", community_2029: "הקהילה", number: "מספר", els: "צופן", forum: "דיון", community: "קהילה" };
const PublicContributor2029Page = lazy(() => import("../../pages/PublicContributor2029Page.jsx"));

function LiveAuthor({ row, accountProfiles, formatDate, linkAuthor = true, showAvatar = true }) {
  const accountId = row.authorUserId || row.linkedUserId || VERIFIED_ARCHIVE_PROFILES[row.authorKey]?.accountUserId;
  const account = accountId ? accountProfiles[accountId] : null;
  const name = account?.display_name || account?.username || row.authorName;
  const badge = <UserBadge name={name} avatarUrl={showAvatar ? account?.avatar_url || row.avatarUrl : null} avatarClassName="sod29-community-avatar">
    <time dateTime={row.createdAt}>{formatDate ? formatDate(row.createdAt) : dateFormat.format(new Date(row.createdAt))}</time>
  </UserBadge>;
  if (!row.authorKey || !linkAuthor) return <span className="sod29-community-author-link">{badge}</span>;
  const target = new URLSearchParams({ preview: "community", data: "live", memberCard: row.authorKey });
  return <Link className="sod29-community-author-link" to={`?${target}`} aria-label={`פתיחת כרטיס הכותב של ${name}`}>
    {badge}
  </Link>;
}

function LiveLike({ row }) {
  const reactions = row.reactions || {};
  const dislikes = Number(reactions.dislikes) || 0;
  return <div className="sod29-community-reactions">
    <ReactionBar key={JSON.stringify(reactions)} id={row.id} reactions={reactions} variant="row" />
    {dislikes > 0 ? <span className="sod29-community-dislikes" aria-label={`${dislikes} לא אהבו`}><span aria-hidden="true">👎</span> {dislikes}</span> : null}
  </div>;
}

function LiveMessage({ row, onReply, accountProfiles, showSource = false, formatDate, linkAuthor = true, showAuthorAvatar = true }) {
  const canReply = typeof onReply === "function" && (row.origin === "openweb" || row.origin === "community_2029");
  const target = row.targetType === "number" && row.targetId ? `/number/${encodeURIComponent(row.targetId)}`
    : row.targetType === "els" && row.targetId ? `/codes/${encodeURIComponent(row.targetId)}`
    : row.targetType === "topic" && row.targetId ? `/topic/${encodeURIComponent(row.targetId)}` : null;
  return <article id={`message-${row.id}`} className="sod29-community-thread">
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} formatDate={formatDate} linkAuthor={linkAuthor} showAvatar={showAuthorAvatar} /></div>
    {showSource ? <div className="sod29-community-activity-source">{sourceLabels[row.origin] || "תרומה"}{row.parentId ? " · תגובה" : ""}</div> : null}
    {showSource && row.title && row.title !== row.body ? <h4 className="sod29-community-activity-title" dir="auto">{row.title}</h4> : null}
    {row.body ? <CommunityMessageContent text={row.body} /> : <p className="sod29-community-missing-parent">תוכן הודעת המקור אינו זמין; התגובות הציבוריות נשמרו בשרשור.</p>}
    <div className="sod29-community-thread-actions">
      {canReply ? <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button> : null}
      <LiveLike row={row} />
      {showSource && target ? <Link to={target}>לתרומה המלאה ←</Link> : null}
    </div>
  </article>;
}

function LiveThread({ row, onReply, accountProfiles, replyCounts, onRepliesLoaded, refreshToken, ancestors = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyTotal, setReplyTotal] = useState(null);
  const [nextReplyOffset, setNextReplyOffset] = useState(0);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState("");
  const replyReadRef = useRef(false);
  const replyAnchorRef = useRef(null);
  const knownCount = replyCounts[row.id];
  const count = replyTotal ?? knownCount;
  const canExpand = expanded || count == null || count > 0 || replies.length > 0;
  const childrenId = `community-replies-${row.id}`;

  const loadReplies = async (offset = 0) => {
    if (replyReadRef.current) return;
    replyReadRef.current = true;
    setLoadingReplies(true); setReplyError("");
    try {
      const page = await fetchCommunityReplies(row.id, { offset, limit: offset ? undefined : Math.max(20, Math.min(100, nextReplyOffset)) });
      const lineage = new Set([...ancestors, row.id]);
      const visible = page.rows.filter((item) => !lineage.has(item.id));
      replyAnchorRef.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
      const nextReplies = offset ? [...replies, ...visible.filter((item) => !replies.some((existing) => existing.id === item.id))] : mergeCommunityRefreshRows(replies, visible, "oldest", { complete: page.nextOffset >= page.count });
      setReplies(nextReplies);
      setReplyTotal(page.count);
      setNextReplyOffset(nextReplies.length);
      onRepliesLoaded(visible);
    } catch { setReplyError("לא הצלחנו לטעון את התגובות."); }
    finally { replyReadRef.current = false; setLoadingReplies(false); }
  };

  const toggleReplies = () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (replyTotal === null) loadReplies();
  };
  useEffect(() => { if (expanded && !document.hidden) loadReplies(0); }, [refreshToken]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(replyAnchorRef.current); replyAnchorRef.current = null; }, [replies]);

  return <div className="sod29-community-thread-group">
    <LiveMessage row={row} onReply={onReply} accountProfiles={accountProfiles} />
    {canExpand ? <button type="button" className="sod29-community-replies-toggle" aria-expanded={expanded} aria-controls={childrenId} onClick={toggleReplies}>{expanded ? "הסתר תגובות" : "הצג תגובות"}{count != null ? ` (${count.toLocaleString("he-IL")})` : ""}</button> : null}
    <div id={childrenId} className="sod29-community-replies" hidden={!expanded}>
      {replyError ? <p role="alert">{replyError} <button type="button" onClick={() => loadReplies(nextReplyOffset)}>ניסיון נוסף</button></p> : null}
      {loadingReplies && !replies.length ? <p role="status">טוען תגובות…</p> : null}
      {replies.map((reply) => <LiveThread key={reply.id} row={reply} onReply={onReply} accountProfiles={accountProfiles} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={refreshToken} ancestors={[...ancestors, row.id]} />)}
      {!loadingReplies && !replyError && replyTotal === 0 ? <p>אין תגובות גלויות.</p> : null}
      {replyTotal != null && nextReplyOffset < replyTotal ? <button type="button" className="sod29-community-more-replies" disabled={loadingReplies} onClick={() => loadReplies(nextReplyOffset)}>{loadingReplies ? "טוען…" : "עוד תגובות"}</button> : null}
    </div>
  </div>;
}

const NO_ACCOUNT_PROFILES = {};
const formatActivityDate = (value) => bilingualDateLabel(value) || "תאריך לא זמין";
const countLabel = (value) => Number(value).toLocaleString("he-IL");

// Controlled, embeddable author activity. Same LiveMessage/ReactionBar rows as the community feed;
// the parent owns reading and state. Totals render only when supplied.
export function PublicCommunityActivity2029({ rows = [], count = null, loading = false, error = "", onRetry, hasMore = false, onLoadMore, loadingMore = false, fullHref = "", firstAt = null, likesTotal = null, likesSource = null, itemLabel = "הודעות", onReply }) {
  const firstLabel = firstAt ? bilingualDateLabel(firstAt) : "";
  const facts = [count != null ? `${countLabel(count)} ${itemLabel}` : "", firstLabel ? `פעילות ציבורית מאז ${firstLabel}` : "", likesTotal != null ? `👍 ${countLabel(likesTotal)} ${likesSource === "verified_archive_profile_baseline" ? "לייקים בפרופיל המקור" : "לייקים בהודעות"}` : ""].filter(Boolean);
  return <div className="sod29-community-profile" aria-busy={loading || loadingMore}>
    {facts.length || fullHref ? <div className="sod29-community-profile-section">
      {facts.length ? <div><p>{facts.join(" · ")}</p></div> : null}
      {fullHref ? <Link className="sod29-community-secondary" to={fullHref}>לעמוד הכותב המלא בקהילה ←</Link> : null}
    </div> : null}
    {error ? <p role="alert">{error}{onRetry ? <> <button type="button" onClick={onRetry}>ניסיון נוסף</button></> : null}</p> : null}
    {loading && !rows.length ? <p className="sod29-community-end" role="status">טוען הודעות…</p> : null}
    <div className="sod29-community-feed">{rows.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={NO_ACCOUNT_PROFILES} showSource onReply={onReply} formatDate={formatActivityDate} linkAuthor={false} showAuthorAvatar={false} />)}</div>
    {!loading && !error && !rows.length ? <p className="sod29-community-end">אין הודעות ציבוריות משויכות.</p> : null}
    {hasMore && onLoadMore ? <button className="sod29-community-load" type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "טוען…" : "עוד הודעות"}</button> : null}
  </div>;
}

export default function CommunityLive2029({ leadingContent = null, canonicalPath = "/2029?preview=community&data=live" }) {
  const palette = use2029Palette();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const claimId = params.get("claim") || "";
  const memberId = claimId ? "" : params.get("member") || "";
  const cardId = memberId || claimId ? "" : params.get("memberCard") || "";
  const selectedAuthorId = memberId || cardId;
  const [rows, setRows] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileRows, setProfileRows] = useState([]);
  const [profileNextOffset, setProfileNextOffset] = useState(0);
  const [profileCount, setProfileCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileFilter, setProfileFilter] = useState("all");
  const [profileSort, setProfileSort] = useState("newest");
  const [profileSummary, setProfileSummary] = useState({ firstAt: null, archiveLikes: null });
  const [writer, setWriter] = useState(null);
  const [accountProfiles, setAccountProfiles] = useState({});
  const [replyCounts, setReplyCounts] = useState({});
  const [threadRefresh, setThreadRefresh] = useState(0);
  const requestedReplyCounts = useRef(new Set());
  const composerRef = useRef(null);
  const attachmentRef = useRef(null);
  const cardCloseRef = useRef(null);
  const streamRequestRef = useRef(0);
  const feedReadRef = useRef(null);
  const feedStateRef = useRef(null);
  const feedAnchorRef = useRef(null);
  const profileReturnAnchor = useRef(null);
  const loadedFeedSort = useRef(null);
  feedStateRef.current = { rows, loading, sending };

  const loadPage = useCallback(async (offset = 0, replace = false) => {
    const request = ++streamRequestRef.current;
    setLoading(true); setError("");
    const previousRead = feedReadRef.current;
    const read = (async () => {
      if (previousRead) await previousRead.catch(() => {});
      if (request !== streamRequestRef.current) return null;
      return fetchCommunityArchivePage({ offset, limit: COMMUNITY_PAGE_SIZE, sort });
    })();
    feedReadRef.current = read;
    try {
      const page = await read;
      if (request !== streamRequestRef.current) return;
      setRows((current) => replace ? page.rows : [...current, ...page.rows.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextOffset(page.nextOffset);
      if (page.count != null) setTotal(page.count);
      loadedFeedSort.current = sort;
    } catch {
      if (request !== streamRequestRef.current) return;
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally {
      if (feedReadRef.current === read) feedReadRef.current = null;
      if (request === streamRequestRef.current) setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (memberId || claimId || loadedFeedSort.current === sort) return;
    loadPage(0, true);
    return () => { streamRequestRef.current++; };
  }, [loadPage, memberId, claimId, sort]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(feedAnchorRef.current); feedAnchorRef.current = null; }, [rows]);
  useLayoutEffect(() => {
    if (!memberId && profileReturnAnchor.current) {
      restoreCommunityScrollAnchor(profileReturnAnchor.current);
      profileReturnAnchor.current = null;
    }
  }, [memberId]);
  useEffect(() => {
    if (memberId || claimId || cardId) return undefined;
    let active = true;
    const stop = startCommunityRefresh({ refresh: async () => {
      const current = feedStateRef.current;
      if (current.loading || current.sending || !current.rows.length || feedReadRef.current) return;
      const request = streamRequestRef.current;
      const read = fetchCommunityArchivePage({ limit: COMMUNITY_PAGE_SIZE, sort });
      feedReadRef.current = read;
      try {
        const page = await read;
        if (!active || document.hidden || request !== streamRequestRef.current) return;
        const merged = mergeCommunityRefreshRows(feedStateRef.current.rows, page.rows, sort, { complete: page.count != null && page.nextOffset >= page.count });
        if (merged !== feedStateRef.current.rows) {
          feedAnchorRef.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
          setRows(merged);
          setNextOffset(merged.length);
        }
        if (page.count != null) setTotal(page.count);
        // Open threads refresh through the same approved-reply reader. Closed
        // threads need only one bounded count read for this public feed page.
        const counts = await fetchCommunityReplyCounts(page.rows.map((item) => item.id));
        if (!active || document.hidden || request !== streamRequestRef.current) return;
        setReplyCounts((existing) => Object.keys(counts).every((id) => existing[id] === counts[id]) ? existing : { ...existing, ...counts });
        setThreadRefresh((value) => value + 1);
      } finally { if (feedReadRef.current === read) feedReadRef.current = null; }
    }});
    return () => { active = false; stop(); };
  }, [sort, memberId, claimId, cardId]);
  useEffect(() => { applySeo({ title: "הקהילה — סוד 1820", description: "שיחות והודעות של קהילת סוד 1820.", path: canonicalPath, noindex: true }); }, [canonicalPath]);
  useEffect(() => { let active = true; fetchLinkedAccountProfiles().then((accounts) => { if (active) setAccountProfiles(accounts); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const ids = [...new Set([...rows, ...profileRows].flatMap((row) => [row.authorUserId, row.linkedUserId]).filter(Boolean))];
    if (!ids.length) return undefined;
    let active = true;
    fetchLinkedAccountProfiles(ids).then((accounts) => { if (active) setAccountProfiles((current) => ({ ...current, ...accounts })); }).catch(() => {});
    return () => { active = false; };
  }, [rows, profileRows]);
  const onRepliesLoaded = useCallback((items) => {
    const ids = [...new Set(items.map((item) => item.id).filter((id) => !requestedReplyCounts.current.has(id)))];
    if (ids.length) {
      ids.forEach((id) => requestedReplyCounts.current.add(id));
      fetchCommunityReplyCounts(ids).then((counts) => setReplyCounts((current) => ({ ...current, ...counts })))
        .catch(() => ids.forEach((id) => requestedReplyCounts.current.delete(id)));
    }
    const accountIds = [...new Set(items.flatMap((item) => [item.authorUserId, item.linkedUserId]).filter(Boolean))];
    if (accountIds.length) fetchLinkedAccountProfiles(accountIds).then((accounts) => setAccountProfiles((current) => ({ ...current, ...accounts }))).catch(() => {});
  }, []);
  useEffect(() => { onRepliesLoaded(rows); }, [rows, onRepliesLoaded]);

  useEffect(() => {
    setProfileRows([]); setProfileNextOffset(0); setProfileCount(0); setProfileError("");
    if (!selectedAuthorId || memberId) { setProfileLoading(false); return; }
    let active = true;
    setProfileLoading(true);
    const pagePromise = memberId
      ? fetchPublicAuthorActivityPage(selectedAuthorId, { limit: COMMUNITY_PAGE_SIZE, filter: profileFilter, sort: profileSort })
      : fetchCommunityAuthorPage(selectedAuthorId, { limit: 5 });
    pagePromise.then((page) => {
      if (active) { setProfileRows(page.rows); setProfileCount(page.count); setProfileNextOffset(page.nextOffset); }
    }).catch(() => { if (active) setProfileError("לא הצלחנו לטעון את עמוד הכותב."); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [selectedAuthorId, memberId, profileFilter, profileSort]);

  useEffect(() => {
    setProfileSummary({ firstAt: null, archiveLikes: null });
    if (!selectedAuthorId || memberId) return;
    let active = true;
    fetchCommunityAuthorSummary(selectedAuthorId).then((summary) => { if (active) setProfileSummary(summary); }).catch(() => {});
    return () => { active = false; };
  }, [selectedAuthorId, memberId]);

  useEffect(() => {
    setWriter(null);
    if (!selectedAuthorId || memberId) return undefined;
    let active = true;
    resolveCommunityWriter(selectedAuthorId).then((found) => { if (active) setWriter(found); }).catch(() => {});
    return () => { active = false; };
  }, [selectedAuthorId, memberId]);

  useEffect(() => {
    if (!cardId) return;
    cardCloseRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") closeCard(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cardId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    const visible = rows.filter((row) => row.body || replyCounts[row.id] > 0);
    return needle ? visible.filter((row) => `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : visible;
  }, [query, rows, replyCounts]);
  const baseline = VERIFIED_ARCHIVE_PROFILES[selectedAuthorId];
  const linkedAccountId = profileRows.find((row) => row.linkedUserId)?.linkedUserId || baseline?.accountUserId;
  const linkedAccount = linkedAccountId ? accountProfiles[linkedAccountId] : null;
  const memberName = linkedAccount?.display_name || linkedAccount?.username || baseline?.name || profileRows[0]?.authorName || "חבר הקהילה";
  const isOwner = Boolean(user?.id && (linkedAccountId === user.id || selectedAuthorId === `user:${user.id}`));

  const closeProfile = () => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const key of ["member", "section", "item", "page", "format"]) next.delete(key);
    return next;
  });
  const closeCard = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("memberCard"); return next; });
  const writerHref = () => {
    const back = new URLSearchParams(params); back.delete("memberCard"); back.delete("member");
    const query = back.toString();
    return communityWriterHref(writer, window.location.pathname + (query ? `?${query}` : ""), window.location.origin);
  };
  const openFullProfile = () => {
    profileReturnAnchor.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
    setProfileFilter("all"); setProfileSort("newest");
    setParams((current) => { const next = new URLSearchParams(current); next.set("member", selectedAuthorId); next.delete("memberCard"); return next; });
  };
  const startReply = (row) => { setReplyTo(row); requestAnimationFrame(() => composerRef.current?.focus()); };
  const pickAttachments = (event) => {
    setAttachmentError("");
    const selected = Array.from(event.target.files || []);
    if (attachmentRef.current) attachmentRef.current.value = "";
    if (selected.length + attachments.length > COMMUNITY_ATTACHMENT_MAX_FILES) { setAttachmentError(`אפשר לצרף עד ${COMMUNITY_ATTACHMENT_MAX_FILES} קבצים להודעה.`); return; }
    try {
      selected.forEach(validateCommunityAttachment);
      setAttachments((current) => [...current, ...selected.map((file) => ({ file, url: null, name: file.name }))]);
    } catch (err) { setAttachmentError(err.message); }
  };
  const submit = async () => {
    const body = draft.trim();
    if ((!body && !attachments.length) || sending) return;
    setSending(true); setNotice(""); setAttachmentError("");
    try {
      const uploaded = [];
      for (const item of attachments) {
        const result = item.url ? item : await uploadCommunityAttachment(item.file);
        uploaded.push(result);
        if (!item.url) setAttachments((current) => current.map((entry) => entry.file === item.file ? { ...entry, ...result } : entry));
      }
      await publishCommunityMessage({ body: appendCommunityAttachments(body, uploaded), parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      if (replyTo) {
        requestedReplyCounts.current.delete(replyTo.id);
        setReplyCounts((current) => { const next = { ...current }; delete next[replyTo.id]; return next; });
        setThreadRefresh((current) => current + 1);
      }
      setDraft(""); setAttachments([]); setReplyTo(null); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      await loadPage(0, true);
    } catch { setNotice("השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר."); }
    finally { setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="קהילה" symbol="◎">
    {!memberId ? leadingContent : null}
    <main id="community-new-chat" className="sod29-community" data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      {claimId ? <LegacyAccountClaim key={claimId} contributorId={claimId} palette={palette} /> : null}
      {!memberId && !claimId ? <header className="sod29-community-intro"><div><h1>הקהילה</h1><p>השיחות שלנו, במקום אחד.</p></div></header> : null}
      {claimId ? null : memberId ? <Suspense fallback={null}>
        <PublicContributor2029Page communityAuthorKey={memberId}
          entryReturnHref={communityPersonReturnHref(window.location.pathname, params.toString(), window.location.hash)}
          communityOwnProfileHref={isOwner ? writerPersonalHref("profile", { returnTo: window.location.pathname + window.location.search }) : null}
          onCommunityReply={(item) => { closeProfile(); startReply(item); }} />
      </Suspense> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        <CommunitySignIn />
        <section className="sod29-community-composer" aria-label="כתיבת הודעה">
          <label htmlFor="community-live-draft">מה תרצו לשתף?</label>
          {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)}>ביטול תשובה</button></div> : null}
          <textarea ref={composerRef} id="community-live-draft" rows={2} maxLength={1500} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="הוסף תגובה…" />
          <CommunityMessageContent text={draft} previewsOnly />
          <div className="sod29-community-attachment-toolbar"><button type="button" className="sod29-community-text-action" disabled={sending || attachments.length >= COMMUNITY_ATTACHMENT_MAX_FILES} onClick={() => attachmentRef.current?.click()}>📎 צירוף תמונה, GIF או קובץ</button><input ref={attachmentRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.txt,.docx" onChange={pickAttachments} hidden /><small>עד 3 קבצים · עד 8MB לקובץ · PDF, TXT, DOCX ותמונות · הקבצים גלויים לציבור</small></div>
          {attachments.length ? <ul className="sod29-community-attachment-list">{attachments.map((item, index) => <li key={`${item.file.name}-${index}`}><span>{item.name}</span><button type="button" disabled={sending} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`הסרת ${item.name}`}>×</button></li>)}</ul> : null}
          {attachmentError ? <p className="sod29-community-status" role="alert">{attachmentError}</p> : null}
          <div className="sod29-community-composer-bottom"><small>{draft.length}/1500</small><button type="button" className="sod29-community-primary" disabled={(!draft.trim() && !attachments.length) || sending} onClick={submit}>{sending ? "שולח…" : "פרסום"}</button></div>
          {notice ? <p className="sod29-community-status" role="status">{notice}</p> : null}
        </section>
        <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בשיחות שבדף</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שבדף" /></label>
        <label className="sod29-community-sort sod29-community-stream-sort">סדר לפי <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option></select></label>
        {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
        {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
        <div className="sod29-community-feed">{filtered.map((row) => <LiveThread key={row.id} row={row} accountProfiles={accountProfiles} onReply={startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} />)}</div>
        {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף השיחות.</p>}
      </section><aside className="sod29-community-aside" aria-label="על הקהילה"><section className="sod29-community-side-card"><h2>שיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>שומרים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section></aside></div>}
      {cardId ? <div className="sod29-community-card-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="sod29-community-card" role="dialog" aria-modal="true" aria-label={`הודעות של ${memberName}`}>
          <button ref={cardCloseRef} type="button" className="sod29-community-card-close" onClick={closeCard} aria-label="סגירת כרטיס הכותב">×</button>
          <header className="sod29-community-card-header"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{writer?.isWriter ? <span className="sod29-community-writer-chip">כותב</span> : null}{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{profileSummary.firstAt ? <p>פעילות ציבורית מאז {sinceFormat.format(new Date(profileSummary.firstAt))}</p> : null}{profileSummary.archiveLikes != null ? <strong>👍 {profileSummary.archiveLikes.toLocaleString("he-IL")} לייקים בהודעות</strong> : baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
          {baseline?.isPrivate ? <p className="sod29-community-card-note">פרטי הפרופיל פרטיים; ההודעות שכבר פורסמו ציבוריות.</p> : null}
          <div className="sod29-community-card-section"><h3>ההודעות של {memberName}</h3>{!profileLoading && !profileError && Number.isSafeInteger(profileCount) ? <span>{profileCount.toLocaleString("he-IL")} הודעות</span> : null}</div>
          {profileLoading ? <p className="sod29-community-card-note" role="status">טוען הודעות…</p> : null}
          {profileError ? <p className="sod29-community-card-note" role="alert">{profileError}</p> : null}
          <div className="sod29-community-card-messages">{profileRows.slice(0, 4).map((row) => <article key={row.id}><div className="sod29-community-card-meta"><span>{row.origin === "openweb" ? `הצ׳אט הוותיק · ${row.authorName}` : "הקהילה"}</span><time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time></div><p dir="auto">{row.body}</p><div>{legacyLikeCount(row.reactions) > 0 ? <span>👍 {legacyLikeCount(row.reactions)}</span> : null}{row.parentId ? <span>תגובה בצ׳אט</span> : null}</div></article>)}</div>
          {!profileLoading && !profileRows.length && !profileError ? <p className="sod29-community-card-note">אין הודעות ציבוריות לכותב זה.</p> : null}
          {writer ? <Link className="sod29-community-card-full sod29-community-card-writer" to={writerHref()}>{writer.isWriter ? "לדף הכותב ←" : "לדף הפרופיל ←"}</Link> : null}
          <button type="button" className={writer ? "sod29-community-card-full sod29-community-card-secondary" : "sod29-community-card-full"} onClick={openFullProfile}>{writer ? "כל ההודעות בקהילה ←" : "לעמוד הכותב המלא ←"}</button>
        </section>
      </div> : null}
    </main>
  </Sod2029Shell>;
}
