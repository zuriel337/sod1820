import React, { useEffect, useState } from "react";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { formatDateHe, formatDateHebrewCal } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import {
  presentBookAccessStatus,
  presentBookResearchKind,
  presentBookResearchStatus,
  presentBookVerificationState,
} from "../lib/research/bookHebrewPresentation.js";
import { loadBookPublicationEvidenceReviewDesk } from "../lib/research/bookPublicationEvidenceReviewDesk.js";
import {
  availableBookReviewJudgments,
} from "../lib/research/bookPublicationReviewJudgment.js";
import "./bookPublicationReview2029.css";

const PAGE_SIZE = 12;

const CHECK_LABELS = Object.freeze({
  statementPresent: "נוסח הממצא קיים",
  sourceRefPresent: "הפניית המקור קיימת",
  pageLocatorPresent: "מראה־מקום לעמוד קיים",
  verificationDeclared: "מצב הבדיקה הוצהר",
  governanceDeclared: "מצב הממשל הוצהר",
  exactDuplicateAbsent: "לא נמצאה כפילות מדויקת",
});

const JUDGMENT_LABELS = Object.freeze({
  approve: "אישור למחקר",
  reject: "דחייה ממשלית",
  canonicalize: "קביעה כקנוני",
});

const FIDELITY_LABELS = Object.freeze({
  complete: "חילוץ מלא נרשם",
  partial: "חילוץ חלקי נרשם",
  not_recorded: "לא נרשם — נדרשת בדיקת תחולה",
});

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function formatRecordedDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "תאריך הרשומה אינו זמין";
  return `${formatDateHebrewCal(value)} · ${formatDateHe(value)}`;
}

function locatorLabel(locator) {
  if (Number.isInteger(locator?.page) && locator.page > 0) return `עמוד ${locator.page}`;
  if (locator?.zone) return `אזור ${String(locator.zone).replaceAll("_", " ")}`;
  return "מראה־המקום דורש השלמה";
}

function safeCount(value) {
  return Number(value || 0).toLocaleString("he-IL");
}

function StatusAxis({ label, value, code, tone = "neutral" }) {
  return <div className={`book-review29-axis tone-${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {code ? <code dir="ltr">{code}</code> : null}
  </div>;
}

function ReviewBoundary() {
  return <section className="sod29-section book-review29-boundary" aria-labelledby="book-review-boundary-title">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">גבול הפעולה</div>
        <h2 id="book-review-boundary-title">בדיקת ממשל אינה פרסום</h2>
        <p className="sod29-muted">המסך מיועד לקריאה ולבדיקה בלבד. הוא אינו משנה ממשל, גישה או פרטיות ואינו מפרסם חומר.</p>
      </div>
      <span className="sod29-chip">השפעת פרסום: אין</span>
    </div>
    <div className="book-review29-boundary-grid">
      <article className="book-review29-boundary-card is-current">
        <span>החומר שנבדק כאן</span>
        <strong>מועמד לפרסום ציבורי</strong>
        <code dir="ltr">public_candidate</code>
        <p>נגיש רק לקורא המנהל המורשה. אישור או קביעה כקנוני אינם פותחים אותו לציבור.</p>
      </article>
      <div className="book-review29-boundary-separator" aria-hidden="true">≠</div>
      <article className="book-review29-boundary-card is-closed">
        <span>מצב ציבורי</span>
        <strong>אינו זמין במסלול הזה</strong>
        <code dir="ltr">public</code>
        <p>אין כרגע גבול פרסום מאושר במסך. נדרשים מסלול קנוני נפרד ואישור נוסף לפני כל שינוי גישה.</p>
      </article>
    </div>
    <div className="sod29-state book-review29-readiness-note" role="note">
      <strong>״מוכן לביקורת אנושית״ אינו ״מוכן לפרסום״.</strong>
      <span>המסך אינו מחשב מוכנות לפרסום ואינו קובע שלמות חילוץ. הוא מציג רק ערך נאמנות שנרשם במקור; היעדר ערך מוצג כ״לא נרשם״ ולא מוצג כחסר או כנכשל.</span>
    </div>
  </section>;
}

function ReviewChecklist({ review }) {
  const checks = review?.checks || {};
  return <ul className="book-review29-checklist" aria-label="רשימת בדיקות לפני החלטה">
    {Object.entries(CHECK_LABELS).map(([key, label]) => {
      const passed = checks[key] === true;
      return <li key={key} data-check={passed ? "pass" : "repair"}>
        <span aria-hidden="true">{passed ? "✓" : "!"}</span>
        <span>{label}</span>
      </li>;
    })}
  </ul>;
}

function EvidenceRequirement({ requirement }) {
  const role = requirement?.state?.semanticRole || "unknown";
  return <li className="book-review29-evidence-requirement" data-evidence-state={role}>
    <div>
      <strong>{requirement?.labelHe || "דרישת ראיות"}</strong>
      <span>{requirement?.state?.labelHe || "דורש עיון"}</span>
    </div>
    <p>{requirement?.state?.detailHe || "מצב הדרישה דורש בדיקה אנושית."}</p>
    <small>{requirement?.nextActionHe || "יש להשלים בדיקה מתועדת לפני הכרעה."}</small>
  </li>;
}

function EvidencePanel({ evidence }) {
  if (!evidence) return <div className="sod29-state warn book-review29-evidence-missing" role="status">
    חבילת הראיות אינה זמינה לפריט הזה. הפריט נשאר חסום להכרעת נאמנות.
  </div>;

  const readiness = evidence.readiness || {};
  return <section className="book-review29-evidence-panel" aria-label="חבילת ראיות להכרעת נאמנות">
    <header>
      <div>
        <span>מסלול בדיקת הראיות</span>
        <strong>{evidence.lane?.labelHe || "מסלול בדיקה דורש עיון"}</strong>
        {evidence.lane?.detailHe ? <p>{evidence.lane.detailHe}</p> : null}
      </div>
      <div className="book-review29-evidence-score">
        <span>{safeCount(readiness.completeCount)} מתוך {safeCount(readiness.requiredCount)}</span>
        <strong>{readiness.labelHe || "חסרות ראיות להכרעה"}</strong>
      </div>
    </header>

    <ul className="book-review29-evidence-grid">
      {(evidence.requirements || []).map(requirement => <EvidenceRequirement
        key={requirement.key || requirement.labelHe}
        requirement={requirement}
      />)}
    </ul>

    <div className="book-review29-evidence-gate" role="note">
      <strong>השער נשאר אנושי</strong>
      <span>{readiness.detailHe || "השלמת הראיות אינה קובעת נאמנות ואינה משנה את מצב הפרסום."}</span>
    </div>
  </section>;
}

function ReviewItem({ item, evidence }) {
  const kind = presentBookResearchKind(item.kind);
  const governance = presentBookResearchStatus(item.status?.governance?.state);
  const access = presentBookAccessStatus(item.status?.publicationAccess?.state);
  const verification = presentBookVerificationState(item.status?.verification?.state);
  const fidelityState = item.extractionFidelity?.state || "not_recorded";
  const fidelityLabel = FIDELITY_LABELS[fidelityState] || FIDELITY_LABELS.not_recorded;
  const ready = item.review?.readiness === "ready_for_human_review";
  const judgments = ready ? availableBookReviewJudgments(item) : [];
  const terms = Array.isArray(item.terms) ? item.terms.filter(Boolean).slice(0, 5) : [];

  return <article className="book-review29-item" data-readiness={ready ? "ready" : "repair"}>
    <header className="book-review29-item-head">
      <div>
        <div className="sod29-kicker">{locatorLabel(item.sourceLocator)} · {kind.labelHe}</div>
        <h3>{clean(item.statement) || "נוסח הממצא חסר ודורש תיקון"}</h3>
      </div>
      <span className={`book-review29-readiness ${ready ? "is-ready" : "needs-repair"}`}>
        {ready ? "מוכן לביקורת אנושית" : "דורש תיקון לפני החלטה"}
      </span>
    </header>

    <div className="book-review29-axes" aria-label="צירי מצב נפרדים">
      <StatusAxis label="גישה" value={access.labelHe} code={item.status?.publicationAccess?.state} tone="candidate" />
      <StatusAxis label="ממשל מחקרי" value={governance.labelHe} code={item.status?.governance?.state} tone="governance" />
      <StatusAxis label="בדיקת מנוע" value={verification.labelHe} code={item.status?.verification?.state} tone="verification" />
      <StatusAxis label="נאמנות חילוץ" value={fidelityLabel} code={fidelityState} tone="fidelity" />
    </div>

    {fidelityState === "partial" ? <div className="sod29-state warn book-review29-fidelity-note">
      חילוץ חלקי חוסם קנוניזציה ללא הכרה אנושית מפורשת. המסך הזה אינו מאפשר לעקוף את השער.
    </div> : null}
    {fidelityState === "not_recorded" ? <div className="sod29-state book-review29-fidelity-note">
      תחולת שער הנאמנות טרם הוכרעה לרשומה זו. היעדר ערך אינו מוכיח חילוץ מלא ואינו מוכיח כשל.
    </div> : null}

    {terms.length ? <div className="book-review29-terms" aria-label="מונחים">
      {terms.map((term, index) => <span className="sod29-chip" key={`${term}:${index}`}>{term}</span>)}
    </div> : null}

    <EvidencePanel evidence={evidence} />

    <details className="book-review29-details">
      <summary>פרטי מקור ובדיקה</summary>
      <div className="book-review29-details-grid">
        <div>
          <span>הפניית מקור</span>
          <code dir="ltr">{item.sourceRef || "—"}</code>
        </div>
        <div>
          <span>תאריך רשומה</span>
          <strong>{formatRecordedDate(item.createdAt)}</strong>
        </div>
        {item.value != null ? <div>
          <span>ערך מתועד</span>
          <strong>{String(item.value)}</strong>
        </div> : null}
        {item.confidence != null ? <div>
          <span>ביטחון מתועד — אינו ציון אמת</span>
          <strong>{String(item.confidence)}</strong>
        </div> : null}
      </div>
      <ReviewChecklist review={item.review} />
    </details>

    <footer className="book-review29-item-actions">
      <div>
        <strong>תצוגת מוכנות בלבד</strong>
        <span>מסך זה אינו מבצע החלטות. מצב הממשל והגישה נשארים ללא שינוי.</span>
      </div>
      <div className="book-review29-future-judgments" aria-label="החלטות ממשל אפשריות בעתיד">
        {judgments.map(decision => <span
          key={decision}
          className="sod29-chip"
        >
          {JUDGMENT_LABELS[decision]} · לא פעיל
        </span>)}
        {!judgments.length ? <span className="book-review29-no-action">
          {ready ? "אין מעבר ממשל נוסף שמוגדר בחוזה הנוכחי." : "יש להשלים את הבדיקות החסרות לפני דיון ממשלי עתידי."}
        </span> : null}
      </div>
    </footer>
  </article>;
}

function ReviewScreen({ book, packet, evidencePresentation, partial, offset, onOffset, onReload }) {
  const summary = packet.summary || {};
  const page = packet.page || {};
  const fidelity = summary.byExtractionFidelity || {};
  const evidenceSummary = evidencePresentation?.summary || {};
  const evidenceById = new Map((evidencePresentation?.packets || []).map(item => [item.id, item]));
  return <>
    <ReviewBoundary />

    <section className="sod29-section book-review29-evidence-overview" aria-labelledby="book-review-evidence-title">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">מצב חבילות הראיות</div>
          <h2 id="book-review-evidence-title">מה כבר מוכן ומה דורש השלמה</h2>
          <p className="sod29-muted">הסיכום מתאר מוכנות להכרעת נאמנות אנושית בלבד. הוא אינו מאשר ממשל, אינו משנה גישה ואינו מפרסם חומר.</p>
        </div>
        <span className="sod29-chip">קורא מורשה · חומר פרטי</span>
      </div>
      <div className="book-review29-evidence-summary-grid">
        <div><strong>{safeCount(evidenceSummary.totalPackets)}</strong><span>חבילות ראיות</span></div>
        <div><strong>{safeCount(evidenceSummary.readyForFidelityVerdict)}</strong><span>מוכנות להכרעת נאמנות</span></div>
        <div><strong>{safeCount(evidenceSummary.needsEvidence)}</strong><span>דורשות השלמת ראיות</span></div>
        <div><strong>{safeCount(evidenceSummary.complex)}</strong><span>בדיקת נאמנות מורכבת</span></div>
        <div><strong>{safeCount(evidenceSummary.applicability)}</strong><span>ממתינות להכרעת תחולה</span></div>
      </div>
    </section>

    <section className="sod29-section book-review29-summary" aria-labelledby="book-review-summary-title">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">תמונת ביקורת</div>
          <h2 id="book-review-summary-title">{book.label}</h2>
          <p className="sod29-muted">קורא מוגבל לספר הזה ולרשומות שמסומנות <code dir="ltr">public_candidate</code>. הרשימה אינה תצוגה ציבורית.</p>
        </div>
        <button type="button" className="sod29-action" onClick={onReload}>
          <NavigationIcon2029 name="rotate" /> רענון מאובטח
        </button>
      </div>
      <div className="book-review29-summary-grid">
        <div><strong>{safeCount(summary.totalCandidates)}</strong><span>מועמדים בביקורת</span></div>
        <div><strong>{safeCount(summary.readyForHumanReview)}</strong><span>מוכנים לביקורת אנושית</span></div>
        <div><strong>{safeCount(summary.needsRepair)}</strong><span>דורשים תיקון</span></div>
        <div><strong>{safeCount(summary.distinctSourceRefs)}</strong><span>הפניות מקור שונות</span></div>
        <div><strong>{safeCount(fidelity.complete)}</strong><span>חילוץ מלא שנרשם</span></div>
        <div><strong>{safeCount(fidelity.partial)}</strong><span>חילוץ חלקי שנרשם</span></div>
        <div><strong>{safeCount(fidelity.not_recorded)}</strong><span>נאמנות שלא נרשמה</span></div>
      </div>
      {partial ? <div className="sod29-state warn">הקורא המורשה החזיר חלון חלקי. הסיכום אינו מוצג כמיצוי מלא ואין סריקה עוקפת.</div> : null}
    </section>

    <section className="sod29-section" aria-labelledby="book-review-items-title">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">פריטי ביקורת</div>
          <h2 id="book-review-items-title">בדיקה מסודרת של כל מועמד</h2>
          <p className="sod29-muted">כל ציר מוצג בנפרד: סוג הממצא, בדיקת המנוע, מצב הממשל ומצב הגישה.</p>
        </div>
        <span className="sod29-chip">{safeCount(page.total)} בסך הכול</span>
      </div>
      {packet.items?.length ? <div className="book-review29-list">
        {packet.items.map(item => <ReviewItem key={item.id} item={item} evidence={evidenceById.get(item.id)} />)}
      </div> : <FrameState title="אין מועמדים בחלון הזה">לא נמצאו רשומות מורשות המסומנות כמועמדות לפרסום עבור הספר הזה.</FrameState>}

      <nav className="book-review29-pagination" aria-label="דפדוף ברשימת הביקורת">
        <button type="button" className="sod29-action" disabled={offset <= 0} onClick={() => onOffset(Math.max(0, offset - PAGE_SIZE))}>העמוד הקודם</button>
        <span>מוצגים {page.total ? `${safeCount(offset + 1)}–${safeCount(offset + (packet.items?.length || 0))}` : "0"} מתוך {safeCount(page.total)}</span>
        <button type="button" className="sod29-action" disabled={!page.hasMore} onClick={() => onOffset(offset + PAGE_SIZE)}>העמוד הבא</button>
      </nav>
    </section>
  </>;
}

export default function BookPublicationReview2029Page({ slug = "" }) {
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    phase: "loading",
    book: null,
    reviewPacket: null,
    evidencePresentation: null,
    restriction: null,
    partial: false,
  });

  useEffect(() => {
    applySeo({
      title: "ביקורת מועמדי ספרים",
      description: "מסך פנימי ומוגבל לביקורת ממשל של מועמדי ספרים.",
      path: "/2029/control",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, phase: "loading", restriction: null }));
    (async () => {
      try {
        const desk = await loadBookPublicationEvidenceReviewDesk(slug, { limit: PAGE_SIZE, offset });
        if (!active) return;
        setState(desk);
      } catch {
        if (active) setState({
          phase: "error",
          book: null,
          reviewPacket: null,
          evidencePresentation: null,
          restriction: null,
          partial: false,
        });
      }
    })();
    return () => { active = false; };
  }, [slug, offset, reloadKey]);

  const shellProps = {
    title: "ביקורת מועמדי ספרים",
    eyebrow: "2029 · פנימי · מנהל",
    description: "מסך מבודד לבדיקת מועמדי ספרים. ממשל מחקרי ופרסום נשארים גבולות נפרדים.",
    status: "מנהל · קריאה בלבד",
    // Use the existing Books experience profile; authorization remains the
    // server-derived admin gate inside the unified desk loader.
    surface: "books",
    symbol: <NavigationIcon2029 name="books" />,
    introVariant: "compact",
    wide: true,
  };

  if (state.phase === "loading") return <Sod2029Shell {...shellProps}>
    <FrameState kind="loading" title="מאמת הרשאת מנהל וקורא חומר מורשה">המסך נשאר סגור עד ששני השערים מסתיימים.</FrameState>
  </Sod2029Shell>;

  if (state.phase === "restricted") return <Sod2029Shell {...shellProps}>
    <FrameState kind="gated" title={state.restriction === "reader" ? "הקורא המורשה חסום" : "נדרשת הרשאת מנהל מאומתת"}>
      {state.restriction === "reader"
        ? "אימות המנהל הצליח, אך שכבת המחקר אינה קריאה בהרשאה הנוכחית. אין fallback, נתוני דמה או הרחבת הרשאות; המסך נכשל סגור."
        : "לא הוחזרה הרשאת מנהל מן הבדיקה השרתית. לא נטען ספר ולא נחשף חומר מועמד."}
    </FrameState>
  </Sod2029Shell>;

  if (state.phase === "unavailable") return <Sod2029Shell {...shellProps}>
    <FrameState kind="unavailable" title="הספר אינו זמין לביקורת">לא נמצאה זהות ספר פעילה עבור הכתובת המבוקשת.</FrameState>
  </Sod2029Shell>;

  if (state.phase === "error") return <Sod2029Shell {...shellProps}>
    <FrameState kind="error" title="לא ניתן לטעון את מסך הביקורת" action={<button type="button" className="sod29-action" onClick={() => setReloadKey(value => value + 1)}>ניסיון נוסף</button>}>
      לא מוצגים פרטי ספק, מסד או הרשאה. אפשר לנסות שוב; אין מסלול חלופי לחומר המוגן.
    </FrameState>
  </Sod2029Shell>;

  return <Sod2029Shell {...shellProps}>
    <div className="book-review29" data-access-scope="public_candidate" data-publication-effect="none">
      <ReviewScreen
        book={state.book}
        packet={state.reviewPacket}
        evidencePresentation={state.evidencePresentation}
        partial={state.partial}
        offset={offset}
        onOffset={setOffset}
        onReload={() => setReloadKey(value => value + 1)}
      />
    </div>
  </Sod2029Shell>;
}
