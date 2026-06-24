import React, { useState } from "react";
import { F } from "../theme.js";

export default function ImageEditModal({ image: im, onSave, onClose, onRemoveFromStream }) {
  const [name, setName] = useState(im.name || "");
  const [description, setDescription] = useState((im.description || "").replace(/<[^>]+>/g, ""));
  const [occurredAt, setOccurredAt] = useState(im.occurred_at ? im.occurred_at.slice(0, 10) : "");
  const [primaryValue, setPrimaryValue] = useState(im.primary_value ?? "");
  const [saving, setSaving] = useState(false);

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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", marginTop: 4 }}>
          {onRemoveFromStream && (
            <button
              onClick={() => onRemoveFromStream()}
              style={{ background: "rgba(180,60,60,0.18)", border: "1px solid rgba(220,80,80,0.4)", color: "#f08080",
                fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
            >↩ הוצא מהזרם</button>
          )}
          <div style={{ display: "flex", gap: 8, marginRight: "auto" }}>
            <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.18)", color: "#ffffff99",
              fontFamily: F.heading, fontWeight: 700, fontSize: 12.5, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>בטל</button>
            <button onClick={handleSave} disabled={saving}
              style={{ background: "rgba(212,175,55,0.9)", color: "#1a0e00", border: "none",
                fontFamily: F.heading, fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "7px 20px", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "שומר..." : "💾 שמור"}
            </button>
          </div>
        </div>
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
