import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import ExternalVideoFacade2029 from "../components/experience2029/ExternalVideoFacade2029.jsx";
import CanonicalProgress from "../components/CanonicalProgress.jsx";
import { describeMessageLink } from "../lib/community/messageLinks.js";
import { publicPostHref } from "../lib/publicPostUrls.js";
import { applySeo } from "../lib/seo.js";
import { supabase } from "../lib/supabase.js";
import "./start2029.css";

// /start — "כאן מתחילים" (ZURIEL 25.11.2026): a public, indexable welcome page. Everything here is open without an account;
// the account is offered, never required. Existing parts only: the frame (Sod2029Shell), the one external-video player
// (ExternalVideoFacade2029: a thumbnail until the person asks, then the player), the existing category-video reader
// (get_category_videos, the source of the pinned code in the chat) and the existing /login (sign-in and free sign-up).
// Loaded with its route only; nothing here reaches the code every page loads.

// The flagship video (official YouTube title read 25.11.2026: "סוד ה' מספר הפלא 1820 God Secret"), the video of post /סוד-1820.
const FLAGSHIP = describeMessageLink("https://www.youtube.com/watch?v=DClJVGBMCs0");
const FLAGSHIP_POST = "/" + encodeURIComponent("סוד-1820");
const CATEGORY = "צפונות בתורה";

function readLatestCodes(limit = 3) {
  return supabase.rpc("get_category_videos", { p_category: CATEGORY, p_limit: 30 }).then(({ data, error }) => {
    if (error) throw error;
    // Only items that actually play (a YouTube id or a stored video file), the newest first, as the source returns them.
    return (Array.isArray(data) ? data : []).filter(v => v && (v.yt || v.video_url)).slice(0, limit);
  });
}

const dateLabel = value => {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? new Date(time).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";
};

function CodeVideo({ item }) {
  const title = String(item.title || "").replace(/<[^>]+>/g, "").trim();
  const href = item.slug ? publicPostHref({ slug: decodeURIComponent(item.slug) }) : null;
  const poster = item.poster_url || (item.yt ? `https://i.ytimg.com/vi/${item.yt}/hqdefault.jpg` : null);
  const date = dateLabel(item.uploaded_at);
  return <li className="start29-code">
    {item.yt ? <ExternalVideoFacade2029 link={describeMessageLink(`https://www.youtube.com/watch?v=${item.yt}`)} title={title} context={date} />
      : <figure className="start29-native-video">
        {/* preload="none": the stored file is not requested before the person presses play. */}
        <video controls preload="none" playsInline poster={poster || undefined} src={item.video_url} aria-label={title} />
        <figcaption><strong dir="auto">{title}</strong>{date ? <small>{date}</small> : null}</figcaption>
      </figure>}
    {href ? <Link className="start29-more" to={href}>לצופן המלא ולהסבר ←</Link> : null}
  </li>;
}

export default function Start2029Page() {
  const [codes, setCodes] = useState({ loading: true, items: [] });
  useEffect(() => {
    applySeo({ title: "כאן מתחילים", path: "/start",
      description: "מה זה סוד 1820? הסרטון שמסביר את הסוד, הצפנים האחרונים מצפונות בתורה וכניסה לבית המדרש. הכול פתוח לקריאה ולצפייה, בלי הרשמה." });
    let live = true;
    readLatestCodes().then(items => live && setCodes({ items }), () => live && setCodes({ failed: true, items: [] }));
    return () => { live = false; };
  }, []);

  return <Sod2029Shell surface="world" introVariant="compact" symbol={<NavigationIcon2029 name="door" />}
    eyebrow="כאן מתחילים" title="ברוכים הבאים ל־SOD1820"
    description="אתר מחקר פתוח על הקוד שבתורה, במספרים ובמציאות. כל התוכן פתוח לקריאה ולצפייה, בלי הרשמה.">
    <main className="start29" dir="rtl" data-experience-surface="start">
      <section className="start29-block start29-secret" aria-labelledby="start29-secret">
        <h2 id="start29-secret">הסוד של 1820</h2>
        <ExternalVideoFacade2029 link={FLAGSHIP} title="סוד ה׳ · מספר הפלא 1820" context="סרטון הדגל של האתר" className="start29-flagship" />
        <div className="start29-explain">
          <p>שם ה׳ המפורש (הוי״ה) מופיע בחמשת חומשי התורה <b>1820</b> פעמים, כפי שמוסבר בסרטון.</p>
          <p>והפלא: המשפט <q>מספר שמות יהוה בכל התורה</q> עולה בגימטריה רגילה בדיוק <b>1820</b>. התורה מספרת בעצמה כמה פעמים כתוב בה שם ה׳.</p>
          <p>אותו מספר חוזר גם ב<q>עטרת תפארתכם</q> וב<q>הקדוש ברוך הוא תורה ישראל אחד</q>. מכאן שמו של האתר: <b>סוד 1820</b>.</p>
          <p className="start29-links"><Link to="/number/1820">כל הרמזים של 1820</Link><Link to={FLAGSHIP_POST}>הפוסט המלא על הסוד</Link></p>
        </div>
      </section>

      <div className="start29-doors">
        <Link className="start29-door" to="/login">
          <NavigationIcon2029 name="personal" />
          <span><b>הרשמה חינם</b><small>לשמור חישובים וצפנים ולקבל עדכונים. לא נדרשת כדי לקרוא או לצפות.</small></span>
        </Link>
        <Link className="start29-door" to="/beit-midrash">
          <NavigationIcon2029 name="study" />
          <span><b>בית המדרש</b><small>ללמוד את שיטות הגימטריה צעד אחר צעד, עם דוגמאות.</small></span>
        </Link>
      </div>

      <section className="start29-block" aria-labelledby="start29-codes">
        <h2 id="start29-codes">הצפנים האחרונים · צפונות בתורה</h2>
        {codes.loading ? <CanonicalProgress compact title="טוען את הצפנים האחרונים" phase="קורא את שלושת הסרטונים האחרונים" /> : null}
        {codes.failed ? <p role="status">הצפנים אינם זמינים כרגע. <Link to="/codes">לספריית הצפנים</Link></p> : null}
        {codes.items.length ? <ol className="start29-codes">{codes.items.map(item => <CodeVideo key={item.slug || item.yt || item.video_url} item={item} />)}</ol> : null}
        <p className="start29-links"><Link to="/codes">לכל הצפנים</Link><Link to={"/category/" + encodeURIComponent(CATEGORY)}>לכל הפוסטים של צפונות בתורה</Link></p>
      </section>
    </main>
  </Sod2029Shell>;
}
