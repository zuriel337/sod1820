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
  const [space, setSpace] = useState({ count: 0, bytes: 0 });
  const checkSpace = useCallback(() => {
    Promise.resolve(research.localOnlyResearch?.('reclaim')).then(r => setSpace(r && r.count ? r : { count: 0, bytes: 0 }), () => setSpace({ count: 0, bytes: 0 }));
  }, [research.localOnlyResearch]);
  useEffect(checkSpace, [checkSpace, research.syncStatus]);
  const freeSpace = () => {
    if (busy) return;
    setBusy(true);
    Promise.resolve(research.localOnlyResearch?.('reclaim', { confirm: true })).then(
      r => { setBusy(false); setNotice(r?.error ? `הפינוי נעצר: ${r.count || 0} יומנים פסיביים פונו, אך ארכיון ההתאוששות לא נשמר. אין למחוק נתוני אתר או אפליקציה.` : r?.count ? `פונו כ־${Math.round(r.bytes / 1024)}KB מיומנים פסיביים. אפשר לנסות לשמור שוב.` : "לא נמצא יומן בטוח לפינוי."); checkSpace(); },
      () => { setBusy(false); setNotice("הפינוי לא הושלם. שום דבר לא נמחק."); });
  };
  const spaceBox = space.count ? <section aria-label="פינוי מקום במכשיר" data-reclaim-space="true" style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12, margin: "12px 0", maxWidth: "100%" }}>
    <strong>האחסון במכשיר הזה מתמלא ביומני היסטוריה ישנים ({Math.round(space.bytes / 1024)}KB)</strong>
    <p style={{ margin: "4px 0 8px" }}>פינוי ידני של יומנים פסיביים ישנים בלבד. עד 100 פריטי ההיסטוריה האחרונים מועתקים לארכיון התאוששות; היסטוריה ישנה יותר מהיומנים הללו עשויה להצטמצם. שמורים, סל, נעיצות, אוספים, מסעות ופעולות שממתינות לאישור אינם נמחקים.</p>
    <button type="button" disabled={busy} onClick={freeSpace}>פנה מקום</button>
    {notice ? <small role="status" style={{ display: "block", marginTop: 6 }}>{notice}</small> : null}
  </section> : null;
  if (!items.length) return spaceBox;
  const confirm = (ids) => {
    if (busy) return;
    setBusy(true); setNotice("שולח לאישור בחשבון…");
    Promise.resolve(research.localOnlyResearch?.('confirm', { confirm: true, ids })).then(
      count => { setBusy(false); setNotice(count ? "הפריטים נוספו לתור הסנכרון ויאושרו על ידי השרת." : "לא ניתן להתחיל סנכרון כרגע. הפריטים נשארו במכשיר."); refresh(); },
      () => { setBusy(false); setNotice("לא ניתן להתחיל סנכרון כרגע. הפריטים נשארו במכשיר."); });
  };
  return <>{spaceBox}<section aria-label="פריטים שנמצאים רק במכשיר" data-local-only-research="true" style={{ border: "1px solid currentColor", borderRadius: 12, padding: 12, margin: "12px 0", maxWidth: "100%" }}>
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
  </section></>;
}
