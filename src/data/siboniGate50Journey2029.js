// Zion David Siboni · Gate 50 · source-first journey data.
// This is presentation-neutral editorial routing for the existing Books reader,
// not a second book system, a new numeric engine, or a verified research finding.
// Values are motifs explicitly used by the author and must be treated as authored context.
export const SIBONI_GATE50_SLUG = "hamasa-leshaar-hahamishim-zion-siboni";
export const SIBONI_GATE50_SOURCE = Object.freeze({
  author: "ציון דוד סיבוני",
  title: "המסע לשער החמישים — מהבינה המלאכותית לבינה המלכותית",
  pdfPages: 110,
  pdfBytes: 1322143,
  pdfSha256: "35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c",
  pdfUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/zion50.pdf",
  sourceKind: "author_supplied_pdf",
  emailSourceId: 113,
});
const makeGate = (order, id, title, from, to, motif, numbers) => Object.freeze({
  order, id, title, from, to, motif,
  href: `/book/${SIBONI_GATE50_SLUG}?page=${from}`,
  // A deep-link to the existing deterministic number route is an exploration affordance,
  // not an engine-verified gematria result or a claim of a canonical graph edge.
  numberLinks: Object.freeze(numbers.map(value => Object.freeze({
    value,
    href: `/number/${value}`,
    verification: "authored_motif_not_engine_verified",
  }))),
});
export const SIBONI_GATE50_GATES = Object.freeze([
  makeGate(1, "first-gate", "מן הבינה המלאכותית אל שער החמישים", 8, 15, "974 · 973 · 50", [974, 973, 50]),
  makeGate(2, "second-gate", "סודות הבינה ושם אהי־ה", 16, 20, "21 · 17", [21, 17]),
  makeGate(3, "third-gate", "מן החכמה האלוהית לחכמת האדם", 21, 27, "חכמה · בינה · דעת", []),
  makeGate(4, "fourth-gate", "משה רבנו, שער החמישים וסוד פרה אדומה", 28, 35, "49 · 50", [49, 50]),
  makeGate(5, "fifth-gate", "הבינה, תורת הרמז והגימטריאות", 36, 52, "878 · 1045", [878, 1045]),
  makeGate(6, "sixth-gate", "סודות הבינה ורמזי המשיח", 53, 66, "424", [424]),
  makeGate(7, "seventh-gate", "סוד התשובה וגילוי שער החמישים", 67, 77, "17 · 50", [17, 50]),
  makeGate(8, "eighth-gate", "חיבור שמים וארץ", 78, 93, "17", [17]),
]);
export const SIBONI_GATE50_APPENDICES = Object.freeze([
  Object.freeze({ id: "annex-nun", title: "נספח א׳ — שער הנון", from: 94, to: 95, href: `/book/${SIBONI_GATE50_SLUG}?page=94` }),
  Object.freeze({ id: "annex-32", title: "נספח ב׳ — ל״ב יסודות", from: 96, to: 97, href: `/book/${SIBONI_GATE50_SLUG}?page=96` }),
  Object.freeze({ id: "special-annex-97", title: "נספח מיוחד — סוד המספר 97", from: 98, to: 110, href: `/book/${SIBONI_GATE50_SLUG}?page=98` }),
]);
