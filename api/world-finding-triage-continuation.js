// Owner-only reconciliation of the strong World findings after the 2026-10-22
// snapshot. This is a review annotation only: it does not mutate publication,
// privacy, truth status, graph nodes or source records.

const READY_FOR_IMPLEMENTATION = new Set([
  "022ca5a6-ab7b-4b37-b782-4b84bc3696fb",
  "075ee1c6-8cb8-44c2-bb40-84668dc1a745",
  "206193c9-2f4a-4f9f-ad4c-ce519f353d76",
  "238305a9-c5ab-4aec-b99c-83fbf537e175",
  "239c836a-d242-4a60-8518-43110f381dcb",
  "2500bfe5-cf79-47ac-be88-6e2769a88379",
  "26335761-45b1-44ce-8d26-dc285fcf8017",
  "2d87fd9d-6108-41cc-9598-b28f9955905a",
  "2fa0e757-5a5a-4474-a3e7-0d9a746b4397",
  "39d41c01-dbd8-4eb5-9323-7289660ba980",
  "3e6e7996-d166-4b26-93cb-6365e7f185c9",
  "3ed05fe4-15cb-4268-b32e-b6f4b90a0467",
  "3ee503c4-6557-490d-96ee-b75dee0050fa",
  "4250c753-a7f9-48ea-ae3e-9192cf3f9e2a",
  "441a0fb3-d9fb-4abf-a16c-aaa83e185fdc",
  "4a0b7a6a-f7c5-48aa-8f4a-003848497c6b",
  "54161b12-02ad-4025-8c0c-9ea73706e45a",
  "5576e9d7-20e4-45e8-ac20-a7d45c4576b2",
  "5e37c12b-4b84-4c6a-8628-954161d79cb6",
  "6398d74c-502c-450d-91eb-4c35e40323d8",
  "640652e7-e6f6-487f-9e59-cab7ffc9da0c",
  "67fa72b4-5e8f-4acb-a9c1-2d095baffb60",
  "69a7c165-0027-4237-a85d-8893ccc946ce",
  "759b9c2f-94db-4708-b1b2-665ca1ca1ed9",
  "76265162-4ae2-4d3f-9272-c2a1bacfd4a7",
  "882eedd3-d05b-4eb0-84f8-69741ebf199d",
  "916e0dc0-60d4-47fa-91d5-a68c88cb888d",
  "9aeefb8f-ad4f-417c-b52a-9ce2b8b606f7",
  "9d1da402-4c1d-4f1f-9d39-f970c839ba53",
  "a3ede9c2-f4c0-4d62-9d9a-cacb0a89ec03",
  "a94e47c3-0ca1-43c0-96f4-fbc2ddfe1189",
  "aa9f08a1-b78f-4a1b-949c-3800bd05084c",
  "b124646a-c8e2-4765-875e-a42644cf2f4a",
  "b57fb522-c1fa-4ec7-8d6e-397cda8b8eb7",
  "b803f39d-9d36-4529-8c9d-f56c53990477",
  "bb9ac8e9-2ca1-4361-8b5f-911127a06509",
  "bed0b954-170c-4f31-a755-d80e8f1ae4ad",
  "c00fc2e0-4f87-4285-b6af-b9174c1d0b0a",
  "d97fb1b3-26bb-4afe-9619-fb679a06b97f",
  "decea1de-8cbb-4c3e-9ae6-da50e96ebb03",
  "e026fc07-a5a1-4401-8786-8c48776d89a1",
  "ea1131b9-39c8-4664-a085-d1478b5401ff",
  "eb16bd6e-4a5c-4f63-b99a-d2d88c4ec92a",
  "f15bb706-8ed3-4798-9855-07612c0e6ecd",
  "f1a5355a-67ad-4589-867b-10636a3d2b96",
  "f1f1b276-e29e-4e18-970b-b1c72a95a9ae",
  "f5078125-de7c-44b1-8dc2-7d83fdcd9371",
  "fd8c7f42-ad77-4b37-92cd-ca80c79f980b",
  "fe25b493-dcd0-4db0-af77-1eb08c032f5e",
]);

const CLUSTERED_DUPLICATES = new Set([
  "09033ebf-ea8c-4a87-ad99-701e3e84eac0",
  "1204cb70-958f-496e-bdcc-0d3c56df825b",
  "22cd0f08-cbc8-46fc-ab4a-26d7b716af38",
  "2f5ca26b-80c3-4563-a46d-8d28541431cb",
  "43b077a3-31ed-4412-9bb4-047992026574",
  "5996234c-de39-4d39-826c-858f48b2e203",
  "70e92f37-eb8d-4172-a775-7677af940736",
  "819dcd37-e0f1-4103-bac1-2a11aeab9b30",
  "90c88e73-49f4-4e3c-abc6-ae35e4ba7e93",
  "a5483dea-b44e-42ba-99f2-bfd4d16332db",
  "acc040b3-9653-4381-89c4-8bc1c94ab639",
  "b8dbdd7b-2436-49a3-ab6f-7e0afd562252",
  "cf2bd8e8-b922-4dc0-8a71-505e0c464630",
  "e7d11bc5-a2a4-4b48-888f-3feee5ca9017",
  "ecdbb8b4-83f5-418c-8874-3dff15401ed6",
]);

const READY_RECONCILIATIONS = Object.freeze([
  "38ac8d16-9bee-4292-97c6-b02b0eee8cf6",
  "67350db7-c72c-4e60-9a22-9b98f7aace6c",
  "bea2534c-40f8-4efa-9039-e9540e28e99d",
  "e02176b0-2377-4780-b30d-4f608eff1625",
  "34227b70-955a-4b81-93a4-1e6f9eeba344",
  "c5f9c01b-106e-4a26-9926-79d0da7a8a3f",
]);

const REVIEW_DECISIONS = Object.freeze({
  "38ac8d16-9bee-4292-97c6-b02b0eee8cf6": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן לחיבור מפוצל ל־3 יעדים",
    continuationReason: "שלושת החישובים אומתו בנפרד. יש לחבר כל ערך ליעד המספר שלו בלי להפוך את הפרשנות הנלווית לעובדה.",
    recommendation: "מתאים לעץ",
    proposedTreeTargets: Object.freeze([
      "number:aff4783f-c430-4710-83e4-2f588c6fe62f (86)",
      "number:69ba76c5-0faf-42bc-b63f-57ab3f456390 (18)",
      "number:d3a5a1ee-0e62-4f1f-b507-f6ab517929dc (68)",
    ]),
  }),
  "67350db7-c72c-4e60-9a22-9b98f7aace6c": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן לחיבור מפוצל ל־2 יעדים",
    continuationReason: "שני החישובים אומתו בנפרד; כל ערך נשמר מול יעדו המדויק.",
    recommendation: "מתאים לעץ",
    proposedTreeTargets: Object.freeze([
      "number:d018c5f9-b210-4387-b19b-51959acdc7a8 (1372)",
      "number:0954a967-290c-4777-b993-9e16ee071cdb (686)",
    ]),
  }),
  "bea2534c-40f8-4efa-9039-e9540e28e99d": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן לחיבור מפוצל ל־3 יעדים",
    continuationReason: "הפרופיל הרב־שיטתי אומת; שלושת הערכים נשארים יעדים נפרדים והפעולות נשמרות בהסבר.",
    recommendation: "מתאים לעץ",
    proposedTreeTargets: Object.freeze([
      "number:cf0754d9-e37d-4003-b40a-4d14ac2afac1 (533)",
      "number:88083631-2f7f-4d93-ae46-63c5619a121a (787)",
      "number:fc9e110a-e616-4684-b0ad-5cb2369befea (477)",
    ]),
  }),
  "e02176b0-2377-4780-b30d-4f608eff1625": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן כסדרה מספרית מפוצלת",
    continuationReason: "996, 997, 998 ו־1000 אומתו כיעדים נפרדים. 999 נשאר פרשנות מקור ואינו מקודם כחישוב מאומת.",
    recommendation: "מתאים לעץ",
    proposedTreeTargets: Object.freeze([
      "number:7ddd6321-af73-458b-aed4-53eaf9f5dfe7 (996)",
      "number:de96e39c-ea51-4e20-8fca-d9ead3f3c99a (997)",
      "number:953c6f10-1134-4417-8c6a-fad7076f8017 (998)",
      "number:f9af9c48-6b36-4ab9-a4ba-9ac6c6d8166c (1000)",
    ]),
  }),
  "34227b70-955a-4b81-93a4-1e6f9eeba344": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן ליעד 586 · תוקן מסיווג כפילות",
    continuationReason: "השורה הייחודית ותענני=שופר=586 אינה אותה טענה כמו אשכול 580. החפיפה נשמרת כקשר בלבד.",
    recommendation: "מתאים לעץ",
    proposedTreeTarget: "number:c4d485ea-db86-4bf6-ad16-535eb20b73d5 (586)",
    recommendedKeepId: null,
    duplicateIds: Object.freeze([]),
    relatedFindingIds: Object.freeze([
      "3c98934f-442a-426d-892a-8e747ea36b83",
      "3f50af95-8e82-412c-bbac-b87b60de66e9",
    ]),
  }),
  "c5f9c01b-106e-4a26-9926-79d0da7a8a3f": Object.freeze({
    continuationState: "ready",
    continuationLabel: "מוכן ליעד 238 · תוקן מסיווג כפילות",
    continuationReason: "רחל=238 הוא חיבור עצמאי ואינו כפילות של יעד 119. הקשר לרשומה הקודמת נשמר בלי להעלים מקור.",
    recommendation: "מתאים לעץ",
    proposedTreeTarget: "number:8935de02-56d5-4f56-a0d7-bc6694b22582 (238)",
    recommendedKeepId: null,
    duplicateIds: Object.freeze([]),
    relatedFindingIds: Object.freeze(["80e1a0dd-dbc1-4da5-9a92-86952ee98962"]),
  }),
  "06c22b3f-9988-460b-9888-516015e20e68": Object.freeze({
    continuationState: "blocked_missing_target",
    continuationLabel: "חסום עד יצירת יעד מספר 1563",
    continuationReason: "החישוב עבר, אך אין יעד מספר קיים ומאומת לחיבור. אין ליצור או לקדם יעד אוטומטית.",
  }),
  "b4b40fe6-39d8-494b-9608-1c86f83dd6fc": Object.freeze({
    continuationState: "blocked_missing_target",
    continuationLabel: "חסום עד יצירת יעד מספר 4530",
    continuationReason: "החישוב עבר, אך אין יעד מספר קיים ומאומת לחיבור. אין ליצור או לקדם יעד אוטומטית.",
  }),
  "d20f0e7b-6abb-4a1b-89e7-0dddcac5697f": Object.freeze({
    continuationState: "needs_review",
    continuationLabel: "דורש בדיקת קורפוס",
    continuationReason: "הערכים המספריים אומתו, אך טענות הכתיב והשכיחות עדיין לא שוחזרו בקורפוס.",
  }),
  "e9b915dd-4f08-4021-82e8-09fa7054a7a6": Object.freeze({
    continuationState: "needs_review",
    continuationLabel: "דורש פיצול ובדיקת הקשר",
    continuationReason: "שני האטומים המספריים עברו; יתר תוכן המקור עדיין אינו חלק מן האימות.",
  }),
  "05164ee8-1fdf-4609-90ac-81c5907ccdec": Object.freeze({
    continuationState: "set_aside",
    continuationLabel: "הושם בצד",
    continuationReason: "הפריט הושם בצד בהחלטת בעל האתר ואינו נכלל במנת היישום הנוכחית.",
  }),
  "0e7f540c-59b8-456c-bba4-263f282aa2ed": Object.freeze({
    continuationState: "set_aside",
    continuationLabel: "הושם בצד",
    continuationReason: "הפריט הושם בצד בהחלטת בעל האתר ואינו נכלל במנת היישום הנוכחית.",
  }),
  "ef7d9c29-675d-47f5-afdb-b0606497c9c3": Object.freeze({
    continuationState: "set_aside",
    continuationLabel: "הושם בצד",
    continuationReason: "הפריט הושם בצד בהחלטת בעל האתר ואינו נכלל במנת היישום הנוכחית.",
  }),
  "1204cb70-958f-496e-bdcc-0d3c56df825b": Object.freeze({ displayRepresentativeId: "1204cb70-958f-496e-bdcc-0d3c56df825b" }),
  "43b077a3-31ed-4412-9bb4-047992026574": Object.freeze({ displayRepresentativeId: "43b077a3-31ed-4412-9bb4-047992026574" }),
  "90c88e73-49f4-4e3c-abc6-ae35e4ba7e93": Object.freeze({ displayRepresentativeId: "90c88e73-49f4-4e3c-abc6-ae35e4ba7e93" }),
});

if (READY_FOR_IMPLEMENTATION.size !== 49) throw new Error("World strong continuation expected 49 direct-ready findings");
if (CLUSTERED_DUPLICATES.size !== 15) throw new Error("World strong continuation expected 15 display clusters");
if (READY_RECONCILIATIONS.some((id) => REVIEW_DECISIONS[id]?.continuationState !== "ready")) {
  throw new Error("World strong continuation has an incomplete ready reconciliation");
}

export const WORLD_FINDING_STRONG_CONTINUATION_META = Object.freeze({
  reviewedAt: "2026-10-26",
  baseCommit: "662a4d9fa73750ac14a93a0c96cd7cd4c5285b85",
  strongFindings: 183,
  alreadyConnected: 106,
  readyForImplementation: 55,
  duplicateDecisions: 17,
  clusteredDuplicates: 15,
  correctedDuplicateClassifications: 2,
  blockedMissingTarget: 2,
  needsReview: 2,
  setAside: 3,
  mutatesLiveData: false,
});

export function getWorldFindingStrongContinuation(findingId) {
  const id = String(findingId || "").replace(/^research:/, "");
  const explicit = REVIEW_DECISIONS[id] || null;
  if (READY_FOR_IMPLEMENTATION.has(id)) {
    return Object.freeze({
      continuationState: "ready",
      continuationLabel: "מוכן ליישום מבוקר",
      continuationReason: "הראיות והיעד המדויק עברו את מנת הביקורת; טרם בוצע שינוי ברשומה החיה או בעץ.",
      ...explicit,
    });
  }
  if (CLUSTERED_DUPLICATES.has(id)) {
    return Object.freeze({
      continuationState: "clustered",
      continuationLabel: "אושר כאשכול כפילות לתצוגה",
      continuationReason: "כל ההופעות והמקורות נשמרים; בתצוגה נבחר הנוסח המלא ביותר בלי מחיקה או ספירה כמקור עצמאי.",
      ...explicit,
    });
  }
  return explicit;
}
