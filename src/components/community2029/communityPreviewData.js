// Fictional design fixtures only. Never ingest, persist, or treat these IDs as
// canonical people/messages. Live Community must use its authorized reader.
export const PREVIEW_PEOPLE = Object.freeze([
  { id: "example-noa", name: "נועה", initial: "נ", note: "אוהבת לפתוח שאלות ולשמוע זוויות חדשות" },
  { id: "example-ori", name: "אורי", initial: "א", note: "מתעניין בספרים ובמקורות" },
  { id: "example-maya", name: "מאיה", initial: "מ", note: "מחפשת חיבורים בין אנשים ורעיונות" },
  { id: "example-yonatan", name: "יונתן", initial: "י", note: "כאן כדי לשאול, לקרוא ולהשתתף" },
]);

export const PREVIEW_THREADS = Object.freeze([
  {
    id: "example-welcome", authorId: "example-noa", createdAt: "2026-10-05T10:15:00Z", likes: 8,
    body: "איזה כיף שיש מקום להמשיך בו את השיחות. מה הביא אתכם לקהילה — שאלה, ספר, או משהו שפשוט סקרן אתכם?",
    replies: [
      { id: "example-welcome-1", authorId: "example-ori", createdAt: "2026-10-05T10:32:00Z", body: "אצלי זה התחיל מקריאה בספר. דווקא השאלות שעלו בדרך גרמו לי להישאר." },
      { id: "example-welcome-2", authorId: "example-maya", createdAt: "2026-10-05T10:48:00Z", body: "האנשים. לפעמים תגובה אחת נותנת כיוון שלא חשבתי עליו קודם.", replyTo: "example-welcome-1" },
    ],
  },
  {
    id: "example-source", authorId: "example-ori", createdAt: "2026-10-04T16:20:00Z", likes: 5,
    body: "דוגמה לשיתוף סרטון מהאתר בתוך השיחה. מדביקים קישור, והסרטון מופיע כאן:\nhttps://www.youtube.com/watch?v=Jp0pxGofPjQ",
    replies: [{ id: "example-source-1", authorId: "example-yonatan", createdAt: "2026-10-04T17:05:00Z", body: "מסכים. אפילו צילום של העמוד עם שם המהדורה יכול לעזור." }],
  },
  {
    id: "example-question", authorId: "example-maya", createdAt: "2026-10-03T08:10:00Z", likes: null,
    body: "יש כאן עוד אנשים שחוזרים לשיחה ישנה ומגלים בה משהו חדש? הייתי רוצה למצוא בקלות את המקום שבו הפסקתי לקרוא.", replies: [],
  },
  {
    id: "example-reading", authorId: "example-yonatan", createdAt: "2026-10-02T12:30:00Z", likes: 3,
    body: "איך אתם בוחרים מה לקרוא בהמשך? אני מתלבט בין להעמיק בשאלה אחת לבין לפתוח כמה כיוונים ולראות לאן הם מובילים.",
    replies: [{ id: "example-reading-1", authorId: "example-noa", createdAt: "2026-10-02T13:15:00Z", body: "אני שומרת שאלה אחת פתוחה וחוזרת אליה אחרי הקריאה. זה נותן לי נקודת התחלה." }],
  },
  {
    id: "example-number", authorId: "example-noa", createdAt: "2026-10-01T09:20:00Z", likes: 0,
    body: "נתקלתי במספר 1820 ורציתי לשאול איפה כדאי להתחיל לקרוא עליו באתר. אשמח להפניה למקור עם הסבר נגיש.", replies: [],
  },
  {
    id: "example-history", authorId: "example-maya", createdAt: "2026-09-30T11:00:00Z", likes: 2,
    body: "שומרת כאן מקום לשיחות שהתחילו מזמן. נחמד שאפשר לחזור להודעה ישנה ולהמשיך ממנה, גם אחרי שהרבה דברים כבר נכתבו.", replies: [],
  },
]);
