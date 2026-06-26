import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";

// כפתור פרסום לפייסבוק — פוסט או תמונה.
// Props: type='post'|'image', id=string, label=string (אופציונלי)
export default function ShareToFacebookBtn({ type, id, label, style = {} }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [fbId, setFbId] = useState(null);
  const [err, setErr] = useState(null);

  async function publish() {
    setState("loading");
    setErr(null);
    try {
      const body = type === "post" ? { type: "post", post_id: id } : { type: "image", image_id: id };
      const { data, error } = await supabase.functions.invoke("facebook-publish", { body });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || data?.skipped || "שגיאה לא ידועה");
      setFbId(data.fb_post_id);
      setState("done");
    } catch (e) {
      setErr(e.message);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <a
        href={`https://www.facebook.com/${fbId}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12, color: "#4ade80", textDecoration: "none", ...style }}
        title="נפתח בפייסבוק"
      >
        ✓ פורסם בפייסבוק ↗
      </a>
    );
  }

  return (
    <button
      onClick={publish}
      disabled={state === "loading"}
      title={state === "error" ? `שגיאה: ${err}` : `פרסם ${type === "post" ? "פוסט" : "תמונה"} לפייסבוק`}
      style={{
        background: state === "error" ? "rgba(180,40,40,0.8)" : "rgba(24,119,242,0.85)",
        border: "none",
        borderRadius: 6,
        color: "#fff",
        fontSize: 12,
        padding: "3px 8px",
        cursor: state === "loading" ? "wait" : "pointer",
        opacity: state === "loading" ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        ...style,
      }}
    >
      {state === "loading" ? "⏳" : state === "error" ? "⚠️ שוב" : "f"}
      {label || (type === "post" ? "פרסם" : "שתף")}
    </button>
  );
}
