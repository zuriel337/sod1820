import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import { requestEmailOtp, verifyEmailOtp } from "../../lib/auth.js";
import { EMAIL_OTP_MAX_LENGTH, isValidEmailOtp, sanitizeEmailOtp } from "../../lib/emailOtp.js";
import { applySeo } from "../../lib/seo.js";
import { use2029Palette } from "../../lib/palette.js";
import { COMMUNITY_ARCHIVE_TOTAL, COMMUNITY_PAGE_SIZE, VERIFIED_ARCHIVE_PROFILES, fetchCommunityArchivePage, fetchCommunityAuthorPage, fetchLinkedAccountProfiles, legacyLikeCount, publishCommunityMessage } from "../../lib/community/communityArchive.js";
import Sod2029Shell, { FrameState } from "../experience2029/Sod2029Shell.jsx";
import CommunityMessageContent from "./CommunityMessageContent.jsx";
import ReactionBar from "../ReactionBar.jsx";
import UserBadge from "../UserBadge.jsx";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

function LiveAuthor({ row, accountProfiles }) {
  const accountId = VERIFIED_ARCHIVE_PROFILES[row.authorKey]?.accountUserId;
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

function LiveMessage({ row, onReply, accountProfiles }) {
  return <article id={`message-${row.id}`} className="sod29-community-thread">
    <div className="sod29-community-author"><LiveAuthor row={row} accountProfiles={accountProfiles} /></div>
    <CommunityMessageContent text={row.body} />
    <div className="sod29-community-thread-actions">
      <button type="button" className="sod29-community-reply-action" onClick={() => onReply(row)}>השב</button>
      <LiveLike row={row} />
    </div>
  </article>;
}

function CommunitySignIn() {
  const { user, profile, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("יש להזין כתובת מייל תקינה."); return; }
    setBusy(true);
    try { await requestEmailOtp(email); setStep("code"); }
    catch { setError("לא הצלחנו לשלוח קוד כרגע. נסו שוב."); }
    finally { setBusy(false); }
  };

  const confirmCode = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!isValidEmailOtp(code)) { setError("יש להזין את הקוד המלא שקיבלתם במייל."); return; }
    setBusy(true);
    try { await verifyEmailOtp(email, code); setCode(""); }
    catch { setError("הקוד שגוי או שפג תוקפו. בדקו אותו ונסו שוב."); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="sod29-community-sign-in" role="status">בודק התחברות…</div>;
  if (user) return <section className="sod29-community-sign-in sod29-community-signed-in" aria-label="חשבון הקהילה">
    <div><strong>מחובר/ת כ־{profile?.display_name || profile?.username || user.email}</strong><span>התגובות והלייקים שלך יופיעו בחשבון הזה.</span></div>
    <button type="button" className="sod29-community-secondary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await signOut(); setStep("email"); } catch { setError("ההתנתקות נכשלה. נסו שוב."); } finally { setBusy(false); } }}>החלפת חשבון</button>
    {error ? <p role="alert">{error}</p> : null}
  </section>;

  return <section className="sod29-community-sign-in" aria-label="התחברות לקהילה">
    <div><h2>כניסה לקהילה</h2><p>התחברו כאן עם המייל של החשבון שלכם כדי להגיב ולתת לייקים בשם שלכם.</p></div>
    {step === "email" ? <form onSubmit={sendCode}>
      <label htmlFor="community-sign-in-email">כתובת מייל</label>
      <input id="community-sign-in-email" type="email" inputMode="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gmail.com" />
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "שולח קוד…" : "שלחו לי קוד כניסה"}</button>
    </form> : <form onSubmit={confirmCode}>
      <label htmlFor="community-sign-in-code">הקוד שנשלח ל־<b dir="ltr">{email.trim()}</b></label>
      <input id="community-sign-in-code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required minLength={6} maxLength={EMAIL_OTP_MAX_LENGTH} value={code} onChange={(event) => setCode(sanitizeEmailOtp(event.target.value))} placeholder="קוד כניסה" />
      <button type="submit" className="sod29-community-primary" disabled={busy}>{busy ? "מאמת…" : "כניסה לקהילה"}</button>
      <button type="button" className="sod29-community-sign-in-back" disabled={busy} onClick={() => { setStep("email"); setCode(""); setError(""); }}>שינוי כתובת המייל</button>
    </form>}
    {error ? <p className="sod29-community-sign-in-error" role="alert">{error}</p> : null}
  </section>;
}

export default function CommunityLive2029() {
  const palette = use2029Palette();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const memberId = params.get("member") || "";
  const cardId = memberId ? "" : params.get("memberCard") || "";
  const selectedAuthorId = memberId || cardId;
  const [rows, setRows] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(COMMUNITY_ARCHIVE_TOTAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileRows, setProfileRows] = useState([]);
  const [profileNextOffset, setProfileNextOffset] = useState(0);
  const [profileCount, setProfileCount] = useState(0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [accountProfiles, setAccountProfiles] = useState({});
  const composerRef = useRef(null);
  const cardCloseRef = useRef(null);

  const loadPage = useCallback(async (offset = 0, replace = false) => {
    setLoading(true); setError("");
    try {
      const page = await fetchCommunityArchivePage({ offset, limit: COMMUNITY_PAGE_SIZE });
      setRows((current) => replace ? page.rows : [...current, ...page.rows]);
      setNextOffset(page.nextOffset);
      if (page.count != null) setTotal(page.count);
    } catch {
      setError("לא הצלחנו לטעון את השיחות כרגע.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPage(0, true); }, [loadPage]);
  useEffect(() => { applySeo({ title: "הקהילה — סוד 1820", description: "שיחות הקהילה והארכיון במקום אחד.", path: "/2029?preview=community&data=live", noindex: true }); }, []);
  useEffect(() => { let active = true; fetchLinkedAccountProfiles().then((accounts) => { if (active) setAccountProfiles(accounts); }).catch(() => {}); return () => { active = false; }; }, []);

  useEffect(() => {
    setProfileRows([]); setProfileNextOffset(0); setProfileCount(0); setProfileError("");
    if (!selectedAuthorId) { setProfileLoading(false); return; }
    let active = true;
    setProfileLoading(true);
    fetchCommunityAuthorPage(selectedAuthorId, { limit: memberId ? COMMUNITY_PAGE_SIZE : 4 }).then((page) => {
      if (active) { setProfileRows(page.rows); setProfileCount(page.count); setProfileNextOffset(page.nextOffset); }
    }).catch(() => { if (active) setProfileError("לא הצלחנו לטעון את עמוד הכותב."); })
      .finally(() => { if (active) setProfileLoading(false); });
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
    return needle ? rows.filter((row) => `${row.authorName} ${row.body}`.toLocaleLowerCase("he").includes(needle)) : rows;
  }, [query, rows]);
  const baseline = VERIFIED_ARCHIVE_PROFILES[selectedAuthorId];
  const linkedAccount = baseline?.accountUserId ? accountProfiles[baseline.accountUserId] : null;
  const memberName = linkedAccount?.display_name || linkedAccount?.username || baseline?.name || profileRows[0]?.authorName || "חבר הקהילה";
  const isOwner = Boolean(user?.id && (baseline?.accountUserId === user.id || selectedAuthorId === `user:${user.id}`));

  const closeProfile = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("member"); return next; });
  const closeCard = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("memberCard"); return next; });
  const openFullProfile = () => setParams((current) => { const next = new URLSearchParams(current); next.set("member", selectedAuthorId); next.delete("memberCard"); return next; });
  const startReply = (row) => { setReplyTo(row); requestAnimationFrame(() => composerRef.current?.focus()); };
  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setNotice("");
    try {
      await publishCommunityMessage({ body, parentId: replyTo?.id || null, authorName: profile?.display_name || profile?.username || null });
      setDraft(""); setReplyTo(null); setNotice(user ? "ההודעה פורסמה." : "ההודעה נשלחה לבדיקה.");
      await loadPage(0, true);
    } catch { setNotice("השליחה לא הצליחה. אפשר להתחבר ולנסות שוב."); }
    finally { setSending(false); }
  };

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="תצוגה מחוברת" symbol="◎">
    <main className="sod29-community" data-community-mode="connected-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }}>
      <div className="sod29-community-preview-notice" role="note"><strong>תצוגה מחוברת</strong><span>הודעות ולייקים מגיעים מהמערכת הקיימת. הדף עדיין לא החליף את הצ׳אט הישן.</span></div>
      <header className="sod29-community-intro"><div><h1>הקהילה</h1><p>השיחות שלנו, במקום אחד.</p></div></header>
      {memberId ? <section className="sod29-community-profile" aria-label={`הפרופיל של ${memberName}`}>
        <button type="button" className="sod29-community-text-action" onClick={closeProfile}>→ חזרה לשיחות</button>
        <header className="sod29-community-profile-hero"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{baseline?.name && baseline.name !== memberName ? <p>הודעות עבר בשם {baseline.name}</p> : null}{baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
        {isOwner ? <Link className="sod29-community-secondary sod29-community-edit-profile" to="/profile">עריכת הפרופיל שלי</Link> : null}
        {baseline?.isPrivate ? <p className="sod29-community-profile-note">פרטי הפרופיל פרטיים. הודעות שפורסמו בעבר נשארות ציבוריות.</p> : null}
        <h3>פוסטים ({profileCount.toLocaleString("he-IL")})</h3>{profileError ? <p role="alert">{profileError}</p> : null}<div className="sod29-community-feed">{profileRows.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={accountProfiles} onReply={(item) => { closeProfile(); startReply(item); }} />)}</div>{profileLoading ? <p className="sod29-community-end">טוען פוסטים…</p> : null}{!profileRows.length && !profileLoading && !profileError ? <p className="sod29-community-end">אין פוסטים ציבוריים לכותב זה.</p> : null}{profileNextOffset < profileCount ? <button className="sod29-community-load" type="button" disabled={profileLoading} onClick={async () => { setProfileLoading(true); try { const page = await fetchCommunityAuthorPage(memberId, { offset: profileNextOffset }); setProfileRows((current) => [...current, ...page.rows]); setProfileNextOffset(page.nextOffset); } catch { setProfileError("טעינת פוסטים נוספים נכשלה."); } finally { setProfileLoading(false); } }}>עוד פוסטים</button> : null}
      </section> : <div className="sod29-community-layout"><section className="sod29-community-main" aria-label="מרחב הקהילה">
        <CommunitySignIn />
        <section className="sod29-community-composer" aria-label="כתיבת הודעה">
          <label htmlFor="community-live-draft">מה תרצו לשתף?</label>
          {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{replyTo.authorName}</span><button type="button" onClick={() => setReplyTo(null)}>ביטול תשובה</button></div> : null}
          <textarea ref={composerRef} id="community-live-draft" rows={2} maxLength={1500} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="הוסף תגובה…" />
          <CommunityMessageContent text={draft} previewsOnly />
          <div className="sod29-community-composer-bottom"><small>{draft.length}/1500</small><button type="button" className="sod29-community-primary" disabled={!draft.trim() || sending} onClick={submit}>{sending ? "שולח…" : "פרסום"}</button></div>
          {notice ? <p className="sod29-community-status" role="status">{notice}</p> : null}
        </section>
        <label className="sod29-community-search"><span className="sod29-community-sr-only">חיפוש בהודעות שנטענו</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש בשיחות שנטענו" /></label>
        <div className="sod29-community-feed-label" role="status">{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות בארכיון · {total.toLocaleString("he-IL")} הודעות קהילה גלויות · נטענו {rows.length.toLocaleString("he-IL")}</div>
        {error ? <FrameState kind="error" title="טעינת השיחות נכשלה"><p>{error}</p><button type="button" className="sod29-community-secondary" onClick={() => loadPage(0, true)}>ניסיון נוסף</button></FrameState> : null}
        {!error && !loading && !filtered.length ? <FrameState kind="empty" title="לא נמצאו הודעות"><p>אפשר לחפש מילה אחרת.</p></FrameState> : null}
        <div className="sod29-community-feed">{filtered.map((row) => <LiveMessage key={row.id} row={row} accountProfiles={accountProfiles} onReply={startReply} />)}</div>
        {nextOffset < total ? <button className="sod29-community-load" type="button" disabled={loading} onClick={() => loadPage(nextOffset, false)}>{loading ? "טוען…" : "עוד הודעות"} <span aria-hidden="true">↓</span></button> : <p className="sod29-community-end">הגעתם לסוף הארכיון.</p>}
      </section><aside className="sod29-community-aside" aria-label="על הקהילה"><section className="sod29-community-side-card"><h2>הארכיון מחובר</h2><p>{COMMUNITY_ARCHIVE_TOTAL.toLocaleString("he-IL")} רשומות נשמרו; {total.toLocaleString("he-IL")} הודעות גלויות בפיד הקהילה. הכפתור ״עוד הודעות״ טוען אותן בהדרגה.</p></section><section className="sod29-community-side-card"><h2>שיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>שומרים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section></aside></div>}
      {cardId ? <div className="sod29-community-card-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="sod29-community-card" role="dialog" aria-modal="true" aria-label={`הודעות של ${memberName}`}>
          <button ref={cardCloseRef} type="button" className="sod29-community-card-close" onClick={closeCard} aria-label="סגירת כרטיס הכותב">×</button>
          <header className="sod29-community-card-header"><UserBadge avatarOnly name={memberName} avatarUrl={linkedAccount?.avatar_url || profileRows[0]?.avatarUrl} avatarClassName="sod29-community-avatar" /><h2>{memberName}</h2>{baseline?.handle ? <p dir="ltr">@{baseline.handle}</p> : null}{baseline?.likesLabel ? <strong>👍 התקבלו {baseline.likesLabel} לייקים</strong> : null}</header>
          {baseline?.isPrivate ? <p className="sod29-community-card-note">פרטי הפרופיל פרטיים; ההודעות שכבר פורסמו ציבוריות.</p> : null}
          <div className="sod29-community-card-section"><h3>ההודעות של {memberName}</h3>{!profileLoading && !profileError ? <span>{profileCount.toLocaleString("he-IL")} הודעות</span> : null}</div>
          {profileLoading ? <p className="sod29-community-card-note" role="status">טוען הודעות…</p> : null}
          {profileError ? <p className="sod29-community-card-note" role="alert">{profileError}</p> : null}
          <div className="sod29-community-card-messages">{profileRows.slice(0, 3).map((row) => <article key={row.id}><time dateTime={row.createdAt}>{dateFormat.format(new Date(row.createdAt))}</time><p dir="auto">{row.body}</p><div>{legacyLikeCount(row.reactions) > 0 ? <span>👍 {legacyLikeCount(row.reactions)}</span> : null}{row.parentId ? <span>תגובה בצ׳אט</span> : null}</div></article>)}</div>
          {!profileLoading && !profileRows.length && !profileError ? <p className="sod29-community-card-note">אין הודעות ציבוריות לכותב זה.</p> : null}
          <button type="button" className="sod29-community-card-full" onClick={openFullProfile}>לעמוד הכותב המלא ←</button>
        </section>
      </div> : null}
    </main>
  </Sod2029Shell>;
}
