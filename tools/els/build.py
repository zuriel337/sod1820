#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» (public/tzofen.html) מהתבנית + הנתונים הדחוסים.
# הרצה:  cd tools/els && python3 build.py
# פלט:   ../../public/tzofen.html  (קובץ עצמאי אחד, ~2.2MB, ללא תלות-רשת)
import json, gzip, base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT  = os.path.normpath(os.path.join(HERE, "..", "..", "public", "tzofen.html"))

def d(name):  # קורא קובץ-נתונים מתיקיית data/
    return open(os.path.join(DATA, name), encoding="utf-8").read()

def gz64(s):  # gzip → base64 (מפוענח בדפדפן ע״י DecompressionStream — בלי רשת, תואם CSP)
    return base64.b64encode(gzip.compress(s.encode("utf-8"), 9, mtime=0)).decode()

tmpl  = open(os.path.join(HERE, "els-code.template.html"), encoding="utf-8").read()
tk    = d("tk-letters.txt")           # כל התנ״ך, מנורמל (בלי סופיות), 1,204,583 אותיות
nq    = d("niqqud-compact.txt")       # ניקוד — תורה בלבד (מיושר 1:1)
vlens = d("tk-vlens.txt").strip()     # אורך-אותיות לכל פסוק (23,204)
vchap = d("tk-vchap.txt").strip()     # פסוקים-לכל-פרק לכל 39 הספרים
vtext = d("tk-vtext.txt")             # טקסט מלא לכל פסוק
books = ",".join(json.load(open(os.path.join(DATA, "tk-meta.json"), encoding="utf-8"))["books"])
logo  = d("els-logo-b64.txt").strip() # לוגו ELS של האתר כ-data URI (128px)

out = (tmpl.replace("__TORAH_DATA__", gz64(tk)).replace("__NIQQUD_DATA__", gz64(nq))
          .replace("__VERSE_LENS__", vlens).replace("__VERSE_CHAP__", vchap)
          .replace("__VERSE_TEXT__", gz64(vtext)).replace("__BOOK_NAMES__", books)
          .replace("__ELS_LOGO__", logo))
open(OUT, "w", encoding="utf-8").write(out)
print("wrote", OUT, "| KB:", round(len(out.encode("utf-8")) / 1024))
