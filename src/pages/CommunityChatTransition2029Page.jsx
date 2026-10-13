import React from "react";
import CommunityLive2029 from "../components/community2029/CommunityLive2029.jsx";
import LegacyOpenWebChat2029 from "../components/community2029/LegacyOpenWebChat2029.jsx";

export default function CommunityChatTransition2029Page() {
  return <CommunityLive2029
    canonicalPath="/community/chat"
    leadingContent={<LegacyOpenWebChat2029 />}
  />;
}
