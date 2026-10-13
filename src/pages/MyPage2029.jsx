import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import ProfileSettings from "../components/ProfileSettings.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { use2029Palette } from "../lib/palette.js";
import { getMyProfile } from "../lib/commandCenter.js";
import { getMyNotifications, topicLabel } from "../lib/notifications.js";
import { getNotificationPrefs } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { activitySourceLabel, fetchMyActivity2029, MY_ACTIVITY_PAGE_SIZE } from "../lib/userCenter/myActivity2029.js";
import "./myPage2029.css";

const dateFormat = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

function ActivityCard({ row }) {
  const body = String(row.title || row.body || "").trim();
  return <article className="sod29-my-page-item">
    <div className="sod29-my-page-item-meta"><span>{activitySourceLabel(row)}</span><span>{row.parent_id ? "תגובה" : row.intent || "הודעה"}</span><time dateTime={row.created_at}>{dateFormat.format(new Date(row.created_at))}</time></div>
    <p dir="auto">{body || "הודעה ללא טקסט"}</p>
    {row.title && row.body ? <p dir="auto">{row.body}</p> : null}
    {row.status === "pending" ? <small>ממתין לאישור · אינו מופיע בפרופיל הציבורי</small> : null}
  </article>;
}

export default function MyPage2029() {
  const { user, profile, loading: authLoading } = useAuth();
  const research = useResearch();
  const palette = use2029Palette();
  const [filter, setFilter] = useState("all");
  const [state, setState] = useState({ rows: [], count: 0, nextOffset: 0, loading: false, error: "" });
  const [personal, setPersonal] = useState({ stats: null, notifications: [], follows: [], loaded: false });

  useEffect(() => { applySeo({ title: "האזור האישי — סוד 1820", description: "הודעות ותרומות באתר ובקהילה.", path: "/2029/me", noindex: true }); }, []);
  useEffect(() => {
    if (!user?.id) { setState({ rows: [], count: 0, nextOffset: 0, loading: false, error: "" }); return; }
    let active = true;
    setState({ rows: [], count: 0, nextOffset: 0, loading: true, error: "" });
    fetchMyActivity2029(user.id, { filter }).then((page) => { if (active) setState({ ...page, loading: false, error: "" }); })
      .catch(() => { if (active) setState({ rows: [], count: 0, nextOffset: 0, loading: false, error: "טעינת הפעילות נכשלה." }); });
    return () => { active = false; };
  }, [user?.id, filter]);

  useEffect(() => {
    if (!user?.id) { setPersonal({ stats: null, notifications: [], follows: [], loaded: false }); return; }
    let active = true;
    Promise.allSettled([getMyProfile(), getMyNotifications(5), getNotificationPrefs({ userId: user.id })])
      .then(([stats, notifications, prefs]) => {
        if (!active) return;
        setPersonal({
          stats: stats.status === "fulfilled" ? stats.value : null,
          notifications: notifications.status === "fulfilled" ? notifications.value : [],
          follows: prefs.status === "fulfilled" && Array.isArray(prefs.value?.topics) ? prefs.value.topics : [],
          loaded: true,
        });
      });
    return () => { active = false; };
  }, [user?.id]);

  const loadMore = async () => {
    if (!user?.id || state.loading || state.nextOffset >= state.count) return;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const page = await fetchMyActivity2029(user.id, { offset: state.nextOffset, limit: MY_ACTIVITY_PAGE_SIZE, filter });
      setState((current) => ({ ...current, rows: [...current.rows, ...page.rows], count: page.count, nextOffset: page.nextOffset, loading: false }));
    } catch { setState((current) => ({ ...current, loading: false, error: "טעינת פריטים נוספים נכשלה." })); }
  };

  const name = profile?.display_name || profile?.username || user?.user_metadata?.full_name || "פרופיל";
  const avatar = profile?.avatar_url;
  const saved = Array.isArray(research.saved) ? research.saved : [];
  const activeResearch = Array.isArray(research.cart) ? research.cart : [];
  const collections = Array.isArray(research.collections) ? research.collections : [];
  const editorTheme = { fieldBg: palette.cardSoft, ink: palette.ink, line: palette.border, sub: palette.inkSoft, acc: palette.accentText, btnBg: palette.accent, btnText: palette.onAccent, danger: palette.dangerText };

  return <Sod2029Shell surface="home" title="האזור האישי" introVariant="none" symbol="◎">
    <main className="sod29-my-page" dir="rtl">
      <Link className="sod29-my-page-back" to="/2029">→ חזרה ל־2029</Link>
      <header className="sod29-my-page-hero">
        {avatar ? <img src={avatar} alt="" className="sod29-my-page-avatar" /> : <span className="sod29-my-page-avatar" aria-hidden="true">{name.charAt(0)}</span>}
        <div><span className="sod29-kicker">האזור האישי</span><h1>{name}</h1><p>הודעות, תרומות ופעילות קהילתית</p></div>
      </header>
      {authLoading ? <p role="status">בודק התחברות…</p> : !user ? <section className="sod29-my-page-state"><h2>הפרופיל זמין לאחר התחברות</h2><p>הפעילות מוצגת לפי זהות החשבון המחובר.</p><Link to="/2029">פתיחת אזור ההתחברות</Link></section> : <>
        <nav className="sod29-my-page-jump" aria-label="חלקי הדף"><a href="#activity">התרומות שלי</a><a href="#research">המחקר שלי</a><a href="#updates">התראות</a><a href="#account">החשבון שלי</a></nav>
        <section className="sod29-my-page-overview" aria-label="תמונת מצב">
          <div><strong>{state.count.toLocaleString("he-IL")}</strong><span>פריטים בסינון הפעיל</span></div>
          <div><strong>{saved.length}</strong><span>שמורים</span></div>
          <div><strong>{activeResearch.length}</strong><span>במחקר עכשיו</span></div>
          {personal.stats?.credits != null ? <div><strong>{personal.stats.credits}</strong><span>קרדיטים</span></div> : null}
        </section>
        <p className="sod29-my-page-note">התרומות וההודעות שכבר פורסמו ציבוריות. האזור הזה מרכז גם שמורים, התראות והגדרות שרק בעל החשבון רואה. בחירות פרטיות לפעילות חדשה יחולו מכאן והלאה.</p>
        <section id="activity" className="sod29-my-page-section" aria-labelledby="my-activity-title"><div className="sod29-my-page-section-heading"><span className="sod29-kicker">פעילות שפורסמה</span><h2 id="my-activity-title">התרומות שלי</h2><p>הודעות צ׳אט, תגובות ותרומות שמשויכות לפרופיל.</p></div>
        <nav className="sod29-my-page-tabs" aria-label="סינון הפעילות">
          {[["all", "הכול"], ["chat", "הצ׳אט"], ["contribution", "תרומות ותגובות"]].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
        </nav>
        <div className="sod29-my-page-count" role="status">{state.loading && !state.rows.length ? "טוען פעילות…" : `${state.count.toLocaleString("he-IL")} פריטים בסינון · ${state.rows.length.toLocaleString("he-IL")} נטענו`}</div>
        {state.error ? <p className="sod29-my-page-error" role="alert">{state.error}</p> : null}
        <div className="sod29-my-page-list">{state.rows.map((row) => <ActivityCard key={row.id} row={row} />)}</div>
        {!state.loading && !state.error && !state.rows.length ? <p className="sod29-my-page-empty">עדיין אין פריטים בסינון הזה.</p> : null}
        {state.nextOffset < state.count ? <button className="sod29-my-page-more" type="button" disabled={state.loading} onClick={loadMore}>{state.loading ? "טוען…" : "עוד פעילות"}</button> : null}
        </section>
        <section id="research" className="sod29-my-page-section" aria-labelledby="my-research-title"><div className="sod29-my-page-section-heading"><h2 id="my-research-title">המחקר שלי</h2><p>{research.syncStatus === "synced" ? "המחקר מסונכרן לחשבון." : "חלק מהמחקר שמור כרגע במכשיר הנוכחי."}</p></div>
          <div className="sod29-my-page-resource-grid">
            <div><strong>שמורים · {saved.length}</strong>{saved.length ? <ul>{saved.slice(0, 8).map((item, index) => <li key={item.id || index}>{item.title || item.label || item.id}</li>)}</ul> : <p>עדיין אין פריטים שמורים.</p>}</div>
            <div><strong>במחקר עכשיו · {activeResearch.length}</strong>{activeResearch.length ? <ul>{activeResearch.slice(0, 8).map((item, index) => <li key={item.id || index}>{item.title || item.label || item.id}</li>)}</ul> : <p>אין מחקר פעיל כרגע.</p>}</div>
            <div><strong>אוספים · {collections.length}</strong>{collections.length ? <ul>{collections.slice(0, 8).map((item, index) => <li key={item.id || index}>{item.name || item.title || "אוסף"}</li>)}</ul> : <p>עדיין אין אוספים.</p>}</div>
          </div>
        </section>
        <section id="updates" className="sod29-my-page-section" aria-labelledby="my-updates-title"><div className="sod29-my-page-section-heading"><h2 id="my-updates-title">התראות</h2></div>
          <div className="sod29-my-page-resource-grid"><div><strong>התראות אחרונות</strong>{personal.notifications.length ? <ul>{personal.notifications.map((item) => <li key={item.id}>{item.title || item.body || "עדכון"}</li>)}</ul> : <p>{personal.loaded ? "אין התראות חדשות." : "טוען עדכונים…"}</p>}</div><div><strong>נושאים במעקב</strong>{personal.follows.length ? <ul>{personal.follows.map((topic) => <li key={topic}>{topicLabel(topic)?.label || topic}</li>)}</ul> : <p>{personal.loaded ? "אין נושאים במעקב." : "טוען מעקבים…"}</p>}</div></div>
        </section>
        <section id="account" className="sod29-my-page-section" aria-labelledby="my-account-title"><div className="sod29-my-page-section-heading"><h2 id="my-account-title">החשבון שלי</h2><p>עריכת שם ותמונה דרך מנגנון הפרופיל הקיים.</p></div><div className="sod29-my-page-settings"><ProfileSettings t={editorTheme} showSignOut /></div></section>
        <section className="sod29-my-page-section" aria-labelledby="my-explore-title"><div className="sod29-my-page-section-heading"><h2 id="my-explore-title">הדברים שלי</h2></div><div className="sod29-my-page-links"><Link to="/2029/journey">מסע החיים שלי ←</Link><Link to="/els?library=mine">הצפנים שלי ←</Link><Link to="/world">המחקר שלי ←</Link></div></section>
      </>}
    </main>
  </Sod2029Shell>;
}
