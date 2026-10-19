import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPostBySlug, supabase } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import {
  ALON_5119_SLUG, SHAUL_DAVID_REVIEW_IDS,
  buildAlon5119OneTreePilot,
} from "../lib/research/alon5119OneTreePilot2029.js";
import "./alon5119OneTreePilot2029.css";

const safeData = (result) => result.status === "fulfilled" && !result.value.error
  ? (result.value.data || []) : [];
const asDate = (value) => value ? String(value).slice(0, 10).split("-").reverse().join(".") : "לא ידוע";

export default function Alon5119OneTreePilot2029Page() {
  const [state, setState] = useState({ loading: true, model: null, error: null });
  const [activeId, setActiveId] = useState("goliath-georgia");
  useEffect(() => {
    applySeo({ title: "מה קורה הבורא · יחידות תוכן · Preview", description: "פיילוט מיפוי מקורות — לא לפרסום", path: "/preview/units/alon-5119", noindex: true });
    let live = true;
    (async () => {
      try {
        // Exact existing public Post reader first; never start from a private Graph/Research table.
        const post = await getPostBySlug(ALON_5119_SLUG);
        if (!post) {
          if (live) setState({ loading: false, model: null, error: "פרק המקור אינו זמין לקריאה." });
          return;
        }
        const results = await Promise.allSettled([
          supabase.from("video_media_placements_v1")
            .select("source_type,source_id,asset_key,video_kind,media_url,poster_url,speaker,series_keys,needs_review")
            .eq("source_type", "post").eq("source_id", "5119").limit(1),
          supabase.from("posts")
            .select("id,title,slug,tags,home_hidden")
            .in("id", SHAUL_DAVID_REVIEW_IDS).limit(SHAUL_DAVID_REVIEW_IDS.length),
          supabase.from("gematria_words")
            .select("phrase,ragil,is_verified,is_published")
            .eq("phrase", "דוד").eq("ragil", 14)
            .eq("is_verified", true).eq("is_published", true).limit(1),
        ]);
        const videoPlacement = safeData(results[0])[0] || null;
        const archivePosts = safeData(results[1]);
        const david14Row = safeData(results[2])[0] || null;
        const model = buildAlon5119OneTreePilot(post, { videoPlacement, archivePosts, david14Row });
        if (live) setState({
          loading: false, model,
          error: model.available ? null : "יחידות המקור אינן זמינות או אינן מתאימות לעדות הפיילוט.",
        });
      } catch {
        if (live) setState({ loading: false, model: null, error: "אירעה שגיאה בקריאת המקור. אין חיבורים משוערים." });
      }
    })();
    return () => { live = false; };
  }, []);

  const model = state.model;
  const selected = useMemo(() => (model?.events || []).find((event) => event.id === activeId)
    || model?.events?.[0] || null, [model, activeId]);
  if (state.loading) return <main className="a5119-root" dir="rtl" role="status">טוען את פרק המקור המאושר לקריאה…</main>;
  if (state.error) return <main className="a5119-root" dir="rtl">
    <p role="alert">{state.error}</p><Link to="/posts">חזרה לפוסטים</Link>
  </main>;

  return <main className="a5119-root" dir="rtl">
    <div className="a5119-shell">
      <header className="a5119-header">
        <div className="a5119-eyebrow"><span aria-hidden="true">✦</span> עץ אחד · פיילוט יחידות תוכן · Preview</div>
        <p className="a5119-series">מה קורה הבורא <span aria-hidden="true">/</span> אלון לוי</p>
        <h1>גוליית, נחלת בנימין וקריית גת</h1>
        <p className="a5119-subtitle">מתודעת שאול לתודעת דוד</p>
        <p className="a5119-lead">סרטון אחד. שלוש התרחשויות שונות. מקור מקראי אחד שדרכו אלון לוי מציע לקרוא את צירוף השמות — בלי להפוך אותו לקשר סיבתי בין האירועים.</p>
        <div className="a5119-facts">
          <span>יוצר: אלון לוי</span><span>פרסום הפוסט: {asDate(model.publishedAt)}</span>
          <span>3 אירועים במקור · {model.events.length} אותרו במלואם</span>
        </div>
      </header>

      <section className="a5119-opening" aria-label="מקור הסרטון">
        <div className="a5119-video">
          {model.sourceUnits.video
            ? <video controls playsInline preload="none" src={model.sourceUnits.video.videoUrl}
                poster={model.sourceUnits.video.posterUrl || undefined}
                aria-label="הסרטון המקורי של אלון לוי"/>
            : <div className="a5119-video-missing">
                <span aria-hidden="true">▶</span><p>הנגן אינו זמין בקורא הווידאו. המקור נשאר נגיש בפוסט.</p>
              </div>}
        </div>
        <div className="a5119-opening-copy">
          <span className="a5119-index">01 / מקור</span>
          <h2>הסרטון הוא המקור. לא האירוע.</h2>
          <p>לסרטון, לתמלול ולפרק יש זהות מקור אחת. הכתבות החדשותיות המתוארות בו שומרות על התאריכים והמיקומים שלהן בנפרד.</p>
          <p>המשמעות הרוחנית מיוחסת לדובר. עריכת המקור והתיעוד באתר מיוחסים בנפרד למערכת.</p>
          <div className="a5119-pills"><span>פרק בסדרה</span><span>וידאו · 4:52</span><span>תמלול במקור</span></div>
          <Link className="a5119-link" to={model.href}>לקריאת הפוסט והתמלול המקורי ←</Link>
        </div>
      </section>

      <section className="a5119-events" aria-label="אירועים נפרדים באותו מקור">
        <div className="a5119-section-header"><span className="a5119-index">02 / אירועים</span>
          <h2>שלוש התרחשויות. שלוש יחידות מקור.</h2>
          <p>בחר אירוע כדי לקרוא את המקור ואת ההשוואה הסמלית בנפרד.</p>
        </div>
        <div className="a5119-event-switch" role="group" aria-label="בחירת אירוע">
          {model.events.map((event, i) => <button key={event.id}
            type="button" className={event.id === selected?.id ? "is-active" : ""}
            aria-pressed={event.id === selected?.id} onClick={() => setActiveId(event.id)}>
            <span className="a5119-event-number">0{i + 1}</span>
            <span className="a5119-event-name">{event.name}</span>
            <span className="a5119-event-date">{asDate(event.occurredOn)}</span>
          </button>)}
        </div>
        {selected ? <div className="a5119-selected" key={selected.id}>
          <div className="a5119-selected-source">
            <span className="a5119-type">יחידת דיווח · מתוך פרק 5119</span>
            <h3>{selected.name}</h3>
            <p>{selected.witness.excerpt}</p>
            <p className="a5119-date-type">מועד האירוע לפי הדיווח בפוסט: {asDate(selected.occurredOn)} — אינו תאריך פרסום הפוסט.</p>
            <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="a5119-link">לידיעה שאליה מפנה הפוסט · {selected.sourceName} ↗</a>
          </div>
          <div className="a5119-selected-link">
            <span className="a5119-type">השוואה סמלית מפי אלון לוי</span>
            <h3>{selected.biblicalFocus}</h3>
            <p>{selected.linkExplanation}</p>
            <span className="a5119-caution">מועמד לקשר עריכתי · אינו קשת גרף מאושרת ואינו ראיה לסיבתיות.</span>
          </div>
        </div> : <p className="a5119-alert">מקור האירועים לא אותר בשלמותו. לא מוצגים קשרים משוערים.</p>}
      </section>

      <section className="a5119-constellation" aria-label="מסלול מקור עד פרשנות">
        <span className="a5119-index">03 / מפגש</span>
        <h2>כך היחידות נפגשות — בלי להתמזג</h2>
        <div className="a5119-path">
          <div className="a5119-path-events">
            {model.events.map((event) => <div key={event.id}>
              <small>{asDate(event.occurredOn)}</small><strong>{event.name}</strong>
            </div>)}
          </div>
          <div className="a5119-stem" aria-hidden="true">↓</div>
          <div className="a5119-bible"><small>תחנת הביניים, לא אירוע רביעי</small>
            <strong>שמואל א׳ י״ז · דוד מול גוליית</strong>
            <span>גוליית · גת · שאול מבנימין · דוד</span>
          </div>
          <div className="a5119-stem" aria-hidden="true">↓</div>
          <div className="a5119-interpretation">
            <small>פרשנות היוצר — לא תוצאת מנוע</small>
            <strong>״מתודעת שאול לתודעת דוד״</strong>
            <span>המפגש נוצר בפרשנות של אלון לוי. שלושת האירועים אינם ילדים זה של זה.</span>
          </div>
        </div>
        <div className="a5119-number">
          <span aria-hidden="true">◇</span><div><b>דוד = 14 ברגיל</b>
            <small>{model.numberUnit.publiclyVerified ? "חישוב מאומת ומפורסם במאגר; הקשר לשני תאריכי 14.10 עדיין הצעה" : "נדרש אימות ציבורי של שורת החישוב"}</small>
          </div>
        </div>
      </section>

      <section className="a5119-archive" aria-label="מקורות ארכיון לבדיקה">
        <div className="a5119-section-header"><span className="a5119-index">04 / העמקה</span>
          <h2>שאול ודוד בארכיון SOD1820</h2>
          <p>אלה מקורות נוספים שאותרו למיפוי. כל הצעה דורשת עוגן מדויק ואישור לפני שתהפוך לחיבור בגרף.</p>
        </div>
        {model.archiveCandidates.length ? <div className="a5119-archive-grid">
          {model.archiveCandidates.map((row) => <article key={row.postId}>
            <span className="a5119-type">מועמד לבדיקה · פוסט {row.postId}</span>
            <h3>{row.title}</h3><p>{row.reviewWhy}</p>
            <Link to={row.href}>פתח מקור היסטורי ←</Link>
          </article>)}
        </div> : <p className="a5119-alert">מקורות הארכיון לא זמינים כרגע לקורא. אין ליצור מהם קשרים ללא מקור.</p>}
      </section>

      <footer className="a5119-footer">
        <p><strong>עיקרון העץ האחד:</strong> המקורות והאירועים מופנים בזהויותיהם; אין כאן יצירת גרף, מנוע, חנות או אירועים חדשים במסד. זו תצוגת קבלה מבודדת, לא פרסום.</p>
        {!model.ready && <p role="status">מקטעי המקור לא עברו את כל הבדיקות; נא לא לאשר את הפיילוט.</p>}
        <Link to={model.href}>חזרה לפוסט המקורי ←</Link>
      </footer>
    </div>
  </main>;
}
