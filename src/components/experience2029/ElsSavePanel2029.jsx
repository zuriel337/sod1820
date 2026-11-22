import React, { useEffect, useState } from "react";
import { savedMatrixMatchesAxis, savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import { PUBLIC_READING_RELEASE } from "../../lib/publicReadingRelease2029.js";
import "./elsSavedLibrary2029.css";

// The public transport accepts at most 4,000 characters for both insert and update.
const maxDescriptionLength = PUBLIC_READING_RELEASE ? 4000 : 6000;

export default function ElsSavePanel2029({ visible, state, matrix, user, pending, busy, result, onSave, onWorkspace, onAccount }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keepPrivate, setKeepPrivate] = useState(false);
  const ready = state?.verification?.state === "MATCH";
  const descriptionLength = description.trim().length;
  const descriptionValid = descriptionLength >= 12 && descriptionLength <= maxDescriptionLength;
  const opened = savedMatrixMatchesAxis(matrix, state);
  const updating = opened && matrix.owner_user_id === user?.id && matrix.visibility === "private"
    && !matrix.self_published && matrix.status !== "published";
  const copying = opened && !updating;
  const identity = `${state?.scope}|${state?.term}|${state?.axis?.hitId}`;
  useEffect(() => {
    setTitle(updating ? matrix.title || state.termRaw || state.term : state?.termRaw || state?.term || "");
    setDescription(copying ? "" : state?.provenance?.desc || "");
    setKeepPrivate(false);
  }, [identity, matrix?.id, updating, copying]);

  return <div className="els29-native-rail-scroll els29-native-save" hidden={!visible}>
    <strong>{updating ? "עדכון הממצא השמור" : "שמירת הצופן"}</strong>
    <p className="els29-native-muted">{updating ? "הממצאים וההסבר יעדכנו את אותה רשומה, שנשארת פרטית." : copying ? "הצופן המקורי נשאר בידי מי ששמר אותו. השמירה יוצרת עותק משלך." : "השמירה כוללת את הציר, הממצאים והגדרות התצוגה. כברירת מחדל אפשר לשתף קישור לצופן. אם יש לך דף כותב ציבורי, הצופן יופיע גם בו. ההוספה לספריית האתר כפופה לאישור."}</p>
    {!user ? <div className="els29-native-save-guest">
      <p className="els29-native-muted">אפשר לחפש ולבדוק צפנים בלי חשבון. כדי לשמור צופן ולחזור אליו, צריך להיכנס או להירשם.</p>
      <a className="sod29-action primary" href="/login">היכנסו לחשבון כדי לשמור</a>
    </div> : <form onSubmit={(event) => {
      event.preventDefault();
      if (ready && !pending && !busy && descriptionValid) onSave({ title: title.trim(), desc: description.trim(), isPublic: !updating && !keepPrivate });
    }}>
      <label>שם הצופן<input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={pending || updating} /></label>
      <label>מה רואים בצופן?<textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} maxLength={maxDescriptionLength} required minLength={12} disabled={pending} placeholder="תארו את המילים, ההצלבות ומה תרצו לבדוק בהמשך…" /></label>
      {!updating ? <label className="els29-native-save-private"><input type="checkbox" checked={keepPrivate} disabled={pending} onChange={event => setKeepPrivate(event.target.checked)} /><span>לא לפרסם (לשמור פרטי)</span></label> : null}
      {descriptionLength > maxDescriptionLength ? <small>כדי לשמור, קצרו את ההסבר ל־{maxDescriptionLength.toLocaleString("he-IL")} תווים לכל היותר.</small> : null}
      {description.length === maxDescriptionLength ? <small>הגעת למגבלת {maxDescriptionLength.toLocaleString("he-IL")} תווים.</small> : null}
      {descriptionLength < 12 ? <small>כתבו הסבר קצר של לפחות 12 תווים.</small> : null}
      <button type="submit" className="sod29-action primary" disabled={!ready || pending || busy || !descriptionValid}>{pending ? updating ? "מעדכן את הממצא…" : "שומר את הצופן…" : updating ? "עדכן ממצא" : copying ? "שמירת עותק" : "שמירה בענן"}</button>
      {!ready ? <small>בחרו מופע מאומת במטריצה כדי לשמור.</small> : null}
    </form>}
    {result ? <div role={result.ok ? "status" : "alert"} className="els29-native-save-result">
      {result.ok ? <>{result.status === "updated" ? "הממצא השמור עודכן." : result.row?.status === "published" ? "הצופן נשמר ופורסם בספריית האתר." : result.row?.self_published ? "הצופן נשמר ואפשר לשתף את הקישור. הוא ממתין לאישור בספריית האתר." : result.row?.visibility === "private" ? "הצופן נשמר בענן, פרטי." : "הצופן נשמר בענן."}<a href={savedMatrixWorkspaceHref(result.row || { id: result.id })}>פתח את הצופן השמור</a></>
        : result.error === "selection_changed" ? "הממצא השתנה בזמן השמירה. נסו לשמור את הממצא הנוכחי."
        : result.error === "auth_required" ? "נדרשת התחברות לחשבון כדי לשמור."
        : "השמירה לא הושלמה. ההסבר נשאר כאן — אפשר לנסות שוב."}
    </div> : null}
    <div className="els29-native-hit-actions">
      {user ? <a className="sod29-action" href="/els?library=mine">הצפנים שלי</a> : null}
      <a className="sod29-action" href="/els?library=public">צפנים שפורסמו</a>
      {onWorkspace ? <button type="button" disabled={!ready || busy} onClick={onWorkspace}>הוסף למחקר</button> : null}
    </div>
  </div>;
}
