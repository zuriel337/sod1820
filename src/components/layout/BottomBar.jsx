import React from "react";
import { useLocation } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { useUserCenter } from "../../lib/userCenter/UserCenterContext.jsx";
import { useNumberDrawer, toggleNumberDrawer } from "../../lib/numberDrawer.js";
import { useSiteUpdates, toggleSiteUpdates, isSiteUpdatesRoute } from "../../lib/siteUpdates.js";
import { isBottomBarRoute } from "../../lib/bottomBar.js";

// 🧭 Bottom Bar — Experience Shell קבוע (SOD1820 BOTTOM BAR V1).
// חשוב: launcher-shell בלבד — לא engine/store/ניווט מקביל, לא יכולת-ידע חדשה.
// כל כפתור כאן קורא לפונקציית-פתיחה גלובלית שכבר קיימת (numberDrawer.js / siteUpdates.js) —
// אין כאן שום state/data עצמאי לגבי המספר או העדכונים עצמם.
// מסלולי-הצגה/הרחבות עתידיות מתועדים ב-lib/bottomBar.js (מקור-אמת יחיד).
export default function BottomBar() {
  const { pathname } = useLocation();
  const P = usePalette();
  const { isOpen: userCenterOpen } = useUserCenter();
  const { open: numberOpen } = useNumberDrawer();
  const { open: updatesOpen } = useSiteUpdates();

  if (!isBottomBarRoute(pathname)) return null;

  const dark = P.mode !== "light";
  const showUpdates = isSiteUpdatesRoute(pathname);

  const items = [
    { id: "number", icon: "🧮", label: "מספר", active: numberOpen, onClick: () => toggleNumberDrawer() },
    showUpdates && { id: "updates", icon: "📣", label: "עדכונים", active: updatesOpen, onClick: () => toggleSiteUpdates() },
  ].filter(Boolean);

  return (
    <nav
      className="sod-bottombar"
      aria-label="סרגל תחתון"
      dir="rtl"
      style={{ opacity: userCenterOpen ? 0 : 1, pointerEvents: userCenterOpen ? "none" : "auto" }}
    >
      <style>{CSS(dark)}</style>
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          className={"sbb-item" + (it.active ? " on" : "")}
          aria-pressed={!!it.active}
          onClick={it.onClick}
        >
          <span className="sbb-i" aria-hidden>{it.icon}</span>
          <span className="sbb-l">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

const CSS = (dark) => `
.sod-bottombar{position:fixed;z-index:500;inset-inline:0;bottom:0;
  display:flex;justify-content:center;gap:6px;padding:6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
  background:${dark ? "rgba(12,8,18,0.94)" : "rgba(255,255,255,0.96)"};
  border-top:1px solid ${dark ? "rgba(212,175,55,0.22)" : "rgba(120,90,20,0.16)"};
  box-shadow:0 -6px 22px rgba(0,0,0,${dark ? ".45" : ".12"});
  backdrop-filter:blur(8px);transition:opacity .18s ease}
.sbb-item{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  flex:0 1 92px;min-width:64px;min-height:44px;padding:6px 10px;border:none;border-radius:12px;
  background:transparent;cursor:pointer;font-family:${F.heading};
  color:${dark ? "#cbb98a" : "#5b4a12"};transition:background .15s,color .15s}
.sbb-item:hover{background:${dark ? "rgba(212,175,55,0.10)" : "rgba(154,120,24,0.08)"}}
.sbb-item.on{background:${dark ? "rgba(212,175,55,0.18)" : "rgba(154,120,24,0.14)"};color:${dark ? "#f6e27a" : "#3a2a00"}}
.sbb-i{font-size:19px;line-height:1}
.sbb-l{font-size:11px;font-weight:800}
@media (max-width:380px){.sbb-item{flex:1 1 auto;min-width:0}}
@media (prefers-reduced-motion:reduce){.sod-bottombar{transition:none}}
`;
