import React from "react";
import DiscourseCore from "./DiscourseCore.jsx";
import FeatureClosedNotice from "./FeatureClosedNotice.jsx";
import { useFeatureState } from "./MaintenanceLock.jsx";

// Canonical forum/community-research gate.
// The heavy core is never mounted for a blocked public viewer: zero fetch + zero write.
export default function Discourse(props) {
  const forum = useFeatureState("lock_forum");
  if (forum.loading) return null;
  if (forum.blocked) return <FeatureClosedNotice state={forum} title="פורום המחקר" to="/forum" compact />;
  return <DiscourseCore {...props} />;
}
