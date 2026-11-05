import CommunityHistorySeal2029 from "./CommunityHistorySeal2029.jsx";
import { canonicalCommunityAuthorKey } from "../../lib/community/communityCanonicalIdentity2029.js";
import React, { lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import AccountEntry2029 from "../auth2029/AccountEntry2029.jsx";
import { clearGuestPost, peekGuestPost, stashGuestPost } from "../../lib/community/communityGuestPost.js";
import { GUEST_NAME_MAX, cleanGuestName, fetchGuestUnreviewed, guestBodyHasLink, guestNameProblem, guestPublishErrorMessage, publishGuestCommunityMessage, readGuestName, reviewGuestMessage, saveGuestName } from "../../lib/community/communityGuestApi.js";
import { typingLabel } from "../../lib/community/communityTyping.js";
import { useCommunityTyping2029 } from "./useCommunityTyping2029.js";
import { PUBLIC_READING_PRODUCTION_ARTIFACT } from "../../lib/publicReadingRelease2029.js";
import { communityActionsLocked, publicLaunchActionsLocked } from "../../lib/publicLaunch2029.js";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_ACCEPT, COMMUNITY_ATTACHMENT_MAX_FILES, uploadCommunityAttachment, validateCommunityAttachment } from "../../lib/community/communityAttachments.js";
import { applySeo } from "../../lib/seo.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { use2029Palette } from "../../lib/palette2029.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, COMMUNITY_SEARCH_MAX_LENGTH, COMMUNITY_SEARCH_MIN_LENGTH, VERIFIED_ARCHIVE_PROFILES, compareCommunityLikedRows, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchCommunityAuthorSummary, fetchCommunityReply, fetchCommunityReplies, fetchCommunityMessagePath, fetchCommunityReplyCounts, fetchCommunityThread, fetchLinkedAccountProfiles, fetchPublicAuthorActivityPage, legacyLikeCount, normalizeCommunityThreadFocus, publishCommunityMessage, searchCommunityMessages } from "../../lib/community/communityArchive.js";
import { captureCommunityScrollAnchor, mergeCommunityRefreshRows, restoreCommunityScrollAnchor, startCommunityRefresh } from "../../lib/community/communityRefresh.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import CommunityMessageTime2029 from "./CommunityMessageTime2029.jsx";
import CommunityRichText2029 from "./CommunityRichText2029.jsx";
import CommunityPersonalActions2029 from "./CommunityPersonalActions2029.jsx";
import { useCommunityDraft2029 } from "./useCommunityDraft2029.js";
import { useCommunityReadingPosition2029 } from "./useCommunityReadingPosition2029.js";
import { historicalCommunityAvatar } from "../../lib/community/communityAvatar.js";
import { communityReadingHref } from "../../lib/community/communityReadingPosition.js";
import { appendMessageQuote, appendMessageText, plainMessageText, selectedMessageQuote } from "../../lib/community/messageFormatting.js";
import CommunitySignIn from "./CommunitySignIn.jsx";
import LegacyAccountClaim, { LegacyAccountClaimEntry } from "./LegacyAccountClaim.jsx";
import { isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import { communityWriterHref, resolveCommunityWriter } from "../../lib/community/communityWriterLink.js";
import { communityAccountReturnHref, communityChatHref, communityPersonReturnHref, communityReadingReturnHref } from "../../lib/community/communityPersonNavigation.js";
import { personalMessagesReturnHref, writerPersonalHref } from "../../lib/userCenter/writerPersonal2029.js";
import "../../pages/community2029.css";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";
import { MessageConfirm, MessageEditor } from "./CommunityMessageManage.jsx";
import { useCommunityMessageActions2029 } from "./useCommunityMessageActions2029.js";
import QuickProfileAvatar2029 from "../contributor2029/QuickProfileAvatar2029.jsx";
import publicStats from "../../lib/community/communityPublicStats2029.json";
import ShareActions from "../ShareActions.jsx";
import { communityMessageShareUrl } from "../../lib/community/communityMessageShare.js";

const sinceFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const compactMessages = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(publicStats.messages);
// Plain, non-interactive total. The extra context is for screen readers only
// (the visible text stays just the number).
function ConversationCount() {
  return <span className="sod29-community-conversation-count" data-position="top" role="img" aria-label={`${compactMessages} הודעות, כולל הצ׳אט הישן`}><bdi>({compactMessages})</bdi></span>;
}

function DraftAttachment({ item, disabled, onRemove }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!item.file?.type?.startsWith("image/")) return;
    const url = URL.createObjectURL(item.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);
  return <li className={preview ? "sod29-community-draft-image" : ""}>
    {preview ? <img src={preview} alt={`תצוגה מקדימה של ${item.name}`} /> : null}
    <div><span>{item.name}</span><button type="button" disabled={disabled} onClick={onRemove} aria-label={`הסרת ${item.name}`}>×</button></div>
  </li>;
}
const sourceLabels = { openweb: "הצ׳אט הישן", community_2029: "הקהילה", number: "מספר", els: "צופן", forum: "דיון", community: "קהילה" };
const PublicContributor2029Page = lazy(() => import("../../pages/PublicContributor2029Page.jsx"));

function LiveAuthor({ row, accountProfiles, formatDate, linkAuthor = true, showAvatar = true }) {
  const [currentParams] = useSearchParams();
  const location = useLocation();
  const accountId = row.authorUserId || row.linkedUserId || VERIFIED_ARCHIVE_PROFILES[row.authorKey]?.accountUserId;
  const account = accountId ? accountProfiles[accountId] : null;
  const name = account?.display_name || account?.username || row.authorName;
  const badge = <UserBadge colorfulFallback fallbackSeed={row.authorKey || name} name={name} avatarUrl={showAvatar ? account?.avatar_url || row.avatarUrl : null} fallbackImage={showAvatar ? historicalCommunityAvatar(row) : null} avatarClassName="sod29-community-avatar">
    <CommunityMessageTime2029 value={row.createdAt} formatDate={formatDate} />
  </UserBadge>;
  if (!row.authorKey || !linkAuthor) return <div className="sod29-community-author-identity"><span className="sod29-community-author-link">{badge}</span><CommunityHistorySeal2029 authorKey={row.authorKey} compact /></div>;
  const target = new URLSearchParams(currentParams);
  target.set("memberCard", canonicalCommunityAuthorKey(row.authorKey)); target.delete("member");
  return <div className="sod29-community-author-identity"><Link className="sod29-community-author-link" to={communityChatHref(target, location.hash)} aria-label={`פתיחת כרטיס הכותב של ${name}`}>
    {badge}
  </Link><CommunityHistorySeal2029 authorKey={row.authorKey} compact /></div>;
}

function LiveLike({ row }) {
  const { isAdmin } = useAuth();
  const chatMessage = row.origin === "openweb" || row.origin === "community_2029";
  const repeatable = PUBLIC_READING_PRODUCTION_ARTIFACT && chatMessage;
  const actionsLocked = chatMessage ? communityActionsLocked(isAdmin) : publicLaunchActionsLocked(isAdmin);
  const reactions = row.reactions || {};
  const dislikes = Number(reactions.dislikes) || 0;
  return <div className="sod29-community-reactions">
    {actionsLocked ? <span className="sod29-community-like" title="סימון אהבתי עדיין אינו זמין בגרסה זו" aria-label={`${legacyLikeCount(reactions)} אהבו · קריאה בלבד`}>👍 {legacyLikeCount(reactions) || ""}</span> : <ReactionBar key={JSON.stringify(reactions)} id={row.id} reactions={reactions} variant="row" rowAppearance="thread" allowBoost={false} repeatable={repeatable} requireAccount={!repeatable && (PUBLIC_READING_PRODUCTION_ARTIFACT || import.meta.env.VITE_INTEGRATED_PREVIEW === "true")} />}
    {dislikes > 0 ? <span className="sod29-community-dislikes" aria-label={`${dislikes} לא אהבו`}><span aria-hidden="true">👎</span> {dislikes}</span> : null}
  </div>;
}

// Administrator-only: ids of guest messages that were published at once but not
// yet reviewed. Everyone else gets an empty set, so nothing changes for the public.
// Set by the page on every render (messages render beneath it), so a change of
// the set re-renders them without threading a prop through every thread level.
const NO_GUEST_REVIEW = { ids: new Set(), review: null };
const guestReviewHolder = { current: NO_GUEST_REVIEW };

function LiveMessage({ row: sourceRow, onReply, accountProfiles, showSource = false, formatDate, linkAuthor = true, showAuthorAvatar = true, focused = false, messageActions, sharePath }) {
  const actionsLocked = communityActionsLocked(useAuth().isAdmin);
  const guestReview = guestReviewHolder.current;
  const row = { ...sourceRow, ...messageActions?.patches[sourceRow.id] };
  const guestUnreviewed = guestReview.ids.has(sourceRow.id);
  const permissions = messageActions?.items[row.id];
  const [selection, setSelection] = useState({ principalKey: null, mode: null });
  const editButton = useRef(null);
  const messageBodyRef = useRef(null);
  const [quoteNotice, setQuoteNotice] = useState("");
  const actor = messageActions?.principalKey || null;
  const mode = actor && selection.principalKey === actor
    && (selection.mode === "edit" && permissions?.canEdit || selection.mode === "delete" && permissions?.canDelete)
    ? selection.mode : null;
  const open = mode => setSelection({ principalKey: actor, mode });
  const close = () => { open(null); requestAnimationFrame(() => editButton.current?.focus()); };
  const canReply = !actionsLocked && typeof onReply === "function" && (row.origin === "openweb" || row.origin === "community_2029");
  const shareUrl = communityMessageShareUrl(window.location.href, sharePath);
  const target = row.targetType === "number" && row.targetId ? `/number/${encodeURIComponent(row.targetId)}`
    : row.targetType === "els" && row.targetId ? `/codes/${encodeURIComponent(row.targetId)}`
    : row.targetType === "topic" && row.targetId ? `/topic/${encodeURIComponent(row.targetId)}` : null;
  if (row.isDeleted) return <article id={`message-${row.id}`} className={`sod29-community-thread sod29-community-thread--deleted${focused ? " is-focused" : ""}`} tabIndex={focused ? -1 : undefined}>
    <p className="sod29-community-deleted" role="note">ההודעה נמחקה</p>
  </article>;
  return <article id={`message-${row.id}`} data-community-path={sharePath?.join(",")} data-community-created={row.createdAt} className={`sod29-community-thread${focused ? " is-focused" : ""}${guestUnreviewed ? " is-guest-unreviewed" : ""}`} data-guest-unreviewed={guestUnreviewed ? "true" : undefined} tabIndex={focused ? -1 : undefined}>
    {guestUnreviewed ? <div className="sod29-community-guest-review" role="group" aria-label="הודעת אורח שטרם נבדקה"><span>הודעת אורח · פורסמה ועדיין לא נבדקה</span>
      <button type="button" className="sod29-community-text-action" onClick={() => guestReview.review(sourceRow.id, "approve")}>אישור</button>
      <button type="button" className="sod29-community-text-action" onClick={() => guestReview.review(sourceRow.id, "hide")}>הסתרה</button></div> : null}
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} formatDate={formatDate} linkAuthor={linkAuthor} showAvatar={showAuthorAvatar} /></div>
    {row.editedAt ? <p className="sod29-community-edited">נערך · {bilingualDateLabel(row.editedAt) || "תאריך לא זמין"}</p> : null}
    {showSource ? <div className="sod29-community-activity-source">{sourceLabels[row.origin] || "תרומה"}{row.parentId ? " · תגובה" : ""}</div> : null}
    {showSource && row.title && row.title !== row.body ? <h4 className="sod29-community-activity-title" dir="auto">{row.title}</h4> : null}
    {mode === "edit" ? <MessageEditor key={`${actor}:${row.id}`} row={row} actions={messageActions} onCancel={close} onSaved={close} />
      : row.body ? <CommunityMessageContent text={row.body} bodyRef={messageBodyRef} /> : <p className="sod29-community-missing-parent">תוכן הודעת המקור אינו זמין; התגובות הציבוריות נשמרו בשרשור.</p>}
    <div className="sod29-community-thread-actions">
      {canReply ? <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button> : null}
      {canReply && mode !== "edit" && row.body ? <button type="button" aria-label="ציטוט מההודעה" onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onClick={() => {
        const quote = selectedMessageQuote(window.getSelection(), messageBodyRef.current);
        if (!quote) { setQuoteNotice("סמנו משפט בהודעה, עד 600 תווים, ואז לחצו על ציטוט."); return; }
        setQuoteNotice(""); onReply({ ...row, quote });
      }}>ציטוט</button> : null}
      <LiveLike row={row} />
      {shareUrl ? <ShareActions type="community_message" entityId={row.id} url={shareUrl} title="הודעה בקהילת סוד 1820" sourceSurface="community_thread_2029" variant="icon" iconLabel="שיתוף הודעה" iconCopiedLabel="הקישור להודעה הועתק" force /> : null}
      {showSource && target ? <Link to={target}>לתרומה המלאה ←</Link> : null}
      {canReply && shareUrl && mode !== "edit" ? <CommunityPersonalActions2029 key={`${row.id}:${messageActions?.principalKey || "guest"}`} row={row} rootId={sharePath[0]} href={new URL(shareUrl).pathname + new URL(shareUrl).search} /> : null}
      {permissions?.state === "ready" && permissions.canEdit && mode !== "edit" ? <button type="button" ref={editButton} className="sod29-community-manage-action" onClick={() => open("edit")}>עריכה</button> : null}
      {permissions?.state === "ready" && permissions.canDelete && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => open("delete")}>מחיקה</button> : null}
    </div>
    {quoteNotice ? <p className="sod29-community-edited" role="status">{quoteNotice}</p> : null}
    {permissions?.reason === "source_requires_review" ? <p className="sod29-community-edited">עדכון המקור דורש בדיקה.</p> : null}
    {mode === "delete" ? <MessageConfirm key={`${actor}:${row.id}`} row={row} actions={messageActions} onCancel={close} onDone={close} /> : null}
  </article>;
}

function LiveThread({ row, onReply, accountProfiles, replyCounts, onRepliesLoaded, refreshToken, ancestors = [], focusPath = [], messageActions, newReplies = null, onReplyCountKnown }) {
  const focusIndex = focusPath.indexOf(row.id);
  const focusChildId = focusIndex >= 0 ? focusPath[focusIndex + 1] || null : null;
  const focused = focusPath.length > 0 && focusPath[focusPath.length - 1] === row.id;
  const rootPreview = ancestors.length === 0 && !focusChildId;
  const [expanded, setExpanded] = useState(Boolean(focusChildId) || rootPreview);
  const [replies, setReplies] = useState([]);
  const [replyTotal, setReplyTotal] = useState(null);
  const [nextReplyOffset, setNextReplyOffset] = useState(0);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [focusAttempt, setFocusAttempt] = useState(0);
  const replyReadRef = useRef(false), probeVersion = useRef(null);
  const replyAnchorRef = useRef(null);
  const groupRef = useRef(null), previewRequested = useRef(false), previewInRange = useRef(false);
  const knownCount = replyCounts[row.id];
  const count = replyTotal ?? knownCount;
  const canExpand = count > 0 || replies.length > 0;
  const childrenId = `community-replies-${row.id}`;

  useEffect(() => {
    if (!focusChildId) return undefined;
    let active = true;
    setExpanded(true); setLoadingReplies(true); setReplyError(""); setReplies([]); setReplyTotal(null);
    fetchCommunityReply(row.id, focusChildId).then((reply) => {
      if (!active) return;
      if (!reply) { setReplyError("התגובה המבוקשת אינה ציבורית או אינה זמינה."); return; }
      setReplies([reply]); setReplyTotal(1); setNextReplyOffset(1); onRepliesLoaded([reply]);
    }).catch(() => { if (active) setReplyError("לא הצלחנו לטעון את התגובה המבוקשת."); })
      .finally(() => { if (active) setLoadingReplies(false); });
    return () => { active = false; };
  }, [focusChildId, focusAttempt, onRepliesLoaded, row.id]);
  useLayoutEffect(() => {
    if (!focused) return;
    const target = document.getElementById(`message-${row.id}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [focused]);

  const loadReplies = async (offset = 0, limitHint = null) => {
    if (replyReadRef.current) return;
    replyReadRef.current = true;
    setLoadingReplies(true); setReplyError("");
    try {
      const page = await fetchCommunityReplies(row.id, { offset, limit: limitHint ?? (offset ? undefined : Math.max(20, Math.min(100, nextReplyOffset))) });
      const lineage = new Set([...ancestors, row.id]);
      const visible = page.rows.filter((item) => !lineage.has(item.id));
      replyAnchorRef.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
      const nextReplies = offset ? [...replies, ...visible.filter((item) => !replies.some((existing) => existing.id === item.id))] : mergeCommunityRefreshRows(replies, visible, "oldest", { complete: page.nextOffset >= page.count });
      setReplies(nextReplies);
      setReplyTotal(page.count); probeVersion.current = refreshToken;
      setNextReplyOffset(nextReplies.length);
      onRepliesLoaded(visible);
    } catch { setReplyError("לא הצלחנו לטעון את התגובות."); }
    finally { replyReadRef.current = false; setLoadingReplies(false); }
  };

  // Two direct replies are public reading context. Only visible roots request
  // this preview; nested and remaining replies keep the existing explicit flow.
  useEffect(() => {
    if (!rootPreview || knownCount === 0 && !previewRequested.current) return;
    const show = () => { if (previewRequested.current) return; previewRequested.current = true; loadReplies(0, 2); };
    if (typeof IntersectionObserver === "undefined") { previewInRange.current = true; show(); return; }
    const observer = new IntersectionObserver(entries => {
      previewInRange.current = entries.some(entry => entry.isIntersecting);
      if (previewInRange.current) show();
    }, { rootMargin: "200px" });
    if (groupRef.current) observer.observe(groupRef.current);
    return () => observer.disconnect();
  }, [rootPreview, row.id, knownCount]);

  // The public projection intentionally has no arbitrary child-count endpoint.
  // Probe only a visible closed branch through the existing approved reader;
  // an unknown leaf is never advertised as having replies.
  useEffect(() => {
    if (rootPreview || focusChildId || expanded || probeVersion.current === refreshToken) return undefined;
    let active = true, started = false;
    const probe = () => {
      if (started) return; started = true; probeVersion.current = refreshToken;
      fetchCommunityReplies(row.id, { limit: 1 }).then(page => {
        if (!active) return;
        const total = page.count;
        if (total == null) return;
        setReplyTotal(total); setReplies(page.rows); setNextReplyOffset(page.nextOffset);
        onReplyCountKnown?.(row.id, total);
      }).catch(() => { /* keep unknown; retry on the next visible feed refresh */ });
    };
    if (typeof IntersectionObserver === "undefined") probe();
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) probe();
    }, { rootMargin: "100px" });
    if (groupRef.current) observer?.observe(groupRef.current);
    return () => { active = false; observer?.disconnect(); };
  }, [rootPreview, focusChildId, expanded, refreshToken, row.id, onReplyCountKnown]);

  const toggleReplies = () => {
    if (expanded) { setExpanded(false); requestAnimationFrame(() => groupRef.current?.querySelector(":scope > .sod29-community-replies-toggle")?.focus({ preventScroll: true })); return; }
    setExpanded(true);
    if (!replies.length) loadReplies(); else onRepliesLoaded(replies);
  };
  useEffect(() => { if (expanded && !focusChildId && !document.hidden && (!rootPreview || previewRequested.current && previewInRange.current)) loadReplies(0, rootPreview ? Math.max(2, Math.min(100, nextReplyOffset)) : null); }, [refreshToken, focusChildId]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(replyAnchorRef.current); replyAnchorRef.current = null; }, [replies]);

  return <div ref={groupRef} className="sod29-community-thread-group" data-thread-level={ancestors.length}>
    {newReplies?.count > 0 ? <div className="sod29-community-new-replies"><Link to={communityReadingHref(newReplies)}>{newReplies.count === 1 ? "תגובה חדשה" : `${newReplies.count.toLocaleString("he-IL")} תגובות חדשות`} <span aria-hidden="true">←</span></Link></div> : null}
    <LiveMessage row={row} onReply={onReply} accountProfiles={accountProfiles} focused={focused} messageActions={messageActions} sharePath={[...ancestors, row.id]} />
    {!expanded && canExpand ? <button type="button" className="sod29-community-replies-toggle" aria-expanded="false" aria-controls={childrenId} disabled={loadingReplies} onClick={toggleReplies}>פתיחת תגובות{count != null ? ` (${count.toLocaleString("he-IL")})` : ""}</button> : null}
    <div id={childrenId} className="sod29-community-replies" role="group" aria-label={`תגובות להודעה של ${row.authorName}`} hidden={!expanded || !replies.length && !replyError && !loadingReplies}>
      {replyError ? <p role="alert">{replyError} <button type="button" onClick={() => focusChildId ? setFocusAttempt(value => value + 1) : loadReplies(nextReplyOffset)}>ניסיון נוסף</button></p> : null}
      {loadingReplies && !replies.length ? <p role="status">טוען תגובות…</p> : null}
      {expanded && replies.map((reply) => <LiveThread key={reply.id} row={reply} onReply={onReply} accountProfiles={accountProfiles} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={refreshToken} ancestors={[...ancestors, row.id]} focusPath={focusPath} messageActions={messageActions} onReplyCountKnown={onReplyCountKnown} />)}
      {expanded && !focusChildId && replyTotal != null && nextReplyOffset < replyTotal ? <button type="button" className="sod29-community-more-replies" disabled={loadingReplies} onClick={() => loadReplies(nextReplyOffset)}>{loadingReplies ? "טוען…" : replyTotal - nextReplyOffset === 1 ? "תגובה נוספת אחת" : `עוד ${replyTotal - nextReplyOffset} תגובות`}</button> : null}
      {expanded && replies.length > 0 ? <button type="button" className="sod29-community-replies-toggle" aria-expanded="true" aria-controls={childrenId} onClick={toggleReplies}>{ancestors.length && row.authorName ? `סגירת תגובות ל${row.authorName}` : "סגירת תגובות"}</button> : null}
    </div>
  </div>;
}

const NO_ACCOUNT_PROFILES = {};
const formatActivityDate = (value) => bilingualDateLabel(value) || "תאריך לא זמין";
const countLabel = (value) => Number(value).toLocaleString("he-IL");

// One corpus-search hit: the message (or reply) itself plus a way to open the
// full public thread around it. Replies resolve their path on demand so only a
// fully public chain can be opened.
function SearchHit({ row, accountProfiles, onReply, messageActions }) {
  const [currentParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState("idle");
  const hrefFor = path => {
    const next = new URLSearchParams(currentParams);
    for (const key of ["reply", "path", "member", "memberCard", "claim"]) next.delete(key);
    next.set("thread", path[0]);
    if (path.length > 1) next.set("path", path.join(","));
    return communityChatHref(next, "");
  };
  const openReply = async () => {
    setState("loading");
    try {
      const path = await fetchCommunityMessagePath(row.id);
      if (!path) { setState("error"); return; }
      navigate(hrefFor(path));
    } catch { setState("error"); }
  };
  return <div className="sod29-community-search-hit">
    <LiveMessage row={row} accountProfiles={accountProfiles} showSource onReply={onReply} formatDate={formatActivityDate} messageActions={messageActions} />
    <div className="sod29-community-search-hit-open">
      {row.parentId
        ? <button type="button" className="sod29-community-secondary" disabled={state === "loading"} onClick={openReply}>{state === "loading" ? "פותח…" : "פתיחת התגובה בשרשור"}</button>
        : <Link className="sod29-community-secondary" to={hrefFor([row.id])}>פתיחת השיחה</Link>}
      {state === "error" ? <span role="alert"> לא הצלחנו לפתוח את השרשור הזה.</span> : null}
    </div>
  </div>;
}

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

export default function CommunityLive2029({ leadingContent = null, trailingContent = null, canonicalPath = "/community/chat" }) {
  const palette = use2029Palette();
  const { user, profile, isAdmin, loading: authLoading, verified: authVerified } = useAuth();
  const actionsLocked = communityActionsLocked(isAdmin);
  const location = useLocation(), navigate = useNavigate();
  const [params] = useSearchParams();
  const readingLocation = useRef({ params, hash: location.hash });
  readingLocation.current = { params, hash: location.hash };
  const setParams = useCallback((next, options) => {
    const current = readingLocation.current;
    navigate(communityChatHref(typeof next === "function" ? next(current.params) : next, current.hash), options);
  }, [navigate]);
  const claimId = params.get("claim") || "";
  const memberId = claimId ? "" : canonicalCommunityAuthorKey(params.get("member") || "");
  const cardId = memberId || claimId ? "" : canonicalCommunityAuthorKey(params.get("memberCard") || "");
  const reading = useCommunityReadingPosition2029({ auth: { user, loading: authLoading, verified: authVerified }, active: !memberId && !claimId && !cardId, enabled: PUBLIC_READING_PRODUCTION_ARTIFACT });
  // Old exact Contributor links share the newer account's single public URL.
  // Preserve all other reading/query state when replacing a historical link.
  useEffect(() => {
    const oldMember = params.get("member");
    const oldCard = params.get("memberCard");
    if (claimId || !((oldMember && oldMember !== canonicalCommunityAuthorKey(oldMember))
      || (oldCard && oldCard !== canonicalCommunityAuthorKey(oldCard)))) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["member", "memberCard"]) {
        const value = next.get(key);
        if (value) next.set(key, canonicalCommunityAuthorKey(value));
      }
      return next;
    }, { replace: true });
  }, [claimId, params, setParams]);
  const selectedAuthorId = memberId || cardId;
  const threadIdParam = params.get("thread") || "";
  const replyIdParam = params.get("reply") || "";
  const threadPathParam = params.get("path") || "";
  const threadFocus = useMemo(() => normalizeCommunityThreadFocus({ threadId: threadIdParam, replyId: replyIdParam, path: threadPathParam }), [threadIdParam, replyIdParam, threadPathParam]);
  const hasThreadRequest = ["thread", "reply", "path"].some(key => params.has(key));
  const personalThreadReturn = personalMessagesReturnHref(params.get("returnTo"));
  const feedParams = new URLSearchParams(params);
  for (const key of ["thread", "reply", "path", "member", "memberCard", "claim", "returnTo"]) feedParams.delete(key);
  const threadReturnHref = personalThreadReturn || communityReadingReturnHref(params.get("returnTo")) || communityChatHref(feedParams, location.hash);
  const fullThreadParams = new URLSearchParams(params);
  for (const key of ["reply", "path", "member", "memberCard", "claim"]) fullThreadParams.delete(key);
  fullThreadParams.set("returnTo", threadReturnHref);
  const fullThreadHref = communityChatHref(fullThreadParams, threadFocus ? `#message-${threadFocus.threadId}` : "");
  const [rows, setRows] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [loading, setLoading] = useState(true);
  const [feedSettled, setFeedSettled] = useState(false);
  const [error, setError] = useState("");
  const query = params.get("q") || "";
  const setQuery = value => setParams(current => { const next = new URLSearchParams(current); if (value) next.set("q", value); else next.delete("q"); return next; }, { replace: true });
  const sort = ["newest", "oldest", "liked"].includes(params.get("sort")) ? params.get("sort") : "newest";
  // Keep the loaded date window when switching to likes, including after a
  // reload. The public reader continues to receive only its supported sorts.
  const fetchSort = sort === "oldest" || sort === "liked" && params.get("sourceSort") === "oldest" ? "oldest" : "newest";
  const draftCache = useCommunityDraft2029({ auth: { user, loading: authLoading, verified: authVerified }, enabled: !actionsLocked });
  const { draft, setDraft, replyTo, setReplyTo } = draftCache;
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [publishedFeedRefresh, setPublishedFeedRefresh] = useState(0);
  // A guest cannot publish: the primary action becomes a one-step community signup
  // and the written message is published automatically as soon as it completes.
  const [joinOpen, setJoinOpen] = useState(false);
  const guestMustJoin = (PUBLIC_READING_PRODUCTION_ARTIFACT || import.meta.env.VITE_INTEGRATED_PREVIEW === "true") && !user;
  const guestPublishing = useRef(false);
  const [guestWebsite, setGuestWebsite] = useState("");
  const [guestName, setGuestName] = useState(() => typeof window === "undefined" ? "" : readGuestName(window.localStorage));
  const [guestSending, setGuestSending] = useState(false);
  const [guestUnreviewedIds, setGuestUnreviewedIds] = useState(() => new Set());
  const guestReviewRead = useRef(0);
  const refreshGuestUnreviewed = useCallback(async () => {
    if (!isAdmin || !user) { setGuestUnreviewedIds(current => current.size ? new Set() : current); return; }
    const request = ++guestReviewRead.current;
    try { const ids = await fetchGuestUnreviewed(); if (request === guestReviewRead.current) setGuestUnreviewedIds(new Set(ids)); } catch { /* admin hint only */ }
  }, [isAdmin, user?.id]);
  const reviewGuest = useCallback(async (id, action) => {
    try { await reviewGuestMessage(id, action); setGuestUnreviewedIds(current => { const next = new Set(current); next.delete(id); return next; }); if (action === "hide") { setThreadRefresh(value => value + 1); setPublishedFeedRefresh(value => value + 1); } }
    catch { setNotice("הפעולה על הודעת האורח לא הושלמה. נסו שוב."); }
  }, []);
  const guestReview = useMemo(() => ({ ids: guestUnreviewedIds, review: reviewGuest }), [guestUnreviewedIds, reviewGuest]);
  const { typingPeople, notifyTyping } = useCommunityTyping2029({ enabled: !actionsLocked && !memberId && !claimId });
  const composerPrincipal = actionsLocked ? null : user?.id || null;
  const activeComposerPrincipal = useRef(composerPrincipal);
  activeComposerPrincipal.current = composerPrincipal;
  useLayoutEffect(() => {
    setAttachments([]); setNotice(""); setAttachmentError(""); setSending(false);
    setComposerExpanded(false);
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
  const compactComposer = !actionsLocked;
  const composerOpen = composerExpanded || draft.length > 0 || attachments.length > 0 || Boolean(replyTo) || draftCache.reattach;
  const composerProfile = profile?.id === user?.id ? profile : null;
  useLayoutEffect(() => {
    if (!composerRef.current) return;
    composerRef.current.style.height = "auto";
    composerRef.current.style.height = `${Math.max(48, Math.min(composerRef.current.scrollHeight, 224))}px`;
  }, [draft, user?.id]);
  // Only real keystrokes count as typing: a draft restored from the device must not announce anyone.
  const onDraftChange = value => { setDraft(value); if (typeof value === "string" && plainMessageText(value).trim()) notifyTyping(user ? profile?.display_name || profile?.username || null : null); };
  const attachmentRef = useRef(null);
  const cardCloseRef = useRef(null);
  const streamRequestRef = useRef(0);
  const feedReadRef = useRef(null);
  const feedStateRef = useRef(null);
  const feedAnchorRef = useRef(null);
  const profileReturnAnchor = useRef(null);
  const loadedFeedSort = useRef(null);
  const loadedPublishedFeedRefresh = useRef(0);
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
    if (!feedSettled || !(window.location.hash === "#legacy-chat" || /spot_?im|openweb/i.test(window.location.search))) return undefined;
    // The source is mounted immediately; when the first feed completes, its
    // height can move the source below the initial hash position.
    const frame = requestAnimationFrame(() => document.getElementById("legacy-chat")?.scrollIntoView({ block: "start", behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [feedSettled]);

  useEffect(() => {
    if (memberId || claimId || hasThreadRequest || loadedFeedSort.current === fetchSort && loadedPublishedFeedRefresh.current === publishedFeedRefresh) return;
    loadedPublishedFeedRefresh.current = publishedFeedRefresh;
    loadPage(0, true);
    return () => { streamRequestRef.current++; };
  }, [loadPage, memberId, claimId, fetchSort, hasThreadRequest, publishedFeedRefresh]);
  useEffect(() => {
    setFocusedThread(null);
    if (!threadFocus) { setFocusedThreadState(hasThreadRequest ? "not_found" : "idle"); return undefined; }
    let active = true;
    setFocusedThreadState("loading");
    fetchCommunityThread(threadFocus.threadId).then((thread) => {
      if (!active) return;
      setFocusedThread(thread);
      setFocusedThreadState(thread ? "ready" : "not_found");
    }).catch(() => { if (active) setFocusedThreadState("error"); });
    return () => { active = false; };
  }, [threadFocus, hasThreadRequest]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(feedAnchorRef.current); feedAnchorRef.current = null; }, [rows]);
  useLayoutEffect(() => {
    if (!memberId && profileReturnAnchor.current) {
      restoreCommunityScrollAnchor(profileReturnAnchor.current);
      profileReturnAnchor.current = null;
    }
  }, [memberId]);
  useEffect(() => {
    if (memberId || claimId || cardId || hasThreadRequest) return undefined;
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
        let counts = null;
        try { counts = await fetchCommunityReplyCounts(page.rows.map((item) => item.id)); }
        catch { /* An unavailable count is unknown; visible approved replies can still refresh. */ }
        if (!active || document.hidden || request !== streamRequestRef.current) return;
        if (counts) setReplyCounts((existing) => Object.keys(counts).every((id) => existing[id] === counts[id]) ? existing : { ...existing, ...counts });
        setThreadRefresh((value) => value + 1);
      } finally { if (feedReadRef.current === read) feedReadRef.current = null; }
    }});
    return () => { active = false; stop(); };
  }, [fetchSort, memberId, claimId, cardId, hasThreadRequest]);
  // Same title and description the server sends, so the tab and what a crawler renders match. The bare page was indexed and
  // brings search traffic, so it stays indexable; any query string (thread, member, search...) is a variant and stays out.
  useEffect(() => { applySeo({ title: "הצ'אט החי — קוד המציאות בזמן אמת", description: "שיחות, שאלות וגילויים בקהילת SOD1820.", path: canonicalPath, noindex: location.search !== "" }); }, [canonicalPath, location.search]);
  // Corpus-wide search: from two characters the query goes to the server, which
  // searches every public message and reply (not only the loaded pages). If the
  // server function is unavailable the page falls back to filtering what is loaded.
  const searchText = query.trim();
  const searchLength = [...searchText].length;
  const serverSearchWanted = searchLength >= COMMUNITY_SEARCH_MIN_LENGTH && searchLength <= COMMUNITY_SEARCH_MAX_LENGTH;
  const [search, setSearch] = useState({ query: "", status: "idle", rows: [], count: null, nextOffset: 0, loadingMore: false });
  const [searchRetry, setSearchRetry] = useState(0);
  const searchRequestRef = useRef(0);
  useEffect(() => {
    const request = ++searchRequestRef.current;
    if (!serverSearchWanted) { setSearch(current => current.status === "idle" ? current : { query: "", status: "idle", rows: [], count: null, nextOffset: 0, loadingMore: false }); return undefined; }
    setSearch({ query: searchText, status: "loading", rows: [], count: null, nextOffset: 0, loadingMore: false });
    const timer = setTimeout(async () => {
      try {
        const page = await searchCommunityMessages(searchText);
        if (request !== searchRequestRef.current) return;
        setSearch(page ? { query: searchText, status: "ready", rows: page.rows, count: page.count, nextOffset: page.nextOffset, loadingMore: false }
          : { query: searchText, status: "unavailable", rows: [], count: null, nextOffset: 0, loadingMore: false });
      } catch {
        if (request === searchRequestRef.current) setSearch({ query: searchText, status: "error", rows: [], count: null, nextOffset: 0, loadingMore: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, serverSearchWanted, searchRetry]);
  const searchMoreAvailable = search.status === "ready" && search.count != null && search.nextOffset < search.count;
  const loadMoreSearch = async () => {
    if (!searchMoreAvailable || search.loadingMore) return;
    const request = searchRequestRef.current;
    setSearch(current => ({ ...current, loadingMore: true, moreFailed: false }));
    try {
      const page = await searchCommunityMessages(search.query, { offset: search.nextOffset });
      if (request !== searchRequestRef.current) return;
      if (!page) { setSearch(current => ({ ...current, loadingMore: false, moreFailed: true })); return; }
      setSearch(current => ({ ...current, loadingMore: false,
        rows: [...current.rows, ...page.rows.filter(item => !current.rows.some(existing => existing.id === item.id))],
        nextOffset: page.nextOffset,
        // An empty page means the end, whatever the first-page total said.
        count: page.nextOffset === current.nextOffset ? current.nextOffset : current.count }));
    } catch {
      if (request === searchRequestRef.current) setSearch(current => ({ ...current, loadingMore: false, moreFailed: true }));
    }
  };
  const serverSearchActive = serverSearchWanted && search.status !== "unavailable";
  // Hits get the same owner/admin edit and delete permissions as feed messages.
  useEffect(() => { if (search.rows.length) messageActions.register(search.rows); }, [search.rows, messageActions.register]);
  useEffect(() => { let active = true; fetchLinkedAccountProfiles().then((accounts) => { if (active) setAccountProfiles(accounts); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const ids = [...new Set([...rows, ...profileRows, ...search.rows, focusedThread].filter(Boolean).flatMap((row) => [row.authorUserId, row.linkedUserId]).filter(Boolean))];
    if (!ids.length) return undefined;
    let active = true;
    fetchLinkedAccountProfiles(ids).then((accounts) => { if (active) setAccountProfiles((current) => ({ ...current, ...accounts })); }).catch(() => {});
    return () => { active = false; };
  }, [rows, profileRows, search.rows, focusedThread]);
  const onReplyCountKnown = useCallback((id, count) => setReplyCounts(current => current[id] === count ? current : { ...current, [id]: count }), []);
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

  const searchScopeNote = serverSearchActive
    ? search.status === "loading" ? "מחפש בכל השיחות והתגובות…"
      : search.status === "error" ? "החיפוש אינו זמין כרגע. אפשר לנסות שוב בעוד רגע."
        : search.count === 1 ? "נמצאה תוצאה אחת בכל השיחות והתגובות." : search.count != null ? `נמצאו ${countLabel(search.count)} תוצאות בכל השיחות והתגובות, מהחדש לישן.` : "תוצאות מכל השיחות והתגובות, מהחדש לישן."
    : searchText && searchLength < COMMUNITY_SEARCH_MIN_LENGTH ? "הקלידו לפחות שני תווים כדי לחפש בכל השיחות. בינתיים מוצגות התאמות מתוך ההודעות שכבר נטענו."
      : searchText ? "החיפוש בכל הארכיון אינו זמין כרגע; מוצגות התאמות מתוך ההודעות שכבר נטענו."
        : sort === "liked" ? "לפי מספר הלייקים, מתוך ההודעות שכבר נטענו בלבד." : "אפשר לחפש בכל השיחות והתגובות בארכיון.";
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    const visible = rows.filter((row) => row.isDeleted || row.body || replyCounts[row.id] > 0);
    const matching = needle ? visible.filter((row) => `${row.authorName} ${plainMessageText(row.body)}`.toLocaleLowerCase("he").includes(needle)) : visible;
    return sort === "liked" ? [...matching].sort(compareCommunityLikedRows) : matching;
  }, [query, rows, replyCounts, sort]);
  const baseline = VERIFIED_ARCHIVE_PROFILES[selectedAuthorId];
  const linkedAccountId = selectedAuthorId?.startsWith("user:") ? selectedAuthorId.slice(5) : profileRows.find((row) => row.linkedUserId)?.linkedUserId || baseline?.accountUserId;
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
    return communityWriterHref(writer, communityChatHref(query, location.hash), window.location.origin);
  };
  const openFullProfile = () => {
    profileReturnAnchor.current = captureCommunityScrollAnchor(document.getElementById("community-new-chat"));
    setProfileFilter("all"); setProfileSort("newest");
    setParams((current) => { const next = new URLSearchParams(current); next.set("member", selectedAuthorId); next.delete("memberCard"); return next; });
  };
  const startReply = (row) => {
    if (actionsLocked) return;
    if (row.quote) {
      const next = appendMessageQuote(draft, row.quote);
      if (plainMessageText(next).length > 1500 || next.length > 5000) { setNotice("אין מספיק מקום בטיוטה לציטוט הזה."); return; }
      setDraft(next);
    }
    setReplyTo(row); setComposerExpanded(true); requestAnimationFrame(() => {
      const editor = composerRef.current; editor?.focus();
      if (row.quote && editor) { const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
    });
  };
  // A visitor without an account cannot upload files (storage accepts members only). The button explains it and
  // offers the one-step signup instead of staying disabled and silent.
  const [guestAttachHint, setGuestAttachHint] = useState(false);
  const clickAttach = () => {
    if (!user) { setGuestAttachHint(true); setComposerExpanded(true); return; }
    attachmentRef.current?.click();
  };
  const pickAttachments = (event) => {
    if (actionsLocked) return;
    setComposerExpanded(true);
    setAttachmentError("");
    const selected = Array.from(event.target.files || []);
    if (attachmentRef.current) attachmentRef.current.value = "";
    if (selected.length + attachments.length > COMMUNITY_ATTACHMENT_MAX_FILES) { setAttachmentError(`אפשר לצרף עד ${COMMUNITY_ATTACHMENT_MAX_FILES} קבצים להודעה.`); return; }
    try {
      selected.forEach(validateCommunityAttachment);
      if (selected.length) draftCache.setHasFiles(true);
      setAttachments((current) => [...current, ...selected.map((file) => ({ file, url: null, name: file.name }))]);
    } catch (err) { setAttachmentError(err.message); }
  };
  const submit = async () => {
    if (actionsLocked || authLoading || user && !authVerified) return;
    const body = draft.trim();
    if ((!plainMessageText(draft).trim() && !attachments.length) || sending || replyTo?.draftRestoring || replyTo?.draftUnavailable) return;
    if (guestMustJoin) {
      if (!plainMessageText(draft).trim()) return;
      const saved = stashGuestPost(window.localStorage, { body, parentId: replyTo?.id || null });
      setNotice(saved ? "" : "לא ניתן לשמור את ההודעה במכשיר הזה. הדביקו אותה שוב אחרי ההרשמה.");
      setJoinOpen(true);
      return;
    }
    setSending(true); setNotice(""); setAttachmentError("");
    const principal = composerPrincipal;
    const isCurrent = () => activeComposerPrincipal.current === principal;
    if (!isCurrent()) return;
    try {
      const uploaded = [];
      for (const item of attachments) {
        const result = item.url ? item : await uploadCommunityAttachment(item.file);
        if (!isCurrent()) return;
        uploaded.push(result);
        if (!item.url) setAttachments((current) => current.map((entry) => entry.file === item.file ? { ...entry, ...result } : entry));
      }
      if (!isCurrent()) return;
      await publishCommunityMessage({ body: appendMessageText(body, appendCommunityAttachments("", uploaded)), parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      if (!isCurrent()) return;
      if (replyTo) {
        requestedReplyCounts.current.delete(replyTo.id);
        setReplyCounts((current) => { const next = { ...current }; delete next[replyTo.id]; return next; });
        setThreadRefresh((current) => current + 1);
      }
      draftCache.clear(); setAttachments([]); setComposerExpanded(false); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      if (user && !replyTo && !threadFocus) {
        // Show an accepted new root in the newest public window. A retained
        // search (including a different YouTube share token) or old/liked window
        // must not hide it. The feed effect reads after the URL/state commit.
        setParams(current => { const next = new URLSearchParams(current); next.delete("q"); next.delete("sort"); next.delete("sourceSort"); return next; }, { replace: true });
        setPublishedFeedRefresh(value => value + 1);
      } else await loadPage(0, true);
    } catch (error) { if (isCurrent()) setNotice(error?.code === "AUTH_REQUIRED" ? "יש להתחבר מחדש כדי לצרף קבצים. הטיוטה נשמרה." : attachments.length ? "השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר." : "לא הצלחנו לפרסם את ההודעה. הטיוטה נשמרה לניסיון חוזר."); }
    finally { if (isCurrent()) setSending(false); }
  };

  // Administrator: keep the list of unreviewed guest messages current.
  useEffect(() => {
    refreshGuestUnreviewed();
    if (!isAdmin || !user) return undefined;
    const timer = setInterval(refreshGuestUnreviewed, 30000);
    return () => clearInterval(timer);
  }, [refreshGuestUnreviewed, publishedFeedRefresh, threadRefresh, rows.length]);

  // A guest publishes at once, as "אורח", text only. The server enforces limits.
  const publishAsGuest = async () => {
    if (!guestMustJoin || authLoading || guestSending || sending) return;
    const body = draft.trim();
    if (!plainMessageText(draft).trim() || replyTo?.draftRestoring || replyTo?.draftUnavailable) return;
    if (guestBodyHasLink(body)) { setNotice(guestPublishErrorMessage({ message: "links_not_allowed" })); return; }
    const nameProblem = guestNameProblem(guestName);
    if (nameProblem && nameProblem !== "ok") { setNotice(guestPublishErrorMessage({ message: nameProblem })); return; }
    setGuestSending(true); setNotice("");
    try {
      await publishGuestCommunityMessage({ body, parentId: replyTo?.id || null, website: guestWebsite, name: guestName });
      saveGuestName(window.localStorage, guestName);
      clearGuestPost(window.localStorage);
      if (replyTo) {
        requestedReplyCounts.current.delete(replyTo.id);
        setReplyCounts((current) => { const next = { ...current }; delete next[replyTo.id]; return next; });
        setThreadRefresh((current) => current + 1);
      }
      draftCache.clear(); setComposerExpanded(false); setJoinOpen(false); setNotice(cleanGuestName(guestName) ? `ההודעה פורסמה בשם ${cleanGuestName(guestName)} (אורח).` : "ההודעה פורסמה כאורח.");
      if (!replyTo && !threadFocus) {
        setParams(current => { const next = new URLSearchParams(current); next.delete("q"); next.delete("sort"); next.delete("sourceSort"); return next; }, { replace: true });
        setPublishedFeedRefresh(value => value + 1);
      } else await loadPage(0, true);
    } catch (error) { setNotice(guestPublishErrorMessage(error)); }
    finally { setGuestSending(false); }
  };

  // Completes the guest flow, also after an OAuth redirect: the signed-in account
  // publishes the message that was waiting on this device, exactly once.
  useEffect(() => {
    if (!user || !authVerified || authLoading || actionsLocked || guestPublishing.current) return;
    const pending = peekGuestPost(window.localStorage);
    if (!pending) return;
    guestPublishing.current = true;
    const principal = user.id;
    (async () => {
      try {
        await publishCommunityMessage({ body: pending.body, parentId: pending.parentId, authorName: null });
        clearGuestPost(window.localStorage);
        if (activeComposerPrincipal.current !== principal) return;
        setJoinOpen(false); setNotice("נרשמתם לקהילה וההודעה פורסמה.");
        if (pending.parentId) { setThreadRefresh(value => value + 1); await loadPage(0, true); }
        else {
          setParams(current => { const next = new URLSearchParams(current); next.delete("q"); next.delete("sort"); next.delete("sourceSort"); return next; }, { replace: true });
          setPublishedFeedRefresh(value => value + 1);
        }
      } catch {
        // The message stays stored on this device: the next visit retries once.
        if (activeComposerPrincipal.current === principal) setNotice("נרשמתם לקהילה, אבל לא הצלחנו לפרסם את ההודעה. ההודעה נשמרה במכשיר, נסו לרענן את העמוד.");
      } finally { guestPublishing.current = false; }
    })();
  }, [user?.id, authVerified, authLoading, actionsLocked]);

  guestReviewHolder.current = guestReview;
  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="קהילה" symbol="◎">
    {!memberId ? leadingContent : null}
    <main id="community-new-chat" className={`sod29-community sod29-community--artwork${!memberId && !claimId ? " sod29-community--full" : ""}`} data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": `color-mix(in srgb, ${palette.cardRaised} 94%, ${palette.accentText})`, "--community-discovery": palette.accentDiscovery, "--community-depth": palette.accentSecondary, "--community-warm": palette.warmAccent, "--community-success": palette.successText, "--community-action-fill": palette.accentBtn, "--community-danger": palette.dangerText }}>
      {claimId ? actionsLocked ? <FrameState kind="empty" title="קישור החשבון הישן עדיין אינו זמין"><p>ההודעות הציבוריות נשמרו לקריאה. קישור חשבונות דורש את פעולות החשבון הקיימות ואינו פעיל בגרסה זו.</p><Link to={threadReturnHref}>חזרה לשיחות</Link></FrameState> : <LegacyAccountClaim key={claimId} contributorId={claimId} palette={palette} /> : null}
      {!memberId && !claimId ? <header className="sod29-community-intro"><h1>צ'אט הקהילה {!hasThreadRequest ? <ConversationCount /> : null}</h1><p>שיחות, שאלות וגילויים, פתוח לכולם.</p>
        {!hasThreadRequest && reading.resume ? <div className="sod29-community-reading-tools"><Link className="sod29-community-secondary" to={communityReadingHref(reading.resume)} onClick={reading.requestResume}>להמשיך מאיפה שעצרתי <span aria-hidden="true">←</span></Link></div> : null}
        {reading.error && reading.resume ? <p className="sod29-community-reading-error" role="status">לא ניתן לעדכן כרגע את מספר התגובות החדשות.</p> : null}
      </header> : null}
      {claimId ? null : memberId ? <Suspense fallback={null}>
        <PublicContributor2029Page communityAuthorKey={memberId}
          entryReturnHref={communityPersonReturnHref(window.location.pathname, params.toString(), window.location.hash)}
          communityOwnProfileHref={!actionsLocked && isOwner ? writerPersonalHref("profile", { returnTo: window.location.pathname + window.location.search }) : null}
          onCommunityReply={actionsLocked ? undefined : (item) => { closeProfile(); startReply(item); }} />
      </Suspense> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        {!actionsLocked ? <div className="sod29-community-entry-tools">{user ? <CommunitySignIn compact accountActions={<LegacyAccountClaimEntry rows={rows} onClaimed={messageActions.retry} />} /> : <div className="sod29-community-auth-buttons" role="group" aria-label="כניסה לקהילה">
          <Link className="sod29-community-auth-btn" to={`/login?returnTo=${encodeURIComponent(communityAccountReturnHref(window.location))}`}>התחברות</Link>
          <Link className="sod29-community-auth-btn is-signup" to={`/login?returnTo=${encodeURIComponent(communityAccountReturnHref(window.location))}`}>הרשמה</Link>
        </div>}</div> : null}
        {isAdmin && guestUnreviewedIds.size ? <p className="sod29-community-guest-banner" role="status">{guestUnreviewedIds.size === 1 ? "הודעת אורח אחת פורסמה ועדיין לא נבדקה" : `${guestUnreviewedIds.size} הודעות אורח פורסמו ועדיין לא נבדקו`} · מוצגות באפור</p> : null}
        {messageActions.principalKey && messageActions.state === "unavailable" ? <p role="status">אפשרויות העריכה אינן זמינות כרגע. <button type="button" className="sod29-community-secondary" onClick={messageActions.retry}>ניסיון נוסף</button></p> : null}
        {!actionsLocked ? <section className="sod29-community-composer" data-compact={compactComposer} data-expanded={composerOpen} aria-label="כתיבת הודעה">
          <label className={compactComposer ? "sod29-community-sr-only" : undefined} htmlFor="community-live-draft">מה תרצו לשתף?</label>
          {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)}>ביטול תשובה</button></div> : null}
          <div className={compactComposer ? "sod29-community-compose-row" : undefined}>
            {compactComposer ? <Link className="sod29-community-compose-avatar" to={user ? writerPersonalHref("profile", { returnTo: communityAccountReturnHref(window.location) }) : `/login?returnTo=${encodeURIComponent(communityAccountReturnHref(window.location))}`} aria-label={user ? "הפרופיל שלי" : "התחברות"} title={user ? "החלפת תמונת הפרופיל שלי" : "התחברות"}><UserBadge avatarOnly colorfulFallback fallbackSeed={user?.id ? `user:${user.id}` : "guest"} name={composerProfile?.display_name || composerProfile?.username || (user ? "החשבון שלי" : "אורח")} avatarUrl={composerProfile?.avatar_url} />{user ? <span className="sod29-community-avatar-camera" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5l1-2h6l1 2h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="4"/></svg></span> : null}</Link> : null}
            <div className={compactComposer ? "sod29-community-compose-input" : undefined}>
              <CommunityRichText2029 inputRef={composerRef} id="community-live-draft" value={draft} onChange={onDraftChange} expanded={composerOpen} disabled={sending || authLoading || Boolean(user && !authVerified)} onFocus={() => setComposerExpanded(true)} onKeyDown={event => { if (event.key === "Escape" && !draft && !attachments.length && !replyTo) { setComposerExpanded(false); composerRef.current?.blur(); } }} placeholder={compactComposer ? "הוסף תגובה…" : "כתבו משהו לקהילה…"} />
              {compactComposer ? <button type="button" className="sod29-community-compose-attach" aria-label="צירוף קובץ או סרטון" title="צירוף קובץ או סרטון" aria-describedby={user ? "community-attachment-limits" : undefined} disabled={sending || attachments.length >= COMMUNITY_ATTACHMENT_MAX_FILES} onClick={clickAttach}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 11-8.5 8.5a6 6 0 0 1-8.5-8.5L14 1a4 4 0 0 1 5.7 5.7L9.5 16.9a2 2 0 0 1-2.8-2.8L16 4.8" /></svg></button> : null}
            </div>
          </div>
          <p className="sod29-community-typing" role="status" aria-live="polite" data-typing={typingLabel(typingPeople) ? "true" : "false"}>{typingLabel(typingPeople)}</p>
          <CommunityMessageContent text={draft} previewsOnly />
          {compactComposer && user ? <span id="community-attachment-limits" className="sod29-community-sr-only">עד 3 קבצים · תמונה עד 8MB · סרטון עד 50MB · גלויים לציבור</span> : null}
          <input ref={attachmentRef} type="file" multiple accept={COMMUNITY_ATTACHMENT_ACCEPT} onChange={pickAttachments} hidden />
          {!compactComposer ? <div className="sod29-community-attachment-toolbar"><button type="button" className="sod29-community-text-action" disabled={sending || attachments.length >= COMMUNITY_ATTACHMENT_MAX_FILES} onClick={clickAttach}>📎 צירוף קובץ או סרטון</button><small>עד 3 קבצים · סרטון עד 50MB, קובץ אחר עד 8MB · גלויים לציבור</small></div> : null}
          {attachments.length ? <ul className="sod29-community-attachment-list">{attachments.map((item, index) => <DraftAttachment key={`${item.file.name}-${index}`} item={item} disabled={sending} onRemove={() => { draftCache.setHasFiles(attachments.length > 1); setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} />)}</ul> : null}
          {attachmentError ? <p className="sod29-community-status" role="alert">{attachmentError}</p> : null}
          {guestAttachHint && !user ? <p className="sod29-community-status" role="status" data-guest-attach-hint="true">צירוף תמונות וקבצים זמין לחברי הקהילה. <Link to={`/login?returnTo=${encodeURIComponent(communityAccountReturnHref(window.location))}`}>נרשמים בשנייה ←</Link></p> : null}
          {guestMustJoin && (!compactComposer || composerOpen) ? <label className="sod29-community-guest-name"><span>השם שלכם (לא חובה)</span>
            <input type="text" name="guest-name" value={guestName} maxLength={GUEST_NAME_MAX} autoComplete="nickname" placeholder="למשל: דוד" disabled={guestSending} onChange={event => setGuestName(event.target.value)} aria-describedby="community-guest-name-note" />
            <small id="community-guest-name-note">אפשר לפרסם בלי להירשם. ההודעה תופיע בשם שתכתבו, עם התווית ״אורח״.</small></label> : null}
          {!compactComposer || composerOpen ? <div className="sod29-community-composer-bottom"><small>{plainMessageText(draft).length}/1500</small><div className="sod29-community-composer-actions" data-guest={guestMustJoin ? "true" : undefined}>
            {guestMustJoin ? <button type="button" className="sod29-community-primary" data-guest-publish="true" disabled={!plainMessageText(draft).trim() || guestSending || sending || authLoading || replyTo?.draftRestoring || replyTo?.draftUnavailable} onClick={publishAsGuest}>{guestSending ? "מפרסם…" : "פרסום כאורח"}</button> : null}
            <button type="button" className={guestMustJoin ? "sod29-community-join-link" : "sod29-community-primary"} disabled={(!plainMessageText(draft).trim() && (guestMustJoin || !attachments.length)) || sending || authLoading || replyTo?.draftRestoring || replyTo?.draftUnavailable} data-guest-join={guestMustJoin ? "true" : undefined} onClick={submit}>{sending ? "שולח…" : guestMustJoin ? "להירשם ולפרסם בשמי ←" : "פרסום"}</button>
            {guestMustJoin ? <input className="sod29-community-sr-only" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={guestWebsite} onChange={event => setGuestWebsite(event.target.value)} /> : null}</div></div> : null}
          {(draft.length > 0 || replyTo || draftCache.reattach) && draftCache.status !== "idle" ? <div className="sod29-community-draft-state" data-draft-state={draftCache.status} role="status">
            <span>{draftCache.status === "unavailable" ? "לא ניתן לשמור את הטיוטה במכשיר הזה כרגע." : draftCache.reattach ? "טיוטת הטקסט שוחזרה. יש לצרף קבצים מחדש." : draftCache.status === "restored" ? "הטיוטה שוחזרה מהמכשיר הזה" : "טיוטה נשמרה במכשיר הזה"}</span>
            <button type="button" className="sod29-community-text-action" disabled={sending} onClick={() => { draftCache.clear(); setAttachments([]); setComposerExpanded(false); }}>מחיקת טיוטה</button>
          </div> : null}
          {replyTo?.draftRestoring ? <p className="sod29-community-status" role="status">בודק את ההודעה שאליה עונים…</p> : null}
          {replyTo?.draftUnavailable ? <p className="sod29-community-status" role="alert">לא ניתן לפתוח את ההודעה שאליה עונים. אפשר לנסות שוב או לבטל את התשובה. <button type="button" className="sod29-community-text-action" onClick={draftCache.retryReply}>ניסיון נוסף</button></p> : null}
          {notice ? <p className="sod29-community-status" role="status">{notice}</p> : null}
          {guestMustJoin && joinOpen ? <div className="sod29-community-guest-join" id="community-guest-join"><p role="status">ההודעה שלכם שמורה. נרשמים בשנייה והיא מתפרסמת מיד.</p><AccountEntry2029 inline returnHref={communityAccountReturnHref(window.location)} /></div> : null}
        </section> : null}
        {hasThreadRequest ? <section className="sod29-community-focus" aria-labelledby="community-focus-title">
          <header className="sod29-community-focus-head"><div><p>{personalThreadReturn ? "מתוך התגובות אליי" : "הקהילה"}</p><h2 id="community-focus-title">{personalThreadReturn ? "השיחה שבה התקבלה התגובה" : "השיחה המלאה"}</h2></div><div>
            <Link className="sod29-community-secondary" to={threadReturnHref}>{personalThreadReturn ? "חזרה להודעות שלי" : "חזרה לקהילה"}</Link>
            {threadFocus?.replyId ? <Link className="sod29-community-secondary" to={fullThreadHref}>לשרשור המלא</Link> : null}
          </div></header>
          {focusedThreadState === "loading" ? <p role="status">טוען את השיחה…</p> : null}
          {focusedThreadState === "error" ? <FrameState kind="error" title="טעינת השיחה נכשלה"><p>לא הצלחנו לפתוח את השיחה כרגע.</p></FrameState> : null}
          {focusedThreadState === "not_found" ? <FrameState kind="empty" title="השיחה אינה זמינה"><p>ייתכן שהשיחה אינה ציבורית או שהוסרה.</p></FrameState> : null}
          {focusedThread && threadFocus && focusedThread.id === threadFocus.threadId ? <LiveThread key={`${focusedThread.id}:${threadFocus.path.join(",")}`} row={focusedThread} accountProfiles={accountProfiles} onReply={actionsLocked ? undefined : startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} focusPath={threadFocus.path} messageActions={messageActions} newReplies={reading.updates[focusedThread.id]} onReplyCountKnown={onReplyCountKnown} /> : null}
        </section> : <>
          <div className="sod29-community-stream-tools"><label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בכל השיחות והתגובות</span><input type="search" value={query} maxLength={COMMUNITY_SEARCH_MAX_LENGTH} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בכל השיחות והתגובות" /></label>
          <section className="sod29-community-feed-controls" aria-label="סידור וסינון השיחות" aria-describedby="community-search-scope">
            <div className="sod29-community-feed-controls-top">
              <label className="sod29-community-sort sod29-community-stream-sort"><span className="sod29-community-sr-only">סדר לפי</span><select value={sort} aria-describedby="community-search-scope" onChange={event => {
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
            <p id="community-search-scope" className={`sod29-community-feed-controls-note${!searchText && sort !== "liked" ? " sod29-community-sr-only" : ""}`} role={serverSearchActive ? "status" : undefined}>{searchScopeNote}</p>
          </section></div>
          {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
          {serverSearchActive ? <>
            {search.status === "error" ? <FrameState kind="error" title="החיפוש נכשל"><p>לא הצלחנו לחפש כרגע.</p><button type="button" className="sod29-community-secondary" onClick={() => setSearchRetry(count => count + 1)}>ניסיון נוסף</button></FrameState> : null}
            {search.status === "loading" ? <p className="sod29-community-end" role="status">מחפש…</p> : null}
            {search.status === "ready" && !search.rows.length ? <FrameState kind="empty" title="לא נמצאו התאמות לחיפוש"><p>חיפשנו בכל השיחות והתגובות בארכיון.</p><button type="button" className="sod29-community-secondary" onClick={() => setQuery("")}>ניקוי החיפוש</button></FrameState> : null}
            <div className="sod29-community-feed sod29-community-search-results">{search.rows.map(row => <SearchHit key={row.id} row={row} accountProfiles={accountProfiles} onReply={actionsLocked ? undefined : startReply} messageActions={messageActions} />)}</div>
            {searchMoreAvailable ? <button className="sod29-community-load" type="button" disabled={search.loadingMore} onClick={loadMoreSearch}>{search.loadingMore ? "טוען…" : "עוד תוצאות"} <span aria-hidden="true">↓</span></button> : null}
            {search.moreFailed ? <p role="alert">לא הצלחנו לטעון תוצאות נוספות. אפשר לנסות שוב.</p> : null}
          </> : <>
          {!error && !loading && !filtered.length ? <FrameState kind="empty" title={query.trim() ? "לא נמצאו התאמות לחיפוש" : "אין הודעות להצגה כרגע"}>{query.trim() ? <><p>החיפוש חל על ההודעות שנטענו בלבד, כי חיפוש בכל הארכיון אינו זמין כרגע.</p><button type="button" className="sod29-community-secondary" onClick={() => setQuery("")}>ניקוי החיפוש</button></> : <p>אפשר לנסות לרענן את השיחות.</p>}</FrameState> : null}
          <div className={`sod29-community-feed${loading && !filtered.length ? " is-initial-loading" : ""}`}>{filtered.map((row) => <LiveThread key={row.id} row={row} accountProfiles={accountProfiles} onReply={actionsLocked ? undefined : startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} messageActions={messageActions} newReplies={reading.updates[row.id]} onReplyCountKnown={onReplyCountKnown} />)}</div>
          {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף השיחות.</p>}
          </>}
        </>}
      </section></div>}
      {!memberId && !claimId && trailingContent && !hasThreadRequest ? <footer className="sod29-community-public-footer" aria-label="השתתפות בקהילה">
        <a href="#legacy-chat">לצ׳אט הישן ↓</a>
      </footer> : null}
      {cardId ? <div className="sod29-community-card-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="sod29-community-card" role="dialog" aria-modal="true" aria-label={`הודעות של ${memberName}`}>
          <button ref={cardCloseRef} type="button" className="sod29-community-card-close" onClick={closeCard} aria-label="סגירת כרטיס הכותב">×</button>
          <header className="sod29-community-card-header"><span className="sod29-community-card-avatar-edit"><UserBadge avatarOnly colorfulFallback fallbackSeed={cardId} name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} fallbackImage={historicalCommunityAvatar(profileRows[0])} avatarClassName="sod29-community-avatar" />{!actionsLocked ? <QuickProfileAvatar2029 view={{ communityAuthorKey: cardId, canonicalHref: canonicalPath }} onSaved={() => { const principal = user?.id; if (principal) fetchLinkedAccountProfiles([principal]).then(accounts => { if (activeComposerPrincipal.current === principal) setAccountProfiles(current => ({ ...current, ...accounts })); }).catch(() => {}); }} /> : null}</span><h2>{memberName}</h2><CommunityHistorySeal2029 authorKey={selectedAuthorId} />{writer?.isWriter ? <span className="sod29-community-writer-chip">כותב</span> : null}{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{profileSummary.firstAt ? <p>פעילות ציבורית מאז {sinceFormat.format(new Date(profileSummary.firstAt))}</p> : null}{profileSummary.archiveLikes != null ? <strong>👍 {profileSummary.archiveLikes.toLocaleString("he-IL")} לייקים בהודעות</strong> : baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
          {baseline?.isPrivate ? <p className="sod29-community-card-note">פרטי הפרופיל פרטיים; ההודעות שכבר פורסמו ציבוריות.</p> : null}
          <div className="sod29-community-card-section"><h3>ההודעות של {memberName}</h3>{!profileLoading && !profileError && Number.isSafeInteger(profileCount) ? <span>{profileCount.toLocaleString("he-IL")} הודעות</span> : null}</div>
          {profileLoading ? <p className="sod29-community-card-note" role="status">טוען הודעות…</p> : null}
          {profileError ? <p className="sod29-community-card-note" role="alert">{profileError}</p> : null}
          <div className="sod29-community-card-messages">{profileRows.slice(0, 4).map((row) => <article key={row.id}><div className="sod29-community-card-meta"><span>{row.origin === "openweb" ? `הצ׳אט הוותיק · ${row.authorName}` : "הקהילה"}</span><CommunityMessageTime2029 value={row.createdAt} /></div><p dir="auto">{plainMessageText(row.body)}</p><div>{legacyLikeCount(row.reactions) > 0 ? <span>👍 {legacyLikeCount(row.reactions)}</span> : null}{row.parentId ? <span>תגובה בצ׳אט</span> : null}</div></article>)}</div>
          {!profileLoading && !profileRows.length && !profileError ? <p className="sod29-community-card-note">אין הודעות ציבוריות לכותב זה.</p> : null}
          {writer ? <Link className="sod29-community-card-full sod29-community-card-writer" to={writerHref()}>{writer.isWriter ? "לדף הכותב ←" : "לדף הפרופיל ←"}</Link> : null}
          <button type="button" className={writer ? "sod29-community-card-full sod29-community-card-secondary" : "sod29-community-card-full"} onClick={openFullProfile}>{writer ? "כל ההודעות בקהילה ←" : "לעמוד הכותב המלא ←"}</button>
        </section>
      </div> : null}
    </main>
    {!memberId && !claimId && !hasThreadRequest ? trailingContent : null}
  </Sod2029Shell>;
}
