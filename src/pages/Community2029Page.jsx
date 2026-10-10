import React, { useEffect, useMemo, useRef, useState } from "react";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { PREVIEW_PEOPLE, PREVIEW_THREADS } from "../components/community2029/communityPreviewData.js";
import { applySeo } from "../lib/seo.js";
import "./community2029.css";

const personById = new Map(PREVIEW_PEOPLE.map((person) => [person.id, person]));
const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", timeZone: "UTC" });
const PAGE_SIZE = 4;

function Author({ id, date }) {
  const person = personById.get(id);
  return <div className="sod29-community-author">
    <span className="sod29-community-avatar" aria-hidden="true">{person?.initial || "?"}</span>
    <div><strong>{person?.name || "חבר הקהילה"}</strong>{date ? <time dateTime={date}>{dateFormat.format(new Date(date))}</time> : null}</div>
  </div>;
}

function Thread({ thread, onReply, expanded, onExpand }) {
  const repliesId = `${thread.id}-replies`;
  return <article className="sod29-community-thread" aria-label={`שיחה של ${personById.get(thread.authorId)?.name}`}>
    <Author id={thread.authorId} date={thread.createdAt} />
    <p className="sod29-community-body">{thread.body}</p>
    <div className="sod29-community-thread-actions">
      {thread.likes !== null ? <span className="sod29-community-likes" aria-label={`${thread.likes} לייקים בדוגמה`}><span aria-hidden="true">♡</span> {thread.likes}</span> : null}
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
          <p className="sod29-community-body">{reply.body}</p>
        </div>;
      })}
    </div> : null}
  </article>;
}

export default function Community2029Page() {
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

  return <Sod2029Shell surface="community" title="הקהילה" introVariant="none" status="תצוגת עיצוב" symbol="◎">
    <div className="sod29-community" data-community-mode="design-preview" dir="rtl">
      <div className="sod29-community-preview-notice" role="note">
        <strong>תצוגת עיצוב</strong><span>האנשים וההודעות כאן הם דוגמאות. אפשר לבדוק את הממשק; שום הודעה אינה מתפרסמת.</span>
      </div>
      <header className="sod29-community-intro">
        <div><span className="sod29-community-eyebrow">מקום לשיחה, לאנשים ולחיבורים</span><h1>טוב להיפגש כאן.</h1><p>שאלה קטנה, מחשבה חדשה או שיחה שרוצים להמשיך — יש להן מקום בקהילה.</p></div>
        <button type="button" className="sod29-community-primary" onClick={() => focusComposer()}>פתיחת שיחה <span aria-hidden="true">＋</span></button>
      </header>

      <div className="sod29-community-layout">
        <section className="sod29-community-main" aria-label="מרחב הקהילה">
          <div className="sod29-community-view-switch" role="group" aria-label="תצוגת קהילה">
            <button type="button" aria-pressed={view === "conversations"} onClick={() => setView("conversations")}>השיחות</button>
            <button type="button" aria-pressed={view === "people"} onClick={() => setView("people")}><NavigationIcon2029 name="community" /> האנשים</button>
          </div>

          {view === "conversations" ? <>
            <section className="sod29-community-composer" aria-label="כתיבת הודעת דוגמה">
              <label htmlFor="community-draft">מה תרצו לשתף?</label>
              {replyTo ? <div className="sod29-community-reply-target"><span>תשובה ל{personById.get(replyTo.authorId)?.name}</span><button type="button" onClick={() => { setReplyTo(null); setShowDraft(false); }}>ביטול תשובה</button></div> : null}
              <textarea ref={composerRef} id="community-draft" rows={3} maxLength={2000} value={draft} onChange={(event) => { setDraft(event.target.value); setShowDraft(false); }} placeholder="אפשר להתחיל בשאלה, מחשבה או פשוט לומר שלום…" aria-describedby="community-draft-note" />
              <div className="sod29-community-composer-bottom"><small id="community-draft-note">טיוטה לבדיקה בלבד · לא נשמרת</small><button type="button" className="sod29-community-primary" disabled={!draft.trim()} onClick={() => setShowDraft(true)}>תצוגה לפני שליחה</button></div>
              {showDraft ? <div className="sod29-community-draft-preview" role="status"><strong>כך ההודעה תיראה · לא נשלחה</strong>{replyTo ? <small>בתשובה ל{personById.get(replyTo.authorId)?.name}</small> : null}<p className="sod29-community-body">{draft}</p></div> : null}
            </section>

            <div className="sod29-community-filters">
              <label className="sod29-community-search"><NavigationIcon2029 name="search" /><span className="sod29-community-sr-only">חיפוש בהודעות הדוגמה</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="חיפוש בשיחות לדוגמה" /></label>
              <label className="sod29-community-sort"><span className="sod29-community-sr-only">סדר השיחות</span><select value={order} onChange={(event) => { setOrder(event.target.value); setVisibleCount(PAGE_SIZE); }}><option value="newest">החדשות קודם</option><option value="oldest">הוותיקות קודם</option></select></label>
            </div>
            {authorId ? <div className="sod29-community-filter-chip"><span>שיחות בהשתתפות {personById.get(authorId)?.name}</span><button type="button" onClick={resetFilters}>ניקוי הסינון</button></div> : null}
            <div className="sod29-community-feed-label" role="status">{threads.length} שיחות דוגמה{query ? " שמתאימות לחיפוש" : ""}</div>
            {!threads.length ? <FrameState kind="empty" title="לא נמצאו שיחות לדוגמה"><p>אפשר לחפש מילה אחרת או לחזור לכל השיחות.</p><button type="button" className="sod29-community-secondary" onClick={resetFilters}>לכל השיחות</button></FrameState> : null}
            <div className="sod29-community-feed">
              {threads.slice(0, visibleCount).map((thread) => <Thread key={thread.id} thread={thread} onReply={focusComposer} expanded={expanded.has(thread.id)} onExpand={() => setExpanded((current) => { const next = new Set(current); next.has(thread.id) ? next.delete(thread.id) : next.add(thread.id); return next; })} />)}
            </div>
            {visibleCount < threads.length ? <button className="sod29-community-load" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>עוד שיחות לדוגמה <span aria-hidden="true">↓</span></button> : threads.length ? <p className="sod29-community-end">הגעתם לסוף הדוגמאות. הארכיון יחובר בשלב הבא.</p> : null}
          </> : <section className="sod29-community-people" aria-label="אנשי קהילה לדוגמה">
            <div><h2>אנשים, לפני הכול.</h2><p>כרטיסים לדוגמה לבחינת הממשק. עמודי הפרופיל יעוצבו בהמשך.</p></div>
            {PREVIEW_PEOPLE.map((person) => <article key={person.id} className="sod29-community-person-card"><Author id={person.id} /><p>{person.note}</p><button type="button" className="sod29-community-secondary" onClick={() => openPersonMessages(person.id)}>השיחות של {person.name} <span aria-hidden="true">←</span></button></article>)}
          </section>}
        </section>

        <aside className="sod29-community-aside" aria-label="על הקהילה">
          <section className="sod29-community-side-card"><span className="sod29-community-side-symbol" aria-hidden="true"><NavigationIcon2029 name="community" /></span><h2>אותן שיחות.<br />עוד מקום להיפגש.</h2><p>מרחב לשאול, להקשיב ולהמשיך יחד. מאחורי כל הודעה יש אדם.</p><button type="button" className="sod29-community-text-action" onClick={() => setView("people")}>להכיר את האנשים <span aria-hidden="true">←</span></button></section>
          <section className="sod29-community-side-card"><h2>מקום לשיחה טובה</h2><ul><li>נותנים מקום לדעות שונות.</li><li>מצרפים מקור כשיש כזה.</li><li>משאירים פרטים אישיים מחוץ לשיחה ציבורית.</li></ul></section>
          <p className="sod29-community-side-note">זהו שלב העיצוב. השיחות הקיימות נשמרות במקומן עד לחיבור הארכיון.</p>
        </aside>
      </div>
    </div>
  </Sod2029Shell>;
}
