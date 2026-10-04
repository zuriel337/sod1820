import React from "react";
import { releaseRelations } from "../../lib/admin/releaseProjection.js";
import { formatTime, SourceStamp, SourceState } from "./AdminSource2029.jsx";
import "./adminOperations2029.css";

const short = value => value ? value.slice(0, 12) : "לא ידוע";
const environments = { production: "אתר חי", preview: "פריוויו פרטי", local: "בנייה מקומית", development: "פיתוח", unknown: "סביבה לא ידועה" };
const conclusions = { success: "עבר", failure: "נכשל", cancelled: "בוטל", skipped: "דולג", timed_out: "חרג מזמן", neutral: "ללא הכרעה", action_required: "נדרש טיפול", stale: "ישן" };
function EvidenceCard({ title, evidence, children }) {
  return <div className="sod29-card"><div className="sod29-kicker">{title}</div>
    <h3><bdi>{evidence?.status === "ready" ? short(evidence.data?.sha) : "לא ידוע"}</bdi></h3>
    {children}<p className="sod29-muted">{evidence?.source || "מקור לא ידוע"} · נקרא: {formatTime(evidence?.observed_at)}</p>
    {evidence?.status !== "ready" ? <small>{evidence?.error || "טרם נקרא"}</small> : null}</div>;
}

export default function AdminRelease2029({ source, worklogSource, clientBuild, onRefresh }) {
  const data = source?.status === "ready" || source?.status === "loading" ? source.data : null;
  const relations = releaseRelations(clientBuild, data);
  const canary = data?.canary?.status === "ready" ? data.canary.data : null;
  const canaryOld = canary?.checked_at && Date.now() - Date.parse(canary.checked_at) > 8 * 3600000;
  const checks = data?.checks?.status === "ready" ? data.checks.data?.checks || [] : null;
  return <>
    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">גרסאות ועדכונים</div><h2>מה פתוח כאן, מה פורסם ומה אומת</h2>
        <p className="sod29-muted">מרכז הניהול נבנה עם האתר. פריוויו מתעדכן עם הענף שלו; פרסום גרסה ראשית כולל גם את הלוח כשהשינוי מוזג אליה.</p></div>
        <button className="sod29-action" type="button" onClick={onRefresh} disabled={source?.status === "loading"}>רענן מקורות גרסה</button></div>
      <SourceState source={source} name="release" onRetry={onRefresh} />
      <div className="sod29-grid">
        <div className="sod29-card"><div className="sod29-kicker">הגרסה הפתוחה בדפדפן</div><h3><bdi>{short(clientBuild.sha)}</bdi></h3>
          <p>{environments[clientBuild.environment]} · <bdi>{clientBuild.branch || "ענף לא ידוע"}</bdi></p>
          <small>זהות מוטבעת בבנייה · {formatTime(clientBuild.builtAt)}</small></div>
        <div className="sod29-card"><div className="sod29-kicker">הגרסה מהשרת בכתובת הזו</div><h3><bdi>{short(data?.identity?.sha)}</bdi></h3>
          <p>{environments[data?.identity?.environment || "unknown"]}</p><small>מטא־נתוני הפריסה · נקרא: {formatTime(data?.generated_at)}</small></div>
        <EvidenceCard title="הגרסה הראשית ב־GitHub" evidence={data?.main}><p className="sod29-muted">גרסת קוד ראשית; אינה הוכחת פרסום.</p></EvidenceCard>
        <EvidenceCard title="הגרסה המוצבת באתר החי" evidence={data?.live}><p className="sod29-muted">נקראת משיוך הדומיין החי לפריסה ב־Vercel.</p></EvidenceCard>
      </div>
      <div className="sod29-admin-alert" role="status">
        {relations.browserServer === "different" ? "זמינה גרסה אחרת מהשרת. רענן את הדף כדי לטעון אותה." : relations.browserServer === "same" ? "הדפדפן והשרת מציגים את אותה גרסת קוד." : "התאמת גרסת הדפדפן לשרת עדיין לא ידועה."}
        <br />{relations.mainLive === "same" ? "גרסת main תואמת לגרסה המוצבת באתר החי." : relations.mainLive === "different" ? "main והאתר החי מציגים גרסאות שונות. אין כאן הסקה איזו מהן חדשה יותר." : "ההתאמה בין main לאתר החי עדיין לא ידועה."}
        <br />{relations.serverLive === "different" ? "המסך הזה והאתר החי מציגים גרסאות שונות." : relations.serverLive === "same" ? "המסך הזה מציג את גרסת הקוד של האתר החי." : "אין עדיין מקור שמאפשר להשוות את המסך הזה לאתר החי."}
      </div>
      <SourceStamp source={source} name="release" basis="OBSERVED" />
      <small className="sod29-muted">קריאות ספקים עשויות להשתמש בצילום מצב בן עד חמש דקות. המועד המקורי מוצג ואינו מתאפס בכל רענון.</small>
    </section>
    <section className="sod29-section"><h2>מה נבדק בפועל</h2>
      <div className="sod29-admin-alert"><strong>אימות האתר החי לגרסה המדויקת: </strong>
        {relations.liveVerification === "unknown" ? "לא ידוע" : conclusions[relations.liveVerification] || (relations.liveVerification === "pending" ? "ממתין" : "שגיאה")}
        <p className="sod29-muted">האימות הקיים: <bdi>sod1820/post-deploy-canary</bdi> · בוצע: {formatTime(canary?.checked_at)}{canaryOld ? " · האימות בן יותר משמונה שעות" : ""}</p>
        <small>פריסה מוכנה או בדיקות פריוויו שעברו אינן מחליפות אימות של האתר החי.</small></div>
      <h3>בדיקות לגרסת הקוד מהשרת</h3>
      {checks == null ? <p>{data?.checks?.error || "טרם נקרא מקור הבדיקות"}</p> : !checks.length ? <p>לא נמצאו בדיקות לגרסה הזו; אין כאן אישור תקינות.</p> :
        <div className="sod29-admin-items">{checks.map((check, index) => <div className="sod29-row" key={`${check.name}:${index}`}>
          <div><strong><bdi>{check.name}</bdi></strong><small>{formatTime(check.completed_at)}</small></div>
          <span className="sod29-chip">{check.status === "completed" ? conclusions[check.conclusion] || "תוצאה לא ידועה" : check.status === "in_progress" ? "רצה" : check.status === "queued" ? "בתור" : "לא ידוע"}</span>
        </div>)}</div>}
      {data?.checks?.data?.partial ? <p>מוצגת רשימה חלקית של הבדיקות.</p> : null}
    </section>
    <section className="sod29-section"><div className="sod29-section-head"><h2>עדכונים ביומן העבודה הקיים</h2><a className="sod29-action" href="/admin?tab=worklog">פתח יומן עבודה ←</a></div>
      <p className="sod29-muted">עד שמונה רשומות נוכחיות. סטטוס ביומן הוא דיווח עבודה, ואינו הוכחת פריסה או אימות.</p>
      <SourceState source={worklogSource} name="worklog" onRetry={onRefresh} />
      {worklogSource?.status === "ready" ? worklogSource.data.length ? <div className="sod29-admin-items">{worklogSource.data.map(row => <div className="sod29-row" key={row.id}>
        <div><strong>{row.topic || "עדכון ללא כותרת"}</strong><small>{formatTime(row.created_at)}</small></div><span className="sod29-chip">דווח: {row.status || "לא נמסר"}</span>
      </div>)}</div> : <p>המקור לא החזיר רשומות נוכחיות.</p> : null}
      <SourceStamp source={worklogSource} name="worklog" basis="OBSERVED" />
    </section>
  </>;
}
