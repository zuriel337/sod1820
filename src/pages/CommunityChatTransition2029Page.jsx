import React from "react";
import CommunityLive2029 from "../components/community2029/CommunityLive2029.jsx";
import LegacyOpenWebChat2029 from "../components/community2029/LegacyOpenWebChat2029.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { publicLaunchActionsLocked } from "../lib/publicLaunch2029.js";

export default function CommunityChatTransition2029Page() {
  const { isAdmin } = useAuth();
  return <CommunityLive2029
    canonicalPath="/community/chat"
    trailingContent={publicLaunchActionsLocked(isAdmin) ? null : <LegacyOpenWebChat2029 />}
  />;
}
