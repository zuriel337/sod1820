import React, { useCallback, useEffect, useState } from "react";
import { NET_BLOCK_DURATIONS, NET_BLOCK_REASON_MAX, blockGuestFromMessage, cleanNetBlockReason, fetchNetBlocks, hideGuestMessage, liftNetBlock, netBlockErrorMessage, netBlockReasonValid, netBlocksUnavailable } from "../../lib/community/communityNetBlocksApi.js";
import "../experience2029/royal2029.css";
import "./CommunityNetBlocksPanel2029.css";

// Staff-only management of repeated guest harassment (ZURIEL 26.11.2026, simplified the same day). Loaded lazily for moderators alone, so no visitor and no
// search engine ever downloads it. Two parts, one module (one chunk):
//  - GuestMessageModeration: two compact actions ON the message itself, "הסתרת הודעה" and "חסימת כתיבה" (separate; blocking never hides). Neither shows or asks
//    for a network address; permanent blocks are shown as disabled.
//  - the default export: one collapsed panel listing the ACTIVE blocks, with "ביטול חסימה". It is absent until the server confirms the feature (the RPCs exist only
//    after the approved SQL is applied) and while no block is active.
// Design V2 §14: Royal family only (.r29-btn, .r29-check-group / .r29-check), 44px targets, no local colour, size or shadow.
const DURATION_LABEL = Object.freeze({ h24: "24 שעות", d3: "3 ימים", d7: "7 ימים", permanent: "לצמיתות" });
const STATE_LABEL = Object.freeze({ active: "פעילה", expired: "פגה", lifted: "בוטלה" });
const when = value => { try { return value ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : ""; } catch { return ""; } };

function ReasonField({ id, value, onChange, disabled }) {
  const clean = cleanNetBlockReason(value);
  return <div className="sod29-community-netblocks-reason">
    <label htmlFor={id}>סיבה (חובה, לפחות 10 תווים)</label>
    <textarea id={id} rows={2} maxLength={NET_BLOCK_REASON_MAX} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-count`} />
    <small id={`${id}-count`}>{clean.length}/{NET_BLOCK_REASON_MAX}</small>
  </div>;
}

const newForm = kind => ({ kind, duration: "", reason: "", error: "" });

// Compact moderation on one guest message. `item` comes from community_guest_recent_v1 (status, canBlock, networkBlocked); `unreviewed` messages already show
// "אישור / הסתרה" in the message banner, so only the block action is added there. `seed` is for tests only.
export function GuestMessageModeration({ item, unreviewed = false, onChanged, seed = null }) {
  const [form, setForm] = useState(seed?.form ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const canHide = !unreviewed && item.status !== "hidden";
  const canBlock = !item.networkBlocked && item.canBlock;
  const run = useCallback(async (kind, doneNotice) => {
    setBusy(true);
    try {
      if (kind === "hide") await hideGuestMessage({ messageId: item.id, reason: form.reason });
      else await blockGuestFromMessage({ messageId: item.id, duration: form.duration, reason: form.reason });
      setNotice(doneNotice); setForm(null); onChanged?.();
    } catch (error) { setForm(current => ({ ...current, error: netBlockErrorMessage(error) })); }
    finally { setBusy(false); }
  }, [form, item.id, onChanged]);
  if (!canHide && !canBlock && !notice && !item.networkBlocked) return null;
  const rid = `netblock-reason-${item.id}`;
  return <div className="sod29-community-guest-moderation" data-guest-moderation={item.id}>
    <span className="sod29-community-guest-moderation-actions">
      {canHide ? <button type="button" className="sod29-community-manage-action" disabled={busy} onClick={() => setForm(newForm("hide"))}>הסתרת הודעה</button> : null}
      {canBlock ? <button type="button" className="sod29-community-manage-action" disabled={busy} onClick={() => setForm(newForm("block"))}>חסימת כתיבה</button> : null}
      {item.networkBlocked ? <small>הכתיבה מהרשת הזו חסומה</small> : null}
    </span>
    <p role="status" aria-live="polite" className="sod29-community-sr-only">{notice}</p>
    {form ? <div className="sod29-community-netblocks-form" role="group" aria-label={form.kind === "hide" ? "הסתרת הודעה" : "חסימת כתיבה לאורחים מהרשת של ההודעה"}>
      {form.kind === "block" ? <>
        <p>החסימה חלה על כתיבה כאורח בלבד (הודעות ותגובות), לא על קריאה ולא על משתמשים רשומים. ההודעה עצמה לא תוסתר: זו פעולה נפרדת.</p>
        <div className="r29-check-group" role="radiogroup" aria-label="משך החסימה">
          {NET_BLOCK_DURATIONS.map(duration => <button key={duration.id} type="button" className="r29-check" role="radio" aria-checked={form.duration === duration.id} onClick={() => setForm(current => ({ ...current, duration: duration.id, error: "" }))}>
            <span className="r29-check-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
            <span>{duration.label}</span>
          </button>)}
          <p className="r29-check-note">חסימה לצמיתות מושבתת עד לאימות זהות הבעלים ולאישור מפורש.</p>
        </div>
      </> : <p>ההודעה תוסתר מהציבור. הרשת לא תיחסם: זו פעולה נפרדת.</p>}
      <ReasonField id={rid} value={form.reason} onChange={reason => setForm(current => ({ ...current, reason, error: "" }))} disabled={busy} />
      {form.error ? <p role="alert">{form.error}</p> : null}
      <span className="sod29-community-netblocks-buttons">
        <button type="button" className="r29-btn is-primary" disabled={busy || !netBlockReasonValid(form.reason) || (form.kind === "block" && !form.duration)} aria-busy={busy || undefined}
          onClick={() => run(form.kind, form.kind === "hide" ? "ההודעה הוסתרה." : "הכתיבה נחסמה.")}>{busy ? "מבצע…" : form.kind === "hide" ? "הסתר הודעה" : "חסום כתיבה"}</button>
        <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={() => setForm(null)}>ביטול</button>
      </span>
    </div> : null}
  </div>;
}

function BlockRow({ block, busy, lift, onOpenLift, onChangeLift, onCloseLift, onLift }) {
  const open = lift?.id === block.id ? lift : null;
  const rid = `netblock-lift-${block.id}`;
  return <li data-net-block={block.id}>
    <span className="sod29-community-pending-line" dir="auto"><strong className="sod29-community-pending-author">{DURATION_LABEL[block.duration] || block.duration}</strong>
      {block.expiresAt ? <> · עד {when(block.expiresAt)}</> : null} · {block.by || "צוות"} · {when(block.createdAt)} · {block.linkedMessages} הודעות · {block.reason}</span>
    <span className="sod29-community-pending-actions">
      <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={() => onOpenLift(block.id)}>ביטול חסימה</button>
    </span>
    {open ? <div className="sod29-community-netblocks-form" role="group" aria-label="ביטול חסימה">
      <ReasonField id={rid} value={open.reason} onChange={reason => onChangeLift({ reason })} disabled={busy} />
      {open.error ? <p role="alert">{open.error}</p> : null}
      <span className="sod29-community-netblocks-buttons">
        <button type="button" className="r29-btn is-primary" disabled={busy || !netBlockReasonValid(open.reason)} aria-busy={busy || undefined} onClick={() => onLift(block.id)}>{busy ? "מבצע…" : "בטל חסימה"}</button>
        <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={onCloseLift}>ביטול</button>
      </span>
    </div> : null}
  </li>;
}

// Active blocks only. `version` changes when a block is created elsewhere on the page. `seed` is for tests only.
export default function CommunityNetBlocksPanel2029({ version = 0, onChanged, seed = null }) {
  const [available, setAvailable] = useState(seed?.available ?? null);
  const [open, setOpen] = useState(seed?.open ?? false);
  const [blocks, setBlocks] = useState(seed?.blocks ?? []);
  const [lift, setLift] = useState(seed?.lift ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { const list = await fetchNetBlocks({ includeEnded: false, limit: 30 }); setBlocks(list.filter(block => block.state === "active")); setAvailable(true); }
    catch (error) { if (netBlocksUnavailable(error)) setAvailable(false); else setNotice("הרשימה לא נטענה. אפשר לנסות שוב."); }
  }, []);
  useEffect(() => { if (!seed) load(); }, [load, seed, version]);
  const doLift = useCallback(async id => {
    setBusy(true);
    try { await liftNetBlock({ blockId: id, reason: lift.reason }); setNotice("החסימה בוטלה."); setLift(null); await load(); onChanged?.(); }
    catch (error) { setLift(current => ({ ...current, error: netBlockErrorMessage(error) })); }
    finally { setBusy(false); }
  }, [lift, load, onChanged]);
  if (!available || !blocks.length) return null;
  return <section className="sod29-community-pending-panel" aria-label="ניהול חסימות כתיבה" data-net-blocks-panel>
    <button type="button" className="sod29-community-pending-toggle" aria-expanded={open} aria-controls="community-net-blocks-body" onClick={() => setOpen(value => !value)}>
      <span>חסימות כתיבה פעילות · {blocks.length}</span> <span aria-hidden="true">{open ? "▴" : "▾"}</span>
    </button>
    {open ? <div id="community-net-blocks-body" className="sod29-community-netblocks-body">
      <p role="status" aria-live="polite">{notice}</p>
      <ul>{blocks.map(block => <BlockRow key={block.id} block={block} busy={busy} lift={lift}
        onOpenLift={id => setLift({ id, reason: "", error: "" })} onCloseLift={() => setLift(null)} onChangeLift={patch => setLift(current => ({ ...current, ...patch, error: "" }))} onLift={doLift} />)}</ul>
      <p className="r29-check-note">חסימה לצמיתות מושבתת עד לאימות זהות הבעלים ולאישור מפורש. כתובות רשת אינן מוצגות לצוות.</p>
    </div> : null}
  </section>;
}
