// Book-specific views of delivered source fields. Layout coordinates never create source relations.
export const CATALOG_KEYS = Object.freeze({synopticDoubles:'doubles-synoptic',mothers:'mothers-world-year-soul',mouth:'five-mouth-groups',families:'letter-families'});
export const CATALOG_DEFINITIONS = {
  'letter-families':{
    pages:[65],count:3,kind:'catalog',title:'כ״ב האותיות · שלוש משפחות',
    visualLabels:{mothers:'אמות',doubles:'כפולות',simples:'פשוטות'},
    fields:[['letters','אותיות המשפחה'],['source_count','המניין שבמקור']],
    editorial:'שלוש משפחות האותיות נזכרות במקור. סדר הכרטיסים והעמדתם במרחב הם אמצעי בחירה; אין טבעת או קשר בין אותיות רק מפני שהן באותה משפחה.',
    companion:'המשפחה נבחרת כקבוצה שלמה. המניין מוצג מן המפרט שנקרא, ואינו תוצאת חישוב מנוע.',
  },
  "five-mouth-groups": {"pages": [80], "count": 5, "kind": "catalog", "title": "מוצאות הפה · חמש קבוצות אותיות", "fields": [["letters", "אותיות הקבוצה"]], "editorial": "החלוקה לחמש קבוצות והרכב האותיות שייכים לנוסח שבעמוד 80. מיקום הכרטיסים הוא בחירת המחשה ואינו תרשים אנטומי. אין מיקום תלת־ממדי לכל אות במקור זה.", "companion": "כל בחירה שומרת את סדר האותיות של הקבוצה במפרט המקור. הערת מנטובה היא עדות נפרדת; פרטי הגייה שלא נסגרו אינם מועתקים אל הנוסח הנבחר."},
  "mothers-world-year-soul": {"pages": [94, 95, 97, 98, 99], "count": 3, "kind": "catalog", "title": "אמ״ש · עולם, שנה ונפש", "fields": [["element", "יסוד"], ["world", "בעולם"], ["year", "בשנה"], ["soul", "בנפש"]], "editorial": "עולם, שנה ונפש הם תחומי הקבלה ולא שלושה צירי חלל. מיקום הכרטיסים והמרחקים הם בחירת המחשה. שני הקשרים מציגים רק את ההכרעה המפורשת בין אש ומים, בעוגן נפרד בעמוד 94; אין קשרים הנוצרים מקרבה גיאומטרית.", "companion": "קוראים כל אם מול ההקבלות שלה. הצבע אינו צבע של יסוד מן המקור, והעמדת האל״ף באמצע היא המחשה ליחס ההכרעה. עמודי ההמלכות ועמודי ההקשר הכללי נשמרים בנפרד."},
  "doubles-synoptic": {"pages": [105, 106, 107, 108, 109, 110], "count": 7, "kind": "catalog", "title": "שבע הכפולות · הגוף המשולב", "fields": [["world_planet", "כוכב בעולם"], ["week_day", "יום בשנה"], ["soul_gate", "שער בנפש"]], "editorial": "ההקבלות שייכות לגוף המשולב בלבד. הכרטיסים אינם מסלולי כוכבים, לוח זמנים או תרשים אנטומי. אין מן הרשימה מקור לקשרים בין שבע האותיות או למרחקים ביניהן.", "companion": "כל אות נקראת מתוך תיבת ההמלכה שלה. בי״ת מקושרת כאן לשבתאי; אין להחליפה בלבנה מנוסח הגר״א. רי״ש ותי״ו נשענות על הקריאה הישירה בעמוד 110, ולא על מילוי מן הנוסח האחר."},
};
export function catalogFields(model,component){return model.fields.map(([key,label])=>({key,label,value:component[key]??null,id:`${component.stable_id}:field:${key}`,source:model.readings?.find(r=>r.id===component.source_reading_id)?.source||component.source}));}
export function catalogGeometry(model){
  const points=model.components.map((c,i)=>({id:c.stable_id,localId:c.id,label:model.visualLabels?.[c.id]||c.label_he,position:[(i%3-1)*2.25,(Math.ceil(model.components.length/3)-1)*.9-Math.floor(i/3)*1.8,0],shape:'tile'}));
  if(model.key==='mothers-world-year-soul')points.forEach(p=>{p.position=({alef:[0,0,0],mem:[-2.25,0,0],shin:[2.25,0,0]})[p.localId];});
  return {kind:'catalog',points,edges:model.relations.map(r=>({id:r.stable_id,from:points.find(p=>p.localId===r.from_id).position,to:points.find(p=>p.localId===r.to_id).position})),orientationCenter:false};
}
