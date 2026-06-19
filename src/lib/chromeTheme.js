// ===== צבעי ה-chrome (Navbar + Footer) — תמה-מודעים =====
// כהה (dark) = הערכים הצרובים הקיימים בדיוק → אין שינוי במצב לילה.
// בהיר (light) = "קלף עתיק" — גווני קלף מיושנים במקום לבן סטרילי (בקשת צוריאל).
// כלל ברזל: כל טקסט עובר ניגודיות ≥4.5:1 מול הרקע שלו.

export function chromeColors(mode) {
  const dark = mode !== "light";
  return dark
    ? {
        // ── לילה (זהב-על-שחור — זהה למצב הקיים) ──
        bg: "rgba(5,4,0,0.9)",
        bgScrolled: "rgba(5,4,0,0.98)",
        border: "rgba(212,175,55,0.18)",
        borderGold: "rgba(212,175,55,0.38)",
        gold: "#d4af37",
        goldBright: "#f6e27a",
        goldLight: "#e8c840",
        goldDim: "#9a7818",
        muted: "#cfc9d6",
        surface: "#0d0a0e",
        chipBg: "rgba(8,5,2,0.6)",
        dropBg: "rgba(8,5,2,0.99)",
        catBg: "rgba(20,15,12,0.6)",
        activeBg: "rgba(212,175,55,0.12)",
        hoverBg: "rgba(212,175,55,0.08)",
        onGold: "#1a0e00",
        footBg: "linear-gradient(180deg, #140f0c 0%, #0d0a0e 100%)",
        footBorder: "rgba(212,175,55,0.18)",
        faint: "#1a0f0a",
        social: "#140f0c",
        crimson: "#7a1320",
        crimsonLight: "#a01f2e",
      }
    : {
        // ── יום ("קלף עתיק" — כריכת ספר מיושנת) ──
        bg: "#e7dcc0",            // קלף-תן מיושן (הדר)
        bgScrolled: "#e2d4b4",
        border: "#cdb98a",        // תפר הכריכה
        borderGold: "#bfa86a",
        gold: "#7a5e12",          // זהב-עתיק לאקסנטים/כפתורים
        goldBright: "#5a4612",    // כותרות/אקטיב — זהב כהה קריא (~7:1)
        goldLight: "#4a3c12",     // טקסט קלט (~8:1)
        goldDim: "#6b5a2e",       // קישורים משניים (~5:1)
        muted: "#5f5638",         // טקסט מעומעם (~5:1)
        surface: "#dccba2",       // רקע hover
        chipBg: "#ece0c4",        // רקע צ'יפ/כפתור
        dropBg: "#efe6cf",        // רקע תפריט נפתח
        catBg: "#e3d6b8",
        activeBg: "rgba(122,90,20,0.14)",
        hoverBg: "rgba(122,90,20,0.08)",
        onGold: "#fffaf0",        // טקסט על כפתור זהב
        footBg: "linear-gradient(180deg, #e2d4b0 0%, #d6c59c 100%)", // כריכה תחתונה
        footBorder: "#c9b384",
        faint: "#d8c9a4",
        social: "#e3d6b8",
        crimson: "#7a1320",       // תג AI אדום — קריא גם על קלף
        crimsonLight: "#a01f2e",
      };
}
