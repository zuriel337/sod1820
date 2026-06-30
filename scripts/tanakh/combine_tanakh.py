#!/usr/bin/env python3
# מאחד: התורה הקנונית הקיימת (304,805 — לא נוגעים) + נביאים+כתובים מהחילוץ (אותו מקור MAM).
import json
pub = "/home/user/sod1820/public"

# התורה הקנונית הקיימת — מקור-אמת, לא משנים
tv = json.load(open(pub+"/torah-verses.json", encoding="utf-8"))
torah_verses = tv["verses"]                       # ספרים 0–4
torah_letters = open(pub+"/torah-letters.txt", encoding="utf-8").read()
TLEN = len(torah_letters)
assert TLEN == 304805, f"Torah letters = {TLEN}, expected 304805"
# טווחי-אות קנוניים של התורה (TORAH_BOOKS ב-Els.jsx)
TR = [[0,78064],[78064,141593],[141593,186383],[186383,249913],[249913,304805]]

# החילוץ המלא (כל 39) — לוקחים ממנו רק נביאים+כתובים (bookIdx >= 5)
mv = json.load(open(pub+"/tanakh-verses.json", encoding="utf-8"))
books = mv["books"]                               # 39 שמות עבריים
nk_verses = [v for v in mv["verses"] if v[0] >= 5]

FIN = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}
def letters_of(t): return ''.join(FIN.get(c,c) for c in t if c != ' ')

ranges = [r[:] for r in TR]
parts = []
pos = TLEN
for bi in sorted(set(v[0] for v in nk_verses)):
    bl = ''.join(letters_of(v[3]) for v in nk_verses if v[0] == bi)
    ranges.append([pos, pos+len(bl)])
    pos += len(bl)
    parts.append(bl)

all_letters = torah_letters + ''.join(parts)
all_verses = torah_verses + nk_verses

json.dump({"books":books,"method":"רגיל","bookRanges":ranges,"verses":all_verses},
          open(pub+"/tanakh-verses.json","w",encoding="utf-8"), ensure_ascii=False, separators=(',',':'))
open(pub+"/tanakh-letters.txt","w",encoding="utf-8").write(all_letters)

print(f"books={len(books)} verses={len(all_verses)} (torah={len(torah_verses)} + N/K={len(nk_verses)})")
print(f"letters total={len(all_letters)} (torah={TLEN} canonical + N/K={len(all_letters)-TLEN})")
print(f"Genesis 1:1 = {all_verses[0]}")
print(f"first N/K verse = {nk_verses[0]}")
print(f"ranges torah={ranges[:5]}")
print(f"ranges[5..7]={ranges[5:8]}  last={ranges[-1]}")
