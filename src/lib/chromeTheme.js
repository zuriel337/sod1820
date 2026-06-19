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
        // ── יום: chrome "עור/עץ מיושן" — חום-כהה חמים (לא שחור), טקסט זהב-קרם.
        //    הגוף נשאר קרם בהיר; ה-chrome ממסגר אותו כמו כריכת ספר עתיקה כהה.
        bg: "#322617",            // חום-קפה כהה (הדר) — כהה אך חמים, לא שחור
        bgScrolled: "#291f12",
        border: "rgba(212,175,55,0.22)",
        borderGold: "rgba(212,175,55,0.42)",
        gold: "#c9a84a",          // זהב לאקסנטים/כפתורים
        goldBright: "#f0d68a",    // כותרות/אקטיב — זהב בהיר (~9:1)
        goldLight: "#e6cf86",     // טקסט קלט/קישורים בהירים
        goldDim: "#b89a55",       // משני
        muted: "#cfc2a4",         // טקסט מעומעם — קרם חם (~8:1)
        surface: "#3c3020",       // רקע hover
        chipBg: "rgba(30,24,14,0.7)",
        dropBg: "#2a2216",        // תפריט נפתח
        catBg: "rgba(44,35,20,0.75)",
        activeBg: "rgba(212,175,55,0.16)",
        hoverBg: "rgba(212,175,55,0.10)",
        onGold: "#2a1e00",        // טקסט כהה על כפתור זהב
        footBg: "linear-gradient(180deg, #322617 0%, #241a0e 100%)", // כריכה תחתונה כהה
        footBorder: "rgba(212,175,55,0.22)",
        faint: "rgba(212,175,55,0.12)",
        social: "#3c3020",
        crimson: "#7a1320",
        crimsonLight: "#a01f2e",
      };
}
