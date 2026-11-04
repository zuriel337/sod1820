import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { buildWorldAllResearchProjection, worldPublicResearchDto } from "../../src/lib/research/worldAllResearchProjection.js";
import { PublicWorldFindingFocus } from "../../src/pages/World2029Page.jsx";

const node="b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
const projection=buildWorldAllResearchProjection({
  researchObjects:[{
    id:"fixture-finding", created_at:"2026-10-29T00:00:00Z", kind:"observation", value:374,
    statement:"מחקר לדוגמה", source:"wa_channel", source_ref:"channel_updates:fixture",
    contributor:"חוקר דוגמה", status:"canonical", privacy_scope:"public", promoted_node_id:node,
    engine_detail:{verification_state:"match"},
    meta:{governance:{tree_attachment:{mode:"existing_graph_identity_pointer",target_node_id:node,target_node_type:"number"}},
      ext:{wa_channel_intake:{tree_matches:[{type:"topic",key:"strong-topic",match:"number"}]}}},
  }],
  topics:[
    {id:"strong",slug:"strong-topic",title:"נושא חזק",status:"approved",meter_score:90},
    {id:"attached",slug:"attached-topic",title:"נושא בהצמדה",status:"approved",meter_score:30,node_id:node},
    {id:"private",slug:"private-topic",title:"נושא פרטי",status:"candidate",meter_score:100},
  ],
});
const finding=worldPublicResearchDto(projection).rows.find((row)=>row.sourceId==="fixture-finding");
createRoot(document.getElementById("root")).render(<BrowserRouter><PublicWorldFindingFocus finding={finding} context={{}} shell={{}} /></BrowserRouter>);
