import React, { useState } from "react";
import { useLocation } from "react-router-dom";
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
  const [razielOpen, setRazielOpen] = useState(false);
  if (loading || !isAdmin) return null;
  if (/^\/(admin|login|profile|credits|buy)(\/|$)/.test(pathname)) return null;
  const ctx = contextFromPath(pathname);

  return (
    <aside className="rcb-wrap" dir="rtl" aria-label="סרגל הקשר — תצוגת מנהל">
      {razielOpen && (
        <section className="rcb-raziel-panel" aria-label="רזיאל — אבטיפוס">
          <div className="rcb-raziel-head"><span className="rcb-spark">✦</span><strong>רזיאל</strong><button onClick={() => setRazielOpen(false)} aria-label="סגור">×</button></div>
          <p>אני איתך ב־<b>{ctx.label}</b>.</p>
          <p className="rcb-muted">כאן יחיה ההקשר המחקרי המתמשך — בלי לשכפל את המידע שכבר מוצג בעמוד.</p>
          <button className="rcb-ask" type="button">שאל את רזיאל…</button>
        </section>
      )}
      <div className="rcb-islands">
        <button className="rcb-island rcb-context" type="button" title="Research Trail — אבטיפוס">
          <span className="rcb-kicker">{ctx.kind}</span><strong>{ctx.label}</strong><span className="rcb-chevron">‹</span>
        </button>
        <div className="rcb-island rcb-tools">
          <button type="button"><span>◇</span><span>עדשות</span></button>
          <button type="button"><span>◌</span><span>מסע</span></button>
          <button type="button" aria-label="עומק" title="עומק — אבטיפוס"><span>◎</span><span>עומק</span></button>
        </div>
        <button className={"rcb-island rcb-raziel" + (razielOpen ? " is-open" : "")} type="button" onClick={() => setRazielOpen(v => !v)}>
          <span className="rcb-spark">✦</span><span>רזיאל</span><i />
        </button>
      </div>
      <span className="rcb-admin-mark">ADMIN PREVIEW</span>
    </aside>
  );
}
