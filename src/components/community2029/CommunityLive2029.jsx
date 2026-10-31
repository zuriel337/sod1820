import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_MAX_FILES, uploadCommunityAttachment, validateCommunityAttachment } from "../../lib/community/communityAttachments.js";
import { applySeo } from "../../lib/seo.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, VERIFIED_ARCHIVE_PROFILES, compareCommunityLikedRows, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchCommunityAuthorSummary, fetchCommunityReply, fetchCommunityReplies, fetchCommunityReplyCounts, fetchCommunityThread, fetchLinkedAccountProfiles, fetchPublicAuthorActivityPage, legacyLikeCount, normalizeCommunityThreadFocus, publishCommunityMessage } from "../../lib/community/communityArchive.js";
import { captureCommunityScrollAnchor, mergeCommunityRefreshRows, restoreCommunityScrollAnchor, startCommunityRefresh } from "../../lib/community/communityRefresh.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import CommunitySignIn from "./CommunitySignIn.jsx";
import LegacyAccountClaim from "./LegacyAccountClaim.jsx";
import { isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { communityWriterHref, resolveCommunityWriter } from "../../lib/community/communityWriterLink.js";
import { communityPersonReturnHref } from "../../lib/community/communityPersonNavigation.js";
import { personalMessagesReturnHref, writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import "../../pages/community2029.css";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";
import { MessageConfirm, MessageEditor } from "./CommunityMessageManage.jsx";
import { useCommunityMessageActions2029 } from "./useCommunityMessageActions2029.js";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const sinceFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const sourceLabels = { openweb: "הצ׳אט הישן", community_2029: "הקהילה", number: "מספר", els: "צופן", forum: "דיון", community: "קהילה" };
const PublicContributor2029Page = lazy(() => import("../../pages/PublicContributor2029Page.jsx"));

function LiveAuthor({ row, accountProfiles, formatDate, linkAuthor = true, showAvatar = true }) {
  const [currentParams] = useSearchParams();
  const accountId = row.authorUserId || row.linkedUserId || VERIFIED_ARCHIVE_PROFILES[row.authorKey]?.accountUserId;
  const account = accountId ? accountProfiles[accountId] : null;
  const name = account?.display_name || account?.username || row.authorName;
  const badge = <UserBadge name={name} avatarUrl={showAvatar ? account?.avatar_url || row.avatarUrl : null} avatarClassName="sod29-community-avatar">
    <time dateTime={row.createdAt}>{formatDate ? formatDate(row.createdAt) : dateFormat.format(new Date(row.createdAt))}</time>
  </UserBadge>;
  if (!row.authorKey || !linkAuthor) return <span className="sod29-community-author-link">{badge}</span>;
  const target = new URLSearchParams(currentParams);
  target.set("preview", "community"); target.set("data", "live"); target.set("memberCard", row.authorKey); target.delete("member");
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

function LiveMessage({ row: sourceRow, onReply, accountProfiles, showSource = false, formatDate, linkAuthor = true, showAuthorAvatar = true, focused = false, messageActions }) {
  const row = { ...sourceRow, ...messageActions?.patches[sourceRow.id] };
  const permissions = messageActions?.items[row.id];
  const [selection, setSelection] = useState({ principalKey: null, mode: null });
  const editButton = useRef(null);
  const actor = messageActions?.principalKey || null;
  const mode = actor && selection.principalKey === actor
    && (selection.mode === "edit" && permissions?.canEdit || selection.mode === "delete" && permissions?.canDelete)
    ? selection.mode : null;
  const open = mode => setSelection({ principalKey: actor, mode });
  const close = () => { open(null); requestAnimationFrame(() => editButton.current?.focus()); };
  const canReply = typeof onReply === "function" && (row.origin === "openweb" || row.origin === "community_2029");
  const target = row.targetType === "number" && row.targetId ? `/number/${encodeURIComponent(row.targetId)}`
    : row.targetType === "els" && row.targetId ? `/codes/${encodeURIComponent(row.targetId)}`
    : row.targetType === "topic" && row.targetId ? `/topic/${encodeURIComponent(row.targetId)}` : null;
  if (row.isDeleted) return <article id={`message-${row.id}`} className={`sod29-community-thread sod29-community-thread--deleted${focused ? " is-focused" : ""}`} tabIndex={focused ? -1 : undefined}>
    <p className="sod29-community-deleted" role="note">ההודעה נמחקה</p>
  </article>;
  return <article id={`message-${row.id}`} className={`sod29-community-thread${focused ? " is-focused" : ""}`} tabIndex={focused ? -1 : undefined}>
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} formatDate={formatDate} linkAuthor={linkAuthor} showAvatar={showAuthorAvatar} /></div>
    {row.editedAt ? <p className="sod29-community-edited">נערך · {bilingualDateLabel(row.editedAt) || "תאריך לא זמין"}</p> : null}
    {showSource ? <div className="sod29-community-activity-source">{sourceLabels[row.origin] || "תרומה"}{row.parentId ? " · תגובה" : ""}</div> : null}
    {showSource && row.title && row.title !== row.body ? <h4 className="sod29-community-activity-title" dir="auto">{row.title}</h4> : null}
    {mode === "edit" ? <MessageEditor key={`${actor}:${row.id}`} row={row} actions={messageActions} onCancel={close} onSaved={close} />
      : row.body ? <CommunityMessageContent text={row.body} /> : <p className="sod29-community-missing-parent">תוכן הודעת המקור אינו זמין; התגובות הציבוריות נשמרו בשרשור.</p>}
    <div className="sod29-community-thread-actions">
      {canReply ? <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button> : null}
      <LiveLike row={row} />
      {showSource && target ? <Link to={target}>לתרומה המלאה ←</Link> : null}
      {permissions?.state === "ready" && permissions.canEdit && mode !== "edit" ? <button type="button" ref={editButton} className="sod29-community-manage-action" onClick={() => open("edit")}>עריכה</button> : null}
      {permissions?.state === "ready" && permissions.canDelete && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => open("delete")}>מחיקה</button> : null}
    </div>
    {permissions?.reason === "source_requires_review" ? <p className="sod29-community-edited">עדכון המקור דורש בדיקה.</p> : null}
    {mode === "delete" ? <MessageConfirm key={`${actor}:${row.id}`} row={row} actions={messageActions} onCancel={close} onDone={close} /> : null}
  </article>;
}

function LiveThread({ row, onReply, accountProfiles, replyCounts, onRepliesLoaded, refreshToken, ancestors = [], focusPath = [], messageActions }) {
  const focusIndex = focusPath.indexOf(row.id);
  const focusChildId = focusIndex >= 0 ? focusPath[focusIndex + 1] || null : null;
  const focused = focusPath.length > 0 && focusPath[focusPath.length - 1] === row.id;
  const [expanded, setExpanded] = useState(Boolean(focusChildId));
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

  useEffect(() => {
    if (!focusChildId) return undefined;
    let active = true;
    setExpanded(true); setLoadingReplies(true); setReplyError("");
    fetchCommunityReply(row.id, focusChildId).then((reply) => {
      if (!active) return;
      if (!reply) { setReplyError("התגובה המבוקשת אינה ציבורית או אינה זמינה."); return; }
      setReplies([reply]); setReplyTotal(1); setNextReplyOffset(1); onRepliesLoaded([reply]);
    }).catch(() => { if (active) setReplyError("לא הצלחנו לטעון את התגובה המבוקשת."); })
      .finally(() => { if (active) setLoadingReplies(false); });
    return () => { active = false; };
  }, [focusChildId, onRepliesLoaded, row.id]);
  useLayoutEffect(() => {
    if (!focused) return;
    const target = document.getElementById(`message-${row.id}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [focused]);

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
  useEffect(() => { if (expanded && !focusChildId && !document.hidden) loadReplies(0); }, [refreshToken, focusChildId]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(replyAnchorRef.current); replyAnchorRef.current = null; }, [replies]);

  return <div className="sod29-community-thread-group">
    <LiveMessage row={row} onReply={onReply} accountProfiles={accountProfiles} focused={focused} messageActions={messageActions} />
    {canExpand ? <button type="button" className="sod29-community-replies-toggle" aria-expanded={expanded} aria-controls={childrenId} onClick={toggleReplies}>{expanded ? "הסתר תגובות" : "הצג תגובות"}{count != null ? ` (${count.toLocaleString("he-IL")})` : ""}</button> : null}
    <div id={childrenId} className="sod29-community-replies" hidden={!expanded}>
      {replyError ? <p role="alert">{replyError} <button type="button" onClick={() => loadReplies(nextReplyOffset)}>ניסיון נוסף</button></p> : null}
      {loadingReplies && !replies.length ? <p role="status">טוען תגובות…</p> : null}
      {replies.map((reply) => <LiveThread key={reply.id} row={reply} onReply={onReply} accountProfiles={accountProfiles} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={refreshToken} ancestors={[...ancestors, row.id]} focusPath={focusPath} messageActions={messageActions} />)}
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
export function PublicCommunityActivity2029({ rows = [], count = null, loading = false, error = "", onRetry, hasMore = false, onLoadMore, loadingMore = false, fullHref = "", firstAt = null, likesTotal = null, likesSource = null, itemLabel = "הודעות", onReply, onMessagesChanged }) {
  const messageActions = useCommunityMessageActions2029(rows, onMessagesChanged);
  const firstLabel = firstAt ? bilingualDateLabel(firstAt) : "";
  const facts = [count != null ? `${countLabel(count)} ${itemLabel}` : "", firstLabel ? `פעילות ציבורית מאז ${firstLabel}` : "", likesTotal != null ? `👍 ${countLabel(likesTotal)} ${likesSource === "verified_archive_profile_baseline" ? "לייקים בפרופיל המקור" : "לייקים בהודעות"}` : ""].filter(Boolean);
  return <div className="sod29-community-profile" aria-busy={loading || loadingMore}>
    {facts.length || fullHref ? <div className="sod29-community-profile-section">
      {facts.length ? <div><p>{facts.join(" · ")}</p></div> : null}
      {fullHref ? <Link className="sod29-community-secondary" to={fullHref}>לעמוד הכותב המלא בקהילה ←</Link> : null}
    </div> : null}
    {error ? <p role="alert">{error}{onRetry ? <> <button type="button" onClick={onRetry}>ניסיון נוסף</button></> : null}</p> : null}
    {loading && !rows.length ? <p className="sod29-community-end" role="status">טוען הודעות…</p> : null}
    {messageActions.principalKey && messageActions.state === "unavailable" ? <p role="status">אפשרויות העריכה אינן זמינות כרגע. <button type="button" className="sod29-community-secondary" onClick={messageActions.retry}>ניסיון נוסף</button></p> : null}
    <div className="sod29-community-feed">{rows.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={NO_ACCOUNT_PROFILES} showSource onReply={onReply} formatDate={formatActivityDate} linkAuthor={false} showAuthorAvatar={false} messageActions={messageActions} />)}</div>
    {!loading && !error && !rows.length ? <p className="sod29-community-end">אין הודעות ציבוריות משויכות.</p> : null}
    {hasMore && onLoadMore ? <button className="sod29-community-load" type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "טוען…" : "עוד הודעות"}</button> : null}
  </div>;
}

export default function CommunityLive2029({ leadingContent = null, trailingContent = null, canonicalPath = "/2029?preview=community&data=live" }) {
  const palette = use2029Palette();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const claimId = params.get("claim") || "";
  const memberId = claimId ? "" : params.get("member") || "";
  const cardId = memberId || claimId ? "" : params.get("memberCard") || "";
  const selectedAuthorId = memberId || cardId;
  const threadIdParam = params.get("thread") || "";
  const replyIdParam = params.get("reply") || "";
  const threadPathParam = params.get("path") || "";
  const threadFocus = useMemo(() => normalizeCommunityThreadFocus({ threadId: threadIdParam, replyId: replyIdParam, path: threadPathParam }), [threadIdParam, replyIdParam, threadPathParam]);
  const threadReturnHref = personalMessagesReturnHref(params.get("returnTo")) || canonicalPath;
  const fullThreadHref = `/2029?${new URLSearchParams({ preview: "community", data: "live", thread: threadFocus?.threadId || "", returnTo: threadReturnHref })}`;
  const [rows, setRows] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [loading, setLoading] = useState(true);
  const [feedSettled, setFeedSettled] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const sort = ["newest", "oldest", "liked"].includes(params.get("sort")) ? params.get("sort") : "newest";
  // Keep the loaded date window when switching to likes, including after a
  // reload. The public reader continues to receive only its supported sorts.
  const fetchSort = sort === "oldest" || sort === "liked" && params.get("sourceSort") === "oldest" ? "oldest" : "newest";
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const composerPrincipal = user?.id || null;
  const activeComposerPrincipal = useRef(composerPrincipal);
  activeComposerPrincipal.current = composerPrincipal;
  useEffect(() => {
    setDraft(""); setAttachments([]); setReplyTo(null); setNotice(""); setAttachmentError(""); setSending(false);
  }, [composerPrincipal]);
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
  const onMessageChanged = useCallback(() => setThreadRefresh(value => value + 1), []);
  const messageActions = useCommunityMessageActions2029(rows, onMessageChanged);
  const [focusedThread, setFocusedThread] = useState(null);
  const [focusedThreadState, setFocusedThreadState] = useState("idle");
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
      return fetchCommunityArchivePage({ offset, limit: COMMUNITY_PAGE_SIZE, sort: fetchSort });
    })();
    feedReadRef.current = read;
    try {
      const page = await read;
      if (request !== streamRequestRef.current) return;
      setRows((current) => replace ? page.rows : [...current, ...page.rows.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNextOffset(page.nextOffset);
      if (page.count != null) setTotal(page.count);
      loadedFeedSort.current = fetchSort;
    } catch {
      if (request !== streamRequestRef.current) return;
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally {
      if (feedReadRef.current === read) feedReadRef.current = null;
      if (request === streamRequestRef.current) { setLoading(false); setFeedSettled(true); }
    }
  }, [fetchSort]);

  useEffect(() => {
    if (!feedSettled || window.location.hash !== "#legacy-chat") return undefined;
    // The source is mounted immediately; when the first feed completes, its
    // height can move the source below the initial hash position.
    const frame = requestAnimationFrame(() => document.getElementById("legacy-chat")?.scrollIntoView({ block: "start", behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [feedSettled]);

  useEffect(() => {
    if (memberId || claimId || threadFocus || loadedFeedSort.current === fetchSort) return;
    loadPage(0, true);
    return () => { streamRequestRef.current++; };
  }, [loadPage, memberId, claimId, fetchSort, threadFocus]);
  useEffect(() => {
    setFocusedThread(null);
    if (!threadFocus) { setFocusedThreadState("idle"); return undefined; }
    let active = true;
    setFocusedThreadState("loading");
    fetchCommunityThread(threadFocus.threadId).then((thread) => {
      if (!active) return;
      setFocusedThread(thread);
      setFocusedThreadState(thread ? "ready" : "not_found");
    }).catch(() => { if (active) setFocusedThreadState("error"); });
    return () => { active = false; };
  }, [threadFocus]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(feedAnchorRef.current); feedAnchorRef.current = null; }, [rows]);
  useLayoutEffect(() => {
    if (!memberId && profileReturnAnchor.current) {
      restoreCommunityScrollAnchor(profileReturnAnchor.current);
      profileReturnAnchor.current = null;
    }
  }, [memberId]);
  useEffect(() => {
    if (memberId || claimId || cardId || threadFocus) return undefined;
    let active = true;
    const stop = startCommunityRefresh({ refresh: async () => {
      const current = feedStateRef.current;
      if (current.loading || current.sending || !current.rows.length || feedReadRef.current) return;
      const request = streamRequestRef.current;
      const read = fetchCommunityArchivePage({ limit: COMMUNITY_PAGE_SIZE, sort: fetchSort });
      feedReadRef.current = read;
      try {
        const page = await read;
        if (!active || document.hidden || request !== streamRequestRef.current) return;
        const merged = mergeCommunityRefreshRows(feedStateRef.current.rows, page.rows, fetchSort, { complete: page.count != null && page.nextOffset >= page.count });
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
  }, [fetchSort, memberId, claimId, cardId, threadFocus]);
  useEffect(() => { applySeo({ title: "הקהילה — סוד 1820", description: "שיחות והודעות של קהילת סוד 1820.", path: canonicalPath, noindex: true }); }, [canonicalPath]);
  useEffect(() => { let active = true; fetchLinkedAccountProfiles().then((accounts) => { if (active) setAccountProfiles(accounts); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const ids = [...new Set([...rows, ...profileRows, focusedThread].filter(Boolean).flatMap((row) => [row.authorUserId, row.linkedUserId]).filter(Boolean))];
    if (!ids.length) return undefined;
    let active = true;
    fetchLinkedAccountProfiles(ids).then((accounts) => { if (active) setAccountProfiles((current) => ({ ...current, ...accounts })); }).catch(() => {});
    return () => { active = false; };
  }, [rows, profileRows, focusedThread]);
  const onRepliesLoaded = useCallback((items) => {
    messageActions.register(items);
    const ids = [...new Set(items.map((item) => item.id).filter((id) => !requestedReplyCounts.current.has(id)))];
    if (ids.length) {
      ids.forEach((id) => requestedReplyCounts.current.add(id));
      fetchCommunityReplyCounts(ids).then((counts) => setReplyCounts((current) => ({ ...current, ...counts })))
        .catch(() => ids.forEach((id) => requestedReplyCounts.current.delete(id)));
    }
    const accountIds = [...new Set(items.flatMap((item) => [item.authorUserId, item.linkedUserId]).filter(Boolean))];
    if (accountIds.length) fetchLinkedAccountProfiles(accountIds).then((accounts) => setAccountProfiles((current) => ({ ...current, ...accounts }))).catch(() => {});
  }, [messageActions.register]);
  useEffect(() => { onRepliesLoaded(rows); }, [rows, onRepliesLoaded]);
  useEffect(() => { if (focusedThread) onRepliesLoaded([focusedThread]); }, [focusedThread, onRepliesLoaded]);

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
    const visible = rows.filter((row) => row.isDeleted || row.body || replyCounts[row.id] > 0);
    const matching = needle ? visible.filter((row) => `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : visible;
    return sort === "liked" ? [...matching].sort(compareCommunityLikedRows) : matching;
  }, [query, rows, replyCounts, sort]);
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
    const principal = composerPrincipal;
    const isCurrent = () => activeComposerPrincipal.current === principal;
    try {
      const uploaded = [];
      for (const item of attachments) {
        const result = item.url ? item : await uploadCommunityAttachment(item.file);
        if (!isCurrent()) return;
        uploaded.push(result);
        if (!item.url) setAttachments((current) => current.map((entry) => entry.file === item.file ? { ...entry, ...result } : entry));
      }
      if (!isCurrent()) return;
      await publishCommunityMessage({ body: appendCommunityAttachments(body, uploaded), parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      if (!isCurrent()) return;
      if (replyTo) {
        requestedReplyCounts.current.delete(replyTo.id);
        setReplyCounts((current) => { const next = { ...current }; delete next[replyTo.id]; return next; });
        setThreadRefresh((current) => current + 1);
      }
      setDraft(""); setAttachments([]); setReplyTo(null); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      await loadPage(0, true);
    } catch { if (isCurrent()) setNotice("השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר."); }
    finally { if (isCurrent()) setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="קהילה" symbol="◎">
    {!memberId ? leadingContent : null}
    <main id="community-new-chat" className={`sod29-community${!memberId && !claimId ? " sod29-community--full" : ""}`} data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      {claimId ? <LegacyAccountClaim key={claimId} contributorId={claimId} palette={palette} /> : null}
      {!memberId && !claimId ? <header className="sod29-community-intro"><div><h1>הקהילה</h1><p>מקום לשתף, לשאול ולגלות יחד.</p></div></header> : null}
      {claimId ? null : memberId ? <Suspense fallback={null}>
        <PublicContributor2029Page communityAuthorKey={memberId}
          entryReturnHref={communityPersonReturnHref(window.location.pathname, params.toString(), window.location.hash)}
          communityOwnProfileHref={isOwner ? writerPersonalHref("profile", { returnTo: window.location.pathname + window.location.search }) : null}
          onCommunityReply={(item) => { closeProfile(); startReply(item); }} />
      </Suspense> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        <CommunitySignIn compact />
        {messageActions.principalKey && messageActions.state === "unavailable" ? <p role="status">אפשרויות העריכה אינן זמינות כרגע. <button type="button" className="sod29-community-secondary" onClick={messageActions.retry}>ניסיון נוסף</button></p> : null}
        <section className="sod29-community-composer" aria-label="כתיבת הודעה">
          <label htmlFor="community-live-draft">מה תרצו לשתף?</label>
          {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)}>ביטול תשובה</button></div> : null}
          <textarea ref={composerRef} id="community-live-draft" rows={2} maxLength={1500} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="הוסף תגובה…" />
          <CommunityMessageContent text={draft} previewsOnly />
          <div className="sod29-community-attachment-toolbar"><button type="button" className="sod29-community-text-action" disabled={sending || attachments.length >= COMMUNITY_ATTACHMENT_MAX_FILES} onClick={() => attachmentRef.current?.click()}>📎 צירוף קובץ</button><input ref={attachmentRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.txt,.docx" onChange={pickAttachments} hidden /><small>עד 3 קבצים · 8MB לקובץ · גלויים לציבור</small></div>
          {attachments.length ? <ul className="sod29-community-attachment-list">{attachments.map((item, index) => <li key={`${item.file.name}-${index}`}><span>{item.name}</span><button type="button" disabled={sending} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`הסרת ${item.name}`}>×</button></li>)}</ul> : null}
          {attachmentError ? <p className="sod29-community-status" role="alert">{attachmentError}</p> : null}
          <div className="sod29-community-composer-bottom"><small>{draft.length}/1500</small><button type="button" className="sod29-community-primary" disabled={(!draft.trim() && !attachments.length) || sending} onClick={submit}>{sending ? "שולח…" : "פרסום"}</button></div>
          {notice ? <p className="sod29-community-status" role="status">{notice}</p> : null}
        </section>
        {threadFocus ? <section className="sod29-community-focus" aria-labelledby="community-focus-title">
          <header className="sod29-community-focus-head"><div><p>מתוך התגובות אליי</p><h2 id="community-focus-title">השיחה שבה התקבלה התגובה</h2></div><div>
            <Link className="sod29-community-secondary" to={threadReturnHref}>חזרה להודעות שלי</Link>
            {threadFocus.replyId ? <Link className="sod29-community-secondary" to={fullThreadHref}>לשרשור המלא</Link> : null}
          </div></header>
          {focusedThreadState === "loading" ? <p role="status">טוען את השיחה…</p> : null}
          {focusedThreadState === "error" ? <FrameState kind="error" title="טעינת השיחה נכשלה"><p>לא הצלחנו לפתוח את השיחה כרגע.</p></FrameState> : null}
          {focusedThreadState === "not_found" ? <FrameState kind="empty" title="השיחה אינה זמינה"><p>ייתכן שהשיחה אינה ציבורית או שהוסרה.</p></FrameState> : null}
          {focusedThread ? <LiveThread key={focusedThread.id} row={focusedThread} accountProfiles={accountProfiles} onReply={startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} focusPath={threadFocus.path} messageActions={messageActions} /> : null}
        </section> : <>
          <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בשיחות שבדף</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שבדף" /></label>
          <section className="sod29-community-feed-controls" aria-label="סידור וסינון השיחות" aria-describedby="community-search-scope">
            <div className="sod29-community-feed-controls-top">
              <label className="sod29-community-sort sod29-community-stream-sort">סדר לפי <select value={sort} aria-describedby="community-search-scope" onChange={event => {
                const value = event.target.value;
                setParams(current => {
                  const next = new URLSearchParams(current);
                  if (value === "newest") next.delete("sort"); else next.set("sort", value);
                  if (value === "liked" && fetchSort === "oldest") next.set("sourceSort", "oldest"); else next.delete("sourceSort");
                  return next;
                });
              }}>
                <option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option><option value="liked">הכי אהוב</option>
              </select></label>
            </div>
            <div className="sod29-community-feed-filter-chips" role="group" aria-label="סינון שיחות" tabIndex={0}>
              <button type="button" aria-pressed={!query.trim()} onClick={() => setQuery("")}>הכול</button>
            </div>
            <p id="community-search-scope" className="sod29-community-feed-controls-note">{sort === "liked" ? "לפי מספר הלייקים, מתוך ההודעות שכבר נטענו בלבד. החיפוש חל על אותן הודעות." : "החיפוש מציג התאמות מתוך ההודעות שכבר נטענו."}</p>
          </section>
          {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
          {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
          <div className="sod29-community-feed">{filtered.map((row) => <LiveThread key={row.id} row={row} accountProfiles={accountProfiles} onReply={startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} messageActions={messageActions} />)}</div>
          {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף השיחות.</p>}
        </>}
      </section></div>}
      {!memberId && !claimId ? <footer className="sod29-community-public-footer" aria-label="השתתפות בקהילה">
        {trailingContent && !threadFocus ? <a href="#legacy-chat">לשיחות הוותיקות ↓</a> : null}
        <p>משתפים בכבוד, מצרפים מקורות כשאפשר ושומרים על הפרטיות.</p>
      </footer> : null}
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
    {!memberId && !claimId && !threadFocus ? trailingContent : null}
  </Sod2029Shell>;
}
