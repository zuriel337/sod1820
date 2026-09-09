import React from "react";
import { BRAND_COPY, BRAND_IDENTITY } from "../lib/brandIdentity.js";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

export default function BrandEvolutionStory({ variant = "about" }) {
  const P = usePalette();
  const compact = variant === "contact";
  const body = compact ? BRAND_COPY.contactBody : BRAND_COPY.aboutBody;

  return (
    <section
      aria-label="סיפור המותג של כי לה׳ המלוכה"
      style={{
        direction: "rtl",
        maxWidth: compact ? 760 : 900,
        margin: compact ? "24px auto 8px" : "28px auto 30px",
        padding: compact ? "18px 18px" : "24px 22px",
        border: `1px solid ${P.borderStrong || P.border}`,
        borderRadius: 22,
        background: P.card,
        boxShadow: "0 16px 54px rgba(0,0,0,.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <img
          src={BRAND_IDENTITY.heritageMark.url}
          alt={BRAND_IDENTITY.heritageMark.labelHe}
          style={{ width: compact ? 74 : 94, height: compact ? 74 : 94, objectFit: "contain", flex: "0 0 auto" }}
        />
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ color: P.accentDim, fontFamily: F.ui, fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
            {BRAND_IDENTITY.storyLineHe}
          </div>
          <h2 style={{ margin: "5px 0 7px", color: P.accentText, fontFamily: F.display, fontSize: compact ? 23 : 30, lineHeight: 1.25 }}>
            {BRAND_COPY.aboutTitle}
          </h2>
          <p style={{ margin: 0, color: P.inkSoft, fontFamily: F.body, fontSize: compact ? 14 : 15.5, lineHeight: 1.9 }}>
            {body}
          </p>
        </div>
      </div>

      {!compact && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <span style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 10px", color: P.inkSoft, fontFamily: F.ui, fontSize: 12 }}>
            מורשת: הכתר המקורי נשמר
          </span>
          <span style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 10px", color: P.accentText, fontFamily: F.ui, fontSize: 12 }}>
            הדור הבא: כתר כחול־זהב
          </span>
          <span style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 10px", color: P.inkSoft, fontFamily: F.ui, fontSize: 12 }}>
            Motion / 3D: אותה זהות, ייצוג עשיר יותר
          </span>
        </div>
      )}
    </section>
  );
}
