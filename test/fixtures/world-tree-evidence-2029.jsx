import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { buildWorldAllResearchProjection } from "../../src/lib/research/worldAllResearchProjection.js";
import WorldAllResearchTable from "../../src/components/research/WorldAllResearchTable.jsx";

// Synthetic source, no real account or data. The real projection shapes the API fixture.
const node = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
const base = { created_at:"2026-10-29T00:00:00Z", kind:"observation", value:374, source:"wa_channel",
  contributor:"חוקר דוגמה", engine_verified:true, engine_detail:{verification_state:"match"}, privacy_scope:"public" };
const projection = buildWorldAllResearchProjection({
  researchObjects: [
    { ...base, id:"candidate", statement:"מועמד מספרי לדוגמה", source_ref:"channel_updates:candidate", status:"approved",
      meta:{ext:{wa_channel_intake:{tree_matches:[{type:"topic",key:"fixture-topic",label:"נושא דוגמה",match:"number"}]}}} },
    { ...base, id:"documented", statement:"חיבור מתועד לדוגמה", source_ref:"channel_updates:documented", status:"canonical",
      promoted_node_id:node, meta:{governance:{tree_attachment:{mode:"existing_graph_identity_pointer",target_node_id:node,target_node_type:"number"}}} },
  ],
  topics: [{id:"topic-1",slug:"fixture-topic",title:"נושא דוגמה",node_id:node,status:"approved",meter_score:80}],
});
const candidate = projection.rows.find((row) => row.sourceId === "candidate");
candidate.triage = {continuationState:"already_connected", continuationLabel:"כבר מחובר לעץ",
  continuationReason:"הרשומה החיה כבר מצביעה ליעד קיים."};
candidate.legacyReplay = {state:"fixture", decision:{decisionState:"already_connected", sourceReadiness:"exact_source",
  targetReadiness:"already_connected", reason:"קיים חיבור חי ליעד; ה־replay אינו משנה אותו."},
  pendingEngineContext:{sourceReadiness:"exact_source", targetReadiness:"already_connected",
    reason:"חסרה הכרעת מנוע. קיים חיבור חי ליעד; ה־replay אינו משנה אותו."}};
for (const key of ["byContinuationState","byElsResearchCluster","byFormulaCalculationState","byFormulaReviewLane",
  "byLanguageResearchLane","byLegacyReplaySourceReadiness","byLegacyReplayState","byLegacyReplaySubtype",
  "byLegacyReplayTargetEvidence","byLegacyReplayTargetReadiness","byNumericReviewLane","byNumericStatementState",
  "byPendingEngineSourceReadiness","byPendingEngineTargetEvidence","byPendingEngineTargetReadiness",
  "bySpatialCalculationState","bySpatialCuratedCoverage","bySpatialResearchMetadataState","bySpatialReviewLane",
  "bySpatialTextOrigin","byTextualReviewLane","byTextualStatementState","byTriageRecommendation","byTriageStrength"]) projection[key] ||= {};
projection.sourceOptions = []; projection.topicOptions = [];
projection.triageSnapshot = {recommendationCounts:{},strengthCounts:{}};
supabase.auth.getSession = async () => ({data:{session:{access_token:"fixture-only"}},error:null});
window.fetch = async (url) => {
  if (!String(url).startsWith("/api/world-finding-review")) throw new Error("unexpected fixture fetch");
  return new Response(JSON.stringify({projection,page:{limit:40,returned:2,totalFiltered:2,hasMore:false}}),
    {status:200,headers:{"content-type":"application/json"}});
};
createRoot(document.getElementById("root")).render(<BrowserRouter><WorldAllResearchTable state={{enabled:true}} /></BrowserRouter>);
