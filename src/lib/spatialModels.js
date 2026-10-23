// מרחבים ומבנים — curated identities over the one Reality Graph.
// Source text, publication state, media and review rows are read live by the projection.
// This file stores only human-gated classification and deterministic shape/math contracts.

export const SPATIAL_FRAMEWORK = Object.freeze({
  version: 3,
  title: "מרחבים ומבנים",
  subtitle: "הגיאומטריה של העץ",
  intro: "מקור, חישוב, מבנה, המחשה ופרשנות נשארים חמישה רבדים נפרדים של אותו עולם.",
  sections: Object.freeze([
    Object.freeze({ key: "selected", label: "מבנים נבחרים" }),
    Object.freeze({ key: "solids", label: "קוביות ופאונים" }),
    Object.freeze({ key: "complex", label: "מבנים מורכבים" }),
    Object.freeze({ key: "series", label: "סדרות" }),
  ]),
  truthLayers: Object.freeze(["source_claim", "verified_calculation", "geometric_structure", "visual_illustration", "spiritual_interpretation"]),
});

const source = ({ refs, mediaRefs = [], duplicateRefs = [], representativeRef = null }) => ({
  contributor: "צבי", refs, mediaRefs, duplicateRefs, representativeRef: representativeRef || refs[0],
});
const gematria = (term, expected) => ({ term, expected, methodKey: "רגיל" });
const multiply = (expression, factors, result) => ({ operationKey: "multiply", expression, factors, result });
const add = (expression, addends, result) => ({ operationKey: "add", expression, addends, result });

export const SPATIAL_MODELS = Object.freeze([
  {
    slug: "hashgacha-pratit-1020", section: "solids", series: ["קוביות הגנה"], form: "קובייה",
    title: "קוביית טוב — השגחה פרטית", subtitle: "שישים מופעים של טוב בשש פאות", value: 1020,
    gematria: [gematria("טוב", 17), gematria("אמונה", 102), gematria("השגחה פרטית", 1020)],
    sourceClaims: ["בכל אחת משש הפאות מופיעה המילה «טוב» עשר פעמים."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "faces", value: 6, provenance: "cube_geometry" }],
      operations: [multiply("6 × 10 × 17", [6, 10, 17], 1020), multiply("10 × 102", [10, 102], 1020)],
      provenance: source({ refs: ["channel_updates:2eb781a4-1389-42b9-b19e-a1ff27ed861f"], mediaRefs: ["channel_updates:2eb781a4-1389-42b9-b19e-a1ff27ed861f"] }),
    },
    interpretation: "המקור מפרש את הקובייה כמעטפת אור ואמונה. זו פרשנות רוחנית, לא תוצאת החישוב.",
    review: { connectionStrength: "חזק", evidenceQuality: "מקור חזותי וחישוב דטרמיניסטי", recommendation: "מתאים לעץ" },
  },
  {
    slug: "raza-deshabbat-910", section: "solids", series: ["קוביות הגנה"], form: "קובייה",
    title: "קוביית אחד — רזא דשבת", subtitle: "שני מסלולים אריתמטיים אל 910", value: 910,
    gematria: [gematria("רזא", 208), gematria("שבת", 702), gematria("סוד", 70), gematria("אחד", 13), gematria("שרית", 910)],
    sourceClaims: ["«רזא» + «שבת» ו־«סוד» × «אחד» מתכנסים ל־910."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "directions", value: 6, provenance: "cube_geometry" }],
      operations: [add("208 + 702", [208, 702], 910), multiply("70 × 13", [70, 13], 910)],
      provenance: source({
        refs: ["channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14", "channel_updates:bc0aa8ce-30fc-4a22-b42d-113a456f5e58"],
        mediaRefs: ["channel_updates:a6805e30-21e0-4315-8f35-70b1bfdb0d14", "channel_updates:0cae4513-9e41-4bd9-a938-a8d9a26938b6"],
        duplicateRefs: ["channel_updates:bc0aa8ce-30fc-4a22-b42d-113a456f5e58"], representativeRef: "channel_updates:bc0aa8ce-30fc-4a22-b42d-113a456f5e58",
      }),
    },
    interpretation: "המקור מפרש את הצורה כמעטפת אחדות ושמירה לשבת.",
    review: { connectionStrength: "חזק", evidenceQuality: "שני מסלולים מאומתים ומדיה סמוכה", recommendation: "מתאים לעץ" },
  },
  {
    slug: "keter-icosahedron-620", section: "solids", series: ["פאוני כתר"], form: "עשרימון",
    title: "עשרימון הכתר — עשרים אל", subtitle: "עשרים פאות כפול 31", value: 620,
    gematria: [gematria("אל", 31), gematria("עשרים", 620), gematria("כתר", 620)],
    sourceClaims: ["על כל אחת מעשרים פאות העשרימון מוצבת המילה «אל»."],
    spatial: {
      shapeIdentity: "icosahedron", dimension: "3d", structuralProperties: [{ key: "faces", value: 20, provenance: "icosahedron_geometry" }],
      operations: [multiply("20 × 31", [20, 31], 620)],
      provenance: source({
        refs: ["channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5", "channel_updates:beb34cf8-de31-413e-af6e-73efabceda24", "channel_updates:b0d16169-e7a8-424a-984f-9c7435d12594"],
        mediaRefs: ["channel_updates:9a2ebafc-592a-4bd3-9ab6-f0edf2b086f5", "channel_updates:beb34cf8-de31-413e-af6e-73efabceda24", "channel_updates:dabebad9-37fa-4962-a7d5-21a677b8b0c4"],
        duplicateRefs: ["channel_updates:beb34cf8-de31-413e-af6e-73efabceda24", "channel_updates:b0d16169-e7a8-424a-984f-9c7435d12594"],
        representativeRef: "channel_updates:b0d16169-e7a8-424a-984f-9c7435d12594",
      }),
    },
    interpretation: "המקור מציג את הכתר כצורה מרחבית; המשמעות הרוחנית נשארת רובד נפרד.",
    review: { connectionStrength: "חזק", evidenceQuality: "גיאומטריה קבועה, מנוע ומדיה", recommendation: "מתאים לעץ" },
  },
  {
    slug: "matamim-cube-1254", section: "solids", series: ["קוביות מילים"], form: "קובייה",
    title: "קוביית מטעמים", subtitle: "שש פאות כפול 209", value: 1254,
    gematria: [gematria("מטעמים", 209), gematria("הדעת טוב ורע לא תאכל", 1254), gematria("ושכנתי בתוכם", 1254)],
    sourceClaims: ["הטענה ש«מטעמים» מופיעה שש פעמים בבראשית דורשת בדיקת קורפוס נפרדת."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "faces", value: 6, provenance: "cube_geometry" }],
      operations: [multiply("6 × 209", [6, 209], 1254)],
      provenance: source({
        refs: ["channel_updates:71662e56-24dd-4a4a-8dea-b615d636b509", "channel_updates:14d5652b-55b2-4bf7-9184-049b1afb94a0"],
        mediaRefs: ["channel_updates:71662e56-24dd-4a4a-8dea-b615d636b509"], representativeRef: "channel_updates:71662e56-24dd-4a4a-8dea-b615d636b509",
      }),
    },
    interpretation: "המקור מפרש את המטעמים כתיקון לעץ הדעת. טענת הקורפוס והפרשנות אינן חלק מאימות הכפל.",
    review: { connectionStrength: "חזק", evidenceQuality: "החישוב מאומת; ספירת הקורפוס עדיין לבדיקה", recommendation: "מתאים לעץ" },
  },
  {
    slug: "yesharim-3060-family", section: "complex", series: ["משפחת 3060", "קוביות הגנה"], form: "קובייה, מחומשים ומשולשים",
    title: "3060 — משפחת המבנים של ישר", subtitle: "חמישה מסלולי חישוב באשכול מקור אחד", value: 3060,
    gematria: [gematria("ישר", 510), gematria("ברית", 612), gematria("טוב", 17), gematria("השגחה פרטית", 1020)],
    sourceClaims: ["המקור מחבר קובייה, שני מחומשים וארבעה משולשים סביב אותו ערך."],
    spatial: {
      shapeIdentity: "compound:cube-pentagon-triangles", dimension: "mixed",
      structuralProperties: [{ key: "cube_faces", value: 6, provenance: "cube_geometry" }, { key: "outer_pentagon_parts", value: 5, provenance: "source_diagram" }, { key: "inner_triangles", value: 4, provenance: "source_diagram" }],
      operations: [multiply("510 × 6", [510, 6], 3060), multiply("612 × 5", [612, 5], 3060), multiply("17 × 180", [17, 180], 3060), multiply("765 × 4", [765, 4], 3060), multiply("1020 × 3", [1020, 3], 3060)],
      provenance: source({
        refs: ["channel_updates:e68793a9-a7ae-46a5-8023-ca209dd8a65f", "channel_updates:39d0dba8-9fa1-4743-9ebc-4f7d5c155a0b", "channel_updates:64155afc-c205-42a8-8e74-0315ab93cda6", "channel_updates:94be5c72-3042-4c61-8fe7-134ce57b3edc", "channel_updates:d5bef7a5-0673-4c2e-98da-0d1c538724ad", "channel_updates:d76e2d8c-724f-454e-bff3-7668dbb6ab82"],
        mediaRefs: ["channel_updates:da2b98af-cafa-4209-aaeb-c33fd549a90c", "channel_updates:305b8335-72bf-43e5-9edd-0d1b4340f97f", "channel_updates:3c8ea715-0e4e-4690-9d49-b011b71b61d2", "channel_updates:2a3d4ece-101d-41a1-af0f-51851db890d5", "channel_updates:5ea25825-f2da-4b7f-ae23-77b0868408a6"],
        duplicateRefs: ["channel_updates:d5bef7a5-0673-4c2e-98da-0d1c538724ad"], representativeRef: "channel_updates:64155afc-c205-42a8-8e74-0315ab93cda6",
      }),
    },
    interpretation: "המקור מפרש את ההתכנסות כברית, חסד וזכות אבות. רק האריתמטיקה והערכים שנבדקו מסומנים כמאומתים.",
    review: { connectionStrength: "חזק", evidenceQuality: "מסלולים מרובים; חלקי התרשים נשארים טענת מקור", recommendation: "מתאים לעץ" },
  },
  {
    slug: "emunah-brit-cube-612", section: "series", series: ["קוביות הגנה", "משפחת 612"], form: "קובייה",
    title: "קוביית אמונה וברית", subtitle: "שש פעמים אמונה", value: 612,
    gematria: [gematria("אמונה", 102), gematria("ברית", 612), gematria("תלמידי חכמים", 612)],
    sourceClaims: ["המקור מציב אמונה בכל אחד מששת כיווני הקובייה."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "directions", value: 6, provenance: "cube_geometry" }], operations: [multiply("6 × 102", [6, 102], 612)],
      provenance: source({
        refs: ["channel_updates:aa5276b4-6246-4334-8d96-5e8111ccff0c", "channel_updates:710edaf6-440a-4e40-931c-b1626503d744", "channel_updates:1011feef-c35f-44b6-9c3d-450e1fc0ca1d"],
        mediaRefs: ["channel_updates:d485746a-4557-4e3b-b367-f0fe9693df46", "channel_updates:51e71029-045c-4489-8a89-364c529a6d09", "channel_updates:d897c365-d977-4ca1-a32a-74f36ebfcd50"],
        duplicateRefs: ["channel_updates:710edaf6-440a-4e40-931c-b1626503d744"], representativeRef: "channel_updates:1011feef-c35f-44b6-9c3d-450e1fc0ca1d",
      }),
    },
    interpretation: "המקור קורא לששת הכיוונים מעטפת אמונה; זו פרשנות שאינה משנה את החישוב.",
    review: { connectionStrength: "חזק", evidenceQuality: "מנוע, גיאומטריה ומדיה מקושרת", recommendation: "מתאים לעץ" },
  },
  {
    slug: "chai-cube-1080", section: "series", series: ["משפחת 1080", "קוביות חיים"], form: "קובייה",
    title: "קוביית חי — 1080", subtitle: "עשר פעמים חי בכל פאה", value: 1080,
    gematria: [gematria("חי", 18), gematria("חסדי יהוה", 108), gematria("ימי חייך", 108), gematria("חק", 108)],
    sourceClaims: ["בכל פאה מופיעות עשר יחידות «חי»."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "faces", value: 6, provenance: "cube_geometry" }],
      operations: [multiply("18 × 10 × 6", [18, 10, 6], 1080), multiply("108 × 10", [108, 10], 1080)],
      provenance: source({
        refs: ["channel_updates:bf535fbb-5422-4d77-b3b2-1b6a5a149711", "channel_updates:29ba7ea6-96b8-4143-97b0-b3882a999cef"],
        mediaRefs: ["channel_updates:a9d05b02-55cd-4de9-8491-0ae521f010e2", "channel_updates:38e1658c-b52d-4e19-98a8-7515d3ea5e76"],
        duplicateRefs: ["channel_updates:bf535fbb-5422-4d77-b3b2-1b6a5a149711"], representativeRef: "channel_updates:29ba7ea6-96b8-4143-97b0-b3882a999cef",
      }),
    },
    interpretation: "המקור מפרש את הקובייה כחסדי השם המלווים את חיי האדם.",
    review: { connectionStrength: "חזק", evidenceQuality: "נוסחה מדויקת ומדיה סמוכה", recommendation: "מתאים לעץ" },
  },
  {
    slug: "chai-star-1080", section: "solids", series: ["משפחת 1080", "פאוני חיים"], form: "כוכב רב־פאות",
    title: "כוכב שישים הפאות", subtitle: "שישים פאות משולשות כפול חי", value: 1080,
    gematria: [gematria("חי", 18)], sourceClaims: ["לצורה שבתמונה מיוחסות 60 פאות משולשות, 32 קודקודים ו־90 מקצועות."],
    spatial: {
      shapeIdentity: "sixty-face-star", dimension: "3d", structuralProperties: [{ key: "triangular_faces", value: 60, provenance: "source_diagram_claim" }], operations: [multiply("60 × 18", [60, 18], 1080)],
      provenance: source({ refs: ["channel_updates:175ef8a6-b683-41e0-aac2-c50bcd3f72a3"], mediaRefs: ["channel_updates:799e955a-3214-4c1d-bd54-3786fa8b9029"] }),
    },
    interpretation: "המקור קושר את הצורה לחיים, אברהם ותהילים. זיהוי הפאון המדויק עדיין נשען על התרשים.",
    review: { connectionStrength: "בינוני", evidenceQuality: "החישוב מאומת; זהות הפאון דורשת בדיקה", recommendation: "דורש בדיקה" },
  },
  {
    slug: "zot-cube-408", section: "solids", series: ["משפחת 408", "קוביות חיים"], form: "קובייה",
    title: "קוביית חיים — זאת", subtitle: "שש פעמים חיים", value: 408,
    gematria: [gematria("חיים", 68), gematria("זאת", 408), gematria("אמונה", 102)], sourceClaims: ["כל אחת משש הפאות מקבלת את הערך «חיים»."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "faces", value: 6, provenance: "cube_geometry" }], operations: [multiply("6 × 68", [6, 68], 408), multiply("4 × 102", [4, 102], 408)],
      provenance: source({ refs: ["channel_updates:3d964695-e6de-41b4-b58d-952f6146d90d"] }),
    },
    interpretation: "המקור קושר את «זאת» לספירת המלכות ולעץ חיים.",
    review: { connectionStrength: "חזק", evidenceQuality: "חישוב מאומת; המחשה חזותית חסרה", recommendation: "דורש OCR או תמלול" },
  },
  {
    slug: "arbaat-haminim-cube-828", section: "solids", series: ["קוביות מילים"], form: "קובייה",
    title: "קוביית ארבעת המינים", subtitle: "שש פעמים צמח", value: 828,
    gematria: [gematria("צמח", 138), gematria("ארבעת המינים", 828)], sourceClaims: ["המקור מציב את «צמח» בששת כיווני הקובייה."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "faces", value: 6, provenance: "cube_geometry" }], operations: [multiply("6 × 138", [6, 138], 828)],
      provenance: source({
        refs: ["channel_updates:e68735d7-71a4-417e-8ea7-33db737b793f", "channel_updates:9f67e21f-cfea-4ee7-a113-e43548772afc"], mediaRefs: ["channel_updates:6afe9c9f-523c-4567-b63a-b17831644ece"],
        duplicateRefs: ["channel_updates:e68735d7-71a4-417e-8ea7-33db737b793f"], representativeRef: "channel_updates:9f67e21f-cfea-4ee7-a113-e43548772afc",
      }),
    },
    interpretation: "המקור מפרש את ששת הכיוונים כהארת צמח ואחדות ארבעת המינים.",
    review: { connectionStrength: "חזק", evidenceQuality: "מנוע, כפל ומדיה מקושרת", recommendation: "מתאים לעץ" },
  },
  {
    slug: "na-kippur-cube-306", section: "solids", series: ["קוביות מילים"], form: "קובייה",
    title: "קוביית נא — כפור", subtitle: "שש פעמים נא", value: 306,
    gematria: [gematria("נא", 51), gematria("כפור", 306)], sourceClaims: ["המקור מציב את «נא» בכל אחת משש הפאות או הכיוונים."],
    spatial: {
      shapeIdentity: "cube", dimension: "3d", structuralProperties: [{ key: "directions", value: 6, provenance: "cube_geometry" }], operations: [multiply("6 × 51", [6, 51], 306)],
      provenance: source({
        refs: ["channel_updates:3aa20146-133d-4183-9e24-540c0ce0dd28", "channel_updates:432ed0eb-d367-4383-9ce8-03c7020af9aa"], mediaRefs: ["channel_updates:0342eef3-f47b-4661-bf50-2707bd4a9120"],
        duplicateRefs: ["channel_updates:432ed0eb-d367-4383-9ce8-03c7020af9aa"], representativeRef: "channel_updates:3aa20146-133d-4183-9e24-540c0ce0dd28",
      }),
    },
    interpretation: "המקור מפרש את השש כקצוות המציאות ואת «נא» כבקשת סליחה.",
    review: { connectionStrength: "חזק", evidenceQuality: "חישוב מדויק ומדיה סמוכה", recommendation: "מתאים לעץ" },
  },
  {
    slug: "zot-compound-408", section: "complex", series: ["משפחת 408"], form: "מחומש בתוך מתומן",
    title: "זאת — דין ורחמים", subtitle: "200 בתוך 208", value: 408,
    gematria: [gematria("א", 1), gematria("אל", 31), gematria("אלה", 36), gematria("אלהי", 46), gematria("אלהים", 86), gematria("יהוה", 26), gematria("זאת", 408)],
    sourceClaims: ["התרשים מציב חמש מילים במחומש ושמונה מופעי שם במתומן המקיף."],
    spatial: {
      shapeIdentity: "compound:pentagon-octagon", dimension: "2d-diagram",
      structuralProperties: [{ key: "inner_sides", value: 5, provenance: "source_diagram" }, { key: "outer_sides", value: 8, provenance: "source_diagram" }],
      operations: [add("1 + 31 + 36 + 46 + 86", [1, 31, 36, 46, 86], 200), multiply("8 × 26", [8, 26], 208), add("200 + 208", [200, 208], 408)],
      provenance: source({
        refs: ["channel_updates:21efe320-1035-4321-a690-212c867da536", "channel_updates:4a9649ed-cca8-4938-b83b-fc0e3f935da7"], mediaRefs: ["channel_updates:10979eaa-d3cb-4afa-8f2c-5a3f7462dea5"],
        duplicateRefs: ["channel_updates:4a9649ed-cca8-4938-b83b-fc0e3f935da7"], representativeRef: "channel_updates:21efe320-1035-4321-a690-212c867da536",
      }),
    },
    interpretation: "המקור מפרש את המחומש כדין ואת המתומן המקיף כרחמים.",
    review: { connectionStrength: "בינוני", evidenceQuality: "האריתמטיקה מאומתת; פריסת הצורה מן התרשים", recommendation: "דורש בדיקה" },
  },
]);
