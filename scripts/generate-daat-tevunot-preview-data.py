#!/usr/bin/env python3
"""Build the read-only Daat Tevunot Preview corpus from its licensed witness.

Input 1 is the MediaWiki parse API response for `דעת תבונות שלם`.
Input 2 is `pdftotext -raw` output from the approved SOD1820 site edition.
The generated module is static: the Preview runtime never calls Wikimedia or
Supabase, and it contains no private research-object fields.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from lxml import html


BRANCHES = [
    {
        "key": "opening",
        "title": "השאלה הגדולה",
        "shortTitle": "השאלה",
        "range": [1, 33],
        "color": "#776149",
        "summary": "מן המבוכה על ההשגחה אל בירור תכלית האדם, ההטבה, החיסרון והשלמות.",
        "plainGuide": "הספר נפתח לא בתשובה אלא בבקשה להבין. הנשמה מבקשת כללים שיאפשרו לחיות עם שאלות ההשגחה בלי להעמיד פנים שכל פרט פתור. מכאן נבנה היסוד: האדם והבריאה נעים מחיסרון אל שלמות.",
        "questions": ["מה בדיוק מבקשת הנשמה להבין?", "כיצד תכלית האדם קשורה לטוב ולהשלמה?"],
    },
    {
        "key": "unity",
        "title": "הנהגת הייחוד",
        "shortTitle": "ייחוד",
        "range": [34, 58],
        "color": "#0f766e",
        "summary": "גילוי הייחוד, מקום הרע, הממשלה היחידית והמהלך הנסתר שמוביל את הכול לתיקון.",
        "plainGuide": "לצד המשפט הנראה לעין פועל מהלך כולל יותר: הבריאה אינה נשארת מפורדת, והרע אינו בעל קיום עצמאי ונצחי. זהו מבט על הכיוון הכולל של ההיסטוריה, לא פתרון קל לכל מאורע פרטי.",
        "questions": ["מה גלוי בהנהגה ומה נסתר בה?", "כיצד היחוד משנה את תמונת הסוף?"],
    },
    {
        "key": "body-soul",
        "title": "גוף, נשמה ותחיית המתים",
        "shortTitle": "גוף ונשמה",
        "range": [59, 81],
        "color": "#7c3f58",
        "summary": "מבנה האדם, עבודת הגוף והנשמה, הזיכוך, הגמול והזמנים השונים של הקשר ביניהם.",
        "plainGuide": "האדם אינו נשמה הכלואה בגוף בלבד. שני החלקים שותפים לעבודה ולשכר, והקשר ביניהם משתנה בשלבים. תחיית המתים מוצגת כחלק ממסלול השלמת האדם כולו.",
        "questions": ["מה כל אחד משני חלקי האדם מוסיף?", "כיצד העבודה משנה את הגוף ואת הנשמה?"],
    },
    {
        "key": "concealment",
        "title": "הסתר, הארה ומדרגות",
        "shortTitle": "הסתר וגילוי",
        "range": [82, 95],
        "color": "#9a6700",
        "summary": "הסתר פנים והארת פנים כשורשי המצבים, וחמש מדרגות של שליטת הנשמה בגוף.",
        "plainGuide": "הסתר והארה אינם רק רגשות דתיים אלא שני אופני הנהגה שמעצבים את מצבי האדם. הספר ממפה מדרגות מעבר הדרגתיות ולא קפיצה אחת מחושך לאור.",
        "questions": ["איזו מדרגה מתוארת כעת?", "מה משתנה ביחס שבין הנשמה לגוף?"],
    },
    {
        "key": "influence",
        "title": "שפע, טוב ורע",
        "shortTitle": "שפע ורע",
        "range": [96, 120],
        "color": "#174ea6",
        "summary": "כיצד השפעה, צמצומה והעדרה מולידים את מצבי הטוב, החיסרון וההפסד שבטבע.",
        "plainGuide": "הדיון מבדיל בין יצירת הטוב לבין הופעת הרע. הרע מתואר כמצב מוגבל של חיסרון, העדר או קלקול בטוב — לא כמקור עצמאי המקביל לטוב.",
        "questions": ["מהי ההשפעה שנבחנת בסעיף?", "האם מדובר ביצירה, בהעדר או בהפסד?"],
    },
    {
        "key": "repair",
        "title": "מבנה הבריאה וסדר התיקון",
        "shortTitle": "סדר התיקון",
        "range": [121, 135],
        "color": "#496b3a",
        "summary": "קשרי חלקי הבריאה, גבולות הרע, מקומם של ישראל והמעבר מן הקלקול אל סדר התיקון.",
        "plainGuide": "מה שנראה כמערכת של פרטים מפוזרים נקרא כאן כמבנה מקושר. התיקון איננו מחיקה מקרית של הרע אלא תהליך בעל גבולות, סדר ותכלית כוללת.",
        "questions": ["כיצד הפרט נקשר לכלל?", "איזה שלב בתיקון העולם מתואר כאן?"],
    },
    {
        "key": "judgment",
        "title": "הנהגת המשפט",
        "shortTitle": "משפט",
        "range": [136, 174],
        "color": "#8b4a24",
        "summary": "שכר ועונש, מידות ההנהגה, צדיק ורע לו, זמן, תיקון כללי ומזל כסדר הנהגה.",
        "plainGuide": "זהו הענף הרחב של המשפט: כיצד המעשים, מצב המקבל, הזמן והמהלך הכללי נפגשים. הספר שומר גבול ברור — אפשר להבין את הכללים, אך לא לפענח בוודאות את הסיבה הנסתרת לכל סבל פרטי.",
        "questions": ["איזה כלל של משפט פועל כאן?", "מה ידוע, ומה הספר משאיר מחוץ להשגה?"],
    },
    {
        "key": "prophecy",
        "title": "נבואה, דמות ומראה",
        "shortTitle": "נבואה",
        "range": [175, 190],
        "color": "#5c4b8a",
        "summary": "מהות הנבואה, התמונות הנבואיות, ההבדל בין המראה לבין הנמשל ומדרגת משה.",
        "plainGuide": "המראה הנבואי הוא אמצעי של השגה ולא תיאור של עצמות הבורא. צורה, לבוש, מרחק ובהירות נושאים משמעות — ולכן צריך להבחין תמיד בין הדמות הנראית לבין המציאות שהיא מייצגת.",
        "questions": ["מה שייך למראה ומה לנמשל?", "איזו מגבלת השגה נשמרת בסעיף?"],
    },
    {
        "key": "closing",
        "title": "סוד הבריאה והחתימה",
        "shortTitle": "חתימה",
        "range": [191, 195],
        "color": "#365f66",
        "summary": "שאלת היש מאין, גבול הידיעה וסיום המסע ביישוב האמונה.",
        "plainGuide": "הסיום מבחין בין מה שאין בכוחנו לדעת — אופן הפעולה האלוהית עצמה — לבין מה שאפשר לחקור: על מה הפעולה חלה, באיזה סדר ולאיזו תכלית.",
        "questions": ["היכן עובר גבול החקירה?", "איזו ידיעה נשארת בידי הקורא בסיום?"],
    },
]


SECTION_RE = re.compile(
    r"\(([א-ת״׳\" ]+)\)\s*\.?\s*(אמרה הנשמה|אמר השכל)\s*-?\s*"
)


def clean_section(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    # MediaWiki transclusion leaves page-navigation labels inside text_content.
    # Their two known forms are a numeric folio label and a hyphenated subpage
    # title. Remove only those bounded forms, not ordinary Hebrew around them.
    value = re.sub(r"\s*דעת תבונות \d+\s*", " ", value)
    value = re.sub(r"\s*דעת-תבונות(?:-\s?[א-ת״׳\"]+)+(?:\s*\[)?\s*", " ", value)
    value = re.sub(r"\s*\^\s*ראו בדף השיחה\s*$", "", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def first_focus(value: str) -> str:
    first = re.split(r"(?<=[.!?])\s+", value, maxsplit=1)[0].strip()
    if len(first) <= 190:
        return first
    clipped = first[:187].rsplit(" ", 1)[0]
    return f"{clipped}…"


def page_map(raw_text: str) -> list[tuple[str, int]]:
    found: list[tuple[str, int]] = []
    for page, content in enumerate(raw_text.split("\f"), start=1):
        plain = re.sub(r"[\u202a-\u202e\u2066-\u2069]", "", content)
        for marker in re.findall(r"\)\(([א-ת״׳\"]+)\s*$", plain, re.MULTILINE):
            found.append((marker, page))
    return found


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: generate-daat-tevunot-preview-data.py MEDIAWIKI_JSON PDFTEXT_RAW OUTPUT_JS")

    mediawiki_path, pdf_text_path, output_path = map(Path, sys.argv[1:])
    parsed = json.loads(mediawiki_path.read_text(encoding="utf-8"))
    text = html.fromstring(parsed["parse"]["text"]).text_content()
    text = re.sub(r"\s+", " ", text)
    matches = list(SECTION_RE.finditer(text))
    pages = page_map(pdf_text_path.read_text(encoding="utf-8"))
    if len(matches) != 195 or len(pages) != 195:
        raise SystemExit(f"expected 195 sections/pages, got {len(matches)}/{len(pages)}")

    sections = []
    for index, match in enumerate(matches):
        marker = match.group(1).strip()
        pdf_marker, pdf_page = pages[index]
        if marker != pdf_marker:
            raise SystemExit(f"marker mismatch at {index + 1}: {marker} != {pdf_marker}")
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        source_text = clean_section(text[match.end():end])
        branch = next(item for item in BRANCHES if item["range"][0] <= index + 1 <= item["range"][1])
        sections.append({
            "id": index + 1,
            "marker": marker,
            "speaker": "הנשמה" if "הנשמה" in match.group(2) else "השכל",
            "pdfPage": pdf_page,
            "branch": branch["key"],
            "focus": first_focus(source_text),
            "sourceText": source_text,
        })

    source = """// Generated from the CC BY-SA 4.0 Wikisource edition and the approved\n// SOD1820 site-edition PDF. Do not hand-edit section text; regenerate instead.\n\n"""
    source += "export const DAAT_TEVUNOT_SOURCE = Object.freeze(" + json.dumps({
        "title": "דעת תבונות",
        "author": "רבי משה חיים לוצאטו (הרמח״ל)",
        "pdfUrl": "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/daat-tevunot-site-edition.pdf",
        "wikisourceUrl": "https://he.wikisource.org/wiki/דעת_תבונות_שלם",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.he",
        "license": "CC BY-SA 4.0",
        "edition": "מהדורת אתר SOD1820 המבוססת על נוסח ויקיטקסט",
        "pdfPages": 99,
        "sectionCount": 195,
    }, ensure_ascii=False, indent=2) + ");\n\n"
    source += "export const DAAT_TEVUNOT_BRANCHES = Object.freeze(" + json.dumps(BRANCHES, ensure_ascii=False, indent=2) + ".map(branch => Object.freeze({ ...branch, range: Object.freeze(branch.range), questions: Object.freeze(branch.questions) })));\n\n"
    source += "export const DAAT_TEVUNOT_SECTIONS = Object.freeze(" + json.dumps(sections, ensure_ascii=False, indent=2) + ".map(section => Object.freeze(section)));\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    main()
