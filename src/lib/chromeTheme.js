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
        // ── יום: chrome בהיר אמיתי — קלף/קרם, טקסט זהב-כהה קריא (city_background_dual_theme_law).
        //    כלל ברזל: כל טקסט ≥4.5:1 מול הקרם. אין עוד chrome כהה במצב בהיר.
        bg: "#f4ecd8",            // קרם-קלף בהיר (תואם רקע-העיר)
        bgScrolled: "#efe4c8",
        border: "rgba(154,111,20,0.22)",
        borderGold: "rgba(154,111,20,0.45)",
        gold: "#a9791a",          // זהב לאקסנטים/כפתורים
        goldBright: "#7a5510",    // כותרות/אקטיב — זהב כהה (~6:1 על קרם)
        goldLight: "#8a6d1a",     // טקסט קלט/קישורים (~4.7:1)
        goldDim: "#93712a",       // משני (~4.5:1)
        muted: "#6b5a38",         // טקסט מעומעם — חום קריא (~5.8:1)
        surface: "#eadfc4",       // רקע hover
        chipBg: "rgba(154,111,20,0.10)",
        dropBg: "#f7f0de",        // תפריט נפתח בהיר
        catBg: "rgba(154,111,20,0.10)",
        activeBg: "rgba(154,111,20,0.16)",
        hoverBg: "rgba(154,111,20,0.10)",
        onGold: "#2a1e00",        // טקסט כהה על כפתור זהב
        footBg: "linear-gradient(180deg, #f4ecd8 0%, #eadfc4 100%)", // כריכה תחתונה בהירה
        footBorder: "rgba(154,111,20,0.22)",
        faint: "rgba(154,111,20,0.10)",
        social: "#eadfc4",
        crimson: "#7a1320",
        crimsonLight: "#a01f2e",
      };
}
