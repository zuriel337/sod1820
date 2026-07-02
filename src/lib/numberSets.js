// 🖼 «סטים מסוננים» לגלריה — מספר שמוצג במאגר יחד עם סט-מספרים קשור (לא רק הוא לבדו).
// 45 (דוד המלך · אדם · מה) מוצג עם 14 (דוד) — «סט 14+45» הקלאסי. מרחיבים כאן בשורה אחת.
// אפס-עומס: אלו קישורים סטטיים בלבד (/archive?tab=pool&nums=…) — שום שאילתה נוספת.
export const NUMBER_GALLERY_SETS = { 45: [14, 45], 14: [14, 45] };

// הסט של מספר (או הוא-עצמו אם אין סט מוגדר)
export const gallerySetFor = n => NUMBER_GALLERY_SETS[n] || [n];

// קישור-עומק למאגר המסונן של הסט
export const gallerySetHref = n => `/archive?tab=pool&nums=${gallerySetFor(n).join(",")}`;
