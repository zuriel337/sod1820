export const LIFE_JOURNEY_BIRTH_PLACE_CATALOG_VERSION = "life-journey-birth-place-catalog-v1";
export const LIFE_JOURNEY_BIRTH_PLACE_SOURCE = Object.freeze({
  label: "GeoNames",
  url: "https://www.geonames.org/",
  license: "CC BY 4.0",
  retrieved: "2026-10-26",
});

const FINAL_LETTERS = Object.freeze({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" });

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0591-\u05c7]/g, "")
    .replace(/[ךםןףץ]/g, letter => FINAL_LETTERS[letter])
    .toLocaleLowerCase("he")
    .replace(/\b(?:israel|palestine)\b/gi, " ")
    .replace(/(?:ישראל|פלסטין)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function place(id, label, country, latitude, longitude, timezone, aliases = []) {
  const searchKeys = [...new Set([label, ...aliases].map(normalize).filter(Boolean))];
  return Object.freeze({
    id,
    label,
    country,
    latitude,
    longitude,
    timezone,
    searchKeys: Object.freeze(searchKeys),
    source: LIFE_JOURNEY_BIRTH_PLACE_SOURCE,
  });
}

const israel = (id, label, latitude, longitude, aliases = []) => place(
  id, label, "ישראל", latitude, longitude, "Asia/Jerusalem", aliases,
);

export const LIFE_JOURNEY_BIRTH_PLACES = Object.freeze([
  israel("jerusalem", "ירושלים", 31.76904, 35.21633, ["Jerusalem", "ירושלם"]),
  israel("tel-aviv", "תל אביב־יפו", 32.08088, 34.78057, ["תל אביב", "תל אביב יפו", "Tel Aviv", "Tel Aviv Yafo"]),
  israel("haifa", "חיפה", 32.81303, 34.99928, ["Haifa"]),
  israel("rishon-lezion", "ראשון לציון", 31.97102, 34.78939, ["Rishon LeZion"]),
  israel("petah-tikva", "פתח תקווה", 32.0888, 34.88666, ["פתח תקוה", "Petah Tikva"]),
  israel("netanya", "נתניה", 32.33294, 34.85917, ["Netanya"]),
  israel("ashdod", "אשדוד", 31.79213, 34.64966, ["Ashdod"]),
  israel("bnei-brak", "בני ברק", 32.08074, 34.8338, ["Bnei Brak"]),
  israel("holon", "חולון", 32.0122, 34.77826, ["Holon"]),
  israel("beer-sheva", "באר שבע", 31.25181, 34.7913, ["באר־שבע", "Beer Sheva", "Beersheba"]),
  israel("ramat-gan", "רמת גן", 32.08227, 34.81065, ["Ramat Gan"]),
  israel("rehovot", "רחובות", 31.89415, 34.8095, ["Rehovot"]),
  israel("ashkelon", "אשקלון", 31.66926, 34.57149, ["Ashkelon"]),
  israel("bat-yam", "בת ים", 32.01798, 34.75003, ["Bat Yam"]),
  israel("beit-shemesh", "בית שמש", 31.73072, 34.99293, ["Beit Shemesh"]),
  israel("kfar-saba", "כפר סבא", 32.175, 34.90694, ["Kfar Saba"]),
  israel("yafo", "יפו", 32.05043, 34.75224, ["Jaffa", "Yafo"]),
  israel("herzliya", "הרצליה", 32.16627, 34.82536, ["הרצלייה", "Herzliya"]),
  israel("hadera", "חדרה", 32.44192, 34.9039, ["Hadera"]),
  israel("modiin", "מודיעין־מכבים־רעות", 31.89385, 35.01504, ["מודיעין", "מודיעין מכבים רעות", "Modiin"]),
  israel("nazareth", "נצרת", 32.70087, 35.29719, ["Nazareth"]),
  israel("lod", "לוד", 31.95257, 34.89167, ["Lod"]),
  israel("modiin-illit", "מודיעין עילית", 31.93221, 35.04416, ["Modiin Illit"]),
  israel("ramla", "רמלה", 31.92624, 34.8635, ["Ramla"]),
  israel("raanana", "רעננה", 32.1836, 34.87386, ["Raanana", "Ra'anana"]),
  israel("rosh-haayin", "ראש העין", 32.09547, 34.95444, ["Rosh HaAyin"]),
  israel("hod-hasharon", "הוד השרון", 32.15912, 34.89277, ["Hod HaSharon"]),
  israel("kiryat-gat", "קריית גת", 31.60998, 34.76422, ["קרית גת", "Kiryat Gat"]),
  israel("givatayim", "גבעתיים", 32.07225, 34.81253, ["Givatayim"]),
  israel("kiryat-ata", "קריית אתא", 32.81149, 35.11323, ["קרית אתא", "Kiryat Ata"]),
  israel("nahariya", "נהריה", 33.00892, 35.09814, ["Nahariya"]),
  israel("umm-al-fahm", "אום אל־פחם", 32.51758, 35.15397, ["אום אל פחם", "אם אל פחם", "Umm al-Fahm"]),
  israel("eilat", "אילת", 29.55805, 34.94821, ["Eilat"]),
  israel("akko", "עכו", 32.92814, 35.07647, ["Akko", "Acre"]),
  israel("ness-ziona", "נס ציונה", 31.92933, 34.79868, ["Ness Ziona"]),
  israel("elad", "אלעד", 32.05108, 34.95704, ["Elad"]),
  israel("yavne", "יבנה", 31.87808, 34.73983, ["Yavne"]),
  israel("ramat-hasharon", "רמת השרון", 32.1459, 34.83859, ["Ramat HaSharon"]),
  israel("karmiel", "כרמיאל", 32.90951, 35.29768, ["Karmiel"]),
  israel("afula", "עפולה", 32.60907, 35.2892, ["Afula"]),
  israel("pardes-hanna", "פרדס חנה־כרכור", 32.47408, 34.97781, ["פרדס חנה כרכור", "Pardes Hanna Karkur"]),
  israel("tiberias", "טבריה", 32.79396, 35.53152, ["Tiberias"]),
  israel("tayibe", "טייבה", 32.26616, 35.00893, ["טיבה", "Tayibe"]),
  israel("kiryat-bialik", "קריית ביאליק", 32.8275, 35.08583, ["קרית ביאליק", "Kiryat Bialik"]),
  israel("netivot", "נתיבות", 31.42305, 34.58911, ["Netivot"]),
  israel("nof-hagalil", "נוף הגליל", 32.70816, 35.32469, ["נצרת עילית", "נצרת עלית", "Nof HaGalil"]),
  israel("kiryat-motzkin", "קריית מוצקין", 32.83706, 35.0776, ["קרית מוצקין", "Kiryat Motzkin"]),
  israel("shefaram", "שפרעם", 32.80583, 35.16895, ["Shefa-Amr", "Shfaram"]),
  israel("kiryat-ono", "קריית אונו", 32.06124, 34.85618, ["קרית אונו", "Kiryat Ono"]),
  israel("kiryat-yam", "קריית ים", 32.84966, 35.06973, ["קרית ים", "Kiryat Yam"]),
  israel("or-yehuda", "אור יהודה", 32.02936, 34.85281, ["Or Yehuda"]),
  israel("dimona", "דימונה", 31.07079, 35.03269, ["Dimona"]),
  israel("safed", "צפת", 32.96465, 35.496, ["Safed", "Tzfat"]),
  israel("ofakim", "אופקים", 31.3141, 34.62025, ["Ofakim"]),
  israel("gedera", "גדרה", 31.81456, 34.77998, ["Gedera"]),
  israel("givat-shmuel", "גבעת שמואל", 32.07817, 34.84858, ["Givat Shmuel"]),
  israel("arad", "ערד", 31.25882, 35.21282, ["Arad"]),
  israel("tirat-carmel", "טירת כרמל", 32.76025, 34.96874, ["Tirat Carmel"]),
  israel("beer-yaakov", "באר יעקב", 31.94433, 34.83902, ["Beer Yaakov"]),
  israel("sderot", "שדרות", 31.525, 34.59693, ["Sderot"]),
  israel("migdal-haemek", "מגדל העמק", 32.67788, 35.24158, ["Migdal HaEmek"]),
  israel("kiryat-malakhi", "קריית מלאכי", 31.72888, 34.74632, ["קרית מלאכי", "Kiryat Malakhi"]),
  israel("kfar-yona", "כפר יונה", 32.31517, 34.9357, ["Kfar Yona"]),
  israel("mevaseret-zion", "מבשרת ציון", 31.80186, 35.15072, ["Mevaseret Zion"]),
  israel("gan-yavne", "גן יבנה", 31.78737, 34.70659, ["Gan Yavne"]),
  israel("kfar-qasim", "כפר קאסם", 32.11443, 34.9756, ["כפר קסם", "Kafr Qasim"]),
  israel("yokneam", "יקנעם עילית", 32.64661, 35.09202, ["יוקנעם", "יקנעם", "Yokneam"]),
  israel("zichron-yaakov", "זכרון יעקב", 32.56883, 34.95427, ["זיכרון יעקב", "Zikhron Yaakov"]),
  israel("kiryat-shmona", "קריית שמונה", 33.21204, 35.57044, ["קרית שמונה", "Kiryat Shmona"]),
  israel("or-akiva", "אור עקיבא", 32.5064, 34.92087, ["Or Akiva"]),
  israel("shoham", "שוהם", 31.9987, 34.94624, ["שהם", "Shoham"]),
  israel("ariel", "אריאל", 32.1065, 35.18449, ["Ariel"]),
  israel("rahat", "רהט", 31.39547, 34.75699, ["Rahat"]),
  place("new-york", "ניו יורק", "ארצות הברית", 40.7128, -74.006, "America/New_York", ["New York", "New York City", "NYC"]),
  place("los-angeles", "לוס אנג׳לס", "ארצות הברית", 34.0522, -118.2437, "America/Los_Angeles", ["Los Angeles", "LA"]),
  place("miami", "מיאמי", "ארצות הברית", 25.7617, -80.1918, "America/New_York", ["Miami"]),
  place("toronto", "טורונטו", "קנדה", 43.6532, -79.3832, "America/Toronto", ["Toronto"]),
  place("montreal", "מונטריאול", "קנדה", 45.5019, -73.5674, "America/Toronto", ["Montreal", "Montréal"]),
  place("london", "לונדון", "בריטניה", 51.5074, -0.1278, "Europe/London", ["London"]),
  place("paris", "פריז", "צרפת", 48.8566, 2.3522, "Europe/Paris", ["Paris"]),
  place("berlin", "ברלין", "גרמניה", 52.52, 13.405, "Europe/Berlin", ["Berlin"]),
  place("amsterdam", "אמסטרדם", "הולנד", 52.3676, 4.9041, "Europe/Amsterdam", ["Amsterdam"]),
  place("moscow", "מוסקבה", "רוסיה", 55.7558, 37.6173, "Europe/Moscow", ["Moscow"]),
  place("kyiv", "קייב", "אוקראינה", 50.4501, 30.5234, "Europe/Kyiv", ["Kyiv", "Kiev"]),
  place("istanbul", "איסטנבול", "טורקיה", 41.0082, 28.9784, "Europe/Istanbul", ["Istanbul"]),
  place("tbilisi", "טביליסי", "גאורגיה", 41.7151, 44.8271, "Asia/Tbilisi", ["Tbilisi"]),
  place("casablanca", "קזבלנקה", "מרוקו", 33.5731, -7.5898, "Africa/Casablanca", ["Casablanca"]),
  place("baghdad", "בגדאד", "עיראק", 33.3152, 44.3661, "Asia/Baghdad", ["Baghdad"]),
  place("tehran", "טהרן", "איראן", 35.6892, 51.389, "Asia/Tehran", ["Tehran"]),
  place("buenos-aires", "בואנוס איירס", "ארגנטינה", -34.6037, -58.3816, "America/Argentina/Buenos_Aires", ["Buenos Aires"]),
  place("sao-paulo", "סאו פאולו", "ברזיל", -23.5505, -46.6333, "America/Sao_Paulo", ["São Paulo", "Sao Paulo"]),
  place("bangkok", "בנגקוק", "תאילנד", 13.7563, 100.5018, "Asia/Bangkok", ["Bangkok"]),
  place("sydney", "סידני", "אוסטרליה", -33.8688, 151.2093, "Australia/Sydney", ["Sydney"]),
]);

function scorePlace(row, query) {
  let score = Number.POSITIVE_INFINITY;
  for (const key of row.searchKeys) {
    if (key === query) score = Math.min(score, 0);
    else if (key.startsWith(query)) score = Math.min(score, 1);
    else if (key.split(" ").some(token => token.startsWith(query))) score = Math.min(score, 2);
    else if (key.includes(query)) score = Math.min(score, 3);
  }
  return score;
}

export function searchLifeJourneyBirthPlaces(query, { limit = 8 } = {}) {
  const normalized = normalize(query);
  if (normalized.length < 2) return Object.freeze([]);
  const boundedLimit = Math.min(12, Math.max(1, Number(limit) || 8));
  return Object.freeze(LIFE_JOURNEY_BIRTH_PLACES
    .map(row => ({ row, score: scorePlace(row, normalized) }))
    .filter(item => Number.isFinite(item.score))
    .sort((left, right) => left.score - right.score || left.row.label.localeCompare(right.row.label, "he"))
    .slice(0, boundedLimit)
    .map(item => item.row));
}

export function resolveLifeJourneyBirthPlace(value) {
  const normalized = normalize(value);
  if (!normalized) return null;
  return LIFE_JOURNEY_BIRTH_PLACES.find(row => row.searchKeys.includes(normalized)) || null;
}

export default searchLifeJourneyBirthPlaces;
