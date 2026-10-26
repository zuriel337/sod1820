#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» (public/tzofen.html) מהתבנית + הנתונים הדחוסים.
# הרצה:  cd tools/els && python3 build.py
# פלט:   ../../public/tzofen.html  (קובץ עצמאי אחד, ~2.2MB, ללא תלות-רשת)
import json, gzip, base64, os, hashlib, math, re
from collections import Counter

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
meta  = json.load(open(os.path.join(DATA, "tk-meta.json"), encoding="utf-8"))
books = ",".join(meta["books"])
logo  = d("els-logo-b64.txt").strip() # לוגו ELS של האתר כ-data URI (128px)
maftech_core_raw = d("maftech-core-lexicon.txt")

def normalize_hebrew(value):
    return re.sub(r"[^א-ת]", "", value).translate(finals)

# Compact Torah-language boundary profile. This deliberately retains no words or vocabulary:
# only the 22x22 log-odds that a letter pair appears across a canonical Torah word boundary
# rather than inside a word. Guided Research uses it to rank possible divisions in exact matrix
# letters; it cannot turn a division into a word, meaning or Finding.
alphabet = "אבגדהוזחטיכלמנסעפצקרשת"
finals = str.maketrans("ךםןףץ", "כמנפצ")
inside_pairs, boundary_pairs = Counter(), Counter()
torah_word_count = 0
for verse in vtext.splitlines()[:meta["torahVerses"]]:
    words = [normalize_hebrew(word) for word in verse.split()]
    words = [word for word in words if word]
    torah_word_count += len(words)
    for word in words:
        inside_pairs.update(a + b for a, b in zip(word, word[1:]))
    boundary_pairs.update(a[-1] + b[0] for a, b in zip(words, words[1:]))
pair_count = len(alphabet) ** 2
inside_total, boundary_total = sum(inside_pairs.values()), sum(boundary_pairs.values())
boundary_scores = []
for a in alphabet:
    for b in alphabet:
        pair = a + b
        across = (boundary_pairs[pair] + 1) / (boundary_total + pair_count)
        within = (inside_pairs[pair] + 1) / (inside_total + pair_count)
        boundary_scores.append(max(-800, min(800, round(100 * math.log(across / within)))))
language_profile = {
    "contract": "torah_language_boundary_profile_v1",
    "source": "canonical_torah_word_boundaries",
    "alphabet": alphabet,
    "boundaryScores": boundary_scores,
    "trainingVerses": meta["torahVerses"],
    "trainingWords": torah_word_count,
    "vocabularyRetained": False,
}
language_profile_b64 = base64.b64encode(json.dumps(language_profile, ensure_ascii=True, separators=(",", ":")).encode("ascii")).decode()

# Broad language coverage without a broad runtime scan. The canonical Tanakh display text and the
# existing Maftech core snapshot are reduced at build time to one compressed lookup profile. Guided
# Research inflates it only after a verified axis requests matrix discovery, and then looks up the
# bounded 2-10 letter windows already present in the selected rays. No term-by-matrix sweep occurs.
tanakh_forms, tanakh_labels = Counter(), {}
for raw_word in vtext.split():
    normalized = normalize_hebrew(raw_word)
    if not 2 <= len(normalized) <= 10:
        continue
    display = re.sub(r"[^א-ת]", "", raw_word)
    tanakh_forms[normalized] += 1
    tanakh_labels.setdefault(normalized, Counter())[display] += 1
core_labels = {}
for raw_word in maftech_core_raw.splitlines():
    display = re.sub(r"[^א-ת]", "", raw_word.strip())
    normalized = normalize_hebrew(display)
    if 2 <= len(normalized) <= 10:
        core_labels.setdefault(normalized, display)
lexicon_terms = sorted(set(tanakh_forms) | set(core_labels))
lexicon_entries = []
for term in lexicon_terms:
    mask = (1 if term in tanakh_forms else 0) | (2 if term in core_labels else 0)
    if term in core_labels:
        label = core_labels[term]
    else:
        label = sorted(tanakh_labels[term].items(), key=lambda row: (-row[1], row[0]))[0][0]
    lexicon_entries.append([term, label, mask, tanakh_forms.get(term, 0)])
core_fingerprint = hashlib.sha256(("\n".join(sorted(core_labels)) + "\n").encode("utf-8")).hexdigest()
dynamic_lexicon = {
    "contract": "els_dynamic_lexicon_profile_v1",
    "sources": ["canonical_tanakh_words", "maftech_core_snapshot"],
    "matchingAlgorithm": "bounded_window_lookup_v1",
    "entryCount": len(lexicon_entries),
    "tanakhEntryCount": len(tanakh_forms),
    "coreEntryCount": len(core_labels),
    "coreFingerprint": core_fingerprint,
    "entries": lexicon_entries,
}
dynamic_lexicon_b64 = gz64(json.dumps(dynamic_lexicon, ensure_ascii=False, separators=(",", ":")))

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
          .replace("__TORAH_LANGUAGE_PROFILE_B64__", language_profile_b64)
          .replace("__DYNAMIC_LEXICON_GZ64__", dynamic_lexicon_b64)
          .replace("__CORPUS_ID_TORAH__", corpus_torah).replace("__CORPUS_ID_TANAKH__", corpus_tanakh))
open(OUT, "w", encoding="utf-8").write(out)
print("wrote", OUT, "| KB:", round(len(out.encode("utf-8")) / 1024))
