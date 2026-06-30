import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { isToolReady, UPGRADE_MSG } from "../../lib/hub/ready.js";

// 🧪 LabDock — דוק-כלים תחתון קבוע (Research OS · Shell גלובלי).
// «אותם דפים, מעטפת אחת»: הדוק חי מחוץ לראוטים → לא קופץ במעבר בין כלים.
// כלי-זהב בלבד (החזקים, בכבוד); השאר תחת «עוד». מובייל-first (ניווט תחתון + safe-area).
const TOOLS = [
  { id: "journey",  icon: "🧭", label: "מסע",    to: "/research?tool=journey" },
  { id: "gematria", icon: "🧮", label: "מחשבון", to: "/research?tool=gematria" },
  { id: "els",      icon: "🔡", label: "צופן",   to: "/research?tool=els" },
  { id: "number",   icon: "🔢", label: "מספר",   to: "/number" },
  { id: "midrash",  icon: "📜", label: "מדרש",   to: "/research?tool=midrash" },
  { id: "more",     icon: "➕", label: "עוד",    to: "/research" },
];

// היכן הדוק מופיע — דפי-כלים/ישויות (לא בית/פוסטים). מעטפת המעבדה מעל אותם דפים.
const SHOW = /^\/(number|numbers|research|beit-midrash|archive|verse|name|gematria|חישוב|reveal)/;

// כלים פתוחים בדוק: מוכנים (מספר/מחשבון) + «עוד» (תפריט המעבדה). השאר — נעולים.
const dockReady = (id) => id === "more" || isToolReady(id);

export default function LabDock() {
  const { pathname, search } = useLocation();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  if (!SHOW.test(pathname)) return null;

  const tool = new URLSearchParams(search).get("tool");
  const activeId =
    pathname.startsWith("/research") ? (tool || "more")
    : pathname.startsWith("/number") || pathname.startsWith("/numbers") ? "number"
    : pathname.startsWith("/beit-midrash") ? "midrash"
    : null;

  const onPick = (t) => {
    if (!dockReady(t.id)) { setMsg(UPGRADE_MSG); setTimeout(() => setMsg(""), 2600); return; }
    nav(t.to);
  };

  return createPortal((
    <nav className="labdock" aria-label="כלי המעבדה">
      <style>{DOCK_CSS}</style>
      {msg && <div className="ld-toast">{msg}</div>}
      {TOOLS.map(t => {
        const locked = !dockReady(t.id);
        return (
          <button key={t.id} className={`ld-item${activeId === t.id ? " on" : ""}${locked ? " locked" : ""}`}
            onClick={() => onPick(t)} title={locked ? "בשדרוג — בקרוב" : t.label}>
            <span className="ld-i">{locked ? "🔒" : t.icon}</span>
            <span className="ld-l">{t.label}</span>
          </button>
        );
      })}
    </nav>
  ), document.body);
}

const DOCK_CSS = `
.labdock{position:fixed;z-index:48;left:50%;transform:translateX(-50%);
  bottom:calc(10px + env(safe-area-inset-bottom));
  font-family:'Heebo',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
  display:flex;gap:4px;padding:6px;border-radius:18px;direction:rtl;
  background:linear-gradient(180deg,rgba(24,17,9,.96),rgba(10,7,3,.96));
  border:1px solid rgba(212,175,55,.4);box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.3);
  backdrop-filter:blur(6px);max-width:calc(100vw - 20px)}
.ld-item{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;
  background:none;border:none;border-radius:13px;padding:7px 13px;min-width:54px;
  color:#c8b78a;font-family:inherit;transition:background .15s,color .15s}
.ld-item:hover{background:rgba(212,175,55,.12);color:#f6e27a}
.ld-item.on{background:linear-gradient(135deg,#f6dd92,#d4af37);color:#1a0e00}
.ld-i{font-size:19px;line-height:1}
.ld-l{font-size:11px;font-weight:800}
.ld-item.locked{opacity:.62}
.ld-item.locked:hover{background:rgba(255,255,255,.05);color:#c8b78a}
.ld-toast{position:absolute;top:-46px;left:50%;transform:translateX(-50%);white-space:nowrap;
  background:rgba(10,7,3,.97);border:1px solid rgba(212,175,55,.5);color:#f6e27a;
  font-family:inherit;font-size:13px;font-weight:700;padding:9px 16px;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.5)}
@media (max-width:560px){
  .labdock{left:8px;right:8px;transform:none;justify-content:space-between;gap:2px;padding:5px}
  .ld-item{padding:6px 6px;min-width:0;flex:1}
  .ld-l{font-size:10px}
}
`;
