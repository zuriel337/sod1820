// The public search face of the community calculator (/community/calculator). ONE source for the server metadata (api/og.js), the client
// SEO effect, the visible explanation and the structured data, so the four can never drift apart.
//
// Why it is worded like this: before the 2029 cutover this address was the site's main Google landing page for calculator queries
// (Search Console, 18.6 - 8.11.2026: 338 clicks and 31,120 impressions at an average position of 7.9; the top query was "מחשבון גימטריה").
// After the cutover the title said "מחשבון הקהילה — גימטריה, שמות ותאריך עברי" and the description "המחשבון הקיים: ...": neither carried the
// phrase searchers type. Impressions fell from about 600 a day (31.10) to 1 (6.11) and the page left the results.
// The title and the opening of the description restore the wording this address had while it ranked (api/og.js of the last Legacy production
// commit d1837efcf, 31.10.2026): "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם" and "רוצים לדעת מה מסתתר בשם שלכם?". The old description said
// "8 שיטות"; the page shows more than twenty, so the number is not repeated.
// Everything here is a statement about what the page really does; nothing promises a feature that is switched off (no AI, no saving).

export const COMMUNITY_CALCULATOR_PATH = "/community/calculator";
export const COMMUNITY_CALCULATOR_SITE = "https://sod1820.co.il";
export const COMMUNITY_CALCULATOR_SITE_NAME = "SOD1820";

// The day the public content of this page (title, wording, visible explanation) last changed. The sitemap publishes it as <lastmod>: Google's last
// visit (4.11.2026) saw the page as noindex, and an honest, later date is the only signal the sitemap can give that the page is worth a new visit.
// Move it forward only when the public content really changes; it is not a build date.
export const COMMUNITY_CALCULATOR_LASTMOD = "2026-11-16";

// `title` is the page title WITHOUT the site name (applySeo and api/og.js both append " · SOD1820").
export const COMMUNITY_CALCULATOR_SEO = Object.freeze({
  title: "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם",
  description: "רוצים לדעת מה מסתתר בשם שלכם? מחשבון גימטריה חינמי ומדויק של SOD1820 — חישוב כל שם או מילה בכל השיטות, השוואה בין שני שמות ובדיקת שם לתינוק ותאריך עברי.",
  heading: "מחשבון גימטריה חינם",
  hook: "מה מסתתר בשם שלכם?",
  introHeading: "מחשבון גימטריה לכל שם, מילה וביטוי",
  lead:"חשבו כל שם, מילה או ביטוי בכל שיטות הגימטריה (גמטריה): רגיל, מילוי, מסתתר, גדול, אתבש ועוד. גלו את הערכים, השוו בין שמות והמשיכו אל הביטויים שמתחברים אליהם.",
});

// The explanation shown under the calculator (visible text, indexed with the page).
export const COMMUNITY_CALCULATOR_EXPLAINER = Object.freeze({
  heading: "איך מחשבים גימטריה",
  paragraphs: Object.freeze([
    "גימטריה (או גמטריה) היא שיטה שבה לכל אות עברית יש ערך מספרי, והערך של שם, מילה או ביטוי הוא סכום ערכי האותיות שלהם. בשיטה הרגילה א׳ שווה 1, י׳ שווה 10, ק׳ שווה 100 וכן הלאה עד ת׳, שהיא 400.",
    "הקלידו שם, מילה או ביטוי בשדה שבראש הדף, והמחשבון יציג מיד את הערך בכל השיטות. לחיצה על שיטה מציגה אותה בגדול, והקישור ״למספר ולביטוי״ ממשיך אל דף המספר.",
    "מעבר לשיטה הרגילה יש כאן את המילוי (ערך שם האות המלא), המסתתר (הפרשים בין אותיות), הגדול (סופיות 500–900), הסידורי, האתבש (היפוך הא״ב), האלבם, האטבח ועוד.",
  ]),
});

export const COMMUNITY_CALCULATOR_FAQ = Object.freeze([
  Object.freeze({ q: "מהי גימטריה?", a: "גימטריה היא שיטה לקביעת ערך מספרי למילים ולשמות לפי ערכי האותיות העבריות. בשיטה הרגילה האותיות מקבלות ערכים מ־1 עד 400, והערך של מילה הוא סכום ערכי אותיותיה." }),
  Object.freeze({ q: "איך מחשבים גימטריה של שם?", a: "מקלידים את השם בשדה החישוב. המחשבון מחשב אותו מיד בכל השיטות ומציג את הערך של כל שיטה, ואפשר להשוות אותו לשם שני." }),
  Object.freeze({ q: "מה ההבדל בין רגיל, מילוי ומסתתר?", a: "ברגיל מחברים את ערכי האותיות. במילוי מחברים את ערך שם האות המלא (למשל אלף, בית, גימל). במסתתר מחשבים הפרשים בין אותיות." }),
  Object.freeze({ q: "האם המחשבון חינם ודורש הרשמה?", a: "המחשבון חינם ופתוח לכולם, בלי הרשמה." }),
  Object.freeze({ q: "אפשר לבדוק גם שם לתינוק ותאריך עברי?", a: "כן. אפשר להשוות שני שמות, לבדוק עד שלושה שמות לתינוק יחד עם שם משפחה ותאריך לידה, ולהמיר תאריך לועזי לתאריך עברי ולראות את ערכו בגימטריה." }),
  Object.freeze({ q: "מה ההבדל בין מחשבון הקהילה למחשבון המקצועי?", a: "מחשבון הקהילה מתמקד בשמות, בהשוואות ובתאריכים. המחשבון המקצועי כולל גם פנקס אותיות ותצוגות מתקדמות." }),
]);

// schema.org graph for the BARE address only (a query string can carry a private name and never reaches the index).
export function communityCalculatorJsonLd({ site = COMMUNITY_CALCULATOR_SITE, siteName = COMMUNITY_CALCULATOR_SITE_NAME } = {}) {
  const url = site + COMMUNITY_CALCULATOR_PATH;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": url + "#app",
        name: `${COMMUNITY_CALCULATOR_SEO.heading} · ${siteName}`,
        url,
        description: COMMUNITY_CALCULATOR_SEO.description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        inLanguage: "he",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
        publisher: { "@type": "Organization", name: siteName, url: site },
      },
      {
        "@type": "FAQPage",
        "@id": url + "#faq",
        mainEntity: COMMUNITY_CALCULATOR_FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };
}
