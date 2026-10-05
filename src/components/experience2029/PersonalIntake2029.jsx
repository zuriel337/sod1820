import React, { useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import {
  PERSONAL_INTAKE_KIND,
  buildPersonalIntakeEntity,
  deletePersonalIntakeMedia,
  discardVerifiedPersonalUpload,
  readPersonalIntakeMedia,
  uploadPersonalIntakeFile,
} from "../../lib/research/personalIntake2029.js";
import "./personalIntake2029.css";

const KINDS = Object.freeze([
  { id: PERSONAL_INTAKE_KIND.TEXT, icon: "✎", label: "טקסט / ביטוי", placeholder: "מילה, ביטוי, שאלה או הערה…" },
  { id: PERSONAL_INTAKE_KIND.NUMBER, icon: "123", label: "מספר", placeholder: "358" },
  { id: PERSONAL_INTAKE_KIND.DATE, icon: "◷", label: "תאריך", placeholder: "2026-10-04" },
  { id: PERSONAL_INTAKE_KIND.PERSON, icon: "◉", label: "אדם", placeholder: "שם האדם…" },
  { id: PERSONAL_INTAKE_KIND.EVENT, icon: "◇", label: "אירוע", placeholder: "מה קרה?" },
  { id: PERSONAL_INTAKE_KIND.URL, icon: "↗", label: "קישור", placeholder: "https://…" },
  { id: PERSONAL_INTAKE_KIND.FILE, icon: "＋", label: "קובץ", placeholder: "" },
]);

const clean = (value) => String(value ?? "").trim();

function itemKindLabel(kind) {
  return KINDS.find((item) => item.id === kind)?.label || "פריט";
}

export default function PersonalIntake2029() {
  const { user } = useAuth() || {};
  const research = useResearch();
  const [kind, setKind] = useState(PERSONAL_INTAKE_KIND.TEXT);
  const [value, setValue] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => (research?.saved || []).filter((item) => item?.type === "personal_intake"),
    [research?.saved],
  );
  const spec = KINDS.find((item) => item.id === kind) || KINDS[0];
  const canSave = kind === PERSONAL_INTAKE_KIND.FILE ? Boolean(file && user) : Boolean(clean(value));

  const reset = () => {
    setValue("");
    setFile(null);
    setProgress(0);
  };

  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setMessage(null);
    let verified = null;
    try {
      if (kind === PERSONAL_INTAKE_KIND.FILE) {
        verified = await uploadPersonalIntakeFile(file, {
          onProgress: ({ percentage }) => setProgress(Math.max(0, Math.min(100, Math.round(percentage || 0)))),
        });
      }

      const entity = buildPersonalIntakeEntity({ kind, value, file, verifiedUpload: verified, surface: "my-workspace-2029" });
      const ok = research?.saveItem?.(entity);
      if (!ok) {
        if (verified) await discardVerifiedPersonalUpload(verified).catch(() => {});
        throw new Error("workspace_save_failed");
      }
      reset();
      setMessage({ kind: "ok", text: "נשמר במחקר שלי." });
    } catch (error) {
      setMessage({ kind: "error", text: error?.message === "authentication_required"
        ? "כדי לשמור קובץ פרטי בענן צריך להתחבר."
        : "לא הצלחנו לשמור כרגע. אפשר לנסות שוב." });
    } finally {
      setBusy(false);
    }
  };

  const openMedia = async (item) => {
    setMessage(null);
    try {
      const data = await readPersonalIntakeMedia(item);
      if (data?.signed_url) window.open(data.signed_url, "_blank", "noopener,noreferrer");
    } catch {
      setMessage({ kind: "error", text: "לא הצלחנו לפתוח את הקובץ הפרטי." });
    }
  };

  const remove = async (item) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (item?.artifact?.storage_object_id) await deletePersonalIntakeMedia(item);
      const ok = research?.removeSaved?.(item.id);
      if (!ok) throw new Error("workspace_remove_failed");
      setMessage({ kind: "ok", text: "הפריט הוסר מהמחקר שלי." });
    } catch {
      setMessage({ kind: "error", text: "לא הצלחנו להסיר את הפריט כרגע." });
    } finally {
      setBusy(false);
    }
  };

  return <section className="sod29-personal-intake" data-experience-capability="personal-intake">
    <button className="sod29-personal-intake-head" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
      <span className="mark" aria-hidden="true">＋</span>
      <span><strong>הוסף למחקר שלי</strong><small>טקסט, מספר, תאריך, אדם, אירוע, קישור או קובץ — מקום אחד.</small></span>
      <b>{open ? "סגור" : "פתח"}</b>
    </button>

    {open ? <div className="sod29-personal-intake-body">
      <div className="sod29-personal-intake-kinds" aria-label="סוג הפריט">
        {KINDS.map((item) => <button key={item.id} type="button" className={kind === item.id ? "active" : ""} onClick={() => { setKind(item.id); setMessage(null); }}>
          <span aria-hidden="true">{item.icon}</span>{item.label}
        </button>)}
      </div>

      {kind === PERSONAL_INTAKE_KIND.FILE ? <label className="sod29-personal-intake-file">
        <span>{user ? "בחרו קובץ פרטי" : "קבצים פרטיים דורשים התחברות"}</span>
        <input
          type="file"
          disabled={!user || busy}
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(event) => { setFile(event.target.files?.[0] || null); setProgress(0); setMessage(null); }}
        />
        <small>{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024)).toLocaleString("he-IL")} KB` : "תמונה · וידאו · אודיו · PDF · DOC/DOCX · TXT"}</small>
      </label> : <label className="sod29-personal-intake-field">
        <span>{spec.label}</span>
        {kind === PERSONAL_INTAKE_KIND.EVENT || kind === PERSONAL_INTAKE_KIND.TEXT
          ? <textarea rows={4} value={value} onChange={(event) => setValue(event.target.value)} placeholder={spec.placeholder} maxLength={4000} />
          : <input
              type={kind === PERSONAL_INTAKE_KIND.DATE ? "date" : kind === PERSONAL_INTAKE_KIND.NUMBER ? "text" : "text"}
              inputMode={kind === PERSONAL_INTAKE_KIND.NUMBER ? "numeric" : kind === PERSONAL_INTAKE_KIND.URL ? "url" : undefined}
              dir={kind === PERSONAL_INTAKE_KIND.URL || kind === PERSONAL_INTAKE_KIND.DATE ? "ltr" : "rtl"}
              value={value}
              onChange={(event) => setValue(kind === PERSONAL_INTAKE_KIND.NUMBER ? event.target.value.replace(/[^0-9]/g, "") : event.target.value)}
              placeholder={spec.placeholder}
              maxLength={kind === PERSONAL_INTAKE_KIND.URL ? 1200 : 300}
            />}
      </label>}

      {busy && kind === PERSONAL_INTAKE_KIND.FILE ? <div className="sod29-personal-intake-progress" role="status">
        <span style={{ "--progress": `${progress}%` }} /><small>{progress ? `מעלה… ${progress}%` : "מכין העלאה פרטית…"}</small>
      </div> : null}

      <div className="sod29-personal-intake-actions">
        <button className="sod29-action primary" type="button" disabled={!canSave || busy} onClick={save}>{busy ? "שומר…" : "שמור אצלי"}</button>
        <small>פרטי כברירת מחדל. שמירה כאן אינה פרסום, תרומה או אישור מחקרי.</small>
      </div>

      {message ? <div className={`sod29-personal-intake-message ${message.kind}`} role="status">{message.text}</div> : null}

      <div className="sod29-personal-intake-list">
        <div className="sod29-workspace-section-head"><strong>נשמרו אצלי</strong><small>{items.length ? `${items.length} פריטים` : "עדיין ריק"}</small></div>
        {items.slice(0, 12).map((item) => <article key={item.id}>
          <span className="kind">{itemKindLabel(item.intake_kind)}</span>
          <div><strong>{item.title || "פריט אישי"}</strong><small>{item.artifact?.mime || "פרטי · Research Workspace"}</small></div>
          <div className="actions">
            {item.artifact?.storage_object_id ? <button type="button" onClick={() => openMedia(item)}>פתח</button> : null}
            <button type="button" onClick={() => remove(item)}>הסר</button>
          </div>
        </article>)}
        {!items.length ? <p className="empty">כל מה שתשמרו כאן יופיע ב״המחקר שלי״ ויוכל להמשיך אחר כך למסע או למחקר — בלי לפרסם אותו.</p> : null}
      </div>
    </div> : null}
  </section>;
}
