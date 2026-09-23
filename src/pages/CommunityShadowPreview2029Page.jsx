import React, { useEffect, useState } from "react";
import { usePalette } from "../lib/palette.js";
import { fetchCommunityStream } from "../lib/community/razielCommunitySeam.js";

// 🧪 הקהילה — SHADOW PREVIEW, INTERNAL ONLY. G3 Community Core 2029 Phase 2
// (work_log dd097ffa-1689-4d97-ad29-b3144c4d38ed, task_key
// G3_COMMUNITY_CORE_2029_PHASE2_SHADOW_V1). Unlinked from any public nav, same pattern as
// ExplorerPreviewPage/EntityHubPreviewPage — a Human-Gate visual review surface, not a live
// route. Must never replace /community/chat or /forum (do_not_touch).
//
// One calm freeform input. Familiar message/reply/reaction language. No Chat/Forum split, no
// intent/type chooser, no research jargon surfaced by default — the classification/extraction
// seam (scripts/g3-community-foundation-runtime/classificationSeam.mjs) and the moderation
// pipeline stay invisible to this view, exactly like the live app's public surfaces today.
//
// The backing RPC (community_stream_projection) is defined in the branch-only migration and
// is NOT applied live — this page is expected to render its "not live yet" state until a
// future Phase 3 session applies that migration. That is the intended state of a hidden
// runtime's Shadow Preview, not a bug.
export default function CommunityShadowPreview2029Page() {
  const pal = usePalette();
  const [messages, setMessages] = useState(null);
  const [notLiveYet, setNotLiveYet] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let alive = true;
    fetchCommunityStream({ limit: 20 })
      .then((rows) => { if (alive) setMessages(rows); })
      .catch(() => { if (alive) setNotLiveYet(true); });
    return () => { alive = false; };
  }, []);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: pal.pageBg, color: pal.ink, padding: 24, fontFamily: "inherit" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>הקהילה</h1>
        <p style={{ color: pal.inkSoft, fontSize: 14, marginBottom: 24 }}>
          תצוגה פנימית בלבד — Shadow Preview, לא מקושרת מהניווט הציבורי.
        </p>

        <div style={{ background: pal.card, border: `1px solid ${pal.border}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="מה עובר לך בראש?"
            rows={2}
            style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: pal.ink, resize: "none", fontSize: 16 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              disabled
              title="Shadow Preview — קלט לתצוגה בלבד, אינו כותב לשום מקום"
              style={{ background: pal.accentBtn, color: pal.onAccent, border: "none", borderRadius: 999, padding: "8px 20px", fontWeight: 600, opacity: 0.6, cursor: "not-allowed" }}
            >
              שלח
            </button>
          </div>
        </div>

        {notLiveYet && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>
            הריצה החיה (community_stream_projection) עדיין לא הוחלה — זהו branch-only preview.
          </div>
        )}

        {!notLiveYet && messages === null && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>טוען…</div>
        )}

        {!notLiveYet && messages !== null && messages.length === 0 && (
          <div style={{ color: pal.inkSoft, fontSize: 14, textAlign: "center", padding: 24 }}>אין עדיין הודעות.</div>
        )}

        {!notLiveYet && messages && messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ background: pal.cardSoft, border: `1px solid ${pal.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.author_display_name || "אורח"}</div>
                <div style={{ color: pal.inkSoft, fontSize: 15 }}>{m.body}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 13, color: pal.accentDim }}>
                  <span>💬 השב</span>
                  <span>♥ {(m.reactions && m.reactions.likes) || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
