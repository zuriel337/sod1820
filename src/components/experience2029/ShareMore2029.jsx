import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { attributedShareUrl } from "../../lib/share/shareTelemetry.js";
import { communityShareDraft } from "../../lib/community/communityShareHandoff.js";

// Two options inside the ONE share window (ZURIEL 19.11.2026), after the channels:
//   «שתפו בקהילה» — canonical_ui_components_law v8 §§1–7 / v13 §2: an option inside "שתף", never a separate button or system. It opens the
//   EXISTING community composer through its existing draft (the person's own device draft, communityDraft.js) with the source link, which
//   the composer already shows as a source card. Publishing still needs the person's own words (communityShareOwnWords). Not a share
//   channel and no share event: nothing is recorded until the person publishes.
//   «קוד QR» — the same link as a QR code, to continue on a phone; generated on this device only when asked (uqr, loaded on demand).
export default function ShareMore2029({ href, title = "", label = "" }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [qr, setQr] = useState(""), [qrOpen, setQrOpen] = useState(false), [qrFailed, setQrFailed] = useState(false);
  const [communityNote, setCommunityNote] = useState("");
  const qrHref = href ? attributedShareUrl(href, "qr") : "";
  const qrRef = useRef(null);
  useEffect(() => { if (qr && qrOpen) qrRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); }, [qr, qrOpen]);

  useEffect(() => {
    if (!qrOpen || !qrHref) return undefined;
    let live = true;
    setQrFailed(false);
    import("uqr").then(({ renderSVG }) => { if (live) setQr(renderSVG(qrHref, { ecc: "M", border: 2 })); }).catch(() => { if (live) setQrFailed(true); });
    return () => { live = false; };
  }, [qrOpen, qrHref]);

  if (!href) return null;
  const toCommunity = () => {
    const result = communityShareDraft({ auth, href, title });
    if (!result.ok) { setCommunityNote(result.message); return; }
    navigate("/community/chat");
  };

  return <div className="r29-share-more" data-share-more="true">
    <div className="r29-share-more-row">
      <button type="button" className="r29-btn is-quiet" data-action="community" onClick={toCommunity}
        aria-describedby="r29-share-community-hint"><span className="r29-btn-icon" aria-hidden="true"><NavigationIcon2029 name="community" /></span>שתפו בקהילה</button>
      <button type="button" className="r29-btn is-quiet" data-action="qr" aria-expanded={qrOpen} aria-controls="r29-share-qr"
        onClick={() => setQrOpen(open => !open)}><span className="r29-btn-icon r29-qr-glyph" aria-hidden="true">▦</span>{qrOpen ? "הסתרת הקוד" : "קוד QR"}</button>
    </div>
    <p id="r29-share-community-hint" className="r29-share-hint">{communityNote || `בקהילה מצרפים את ${label || "הקישור"} וכותבים כמה מילים משלכם לפני הפרסום.`}</p>
    {qrOpen ? <figure ref={qrRef} id="r29-share-qr" className="r29-share-qr" data-share-qr={qr ? "ready" : qrFailed ? "failed" : "loading"}>
      {qr ? <div className="r29-share-qr-code" role="img" aria-label={`קוד QR לקישור ${title || href}`} dangerouslySetInnerHTML={{ __html: qr }} />
        : qrFailed ? <p role="alert">לא הצלחנו ליצור את הקוד. אפשר להעתיק את הקישור.</p>
        : <p role="status">יוצר קוד…</p>}
      <figcaption>סרקו במצלמת הטלפון כדי לפתוח את {label || "העמוד"} שם</figcaption>
    </figure> : null}
  </div>;
}
