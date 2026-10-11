// Compact ratings of a convergence card: quality stars, convergence strength and Gold/Diamond marks.
// Three DIFFERENT measures from existing data, shown separately and explained on demand (small "?" panel).
// Missing data is shown as "not rated" / "no data", never as zero. Tiers are looked up from the existing
// convergence_meter() reader and are never derived from the other two (golden_entity_law v4).
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { qualityStars, strengthValue, tierLookupNumbers } from "../../lib/ratings2029.js";
import { fetchNumberTierSignals } from "../../lib/research/numberTierSignals.js";
import "./convergenceRatings2029.css";

const starsText = (n) => "★".repeat(n) + "☆".repeat(5 - n);

export default function ConvergenceRatings2029({ quality, meterScore, highlightNumbers, numbers, autoTiers = false, popover = false, className = "" }) {
  const q = qualityStars(quality);
  const s = strengthValue(meterScore);
  const lookup = useMemo(() => tierLookupNumbers(highlightNumbers, numbers), [highlightNumbers, numbers]);
  const lookupKey = lookup.join(",");
  const [open, setOpen] = useState(false);
  const [tiers, setTiers] = useState(null);
  const panelId = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const onDown = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  useEffect(() => {
    if (tiers || !lookup.length || !(autoTiers || open)) return undefined;
    let live = true;
    fetchNumberTierSignals(lookup).then((result) => { if (live) setTiers(result); });
    return () => { live = false; };
  }, [lookupKey, autoTiers, open, tiers]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasTier = tiers?.loaded && ((tiers.diamond || 0) > 0 || (tiers.gold || 0) > 0);
  const numberList = lookup.join(" · ");

  return <div ref={rootRef} className={`k29-rate${popover ? " is-popover" : ""} ${className}`.trim()} data-ratings="convergence">
    <ul className="k29-rate-row" aria-label="מדדי הכרטיס">
      <li className="k29-rate-q">
        <span className="k29-rate-l">איכות</span>
        {q.state === "rated"
          ? <span className="k29-stars" role="img" aria-label={`דירוג איכות ${q.stars} מתוך 5`}>{starsText(q.stars)}</span>
          : <span className="k29-rate-na">{q.state === "invalid" ? "ערך לא תקין" : "לא דורג"}</span>}
      </li>
      <li className="k29-rate-s">
        <span className="k29-rate-l">חוזק</span>
        {s.state === "known"
          ? <><span className="k29-rate-bar" aria-hidden="true"><i style={{ inlineSize: `${s.value}%` }} /></span><b className="k29-rate-v" aria-label={`חוזק התכנסות ${s.value} מתוך 100`}>{s.value}</b></>
          : <span className="k29-rate-na">אין נתון</span>}
      </li>
      {hasTier ? <li className="k29-rate-t">
        {tiers.diamond > 0 ? <span className="k29-tier is-diamond" title="ביטויי יהלום שסומנו ידנית"><i aria-hidden="true">◆</i><b>{tiers.diamond}</b> יהלום</span> : null}
        {tiers.gold > 0 ? <span className="k29-tier is-gold" title="ביטויי זהב שסומנו ידנית"><i aria-hidden="true">●</i><b>{tiers.gold}</b> זהב</span> : null}
      </li> : null}
      <li className="k29-rate-help"><button type="button" className="k29-rate-i" aria-expanded={open} aria-controls={panelId} aria-label="מה המדדים האלה אומרים?" onClick={() => setOpen((value) => !value)}>?</button></li>
    </ul>
    {open ? <div id={panelId} className="k29-rate-explain" role="region" aria-label="הסבר על המדדים">
      <dl>
        <dt><span className="k29-stars" aria-hidden="true">★</span> איכות</dt>
        <dd>דירוג ידני של הכרטיס (0–10, מוצג כ־5 כוכבים). נקבע בכרטיס עצמו ולא מחושב. "לא דורג" פירושו שלא הוזן דירוג. מקור: שדה האיכות של כרטיס הנושא.</dd>
        <dt><span className="k29-rate-bar" aria-hidden="true"><i style={{ inlineSize: "60%" }} /></span> חוזק התכנסות</dt>
        <dd>מד ההתכנסות הקיים, ציון 0–100 שנשמר בכרטיס: כמה שכבות בלתי־תלויות מסכימות על המספר (ביטויים, שיטות, אשכול באותו עולם, ישות מסומנת, גלריות, גרף, חדשות, כרטיס ועוגן קדוש). הוא לא הוכחה ולא אימות. הפירוק לרכיבים (קשר לזמן, פסוק או מקור מדויק, מקורות עצמאיים) עדיין לא מחושב, ולכן חסר כאן.</dd>
        <dt><span className="k29-tier is-diamond"><i aria-hidden="true">◆</i></span> <span className="k29-tier is-gold"><i aria-hidden="true">●</i></span> זהב ויהלום</dt>
        <dd>ביטויים שסומנו ידנית במערכת כי לה׳ המלוכה, שערכם שווה למספרי הכרטיס{numberList ? ` (${numberList})` : ""}. הסימון אינו נגזר מהכוכבים או מהחוזק. מקור: מנוע ההתכנסות הקיים.
          {!lookup.length ? " לכרטיס אין מספר לבדיקה." : tiers === null ? " בודק…" : !tiers.loaded ? " לא התקבל מידע כרגע." : hasTier ? "" : " לא נמצאו ביטויי זהב או יהלום למספרים האלה."}
          {tiers?.anchors?.length ? <> עוגן קדוש (רשימה נפרדת, לא יהלום): {tiers.anchors.join(" · ")}.</> : null}</dd>
        <dt><span className="k29-num is-l1">14</span> <span className="k29-num is-l2">9</span> מספרי הכרטיס</dt>
        <dd>מספר בולט (מסגרת מלאה) הוא מספר שסומן כבולט בכרטיס. מספר רגיל (מסגרת מקווקווה) הוא שאר מספרי הכרטיס. הבולטים מופיעים קודם.</dd>
      </dl>
    </div> : null}
  </div>;
}
