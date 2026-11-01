import React from "react";
import CommunityLive2029 from "../components/community2029/CommunityLive2029.jsx";
import LegacyOpenWebChat2029 from "../components/community2029/LegacyOpenWebChat2029.jsx";
import { PUBLIC_LAUNCH_READ_ONLY_PREVIEW } from "../lib/publicLaunch2029.js";
import Sod2029Shell from "../components/experience2029/Sod2029Shell.jsx";

export default function CommunityChatTransition2029Page() {
  if (PUBLIC_LAUNCH_READ_ONLY_PREVIEW) return <Sod2029Shell surface="community" title="קהילה" introVariant="none"><section className="sod29-section"><h1>הקהילה תיפתח בהמשך</h1><p>כתיבה, תגובות ופעולות חשבון עדיין אינן פעילות בגרסה זו. התוכן הקיים נשמר.</p></section></Sod2029Shell>;
  return <CommunityLive2029
    canonicalPath="/community/chat"
    trailingContent={<LegacyOpenWebChat2029 />}
  />;
}
