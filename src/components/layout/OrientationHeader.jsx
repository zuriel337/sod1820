import React from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../../theme.js";
import { usePalette } from "../../lib/palette.js";
import { useShellContext, useShellNavigation } from "../../lib/shell/useShellContext.js";

// 🧭 Global Orientation Header — "WHERE AM I?" (System Frame Contract v2 addendum §3.1).
//
// The minimal current-focus projection of the Adaptive Shell. It reads the shared
// spine (route + existing Research Context) and renders orientation only:
// current focus, active lens, the research root when it differs from here, and the
// exact return target. It performs no search, owns no truth, and is not the category menu.
//
// Overlay/clearance declaration (system frame v1 "Overlay and clearance law"):
// this surface is IN-FLOW under the Navbar — no fixed positioning, no viewport-bottom
// usage, no z-index layer. It therefore cannot collide with the Bottom Dock, the
// Number drawer, the live-updates panel or the User Center, and needs no clearance.
export default function OrientationHeader() {
  const navigate = useNavigate();
  const P = usePalette();
  const shell = useShellContext();
  const { goRoot, goReturn } = useShellNavigation();
  const dark = P.mode !== "light";

  const showRoot = shell.rootDiffers && shell.root?.href;
  const showReturn = Boolean(shell.returnTo?.href);

  return (
    <div className="sod-orient" dir="rtl" data-testid="orientation-header">
      <style>{CSS(dark)}</style>
      <span className="so-kind">{shell.kind}</span>
      <span className="so-sep" aria-hidden>›</span>
      <strong className="so-focus" title={shell.label}>{shell.label}</strong>
      {shell.lensLabel && <span className="so-lens">עדשה · {shell.lensLabel}</span>}
      {showRoot && (
        <button type="button" className="so-chip" onClick={() => goRoot(shell.root, navigate)}>
          ↩ <span>{shell.rootLabel}</span>
        </button>
      )}
      {showReturn && (
        <button type="button" className="so-chip" onClick={() => goReturn(shell.returnTo, shell.lens, navigate)}>
          ↩ <span>{shell.returnTo.label || "חזרה"}</span>
        </button>
      )}
    </div>
  );
}

// Tokens follow the existing shell language (gold accent, thin rail, glass) so this
// reads as the same system as the Dock — not a new visual identity.
// Both themes are defined explicitly (city_background_dual_theme_law §3): in light
// mode the text is near-black brown so it stays readable over the city background.
const CSS = (dark) => `
.sod-orient{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden;
  padding:6px max(10px, env(safe-area-inset-right, 0px)) 6px max(10px, env(safe-area-inset-left, 0px));
  font-family:${F.ui};font-size:11.5px;line-height:1.4;
  background:${dark ? "rgba(12,8,18,0.62)" : "rgba(255,255,255,0.82)"};
  border-block-end:1px solid ${dark ? "rgba(212,175,55,0.16)" : "rgba(120,90,20,0.16)"};
  color:${dark ? "#cbb98a" : "#33260a"}}
.so-kind{flex:0 0 auto;font-size:10px;letter-spacing:.4px;opacity:.8}
.so-sep{flex:0 0 auto;opacity:.5}
.so-focus{flex:0 1 auto;min-width:0;font-size:12px;font-weight:750;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:${dark ? "#f2e4bb" : "#33260a"}}
.so-lens{flex:0 0 auto;font-size:10px;padding:1px 7px;border-radius:999px;
  background:${dark ? "rgba(212,175,55,0.12)" : "rgba(154,120,24,0.10)"};
  color:${dark ? "#d4b36a" : "#6d4e0b"};white-space:nowrap}
.so-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;max-width:44vw;
  min-height:28px;padding:2px 9px;border-radius:999px;cursor:pointer;
  font-family:${F.ui};font-size:10.5px;
  border:1px solid ${dark ? "rgba(212,175,55,0.22)" : "rgba(120,90,20,0.20)"};
  background:transparent;color:${dark ? "#d4b36a" : "#6d4e0b"}}
.so-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.so-chip:hover{background:${dark ? "rgba(212,175,55,0.10)" : "rgba(154,120,24,0.08)"}}
@media (max-width:400px){.so-kind{display:none}.so-sep{display:none}.so-chip{max-width:38vw}}
`;
