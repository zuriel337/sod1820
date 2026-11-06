import React from "react";
import { Link } from "react-router-dom";
import NavigationIcon2029 from "./NavigationIcon2029.jsx";
import "./contextReturnAction2029.css";

/**
 * One in-page transition to a destination, never two (ZURIEL 6.11.2026):
 *  - the reader arrived from that destination (the saved returnTo matches)  -> a button that returns to the exact state they left;
 *  - the reader arrived on their own                                         -> a plain link that opens the destination (when `to` is given).
 * The frame's own "חזרה מדויקת" (header, sidebar, context strip) is untouched; this only replaces the page's own duplicate buttons.
 */
export default function ContextReturnAction2029({
  returnTo,
  matches = () => true,
  onReturn,
  returnLabel,
  to,
  openLabel,
  icon,
  iconSize = 18,
  className = "sod29-action",
  returnProps,
  openProps,
}) {
  const mark = icon ? <NavigationIcon2029 name={icon} size={iconSize} /> : null;
  const classes = `${className}${icon ? " sod29-context-action-with-icon" : ""}`;
  if (returnTo?.href && matches(returnTo) && typeof onReturn === "function") {
    return <button type="button" className={classes} onClick={onReturn} {...returnProps}>{mark}<span>{returnLabel}</span></button>;
  }
  if (to) {
    return <Link to={to} className={classes} {...openProps}>{mark}<span>{openLabel}</span></Link>;
  }
  return null;
}
