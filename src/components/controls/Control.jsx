import React from "react";
import { usePalette } from "../../lib/palette.js";
import { controlBase, controlVisual, controlA11y, CONTROL_FOCUS_CSS } from "../../lib/controls/controlSpec.js";

// The family's focus ring is injected exactly once for the whole document rather than
// once per rendered control — a share row renders many controls and N identical <style>
// tags would be pure noise. Idempotent and safe to call from every instance.
let focusCssInjected = false;
function ensureFocusCss() {
  if (focusCssInjected || typeof document === "undefined") return;
  try {
    if (!document.getElementById("sod-ctl-focus")) {
      const el = document.createElement("style");
      el.id = "sod-ctl-focus";
      el.textContent = CONTROL_FOCUS_CSS;
      document.head.appendChild(el);
    }
    focusCssInjected = true;
  } catch { /* styling must never break a control */ }
}

// 🎛️ Control — the shared primitive for the canonical control family (W1 Slice 2, Scope A).
//
// It renders ONE control with a semantic role + state. It is deliberately a PRIMITIVE, not
// an action owner: it never knows what sharing, saving or adding-to-research means. The
// capability owners (ShareActions, ResearchProvider, UserCenter…) keep their behavior and
// simply stop re-inventing button geometry, states and focus rings.
//
// This is why QuickActions and DocActions are NOT merged into one component in this slice:
// they are different semantic families (entity actions vs document actions) that already
// route to the same capability owners, and they share appearance, not behavior.
// Convergence belongs here, at the primitive, rather than in a new global action owner.
//
// Renders <a> when given href, otherwise <button> — so a share channel stays a real link
// (middle-click, open-in-new-tab, and the browser's own affordances keep working).
export default function Control({
  role = "secondary",
  state = "default",
  compact = false,
  href = null,
  as = null,
  fontFamily = "inherit",
  style,
  children,
  ...rest
}) {
  const P = usePalette();
  ensureFocusCss();
  const Tag = as || (href ? "a" : "button");
  const a11y = controlA11y(state);
  // <a> has no disabled attribute; drop it and rely on ARIA + click suppression.
  if (Tag === "a") delete a11y.disabled;
  const inert = state !== "default" && state !== "hover" && state !== "focus";

  return (
    <Tag
      {...(href ? { href, target: rest.target ?? "_blank", rel: rest.rel ?? "noopener noreferrer" } : {})}
      {...(Tag === "button" ? { type: rest.type || "button" } : {})}
      {...a11y}
      {...rest}
      className={["sod-ctl", rest.className].filter(Boolean).join(" ")}
      onClick={inert ? (e) => e.preventDefault() : rest.onClick}
      style={{ ...controlBase({ compact, fontFamily }), ...controlVisual(P, role, state), ...style }}
    >
      {children}
    </Tag>
  );
}
