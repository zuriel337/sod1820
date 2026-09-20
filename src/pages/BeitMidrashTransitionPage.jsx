import React, { useEffect } from "react";
import { applySeo } from "../lib/seo.js";
import TransitionAnnouncement from "../components/TransitionAnnouncement.jsx";

export default function BeitMidrashTransitionPage() {
  useEffect(() => {
    applySeo({
      title: "בית המדרש עובר לעולם החדש · SOD1820",
      description: "בית המדרש הישן נסגר בהדרגה. התוכן והמחקר ממשיכים בעולם, בספרים ובהיכל 2029.",
      path: "/beit-midrash",
      noindex: true,
    });
  }, []);

  return <TransitionAnnouncement context="beit" full />;
}
