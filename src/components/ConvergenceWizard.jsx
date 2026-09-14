import React from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

// G2 2029 containment:
// The legacy wizard_build_convergence mega-writer is intentionally quiesced and is no longer
// allowed to define future Convergence/Topic authority. Preserve already-created legacy links as
// provenance, but do not expose a control that calls the frozen writer. The replacement experience
// will be designed later from One Reality + Research OS + Human Gate; this component does not invent it.
export default function ConvergenceWizard({ insight }) {
  const { isAdmin } = useAuth();
  const P = usePalette();
  if (!isAdmin || !insight) return null;

  const existing = insight.panel_data?.convergence_slug;
  if (existing) return (
    <a
      href={`/topic/${encodeURIComponent(existing)}`}
      title="התכנסות קיימת מהמערכת הישנה — נשמרת לצורך provenance עד ההחלפה"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        textDecoration: "none",
        background: P.blueBg || "rgba(0,0,0,0.03)",
        color: P.accentText,
        border: `1px solid ${P.borderStrong}`,
        borderRadius: 999,
        padding: "4px 11px",
        fontFamily: F.ui,
        fontSize: 11.5,
        fontWeight: 800,
      }}
    >
      ✦ התכנסות קיימת · legacy
    </a>
  );

  return (
    <span
      role="status"
      title="אשף ההתכנסויות הישן הוקפא ב-G2 כדי שלא יכתוב שוב לסמנטיקה הישנה. המחליף ייבנה על ארכיטקטורת 2029."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${P.border}`,
        borderRadius: 999,
        padding: "4px 11px",
        color: P.accentDim,
        background: P.blueBg || "rgba(0,0,0,0.03)",
        fontFamily: F.ui,
        fontSize: 11.5,
        fontWeight: 750,
        cursor: "not-allowed",
      }}
    >
      ⏸ אשף ההתכנסויות סגור · נבנה מחדש ל־2029
    </span>
  );
}
