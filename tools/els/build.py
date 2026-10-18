#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» מהתבנית + הנתונים הדחוסים.
# הרצה:  cd tools/els && python3 build.py
# פלט:   ../../public/tzofen.html + נכס טקסט-פסוקים דחוס, תוכן-ממוען ונטען לפי דרישה.
import json, gzip, base64, os, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT  = os.path.normpath(os.path.join(HERE, "..", "..", "public", "tzofen.html"))
ASSET_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "public", "els-data"))

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
vtext_path = os.path.join(DATA, "tk-vtext.txt")
vtext_bytes = open(vtext_path, "rb").read()  # טקסט מלא לכל פסוק; נשמר בייט-לבייט כנכס לפי דרישה
books = ",".join(json.load(open(os.path.join(DATA, "tk-meta.json"), encoding="utf-8"))["books"])
logo  = d("els-logo-b64.txt").strip() # לוגו ELS של האתר כ-data URI (128px)

# 🧬 corpus identities — derived from the exact tk-letters source relation (the bytes gz64(tk) embeds):
#   Tanakh = full sha256 of tk-letters; Torah = the historical 16-char prefix (fn_els_corpus_id contract).
#   The server verify_batch binds to these and fails closed on mismatch.
corpus_tanakh = hashlib.sha256(tk.encode("utf-8")).hexdigest()
corpus_torah  = corpus_tanakh[:16]
assert len(tk) == 1204583, "tk-letters.txt must be the canonical 1,204,583-letter stream"

# טקסט-הפסוקים משמש לתצוגת מקור בלבד, לא לחיפוש. שומרים gzip דטרמיניסטי כנכס בינארי
# בעל סיומת שאינה מבקשת מהשרת Content-Encoding. הדפדפן מפענח במפורש ורק בפעולה שזקוקה לו.
vtext_sha256 = hashlib.sha256(vtext_bytes).hexdigest()
vtext_gzip = gzip.compress(vtext_bytes, compresslevel=9, mtime=0)
vtext_asset_name = f"tk-vtext.{vtext_sha256[:16]}.gzdata"
vtext_asset_url = f"/els-data/{vtext_asset_name}"
os.makedirs(ASSET_DIR, exist_ok=True)
vtext_asset_path = os.path.join(ASSET_DIR, vtext_asset_name)
open(vtext_asset_path, "wb").write(vtext_gzip)
assert gzip.decompress(vtext_gzip) == vtext_bytes, "generated verse-text asset must round-trip byte-for-byte"

out = (tmpl.replace("__TORAH_DATA__", gz64(tk)).replace("__NIQQUD_DATA__", gz64(nq))
          .replace("__TANAKH_REFERENCE_FORMATTER__", ref_formatter)
          .replace("__VERSE_LENS__", vlens).replace("__VERSE_CHAP__", vchap)
          .replace("__VERSE_TEXT_ASSET__", vtext_asset_url)
          .replace("__VERSE_TEXT_SHA256__", vtext_sha256)
          .replace("__VERSE_TEXT_BYTES__", str(len(vtext_bytes))).replace("__BOOK_NAMES__", books)
          .replace("__ELS_LOGO__", logo)
          .replace("__CORPUS_ID_TORAH__", corpus_torah).replace("__CORPUS_ID_TANAKH__", corpus_tanakh))
open(OUT, "w", encoding="utf-8").write(out)
print("wrote", OUT, "| KB:", round(len(out.encode("utf-8")) / 1024))
print("wrote", vtext_asset_path, "| KB:", round(len(vtext_gzip) / 1024), "| source sha256:", vtext_sha256)
