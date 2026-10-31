// Companion reading aids only. Source identities, pair order and geometry stay in sourceModels.
export const DEPTHS_GUIDE = Object.freeze([
  { title: 'להתחיל בזמן', category: 'ראשית ואחרית', explanation: 'התחילו בשני קצותיו של מהלך: ראשית ואחרית. בחרו כל אחד מבני הזוג וקראו את מקומו ברשימה. כאן הזוג מוצג כמושג לקריאה, ולא ככיוון בחלל.', question: 'מה משתנה כשקוראים את הרשימה דרך שני קצותיו של מהלך?' },
  { title: 'להבחין בערך', category: 'טוב ורע', explanation: 'הזוג השני הוא טוב ורע. הוא מצטרף לרשימת העומקים, אך אינו עוד ציר גאומטרי. ההפרדה בתצוגה מאפשרת לקרוא את הזוג במילותיו, לצד זוג הזמן.', question: 'במה שונה הזוג הזה מראשית ואחרית?' },
  { title: 'לפתוח את המרחב', category: 'רום ותחת', explanation: 'כעת פוגשים זוג כיוונים: רום ותחת. בחרו כיוון ואז את בן הזוג שמולו. במצב המודרך מופיע בשלב הזה רק הזוג הנקרא; אפשר לעבור בכל רגע לחקירה חופשית.', question: 'בחרו ברום ובתחת וראו כיצד הבחירה עוברת ביניהם.' },
  { title: 'להוסיף זוג כיוונים', category: 'מזרח ומערב', explanation: 'מזרח ומערב מצטרפים לרום ותחת. שני הזוגות נקראים בנפרד, ומוצגים יחד כדי לסייע בהתמצאות. זווית המצלמה מסייעת לראות את הזוג הנוכחי.', question: 'התמקדו במזרח ומערב ואז החזירו את המבט הכולל.' },
  { title: 'לראות את התמונה השלמה', category: 'צפון ודרום', explanation: 'עם צפון ודרום נראים שלושת זוגות הכיוונים יחד: שישה כיוונים. ראשית ואחרית וטוב ורע נשארים חלק מרשימת עשרת העומקים, בתצוגת הקריאה שלהם.', question: 'חזרו לפסקת המקור והשוו בין הרשימה המלאה לבין שלושת הזוגות שבחלל.' },
]);

// Visually read in the original physical PDF page 53 (printed label 49).
// One shared paragraph locus for all ten depths, not ten claimed word coordinates.
export const DEPTHS_SOURCE_LOCUS = Object.freeze({
  pdfPage: 53, imageWidth: 1591, imageHeight: 2250,
  x: 610, y: 400, width: 555, height: 235,
  label: 'פסקת עשרת העומקים · עמוד PDF 53',
  image: '/book-data/sefer-yetzirah-page53-reading.webp',
  sourceSha256: '2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a',
});
