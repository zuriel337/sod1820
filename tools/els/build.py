#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» (public/tzofen.html) מהתבנית + הנתונים הדחוסים.
# הרצה:  cd tools/els && python3 build.py
# פלט:   ../../public/tzofen.html  (קובץ עצמאי אחד, ~2.2MB, ללא תלות-רשת)
import json, gzip, base64, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT  = os.path.normpath(os.path.join(HERE, "..", "..", "public", "tzofen.html"))

def d(name):  # קורא קובץ-נתונים מתיקיית data/
    return open(os.path.join(DATA, name), encoding="utf-8").read()

def gz64(s):  # gzip → base64 (מפוענח בדפדפן ע״י DecompressionStream — בלי רשת, תואם CSP)
    return base64.b64encode(gzip.compress(s.encode("utf-8"), 9, mtime=0)).decode()

tmpl  = open(os.path.join(HERE, "els-code.template.html"), encoding="utf-8").read()
# Embed the app's dependency-free reference presentation in the standalone tool.
ref_formatter_path = os.path.join(HERE, "..", "..", "src", "lib", "presentation", "tanakhReferenceParts.js")
ref_formatter = open(ref_formatter_path, encoding="utf-8").read().replace("export function ", "function ")
tk    = d("tk-letters.txt")           # כל התנ״ך, מנורמל (בלי סופיות), 1,204,583 אותיות
nq    = d("niqqud-compact.txt")       # ניקוד — תורה בלבד (מיושר 1:1)
vlens = d("tk-vlens.txt").strip()     # אורך-אותיות לכל פסוק (23,204)
vchap = d("tk-vchap.txt").strip()     # פסוקים-לכל-פרק לכל 39 הספרים
vtext = d("tk-vtext.txt")             # טקסט מלא לכל פסוק
books = ",".join(json.load(open(os.path.join(DATA, "tk-meta.json"), encoding="utf-8"))["books"])
logo  = d("els-logo-b64.txt").strip() # לוגו ELS של האתר כ-data URI (128px)

# 🧬 corpus identities — derived from the exact tk-letters source relation (the bytes gz64(tk) embeds):
#   Tanakh = full sha256 of tk-letters; Torah = the historical 16-char prefix (fn_els_corpus_id contract).
#   The server verify_batch binds to these and fails closed on mismatch.
corpus_tanakh = hashlib.sha256(tk.encode("utf-8")).hexdigest()
corpus_torah  = corpus_tanakh[:16]
assert len(tk) == 1204583, "tk-letters.txt must be the canonical 1,204,583-letter stream"

out = (tmpl.replace("__TORAH_DATA__", gz64(tk)).replace("__NIQQUD_DATA__", gz64(nq))
          .replace("__TANAKH_REFERENCE_FORMATTER__", ref_formatter)
          .replace("__VERSE_LENS__", vlens).replace("__VERSE_CHAP__", vchap)
          .replace("__VERSE_TEXT__", gz64(vtext)).replace("__BOOK_NAMES__", books)
          .replace("__ELS_LOGO__", logo)
          .replace("__CORPUS_ID_TORAH__", corpus_torah).replace("__CORPUS_ID_TANAKH__", corpus_tanakh))
open(OUT, "w", encoding="utf-8").write(out)
print("wrote", OUT, "| KB:", round(len(out.encode("utf-8")) / 1024))

# ── גרסה עצמאית «קריאה-בלבד» (Legacy, לא קנונית): אותו מנוע, בלי שמירה, בלי תלות באתר ובלי מסך פתיחה.
# פלט: ../../public/tzofen-standalone.html — ניתן לאירוח סטטי חינמי. הפלט הקנוני לעיל לא משתנה.
STANDALONE = r"""<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<style>
 #lgBanner{position:sticky;top:0;z-index:99999;background:#480b13;color:#f6da78;font:600 13px/1.5 Arial,sans-serif;text-align:center;padding:6px 10px;direction:rtl;border-bottom:1px solid rgba(232,200,74,.4)}
 .save-act,.save,.share-act,.sh-save,#xsaved,.gal-reopen,.gal-lbl,.gal-empty,#gallery,.saved,[class*="gal-close"],.post-link-act{display:none!important}
</style>
<div id="lgBanner">מנוע ELS לגאסי · לא מקור אמת קנוני · אין אפשרות שמירה בגרסה זו — התוצאות נעלמות עם סגירת הדף</div>
<script>
 (function(){
  // אין שמירה: כל כתיבה ל-localStorage/sessionStorage מושתקת, ואין תקשורת עם דף-אב.
  try{Storage.prototype.setItem=function(){};}catch(e){}
  try{window.addEventListener("message",function(e){e.stopImmediatePropagation();},true);}catch(e){}
  document.addEventListener("click",function(e){
    var b=e.target&&e.target.closest&&e.target.closest(".save-act,.save,.share-act");
    if(b){e.stopImmediatePropagation();e.preventDefault();alert("אין אפשרות שמירה בגרסה זו");}
  },true);
 })();
</script>
"""
sa = STANDALONE + out
sa = sa.replace("https://sod1820.co.il/codes/", "#").replace("https://sod1820.co.il/", "#")
OUT2 = os.path.join(os.path.dirname(OUT), "tzofen-standalone.html")
open(OUT2, "w", encoding="utf-8").write(sa)
print("wrote", OUT2, "| KB:", round(len(sa.encode("utf-8")) / 1024))
