import React from "react";
import "./community2029.css";
import CommunityLive2029 from "../components/community2029/CommunityLive2029.jsx";
import LegacyOpenWebChat2029 from "../components/community2029/LegacyOpenWebChat2029.jsx";

// The new community leads the page; the OpenWeb history sits below it, unchanged.
export default function CommunityChatTransition2029Page() {
  return <CommunityLive2029
    canonicalPath="/community/chat"
    trailingContent={<LegacyOpenWebChat2029 />}
  />;
}
