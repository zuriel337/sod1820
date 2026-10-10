import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { PREVIEW_PEOPLE, PREVIEW_THREADS } from "../components/community2029/communityPreviewData.js";
import { applySeo } from "../lib/seo.js";
import { use2029Palette } from "../lib/palette.js";
import ReactionBar from "../components/ReactionBar.jsx";
import CommunityMessageContent from "../components/community2029/CommunityMessageContent.jsx";
import "./community2029.css";

const personById = new Map(PREVIEW_PEOPLE.map((person) => [person.id, person]));
const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" });
const PAGE_SIZE = 4;

function Author({ id, date }) {
  const person = personById.get(id);
  const [params] = useSearchParams();
  const target = new URLSearchParams(params);
  target.set("member", id);
  return <div className="sod29-community-author">
    <Link to={`?${target}`} className="sod29-community-author-link" data-community-author={id} aria-label={`פתיחת העמוד של ${person?.name || "חבר הקהילה"}`}>
      <span className="sod29-community-avatar" aria-hidden="true">{person?.initial || "?"}</span><strong>{person?.name || "חבר הקהילה"}</strong>
    </Link>{date ? <time dateTime={date}>{dateFormat.format(new Date(date))}</time> : null}
  </div>;
}

function PreviewLike({ message, liked, onLike }) {
  return <ReactionBar preview={{ count: Number.isFinite(message.likes) ? message.likes + (liked.has(message.id) ? 1 : 0) : null, selected: liked.has(message.id), onToggle: () => onLike(message.id) }} />;
}

function Thread({ thread, onReply, expanded, onExpand, liked, onLike }) {
  const repliesId = `${thread.id}-replies`;
  return <article id={thread.id} className="sod29-community-thread" tabIndex={-1} aria-label={`שיחה של ${personById.get(thread.authorId)?.name}`}>
    <Author id={thread.authorId} date={thread.createdAt} />
    <CommunityMessageContent text={thread.body} />
    <div className="sod29-community-thread-actions">
      <PreviewLike message={thread} liked={liked} onLike={onLike} />
      {thread.replies.length ? <button type="button" onClick={onExpand} aria-expanded={expanded} aria-controls={repliesId}>
        <span aria-hidden="true">↳</span> {expanded ? "סגירת תגובות" : `${thread.replies.length} תגובות`}
      </button> : <span className="sod29-community-no-replies">השיחה פתוחה</span>}
      <button type="button" className="sod29-community-reply-action" onClick={() => onReply(thread)} aria-label={`כתיבת תשובה לדוגמה לשיחה של ${personById.get(thread.authorId)?.name}`}>להשיב <span aria-hidden="true">←</span></button>
    </div>
    {thread.replies.length ? <div id={repliesId} hidden={!expanded} className="sod29-community-replies">
      {thread.replies.map((reply) => {
        const parent = thread.replies.find((item) => item.id === reply.replyTo);
        return <div key={reply.id} className="sod29-community-reply">
          <Author id={reply.authorId} date={reply.createdAt} />
          {parent ? <small className="sod29-community-reply-context">בתשובה ל{personById.get(parent.authorId)?.name}</small> : null}
          <CommunityMessageContent text={reply.body} />
          <div className="sod29-community-thread-actions"><PreviewLike message={reply} liked={liked} onLike={onLike} /><button type="button" onClick={() => onReply(reply)}>להשיב ל{personById.get(reply.authorId)?.name}</button></div>
        </div>;
      })}
    </div> : null}
  </article>;
}

export default function Community2029Page() {
  const palette = use2029Palette();
  const [params, setParams] = useSearchParams();
  const memberId = params.get("member");
  const member = personById.get(memberId);
  const [liked, setLiked] = useState(new Set());
  const [view, setView] = useState("conversations");
  const [query, setQuery] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [order, setOrder] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState(new Set());
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const composerRef = useRef(null);
  const profileTitleRef = useRef(null);
  const returnPosition = useRef(null);
  const pendingThread = useRef(null);

  useEffect(() => {
    if (memberId) {
      profileTitleRef.current?.focus();
      profileTitleRef.current?.scrollIntoView({ block: "start" });
    } else if (pendingThread.current) {
      const node = document.getElementById(pendingThread.current);
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({ block: "center" });
      pendingThread.current = null;
    } else if (returnPosition.current) {
      const { top, personId } = returnPosition.current;
      document.querySelector(`[data-community-author="${personId}"]`)?.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: "instant" });
      returnPosition.current = null;
    }
  }, [memberId]);

  useEffect(() => {
    applySeo({ title: "הקהילה — תצוגת עיצוב", description: "תצוגת עיצוב של דף הקהילה, עם תוכן דוגמה בלבד.", path: "/2029?preview=community", noindex: true });
  }, []);

  const threads = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    return PREVIEW_THREADS.filter((thread) => {
      const messages = [thread, ...thread.replies];
      const authorMatches = !authorId || messages.some((message) => message.authorId === authorId);
      const textMatches = !needle || messages.some((message) => `${message.body} ${personById.get(message.authorId)?.name || ""}`.toLocaleLowerCase("he").includes(needle));
      return authorMatches && textMatches;
    }).sort((a, b) => order === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }, [query, authorId, order]);

  const focusComposer = (thread = null) => {
    setView("conversations");
    setReplyTo(thread);
    setShowDraft(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  };
  const resetFilters = () => { setQuery(""); setAuthorId(""); setVisibleCount(PAGE_SIZE); };
  const openPersonMessages = (id) => { setAuthorId(id); setQuery(""); setView("conversations"); setVisibleCount(PAGE_SIZE); };
  const closeProfile = () => setParams((current) => { const next = new URLSearchParams(current); next.delete("member"); return next; });
  const toggleLike = (id) => setLiked((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const showThread = (id) => {
    resetFilters(); setView("conversations"); setVisibleCount(PREVIEW_THREADS.length);
    setExpanded((current) => new Set([...current, id]));
    pendingThread.current = id;
    closeProfile();
  };
  const profileMessages = member ? PREVIEW_THREADS.flatMap((thread) => [thread, ...thread.replies].filter((message) => message.authorId === member.id).map((message) => ({ ...message, threadId: thread.id }))) : [];

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="תצוגת עיצוב" symbol="◎">
    <div className="sod29-community" data-community-mode="design-preview" dir="rtl" style={{ "--community-input": palette.mode === "dark" ? `color-mix(in srgb, ${palette.cardRaised} 82%, ${palette.ink})` : palette.cardRaised }} onClickCapture={(event) => {
      const link = event.target.closest?.("[data-community-author]");
      if (link && !memberId) returnPosition.current = { top: window.scrollY, personId: link.dataset.communityAuthor };
    }}>
      <div className="sod29-community-preview-notice" role="note">
        <strong>תצוגת עיצוב</strong><span>האנשים וההודעות כאן הם דוגמאות. אפשר לבדוק את הממשק; שום הודעה אינה מתפרסמת.</span>
      </div>
      <header className="sod29-community-intro">
        <div><h1>הקהילה</h1><p>השיחות שלנו, במקום אחד.</p></div>
      </header>

      {memberId ? <section className="sod29-community-profile" aria-label="עמוד כותב לדוגמה">
        <button type="button" className="sod29-community-text-action" onClick={closeProfile}>→ חזרה לשיחות</button>
        <header className="sod29-community-profile-heading"><span className="sod29-community-avatar" aria-hidden="true">{member?.initial || "?"}</span><div><h2 ref={profileTitleRef} tabIndex={-1}>{member?.name || "הכותב לא נמצא בדוגמאות"}</h2><p>{member?.note || "אפשר לחזור לרשימת השיחות ולבחור כותב אחר."}</p></div></header>
        <p className="sod29-community-profile-note">פרופיל לדוגמה · זה אינו חשבון אמיתי. עיצוב הפרופיל המלא עדיין בתהליך.</p>
        {member ? <><h3>ההודעות של {member.name}</h3><div className="sod29-community-feed">{profileMessages.map((message) => <article key={message.id} className="sod29-community-thread"><time dateTime={message.createdAt}>{dateFormat.format(new Date(message.createdAt))}</time><CommunityMessageContent text={message.body} /><div className="sod29-community-thread-actions"><PreviewLike message={message} liked={liked} onLike={toggleLike} /><button type="button" onClick={() => showThread(message.threadId)}>לשיחה המלאה ←</button></div></article>)}</div></> : null}
      </section> : <div className="sod29-community-layout">
        <section className="sod29-community-main" aria-label="מרחב הקהילה">
          <div className="sod29-community-view-switch" role="group" aria-label="תצוגת קהילה">
            <button type="button" aria-pressed={view === "conversations"} onClick={() => setView("conversations")}>השיחות</button>
            <button type="button" aria-pressed={view === "people"} onClick={() => setView("people")}><NavigationIcon2029 name="community" /> האנשים</button>
          </div>

          {view === "conversations" ? <>
            <section className="sod29-community-composer" aria-label="כתיבת הודעת דוגמה">
              <label htmlFor="community-draft">מה תרצו לשתף?</label>
              {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{personById.get(replyTo.authorId)?.name}</span><button type="button" onClick={() => { setReplyTo(null); setShowDraft(false); }}>ביטול תשובה</button></div> : null}
              <textarea ref={composerRef} id="community-draft" rows={3} maxLength={1500} value={draft} onChange={(event) => { setDraft(event.target.value); setShowDraft(false); }} placeholder="הצטרפו לשיחה… אפשר גם להדביק קישור לסרטון" aria-describedby="community-draft-note" />
              {!showDraft ? <CommunityMessageContent text={draft} previewsOnly /> : null}
              <div className="sod29-community-composer-bottom"><small id="community-draft-note">טיוטה בלבד · {draft.length}/1500</small><button type="button" className="sod29-community-primary" disabled={!draft.trim()} onClick={() => setShowDraft(true)}>תצוגה לפני שליחה</button></div>
              {showDraft ? <div className="sod29-community-draft-preview" role="status"><strong>כך ההודעה תיראה · לא נשלחה</strong>{replyTo ? <small>בתשובה ל{personById.get(replyTo.authorId)?.name}</small> : null}<CommunityMessageContent text={draft} /></div> : null}
            </section>

            <div className="sod29-community-filters">
              <label className="sod29-community-search"><NavigationIcon2029 name="search" /><span className="sod29-community-sr-only">חיפוש בהודעות הדוגמה</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="חיפוש בשיחות לדוגמה" /></label>
              <label className="sod29-community-sort"><span className="sod29-community-sr-only">סדר השיחות</span><select value={order} onChange={(event) => { setOrder(event.target.value); setVisibleCount(PAGE_SIZE); }}><option value="newest">החדשות קודם</option><option value="oldest">הוותיקות קודם</option></select></label>
            </div>
            {authorId ? <div className="sod29-community-filter-chip"><span>שיחות בהשתתפות {personById.get(authorId)?.name}</span><button type="button" onClick={resetFilters}>ניקוי הסינון</button></div> : null}
            <div className="sod29-community-feed-label" role="status">{threads.length} שיחות דוגמה{query ? " שמתאימות לחיפוש" : ""}</div>
            {!threads.length ? <FrameState kind="empty" title="לא נמצאו שיחות לדוגמה"><p>אפשר לחפש מילה אחרת או לחזור לכל השיחות.</p><button type="button" className="sod29-community-secondary" onClick={resetFilters}>לכל השיחות</button></FrameState> : null}
            <div className="sod29-community-feed">
              {threads.slice(0, visibleCount).map((thread) => <Thread key={thread.id} thread={thread} onReply={focusComposer} liked={liked} onLike={toggleLike} expanded={expanded.has(thread.id)} onExpand={() => setExpanded((current) => { const next = new Set(current); next.has(thread.id) ? next.delete(thread.id) : next.add(thread.id); return next; })} />)}
            </div>
            {visibleCount < threads.length ? <button className="sod29-community-load" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>עוד שיחות לדוגמה <span aria-hidden="true">↓</span></button> : threads.length ? <p className="sod29-community-end">הגעתם לסוף הדוגמאות. הארכיון יחובר בשלב הבא.</p> : null}
          </> : <section className="sod29-community-people" aria-label="אנשי קהילה לדוגמה">
            <div><h2>אנשי הקהילה</h2><p>לחיצה על שם או תמונה פותחת את עמוד הכותב לדוגמה.</p></div>
            {PREVIEW_PEOPLE.map((person) => <article key={person.id} className="sod29-community-person-card"><Author id={person.id} /><p>{person.note}</p><button type="button" className="sod29-community-secondary" onClick={() => openPersonMessages(person.id)}>השיחות של {person.name} <span aria-hidden="true">←</span></button></article>)}
          </section>}
        </section>

        <aside className="sod29-community-aside" aria-label="על הקהילה">
          <section className="sod29-community-side-card"><h2>אנשי הקהילה</h2>{PREVIEW_PEOPLE.map((person) => <Author key={person.id} id={person.id} />)}<button type="button" className="sod29-community-text-action" onClick={() => setView("people")}>לכל האנשים <span aria-hidden="true">←</span></button></section>
          <section className="sod29-community-side-card"><h2>מקום לשיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>משאירים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section>
          <p className="sod29-community-side-note">זהו שלב העיצוב. השיחות הקיימות נשמרות במקומן עד לחיבור הארכיון.</p>
        </aside>
      </div>}
    </div>
  </Sod2029Shell>;
}
