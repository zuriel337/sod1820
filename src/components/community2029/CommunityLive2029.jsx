import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { applySeo } from "../../lib/seo.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, PROFILE_BASELINES, fetchCommunityArchivePage, publishCommunityMessage } from "../../lib/community/communityArchive.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

function LiveAuthor({ row }) {
  const target = new URLSearchParams({ preview: "community", data: "live", member: row.authorName });
  return <Link className="sod29-community-author-link" to={`?${target}`} aria-label={`פתיחת העמוד של ${row.authorName}`}>
    <UserBadge name={row.authorName} avatarUrl={row.avatarUrl} avatarClassName="sod29-community-avatar">
      <time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time>
    </UserBadge>
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

function LiveMessage({ row, onReply }) {
  return <article id={`message-${row.id}`} className="sod29-community-thread">
    <div className="sod29-community-author"><LiveAuthor row={row} /></div>
    <CommunityMessageContent text={row.body} />
    <div className="sod29-community-thread-actions">
      <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button>
      <LiveLike row={row} />
    </div>
  </article>;
}

export default function CommunityLive2029() {
  const palette = use2029Palette();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const memberName = params.get("member") || "";
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const composerRef = useRef(null);

  const loadPage = useCallback(async (offset = 0, replace = false) => {
    setLoading(true); setError("");
    try {
      const page = await fetchCommunityArchivePage({ offset, limit: COMMUNITY_PAGE_SIZE });
      setRows((current) => replace ? page.rows : [...current, ...page.rows]);
      if (page.count != null) setTotal(page.count);
    } catch {
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPage(0, true); }, [loadPage]);
  useEffect(() => { applySeo({ title: "הקהילה — סוד 1820", description: "שיחות הקהילה והארכיון במקום אחד.", path: "/2029?preview=community&data=live", noindex: true }); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    return needle ? rows.filter((row) => `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : rows;
  }, [query, rows]);
  const profileRows = useMemo(() => rows.filter((row) => row.authorName === memberName), [memberName, rows]);
  const baseline = PROFILE_BASELINES[memberName];
  const isOwner = Boolean(user && profile && [profile.display_name, profile.username].filter(Boolean).includes(memberName));

  const closeProfile = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("member"); return next; });
  const startReply = (row) => { setReplyTo(row); requestAnimationFrame(() => composerRef.current?.focus()); };
  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setNotice("");
    try {
      await publishCommunityMessage({ body, parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      setDraft(""); setReplyTo(null); setNotice("ההודעה נשלחה.");
      await loadPage(0, true);
    } catch { setNotice("השליחה לא הצליחה. אפשר להתחבר ולנסות שוב."); }
    finally { setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="תצוגה מחוברת" symbol="◎">
    <main className="sod29-community" data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      <div className="sod29-community-preview-notice" role="note"><strong>תצוגה מחוברת</strong><span>הודעות ולייקים מגיעים מהמערכת הקיימת. הדף עדיין לא החליף את הצ׳אט הישן.</span></div>
      <header className="sod29-community-intro"><div><h1>הקהילה</h1><p>השיחות שלנו, במקום אחד.</p></div></header>
      {memberName ? <section className="sod29-community-profile" aria-label={`הפרופיל של ${memberName}`}>
        <button type="button" className="sod29-community-text-action" onClick={closeProfile}>→ חזרה לשיחות</button>
        <header className="sod29-community-profile-hero"><UserBadge avatarOnly name={memberName} avatarUrl={profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{baseline ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
        {isOwner ? <Link className="sod29-community-secondary sod29-community-edit-profile" to="/profile">עריכת הפרופיל שלי</Link> : null}
        {baseline?.isPrivate ? <div className="sod29-community-private"><span aria-hidden="true">🔒</span><p>הפרופיל של {memberName} במצב פרטי</p></div> : <><h3>פוסטים ({profileRows.length}{rows.length < total ? "+" : ""})</h3><div className="sod29-community-feed">{profileRows.map((row) => <LiveMessage key={row.id} row={row} onReply={(item) => { closeProfile(); startReply(item); }} />)}</div>{!profileRows.length && !loading ? <p className="sod29-community-end">אין פוסטים של הכותב במקטע שנטען.</p> : null}</>}
      </section> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        <section className="sod29-community-composer" aria-label="כתיבת הודעה">
          <label htmlFor="community-live-draft">מה תרצו לשתף?</label>
          {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)}>ביטול תשובה</button></div> : null}
          <textarea ref={composerRef} id="community-live-draft" rows={2} maxLength={1500} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="הוסף תגובה…" />
          <CommunityMessageContent text={draft} previewsOnly />
          <div className="sod29-community-composer-bottom"><small>{draft.length}/1500</small><button type="button" className="sod29-community-primary" disabled={!draft.trim() || sending} onClick={submit}>{sending ? "שולח…" : "פרסום"}</button></div>
          {notice ? <p className="sod29-community-status" role="status">{notice}</p> : null}
        </section>
        <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בהודעות שנטענו</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שנטענו" /></label>
        <div className="sod29-community-feed-label" role="status">{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות בארכיון · {total.toLocaleString("he-IL")} הודעות ציבוריות · נטענו {rows.length.toLocaleString("he-IL")}</div>
        {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
        {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
        <div className="sod29-community-feed">{filtered.map((row) => <LiveMessage key={row.id} row={row} onReply={startReply} />)}</div>
        {rows.length < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(rows.length, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף הארכיון.</p>}
      </section><aside className="sod29-community-aside" aria-label="על הקהילה"><section className="sod29-community-side-card"><h2>הארכיון מחובר</h2><p>{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות נשמרו; {total.toLocaleString("he-IL")} מהן ציבוריות כרגע. הכפתור ״עוד הודעות״ טוען את הפיד הציבורי בהדרגה.</p></section><section className="sod29-community-side-card"><h2>שיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>שומרים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section></aside></div>}
    </main>
  </Sod2029Shell>;
}
