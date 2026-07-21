import React, { useState } from "react";
import { moderateInsight, moderateContribution } from "../lib/moderation.js";
import { useAuth } from "../lib/AuthContext.jsx";

// 🛡️ <AdminModerate> — בקרת-מנהל קנונית להסתרה/מחיקה, לאדמין בלבד (canonical_ui_components_law).
// משמש בשני המקומות: חידושי הקהילה בבית-המדרש (kind="insight") ותרומות הפורום (kind="contribution").
// onDone(action) — נקרא אחרי הצלחה כדי שהעמוד יסיר/ירענן את הפריט.
export default function AdminModerate({ kind, id, onDone }) {
  const { isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!isAdmin || !id) return null;

  const run = async (action) => {
    if (busy) return;
    if (action === "delete" && !window.confirm("למחוק את הפריט לצמיתות? הפעולה אינה ניתנת לביטול.")) return;
    setBusy(true);
    try {
      const fn = kind === "insight" ? moderateInsight : moderateContribution;
      await fn(id, action);
      onDone && onDone(action);
    } catch (e) {
      alert("שגיאת מודרציה: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  // צבע-אפור מכוון שקריא גם על רקע בהיר (בית-המדרש) וגם כהה (פורום) — לא inherit (עלול להיבלע).
  const base = {
    cursor: busy ? "wait" : "pointer", background: "transparent", borderRadius: 999,
    border: "1px solid rgba(128,128,128,0.42)", color: "#8a8d94", opacity: busy ? 0.5 : 0.95,
    fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: "3px 10px", lineHeight: 1.4,
  };
  const del = { ...base, color: "#c0392b", borderColor: "rgba(192,57,43,0.5)" };

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }} title="בקרת מנהל">
      <span aria-hidden style={{ fontSize: 11, opacity: 0.55 }}>🛡️</span>
      <button type="button" style={base} disabled={busy} onClick={() => run("hide")}>🙈 הסתר</button>
      <button type="button" style={del} disabled={busy} onClick={() => run("delete")}>🗑 מחק</button>
    </span>
  );
}
