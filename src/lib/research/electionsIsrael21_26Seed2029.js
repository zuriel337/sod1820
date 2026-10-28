import {
  ELECTIONS_ASSERTION_SCOPE,
  ELECTIONS_CONSUMER,
  ELECTIONS_REVIEW_STATE,
  ELECTIONS_RELATION_STATUS,
  ELECTIONS_SOURCE_KIND,
  compileElectionsDomainBundle,
  projectElectionsDomainForConsumer,
} from "./electionsDomainContract2029.js";
import { SEMANTIC_CLASS } from "./researchResultBundle.js";
import {
  ONE_TREE_NEWS_MARKER_STATE,
  ONE_TREE_SYSTEM_METHOD_RULE_ID,
} from "./oneTreeBranchContract2029.js";

// Branch-only research seed for the two Israeli election systems currently in scope.
// Values here are inputs to the governed contract, not canonical graph rows or publication state.

const publicEntity = (id, ref, kind, label, extra = {}) => ({ id, ref, kind, label, ...extra });
const numberEntity = value => publicEntity(
  `number-${value}`,
  `number:${value}`,
  "number",
  String(value),
  { value },
);

const publicSource = (id, kind, label, locator, capturedAt, extra = {}) => ({
  id,
  kind,
  label,
  locator,
  capturedAt,
  accessTier: "public",
  ...extra,
});

const sourceFact = (id, subjectRef, predicate, value, sourceIds, assertionScope, extra = {}) => ({
  id,
  subjectRef,
  predicate,
  value,
  sourceIds,
  assertionScope,
  verificationState: "match",
  accessTier: "public",
  ...extra,
});

const calculation = (id, expression, methodId, value, subjectRefs) => ({
  id,
  expression,
  methodId,
  methodVersion: "canonical-gematria-live-shape",
  engineRef: "canonical_gematria_engine",
  value,
  verificationState: "match",
  semanticClass: SEMANTIC_CLASS.EVIDENCE,
  subjectRefs,
  accessTier: "public",
});

const derivation = (id, expression, methodVersion, value, subjectRefs, dependsOn) => ({
  id,
  expression,
  methodId: "exact_arithmetic",
  methodVersion,
  engineRef: "deterministic_arithmetic",
  value,
  verificationState: "match",
  semanticClass: SEMANTIC_CLASS.DERIVATION,
  subjectRefs,
  dependsOn,
  accessTier: "public",
});

const interpretation = (id, statement, dependsOn, subjectRefs, numberRefs = []) => ({
  id,
  statement,
  attributedTo: "ZURIEL",
  governanceState: ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING,
  dependsOn,
  subjectRefs,
  numberRefs,
  accessTier: "public",
});

const relation = (id, role, fromRef, toRef, evidenceIds) => ({
  id,
  role,
  fromRef,
  toRef,
  evidenceIds,
  status: ELECTIONS_RELATION_STATUS.PROPOSED,
});

export const ELECTIONS_ISRAEL_21_26_INPUT = {
  bundleId: "elections-israel-21-26",
  reviewState: ELECTIONS_REVIEW_STATE.BRANCH_ONLY,
  compiledAt: "2026-10-28T12:00:00.000Z",
  rootEntityRef: "node:2bb53dbf-816a-4033-aff2-874c4981cd39",

  entities: [
    publicEntity(
      "elections-topic",
      "node:2bb53dbf-816a-4033-aff2-874c4981cd39",
      "election_topic",
      "בחירות",
    ),
    publicEntity("knesset-21", "election:il:knesset-21", "election_cycle", "הבחירות לכנסת ה־21 · 2019"),
    publicEntity("knesset-26", "election:il:knesset-26", "election_cycle", "הבחירות לכנסת ה־26 · 2026"),

    publicEntity("naftali-bennett", "person:naftali-bennett", "person", "נפתלי בנט", {
      cycleRefs: ["election:il:knesset-21", "election:il:knesset-26"],
    }),
    publicEntity("ofer-winter", "person:ofer-winter", "person", "עופר וינטר", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("eitan-shvili", "person:eitan-shvili", "person", "איתן שוילי", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("tamar-shvili", "person:tamar-shvili", "person", "תמר (תמי) שוילי", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("benjamin-netanyahu", "person:benjamin-netanyahu", "person", "בנימין נתניהו", {
      cycleRefs: ["election:il:knesset-26"],
    }),

    publicEntity("new-right", "party:new-right", "party", "הימין החדש", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("beyahad", "party:beyahad", "party", "ביחד", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("amcha-israel", "party:amcha-israel", "party", "עמך ישראל", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("sharshar", "party:sharshar", "party", "שרשר לאהבה ואחדות העם", {
      cycleRefs: ["election:il:knesset-26"],
    }),
    publicEntity("likud", "party:likud", "party", "הליכוד", {
      cycleRefs: ["election:il:knesset-26"],
    }),

    publicEntity(
      "elections-26-post",
      "post:5107",
      "post",
      "הבחירות לכנסת ה־26 — כשהמספרים מתחילים להתחבר",
      { cycleRefs: ["election:il:knesset-26"] },
    ),
    publicEntity("bennett-631-post", "post:5113", "post", "נפתלי בנט · מלך · 631"),
    publicEntity("winter-1820-post", "post:5098", "post", "עמך ישראל בראשות עופר וינטר"),

    publicEntity("gallery-byat", "gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11", "media", "byat-mshych-1237.jpg", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("gallery-car", "gallery-image:2ab69212-a407-4d33-9afd-65b6a9e66f1e", "media", "mkvnyt-4.5.jpg", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("gallery-14000", "gallery-image:466ae014-9677-4c8c-b69f-3600042ddc16", "media", "14000-bnt.jpg", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("gallery-bnt14-jpg", "gallery-image:e207986b-3159-4f46-bf5a-c0a32fe313e6", "media", "bnt-14.jpg", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("gallery-bnt14-png", "gallery-image:01d17f7e-6ee8-41ce-9d6a-7c6f8352ce11", "media", "bnt-14.png", {
      cycleRefs: ["election:il:knesset-21"],
    }),
    publicEntity("gallery-mandates", "gallery-image:5c913e47-a840-41fb-8acf-60e6252ce9e0", "media", "mndtym.jpg", {
      cycleRefs: ["election:il:knesset-21"],
    }),

    ...[
      14, 21, 26, 45, 52, 54, 66, 77, 140, 271, 450, 454, 456, 631, 789, 1000, 1111,
      1237, 1400, 1454, 1456, 1789, 1820, 2701, 2710, 4500, 138598, 140052, 4309270,
    ].map(numberEntity),
  ],

  sources: [
    publicSource(
      "knesset-21-national-results",
      ELECTIONS_SOURCE_KIND.OFFICIAL,
      "ועדת הבחירות המרכזית · תוצאות ארציות לכנסת ה־21",
      "https://votes21.bechirot.gov.il/nationalresults",
      "2026-10-25",
    ),
    publicSource(
      "knesset-26-timeline",
      ELECTIONS_SOURCE_KIND.OFFICIAL,
      "ועדת הבחירות המרכזית · לוח זמנים לכנסת ה־26",
      "https://www.gov.il/he/departments/dynamiccollectors/election-timeline26",
      "2026-10-25",
    ),
    publicSource(
      "knesset-26-lists",
      ELECTIONS_SOURCE_KIND.REPORTED,
      "רשימות ומועמדים לכנסת ה־26",
      "https://www.ynet.co.il/news/article/s1ibdii5fe",
      "2026-10-25",
    ),
    publicSource(
      "sharshar-tami-list",
      ELECTIONS_SOURCE_KIND.PARTY,
      "שרשר · תמר (תמי) שוילי ברשימה",
      "https://www.sharshar.co.il/?page_id=823",
      "2026-10-25",
    ),
    publicSource(
      "sharshar-tami-report",
      ELECTIONS_SOURCE_KIND.REPORTED,
      "תמר (תמי) שוילי כמספר 2 ברשימת שרשר",
      "https://www.ynet.co.il/news/elections2026/article/rj4yfhnoze",
      "2026-10-25",
    ),
    publicSource(
      "ynet-sharshar-1456-snapshot",
      ELECTIONS_SOURCE_KIND.REPORTED,
      "ynet · שרשר זכה ב־1,456 קולות לאחר ספירת 70%",
      "https://www.ynet.co.il/news/elections2026/article/rybr24j6fe",
      "2026-10-28T11:31:00+02:00",
      {
        attributes: {
          source_snapshot_kind: "live_news_feed_item",
          source_display_time: "11:31",
          article_metadata_published_at: "2026-10-28T09:28:32.350929Z",
        },
      },
    ),
    publicSource(
      "amcha-israel-party",
      ELECTIONS_SOURCE_KIND.PARTY,
      "עמך ישראל · האתר הרשמי",
      "https://amchaisrael.co.il/",
      "2026-10-25",
    ),
    publicSource("post-5107", ELECTIONS_SOURCE_KIND.SITE_POST, "פוסט הבחירות לכנסת ה־26", null, "2026-10-25", {
      canonicalRef: "post:5107",
    }),
    publicSource("post-5113", ELECTIONS_SOURCE_KIND.SITE_POST, "פוסט נפתלי בנט · 631", null, "2026-10-25", {
      canonicalRef: "post:5113",
    }),
    publicSource("post-5098", ELECTIONS_SOURCE_KIND.SITE_POST, "פוסט עופר וינטר · 631/1820", null, "2026-10-25", {
      canonicalRef: "post:5098",
    }),
    ...[
      ["gallery-byat-source", "gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11", "byat-mshych-1237.jpg"],
      ["gallery-car-source", "gallery-image:2ab69212-a407-4d33-9afd-65b6a9e66f1e", "mkvnyt-4.5.jpg"],
      ["gallery-14000-source", "gallery-image:466ae014-9677-4c8c-b69f-3600042ddc16", "14000-bnt.jpg"],
      ["gallery-bnt14-jpg-source", "gallery-image:e207986b-3159-4f46-bf5a-c0a32fe313e6", "bnt-14.jpg"],
      ["gallery-bnt14-png-source", "gallery-image:01d17f7e-6ee8-41ce-9d6a-7c6f8352ce11", "bnt-14.png"],
      ["gallery-mandates-source", "gallery-image:5c913e47-a840-41fb-8acf-60e6252ce9e0", "mndtym.jpg"],
    ].map(([id, canonicalRef, label]) => publicSource(
      id,
      ELECTIONS_SOURCE_KIND.GALLERY_MEDIA,
      `גלריה היסטורית · ${label}`,
      null,
      "2026-10-25",
      { canonicalRef },
    )),
  ],

  sourceFacts: [
    sourceFact(
      "official-valid-votes-4309270",
      "election:il:knesset-21",
      "valid_votes",
      4309270,
      ["knesset-21-national-results"],
      ELECTIONS_ASSERTION_SCOPE.OFFICIAL,
      { entityRefs: ["number:4309270"] },
    ),
    sourceFact(
      "official-new-right-138598",
      "party:new-right",
      "votes_received",
      138598,
      ["knesset-21-national-results"],
      ELECTIONS_ASSERTION_SCOPE.OFFICIAL,
      { entityRefs: ["election:il:knesset-21", "number:138598"] },
    ),
    sourceFact(
      "official-election-date-2026-10-27",
      "election:il:knesset-26",
      "election_date",
      "2026-10-27",
      ["knesset-26-timeline"],
      ELECTIONS_ASSERTION_SCOPE.OFFICIAL,
    ),
    sourceFact(
      "sourced-submitted-lists-38",
      "election:il:knesset-26",
      "submitted_lists",
      38,
      ["knesset-26-lists"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
    ),
    sourceFact(
      "sourced-bennett-beyahad",
      "person:naftali-bennett",
      "election_list_membership",
      { party: "ביחד", ballot: "רק" },
      ["knesset-26-lists", "post-5113"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
      { entityRefs: ["party:beyahad", "election:il:knesset-26"] },
    ),
    sourceFact(
      "sourced-winter-amcha",
      "person:ofer-winter",
      "election_list_membership",
      { party: "עמך ישראל", ballot: "ך" },
      ["knesset-26-lists", "amcha-israel-party", "post-5098"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
      { entityRefs: ["party:amcha-israel", "election:il:knesset-26"] },
    ),
    sourceFact(
      "sourced-shvili-sharshar",
      "person:eitan-shvili",
      "election_list_membership",
      { party: "שרשר לאהבה ואחדות העם", ballot: "צדק" },
      ["knesset-26-lists", "sharshar-tami-list"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
      { entityRefs: ["party:sharshar", "election:il:knesset-26"] },
    ),
    sourceFact(
      "sourced-tami-shvili-role",
      "person:tamar-shvili",
      "reported_list_role",
      "אשתו של איתן שוילי ומספר 2 ברשימת שרשר",
      ["sharshar-tami-list", "sharshar-tami-report"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
      { entityRefs: ["person:eitan-shvili", "party:sharshar", "election:il:knesset-26"] },
    ),
    sourceFact(
      "sourced-netanyahu-likud",
      "person:benjamin-netanyahu",
      "election_list_membership",
      { party: "הליכוד", ballot: "מחל" },
      ["knesset-26-lists", "post-5107"],
      ELECTIONS_ASSERTION_SCOPE.REPORTED,
      { entityRefs: ["party:likud", "election:il:knesset-26"] },
    ),
    sourceFact(
      "historical-byat-number-set",
      "gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11",
      "source_contains_numbers",
      [14, 21, 45, 450, 1237, 1400, 4500],
      ["gallery-byat-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      {
        entityRefs: [
          "person:naftali-bennett", "party:new-right", "number:14", "number:21", "number:45",
          "number:450", "number:1237", "number:1400", "number:4500",
        ],
      },
    ),
    sourceFact(
      "historical-car-number-set",
      "gallery-image:2ab69212-a407-4d33-9afd-65b6a9e66f1e",
      "source_contains_numbers",
      [14, 21, 45, 450, 1237, 1400, 4500],
      ["gallery-car-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      { entityRefs: ["number:14", "number:21", "number:45", "number:450", "number:1237", "number:1400", "number:4500"] },
    ),
    sourceFact(
      "historical-14000-number-set",
      "gallery-image:466ae014-9677-4c8c-b69f-3600042ddc16",
      "source_contains_numbers",
      [14, 1400, 14000],
      ["gallery-14000-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      { entityRefs: ["number:14", "number:1400"] },
    ),
    sourceFact(
      "historical-bnt14-jpg-number-set",
      "gallery-image:e207986b-3159-4f46-bf5a-c0a32fe313e6",
      "source_contains_numbers",
      [10, 14, 45],
      ["gallery-bnt14-jpg-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      { entityRefs: ["person:naftali-bennett", "number:14", "number:45"] },
    ),
    sourceFact(
      "historical-bnt14-png-number-set",
      "gallery-image:01d17f7e-6ee8-41ce-9d6a-7c6f8352ce11",
      "source_contains_numbers",
      [14, 1234, 1237],
      ["gallery-bnt14-png-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      { entityRefs: ["person:naftali-bennett", "number:14", "number:1237"] },
    ),
    sourceFact(
      "historical-mandates-knesset-21",
      "gallery-image:5c913e47-a840-41fb-8acf-60e6252ce9e0",
      "source_mentions_election_cycle",
      "הכנסת ה־21 · מנדטים",
      ["gallery-mandates-source"],
      ELECTIONS_ASSERTION_SCOPE.HISTORICAL_SOURCE,
      { entityRefs: ["election:il:knesset-21", "number:21"] },
    ),
    sourceFact(
      "site-post-5107-number-set",
      "post:5107",
      "source_contains_numbers",
      [26, 45, 66, 77, 271, 450, 631, 789, 1000, 1111, 1789, 1820, 2701, 2710],
      ["post-5107"],
      ELECTIONS_ASSERTION_SCOPE.SITE_AUTHORED,
      {
        entityRefs: [
          "election:il:knesset-26", "number:26", "number:45", "number:66", "number:77",
          "number:271", "number:450", "number:631", "number:789", "number:1000",
          "number:1111", "number:1789", "number:1820", "number:2701", "number:2710",
        ],
      },
    ),
  ],

  newsMarkers: [
    {
      id: "news-sharshar-1456-at-70pct",
      subjectRef: "party:sharshar",
      value: 1456,
      sourceIds: ["ynet-sharshar-1456-snapshot"],
      assertionScope: ELECTIONS_ASSERTION_SCOPE.PUBLISHED_SNAPSHOT,
      entityRefs: ["election:il:knesset-26", "number:1456"],
      publishedAt: "2026-10-28T11:31:00+02:00",
      snapshotState: ONE_TREE_NEWS_MARKER_STATE.REPORTED_SNAPSHOT,
      scope: {
        counted_percent: 70,
        snapshot_note: "הערך נשמר כפי שפורסם באותו רגע; הוא אינו תוצאה סופית.",
      },
    },
  ],

  engineCalculations: [
    derivation(
      "derived-threshold-140052",
      "ceil(4309270 × 3.25%)",
      "knesset-threshold-3.25pct-v1",
      140052,
      ["election:il:knesset-21", "number:140052"],
      ["official-valid-votes-4309270"],
    ),
    derivation(
      "derived-gap-1454",
      "ceil(4309270 × 3.25%) - 138598",
      "knesset-threshold-gap-v1",
      1454,
      ["election:il:knesset-21", "party:new-right", "number:1454"],
      ["official-valid-votes-4309270", "official-new-right-138598"],
    ),
    calculation("engine-david-14", "דוד", "hebrew_standard", 14, ["number:14"]),
    calculation("engine-redemption-45", "גאולה", "hebrew_standard", 45, ["number:45"]),
    calculation("engine-eliyahu-52", "אליהו", "hebrew_standard", 52, ["number:52"]),
    calculation("engine-seal-454", "חותם", "hebrew_standard", 454, ["number:454"]),
    calculation("engine-face-456", "פרצוף", "hebrew_standard", 456, ["number:456"]),
    calculation("engine-tami-450", "תמי", "hebrew_standard", 450, ["person:tamar-shvili", "number:450"]),
    calculation("engine-bennett-631", "נפתלי בנט", "hebrew_standard", 631, ["person:naftali-bennett", "number:631"]),
    calculation("engine-winter-631", "עופר וינטר", "hebrew_standard", 631, ["person:ofer-winter", "number:631"]),
    calculation("engine-winter-milui-1820", "עופר וינטר", "hebrew_milui", 1820, ["person:ofer-winter", "number:1820"]),
    calculation("engine-elections-631", "הבחירות", "hebrew_standard", 631, ["node:2bb53dbf-816a-4033-aff2-874c4981cd39", "number:631"]),
    calculation("engine-king-israel-631", "מלך ישראל", "hebrew_standard", 631, ["number:631"]),
    calculation("engine-nes-netanyahu-631", "נס נתניהו", "hebrew_standard", 631, ["person:benjamin-netanyahu", "number:631"]),
    calculation("engine-sharshar-1000", "שרשר", "hebrew_standard", 1000, ["party:sharshar", "number:1000"]),
  ],

  systemMethodApplications: [
    {
      id: "system-one-1456-456",
      expression: "1456 → 456",
      ruleId: ONE_TREE_SYSTEM_METHOD_RULE_ID.SHITAT_HAECHAD_ALEF,
      ruleVersion: 1,
      ruleVersionSource: "nodes.rule_version",
      operation: "leading_one_split",
      inputValue: 1456,
      outputValue: 456,
      output: { leading_unit: 1000, remainder: 456 },
      subjectRefs: ["number:1456", "number:456"],
      dependsOn: ["news-sharshar-1456-at-70pct"],
    },
    {
      id: "system-zero-scale-1400-14",
      expression: "1400 → 14",
      ruleId: ONE_TREE_SYSTEM_METHOD_RULE_ID.ZERO_SCALE,
      ruleVersion: 1,
      ruleVersionSource: "fn_zero_scale.version",
      operation: "zero_scale_chain",
      inputValue: 1400,
      outputValue: 14,
      output: { core_root: 14, scale_chain: [14, 140, 1400] },
      engineRef: "fn_zero_scale",
      subjectRefs: ["number:1400", "number:14"],
      dependsOn: ["historical-byat-number-set"],
    },
  ],

  interpretations: [
    interpretation(
      "threshold-140052-split",
      "140,052 נקרא כ־140 | 052: ‏140 כהרחבה של 14 (דוד), ו־052 כייצוג מרופד של 52 (אליהו).",
      ["derived-threshold-140052", "engine-david-14", "engine-eliyahu-52"],
      ["election:il:knesset-21", "number:140052", "number:140", "number:14", "number:52"],
      [140052, 140, 52, 14],
    ),
    interpretation(
      "gap-1454-split",
      "1,454 נקרא כ־14 | 54; ‏54 הוא היפוך ספרות של 45 ולא שוויון גימטרי.",
      ["derived-gap-1454", "engine-david-14", "engine-redemption-45"],
      ["election:il:knesset-21", "number:1454", "number:14", "number:54", "number:45"],
      [1454, 14, 54, 45],
    ),
    interpretation(
      "gap-1454-seal",
      "1,454 נקרא גם כ־1 | 454, כאשר 454 הוא הערך הרגיל של חותם.",
      ["derived-gap-1454", "engine-seal-454"],
      ["election:il:knesset-21", "number:1454", "number:454"],
      [1454, 454],
    ),
    interpretation(
      "historical-1400-rounding",
      "כ־1,400 נשמר כניסוח מן התמונה ההיסטורית; הפער הרשמי המדויק הוא 1,454.",
      ["derived-gap-1454", "historical-byat-number-set"],
      ["gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11", "number:1400", "number:1454"],
      [1400, 1454],
    ),
    interpretation(
      "historical-4500-interim",
      "4,500 הוא מספר ביניים שמופיע בתמונת הארכיון ואינו תוצאת הבחירות הסופית.",
      ["historical-byat-number-set"],
      ["gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11", "number:4500"],
      [4500],
    ),
    interpretation(
      "historical-1237-bennett",
      "1,237 נשמר כטענה במקור ההיסטורי על בנט והימין החדש, לא כהתאמת מנוע ללא ביטוי ושיטה.",
      ["historical-byat-number-set"],
      ["person:naftali-bennett", "party:new-right", "number:1237"],
      [1237],
    ),
    interpretation(
      "scale-14-140-1400",
      "14 → 140 → 1,400 נשמר כשרשרת קנה־מידה של zero_scale_law; החיבור לדוד=14 נשאר פרשנות נפרדת.",
      ["engine-david-14", "historical-byat-number-set", "system-zero-scale-1400-14"],
      ["number:14", "number:140", "number:1400"],
      [14, 140, 1400],
    ),
    interpretation(
      "scale-450-4500",
      "450 → 4,500 מחבר בין תמי=450 לבין המספר ההיסטורי 4,500 באמצעות שינוי קנה־מידה פרשני.",
      ["engine-tami-450", "historical-byat-number-set"],
      ["person:tamar-shvili", "number:450", "number:4500"],
      [450, 4500],
    ),
  ],

  relationCandidates: [
    relation("topic-cycle-21", "contains_election_cycle", "node:2bb53dbf-816a-4033-aff2-874c4981cd39", "election:il:knesset-21", ["official-valid-votes-4309270"]),
    relation("topic-cycle-26", "contains_election_cycle", "node:2bb53dbf-816a-4033-aff2-874c4981cd39", "election:il:knesset-26", ["official-election-date-2026-10-27"]),
    relation("bennett-beyahad", "reported_list_membership", "person:naftali-bennett", "party:beyahad", ["sourced-bennett-beyahad"]),
    relation("winter-amcha", "reported_list_membership", "person:ofer-winter", "party:amcha-israel", ["sourced-winter-amcha"]),
    relation("shvili-sharshar", "reported_list_membership", "person:eitan-shvili", "party:sharshar", ["sourced-shvili-sharshar"]),
    relation("tami-sharshar", "reported_list_membership", "person:tamar-shvili", "party:sharshar", ["sourced-tami-shvili-role"]),
    relation("netanyahu-likud", "reported_list_membership", "person:benjamin-netanyahu", "party:likud", ["sourced-netanyahu-likud"]),
    relation("bennett-631", "engine_value", "person:naftali-bennett", "number:631", ["engine-bennett-631"]),
    relation("winter-631", "engine_value", "person:ofer-winter", "number:631", ["engine-winter-631"]),
    relation("winter-1820", "engine_value", "person:ofer-winter", "number:1820", ["engine-winter-milui-1820"]),
    relation("tami-450", "engine_value", "person:tamar-shvili", "number:450", ["engine-tami-450"]),
    relation("sharshar-1000", "engine_value", "party:sharshar", "number:1000", ["engine-sharshar-1000"]),
    relation("sharshar-1456-snapshot", "published_vote_snapshot", "party:sharshar", "number:1456", ["news-sharshar-1456-at-70pct"]),
    relation("system-1456-456", "converges_by_system_method", "number:1456", "number:456", ["system-one-1456-456"]),
    relation("system-1400-14", "converges_by_system_method", "number:1400", "number:14", ["system-zero-scale-1400-14"]),
    relation("elections-631", "engine_value", "node:2bb53dbf-816a-4033-aff2-874c4981cd39", "number:631", ["engine-elections-631"]),
    relation("threshold-140052", "derived_result_value", "election:il:knesset-21", "number:140052", ["derived-threshold-140052"]),
    relation("gap-1454", "derived_result_value", "election:il:knesset-21", "number:1454", ["derived-gap-1454"]),
    relation("gallery-1400", "historical_source_value", "gallery-image:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11", "number:1400", ["historical-byat-number-set"]),
    relation("interpretive-45-54", "interpreted_digit_reversal", "number:45", "number:54", ["gap-1454-split"]),
    relation("interpretive-14-140", "interpreted_scale", "number:14", "number:140", ["scale-14-140-1400"]),
    relation("interpretive-140-1400", "interpreted_scale", "number:140", "number:1400", ["scale-14-140-1400"]),
    relation("interpretive-450-4500", "interpreted_scale", "number:450", "number:4500", ["scale-450-4500"]),
  ],
};

export const ELECTIONS_ISRAEL_21_26_BUNDLE = compileElectionsDomainBundle(ELECTIONS_ISRAEL_21_26_INPUT);

// Ready-to-adopt handoff for the existing Raziel strategy/companion rail. This is data only:
// no Raziel component, prompt, route, session or persistence layer is changed here.
export const ELECTIONS_ISRAEL_21_26_RAZIEL_CONTEXT = projectElectionsDomainForConsumer(
  ELECTIONS_ISRAEL_21_26_BUNDLE,
  ELECTIONS_CONSUMER.RAZIEL,
);
