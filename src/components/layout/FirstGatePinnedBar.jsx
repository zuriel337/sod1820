import React from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { FIRST_GATE_HOME_HASH, useFirstGateCountdown } from "../../lib/firstGateMilestone.js";
import { useThemeMode } from "../../lib/themeMode.js";

const pad = n => String(n).padStart(2,"0");

export default function FirstGatePinnedBar() {
  const nav = useNavigate();
  const light = useThemeMode() === "light";
  const { open,d,h,m,s } = useFirstGateCountdown();
  const go = () => {
    if (window.location.pathname === "/") document.getElementById(FIRST_GATE_HOME_HASH)?.scrollIntoView({behavior:"smooth",block:"start"});
    else nav(`/#${FIRST_GATE_HOME_HASH}`);
  };
  return <button type="button" onClick={go} className={`fg-bar ${light?"is-light":""}`} aria-label="לצפייה בספירה לפתיחת השער הראשון">
    <span className="fg-bar-icon" aria-hidden>{open?"👑":"⌛"}</span>
    <span className="fg-bar-title">{open?"השער הראשון נפתח":"השער הראשון נפתח בעוד"}</span>
    {!open && <span className="fg-bar-time" dir="ltr">{d}d · {pad(h)}:{pad(m)}:{pad(s)}</span>}
    <span className="fg-bar-system">מערכת 2029</span>
    <span className="fg-bar-go">לצפייה ←</span>
    <style>{`
      .fg-bar{width:100%;min-height:38px;border:0;border-block:1px solid rgba(212,175,55,.28);background:linear-gradient(90deg,#0b0713,#211329 48%,#0b0713);color:#f6e7a8;display:flex;align-items:center;justify-content:center;gap:9px;padding:7px 14px;cursor:pointer;direction:rtl;font-family:${F.heading};position:relative;z-index:2}.fg-bar:hover{background:linear-gradient(90deg,#100a18,#2a1832 48%,#100a18)}.fg-bar.is-light{background:linear-gradient(90deg,#efe3c6,#e5d3a7 48%,#efe3c6);color:#33260a}.fg-bar-icon{font-size:18px;filter:drop-shadow(0 0 8px rgba(246,226,122,.5))}.fg-bar-title{font-size:12.5px;font-weight:900}.fg-bar-time{font-family:${F.mono};font-size:12.5px;font-weight:800;letter-spacing:.5px;color:#f6d86f}.is-light .fg-bar-time{color:#6d4e0b}.fg-bar-system{font-size:10.5px;opacity:.72;border-inline-start:1px solid currentColor;padding-inline-start:9px}.fg-bar-go{font-size:10.5px;font-weight:800;opacity:.8}@media(max-width:560px){.fg-bar{gap:6px;padding-inline:8px}.fg-bar-system,.fg-bar-go{display:none}.fg-bar-title{font-size:11.5px}.fg-bar-time{font-size:11.5px}}
    `}</style>
  </button>;
}
