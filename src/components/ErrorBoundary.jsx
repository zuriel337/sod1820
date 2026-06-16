import React from "react";
import { C, F } from "../theme.js";

// מגן קריסות גלובלי — מונע "דף שחור" כשרכיב נופל. מציג הודעה + רענון, במקום מסך ריק.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  componentDidUpdate(prev) {
    // איפוס בשינוי route — כך שגלישה לדף אחר מתאוששת
    if (prev.routeKey !== this.props.routeKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ direction: "rtl", textAlign: "center", padding: "90px 24px", color: C.muted, fontFamily: F.body }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>🌀</div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>משהו נתקל בתקלה רגעית</div>
          <p style={{ fontSize: 15, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 18px" }}>
            הדף הזה לא נטען כראוי. אפשר לרענן או לחזור לעמוד הבית — שאר האתר תקין.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => window.location.reload()} style={{ cursor: "pointer", background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))", border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999, padding: "9px 20px", fontFamily: F.heading, fontWeight: 700 }}>רענן</button>
            <a href="/" style={{ textDecoration: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 999, padding: "9px 20px", fontFamily: F.heading }}>לעמוד הבית</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
