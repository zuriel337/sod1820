// The public search face of the main gematria calculator (/gematria). ONE source for the server metadata (api/og.js), the page's own SEO
// effect (CalculatorPro2029Page and the shared-result page), the visible heading and the first words, so they can never drift apart.
//
// Why it is worded like this (ZURIEL 20.11.2026, Search Console 17.6–17.11.2026):
//  - "מחשבון גימטריה" is the search people type: 15,673 impressions, plus "גימטריה מחשבון" 2,469 and the spellings "מחשבון גימטריא" 235,
//    "מחשבון גמטריה" 194, "מחשבון גימטרייה" 51. Both calculators sat at position ~8. The phrase opens the title.
//  - Then what the page really does that people also type: every method ("שיטות"), the letters ("מחשבון גימטריה אותיות"), and the phrases of
//    the same value. Nothing it does not do: no AI, no saving, no verse search on this page.
//  - The community calculator owns the names searches ("מחשבון גימטריה לשמות"); this page owns the general one. Both open with the phrase.
// Before this file the server said "...ב-8 שיטות ... קיר הגימטריה החי" (about 30 methods today; the wall is retired), and the page set its own
// title with the site name twice ("מחשבון גימטריה מקצועי · SOD1820 · SOD1820", read live 20.11.2026).

export const CALCULATOR_PRO_PATH = "/gematria";

// `title` WITHOUT the site name: applySeo and api/og.js both append " · SOD1820".
export const CALCULATOR_PRO_SEO = Object.freeze({
  title: "מחשבון גימטריה מקצועי — חישוב בכל השיטות ופירוק אותיות",
  description: "מחשבון גימטריה מקצועי לחישוב מילים וביטויים. בדקו את הערך בשיטות גימטריה שונות, בהן רגיל, מילוי, מסתתר ואתבש, וגלו את ערכה של כל אות וביטויים באותו ערך.",
  heading: "מחשבון גימטריה מקצועי",
  lead: "הקלידו מילה, שם או ביטוי וקבלו את הערך בכל שיטות הגימטריה, עם פירוק האותיות והביטויים המאומתים ששווים לאותו ערך.",
});
