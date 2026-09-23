import { normalizeResearchSynthesis } from "./researchSynthesis.js";

// Visual Golden only. Human visual review precedes any live adapter or public projection.
// This is NOT live Number truth and must never be projected
// outside the isolated 2029 preview route as though it came from a runtime Bundle.
// The purpose is to validate presentation + one-Synthesis/one-Raziel consumption
// with no locally-generated second Raziel message in the preview panel,
// including when stale Number focus exists in the same browser session.
// before wiring the live synthesizer adapter.

export const SYNTHESIS_1820_PREVIEW_VERSION = "golden-preview-1820-v1";

const PREVIEW_FINDING_IDS = Object.freeze([
  "preview:1820:ragil:secret-name",
  "preview:1820:ragil:torah-name-count",
  "preview:1820:miluy:gilui-sod",
  "preview:1820:kadmi:et",
  "preview:1820:kadmi:ze-hayom",
]);

export const RAZIEL_1820_ROUTE_ACTION_PREVIEW = Object.freeze({
  action: "raziel_route",
  contract_version: 1,
  route_action: "connect",
  label: "לחבר",
  task_mode: "discover_connections",
  preferred_home: "world",
  requested_by: "preview_visual_fixture",
  surface: "number",
  subject_type: "number",
  reason_codes: Object.freeze(["graph_context", "typed_relations", "bounded_connections", "numeric_subject"]),
  delivery: Object.freeze({
    mode: "in_place_first",
    preserve_context: true,
    exact_return_on_handoff: true,
    semantic_handoff_only: true,
  }),
  synthesis: Object.freeze({
    state: "composed",
    message_authority: "bundle.synthesis",
    local_message: null,
    must_not_mint_second_message: true,
  }),
  guards: Object.freeze({
    semantic_action_only: true,
    no_navigation_execution: true,
    no_tool_execution: true,
    no_authorization_decision: true,
    no_truth_ranking: true,
    no_local_message_generation: true,
    same_synthesis_is_message_authority: true,
    no_second_router: true,
    one_context_required: true,
  }),
  provenance: Object.freeze({
    fixture: true,
    source_contract: "PR #631 · razielActionContract v1",
    live_runtime_action: false,
    public_cutover_authorized: false,
    visual_prompt: "מה מתחבר ל־1820?",
  }),
});

export const LEGACY_1820_SNAPSHOT = Object.freeze({
  number: 1820,
  source_class: "legacy_presentation_snapshot",
  authority: false,
  title: "ניתוח AI למספר 1820",
  subtitle: "היום · AI מחבר עוגן וביטויים שנבחרו",
  anchor: "סוד השם × עמים",
  message:
    "המספר 1820 חושף בפנינו רמז עמוק ומרגש, המצביע על אחדות הבורא, תורתו ועמו ישראל. באותו ערך מופיעים ביטויים כגון «הקדוש ברוך הוא תורה ישראל אחד» ו«מספר שמות יהוה בכל התורה», וה־AI מחבר אותם לקריאה ציורית אחת.",
  evidence: [
    "עוגן מקומי · 1820 → סוד השם × עמים",
    "ביטוי מוביל · מספר שמות יהוה בכל התורה",
    "ביטויים שווים נוספים מן המאגר",
  ],
  boundary:
    "Snapshot להשוואת UX בלבד. מנגנון Legacy אינו authority של Synthesis 2029.",
});

export const SYNTHESIS_1820_PREVIEW = normalizeResearchSynthesis(
  {
    status: "composed",
    message:
      "1820 מצטייר כאן לא כעוגן יחיד אלא כציר שבו סוד, זמן וגילוי חוזרים מכמה שכבות. ברגיל מופיעים ביטויים של שם, תורה והתגלות; במילוי מופיע «גלוי סוד יהוה בעתה»; ובמשולש חוזרים «עת» ו«זה היום עשה יהוה». לכן הקריאה המרכזית היא של דבר נסתר שמבקש לקבל צורה בזמן — לא עוד רשימת שוויונות, אלא מהלך שחוזר בכמה עדשות.",
    claims: [
      {
        id: "claim:1820:secret-revelation",
        text: "בכמה משפחות חישוב מופיע ציר לשוני של סוד/שם מול גילוי והתגלות.",
        role: "interpretation",
        motif_key: "hidden_to_revealed",
        support: {
          finding_ids: [
            "preview:1820:ragil:secret-name",
            "preview:1820:miluy:gilui-sod",
          ],
          dependency_groups: ["ragil", "miluy"],
          negative_or_control_refs: ["preview-control:do-not-count-match-volume-as-truth"],
        },
      },
      {
        id: "claim:1820:time",
        text: "שכבת המשולש מוסיפה מוטיב זמן דרך «עת» ו«זה היום עשה יהוה».",
        role: "interpretation",
        motif_key: "time",
        support: {
          finding_ids: [
            "preview:1820:kadmi:et",
            "preview:1820:kadmi:ze-hayom",
          ],
          dependency_groups: ["kadmi"],
        },
      },
      {
        id: "claim:1820:torah-name",
        text: "ברגיל מופיע גם ציר של תורה/שם, אך הוא נשמר כעוגן תומך ולא כהוכחה עצמאית לכל המסר.",
        role: "interpretation",
        motif_key: "torah_name",
        support: {
          finding_ids: ["preview:1820:ragil:torah-name-count"],
          dependency_groups: ["ragil"],
        },
      },
    ],
    motifs: [
      {
        key: "hidden_to_revealed",
        label: "נסתר → נגלה",
        summary: "סוד/שם מקבלים צורת גילוי במקום להישאר עוגן בודד.",
        claim_ids: ["claim:1820:secret-revelation"],
        semantic_dimensions: ["hidden", "revealed"],
      },
      {
        key: "time",
        label: "עת / זמן",
        summary: "הגילוי נקרא דרך שפה של עת/יום.",
        claim_ids: ["claim:1820:time"],
        semantic_dimensions: ["progression", "time"],
      },
      {
        key: "torah_name",
        label: "תורה / שם",
        summary: "ציר תומך שחוזר בחומר הרגיל.",
        claim_ids: ["claim:1820:torah-name"],
        semantic_dimensions: ["revealed", "source-theme"],
      },
    ],
    research_strength: {
      independent_evidence_groups: 3,
      verified_engine_components: 5,
      source_attestation_groups: 1,
      cross_domain_dimensions: ["gematria-method-families", "corpus-language"],
      contradiction_count: 0,
      negative_control_count: 1,
      reproducibility: "preview_fixture_only",
      note:
        "מספרי החוזק כאן הם fixture לבדיקת projection; אינם מדידה חיה ואינם ציון אמת.",
    },
    calibration: {
      state: "unvalidated",
      individual: {
        tested_claims: 0,
      },
      bias_controls: {
        message_frozen_before_validation: false,
        validation_data_hidden_during_synthesis: false,
        decoy_control_used: false,
        evaluator_blinded: false,
        leakage_check: "preview_fixture",
        post_hoc_exposure: "known_1820_research_used_for_visual_golden",
      },
    },
    corpus_context: {
      corpus_ref: "preview:canonical-supabase:1820-slice",
      corpus_version: "preview-only",
      population_size: 0,
      search_space_size: 0,
      baseline_ref: null,
      multiple_comparison_control: "not_measured_in_visual_fixture",
      selection_provenance: "known_1820_material_selected_for_visual_golden",
    },
    learning: {
      policy_version: "research-synthesis-policy-v1",
      human_gate_state: "visual_preview_only",
    },
    freeze: {
      frozen: true,
      policy_version: "research-synthesis-policy-v1",
    },
    explain_why: {
      primary_motif: "נסתר → זמן → גילוי",
      supporting_anchors: [
        "רגיל · מספר שמות יהוה בכל התורה",
        "מילוי · גלוי סוד יהוה בעתה",
        "משולש · עת",
        "משולש · זה היום עשה יהוה",
      ],
      weakened_or_excluded: [
        "כמות ביטויים לבדה אינה נספרת כחוזק",
        "אותו מקור או אותה משפחת חישוב אינם מוכפלים כראיות עצמאיות",
        "ה־Preview אינו rarity/base-rate study",
      ],
      alternative_reading:
        "קריאה חלופית: אחדות בין הבלתי־מוגבל לבין ביטוי קונקרטי בזמן ובתורה.",
    },
    provenance: {
      fixture: true,
      preview_version: SYNTHESIS_1820_PREVIEW_VERSION,
      live_runtime_synthesis: false,
      public_cutover_authorized: false,
      source_note:
        "מבוסס על חומר 1820 חי שנבדק לצורך Golden visual preview; אינו תחליף ל־Result Bundle runtime.",
    },
  },
  {
    allowedFindingIds: PREVIEW_FINDING_IDS,
    frozenAt: "2026-09-23T00:00:00.000Z",
    sourceBundleContractVersion: 1,
  }
);

export function synthesis1820PreviewProjection() {
  return Object.freeze({
    number: 1820,
    preview_version: SYNTHESIS_1820_PREVIEW_VERSION,
    legacy: LEGACY_1820_SNAPSHOT,
    synthesis: SYNTHESIS_1820_PREVIEW,
    raziel_route: RAZIEL_1820_ROUTE_ACTION_PREVIEW,
    display: {
      title: "ניתוח 1820 · ישן מול Synthesis 2029",
      subtitle: "אותה שפה ציורית · מוח מחקרי חדש מתחת",
      preview_notice: "Golden Preview · עדיין לא מחובר ל־live synthesizer",
      primary_motif: SYNTHESIS_1820_PREVIEW.explain_why.primary_motif,
      anchors: SYNTHESIS_1820_PREVIEW.explain_why.supporting_anchors,
      controls: SYNTHESIS_1820_PREVIEW.explain_why.weakened_or_excluded,
      alternative: SYNTHESIS_1820_PREVIEW.explain_why.alternative_reading,
    },
  });
}

export default synthesis1820PreviewProjection;
