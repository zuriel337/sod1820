import React, { useEffect } from "react";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { applySeo } from "../lib/seo.js";
import FeatureClosedNotice from "../components/FeatureClosedNotice.jsx";
import { useFeatureState } from "../components/MaintenanceLock.jsx";

export default function Els2029Page() {
  const research = useResearch();
  const elsState = useFeatureState("lock_els");
  useEffect(() => {
    applySeo({ title: "ELS · SOD1820", description: "ELS Research Work Area בתוך מערכת 2029", path: "/els" });
    research.updateResearchContext?.({ lens: "els" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (elsState.loading) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="טוען את מצב היכולת הקנוני…">
      <FrameState kind="loading" title="טוען את מצב ELS" progress={{ phase: "בודק את מצב היכולת הקנוני", compact: true }}>המערכת מוודאת שהיכולת זמינה לפני פתיחת סביבת המחקר.</FrameState>
    </Sod2029Shell>;
  }

  if (elsState.blocked) {
    return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="אותו מנוע קנוני, עם מצב פתיחה/סגירה אחד לכל המערכת.">
      <FeatureClosedNotice state={elsState} title="ELS" to="/world" />
    </Sod2029Shell>;
  }

  return <Sod2029Shell wide surface="els" symbol="✦" eyebrow="ONE ELS ENGINE · MANY PROJECTIONS" title="ELS" description="המנוע הקנוני נשאר אחד. ה־2029 אינו יורש את ה־Work Area הישן כעיצוב; הוא יקבל renderer חדש מעל אותו Engine, Corpus, coordinates ו־Research Context.">
    <section className="sod29-focus-stage">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">CLOSED FOUNDATION</div>
          <h2>מנוע אחד · מצב מחקר אחד · Renderer ניתן להחלפה</h2>
          <div className="sod29-muted">ELS לא הופך לאפליקציה נפרדת ולא מחשב בצד React. החיפוש, הקורפוס, המיקום, ה־span/window וה־replay שייכים ל־owner הקנוני; 2D/3D/VR הם projections בלבד.</div>
        </div>
        <span className="sod29-chip">legacy UI ≠ target UI</span>
      </div>

      <div className="sod29-els-architecture">
        <div className="sod29-els-matrix-stage">
          <div>
            <strong>ELS Research Renderer</strong>
            <p className="sod29-muted">ה־renderer הסופי עדיין לא נסגר, ולכן לא מטמיעים כאן את המסך הישן כאילו הוא החלטת 2029. כשיחובר, הוא יקבל את אותה זהות־חיפוש, coordinate lineage, Evidence ו־return_exact.</p>
            <div className="sod29-actions" style={{ justifyContent: "center" }}>
              <span className="sod29-chip">Matrix / Layer Stack</span>
              <span className="sod29-chip">Exact Locus</span>
              <span className="sod29-chip">Evidence</span>
              <span className="sod29-chip">Journey</span>
            </div>
          </div>
        </div>

        <aside className="sod29-inspector">
          <div className="sod29-kicker">WHAT IS ALREADY LOCKED</div>
          <h3 style={{ marginTop: 5 }}>החוזה שנשמר</h3>
          <div className="sod29-divider" />
          <div className="sod29-muted">Engine</div><b>One canonical ELS core</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Truth</div><b>Result / Finding / Interpretation נשארים נפרדים</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Continuity</div><b>Research Context + exact return</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Open</div><b>ה־2029 renderer המדויק</b>
          <div className="sod29-state" style={{ marginTop: 14 }}>היכולת הקנונית קיימת; רק הפרזנטציה החדשה נשארת לבנייה. לא מציגים את הישן כהחלטה חדשה.</div>
        </aside>
      </div>
    </section>
  </Sod2029Shell>;
}
