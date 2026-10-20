import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPostBySlug, supabase } from "../../lib/supabase.js";
import { projectElections631Context, ELECTIONS_REVIEWED_PHRASES, ELECTIONS_SOURCE_SLUG } from "../../lib/research/contextualAxisPriority2029.js";
import ContextDepthMeter2029 from "./ContextDepthMeter2029.jsx";
import { METHODS } from "../../lib/gematria.js";
import "./elections631ContextPreview2029.css";

/**
 * Loaded only by explicit user action inside the EXISTING Companion/Context rail
 * and only on the already gated VITE_INTEGRATED_PREVIEW build.
 * No new store, per-card search, or second viewer identity.
 */
export default function Elections631ContextPreview2029() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, model: null, error: null });
  const [selectedValue, setSelectedValue] = useState(631);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!supabase) throw new Error("no_public_reader");
        const post = await getPostBySlug(ELECTIONS_SOURCE_SLUG);
        if (!post) throw new Error("post_unavailable");
        const { data, error } = await supabase.from("gematria_words")
          .select("phrase,ragil,is_verified,is_published")
          .in("phrase", ELECTIONS_REVIEWED_PHRASES)
          .eq("ragil", 631).eq("is_verified", true).eq("is_published", true)
          .limit(ELECTIONS_REVIEWED_PHRASES.length);
        if (error) throw error;
        const methods = new Map(METHODS.map((m) => [m.key, m.fn]));
        const verifyCalculation = (phrase, method, value) => {
          try { const calc = methods.get(method); return typeof calc === "function" && calc(phrase) === value; }
          catch { return false; }
        };
        const model = projectElections631Context({ post, gematriaRows: data || [], verifyCalculation });
        if (live) setState({
          loading: false, model: model.available ? model : null,
          error: model.available ? null : "העוגן או הרשאות המקור אינם זמינים. לא ננחש קשרים.",
        });
      } catch {
        if (live) setState({ loading: false, model: null, error: "לא ניתן לקרוא כעת את המקורות המורשים. אין חישובים משוערים." });
      }
    })();
    return () => { live = false; };
  }, []);

  if (state.loading) return <p role="status" className="sod29-631-status">בודק מקור וביטויים מפורסמים…</p>;
  if (state.error || !state.model) return <p role="status" className="sod29-631-status">{state.error}</p>;
  const result = state.model;
  const safeOpen = (item) => {
    if (typeof item?.href !== "string" || !item.href.startsWith("/post/" + ELECTIONS_SOURCE_SLUG + "#source-region-")) return;
    navigate(item.href);
  };

  return <section className="sod29-elections-context-review" aria-label="התכנסות מספרית בהקשר הבחירות" data-contextual-priority="context_first">
    <div className="sod29-elections-priority-head">
      <small>קדימות במוקד · רמזי הבחירות</small>
      <strong dir="ltr">631</strong>
      <p>״הבחירות״ ו״מלך ישראל״ — אותו ערך בגימטריה רגילה. הביטויים אינם דירוג או הערכה של אדם.</p>
    </div>
    <ul className="sod29-elections-priority-results" aria-label="ביטויים המאומתים ומפורסמים במאגר">
      {result.publicMatches.map((claim) => <li key={claim.phrase}>
        <span>{claim.phrase}<small>631 · רגיל · רשומה מאומתת ומפורסמת</small></span>
        <Link to={claim.source.href} aria-label={"פתח את המקטע המקורי של " + claim.phrase}>למקור</Link>
      </li>)}
    </ul>
    {result.authoredClaim ? <div className="sod29-elections-source-claim">
      <span>״עופר וינטר = 631״ מופיע בגוף הפוסט.</span>
      <small>טענת מקור · אינה נספרת כאן כרשומת מאגר שפורסמה</small>
      <Link to={result.authoredClaim.source.href}>פתח במקור</Link>
    </div> : null}
    {result.crossMethodAnchor ? <div className="sod29-elections-1820">
      <div><small>עוגן נוסף · אותו מקור, שיטה אחרת</small><strong dir="ltr">1820</strong></div>
      <p>הפוסט מציג ״עופר וינטר״ גם במילוי. זו שכבת חיבור באותו מקור, לא אישוש עצמאי או ציון חדש.</p>
      <Link to={result.crossMethodAnchor.href}>פתח את יחידת המקור</Link>
    </div> : null}
    <div className="sod29-elections-priority-why">
      <b>למה 631 מופיע ראשון כאן?</b>
      <p>זהו הערך של ביטוי המוקד ״הבחירות״. סביבו נמצאו {result.publicMatches.length} ביטויים בעלי רשומה מאומתת ומפורסמת, ולצדם עוגן 1820 מתוך אותו פוסט. זהו סדר הצגה בהקשר הבחירות בלבד.</p>
      <small>חישובים נבדקים בשיטות המנוע הקנוני הקיימות. מספר שיטות ≠ מספר מקורות עצמאיים. תגית אינה אישור לקשר מחקרי.</small>
    </div>
    <details className="sod29-elections-depth-details">
      <summary>בדוק שישה ממדי עומק · ללא ציון כולל</summary>
      <ContextDepthMeter2029
        depth={result.depth}
        variant="full"
        selectedValue={selectedValue}
        onSelectValue={setSelectedValue}
        onOpenLocator={safeOpen}
      />
    </details>
    <p className="sod29-elections-source-status">הכיסוי של עצמאות המקורות והאישור לקשרים עדיין לא מופה. המסלול לפוסט המשך שאינו משוחרר אינו נפתח אוטומטית.</p>
  </section>;
}
