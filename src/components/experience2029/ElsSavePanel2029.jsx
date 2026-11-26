import React, { useEffect, useId, useState } from "react";
import { savedMatrixMatchesAxis, savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";
import "./royal2029.css";
import "./elsSavedLibrary2029.css";

// The public transport accepts at most 4,000 characters for both insert and update.
const maxDescriptionLength = PUBLIC_READING_RELEASE ? 4000 : 6000;

export default function ElsSavePanel2029({ visible, state, matrix, user, pending, busy, result, onSave, onWorkspace, onAccount }) {
  const uid = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishOnPage, setPublishOnPage] = useState(false);
  const ready = state?.verification?.state === "MATCH";
  const descriptionLength = description.trim().length;
  const descriptionValid = descriptionLength >= 1 && descriptionLength <= maxDescriptionLength;
  const opened = savedMatrixMatchesAxis(matrix, state);
  const updating = opened && matrix.owner_user_id === user?.id && matrix.visibility === "private"
    && !matrix.self_published && matrix.status !== "published";
  const copying = opened && !updating;
  const identity = `${state?.scope}|${state?.term}|${state?.axis?.hitId}`;
  useEffect(() => {
    setTitle(updating ? matrix.title || state.termRaw || state.term : state?.termRaw || state?.term || "");
    setDescription(copying ? "" : state?.provenance?.desc || "");
    setPublishOnPage(false);
  }, [identity, matrix?.id, updating, copying]);

  const titleId = `${uid}-title`, descId = `${uid}-desc`, hintId = `${uid}-hint`;
  const resultMessage = result?.ok
    ? (result.status === "updated" ? "הממצא השמור עודכן." : result.row?.status === "published" ? "הצופן נשמר ופורסם בספריית האתר." : result.row?.visibility === "public" && result.row?.self_published ? "הצופן נשמר ופורסם בדף שלי. אפשר לשתף את הקישור. הוספה לספרייה המרכזית נעשית בנפרד, באישור המנהל." : "הצופן נשמר פרטי. רק אתם יכולים לפתוח אותו.")
    : result?.error === "selection_changed" ? "הממצא השתנה בזמן השמירה. נסו לשמור את הממצא הנוכחי."
    : result?.error === "auth_required" ? "נדרשת התחברות לחשבון כדי לשמור."
    : "השמירה לא הושלמה. ההסבר נשאר כאן — אפשר לנסות שוב.";
  const saveLabel = updating ? "עדכן ממצא" : copying ? "שמירת עותק" : "שמירת צופן";
  // The shared Royal layer (royal2029.css, Design V2 §14.4/§14.13) draws every control here; this file adds no look of its own.
  return <div className="r29 els29-native-rail-scroll els29-native-save" hidden={!visible}>
    <strong>{updating ? "עדכון הממצא השמור" : "שמירת הצופן"}</strong>
    <p className="els29-native-muted">{updating ? "הממצאים וההסבר יעדכנו את אותה רשומה, שנשארת פרטית." : copying ? "הצופן המקורי נשאר בידי מי ששמר אותו. השמירה יוצרת עותק משלך." : "השמירה כוללת את הציר, הממצאים והגדרות התצוגה. כברירת מחדל הצופן נשמר פרטי וגלוי רק לכם. אם תבחרו לפרסם אותו בדף שלי, כל אדם וגוגל יוכלו לפתוח ולשתף אותו, בלי אישור. הוספה לספרייה המרכזית היא בקשה נפרדת שמאשר המנהל."}</p>
    {!user ? <div className="els29-native-save-guest">
      <p className="els29-native-muted">אפשר לחפש ולבדוק צפנים בלי חשבון. כדי לשמור צופן ולחזור אליו, צריך להיכנס או להירשם.</p>
      <a className="r29-btn is-primary" href="/login">היכנסו לחשבון כדי לשמור</a>
    </div> : <form onSubmit={(event) => {
      event.preventDefault();
      if (ready && !pending && !busy && descriptionValid) onSave({ title: title.trim(), desc: description.trim(), isPublic: !updating && publishOnPage });
    }}>
      <div className="r29-field">
        <label htmlFor={titleId}>שם הצופן</label>
        <input id={titleId} className="r29-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={pending || updating} />
      </div>
      <div className="r29-field">
        <label htmlFor={descId}>מה רואים בצופן?</label>
        <textarea id={descId} className="r29-input" value={description} onChange={event => setDescription(event.target.value)} rows={5} maxLength={maxDescriptionLength} required disabled={pending} aria-describedby={hintId} aria-invalid={descriptionLength > maxDescriptionLength || undefined} placeholder="תארו את המילים, ההצלבות ומה תרצו לבדוק בהמשך…" />
        <p id={hintId} className="r29-hint">
          {descriptionLength > maxDescriptionLength ? `כדי לשמור, קצרו את ההסבר ל־${maxDescriptionLength.toLocaleString("he-IL")} תווים לכל היותר.`
            : description.length === maxDescriptionLength ? `הגעת למגבלת ${maxDescriptionLength.toLocaleString("he-IL")} תווים.`
            : descriptionLength < 1 ? "כתבו הסבר קצר כדי לשמור." : null}
        </p>
      </div>
      {/* The privacy choice and the save button stay together at the bottom of the scrolling sheet, so the primary action is always reachable (ZURIEL 26.11.2026). */}
      <div className="els29-native-save-actions">
        {!updating ? <button type="button" className="r29-check" role="checkbox" aria-checked={publishOnPage} disabled={pending} onClick={() => setPublishOnPage(value => !value)}>
          <span className="r29-check-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
          <span>פרסם בדף שלי (פתוח לכולם)</span>
        </button> : null}
        <button type="submit" className="r29-btn is-primary" aria-busy={pending || undefined} disabled={!ready || pending || busy || !descriptionValid}>{pending ? updating ? "מעדכן את הממצא…" : "שומר את הצופן…" : saveLabel}</button>
        {!ready ? <p className="r29-hint">בחרו מופע מאומת במטריצה כדי לשמור.</p> : null}
      </div>
    </form>}
    {result ? <div className="els29-native-save-result">
      <p className="r29-status els29-native-save-status" data-state={result.ok ? "success" : "error"} role={result.ok ? "status" : "alert"}>{resultMessage}</p>
      {result.ok ? <div className="r29-btn-group">
        <a className="r29-btn is-quiet" href={savedMatrixWorkspaceHref(result.row || { id: result.id })}>פתח את הצופן השמור</a>
        {result.row?.status === "published" && result.row?.visibility === "public" && result.row?.slug ? <a className="r29-btn is-quiet" href={`/codes/${encodeURIComponent(result.row.slug)}`}>לקריאת הצופן בספרייה</a> : null}
      </div> : null}
    </div> : null}
    <div className="r29-btn-group">
      {user ? <a className="r29-btn is-quiet" href="/els?library=mine">הצפנים שלי</a> : null}
      <a className="r29-btn is-quiet" href="/els?library=public">צפנים שפורסמו</a>
      {onWorkspace ? <button type="button" className="r29-btn is-quiet" disabled={!ready || busy} onClick={onWorkspace}>הוסף למחקר</button> : null}
    </div>
  </div>;
}
