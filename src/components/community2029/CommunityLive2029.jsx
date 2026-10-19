import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { describeCommunityActionError } from "../../lib/community/communityArchive.js";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_MAX_FILES, uploadCommunityAttachment, validateCommunityAttachment } from "../../lib/community/communityAttachments.js";
import { applySeo } from "../../lib/seo.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, VERIFIED_ARCHIVE_PROFILES, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchCommunityAuthorSummary, fetchCommunityReplies, fetchCommunityMessageContext, fetchCommunityMessageTotal, fetchCommunityReplyCounts, fetchLinkedAccountProfiles, fetchPublicAuthorActivityPage, legacyLikeCount, publishCommunityMessage, restoreCommunityMessage, searchCommunityArchive } from "../../lib/community/communityArchive.js";
import { captureCommunityScrollAnchor, mergeCommunityRefreshRows, restoreCommunityScrollAnchor, startCommunityRefresh } from "../../lib/community/communityRefresh.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import { EditHistory, MessageConfirm, MessageEditor, MessageReport, communityMessagePermissions, describeEdited } from "./CommunityMessageManage.jsx";
import CommunityAdminPanel from "./CommunityAdminPanel.jsx";
import LegacyClaimCard from "./LegacyClaimCard.jsx";
import CommunitySignIn from "./CommunitySignIn.jsx";
import LegacyAccountClaim from "./LegacyAccountClaim.jsx";
import { claimLegacyByEmail, isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";
import ReportHint from "../ReportHint.jsx";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const sinceFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const sourceLabels = { openweb: "הצ׳אט הישן", community_2029: "הקהילה", number: "מספר", els: "צופן", forum: "דיון", community: "קהילה" };

function LiveAuthor({ row, accountProfiles }) {
  const accountId = row.authorUserId || row.linkedUserId || VERIFIED_ARCHIVE_PROFILES[row.authorKey]?.accountUserId;
  const account = accountId ? accountProfiles[accountId] : null;
  const name = account?.display_name || account?.username || row.authorName;
  const badge = <UserBadge name={name} avatarUrl={account?.avatar_url || row.avatarUrl} avatarClassName="sod29-community-avatar">
    <time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time>
  </UserBadge>;
  if (!row.authorKey) return <span className="sod29-community-author-link">{badge}</span>;
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

// Per-viewer capabilities and locally applied changes. The server stays the authority:
// patches only bridge the moment between a confirmed action and the next read.
const messageLink = (id) => `${window.location.origin}/community/chat?message=${id}`;
async function copyMessageLink(id) {
  try { await navigator.clipboard.writeText(messageLink(id)); return true; } catch { return false; }
}

const CommunityActionsContext = createContext({ actionsAvailable: false, user: null, isAdmin: false, patches: {}, onMessageChanged: () => {} });

function LiveMessage({ row: sourceRow, onReply, accountProfiles, showSource = false, hasReplies = false }) {
  const { actionsAvailable, user, isAdmin, patches, onMessageChanged } = useContext(CommunityActionsContext);
  const [mode, setMode] = useState(null);
  const [linkNote, setLinkNote] = useState("");
  const row = patches[sourceRow.id] ? { ...sourceRow, ...patches[sourceRow.id] } : sourceRow;
  const manageRef = useRef(null);
  const closeMode = () => { setMode(null); requestAnimationFrame(() => manageRef.current?.focus()); };
  if (row.isDeleted && showSource) return null;
  if (row.isDeleted) return <article id={`message-${row.id}`} className="sod29-community-thread sod29-community-thread--deleted">
    <p className="sod29-community-deleted" role="note">ההודעה נמחקה</p>
  </article>;
  const can = communityMessagePermissions({ row, user, isAdmin, actionsAvailable });
  const edited = row.editedAt ? describeEdited(row.editedAt) : null;
  const canReply = row.origin === "openweb" || row.origin === "community_2029";
  const target = row.targetType === "number" && row.targetId ? `/number/${encodeURIComponent(row.targetId)}`
    : row.targetType === "els" && row.targetId ? `/codes/${encodeURIComponent(row.targetId)}`
    : row.targetType === "topic" && row.targetId ? `/topic/${encodeURIComponent(row.targetId)}` : null;
  return <article id={`message-${row.id}`} className="sod29-community-thread">
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} />{row.editedAt ? <span className="sod29-community-edited" title={edited.title}>{edited.text}</span> : null}</div>
    {showSource ? <div className="sod29-community-activity-source">{sourceLabels[row.origin] || "תרומה"}{row.parentId ? " · תגובה" : ""}</div> : null}
    {showSource && row.title && row.title !== row.body ? <h4 className="sod29-community-activity-title" dir="auto">{row.title}</h4> : null}
    {mode === "edit" ? <MessageEditor row={row} onCancel={closeMode} onSaved={(patch) => { onMessageChanged("edit", row, patch); closeMode(); }} />
      : row.body ? <CommunityMessageContent text={row.body} /> : <p className="sod29-community-missing-parent">תוכן הודעת המקור אינו זמין; התגובות הציבוריות נשמרו בשרשור.</p>}
    <div className="sod29-community-thread-actions">
      {canReply ? <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button> : null}
      <LiveLike row={row} />
      {can.edit && mode !== "edit" ? <button type="button" ref={manageRef} className="sod29-community-manage-action" onClick={() => setMode("edit")}>עריכה</button> : null}
      {can.remove && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => setMode("delete")}>מחיקה</button> : null}
      {can.history && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => setMode("history")}>היסטוריית עריכות</button> : null}
      {actionsAvailable && !showSource ? <button type="button" className="sod29-community-manage-action" onClick={() => copyMessageLink(row.id).then((ok) => setLinkNote(ok ? "הקישור הועתק" : messageLink(row.id)))}>קישור</button> : null}
      {can.report && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => setMode("report")}>דיווח</button> : null}
      {can.hideThread && hasReplies && !mode ? <button type="button" className="sod29-community-manage-action" onClick={() => setMode("hide-thread")}>הסתרת השרשור</button> : null}
      {showSource && target ? <Link to={target}>לתרומה המלאה ←</Link> : null}
    </div>
    {linkNote ? <p className="sod29-community-status" role="status" dir="auto">{linkNote}</p> : null}
    {mode === "history" ? <EditHistory row={row} onClose={closeMode} /> : null}
    {mode === "report" ? <MessageReport row={row} onCancel={closeMode} onDone={() => { setMode(null); onMessageChanged("report", row); }} /> : null}
    {mode === "delete" || mode === "hide-thread" ? <MessageConfirm row={row} kind={mode} onCancel={closeMode} onDone={(kind) => { onMessageChanged(kind, row); setMode(null); }} /> : null}
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
  const { patches } = useContext(CommunityActionsContext);
  // A deleted message with nothing left under it has no thread to open.
  const deletedLeaf = (patches[row.id]?.isDeleted || row.isDeleted) && count === 0 && !replies.length;
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
    <LiveMessage row={row} onReply={onReply} accountProfiles={accountProfiles} hasReplies={!(count === 0)} />
    {canExpand && !deletedLeaf ? <button type="button" className="sod29-community-replies-toggle" aria-expanded={expanded} aria-controls={childrenId} title="תגובות ישירות להודעה הזאת" onClick={toggleReplies}>{expanded ? "הסתר תגובות" : count > 0 ? `פתח עוד — ${count === 1 ? "תגובה אחת" : `${count.toLocaleString("he-IL")} תגובות`}` : "הצג תגובות"}</button> : null}
    <div id={childrenId} className="sod29-community-replies" hidden={!expanded}>
      {replyError ? <p role="alert">{replyError} <button type="button" onClick={() => loadReplies(nextReplyOffset)}>ניסיון נוסף</button></p> : null}
      {loadingReplies && !replies.length ? <p role="status">טוען תגובות…</p> : null}
      {replies.map((reply) => <LiveThread key={reply.id} row={reply} onReply={onReply} accountProfiles={accountProfiles} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={refreshToken} ancestors={[...ancestors, row.id]} />)}
      {!loadingReplies && !replyError && replyTotal === 0 ? <p>אין תגובות גלויות.</p> : null}
      {replyTotal != null && nextReplyOffset < replyTotal ? <button type="button" className="sod29-community-more-replies" disabled={loadingReplies} onClick={() => loadReplies(nextReplyOffset)}>{loadingReplies ? "טוען…" : (replyTotal - nextReplyOffset) === 1 ? "עוד תגובות — נותרה תגובה אחת" : `עוד תגובות — ${(replyTotal - nextReplyOffset).toLocaleString("he-IL")} נותרו`}</button> : null}
    </div>
  </div>;
}


export default function CommunityLive2029({ leadingContent = null, trailingContent = null, canonicalPath = "/?preview=community&data=live" }) {
  const palette = use2029Palette();
  const { user, profile, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const claimId = params.get("claim") || "";
  const memberId = claimId ? "" : params.get("member") || "";
  const cardId = memberId || claimId ? "" : params.get("memberCard") || "";
  const selectedAuthorId = memberId || cardId;
  const [rows, setRows] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [totalVerified, setTotalVerified] = useState(false);
  const [messageTotal, setMessageTotal] = useState(null);
  const [actionsAvailable, setActionsAvailable] = useState(false);
  // The OpenWeb history below mounts only after the first read settles; before that the page is short
  // and the history would look "near" and load on entry.
  const [feedSettled, setFeedSettled] = useState(false);
  const [undo, setUndo] = useState(null);
  const [archive, setArchive] = useState(null);
  const [legacy, setLegacy] = useState({ status: "idle", messages: 0 });
  const [focus, setFocus] = useState(null);
  const focusRef = useRef(null);
  const [patches, setPatches] = useState({});
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
  feedStateRef.current = { rows, loading, sending };

  const refreshMessageTotal = useCallback(() => {
    fetchCommunityMessageTotal().then(setMessageTotal).catch(() => {});
  }, []);

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
      if (page.count != null) { setTotal(page.count); setTotalVerified(true); }
      setActionsAvailable(Boolean(page.actions));
    } catch {
      if (request !== streamRequestRef.current) return;
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally {
      if (feedReadRef.current === read) feedReadRef.current = null;
      if (request === streamRequestRef.current) { setLoading(false); setFeedSettled(true); }
    }
  }, [sort]);

  useEffect(() => { loadPage(0, true); return () => { streamRequestRef.current++; }; }, [loadPage]);
  useEffect(() => { refreshMessageTotal(); }, [refreshMessageTotal]);
  useLayoutEffect(() => { restoreCommunityScrollAnchor(feedAnchorRef.current); feedAnchorRef.current = null; }, [rows]);
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
        if (page.count != null) { setTotal(page.count); setTotalVerified(true); }
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
    if (!selectedAuthorId) { setProfileLoading(false); return; }
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
    if (!selectedAuthorId) return;
    let active = true;
    fetchCommunityAuthorSummary(selectedAuthorId).then((summary) => { if (active) setProfileSummary(summary); }).catch(() => {});
    return () => { active = false; };
  }, [selectedAuthorId]);

  useEffect(() => {
    if (!cardId) return;
    cardCloseRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") closeCard(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cardId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    const visible = rows.filter((row) => row.body || row.isDeleted || replyCounts[row.id] > 0);
    return needle ? visible.filter((row) => !row.isDeleted && `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : visible;
  }, [query, rows, replyCounts]);
  const baseline = VERIFIED_ARCHIVE_PROFILES[selectedAuthorId];
  const linkedAccountId = profileRows.find((row) => row.linkedUserId)?.linkedUserId || baseline?.accountUserId;
  const linkedAccount = linkedAccountId ? accountProfiles[linkedAccountId] : null;
  const memberName = linkedAccount?.display_name || linkedAccount?.username || baseline?.name || profileRows[0]?.authorName || "חבר הקהילה";
  const isOwner = Boolean(user?.id && (linkedAccountId === user.id || selectedAuthorId === `user:${user.id}`));

  const refreshAfterRestore = useCallback(() => { setThreadRefresh((value) => value + 1); loadPage(0, true); refreshMessageTotal(); }, [loadPage, refreshMessageTotal]);
  const refreshReplyCounts = useCallback((ids) => {
    const clean = ids.filter(Boolean);
    if (clean.length) fetchCommunityReplyCounts(clean).then((counts) => setReplyCounts((current) => ({ ...current, ...counts }))).catch(() => {});
  }, []);
  // Applies a server-confirmed edit, delete or hide, then lets the open threads re-read the truth.
  const onMessageChanged = useCallback((kind, row, patch) => {
    if (kind === "edit") { setPatches((current) => ({ ...current, [row.id]: { ...current[row.id], ...patch } })); return; }
    if (kind === "report") { setNotice("הדיווח נשלח למנהלים. תודה."); return; }
    if (kind === "hide-thread" || (kind === "delete" && !row.parentId && replyCounts[row.id] === 0)) {
      // The root leaves the feed: keep the paging offset and the remaining count honest.
      setRows((current) => current.filter((item) => item.id !== row.id));
      setNextOffset((current) => Math.max(0, current - 1));
      setTotal((current) => Math.max(0, current - 1));
    } else setPatches((current) => ({ ...current, [row.id]: { isDeleted: true, body: "" } }));
    if (row.parentId) { requestedReplyCounts.current.delete(row.parentId); refreshReplyCounts([row.parentId]); }
    setThreadRefresh((value) => value + 1);
    setNotice(kind === "hide-thread" ? "השרשור הוסתר." : "ההודעה נמחקה.");
    setUndo({ id: row.id, kind });
    refreshMessageTotal();
  }, [replyCounts, refreshReplyCounts, refreshMessageTotal]);
  useEffect(() => {
    if (!undo) return undefined;
    const timer = setTimeout(() => setUndo(null), 15000);
    return () => clearTimeout(timer);
  }, [undo]);
  const undoLast = async () => {
    const target = undo; if (!target) return;
    setUndo(null);
    try {
      await restoreCommunityMessage(target.id);
      setPatches((current) => { const next = { ...current }; delete next[target.id]; return next; });
      setNotice(target.kind === "hide-thread" ? "השרשור שוחזר." : "ההודעה שוחזרה.");
      refreshAfterRestore();
    } catch (err) { setNotice(describeCommunityActionError(err)); }
  };
  const actionsContext = useMemo(() => ({ actionsAvailable, user, isAdmin: Boolean(isAdmin), patches, onMessageChanged }), [actionsAvailable, user, isAdmin, patches, onMessageChanged]);

  // A signed-in account whose confirmed email matches an old chat author is linked by the server. It runs once per tab
  // session on its own, and again whenever the reader presses the button on the legacy card.
  const checkLegacy = useCallback(async ({ manual = false } = {}) => {
    if (!user?.id) return;
    if (manual) setLegacy({ status: "checking", messages: 0 });
    try {
      const result = await claimLegacyByEmail();
      try { sessionStorage.setItem(`sod-legacy-auto-claim:${user.id}`, "1"); } catch { /* ignore */ }
      if (!result) { if (manual) setLegacy({ status: "unavailable", messages: 0 }); return; }
      if (result.claimed) {
        setLegacy({ status: "claimed", messages: result.messages });
        fetchLinkedAccountProfiles([user.id]).then((accounts) => setAccountProfiles((current) => ({ ...current, ...accounts }))).catch(() => {});
        loadPage(0, true);
      } else if (manual) setLegacy({ status: result.reason === "account_has_contributor" ? "has_contributor" : result.reason === "email_not_confirmed" ? "email_not_confirmed" : "no_match", messages: 0 });
    } catch { if (manual) setLegacy({ status: "error", messages: 0 }); }
  }, [user?.id, loadPage]);
  useEffect(() => {
    if (!user?.id) return;
    try { if (sessionStorage.getItem(`sod-legacy-auto-claim:${user.id}`)) return; } catch { /* storage unavailable: try once per mount */ }
    checkLegacy();
  }, [user?.id, checkLegacy]);
  const focusSignIn = () => {
    const trigger = document.getElementById("community-sign-in-trigger");
    trigger?.scrollIntoView({ block: "center" });
    trigger?.click();
    requestAnimationFrame(() => document.getElementById("community-sign-in-email")?.focus());
  };

  const messageParam = params.get("message") || "";
  useEffect(() => {
    setFocus(null);
    if (!messageParam || memberId || claimId || cardId) return undefined;
    let active = true;
    fetchCommunityMessageContext(messageParam).then((rows) => {
      if (!active) return;
      if (rows === null) setNotice("הקישור להודעה יעבוד כשהעדכון יופעל.");
      else if (!rows.length) setNotice("ההודעה שביקשת כבר לא זמינה.");
      else { setFocus(rows); requestAnimationFrame(() => focusRef.current?.scrollIntoView({ block: "start" })); }
    }).catch(() => { if (active) setNotice("לא הצלחנו לפתוח את ההודעה שקיבלת אליה קישור."); });
    return () => { active = false; };
  }, [messageParam, memberId, claimId, cardId]);
  const openMessage = (id) => setParams((current) => { const next = new URLSearchParams(current); next.set("message", id); return next; });
  const closeFocus = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("message"); return next; });
  const runArchiveSearch = async (offset = 0) => {
    const q = query.trim();
    if (q.length < 2) return;
    setArchive((current) => ({ ...(offset ? current : { rows: [], count: 0, nextOffset: 0 }), q, loading: true, error: "" }));
    try {
      const page = await searchCommunityArchive(q, { offset });
      if (!page) { setArchive(null); setNotice("החיפוש בארכיון יעבוד כשהעדכון יופעל."); return; }
      setArchive((current) => ({ q, loading: false, error: "", rows: offset ? [...current.rows, ...page.rows.filter((item) => !current.rows.some((existing) => existing.id === item.id))] : page.rows, count: page.count ?? current.count, nextOffset: page.nextOffset }));
      onRepliesLoaded(page.rows);
    } catch { setArchive((current) => ({ ...current, loading: false, error: "החיפוש נכשל. נסו שוב." })); }
  };

  const closeProfile = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("member"); return next; });
  const closeCard = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("memberCard"); return next; });
  const openFullProfile = () => { setProfileFilter("all"); setProfileSort("newest"); setParams((current) => { const next = new URLSearchParams(current); next.set("member", selectedAuthorId); next.delete("memberCard"); return next; }); };
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
      const messageId = await publishCommunityMessage({ body: appendCommunityAttachments(body, uploaded), parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      if (typeof messageId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)) {
        throw new Error("community_message_not_confirmed");
      }
      if (replyTo) {
        requestedReplyCounts.current.delete(replyTo.id);
        setReplyCounts((current) => { const next = { ...current }; delete next[replyTo.id]; return next; });
        setThreadRefresh((current) => current + 1);
      }
      setDraft(""); setAttachments([]); setReplyTo(null); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      await loadPage(0, true);
      refreshMessageTotal();
    } catch { setNotice("השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר."); }
    finally { setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="קהילה" symbol="◎">
    <CommunityActionsContext.Provider value={actionsContext}>
    {leadingContent}
    <main id="community-new-chat" className="sod29-community" data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      {claimId ? <LegacyAccountClaim key={claimId} contributorId={claimId} palette={palette} /> : null}
      {!memberId && !claimId ? <header className="sod29-community-intro"><div><div className="sod29-community-intro-heading"><h1>הקהילה</h1>{messageTotal != null ? <span className="sod29-community-message-total" aria-label={`${messageTotal.toLocaleString("he-IL")} הודעות בשיחה`}><strong>{messageTotal.toLocaleString("he-IL")}</strong> הודעות</span> : null}</div><p>השיחות שלנו, במקום אחד.</p></div></header> : null}
      {claimId ? null : memberId ? <section className="sod29-community-profile" aria-label={`הפרופיל של ${memberName}`}>
        <button type="button" className="sod29-community-text-action" onClick={closeProfile}>→ חזרה לשיחות</button>
        <header className="sod29-community-profile-hero"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{baseline?.name && baseline.name !== memberName ? <p>הודעות עבר בשם {baseline.name}</p> : null}{profileSummary.firstAt ? <p>פעילות ציבורית מאז {sinceFormat.format(new Date(profileSummary.firstAt))}</p> : null}{profileSummary.archiveLikes != null ? <strong>👍 {profileSummary.archiveLikes.toLocaleString("he-IL")} לייקים בהודעות</strong> : baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
        {isOwner ? <Link className="sod29-community-secondary sod29-community-edit-profile" to="/profile">עריכת הפרופיל שלי</Link> : null}
        {!isOwner && isLegacyContributorId(memberId) ? <Link className="sod29-community-secondary sod29-community-edit-profile" to={`?preview=community&data=live&claim=${memberId}`}>זה החשבון הישן שלי</Link> : null}
        {baseline?.isPrivate ? <p className="sod29-community-profile-note">פרטי הפרופיל פרטיים. הודעות שפורסמו בעבר נשארות ציבוריות.</p> : null}
        <div className="sod29-community-profile-section"><div><h3>פוסטים ({profileCount.toLocaleString("he-IL")})</h3><p>הודעות ותרומות שפורסמו בצ׳אט ובאתר.</p></div><div className="sod29-community-profile-filters" role="group" aria-label="סינון פעילות הכותב">{[["all", "הכול"], ["chat", "הודעות"], ["contributions", "תרומות"]].map(([key, label]) => <button key={key} type="button" aria-pressed={profileFilter === key} onClick={() => setProfileFilter(key)}>{label}</button>)}</div><label className="sod29-community-sort">סדר לפי <select value={profileSort} onChange={(event) => setProfileSort(event.target.value)}><option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option></select></label></div>
        {profileError ? <p role="alert">{profileError}</p> : null}<div className="sod29-community-feed">{profileRows.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={accountProfiles} showSource onReply={(item) => { closeProfile(); startReply(item); }} />)}</div>{profileLoading ? <p className="sod29-community-end">טוען פוסטים…</p> : null}{!profileRows.length && !profileLoading && !profileError ? <p className="sod29-community-end">אין פוסטים ציבוריים בסינון הזה.</p> : null}{profileNextOffset < profileCount ? <button className="sod29-community-load" type="button" disabled={profileLoading} onClick={async () => { setProfileLoading(true); try { const page = await fetchPublicAuthorActivityPage(memberId, { offset: profileNextOffset, filter: profileFilter, sort: profileSort }); setProfileRows((current) => [...current, ...page.rows]); setProfileNextOffset(page.nextOffset); } catch { setProfileError("טעינת פוסטים נוספים נכשלה."); } finally { setProfileLoading(false); } }}>עוד פוסטים</button> : null}
      </section> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        <CommunitySignIn />
        {isAdmin && actionsAvailable ? <CommunityAdminPanel onChanged={refreshAfterRestore} refreshKey={threadRefresh} /> : null}
        <section className="sod29-community-hint-mobile" aria-label="הוספת רמז לעץ"><div><strong>מצאתם רמז?</strong><p>מספר, תמונה, מקור או חיבור מעניין — שלחו לבדיקה. רמז שיאושר יצטרף לעץ הכללי.</p></div><ReportHint label="הוספת רמז לעץ" /></section>
        <LegacyClaimCard user={user} legacy={legacy} onCheck={() => checkLegacy({ manual: true })} onSignInFocus={focusSignIn} />
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
          {undo ? <button type="button" className="sod29-community-text-action" onClick={undoLast}>{undo.kind === "hide-thread" ? "ביטול הסתרה" : "ביטול מחיקה"}</button> : null}
        </section>
        <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בשיחות שבדף</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שבדף" /></label>
        {actionsAvailable && query.trim().length >= 2 ? <button type="button" className="sod29-community-text-action sod29-community-archive-search" disabled={archive?.loading} onClick={() => runArchiveSearch(0)}>חיפוש בכל הארכיון: ״{query.trim()}״</button> : null}
        {focus ? <section ref={focusRef} className="sod29-community-focus" aria-label="ההודעה שקיבלת אליה קישור">
          <div className="sod29-community-filter-chip"><span>ההודעה שקיבלת אליה קישור</span><button type="button" onClick={closeFocus}>סגירה</button></div>
          {focus.slice(0, -1).map((item) => <div key={item.id} className="sod29-community-focus-ancestor"><LiveMessage row={item} onReply={startReply} accountProfiles={accountProfiles} /></div>)}
          <div className="sod29-community-focus-target"><LiveThread key={focus[focus.length - 1].id} row={focus[focus.length - 1]} accountProfiles={accountProfiles} onReply={startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} ancestors={focus.slice(0, -1).map((item) => item.id)} /></div>
        </section> : null}
        <label className="sod29-community-sort sod29-community-stream-sort">סדר לפי <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option></select></label>
        {archive ? <section className="sod29-community-archive-results" aria-label="תוצאות חיפוש בארכיון">
          <div className="sod29-community-filter-chip"><span>{archive.loading && !archive.rows.length ? "מחפש…" : `${archive.count.toLocaleString("he-IL")} תוצאות ל״${archive.q}״`}</span><button type="button" onClick={() => setArchive(null)}>חזרה לשיחות</button></div>
          {archive.error ? <p role="alert">{archive.error} <button type="button" onClick={() => runArchiveSearch(archive.nextOffset)}>ניסיון נוסף</button></p> : null}
          {!archive.loading && !archive.error && !archive.rows.length ? <p>לא נמצאו הודעות.</p> : null}
          <div className="sod29-community-feed">{archive.rows.map((row) => <div key={row.id} className="sod29-community-result"><LiveMessage row={row} accountProfiles={accountProfiles} onReply={startReply} /><button type="button" className="sod29-community-text-action" onClick={() => openMessage(row.id)}>הצגה בהקשר השרשור ←</button></div>)}</div>
          {archive.nextOffset < archive.count ? <button className="sod29-community-load" type="button" disabled={archive.loading} onClick={() => runArchiveSearch(archive.nextOffset)}>{archive.loading ? "טוען…" : `עוד תוצאות — ${(archive.count - archive.nextOffset).toLocaleString("he-IL")} נותרו`}</button> : null}
        </section> : null}
        {archive ? null : error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
        {archive ? null : <>
          {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
          <div className="sod29-community-feed">{filtered.map((row) => <LiveThread key={row.id} row={row} accountProfiles={accountProfiles} onReply={startReply} replyCounts={replyCounts} onRepliesLoaded={onRepliesLoaded} refreshToken={threadRefresh} />)}</div>
          {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : totalVerified ? `עוד הודעות — ${Math.max(0, total - nextOffset).toLocaleString("he-IL")} נותרו` : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף השיחות.</p>}
        </>}
      </section><aside className="sod29-community-aside" aria-label="על הקהילה"><section className="sod29-community-side-card sod29-community-hint-card"><span className="sod29-community-side-symbol" aria-hidden="true">🌳</span><h2>מצאתם רמז?</h2><p>מספר, תמונה, מקור או חיבור מעניין — שלחו לבדיקה. רמז שיאושר יצטרף לעץ הכללי ולזרם המציאות.</p><ReportHint label="הוספת רמז לעץ" /></section><section className="sod29-community-side-card"><h2>שיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>שומרים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section></aside></div>}
      {cardId ? <div className="sod29-community-card-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="sod29-community-card" role="dialog" aria-modal="true" aria-label={`הודעות של ${memberName}`}>
          <button ref={cardCloseRef} type="button" className="sod29-community-card-close" onClick={closeCard} aria-label="סגירת כרטיס הכותב">×</button>
          <header className="sod29-community-card-header"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{profileSummary.firstAt ? <p>פעילות ציבורית מאז {sinceFormat.format(new Date(profileSummary.firstAt))}</p> : null}{profileSummary.archiveLikes != null ? <strong>👍 {profileSummary.archiveLikes.toLocaleString("he-IL")} לייקים בהודעות</strong> : baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
          {baseline?.isPrivate ? <p className="sod29-community-card-note">פרטי הפרופיל פרטיים; ההודעות שכבר פורסמו ציבוריות.</p> : null}
          <div className="sod29-community-card-section"><h3>ההודעות של {memberName}</h3>{!profileLoading && !profileError ? <span>{profileCount.toLocaleString("he-IL")} הודעות</span> : null}</div>
          {profileLoading ? <p className="sod29-community-card-note" role="status">טוען הודעות…</p> : null}
          {profileError ? <p className="sod29-community-card-note" role="alert">{profileError}</p> : null}
          <div className="sod29-community-card-messages">{profileRows.slice(0, 4).map((row) => <article key={row.id}><div className="sod29-community-card-meta"><span>{row.origin === "openweb" ? `הצ׳אט הוותיק · ${row.authorName}` : "הקהילה"}</span><time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time></div><p dir="auto">{row.body}</p><div>{legacyLikeCount(row.reactions) > 0 ? <span>👍 {legacyLikeCount(row.reactions)}</span> : null}{row.parentId ? <span>תגובה בצ׳אט</span> : null}</div></article>)}</div>
          {!profileLoading && !profileRows.length && !profileError ? <p className="sod29-community-card-note">אין הודעות ציבוריות לכותב זה.</p> : null}
          <button type="button" className="sod29-community-card-full" onClick={openFullProfile}>לעמוד הכותב המלא ←</button>
        </section>
      </div> : null}
    </main>
    {feedSettled ? trailingContent : null}
    </CommunityActionsContext.Provider>
  </Sod2029Shell>;
}
