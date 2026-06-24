import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { checkImageConnections, deleteGalleryImage, setImageCuration } from "../lib/supabase.js";

// ===== מודל עריכה מלא לתמונה =====
// Props:
//   image          — אובייקט מ-gallery_images
//   onSave(patch)  — שמור שינויים (patch = רק שדות שהשתנו)
//   onClose()      — סגור ללא שמירה
//   onDelete(id)   — אחרי מחיקה מוצלחת
//   onRemoveFromStream() — הוצא מזרם המציאות (source=manual)

const TYPES = [
  { key: "hint",     label: "💡 רמז",      color: "#e9c84a" },
  { key: "gematria", label: "🔢 גימטריה",  color: "#7bbf7b" },
  { key: "method",   label: "📐 שיטה",     color: "#80b4ff" },
  { key: "event",    label: "📰 אירוע",    color: "#f4a56a" },
  { key: "gallery",  label: "🖼 כללי",     color: "#b08fff" },
];

export default function ImageEditModal({ image: im, onSave, onClose, onDelete, onRemoveFromStream }) {
  const [name, setName] = useState(im.name || "");
  const [description, setDescription] = useState((im.description || "").replace(/<[^>]+>/g, ""));
  const [occurredAt, setOccurredAt] = useState(im.occurred_at ? im.occurred_at.slice(0, 10) : "");
  const [primaryValue, setPrimaryValue] = useState(im.primary_value ?? "");
  const [allValues, setAllValues] = useState((im.all_values || []).join(", "));
  const [imageType, setImageType] = useState(im.image_type || "");
  const [importance, setImportance] = useState(im.importance ?? 3);
  const [curatorHidden, setCuratorHidden] = useState(!!im.curator_hidden);
  const [saving, setSaving] = useState(false);

  const [deleteStep, setDeleteStep] = useState(null);
  const [connections, setConnections] = useState([]);

  async function handleSave() {
    setSaving(true);
    const patch = {};
    if (name !== (im.name || "")) patch.name = name || null;
    if (description !== (im.description || "").replace(/<[^>]+>/g, "")) patch.description = description || null;
    const newOcc = occurredAt ? new Date(occurredAt).toISOString() : null;
    if (occurredAt !== (im.occurred_at ? im.occurred_at.slice(0, 10) : "")) patch.occurred_at = newOcc;
    const pv = primaryValue !== "" ? Number(primaryValue) : null;
    if (pv !== im.primary_value) patch.primary_value = pv;
    const parsedAll = allValues.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (JSON.stringify(parsedAll) !== JSON.stringify(im.all_values || [])) patch.all_values = parsedAll;
    if (imageType !== (im.image_type || "")) patch.image_type = imageType || null;
    if (importance !== (im.importance ?? 3)) patch.importance = Number(importance);
    if (curatorHidden !== !!im.curator_hidden) patch.curator_hidden = curatorHidden;
    await onSave(patch);
    setSaving(false);
  }

  async function handleAddToStream() {
    setSaving(true);
    try {
      await setImageCuration(im.id, { source: "update" });
      onSave({ source: "update" });
    } catch(e) { alert("שגיאה: " + e.message); }
    setSaving(false);
  }

  async function handleDeleteClick() {
    setDeleteStep("checking");
    const refs = await checkImageConnections(im.id, im.image_url);
    setConnections(refs);
    setDeleteStep(refs.length > 0 ? "warn" : "confirm");
  }

  async function handleDeleteConfirm() {
    setDeleteStep("deleting");
    try {
      await deleteGalleryImage(im.id);
      if (onDelete) onDelete(im.id);
      onClose();
    } catch (e) {
      alert("שגיאה במחיקה: " + e.message);
      setDeleteStep(null);
    }
  }

  const typeLabel = { topic: "התכנסות", post: "פוסט", insight: "חידוש" };
  const inStream = im.source === "update";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.76)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#12101c", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 18, padding: "22px 26px", width: "100%", maxWidth: 540, direction: "rtl", display: "flex", flexDirection: "column", gap: 14, my: 20, maxHeight: "92vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {im.image_url && <img src={im.image_url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#d4af37", fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>✏️ עריכת תמונה</div>
            <div style={{ color: "#ffffff55", fontFamily: F.heading, fontSize: 11, marginTop: 2 }}>
              שינויים = בכל הגלריות · {inStream ? "🌊 בזרם" : "📁 לא בזרם"}
              {im.primary_value && (
                <Link to={`/number/${im.primary_value}`} onClick={onClose} style={{ color: "#d4af37", marginInlineStart: 8, textDecoration: "none" }}>→ /number/{im.primary_value}</Link>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff55", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* מסך מחיקה */}
        {(deleteStep === "warn" || deleteStep === "confirm" || deleteStep === "checking" || deleteStep === "deleting") ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {deleteStep === "checking" && <div style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 14, textAlign: "center", padding: "16px 0" }}>בודק חיבורים...</div>}
            {deleteStep === "warn" && (
              <>
                <div style={{ background: "rgba(220,60,60,0.15)", border: "1px solid rgba(220,80,80,0.5)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ color: "#ff8080", fontFamily: F.heading, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>⚠️ התמונה מופיעה במקומות אחרים</div>
                  <ul style={{ margin: 0, padding: "0 18px", color: "#ffcccc", fontFamily: F.heading, fontSize: 12.5, lineHeight: 1.8 }}>
                    {connections.map((c, i) => <li key={i}><span style={{ color: "#ffaaaa" }}>{typeLabel[c.type] || c.type}: </span>{c.label}</li>)}
                  </ul>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setDeleteStep(null)} style={secBtn}>בטל</button>
                  <button onClick={() => setDeleteStep("confirm")} style={dangerBtn}>בכל זאת למחוק</button>
                </div>
              </>
            )}
            {deleteStep === "confirm" && (
              <>
                <div style={{ color: "#ff8080", fontFamily: F.heading, fontWeight: 800, fontSize: 15, textAlign: "center" }}>אישור סופי — מחיקה בלתי הפיכה</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => setDeleteStep(null)} style={secBtn}>ביטול</button>
                  <button onClick={handleDeleteConfirm} style={{ ...dangerBtn, background: "rgba(200,40,40,0.85)", color: "#fff" }}>כן, מחק</button>
                </div>
              </>
            )}
            {deleteStep === "deleting" && <div style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 14, textAlign: "center", padding: "16px 0" }}>מוחק...</div>}
          </div>
        ) : (
          <>
            {/* === שם + תיאור === */}
            <div style={section}>
              <label style={labelStyle}>
                <span style={labelText}>שם / כותרת</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="שם התמונה" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                <span style={labelText}>תיאור</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="תיאור..." style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} />
              </label>
            </div>

            {/* === מספרים === */}
            <div style={section}>
              <div style={secTitle}>🔢 מספרים</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>
                  <span style={labelText}>מספר דומיננטי</span>
                  <input type="number" value={primaryValue} onChange={e => setPrimaryValue(e.target.value)} placeholder="מספר" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>כל המספרים (בפסיק)</span>
                  <input value={allValues} onChange={e => setAllValues(e.target.value)} placeholder="1820, 1620, ..." style={inputStyle} />
                </label>
              </div>
            </div>

            {/* === תאריך === */}
            <div style={section}>
              <div style={secTitle}>📅 תאריך אירוע</div>
              <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
            </div>

            {/* === סוג תמונה === */}
            <div style={section}>
              <div style={secTitle}>🏷️ סוג תמונה</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                <button onClick={() => setImageType("")} style={typeBtn("", imageType)}>ללא סיווג</button>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => setImageType(t.key)} style={{
                    cursor: "pointer", border: `1px solid ${imageType === t.key ? t.color : "rgba(255,255,255,0.2)"}`,
                    borderRadius: 999, padding: "5px 13px", background: imageType === t.key ? t.color + "22" : "rgba(0,0,0,0.3)",
                    color: imageType === t.key ? t.color : "#ffffffaa", fontFamily: F.heading, fontWeight: 700, fontSize: 12,
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* === חשיבות === */}
            <div style={section}>
              <div style={secTitle}>⭐ חשיבות (1–5)</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setImportance(n)} style={{
                    cursor: "pointer", width: 34, height: 34, borderRadius: "50%", fontFamily: F.heading, fontWeight: 800, fontSize: 13,
                    border: `1px solid ${importance >= n ? "#d4af37" : "rgba(255,255,255,0.2)"}`,
                    background: importance >= n ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.3)",
                    color: importance >= n ? "#d4af37" : "#ffffff55",
                  }}>{n}</button>
                ))}
              </div>
            </div>

            {/* === הגדרות נוספות === */}
            <div style={section}>
              <div style={secTitle}>⚙️ הגדרות</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={curatorHidden} onChange={e => setCuratorHidden(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#d4af37" }} />
                  <span style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 12.5 }}>מוסתר מהגלריה</span>
                </label>
                <span style={{ color: inStream ? "#7bbf7b" : "#ffffff55", fontFamily: F.heading, fontSize: 12.5 }}>
                  {inStream ? "🌊 בזרם המציאות" : "📁 בגלריה בלבד"}
                </span>
              </div>
            </div>

            {/* === כפתורי פעולה === */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", gap: 7 }}>
                {onRemoveFromStream && (
                  <button onClick={() => onRemoveFromStream()} style={secBtn}>↩ הוצא מהזרם</button>
                )}
                {!inStream && (
                  <button onClick={handleAddToStream} disabled={saving} style={{ ...secBtn, color: "#7bbf7b", borderColor: "#7bbf7b55" }}>🌊 הכנס לזרם</button>
                )}
                {onDelete && (
                  <button onClick={handleDeleteClick} style={{ ...secBtn, color: "#ff7070", borderColor: "#ff707055" }}>🗑 מחק</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={secBtn}>בטל</button>
                <button onClick={handleSave} disabled={saving} style={saveBtn}>{saving ? "שומר..." : "💾 שמור"}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const section = { display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px" };
const secTitle = { color: "#ffffff88", fontFamily: "var(--font-heading, sans-serif)", fontSize: 11.5, fontWeight: 700, marginBottom: 2 };
const labelStyle = { display: "flex", flexDirection: "column", gap: 4 };
const labelText = { color: "#ffffff88", fontFamily: "var(--font-heading, sans-serif)", fontSize: 11 };
const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
const secBtn = { cursor: "pointer", background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffffaa", fontFamily: "var(--font-heading, sans-serif)", fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px" };
const dangerBtn = { cursor: "pointer", background: "rgba(220,60,60,0.18)", border: "1px solid rgba(220,80,80,0.45)", color: "#f08080", fontFamily: "var(--font-heading, sans-serif)", fontWeight: 800, fontSize: 12.5, borderRadius: 8, padding: "7px 14px" };
const saveBtn = { cursor: "pointer", background: "rgba(212,175,55,0.9)", color: "#1a0e00", border: "none", fontFamily: "var(--font-heading, sans-serif)", fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "7px 22px", opacity: 1 };
const typeBtn = (key, active) => ({ cursor: "pointer", border: `1px solid ${active === key ? "#ffffff88" : "rgba(255,255,255,0.15)"}`, borderRadius: 999, padding: "5px 12px", background: active === key ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.3)", color: active === key ? "#fff" : "#ffffff66", fontFamily: "var(--font-heading, sans-serif)", fontWeight: 700, fontSize: 12 });
