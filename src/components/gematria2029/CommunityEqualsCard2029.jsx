import React, { useEffect, useMemo, useState } from "react";
import ShareActions from "../ShareActions.jsx";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";
import { communityEqualsSelection, communityEqualsChosen, communityEqualsShareText, communityPairShareText } from "../../lib/research/communityCalculatorEquals2029.js";
import { FINDING_NOT_SENT, findingCardUrl } from "../../lib/share.js";
import { getNumberLookup } from "../../lib/supabaseApi2029.js";
import { collectVerifiedLookupMatches } from "../../lib/research/methodLensProjection.js";
import { pickEqualsPreview } from "../../lib/research/equalsPreview.js";
import { buildCalculatorShareUrl, makeCalculatorShareId } from "../../lib/research/calculator2029Viral.js";
import { useMethodLedger } from "../../lib/research/useCalculatorRow.js";
import { emit } from "../../lib/events.js";

// The existing same-method reader, as the professional calculator uses it: ONE verified lookup for the value, kept to the chosen method.
// Read 650 ms after the value settles (the calculator's own settle time); a newer value drops an older answer.
function useSameMethodMatches(name, methodKey, value) {
  const [packet, setPacket] = useState({ key: "", rows: null });
  const key = name && methodKey && Number.isFinite(Number(value)) ? JSON.stringify([name, methodKey, Number(value)]) : "";
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      getNumberLookup(Number(value)).then(rows => { if (alive) setPacket({ key, rows: Array.isArray(rows) ? rows : [] }); })
        .catch(() => { if (alive) setPacket({ key, rows: [] }); });
    }, 650);
    return () => { alive = false; clearTimeout(timer); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => {
    if (!key || packet.key !== key) return { ready: false, items: [] };
    const matches = collectVerifiedLookupMatches(packet.rows, { expression: name, methodKey, value: Number(value) });
    return { ready: true, items: pickEqualsPreview(matches, { expression: name, limit: 24 }).items };
  }, [key, packet]); // eslint-disable-line react-hooks/exhaustive-deps
}

// "למי אתם שווים?" (ZURIEL 20.11.2026): right under the result. The name, its value and its method; up to three published, verified phrases
// that share that value in the same method (more on request); the visitor picks the one that goes on the card, sees exactly what is sent, and
// sends it. The link is the site's existing calculator share link: it opens the same expression, method and match for a guest, on the page
// that already invites the recipient to calculate a name of their own, and that already measures the opening and the recipient's own
// calculation (shared_result_opened, new_compute_from_share). The share itself is the existing share_created event, without the typed text.
// With no match the card shows the calculation and its letters instead. The card is for one name; a comparison keeps its own result.
// `pair` = { first, second }: the same card for two names together. `name` is then the pair's expression (the two names with a space), whose
// regular value is the sum; the heading and the share text speak of the two names.
export default function CommunityEqualsCard2029({ name, row, NumberLink, pair = null }) {
  const methodKey = row.key, value = row.value, methodLabel = canonicalMethodPublicLabel(methodKey);
  const matches = useSameMethodMatches(name, methodKey, value);
  const selection = useMemo(() => communityEqualsSelection(matches.items, name), [matches.items, name]);
  const [picked, setPicked] = useState("");
  const [showMore, setShowMore] = useState(false);
  const chosen = communityEqualsChosen(selection, picked);
  const shown = showMore ? [...selection.top, ...selection.more] : chosen && !selection.top.includes(chosen) ? [...selection.top, chosen] : selection.top;
  const ledger = useMethodLedger(matches.ready && !selection.total ? { expression: name, methodKey } : null);
  const steps = ledger?.ledger?.steps || [];
  const shareId = useMemo(() => makeCalculatorShareId(), [name, methodKey, value, chosen?.phrase]); // eslint-disable-line react-hooks/exhaustive-deps
  const origin = typeof window === "undefined" ? "https://sod1820.co.il" : window.location.origin;
  const shareUrl = buildCalculatorShareUrl({ expression: name, methodKey, resultValue: value },
    { discovery: chosen ? { phrase: chosen.phrase, value } : null, shareId,
      baseUrl: origin + (import.meta.env?.VITE_PUBLIC_READING_RELEASE === "public-reading-20261101" ? "/gematria" : "/2029/gematria/viral") });
  const text = pair ? communityPairShareText({ first: pair.first, second: pair.second, value, phrase: chosen?.phrase })
    : communityEqualsShareText({ name, value, phrase: chosen?.phrase, methodKey, methodLabel });
  if (!text || !shareUrl) return null;
  let shownUrl = shareUrl; try { shownUrl = decodeURI(shareUrl).replace(/^https?:\/\//, ""); } catch { /* keep the encoded form */ }
  return <section className="sod29-community-calc-panel sod29-community-calc-equals" aria-labelledby="community-calculator-equals"
    data-community-equals={matches.ready ? selection.total : "loading"} data-equals-method={methodKey} aria-busy={!matches.ready}>
    <span className="sod29-community-calc-eyebrow">{pair ? "מה אתם שווים ביחד?" : "למי אתם שווים?"}</span>
    <h2 id="community-calculator-equals" dir="auto">{pair ? `${pair.first} + ${pair.second}` : name} = <span className="sod29-community-calc-number">{value}</span></h2>
    <p className="sod29-community-calc-equals-method">{pair ? "סכום שני השמות בגימטריה רגילה" : `בשיטת ${methodLabel}`}</p>
    {!matches.ready ? <p role="status">בודק אילו ביטויים מאומתים שווים לאותו ערך…</p>
      : selection.total ? <>
        <p id="community-calculator-equals-pick">{selection.total === 1 ? "אותו ערך, באותה שיטה, כמו:" : "אותו ערך, באותה שיטה. בחרו מה יופיע בכרטיס:"}</p>
        <div className="sod29-community-calc-equals-list" role="radiogroup" aria-labelledby="community-calculator-equals-pick">
          {shown.map(item => <button type="button" role="radio" key={item.phrase} aria-checked={item === chosen} dir="auto" onClick={() => setPicked(item.phrase)}>{item.phrase}</button>)}
        </div>
        {selection.more.length > 0 && <button type="button" className="sod29-community-calc-text-button" aria-expanded={showMore} onClick={() => setShowMore(open => !open)}>
          {showMore ? "פחות התאמות" : `עוד ${selection.more.length} התאמות`}
        </button>}
      </> : <>
        <p>עדיין אין במאגר ביטוי מאומת שווה לערך הזה בשיטה הזו. זה החישוב עצמו:</p>
        <div className="sod29-community-calc-equals-letters" aria-label="פירוק האותיות מהמנוע" aria-busy={Boolean(ledger?.loading)}>
          {steps.map((step, index) => <span key={step.token + ":" + index}><b>{step.token}</b><i className="sod29-community-calc-number">{step.value}</i></span>)}
        </div>
      </>}
    <NumberLink value={value} expression={name} method={methodKey} className="sod29-community-calc-text-button">פסוקים, פוסטים ומקורות בערך {value} ←</NumberLink>
    <div className="sod29-community-calc-equals-share">
      <strong>שלחו את זה הלאה</strong>
      <blockquote className="sod29-community-calc-equals-preview" data-share-preview dir="auto" aria-label="כך זה יישלח">
        <span>{text}</span><small dir="ltr">{shownUrl}</small>
      </blockquote>
      <ShareActions variant="royal" type="gematria_result" sourceSurface="community-calculator" url={shareUrl} title={text} channels={["whatsapp", "native", "copy"]} force
        image={findingCardUrl({ kind: "calc", expression: name, value, method: methodKey === "רגיל" ? "גימטריה רגילה" : `שיטה: ${methodLabel}`, context: chosen ? `כמו ${chosen.phrase}` : "" })}
        onShare={channel => emit("calculator_2029", "share_created", { props: { surface: "community", method: methodKey, share_id: shareId, channel, has_match: Boolean(chosen), mode: pair ? "pair" : "single", expression_length: name.length } })} />
      <p className="sod29-community-calc-equals-sent" data-share-disclosure="community-equals">יישלח: {pair ? "שני השמות שהקלדתם, הסכום" : "השם שהקלדתם, השיטה, הערך"}{chosen ? " וההתאמה שבחרתם" : ""}, וקישור שפותח אותם. {FINDING_NOT_SENT}</p>
    </div>
  </section>;
}
