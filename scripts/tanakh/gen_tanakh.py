#!/usr/bin/env python3
# מחולל בסיס-נתוני התנ"ך המלא (24 ספרים) ממקור MAM (Sefaria) — תואם בדיוק לקבצי-התורה הקיימים.
import json, re, time, sys, urllib.request

# (Sefaria API name, Hebrew label) — 39 יחידות-ספר (= 24 ספרי התנ"ך)
BOOKS = [
    ("Genesis","בראשית"),("Exodus","שמות"),("Leviticus","ויקרא"),("Numbers","במדבר"),("Deuteronomy","דברים"),
    ("Joshua","יהושע"),("Judges","שופטים"),("I Samuel","שמואל א"),("II Samuel","שמואל ב"),
    ("I Kings","מלכים א"),("II Kings","מלכים ב"),("Isaiah","ישעיהו"),("Jeremiah","ירמיהו"),("Ezekiel","יחזקאל"),
    ("Hosea","הושע"),("Joel","יואל"),("Amos","עמוס"),("Obadiah","עובדיה"),("Jonah","יונה"),("Micah","מיכה"),
    ("Nahum","נחום"),("Habakkuk","חבקוק"),("Zephaniah","צפניה"),("Haggai","חגי"),("Zechariah","זכריה"),("Malachi","מלאכי"),
    ("Psalms","תהלים"),("Proverbs","משלי"),("Job","איוב"),("Song of Songs","שיר השירים"),("Ruth","רות"),
    ("Lamentations","איכה"),("Ecclesiastes","קהלת"),("Esther","אסתר"),("Daniel","דניאל"),
    ("Ezra","עזרא"),("Nehemiah","נחמיה"),("I Chronicles","דברי הימים א"),("II Chronicles","דברי הימים ב"),
]

VAL = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,
       'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400}
FIN = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}

def clean_verse(s):
    out = []
    for ch in s:
        o = ord(ch)
        if 0x05D0 <= o <= 0x05EA: out.append(ch)        # אות עברית בסיסית
        elif ch == '־': pass                        # מקף (מקאף) → איחוד בלי רווח (כמו בתורה)
        elif ch.isspace(): out.append(' ')               # רווח/שורה
        # ניקוד · טעמים · סוף-פסוק · פיסוק → נשמטים
    return re.sub(r'\s+', ' ', ''.join(out)).strip()

def gem(t): return sum(VAL.get(c,0) for c in t)
def letters_of(t): return ''.join(FIN.get(c,c) for c in t if c != ' ')

def fetch(name):
    url = "https://www.sefaria.org/api/v3/texts/" + urllib.parse.quote(name) + "?version=hebrew"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"Accept":"application/json","User-Agent":"sod1820-tanakh/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            if attempt == 3: raise
            time.sleep(2*(attempt+1))

verses = []
letters_parts = []
book_ranges = []   # [from,to] באינדקס-אות גלובלי לכל ספר (לסינון ELS)
books_he = []
pos = 0
for bi,(name,he) in enumerate(BOOKS):
    d = fetch(name)
    chapters = d['versions'][0]['text']
    book_letters = []
    nverse = 0
    for ci,chap in enumerate(chapters):
        for vi,raw in enumerate(chap):
            if not isinstance(raw,str): continue
            t = clean_verse(raw)
            if not t: continue
            verses.append([bi, ci+1, vi+1, t, gem(t)])
            book_letters.append(letters_of(t))
            nverse += 1
    bl = ''.join(book_letters)
    book_ranges.append([pos, pos+len(bl)])
    pos += len(bl)
    letters_parts.append(bl)
    books_he.append(he)
    print(f"{bi+1:2d}. {he:14s} {name:16s} ch={len(chapters):3d} verses={nverse:5d} letters={len(bl):7d}", file=sys.stderr)
    time.sleep(0.4)

all_letters = ''.join(letters_parts)
out_dir = "/home/user/sod1820/public"
with open(out_dir+"/tanakh-verses.json","w",encoding="utf-8") as f:
    json.dump({"books":books_he,"method":"רגיל","bookRanges":book_ranges,"verses":verses}, f, ensure_ascii=False, separators=(',',':'))
with open(out_dir+"/tanakh-letters.txt","w",encoding="utf-8") as f:
    f.write(all_letters)

print(f"\nTOTAL: books={len(BOOKS)} verses={len(verses)} letters={len(all_letters)}", file=sys.stderr)
print(f"Genesis 1:1 = {verses[0]}  (expect gematria 2701)", file=sys.stderr)
