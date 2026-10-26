// Manager-only reconciliation of the 37 medium-strength rows whose historical
// verification state was an explicit match. A matching calculation is not enough
// to approve a tree connection: source, attribution and media identity remain
// independent gates. This module annotates review only and never writes live data.

const SOURCE_PROVENANCE_ONLY = new Set([
  "091694ce-d74d-456d-83d7-73f3016d5a0d",
  "0af54d7b-4c24-405c-9adb-f86339970144",
  "0d65237f-55ae-4371-a04e-2382f2824043",
  "25dc88cd-8238-432a-9a0a-2891a2da9751",
  "30e7136d-2cab-4f37-ad7e-f5e97eb3c278",
  "53a8833e-2be9-4516-9cd8-f45e819c7d9b",
  "547151d9-ab33-423b-95e9-70c7ee28523d",
  "57512e1a-fc1f-4b5e-9b8d-039c7e377bc4",
  "5dfe43fb-3ef9-4a0d-9341-57fbf85874dc",
  "6122ad38-95fe-4717-900e-dba0a1bf3ea8",
  "6958ea89-5b78-4206-942d-6afb39e6174d",
  "6e70920a-bc11-4c49-9a6c-95b489020781",
  "7a9b4683-679f-4664-aaf1-2cedecc8414b",
  "7cddf9b5-a9f5-4348-8697-a5c65b08486c",
  "7d2c5887-efb8-41dc-9446-7a7975cb7f38",
  "7ea53144-d702-404e-9b25-0387cd3b0bb7",
  "7f5cd1b4-d6ae-4104-9133-ee4647ef3f19",
  "8607775c-d6e6-4490-828d-fc68353875a0",
  "88fb9cbe-ae09-49b0-be10-55cec71a2c80",
  "979a216b-a9f8-40d3-b3ba-179dcb3455fa",
  "a195efc0-7ae2-4276-854a-511a8417e877",
  "b6270a48-aa1a-424e-b5dd-01a56dc99c34",
  "b6ed9971-2d5b-43c8-9c32-333308f2fe29",
  "c7a54854-5738-47be-91ef-e6bbdc0a1883",
  "c8ae72dd-23a7-4cb0-a3ea-31c4b1fa9037",
  "cd2556c7-04b5-4618-bc3f-54d38eefc0ae",
  "cfd8d6c2-f006-4993-bb6a-d9c8672fb049",
  "e3594ce8-1210-4150-a242-7e9d394762a4",
  "e8e3d690-97f4-4882-a276-9d07584a9bae",
  "e9718a42-806f-4970-ae55-4f9c65d1bc3e",
  "f44a5229-02ef-46d9-a648-f562194bb72e",
  "f4dff8fb-f32d-4ecc-8202-a67021bd86a7",
  "f95b902c-ddc3-4ca9-80f4-b7df8e6cbe6e",
  "fbf14c2a-442b-42ab-8fc0-9a1deb777df5",
  "fc06545a-e752-4ff6-884a-40573aa8e2de",
]);

const IDENTITY_UNRESOLVED = "196288f6-8edd-40e5-8f6d-3235638a88da";
const OCR_REQUIRED = "69dddd29-3383-4891-8676-38936004e783";

if (SOURCE_PROVENANCE_ONLY.size !== 35) {
  throw new Error("World medium match continuation expected 35 source-blocked rows");
}

export const WORLD_FINDING_MEDIUM_MATCH_CONTINUATION_META = Object.freeze({
  reviewedAt: "2026-10-26",
  baseCommit: "662a4d9fa73750ac14a93a0c96cd7cd4c5285b85",
  explicitMatchFindings: 37,
  readyForImplementation: 0,
  sourceRequired: 35,
  identityUnresolved: 1,
  ocrRequired: 1,
  mutatesLiveData: false,
});

export function getWorldFindingMediumMatchContinuation(findingId) {
  const id = String(findingId || "").replace(/^research:/, "");
  if (SOURCE_PROVENANCE_ONLY.has(id)) {
    return Object.freeze({
      continuationState: "needs_review",
      continuationLabel: "החישוב תואם · חסר מקור תוכן עצמאי",
      continuationReason: "ה־match מאמת את החישוב בלבד. work_log הוא תיעוד עבודה ולא locator של מקור תוכן; אין לקדם לעץ עד חיבור למקור מדויק.",
    });
  }
  if (id === IDENTITY_UNRESOLVED) {
    return Object.freeze({
      continuationState: "needs_review",
      continuationLabel: "החישוב תואם · שיוך הזהות לא פתור",
      continuationReason: "האימות הטכני נשמר, אך אין לייחס את הממצא לאדם לפי ניחוש ואין לקדם אותו לפני הכרעת הייחוס.",
    });
  }
  if (id === OCR_REQUIRED) {
    return Object.freeze({
      continuationState: "needs_review",
      continuationLabel: "החישובים תואמים · נדרש חיבור לתמונה",
      continuationReason: "זהו ממצא צבי ציבורי, אך Image 956 טרם קושרה בוודאות להודעה. יש להשלים OCR או זיהוי מדיה לפני הכרעת חיבור.",
    });
  }
  return null;
}
