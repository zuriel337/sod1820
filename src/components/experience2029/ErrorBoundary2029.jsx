import React from "react";
import { use2029Palette } from "../../lib/palette2029.js";
import { TYPEFACE } from "../../lib/designTokens.js";
import { reportRuntimeIncident } from "../../lib/tracking.js";
import { isChunkLoadError, recoverFromChunkLoadError2029, subscribeAppRecovery2029 } from "../../lib/appRecovery2029.js";

// 2029 route boundary. A render error or a lazy chunk that disappeared after a new deployment must leave a usable
// page (reload + home), not a blank screen. Chunk-load failures go through lib/appRecovery2029 first: one automatic
// reload per build, then this fallback. Presentation uses the existing 2029 palette; no stylesheet is needed, so the
// fallback still renders when the missing chunk is the one that carries the CSS.
// Incident reporting reuses the shared capture (lib/tracking.js): in the public-reading release it is console-only.

const COPY = {
  reloading: { title: "מעדכנים את הדף", body: "יצאה גרסה חדשה של האתר. הדף נטען מחדש עכשיו.", role: "status" },
  exhausted: { title: "הדף לא נטען", body: "ייתכן שיצאה גרסה חדשה של האתר. רענון הדף יביא את הגרסה העדכנית. אם זה חוזר, אפשר לעבור לעמוד הבית ולנסות שוב בעוד רגע.", role: "alert" },
  generic: { title: "משהו השתבש בטעינת הדף", body: "הדף הזה לא נטען כראוי. אפשר לרענן אותו או לעבור לעמוד הבית.", role: "alert" },
};

function Fallback2029({ outcome }) {
  const P = use2029Palette();
  const copy = COPY[outcome] || COPY.generic;
  const action = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44, padding: "0 22px", boxSizing: "border-box", borderRadius: 999, fontFamily: TYPEFACE.ui, fontWeight: 800, fontSize: 15, textDecoration: "none", cursor: "pointer" };
  return (
    <main dir="rtl" lang="he" data-sod-boundary={outcome in COPY ? outcome : "generic"}
      style={{ minHeight: "62vh", display: "grid", placeItems: "center", padding: "48px 18px", boxSizing: "border-box", color: P.ink }}>
      <section role={copy.role} style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <h1 style={{ fontFamily: TYPEFACE.display, fontSize: "clamp(26px,6vw,40px)", margin: "0 0 12px", color: P.ink }}>{copy.title}</h1>
        <p style={{ color: P.inkSoft, lineHeight: 1.8, margin: "0 auto 22px", fontFamily: TYPEFACE.body, fontSize: 16 }}>{copy.body}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={() => window.location.reload()}
            style={{ ...action, border: `1px solid ${P.accent}`, background: P.accentBtn || P.accent, color: P.onAccent }}>רענון הדף</button>
          {/* A real document load: the next build's chunks, not another client-side attempt at the broken one. */}
          <a href="/" style={{ ...action, border: `1px solid ${P.borderStrong || P.border}`, background: "transparent", color: P.accentText }}>לעמוד הבית</a>
        </div>
      </section>
    </main>
  );
}

export default class ErrorBoundary2029 extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, outcome: null };
    this.unsubscribe = null;
  }

  static getDerivedStateFromError(error) {
    return { error: error ?? new Error("unknown"), outcome: isChunkLoadError(error) ? "reloading" : "generic" };
  }

  componentDidMount() {
    // A chunk failure nobody handled (unhandled rejection / uncaught error) after this build already reloaded once.
    this.unsubscribe = subscribeAppRecovery2029(error => this.setState({ error: error ?? new Error("chunk load failed"), outcome: "exhausted" }));
  }

  componentWillUnmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary2029 caught:", error, info?.componentStack);
    try {
      reportRuntimeIncident("error_boundary", error?.message || String(error || "unknown"), {
        name: error?.name || "Error",
        component_stack: info?.componentStack || "",
      });
    } catch { /* telemetry never affects the recovery UI */ }
    if (isChunkLoadError(error)) {
      let outcome = "exhausted";
      try { outcome = recoverFromChunkLoadError2029(error); } catch { /* recovery never throws into render */ }
      this.setState({ outcome: outcome === "reloading" ? "reloading" : "exhausted" });
    }
  }

  componentDidUpdate(previous) {
    // A new address is a new chance: leave the fallback when the pathname changes.
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, outcome: null });
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return <Fallback2029 outcome={this.state.outcome} />;
    }
    return this.props.children;
  }
}
