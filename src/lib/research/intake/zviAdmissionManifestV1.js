// ZVI_ADMISSION_MANIFEST_V1 — frozen classification output of the COMPLETED audit
// ZVI_DEEP_CORPUS_ONE_TREE_MAPPING_V1 (work_log 18f6c4a2-3959-446b-933d-5967fd9e2527, generated_at
// 2026-10-07T18:29:46Z). This is a provenance artifact, NOT a store and NOT a re-scan: it carries only the
// source occurrence identity (channel_updates.id), the audit disposition and the audit note. The exact
// source text is read live, at dry-run time, through the signed-in admin's own session.

export const ZVI_MANIFEST_VERSION = "ZVI_ADMISSION_MANIFEST_V1";
export const ZVI_SOURCE_TABLE = "channel_updates";
export const ZVI_CONTRIBUTOR_LABEL = "צבי (OPOC)";
export const ZVI_CONTRIBUTOR_ID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";

const E = (source_id, cls, disposition, note, extra = {}) => ({ source_id, class: cls, disposition, note, ...extra });
const G = "GEMATRIA_CLAIM", T = "TEXT_PATTERN", S = "SOURCE_OCCURRENCE", N = "NUMERIC_CALC", M = "METHOD_OR_TRANSFORM", P = "SPATIAL_RESEARCH";
const V = "READY_ENGINE_VERIFIED", A = "READY_SOURCE_ATTESTED", X = "READY_MIXED", MM = "READY_TESTED_MISMATCH";

export const ZVI_ADMISSION_MANIFEST_V1 = Object.freeze({
  version: ZVI_MANIFEST_VERSION,
  generated_at: "2026-10-07T18:29:46.215217+00:00",
  source_count: 53,
  disposition_counts: Object.freeze({
    READY_MIXED: 4, READY_ENGINE_VERIFIED: 29, READY_SOURCE_ATTESTED: 9, READY_TESTED_MISMATCH: 4,
    HOLD_CONTEXT_DEPENDENT: 1, REUSE_CLAIM_OCCURRENCE: 1, DUPLICATE_REPRESENTATION: 2, EXCLUDE_NO_STANDALONE_FINDING: 3,
  }),
  entries: Object.freeze([
    E("0bddbec3-7c72-41fb-a5a2-a54aff2b7f52", G, V, "מודה אני לפניך=306=אשה"),
    E("0deb25aa-99b4-4297-9999-f6184f13b40f", G, V, "2×ברחמים גדולים(393)=786=כתר עליון; representative claim occurrence"),
    E("3c338877-a574-49c0-90b3-ecd99ef0962a", G, V, "תשפז=787; ותשועה=787; והושעת=787"),
    E("4b24de5e-dc9b-473c-b5d4-c006cd8bd21a", G, V, "50+26+620=696 and עתיק יומין=696"),
    E("5d4357c9-7921-4c6c-a40d-1ad29ddbd28e", G, X, "בראשית=913 verified; broader משה relation not explicit in this occurrence"),
    E("63d07245-6fb2-4970-806a-0e777ae16967", G, V, "ברוך מחיה המתים=786 and תשפו=786"),
    E("76176bf3-e94a-44bb-a7e0-73b736d1a2e6", G, V, "27×יהוה(26)=702=שבת; parser direct שבת=27 rejected in favor of compound meaning"),
    E("78319af9-937f-45c0-94d3-2283e9af3088", G, V, "הודו ליהוה כי טוב כי לעולם חסדו=408; phrase appears four times when paragraph marker is ignored"),
    E("79e6047b-3763-48de-8740-6afd43d7a361", G, MM, "source claims פשרה and verse=580; canonical engine gives both 585"),
    E("7c59cf5b-39aa-41f2-8e4f-cd2fee2726e8", G, V, "ישראל בעל שם טוב=1000; canonical tanach corpus has exactly 4 Psalms verses with ragil=1000"),
    E("8a88c42f-d321-4ffd-812b-64ccb8b16efd", G, X, "source enumerates 17 gifts; טוב=17 verified; enumeration/interpretation remains source-attested"),
    E("8a8cac93-0350-45cf-8100-c0b1924de374", G, V, "מי שגמלך כל טוב הוא יגמלך כל טוב סלה=787"),
    E("a26cf646-a042-4b21-83cd-2bb267c2a1d2", G, V, "ים=50"),
    E("bc0aa8ce-30fc-4a22-b42d-113a456f5e58", G, V, "רזא208+שבת702 = סוד70×אחד13 = 910"),
    E("c9df0633-f04c-4a07-939d-d4d74ff8f0c6", G, V, "אהיה21 + יהוה26 + אהיה21 = 68"),
    E("d30951a5-544e-4301-9565-4b5979592a32", G, V, "ירמיהו=271"),
    E("dd9a985c-2e7e-4c22-a775-1046977bd167", G, V, "עכוב=98; זמן=97 so זמן+1=98; סגלה=98; כוכבים=98"),
    E("de3b4c56-5ab1-4f96-bf06-d7e915de7ff0", G, V, "שבע ברכות=1000 רגיל"),
    E("e40244a0-ed02-43d5-8a1a-a1acc839ed1f", G, V, "חיים=68=4×טוב(17) verified composite"),
    E("e4d38096-fc9a-4bf8-a785-3672a3849ced", G, "REUSE_CLAIM_OCCURRENCE", "same claim family as earlier 0deb25aa: 2×393=786", { reuse_of_source_id: "0deb25aa-99b4-4297-9999-f6184f13b40f" }),
    E("ebe50a0c-912a-41ef-aa4a-97d8c846c244", G, V, "מיכאל=101; parser prefix למה excluded"),
    E("f1873268-0931-4cad-9dcf-aca2e8823ef2", G, V, "משיח=358; אהיה=21; 4×מיכאל(101)=404"),
    E("f2ef23c3-fc4d-4ca1-be5b-a47bb99d0e4e", G, V, "חסד 72 + 3×רחל 238 = 786; תשפו=786"),
    E("36066382-23de-46e5-a642-7a579a8b3247", M, X, "פו=86=אלהים regular clear; source miluy יוד=300 / אחורית=200 preserved but exact spelling/method binding requires source-attested treatment"),
    E("a6554a4a-8f92-40c1-a67b-e901154a3c61", M, "DUPLICATE_REPRESENTATION", "semantic duplicate of 36066382; similarity 1.0 after punctuation/emoji normalization"),
    E("bd6c9e6b-fa15-4c91-ba75-7f3b66bcc2cd", M, V, "אתבש פשרה→ובגצ verified by fn_name_research; numeric transform=101"),
    E("1b79f104-f104-45e1-9aa4-8561ebaf95c1", N, A, "four notarikon expansions of בשמחה; number 4 is count, not gematria operation"),
    E("90d450d3-4b8b-4b7b-bfbf-0eea2edae8e9", N, V, "הכנסת ספר תורה=1486"),
    E("94cc1578-6aa6-4df5-8a76-0378f3bbedf8", N, V, "696+90=786 and כתר עליון=786"),
    E("bbf73c85-437e-4afd-b5ce-8c58683cc4a1", N, V, "ובחרת בחיים=686"),
    E("c74f7949-fda7-4c85-8142-eb0fb9b3dc44", N, V, "כתר620 + הוא אלהים חיים166 = 786"),
    E("e6b097db-4d19-4834-9c58-5004b16ab3c8", N, V, "איש=311; ה=5; 311-5=306=אשה"),
    E("2feaa8f5-2789-4398-87fa-7492290f4fcc", S, MM, "source claims כי תבא=4 / כי תבוא=6; canonical corpus phrase hits are 8 / 4"),
    E("41388ee7-1395-477d-9991-30765c1d5bb6", S, "HOLD_CONTEXT_DEPENDENT", "says עוד 3 פסוקים כאלה with no verses in this occurrence; cannot safely extract standalone finding"),
    E("422febb1-93a8-4b0b-9595-df6509d7d406", S, A, "Torah: שופר full=2 occurrences in one verse; defective שפר/השפר=3 occurrences at Sinai"),
    E("651cb4fb-da39-48f3-9765-fac58cae1643", S, A, "משלי ל:א occurrence confirmed; לאיתיאל is palindromic and doubled in verse"),
    E("bfe68d3c-0732-4fc3-9b1d-b753cf3f28d8", S, MM, "source claims שמעו נא=13; canonical tanach corpus yields 9 phrase hits"),
    E("f314e111-c9ba-4bf4-824c-d0f1f9b801f2", S, A, "canonical corpus confirms listed named וישכם subjects; יהושע appears 4 times"),
    E("145f6ac0-b27d-4004-afef-7a5f334e069c", P, "EXCLUDE_NO_STANDALONE_FINDING", "roadmap/meta statement that 3D gematria is not yet on site; undisclosed findings not extractable"),
    E("463abc48-ed6e-4578-a5c7-2b992cd57fc5", P, "EXCLUDE_NO_STANDALONE_FINDING", "thank-you/meta message; no research finding"),
    E("f94382bb-063e-41ae-85f5-14c3ab113853", P, "EXCLUDE_NO_STANDALONE_FINDING", "only says גימטריה מופלאה בתלת מימד; no finding payload"),
    E("05f8614a-9809-4d7a-8398-14fd7dcbf4f7", T, V, "אשה=306=כפור; 3×אמונה102=306"),
    E("1adc4865-a5bf-4d5f-a1ed-65a197a25b15", T, V, "נחש=358=משיח"),
    E("2ac8e51a-bd45-4b59-9ebb-c041122925f1", T, A, "דבש לפי/חידא acronym/source claim preserved; external work not independently verified here"),
    E("2c41a244-8ba8-4b73-ac4d-8e2daf9d0853", T, A, "אלול notarikon set; representative occurrence"),
    E("2d218895-96ea-4dc2-aac6-907dc00c4bf7", T, V, "יצחק notarikon source-attested; ארבע קבוצות sum=1406; תהלים קיא:ב canonical ragil=1406; שרשרות=1406"),
    E("40c949b4-a2d2-45a9-91dc-2f1be5d30887", T, A, "מטה משה acronym/source claim preserved; external work not independently verified here"),
    E("6132ddf7-1c30-49ac-87a5-71d835cd3313", T, A, "תכלת begins/ends ת and source acronym ראש; semantic interpretation remains source"),
    E("8570f018-0d7c-4a42-afcb-82d9dde1157c", T, "DUPLICATE_REPRESENTATION", "semantic duplicate of 2c41a244; similarity 1.0 after punctuation/emoji normalization"),
    E("8b70034e-e93f-4669-8864-2bb8ed486565", T, X, "עכוב/כובע letter rearrangement source-attested; ישועת=786 verified; interpretation separate"),
    E("b8913499-a93d-4c97-a4b8-b41f3771c2d4", T, V, "מרדכי274 + רשבי512 = 786"),
    E("c5b7da00-7a43-49d5-932a-4a32bbf75881", T, MM, "claims only one ראשי-תיבות עכוב verse; canonical rashei field has 2 verses"),
    E("c736e15c-9dba-4fcc-83b3-bb0b8466e398", T, A, "canonical sofei field confirms עכוב in Genesis 36:33 and 1 Chronicles 1:44"),
  ]),
});
