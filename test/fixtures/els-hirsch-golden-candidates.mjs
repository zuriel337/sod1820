export const HIRSCH_GOLDEN_CONTRACT = "els_hirsch_cold_golden_candidates_v1";

export const HIRSCH_GOLDEN_CANDIDATES = Object.freeze([
  {
    recordId: "ff8e1f10-3ab7-4826-9988-e8ff9b68d6ab",
    label: "מוטאטיל",
    scope: "torah",
    corpusId: "0b022e8eef6f9c16",
    storedLegacy: { direction: "down", startIndex: null, corpusId: null, verified: true },
    axis: { hitId: "7887_-1_59154" },
    findings: [
      { term: "יהוה", kind: "els", hitIds: ["7887_-1_153798", "7887_1_122250", "7888_-1_145920"] },
      { term: "יבבה", kind: "els", hitIds: ["7887_-1_122250"] },
      { term: "תורהאתנ", kind: "els", hitIds: ["7887_1_19725"] },
      { term: "אמת", kind: "els", hitIds: ["7888_-1_51272"] },
      { term: "אמתאתנ", kind: "els", hitIds: ["7886_-1_67040"] },
    ],
  },
  {
    recordId: "bcc9d0f2-0135-471e-b2ea-08fc4580d629",
    label: "ז׳ אוקטובר",
    scope: "tanakh",
    corpusId: "0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b",
    storedLegacy: { direction: "down", startIndex: null, corpusId: null, verified: true },
    axis: { hitId: "42168_-1_600006" },
    findings: [
      { term: "ביבי", kind: "els", hitIds: ["42168_-1_600016"] },
      { term: "פלשתימ", kind: "source-sequence", hitIds: ["1_1_389152"] },
      { term: "קולהתרועה", kind: "source-sequence", hitIds: ["1_1_389160"] },
      { term: "קדמנימקשימות", kind: "source-sequence", hitIds: ["1_1_473496"] },
      { term: "מכנפהארצ", kind: "source-sequence", hitIds: ["1_1_599998"] },
      { term: "ואנשיהמלחמהנבהלו", kind: "source-sequence", hitIds: ["1_1_726504"] },
    ],
  },
  {
    recordId: "0cf271c6-f5de-4211-af70-05ef566f7fe0",
    label: "אטום טיל",
    scope: "torah",
    corpusId: "0b022e8eef6f9c16",
    storedLegacy: { direction: "down", startIndex: null, corpusId: null, verified: true },
    axis: { hitId: "10044_-1_102070" },
    findings: [
      { term: "משיח", kind: "els", hitIds: ["10044_1_71953"] },
      { term: "מכמטיל", kind: "els", hitIds: ["10045_-1_122161"] },
    ],
  },
]);

export const HIRSCH_NEGATIVE_CONTROL = Object.freeze({
  recordId: "9b1d9da2-3ce3-48e4-bb4f-1dfd61c7c81e",
  label: "תשפ״ו אלול חיבור בו הותר",
  scope: "tanakh",
  axis: { hitId: "19295_1_9801" },
  storedLegacy: { direction: "down", startIndex: null, corpusId: null, verified: false },
  findings: [],
});
