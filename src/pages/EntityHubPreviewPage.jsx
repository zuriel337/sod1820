import React, { useState } from "react";
import { useParams } from "react-router-dom";
import NumberHubPage2029 from "./NumberHubPage2029.jsx";
import NumberCoreMaster2029 from "../components/number/NumberCoreMaster2029.jsx";

// Branch-only master preview.
// ONE semantic core -> full Hub projection + compact NumberDrawer projection.
// The generated concept image is no longer a runtime dependency of the product preview.
export default function EntityHubPreviewPage() {
  const { key } = useParams();
  const number = Number(key);
  const [projection, setProjection] = useState("hub");

  return <div className={`number-master-preview number-master-preview--${projection}`}>
    <style>{`
      .number-master-preview {
        min-height: 100vh;
        background:
          radial-gradient(circle at 50% 0%, rgba(212,175,55,.065), transparent 25%),
          radial-gradient(circle at 86% 12%, rgba(109,76,180,.07), transparent 22%),
          #07050d;
        padding: 12px 0 0;
      }
      .number-master-preview__bar {
        width: min(780px, calc(100% - 24px));
        margin: 0 auto 10px;
        direction: rtl;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        color: #cfc9d6;
        font-family: 'Assistant', Arial, sans-serif;
      }
      .number-master-preview__label {
        font-size: 11px;
        line-height: 1.5;
        opacity: .74;
      }
      .number-master-preview__switch {
        display: inline-flex;
        gap: 3px;
        padding: 3px;
        border: 1px solid rgba(212,175,55,.22);
        border-radius: 999px;
        background: rgba(12,8,24,.76);
      }
      .number-master-preview__switch button {
        border: 0;
        border-radius: 999px;
        padding: 7px 12px;
        cursor: pointer;
        color: #cfc9d6;
        background: transparent;
        font: 800 11px 'Assistant', Arial, sans-serif;
      }
      .number-master-preview__switch button.is-active {
        color: #1a0e00;
        background: linear-gradient(135deg,#d4af37,#f6e27a);
      }
      .number-master-preview__core {
        width: min(780px, calc(100% - 24px));
        margin: 0 auto;
      }
      .number-master-preview--drawer .number-master-preview__core {
        width: min(380px, calc(100% - 24px));
        margin-inline: auto;
      }
      .number-master-preview__drawer-note {
        width: min(380px, calc(100% - 24px));
        margin: 8px auto 0;
        color: #9f98ad;
        text-align: center;
        direction: rtl;
        font: 11px/1.55 'Assistant', Arial, sans-serif;
      }
      .number-master-lower main {
        padding-top: 4px !important;
        background: transparent !important;
      }
      .number-master-lower main > div > section:first-of-type {
        display: none !important;
      }
      @media (max-width: 520px) {
        .number-master-preview { padding-top: 8px; }
        .number-master-preview__bar { margin-bottom: 8px; }
        .number-master-preview__label { max-width: 210px; }
      }
    `}</style>

    <div className="number-master-preview__bar">
      <div className="number-master-preview__label">מאסטר אחד · דף מלא וחלונית משתמשים באותו מבנה ובהיררכיה אחת</div>
      <div className="number-master-preview__switch" aria-label="בדיקת הקרנת דף או חלונית">
        <button type="button" className={projection === "hub" ? "is-active" : ""} onClick={() => setProjection("hub")}>דף מלא</button>
        <button type="button" className={projection === "drawer" ? "is-active" : ""} onClick={() => setProjection("drawer")}>חלונית</button>
      </div>
    </div>

    <div className="number-master-preview__core">
      <NumberCoreMaster2029 number={number} variant={projection} />
    </div>

    {projection === "drawer" && <div className="number-master-preview__drawer-note">זו אותה ליבה בקומפקט — לא מוצר שני. בדף המלא נפתחים מתחתיה כל הסקשנים העמוקים.</div>}

    {projection === "hub" && <div className="number-master-lower">
      <NumberHubPage2029 />
    </div>}
  </div>;
}
