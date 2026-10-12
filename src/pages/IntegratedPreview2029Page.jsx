import React, { useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import { numberExpressionFocusHref } from "../lib/research/numberExpressionFocus.js";
import "./integratedPreview2029.css";

const evidence = [
  { label: "תיקון והסבר", file: "corrected-answer.png", description: "הפירוש המתוקן, הנימוק והתחולה נכנסים להקשר התשובה. התשובה כאן מדומה." },
  { label: "המשך בסשן חדש", file: "fresh-session-next-question.png", description: "פתיחה מחדש ממשיכה לשאלה הבאה מתוך המסלול שנבחר." },
  { label: "שמירה שלא הושלמה", file: "failed-save-reopens-question.png", description: "כשל בשמירה נשאר גלוי ואינו מקדם את השאלה." },
  { label: "חזרה לניסיון הקודם", file: "fresh-session-completes-pending-save.png", description: "אחרי רענון אפשר להשלים במפורש את הניסיון הקודם." },
];

export default function IntegratedPreview2029Page() {
  const [selected, setSelected] = useState(0);
  return <Sod2029Shell title="2029 · פריוויו משולב" surface="world" introVariant="compact" status="תצוגה לבדיקה" wide>
    <div className="integrated-preview" dir="rtl">
      <section className="integrated-preview__opening">
        <p className="integrated-preview__eyebrow">סיפור · חיבור · מקור · מסע</p>
        <h2>לגלות את החיבור. להמשיך ממנו.</h2>
        <p>התחילו בסיפור המטוס או היכנסו לעולם הרחב: סוד החשמל, הכותבים, הנושאים ותמונות המקור. בחרו חיבור והמשיכו ממנו.</p>
        <div className="integrated-preview__actions">
          <Link className="sod29-action primary" to="/2029">פתח את הבית <NavigationIcon2029 name="home" /></Link>
          <Link className="sod29-action" to="/world">היכנס לעולם הרחב <NavigationIcon2029 name="world" /></Link>
        </div>
        <p className="integrated-preview__notice">פריוויו לקריאה ולהתנסות. מסעות אורח ושמירת המשחק נשארים במכשיר; התחברות, שמירה בחשבון ו־AI חי אינם פעילים כאן.</p>
      </section>

      <section className="integrated-preview__connection" aria-label="עומק החיבור 787">
        <div><p className="integrated-preview__eyebrow">סיפור המטוס · קריאת צוריאל</p><h2>787 · השנה, החג וההודיה</h2></div>
        <p>לפי קריאת צוריאל, העומק נוצר מהמפגש בין השנה המסוימת, חג השמחה וסיפור ההצלה: הביטויים מאירים אותו מכמה רבדים.</p>
        <div className="integrated-preview__layers">
          <div><strong>תשפ״ז</strong><span>השנה · 787</span></div>
          <div><strong>ושמחת בחגך</strong><span>החג והשמחה · 787</span></div>
          <div><strong>מי שגמלך כל טוב הוא יגמלך כל טוב סלה</strong><span>נוסח ההודיה · 787</span></div>
        </div>
        <p className="integrated-preview__notice">הערכים בגימטריה רגילה. זו פרשנות מיוחסת; התאמת הברכה אינה מעידה שנאמרה בטיסה. בפוסט אפשר לפתוח את ההקשר והמקורות.</p>
        <Link className="sod29-action" to="/2029">לסיפור המטוס ולמקור</Link>
      </section>

      <section className="integrated-preview__doors" aria-label="כיווני המשך">
        <article><NavigationIcon2029 name="milui" size={36} /><h3>לתוך האותיות</h3><p>פתחו את מילוי ״משיח״ מ־878. התחילו מהביטוי והשיטה ובחרו לאן להמשיך.</p><Link className="sod29-action" to={numberExpressionFocusHref(878, { expression: "משיח", method: "מילוי" })}>פתח את המילוי של משיח</Link><small>דף המספר מחובר. המסע הערוך המלא של 878 עדיין בהמשך התוכנית.</small></article>
        <article><NavigationIcon2029 name="els" size={36} /><h3>דילוגי אותיות</h3><p>אותו מנוע חיפוש, מטריצה, ממצאים והעמקה, עם העיצוב והתיקונים שנמסרו.</p><Link className="sod29-action" to="/els">פתח ELS</Link><small>שמירה פרטית וציבורית אינה מופעלת בפריוויו הזה.</small></article>
        <article><NavigationIcon2029 name="kingdom" size={36} /><h3>ממלכת המספרים</h3><p>גלו, פתרו חידות וראו את המפה מתפתחת. מהחידה אפשר להמשיך לחקור את הביטוי.</p><Link className="sod29-action" to="/2029/kingdom">היכנס לממלכה</Link><small>התקדמות מקומית במשחק; מיקומו הקבוע באתר עדיין לבחירה.</small></article>
      </section>

      <section className="integrated-preview__learning" aria-label="ראיות פיילוט רזיאל">
        <p className="integrated-preview__eyebrow">רזיאל · פיילוט 787</p><h2>התיקון שלך ממשיך איתו</h2>
        <p>כך נבדקו תיקון הפירוש, השימוש בו בתשובה והמשך לשאלה הבאה. אלו צילומי הבדיקה עם נתונים ושירותים מדומים; החוויה החיה והשילוב בלוח 2029 עדיין דורשים השלמה.</p>
        <div className="integrated-preview__tabs" role="group" aria-label="שלבי בדיקת רזיאל">{evidence.map((item, index) => <button type="button" key={item.file} aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
        <p role="status">{evidence[selected].description}</p>
        <a href={`/preview-evidence/${evidence[selected].file}`} target="_blank" rel="noreferrer"><img loading="lazy" src={`/preview-evidence/${evidence[selected].file}`} alt={`צילום בדיקה מדומה: ${evidence[selected].label}`} /></a>
      </section>
    </div>
  </Sod2029Shell>;
}
