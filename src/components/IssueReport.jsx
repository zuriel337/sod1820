import React, { useCallback, useMemo, useRef, useState } from "react";
import { track } from "../lib/tracking.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { newInteractionId } from "../lib/research/interactionCorrelation.js";

// IssueReport — the single canonical "something is wrong here" primitive (canonical_ui_components_law).
// It only EMITS event_type=issue_report through the existing telemetry seam (track → visitor_events +
// events dual-write). It owns no store, no route and never writes system_suggestions: the Reliability
// detector consumes the event. No attachments in this slice.

export const ISSUE_REPORT_EVENT = "issue_report";
export const ISSUE_REPORT_SECTION = "issue_report";
export const ISSUE_REPORT_MAX_TEXT = 500;
export const ISSUE_REPORT_MAX_KEY = 64;

const KEY_RE = /[^a-zA-Z0-9_.:-]/g;

const boundKey = (value) => {
  const text = String(value ?? "").replace(KEY_RE, "").slice(0, ISSUE_REPORT_MAX_KEY);
  return text || null;
};

export const boundIssueText = (value) =>
  String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, ISSUE_REPORT_MAX_TEXT);

export function viewportClass(width) {
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return "unknown";
  if (w < 640) return "phone";
  if (w < 1024) return "tablet";
  return "desktop";
}

// Pure + bounded: path without query/hash, no URLs/emails/ids beyond an opaque correlation UUID.
export function buildIssueReportContext({
  pathname = null,
  surface = null,
  capability = null,
  locale = null,
  width = null,
  signedIn = false,
  isAdmin = false,
  interactionId = null,
  now = new Date(),
} = {}) {
  const path = String(pathname ?? "").split(/[?#]/)[0].slice(0, 200) || null;
  return {
    path,
    surface: boundKey(surface),
    capability: boundKey(capability),
    at: now instanceof Date && !Number.isNaN(now.getTime()) ? now.toISOString() : null,
    locale: boundKey(locale),
    viewport: viewportClass(width),
    auth: isAdmin ? "admin" : signedIn ? "registered" : "anonymous",
    interaction_id: interactionId || null,
  };
}

export function buildIssueReportPayload(context, text) {
  const note = boundIssueText(text);
  return { ...context, ...(note ? { message: note } : {}) };
}

export function emitIssueReport(context, text) {
  const payload = buildIssueReportPayload(context, text);
  track(ISSUE_REPORT_SECTION, context?.surface ?? null, ISSUE_REPORT_EVENT, payload);
  return payload;
}

export default function IssueReport({ pathname, surface = null, capability = null, locale = null, onDone, initialText = "" }) {
  const { user, isAdmin } = useAuth() || {};
  const [text, setText] = useState(() => boundIssueText(initialText));
  const [sent, setSent] = useState(false);
  const sentRef = useRef(false);

  const context = useMemo(() => buildIssueReportContext({
    pathname,
    surface,
    capability,
    locale: locale || (typeof navigator !== "undefined" ? navigator.language : null),
    width: typeof window !== "undefined" ? window.innerWidth : null,
    signedIn: Boolean(user),
    isAdmin: Boolean(isAdmin),
    interactionId: newInteractionId(),
  }), [pathname, surface, capability, locale, user, isAdmin]);

  const submit = useCallback((event) => {
    event.preventDefault();
    if (sentRef.current) return;
    sentRef.current = true;
    emitIssueReport(context, text);
    setSent(true);
  }, [context, text]);

  if (sent) {
    return (
      <section className="sod29-frame-state state-empty" role="status" data-issue-report-state="sent">
        <span className="sod29-frame-state-icon" aria-hidden="true">✓</span>
        <div>
          <strong>תודה, הדיווח נשלח</strong>
          <div>הוא מגיע לבדיקה יחד עם המקום שבו היית.</div>
        </div>
        {onDone ? <button className="sod29-action" type="button" onClick={onDone}>סגור</button> : null}
      </section>
    );
  }

  return (
    <form className="sod29-issue-report" data-issue-report="true" onSubmit={submit}>
      <div className="sod29-panel-lead">
        <div className="sod29-kicker">משהו לא עובד?</div>
        <h3>ספר לנו מה קרה.</h3>
        <p>אפשר לשלוח גם בלי לכתוב כלום. נצרף רק את המקום באתר, סוג המסך והשעה, בלי כתובת מלאה ובלי פרטים אישיים.</p>
      </div>
      <label className="sod29-issue-report-field">
        <span>מה ראית? (לא חובה)</span>
        <textarea
          data-autofocus
          value={text}
          maxLength={ISSUE_REPORT_MAX_TEXT}
          rows={4}
          onChange={(event) => setText(event.target.value)}
          aria-describedby="sod29-issue-report-count"
        />
        <small id="sod29-issue-report-count">{text.length}/{ISSUE_REPORT_MAX_TEXT}</small>
      </label>
      <button className="sod29-action primary" type="submit">שלח דיווח</button>
    </form>
  );
}
