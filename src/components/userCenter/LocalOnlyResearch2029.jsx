import React, { useCallback, useEffect, useState } from "react";

const BUCKET = { library: "שמורים", cart: "סל מחקר", pinned: "מוצמדים" };

// Items this device holds that the account does not. Listing is read-only; syncing needs an explicit click per item
// (or on "all"), and nothing here deletes anything.
export default function LocalOnlyResearch2029({ research }) {
  const [items, setItems] = useState([]), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const refresh = useCallback(() => {
    Promise.resolve(research.localOnlyResearch?.('list')).then(rows => setItems(Array.isArray(rows) ? rows : []), () => setItems([]));
  }, [research.localOnlyResearch]);
  useEffect(refresh, [refresh, research.saved, research.cart, research.pinned, research.syncStatus]);
  if (!items.length) return null;
  const confirm = (ids) => {
    if (busy) return;
    setBusy(true); setNotice("שולח לאישור בחשבון…");
    Promise.resolve(research.localOnlyResearch?.('confirm', { confirm: true, ids })).then(
      count => { setBusy(false); setNotice(count ? "הפריטים נוספו לתור הסנכרון ויאושרו על ידי השרת." : "לא ניתן להתחיל סנכרון כרגע. הפריטים נשארו במכשיר."); refresh(); },
      () => { setBusy(false); setNotice("לא ניתן להתחיל סנכרון כרגע. הפריטים נשארו במכשיר."); });
  };
  return <section aria-label="פריטים שנמצאים רק במכשיר" data-local-only-research="true" style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12, margin: "12px 0", maxWidth: "100%" }}>
    <strong>יש {items.length} פריטים במכשיר הזה שלא אושרו בחשבון</strong>
    <p style={{ margin: "4px 0 8px" }}>הם לא נמחקו ולא נשלחו. אפשר לבדוק כל פריט ולאשר סנכרון לחשבון.</p>
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map(row => <li key={row.id} style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span>{row.entity.title || row.entity.ref} · {BUCKET[row.bucket] || row.bucket} · לא נמצא בחשבון</span>
        <button type="button" disabled={busy} onClick={() => confirm([row.id])}>אישור סנכרון</button>
      </li>)}
    </ul>
    {items.length > 1 ? <button type="button" disabled={busy} onClick={() => confirm(undefined)} style={{ marginTop: 8 }}>אישור סנכרון לכולם</button> : null}
    {notice ? <small role="status" style={{ display: "block", marginTop: 6 }}>{notice}</small> : null}
  </section>;
}
