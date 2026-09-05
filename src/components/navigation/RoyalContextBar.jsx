import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import "./RoyalContextBar.css";

function contextFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "number" && parts[1]) return { kind: "מספר", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "topic" && parts[1]) return { kind: "נושא", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "journey" || parts[0] === "מסע") return { kind: "מסע", label: "המסע הנוכחי" };
  if (parts[0] === "lab" && parts[1] === "els") return { kind: "ELS", label: "מרחב הצופן" };
  if (parts[0] === "heichal" || parts[0] === "היכל") return { kind: "היכל", label: "היכל" };
  if (parts.length === 1 && !["admin","login","profile","credits","buy"].includes(parts[0])) return { kind: "פוסט", label: decodeURIComponent(parts[0]) };
  return { kind: "SOD1820", label: "מרחב המחקר" };
}

export default function RoyalContextBar() {
  const { isAdmin, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (loading || !isAdmin) return null;
  if (/^\/(admin|login|profile|credits|buy)(\/|$)/.test(pathname)) return null;

  const ctx = contextFromPath(pathname);
  return (
    <aside className="rcb-shell" dir="rtl" aria-label="סרגל הקשר — תצוגת מנהל">
      <div className="rcb-glow" />
      <div className="rcb-context">
        <span className="rcb-kicker">{ctx.kind}</span>
        <strong title={ctx.label}>{ctx.label}</strong>
        <span className="rcb-trail">הקשר נוכחי</span>
      </div>
      <button className="rcb-command" type="button" onClick={() => navigate("/number")} aria-label="חיפוש וניווט">
        <span className="rcb-command-icon">⌘</span>
        <span>חפש או עבור אל...</span>
        <kbd>/</kbd>
      </button>
      <div className="rcb-actions">
        <button type="button" className="rcb-lenses"><span>◇</span><span>עדשות</span></button>
        <button type="button" aria-label="שמירה" title="שמירה — אבטיפוס">☆</button>
        <button type="button" aria-label="אפשרויות נוספות" title="אפשרויות — אבטיפוס">•••</button>
      </div>
      <span className="rcb-admin-mark">ADMIN PREVIEW</span>
    </aside>
  );
}
