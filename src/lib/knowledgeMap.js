export const KNOWLEDGE_WORLDS = [
  {
    title: "✨ לגלות",
    kicker: "ידע קיים + הדלתות שנפתחות",
    stat: "1,283 פוסטים · 2013–2026",
    items: [
      { label: "כל הפוסטים", emoji: "📜", to: "/post", note: "ארכיון הידע החי" },
      { label: "גלריות ומדיה", emoji: "🖼️", to: "/archive?tab=galleries", note: "2,558 פריטי גלריה" },
      { label: "נושאים", emoji: "✦", to: "/archive", note: "212 כרטיסי נושא" },
      { label: "מסעות גילוי", emoji: "🧭", locked: true, state: "בקרוב", note: "מסע מודרך בין קשרים" },
      { label: "מסעות תלת־ממדיים", emoji: "◈", locked: true, state: "בקרוב", note: "להיכנס אל תוך הידע" },
      { label: "גלקסיות גילוי", emoji: "✺", locked: true, state: "בקרוב", note: "עולמות ידע מחוברים" },
    ],
  },
  {
    title: "🔢 מספרים",
    kicker: "מנוע מחקר רב־שכבתי",
    stat: "36 שיטות · 15,474 ביטויים · 8,917 התכנסויות",
    items: [
      { label: "דף המספר", emoji: "🔢", to: "/number", note: "מספר → ביטויים → קשרים" },
      { label: "מחשבון מקצועי", emoji: "🧮", to: "/research?tool=gematria", note: "חישוב והשוואת שיטות" },
      { label: "גימטריה מרחבית", emoji: "🧊", to: "/spatial-gematria", note: "המספר כמבנה" },
      { label: "השוואה רב־ממדית", emoji: "⇄", locked: true, state: "בפיתוח", note: "שיטות כשכבות של אותו אובייקט" },
      { label: "Gematria 3D", emoji: "◫", locked: true, state: "בקרוב", note: "לנוע בין שכבות החישוב" },
      { label: "מחקר מספר עם רזיאל", emoji: "AI", locked: true, state: "בקרוב", note: "מספר → אדם → פסוק → צופן" },
    ],
  },
  {
    title: "🔠 צפנים · ELS",
    kicker: "מהמטריצה אל מערכת קשרים",
    stat: "129 רשומות ELS",
    items: [
      { label: "דילוגי אותיות", emoji: "🔠", to: "/code", icon: "dilugim", note: "חיפוש ומטריצות" },
      { label: "ספריית צפנים", emoji: "▦", to: "/archive", note: "מחקרים וממצאים קיימים" },
      { label: "חיפוש שמות ואנשים", emoji: "👤", locked: true, state: "בפיתוח", note: "שם כחלק מחיפוש רחב" },
      { label: "מטריצות רב־שכבתיות", emoji: "≋", locked: true, state: "בקרוב", note: "שכבות מעל ומתחת" },
      { label: "ELS 3D", emoji: "◈", locked: true, state: "בקרוב", note: "מסע מרחבי בתוך הצופן" },
      { label: "רזיאל מנתח קשרים", emoji: "AI", locked: true, state: "בקרוב", note: "ניתוח קשרים בין שכבות" },
    ],
  },
  {
    title: "📚 ספרים ומקורות",
    kicker: "לא רק לקרוא ספר עתיק — להיכנס לתוכו",
    stat: "23,204 פסוקים · 304,805 רשומות טקסט",
    items: [
      { label: "בית המדרש", emoji: "📖", to: "/beit-midrash", note: "טקסט, פסוק ושיטות" },
      { label: "מקורות וטקסטים", emoji: "▤", to: "/beit-midrash", note: "חיפוש ולימוד במקורות" },
      { label: "ספרים סרוקים", emoji: "📚", locked: true, state: "מדידה בהכנה", note: "מונה ספרים יופיע רק ממקור קנוני" },
      { label: "ניתוח ספר עם רזיאל", emoji: "AI", locked: true, state: "בקרוב", note: "שמות, מספרים, פסוקים וקשרים" },
      { label: "השוואה בין ספרים", emoji: "⇄", locked: true, state: "בקרוב", note: "רעיונות ומקורות בין תקופות" },
      { label: "ספר בתלת־ממד", emoji: "◈", locked: true, state: "בקרוב", note: "ספר כיקום ידע" },
    ],
  },
  {
    title: "🗃️ ארכיון הידע",
    kicker: "אותו ידע — הרבה דרכי כניסה",
    stat: "14 שנות תוכן · 1,177 פוסטים היסטוריים",
    items: [
      { label: "לפי שנים", emoji: "🕰️", to: "/post", note: "2013–2026" },
      { label: "לפי קטגוריות", emoji: "▦", to: "/post", note: "מפת התוכן הקיימת" },
      { label: "לפי נושאים", emoji: "✦", to: "/archive", note: "נושא → תוכן → קשרים" },
      { label: "לפי אנשים ושמות", emoji: "👤", locked: true, state: "בפיתוח", note: "כל מה שהאתר יודע על אדם" },
      { label: "לפי מספרים", emoji: "🔢", to: "/number", note: "כניסה לארכיון דרך מספר" },
      { label: "לפי פסוקים וצפנים", emoji: "⌘", locked: true, state: "בקרוב", note: "מקור → צופן → מחקר" },
    ],
  },
  {
    title: "💬 קהילה",
    kicker: "מה קורה עכשיו ומה ייפתח בהמשך",
    stat: "1,876 עדכונים · 30 תורמים",
    items: [
      { label: "הצ׳אט", emoji: "💬", to: "/community/chat", note: "השיחה החיה באתר" },
      { label: "חוקרים ותורמים", emoji: "👥", to: "/community", note: "אנשים סביב גוף הידע" },
      { label: "התכנסויות", emoji: "◉", locked: true, state: "בקרוב", note: "מפגשים סביב נושא או מחקר" },
      { label: "התכנסויות חיות", emoji: "●", locked: true, state: "בקרוב", note: "מרחב חי בזמן אמת" },
      { label: "מחקר משותף", emoji: "⌁", locked: true, state: "בקרוב", note: "כמה חוקרים, גוף ידע אחד" },
      { label: "פורום חדש", emoji: "🌐", locked: true, state: "בקרוב", note: "קהילה מחוברת למחקר" },
    ],
  },
];

export const QUICK_NAV_GROUPS = [
  { title: "🔬 לחקור", items: [
    { label:"דף המספר", emoji:"🔢", to:"/number" },
    { label:"בית המדרש", emoji:"📖", to:"/beit-midrash" },
    { label:"דילוגי אותיות", emoji:"🔠", to:"/code", icon:"dilugim" },
    { label:"מחשבון מקצועי", emoji:"🧮", to:"/research?tool=gematria" },
  ]},
  { title: "✨ לגלות", items: [
    { label:"פוסטים", emoji:"📜", to:"/post" },
    { label:"גלריות", emoji:"🖼️", to:"/archive?tab=galleries" },
    { label:"מפת המערכת", emoji:"🗺️", to:"/map" },
  ]},
  { title: "💬 קהילה", items: [
    { label:"הצ׳אט", emoji:"💬", to:"/community/chat" },
    { label:"קהילה", emoji:"👥", to:"/community" },
  ]},
];

export const BUILD_PROGRESS = 66;
