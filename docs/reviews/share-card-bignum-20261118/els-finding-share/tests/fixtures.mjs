// Synthetic rows only (no live data). Shapes follow els_records columns read at origin/main 270bfab6a.
export const TORAH = "0b022e8eef6f9c16";   // CORPUS_ID.torah in public/tzofen.html
export const TANAKH = "0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b";

export const approvedExact = {
  id: "00000000-0000-4000-8000-000000000001", slug: "משיח-17", title: "משיח בדילוג 17", search_term: "משיח",
  scope: "torah", skip_distance: 17, direction: "fwd", start_index: 1234, corpus_id: TORAH,
  status: "published", visibility: "public", self_published: true, source: "community",
  image_url: "https://example.invalid/card.png", owner_user_id: "11111111-1111-4111-8111-111111111111",
  engine_detail: { trace_ids: ["t-secret"] }, author_name: "חוקר",
  positions: { shapeUrl: "https://example.invalid/shape.png", findings: [
    { t: "דוד", color: "#2f9e5a", sh: ["5_1_1200", "5_-1_1300"], sourceShown: [] },
    { t: "גאולה", color: "#3b82d6", sh: [], sourceShown: ["1_1_1210"] },
  ], view: { showN: 2 }, searchWindow: { ctxR: 3, windowColumns: 60 } },
};

// A member's "save" today: save_els_matrix p_public=true -> pending, private, self_published = (status <> 'draft') = true.
export const memberPendingSubmission = { ...approvedExact, id: "00000000-0000-4000-8000-000000000002", slug: "משיח-17-2",
  status: "pending", visibility: "private", self_published: true };

// Owner toggled "show in public dossier" (self_publish_matrix) on a private draft.
export const ownerSharedDraft = { ...approvedExact, id: "00000000-0000-4000-8000-000000000003", slug: "משיח-17-3",
  status: "draft", visibility: "private", self_published: true };

// admin_els_to_dossier: status=hidden + self_published=true.
export const dossierOnly = { ...approvedExact, id: "00000000-0000-4000-8000-000000000004", slug: "משיח-17-4",
  status: "hidden", visibility: "private", self_published: true };

export const privateDraft = { ...approvedExact, id: "00000000-0000-4000-8000-000000000005", slug: "משיח-17-5",
  status: "draft", visibility: "private", self_published: false };

// Legacy published row without exact coordinates (97 of 116 public rows on 18.11.2026 lack them).
export const approvedLegacy = { ...approvedExact, id: "00000000-0000-4000-8000-000000000006", slug: "ירושלים-71",
  search_term: "ירושלים", skip_distance: 71, start_index: null, direction: "down", corpus_id: null };

export const tanakhExact = { ...approvedExact, id: "00000000-0000-4000-8000-000000000007", slug: "תנך-1",
  scope: "tanakh", corpus_id: TANAKH, direction: "back", start_index: 900000 };
