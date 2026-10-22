import React, { useEffect, useState } from "react";
import { savedMatrixCanReanchor, savedMatrixMatchesAxis, savedMatrixWorkspaceHref } from "../../lib/elsSavedMatrix.js";
import "./elsSavedLibrary2029.css";

export default function ElsSavePanel2029({ visible, state, matrix, user, isAdmin, replacement, pending, busy, result, onSave, onWorkspace, onAccount }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const ready = state?.verification?.state === "MATCH";
  const opened = savedMatrixMatchesAxis(matrix, state);
  const reanchoring = savedMatrixCanReanchor(matrix, state)
    && (isAdmin || matrix?.owner_user_id === user?.id);
  const replacing = Boolean(replacement?.recordId && replacement.recordId === matrix?.id);
  const updating = replacing || ((opened || reanchoring) && ((matrix.owner_user_id === user?.id
    && (matrix.visibility === "private" || reanchoring)) || isAdmin));
  const copying = opened && !updating;
  const copyingLegacy = Boolean(matrix) && !opened && !reanchoring;
  const identity = `${state?.scope}|${state?.term}|${state?.axis?.hitId}`;
  useEffect(() => {
    setTitle(updating ? matrix.title || state.termRaw || state.term : state?.termRaw || state?.term || "");
    setDescription(copying ? "" : state?.provenance?.desc || "");
  }, [identity, matrix?.id, updating, copying]);

  return <div className="els29-native-rail-scroll els29-native-save" hidden={!visible}>
    <strong>{replacing ? "החלפת הציר הראשי" : updating ? "עדכון הצופן השמור" : copying || copyingLegacy ? "שמירת עותק אישי" : "שמירת הצופן שלי"}</strong>
    <p className="els29-native-muted">{replacing
      ? `המילה „${replacement.targetTerm}” תחליף את „${replacement.previousTerm}” כציר הראשי באותה רשומה. שם הצופן „${matrix.title || matrix.search_term}” יישאר, והציר הישן יימחק מהממצאים השמורים.${matrix.status === "published" && !isAdmin ? " לאחר השינוי הצופן יחזור לבדיקה לפני פרסום." : ""}`
      : updating ? reanchoring
      ? `השמירה תשלים את נתוני הצופן הוותיק ותעדכן את אותה רשומה.${matrix.status === "published" && !isAdmin ? " לאחר השינוי היא תחזור לבדיקה לפני פרסום." : ""}`
      : "הממצאים, ההסבר והגדרות התצוגה יעדכנו את אותה רשומה."
      : copying || copyingLegacy ? "הצופן המקורי יישאר בידי מי ששמר אותו. העותק שלך יישמר בפרטיות." : "הצופן נשמר בחשבון שלך עם הציר, הממצאים והגדרות התצוגה. השמירה פרטית."}</p>
    {!user ? <button type="button" onClick={onAccount}>היכנסו לחשבון כדי לשמור</button> : <form onSubmit={(event) => {
      event.preventDefault();
      if (ready && !pending && !busy && description.trim().length >= 12) onSave({ title: title.trim(), desc: description.trim(), isPublic: false });
    }}>
      <label>שם הצופן<input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={pending || updating} /></label>
      <label>מה רואים בצופן?<textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} maxLength={6000} required minLength={12} disabled={pending} placeholder="תארו את המילים, ההצלבות ומה תרצו לבדוק בהמשך…" /></label>
      {description.trim().length < 12 ? <small>כתבו הסבר קצר של לפחות 12 תווים.</small> : null}
      <button type="submit" className="sod29-action primary" disabled={!ready || pending || busy || description.trim().length < 12}>{pending ? replacing ? "מחליף את הציר…" : updating ? "מעדכן את הצופן…" : "שומר את הצופן…" : replacing ? "החלף ציר ושמור" : updating ? "שמור שינויים" : copying || copyingLegacy ? "שמור עותק אצלי" : "שמור אצלי"}</button>
      {!ready ? <small>בחרו מופע מאומת במטריצה כדי לשמור.</small> : null}
    </form>}
    {result ? <div role={result.ok ? "status" : "alert"} className="els29-native-save-result">
      {result.ok ? <>{result.status === "updated" ? "הממצא השמור עודכן." : "הצופן נשמר אצלך."}<a href={savedMatrixWorkspaceHref(result.row || { id: result.id })}>פתח את הצופן השמור</a></>
        : result.error === "selection_changed" ? "הממצא השתנה בזמן השמירה. נסו לשמור את הממצא הנוכחי."
        : result.error === "auth_required" ? "נדרשת התחברות לחשבון כדי לשמור."
        : "השמירה לא הושלמה. ההסבר נשאר כאן — אפשר לנסות שוב."}
    </div> : null}
    <div className="els29-native-hit-actions">
      <a className="sod29-action" href="/els?library=mine">הצפנים שלי</a>
      <a className="sod29-action" href="/els?library=public">צפנים שפורסמו</a>
      <button type="button" disabled={!ready || busy} onClick={onWorkspace}>הוסף למחקר</button>
    </div>
  </div>;
}
