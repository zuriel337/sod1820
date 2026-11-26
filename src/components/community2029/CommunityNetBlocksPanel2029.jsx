import React, { useCallback, useEffect, useState } from "react";
import { NET_BLOCK_DURATIONS, NET_BLOCK_REASON_MAX, blockGuestFromMessage, cleanNetBlockReason, fetchNetBlocks, fetchRecentGuestMessages, hideGuestMessage, liftNetBlock, netBlockErrorMessage, netBlockReasonValid, netBlocksUnavailable } from "../../lib/community/communityNetBlocksApi.js";
import "../experience2029/royal2029.css";

// Staff-only management of repeated guest harassment (ZURIEL 26.11.2026). Loaded lazily and mounted for moderators alone, so no visitor and no search engine
// ever downloads it. It stays out of the page until the server confirms the feature (the RPCs exist only after the approved SQL is applied).
// Two SEPARATE actions per message: "הסתרת הודעה" and "חסימת כתיבה". Neither shows or asks for a network address; permanent blocks are shown as disabled.
// Design V2 §14: Royal family only (.r29-btn, .r29-check-group / .r29-check), 44px targets, no local colour, size or shadow; pending-panel classes are reused.
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

function MessageRow({ item, form, busy, onOpen, onClose, onChangeForm, onHide, onBlock }) {
  const open = form?.id === item.id ? form : null;
  const rid = `netblock-reason-${item.id}`;
  return <li data-recent-guest={item.id}>
    <span className="sod29-community-pending-line" dir="auto"><strong className="sod29-community-pending-author">{item.authorName}</strong> {item.body || "(ללא טקסט)"}
      {item.status === "hidden" ? <em> · מוסתרת</em> : null}{item.networkBlocked ? <em> · הרשת חסומה</em> : null}</span>
    <span className="sod29-community-pending-actions">
      {item.status === "hidden" ? null : <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={() => onOpen(item.id, "hide")}>הסתרת הודעה</button>}
      {item.networkBlocked ? null : item.canBlock
        ? <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={() => onOpen(item.id, "block")}>חסימת כתיבה</button>
        : <small>הודעה ישנה: אי אפשר לחסום לפיה</small>}
    </span>
    {open ? <div className="sod29-community-netblocks-form" role="group" aria-label={open.kind === "hide" ? "הסתרת הודעה" : "חסימת כתיבה לאורחים מהרשת של ההודעה"}>
      {open.kind === "block" ? <>
        <p>החסימה חלה על כתיבה כאורח בלבד (הודעות ותגובות), לא על קריאה ולא על משתמשים רשומים. ההודעה עצמה לא תוסתר: זו פעולה נפרדת.</p>
        <div className="r29-check-group" role="radiogroup" aria-label="משך החסימה">
          {NET_BLOCK_DURATIONS.map(duration => <button key={duration.id} type="button" className="r29-check" role="radio" aria-checked={open.duration === duration.id} onClick={() => onChangeForm({ duration: duration.id })}>
            <span className="r29-check-box" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
            <span>{duration.label}</span>
          </button>)}
          <p className="r29-check-note">חסימה לצמיתות מושבתת עד לאימות זהות הבעלים ולאישור מפורש.</p>
        </div>
      </> : <p>ההודעה תוסתר מהציבור. הרשת לא תיחסם: זו פעולה נפרדת.</p>}
      <ReasonField id={rid} value={open.reason} onChange={reason => onChangeForm({ reason })} disabled={busy} />
      {open.error ? <p role="alert">{open.error}</p> : null}
      <span className="sod29-community-netblocks-buttons">
        <button type="button" className="r29-btn is-primary" disabled={busy || !netBlockReasonValid(open.reason) || (open.kind === "block" && !open.duration)} aria-busy={busy || undefined}
          onClick={() => (open.kind === "hide" ? onHide(item.id) : onBlock(item.id))}>{busy ? "מבצע…" : open.kind === "hide" ? "הסתר הודעה" : "חסום כתיבה"}</button>
        <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={onClose}>ביטול</button>
      </span>
    </div> : null}
  </li>;
}

function BlockRow({ block, busy, lift, onOpenLift, onChangeLift, onCloseLift, onLift }) {
  const open = lift?.id === block.id ? lift : null;
  const rid = `netblock-lift-${block.id}`;
  return <li data-net-block={block.id}>
    <span className="sod29-community-pending-line" dir="auto"><strong className="sod29-community-pending-author">{DURATION_LABEL[block.duration] || block.duration}</strong> · {STATE_LABEL[block.state] || block.state}
      {block.expiresAt && block.state === "active" ? <> · עד {when(block.expiresAt)}</> : null} · {block.by || "צוות"} · {when(block.createdAt)} · {block.linkedMessages} הודעות · {block.reason}
      {block.state === "lifted" && block.liftReason ? <> · בוטלה: {block.liftReason}</> : null}</span>
    {block.state === "active" ? <span className="sod29-community-pending-actions">
      <button type="button" className="r29-btn is-quiet" disabled={busy} onClick={() => onOpenLift(block.id)}>ביטול חסימה</button>
    </span> : null}
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

// `seed` is for tests only: it renders a given state without the network.
export default function CommunityNetBlocksPanel2029({ onChanged, seed = null }) {
  const [available, setAvailable] = useState(seed?.available ?? null);
  const [open, setOpen] = useState(seed?.open ?? false);
  const [recent, setRecent] = useState(seed?.recent ?? []);
  const [blocks, setBlocks] = useState(seed?.blocks ?? []);
  const [form, setForm] = useState(seed?.form ?? null);
  const [lift, setLift] = useState(seed?.lift ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try { const [r, b] = await Promise.all([fetchRecentGuestMessages({ limit: 30 }), fetchNetBlocks({ includeEnded: true, limit: 30 })]); setRecent(r); setBlocks(b); setAvailable(true); }
    catch (error) { if (netBlocksUnavailable(error)) setAvailable(false); else setNotice("הרשימה לא נטענה. אפשר לנסות שוב."); }
  }, []);
  useEffect(() => { if (!seed) load(); }, [load, seed]);
  const act = useCallback(async (run, doneNotice, setError) => {
    setBusy(true);
    try { await run(); setNotice(doneNotice); setForm(null); setLift(null); await load(); onChanged?.(); }
    catch (error) { setError(netBlockErrorMessage(error)); }
    finally { setBusy(false); }
  }, [load, onChanged]);
  if (!available) return null;
  const active = blocks.filter(block => block.state === "active").length;
  return <section className="sod29-community-pending-panel" aria-label="ניהול הטרדות אורחים" data-net-blocks-panel>
    <button type="button" className="sod29-community-pending-toggle" aria-expanded={open} aria-controls="community-net-blocks-body" onClick={() => setOpen(value => !value)}>
      <span>ניהול הטרדות אורחים · {active} חסימות פעילות</span> <span aria-hidden="true">{open ? "▴" : "▾"}</span>
    </button>
    {open ? <div id="community-net-blocks-body" className="sod29-community-netblocks-body">
      <p role="status" aria-live="polite">{notice}</p>
      <h3>הודעות אורח אחרונות</h3>
      <ul>{recent.length ? recent.map(item => <MessageRow key={item.id} item={item} form={form} busy={busy}
        onOpen={(id, kind) => setForm({ id, kind, duration: "", reason: "", error: "" })} onClose={() => setForm(null)} onChangeForm={patch => setForm(current => ({ ...current, ...patch, error: "" }))}
        onHide={id => act(() => hideGuestMessage({ messageId: id, reason: form.reason }), "ההודעה הוסתרה.", error => setForm(current => ({ ...current, error })))}
        onBlock={id => act(() => blockGuestFromMessage({ messageId: id, duration: form.duration, reason: form.reason }), "הכתיבה נחסמה.", error => setForm(current => ({ ...current, error })))} />) : <li>אין הודעות אורח ב־14 הימים האחרונים.</li>}</ul>
      <h3>חסימות</h3>
      <ul>{blocks.length ? blocks.map(block => <BlockRow key={block.id} block={block} busy={busy} lift={lift}
        onOpenLift={id => setLift({ id, reason: "", error: "" })} onCloseLift={() => setLift(null)} onChangeLift={patch => setLift(current => ({ ...current, ...patch, error: "" }))}
        onLift={id => act(() => liftNetBlock({ blockId: id, reason: lift.reason }), "החסימה בוטלה.", error => setLift(current => ({ ...current, error })))} />) : <li>אין חסימות.</li>}</ul>
      <p className="r29-check-note">חסימה לצמיתות מושבתת עד לאימות זהות הבעלים ולאישור מפורש. כתובות רשת אינן מוצגות לצוות.</p>
    </div> : null}
  </section>;
}
