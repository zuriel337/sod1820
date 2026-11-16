# Rubik for Hebrew pages, and its local stand-ins per weight (ZURIEL 16.11.2026: "גופנים: עברית וניקוד קריאים, בלי שינוי פריסה כשהגופן מגיע").
#
# Why: Hebrew text in Rubik uses spaces, digits and punctuation, which Google's split keeps in the Latin file (35 KB, loaded on first use).
# The Hebrew file (preloaded) arrived first, so for a while Hebrew letters were Rubik and spaces/digits/punctuation the local stand-in: two
# spaces 0.5 px wider moved a row of chips onto a second line on a phone (16.11.2026, Post 192). One file now carries Hebrew together with
# spaces, digits and punctuation (and their tabular/proportional digit features, kerning and vowel-mark positioning), so they arrive
# together; the Latin file keeps only Latin letters and loads only where Latin letters are shown. Built from the same Rubik 2.3 variable
# source that Google's two files were cut from (outlines and advances compared: 0 differences in 1,530 glyph/weight pairs).
#
# The local stand-ins ('Sod Rubik Fallback'): one face per weight 400–900 and per class, with the size of the Rubik class it stands for:
# Hebrew letters, Latin letters and punctuation, digits, and the space (whose Rubik width shrinks from 0.245 em at 400 to 0.186 em at 900).
#
#   python -I rubik-faces.py <Rubik[wght].ttf> <public/fonts>   →  writes Rubik-Hebrew-Common.woff2, prints the @font-face rules
# Source: https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/Rubik%5Bwght%5D.ttf (OFL, no reserved font name).
import hashlib, sys
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

SRC, OUT = sys.argv[1], sys.argv[2]
SOURCE_SHA256 = "1b3a7437ba2af80e465e773ed60c5036d1ba6ace492d89046dbcf18fb31e4e88"
assert hashlib.sha256(open(SRC, "rb").read()).hexdigest() == SOURCE_SHA256, "not the Rubik 2.3 source this was measured on"

def chars(spec):
    out = set()
    for part in spec.split(","):
        a, _, b = part.strip()[2:].partition("-")
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out
def spec(codes):
    codes = sorted(codes); ranges = []
    for c in codes:
        if ranges and c == ranges[-1][1] + 1: ranges[-1][1] = c
        else: ranges.append([c, c])
    return ",".join(f"U+{a:04X}" + (f"-{b:04X}" if b != a else "") for a, b in ranges)

# Google's split (fonts.googleapis.com, Rubik 2.3)
GOOGLE_HEBREW = chars("U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F")
GOOGLE_LATIN = chars("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
SPACE = {0x20, 0xA0}
DIGITS = set(range(0x30, 0x3A))
# the punctuation of Hebrew prose and of the gematria pages (= + × − % [ ]); the rest (# $ & * < > @ \ ^ _ ` { | } ~) stays with Latin letters
PUNCT = {ord(c) for c in "!\"%'()+,-./:;=?[]"} | {0xAB, 0xB7, 0xBB, 0xD7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2212}
COMMON = SPACE | DIGITS | PUNCT

source = TTFont(SRC); cmap = source.getBestCmap()
HEBREW_FACE = GOOGLE_HEBREW | COMMON                       # what the Hebrew file answers for
LATIN_FACE = GOOGLE_LATIN - HEBREW_FACE                     # Latin letters and the rest of Google's Latin range
assert not (HEBREW_FACE & LATIN_FACE) and (HEBREW_FACE | LATIN_FACE) == (GOOGLE_HEBREW | GOOGLE_LATIN)

font = TTFont(SRC)
options = subset.Options()
options.flavor = "woff2"; options.layout_scripts = ["*"]; options.notdef_outline = True
options.layout_features = ["ccmp", "locl", "rvrn", "kern", "mark", "mkmk", "tnum", "pnum"]   # no CSS on the site asks for frac/case/zero/sups
options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; options.name_languages = [0x409]
subsetter = subset.Subsetter(options); subsetter.populate(unicodes=sorted(c for c in HEBREW_FACE if c in cmap)); subsetter.subset(font)
font.flavor = "woff2"; font.save(f"{OUT}/Rubik-Hebrew-Common.woff2")
covered = font.getBestCmap()
assert all(c in covered for c in COMMON), [hex(c) for c in COMMON if c not in covered]

# the stand-ins: Arial-compatible local fonts (Arial, Liberation Sans, Arimo), regular for 400–500 and bold from 600
LIB = "/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf"
lib = {"r": TTFont(LIB % "Regular"), "b": TTFont(LIB % "Bold")}
LOCAL = {"r": "local('Arial'),local('ArialMT'),local('Liberation Sans'),local('LiberationSans'),local('Arimo'),local('Arimo-Regular')",
         "b": "local('Arial Bold'),local('Arial-BoldMT'),local('Liberation Sans Bold'),local('LiberationSans-Bold'),local('Arimo Bold'),local('Arimo-Bold')"}
SAMPLES = {   # running text of each class (no spaces), so a class's mean width matches Rubik's
    "hebrew": "בראשיתבראאלהיםאתהשמיםואתהארץוהארץהיתהתהוובהווחשךעלפניתהוםורוחאלהיםמרחפתעלפניהמיםשלוםרבלאוהביתורתךואיןלמומכשול",
    "latin": "TheQuickBrownFoxJumpsOverTheLazyDogSODHelloWorldELSGematriaTorah",
    "digits": "0123456789180520231820578620291211202627",
    "space": " ",
}
CLASS_RANGE = {"hebrew": GOOGLE_HEBREW, "latin": GOOGLE_LATIN - GOOGLE_HEBREW - DIGITS - SPACE, "digits": DIGITS, "space": SPACE}   # latin: letters and punctuation
BUCKETS = [(400, "1 449"), (500, "450 549"), (600, "550 649"), (700, "650 749"), (800, "750 849"), (900, "850 1000")]
def advance(f, text):
    m = f.getBestCmap(); upm = f["head"].unitsPerEm
    return sum(f["hmtx"][m[ord(c)]][0] for c in text) / upm
upm = source["head"].unitsPerEm; ascent = source["OS/2"].sTypoAscender / upm; descent = -source["OS/2"].sTypoDescender / upm
rules = [
    f"@font-face {{ font-family:'Rubik'; src:url('/fonts/Rubik-Latin.woff2') format('woff2'); font-style:normal; font-weight:400 900; font-display:swap; unicode-range:{spec(LATIN_FACE)}; }}",
    f"@font-face {{ font-family:'Rubik'; src:url('/fonts/Rubik-Hebrew-Common.woff2') format('woff2'); font-style:normal; font-weight:400 900; font-display:swap; unicode-range:{spec(HEBREW_FACE)}; }}",
]
for weight, bucket in BUCKETS:
    rubik = instancer.instantiateVariableFont(TTFont(SRC), {"wght": weight}, updateFontNames=False)
    base = "r" if weight <= 500 else "b"
    for name, sample in SAMPLES.items():
        scale = advance(rubik, sample) / advance(lib[base], sample)
        rules.append(f"@font-face {{ font-family:'Sod Rubik Fallback'; src:{LOCAL[base]}; font-weight:{bucket}; unicode-range:{spec(CLASS_RANGE[name])}; "
                     f"size-adjust:{scale*100:.1f}%; ascent-override:{ascent/scale*100:.1f}%; descent-override:{descent/scale*100:.1f}%; line-gap-override:0%; }}")
print("\n".join(rules))
