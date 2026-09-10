import React from "react";
import { Link, useLocation } from "react-router-dom";

const CIPHER_URL = "/צופן-מדהים-בתורה-הקדושה";
const HEICHAL_ROUTES = [/^\/research/, /^\/beit-midrash/, /^\/code/, /^\/heichal/];

export default function SeasonalRoshHashanaHero({ compact = false }) {
  const { pathname } = useLocation();
  if (HEICHAL_ROUTES.some((re) => re.test(pathname))) return null;

  return (
    <div className={`seasonal-rh-hero${compact ? " compact" : ""}`}>
      <Link to={CIPHER_URL} aria-label="פתח את הצופן המלא — אשלים מלאכה התשפ״ו">
        <img
          src="/home-rosh-hashana-5787.jpg?v=2"
          alt="כי לה׳ המלוכה — הדור החדש · אשלים מלאכה התשפ״ו · ראש השנה תשפ״ז"
          decoding="async"
          loading={compact ? "lazy" : "eager"}
          fetchPriority={compact ? "auto" : "high"}
        />
      </Link>
    </div>
  );
}
