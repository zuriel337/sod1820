import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { appendCommunityAttachments, COMMUNITY_ATTACHMENT_MAX_FILES, uploadCommunityAttachment, validateCommunityAttachment } from "../../lib/community/communityAttachments.js";
import { applySeo } from "../../lib/seo.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, VERIFIED_ARCHIVE_PROFILES, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchCommunityAuthorSummary, fetchLinkedAccountProfiles, fetchPublicAuthorActivityPage, legacyLikeCount, publishCommunityMessage } from "../../lib/community/communityArchive.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import CommunitySignIn from "./CommunitySignIn.jsx";
import LegacyAccountClaim from "./LegacyAccountClaim.jsx";
import { isLegacyContributorId } from "../../lib/community/legacyClaim.js";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";

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
    <ReactionBar id={row.id} reactions={reactions} variant="row" />
    {dislikes > 0 ? <span className="sod29-community-dislikes" aria-label={`${dislikes} לא אהבו`}><span aria-hidden="true">👎</span> {dislikes}</span> : null}
  </div>;
}

function LiveMessage({ row, onReply, accountProfiles, showSource = false }) {
  const canReply = row.origin === "openweb" || row.origin === "community_2029";
  const target = row.targetType === "number" && row.targetId ? `/number/${encodeURIComponent(row.targetId)}`
    : row.targetType === "els" && row.targetId ? `/codes/${encodeURIComponent(row.targetId)}`
    : row.targetType === "topic" && row.targetId ? `/topic/${encodeURIComponent(row.targetId)}` : null;
  return <article id={`message-${row.id}`} className="sod29-community-thread">
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} /></div>
    {showSource ? <div className="sod29-community-activity-source">{sourceLabels[row.origin] || "תרומה"}{row.parentId ? " · תגובה" : ""}</div> : null}
    {showSource && row.title && row.title !== row.body ? <h4 className="sod29-community-activity-title" dir="auto">{row.title}</h4> : null}
    <CommunityMessageContent text={row.body} />
    <div className="sod29-community-thread-actions">
      {canReply ? <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button> : null}
      <LiveLike row={row} />
      {showSource && target ? <Link to={target}>לתרומה המלאה ←</Link> : null}
    </div>
  </article>;
}


export default function CommunityLive2029() {
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
  const [accountProfiles, setAccountProfiles] = useState({});
  const composerRef = useRef(null);
  const attachmentRef = useRef(null);
  const cardCloseRef = useRef(null);
  const streamRequestRef = useRef(0);

  const loadPage = useCallback(async (offset = 0, replace = false) => {
    const request = ++streamRequestRef.current;
    setLoading(true); setError("");
    try {
      const page = await fetchCommunityArchivePage({ offset, limit: COMMUNITY_PAGE_SIZE, sort });
      if (request !== streamRequestRef.current) return;
      setRows((current) => replace ? page.rows : [...current, ...page.rows]);
      setNextOffset(page.nextOffset);
      if (page.count != null) setTotal(page.count);
    } catch {
      if (request !== streamRequestRef.current) return;
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally { if (request === streamRequestRef.current) setLoading(false); }
  }, [sort]);

  useEffect(() => { loadPage(0, true); }, [loadPage]);
  useEffect(() => { applySeo({ title: "הקהילה — סוד 1820", description: "שיחות הקהילה והארכיון במקום אחד.", path: "/2029?preview=community&data=live", noindex: true }); }, []);
  useEffect(() => { let active = true; fetchLinkedAccountProfiles().then((accounts) => { if (active) setAccountProfiles(accounts); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const ids = [...new Set([...rows, ...profileRows].flatMap((row) => [row.authorUserId, row.linkedUserId]).filter(Boolean))];
    if (!ids.length) return undefined;
    let active = true;
    fetchLinkedAccountProfiles(ids).then((accounts) => { if (active) setAccountProfiles((current) => ({ ...current, ...accounts })); }).catch(() => {});
    return () => { active = false; };
  }, [rows, profileRows]);

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
    return needle ? rows.filter((row) => `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : rows;
  }, [query, rows]);
  const baseline = VERIFIED_ARCHIVE_PROFILES[selectedAuthorId];
  const linkedAccountId = profileRows.find((row) => row.linkedUserId)?.linkedUserId || baseline?.accountUserId;
  const linkedAccount = linkedAccountId ? accountProfiles[linkedAccountId] : null;
  const memberName = linkedAccount?.display_name || linkedAccount?.username || baseline?.name || profileRows[0]?.authorName || "חבר הקהילה";
  const isOwner = Boolean(user?.id && (linkedAccountId === user.id || selectedAuthorId === `user:${user.id}`));

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
      await publishCommunityMessage({ body: appendCommunityAttachments(body, uploaded), parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      setDraft(""); setAttachments([]); setReplyTo(null); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      await loadPage(0, true);
    } catch { setNotice("השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר."); }
    finally { setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="תצוגה מחוברת" symbol="◎">
    <main className="sod29-community" data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      <div className="sod29-community-preview-notice" role="note"><strong>תצוגה מחוברת</strong><span>{memberId ? "הצ׳אט הישן עדיין פעיל." : "הודעות ולייקים מגיעים מהמערכת הקיימת. הדף עדיין לא החליף את הצ׳אט הישן."}</span></div>
      {claimId ? <LegacyAccountClaim key={claimId} contributorId={claimId} palette={palette} /> : null}
      {!memberId && !claimId ? <header className="sod29-community-intro"><div><h1>הקהילה</h1><p>השיחות שלנו, במקום אחד.</p></div></header> : null}
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
        <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בהודעות שנטענו</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שנטענו" /></label>
        <label className="sod29-community-sort sod29-community-stream-sort">סדר לפי <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">החדש ביותר</option><option value="oldest">הישן ביותר</option></select></label>
        <div className="sod29-community-feed-label" role="status">{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות בארכיון · {total.toLocaleString("he-IL")} הודעות קהילה גלויות · נטענו {rows.length.toLocaleString("he-IL")}</div>
        {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
        {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
        <div className="sod29-community-feed">{filtered.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={accountProfiles} onReply={startReply} />)}</div>
        {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף הארכיון.</p>}
      </section><aside className="sod29-community-aside" aria-label="על הקהילה"><section className="sod29-community-side-card"><h2>הארכיון מחובר</h2><p>{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות נשמרו; {total.toLocaleString("he-IL")} הודעות גלויות בפיד הקהילה. הכפתור ״עוד הודעות״ טוען אותן בהדרגה.</p></section><section className="sod29-community-side-card"><h2>שיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>שומרים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section></aside></div>}
      {cardId ? <div className="sod29-community-card-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="sod29-community-card" role="dialog" aria-modal="true" aria-label={`הודעות של ${memberName}`}>
          <button ref={cardCloseRef} type="button" className="sod29-community-card-close" onClick={closeCard} aria-label="סגירת כרטיס הכותב">×</button>
          <header className="sod29-community-card-header"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{profileSummary.firstAt ? <p>פעילות ציבורית מאז {sinceFormat.format(new Date(profileSummary.firstAt))}</p> : null}{profileSummary.archiveLikes != null ? <strong>👍 {profileSummary.archiveLikes.toLocaleString("he-IL")} לייקים בהודעות</strong> : baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
          {profileSummary.archiveLikes != null ? <p className="sod29-community-card-note">ההיסטוריה כוללת את פרופיל OpenWeb התואם לחשבון הזה בלבד.</p> : null}
          {baseline?.isPrivate ? <p className="sod29-community-card-note">פרטי הפרופיל פרטיים; ההודעות שכבר פורסמו ציבוריות.</p> : null}
          <div className="sod29-community-card-section"><h3>ההודעות של {memberName}</h3>{!profileLoading && !profileError ? <span>{profileCount.toLocaleString("he-IL")} הודעות</span> : null}</div>
          {profileLoading ? <p className="sod29-community-card-note" role="status">טוען הודעות…</p> : null}
          {profileError ? <p className="sod29-community-card-note" role="alert">{profileError}</p> : null}
          <div className="sod29-community-card-messages">{profileRows.slice(0, 4).map((row) => <article key={row.id}><div className="sod29-community-card-meta"><span>{row.origin === "openweb" ? `OpenWeb · ${row.authorName}` : "הקהילה"}</span><time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time></div><p dir="auto">{row.body}</p><div>{legacyLikeCount(row.reactions) > 0 ? <span>👍 {legacyLikeCount(row.reactions)}</span> : null}{row.parentId ? <span>תגובה בצ׳אט</span> : null}</div></article>)}</div>
          {!profileLoading && !profileRows.length && !profileError ? <p className="sod29-community-card-note">אין הודעות ציבוריות לכותב זה.</p> : null}
          <button type="button" className="sod29-community-card-full" onClick={openFullProfile}>לעמוד הכותב המלא ←</button>
        </section>
      </div> : null}
    </main>
  </Sod2029Shell>;
}
