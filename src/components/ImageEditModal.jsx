import React, { useState } from "react";
import { F } from "../theme.js";
import { checkImageConnections, deleteGalleryImage } from "../lib/supabase.js";

// onSave(patch)          — שמור שינויים
// onClose()              — סגור
// onDelete(id)           — אחרי מחיקה מוצלחת (לעדכן state בהורה)
// onRemoveFromStream()   — הוצא מזרם המציאות (מחזיר ל-manual)
export default function ImageEditModal({ image: im, onSave, onClose, onDelete, onRemoveFromStream }) {
  const [name, setName] = useState(im.name || "");
  const [description, setDescription] = useState((im.description || "").replace(/<[^>]+>/g, ""));
  const [occurredAt, setOccurredAt] = useState(im.occurred_at ? im.occurred_at.slice(0, 10) : "");
  const [primaryValue, setPrimaryValue] = useState(im.primary_value ?? "");
  const [saving, setSaving] = useState(false);

  // מחיקה: שלב (null=רגיל, 'checking', 'warn', 'confirm', 'deleting')
  const [deleteStep, setDeleteStep] = useState(null);
  const [connections, setConnections] = useState([]);

  async function handleSave() {
    setSaving(true);
    const patch = {};
    if (name !== (im.name || "")) patch.name = name || null;
    if (description !== (im.description || "").replace(/<[^>]+>/g, "")) patch.description = description || null;
    const newOcc = occurredAt ? new Date(occurredAt).toISOString() : null;
    const oldOcc = im.occurred_at ? im.occurred_at.slice(0, 10) : "";
    if (occurredAt !== oldOcc) patch.occurred_at = newOcc;
    const pv = primaryValue !== "" ? Number(primaryValue) : null;
    if (pv !== im.primary_value) patch.primary_value = pv;
    await onSave(patch);
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

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#14101e", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 16,
          padding: "24px 28px", width: "100%", maxWidth: 480, direction: "rtl", display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {im.image_url && <img src={im.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ color: "#d4af37", fontFamily: F.heading, fontWeight: 800, fontSize: 13 }}>עריכת תמונה</div>
            <div style={{ color: "#ffffff55", fontFamily: F.heading, fontSize: 11 }}>שינויים משפיעים על כל הגלריות</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff66", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* מסך אזהרת מחיקה */}
        {(deleteStep === "warn" || deleteStep === "confirm" || deleteStep === "checking" || deleteStep === "deleting") ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {deleteStep === "checking" && (
              <div style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 14, textAlign: "center", padding: "16px 0" }}>
                בודק חיבורים...
              </div>
            )}

            {deleteStep === "warn" && (
              <>
                <div style={{ background: "rgba(220,60,60,0.15)", border: "1px solid rgba(220,80,80,0.5)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ color: "#ff8080", fontFamily: F.heading, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                    ⚠️ שים לב — התמונה מופיעה במקומות אחרים
                  </div>
                  <div style={{ color: "#ffaaaa", fontFamily: F.heading, fontSize: 12.5, marginBottom: 10 }}>
                    מחיקה תשבור את החיבורים הבאים:
                  </div>
                  <ul style={{ margin: 0, padding: "0 18px", color: "#ffcccc", fontFamily: F.heading, fontSize: 12.5, lineHeight: 1.8 }}>
                    {connections.map((c, i) => (
                      <li key={i}><span style={{ color: "#ffaaaa" }}>{typeLabel[c.type] || c.type}: </span>{c.label}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-start" }}>
                  <button
                    onClick={() => setDeleteStep(null)}
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffffaa",
                      fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                    בטל
                  </button>
                  <button
                    onClick={() => setDeleteStep("confirm")}
                    style={{ background: "rgba(220,60,60,0.25)", border: "1px solid rgba(220,80,80,0.6)", color: "#ff8080",
                      fontFamily: F.heading, fontWeight: 800, fontSize: 12.5, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                    בכל זאת למחוק
                  </button>
                </div>
              </>
            )}

            {deleteStep === "confirm" && (
              <>
                <div style={{ color: "#ff8080", fontFamily: F.heading, fontWeight: 800, fontSize: 15, textAlign: "center" }}>
                  אישור סופי — מחיקה בלתי הפיכה
                </div>
                <div style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 13, textAlign: "center" }}>
                  התמונה תימחק לצמיתות מהמאגר.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => setDeleteStep(null)}
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffffaa",
                      fontFamily: F.heading, fontWeight: 700, fontSize: 13, borderRadius: 8, padding: "9px 20px", cursor: "pointer" }}>
                    ביטול
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    style={{ background: "rgba(200,40,40,0.85)", border: "none", color: "#fff",
                      fontFamily: F.heading, fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "9px 20px", cursor: "pointer" }}>
                    כן, מחק לצמיתות
                  </button>
                </div>
              </>
            )}

            {deleteStep === "deleting" && (
              <div style={{ color: "#ffffffaa", fontFamily: F.heading, fontSize: 14, textAlign: "center", padding: "16px 0" }}>
                מוחק...
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Fields */}
            <label style={labelStyle}>
              <span style={labelText}>שם / כותרת</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="שם התמונה" style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelText}>תיאור</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="תיאור..." style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} />
            </label>

            <label style={labelStyle}>
              <span style={labelText}>תאריך האירוע</span>
              <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              <span style={labelText}>מספר דומיננטי</span>
              <input type="number" value={primaryValue} onChange={e => setPrimaryValue(e.target.value)} placeholder="מספר" style={inputStyle} />
            </label>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {onRemoveFromStream && (
                  <button
                    onClick={() => onRemoveFromStream()}
                    style={{ background: "rgba(180,60,60,0.18)", border: "1px solid rgba(220,80,80,0.4)", color: "#f08080",
                      fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>
                    ↩ הוצא מהזרם
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    style={{ background: "rgba(180,30,30,0.22)", border: "1px solid rgba(200,60,60,0.45)", color: "#ff7070",
                      fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>
                    🗑 מחק תמונה
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.18)", color: "#ffffff99",
                  fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>בטל</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ background: "rgba(212,175,55,0.9)", color: "#1a0e00", border: "none",
                    fontFamily: F.heading, fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "7px 20px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "שומר..." : "💾 שמור"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: 4 };
const labelText = { color: "#ffffffaa", fontFamily: "var(--font-heading, sans-serif)", fontSize: 12 };
const inputStyle = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8, padding: "8px 12px", color: "#fff", fontFamily: "inherit", fontSize: 14,
  outline: "none", width: "100%", boxSizing: "border-box",
};
