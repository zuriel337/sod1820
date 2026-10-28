// Book-specific views of delivered source fields. Layout coordinates never create source relations.
export const CATALOG_KEYS = Object.freeze({mouth:'five-mouth-groups',families:'letter-families'});
export const CATALOG_DEFINITIONS = {
  'letter-families':{
    pages:[65],count:3,kind:'catalog',title:'כ״ב האותיות · שלוש משפחות',
    visualLabels:{mothers:'אמות',doubles:'כפולות',simples:'פשוטות'},
    fields:[['letters','אותיות המשפחה'],['source_count','המניין שבמקור']],
    editorial:'שלוש משפחות האותיות נזכרות במקור. סדר הכרטיסים והעמדתם במרחב הם אמצעי בחירה; אין טבעת או קשר בין אותיות רק מפני שהן באותה משפחה.',
    companion:'המשפחה נבחרת כקבוצה שלמה. המניין מוצג מן המפרט שנקרא, ואינו תוצאת חישוב מנוע.',
  },
  "five-mouth-groups": {"pages": [80], "count": 5, "kind": "catalog", "title": "מוצאות הפה · חמש קבוצות אותיות", "fields": [["letters", "אותיות הקבוצה"]], "editorial": "החלוקה לחמש קבוצות והרכב האותיות שייכים לנוסח שבעמוד 80. מיקום הכרטיסים הוא בחירת המחשה ואינו תרשים אנטומי. אין מיקום תלת־ממדי לכל אות במקור זה.", "companion": "כל בחירה שומרת את סדר האותיות של הקבוצה במפרט המקור. הערת מנטובה היא עדות נפרדת; פרטי הגייה שלא נסגרו אינם מועתקים אל הנוסח הנבחר."},
};
export function catalogFields(model,component){return model.fields.map(([key,label])=>({key,label,value:component[key]??null,id:`${component.stable_id}:field:${key}`,source:model.readings?.find(r=>r.id===component.source_reading_id)?.source||component.source}));}
export function catalogGeometry(model){
  const points=model.components.map((c,i)=>({id:c.stable_id,localId:c.id,label:model.visualLabels?.[c.id]||c.label_he,position:[(i%3-1)*2.25,(Math.ceil(model.components.length/3)-1)*.9-Math.floor(i/3)*1.8,0],shape:'tile'}));
  return {kind:'catalog',points,edges:[],orientationCenter:false};
}
