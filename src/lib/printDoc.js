// 🖨️ הדפסת מסמך נקי מתוכן קיים בדף. פותח חלון הדפסה עם עיצוב בהיר וקריא,
// דורס את הצבעים הכהים של האתר (זהב-על-כהה) לטקסט כהה על לבן — חסכוני ויפה בדפוס.
// innerHtml = ה-innerHTML של מכל-התוכן בדף (תוכן שלנו, מהימן). כפתורים מוסתרים אוטומטית.
function esc(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function printDoc(title, innerHtml) {
  const w = window.open("", "_blank", "width=860,height=940");
  if (!w) { alert("חלון ההדפסה נחסם — אפשרו חלונות קופצים לאתר ונסו שוב."); return false; }
  const date = new Date().toLocaleDateString("he-IL");
  w.document.write(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>${esc(title)} · סוד 1820</title>
<style>
  @page { margin: 16mm; }
  html,body { background:#fff; }
  body { font-family:'Heebo',Arial,sans-serif; color:#1c1710; line-height:1.7; margin:0; padding:0 4px; }
  /* דריסת הצבעים הכהים של האתר → קריא בדפוס. inline-styles ללא !important נכנעים ל-!important */
  * { color:#1c1710 !important; background:transparent !important; background-image:none !important;
      box-shadow:none !important; text-shadow:none !important; border-color:#d8c9a0 !important; filter:none !important; }
  a { text-decoration:none !important; }
  img { max-width:320px !important; height:auto !important; border:1px solid #d8c9a0 !important; border-radius:8px; }
  button, .no-print, input, select, form { display:none !important; }
  h1,h2,h3 { color:#1c1710 !important; }
  .pd-head { text-align:center; border-bottom:2px solid #caa030 !important; padding-bottom:12px; margin-bottom:20px; }
  .pd-head .brand { color:#9c6b12 !important; font-size:12px; letter-spacing:3px; font-weight:800; }
  .pd-head h1 { margin:6px 0 0; font-size:24px; }
  .pd-foot { margin-top:26px; border-top:1px solid #d8c9a0; padding-top:10px; text-align:center; color:#7a6a40 !important; font-size:11px; }
</style></head><body>
  <div class="pd-head"><div class="brand">✦ סוד 1820 · sod1820.co.il</div><h1>${esc(title)}</h1></div>
  <div class="pd-body">${innerHtml || ""}</div>
  <div class="pd-foot">הודפס מ-סוד 1820 · ${esc(date)} · כל הזכויות שמורות</div>
  <script>window.onload=function(){window.focus();setTimeout(function(){window.print();},250);}<\/script>
</body></html>`);
  w.document.close();
  return true;
}
