import React from "react";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import "./followCenter2029.css";

// Presentational 2029 personal update center. Everything arrives through the view model and callbacks:
// there is no store, sender, preference writer or second follow implementation in this file.
const STATE_TEXT = { done: "הושלם", idle: "עוד לא", needed: "נדרש", unavailable: "לא פעיל" };
const withReturn = (href, returnHref) => {
  if (!href) return null;
  if (!returnHref) return href;
  const [path, hash = ""] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}${new URLSearchParams({ returnTo: returnHref })}${hash ? `#${hash}` : ""}`;
};

function ReadNotice({ state, what, onRetry }) {
  if (state === "loading") return <p className="fc-note" role="status">טוען את {what}…</p>;
  return <div className="fc-note fc-note-alert" role="alert"><span>לא ניתן לקרוא את {what} כרגע. זה לא אומר שאין כלום.</span>{onRetry ? <button type="button" className="fc-btn" onClick={onRetry}>ניסיון נוסף</button> : null}</div>;
}

export default function FollowCenter2029({ model, returnHref = null, onMarkAllRead, onOpenUpdate, onUnfollow, onRetry, onSignIn, onVerifyIdentity }) {
  const { principal, updates, following, channels, lifecycle, inputs } = model;
  const guest = principal === "guest";
  return <section className="fc" aria-labelledby="fc-title" data-principal={principal}>
    <header className="fc-head">
      <div className="fc-title-row">
        <span className="fc-tile" aria-hidden="true"><NavigationIcon2029 name="now" size={28} /></span>
        <div>
          <p className="fc-eyebrow">האזור האישי</p>
          <h1 id="fc-title">העדכונים שלי</h1>
          <p className="fc-lede">מה חדש, אחרי מי ומה אתם עוקבים, ואיך תרצו לקבל עדכונים. עוקבים בבחירה שלכם בלבד.</p>
        </div>
      </div>
      <ol className="fc-life" aria-label="ארבעת שלבי המעקב, כל אחד נפרד">
        {lifecycle.map((step) => <li key={step.key} data-state={step.state}>
          <b>{step.label}</b><span className="fc-life-state">{STATE_TEXT[step.state]}</span><small>{step.note}</small>
        </li>)}
      </ol>
    </header>

    {principal === "loading" ? <p className="fc-note" role="status">בודק את החשבון…</p> : null}
    {guest ? <div className="fc-guest" role="note">
      <div><strong>אתם עוקבים כאורחים</strong>
        <p>המעקב נשמר בזהות האורח במכשיר הזה. הצעד הבא הוא אימות זהות בלבד. ערוץ עדכון נבחר בנפרד, אחרי שמתחברים.</p></div>
      <div className="fc-actions">
        <button type="button" className="fc-btn fc-primary" onClick={onVerifyIdentity}>אימות זהות</button>
        <button type="button" className="fc-btn" onClick={onSignIn}>התחברות</button>
      </div>
    </div> : null}

    <div className="fc-grid">
      <section className="fc-card fc-updates" data-tone="action" aria-labelledby="fc-updates-title">
        <div className="fc-card-head">
          <h2 id="fc-updates-title">מה חדש</h2>
          {updates.state === "ready" && updates.unread ? <button type="button" className="fc-link" onClick={onMarkAllRead}>סמן הכול כנקרא ({updates.unread})</button> : null}
        </div>
        {updates.state !== "ready" ? <ReadNotice state={updates.state} what="העדכונים" onRetry={() => onRetry?.("updates")} /> : null}
        {updates.state === "ready" && !updates.items.length ? <p className="fc-empty">אין עדכונים עדיין. כשמשהו חדש יופיע אצל מי שאתם עוקבים, הוא יגיע לכאן.</p> : null}
        {updates.state === "ready" && updates.items.length ? <ul className="fc-list">
          {updates.items.map((item) => {
            const href = withReturn(item.href, returnHref);
            return <li key={item.id} className="fc-update" data-unread={item.unread}>
              <div className="fc-update-top">
                {item.unread ? <span className="fc-dot" role="img" aria-label="לא נקרא" /> : null}
                <h3>{item.title}</h3>
              </div>
              {item.body ? <p className="fc-body">{item.body}</p> : null}
              <p className="fc-meta"><time>{item.time}</time>
                {item.why ? <span className="fc-why">כי אתם עוקבים אחרי <b className="fc-why-name"><span className="fc-icon-sm" data-icon={item.why.icon} aria-hidden="true"><NavigationIcon2029 name={item.why.icon} size={16} /></span> {item.why.label}</b>{item.why.kind ? ` · ${item.why.kind}` : ""}</span> : null}</p>
              {href ? <a className="fc-open" href={href} onClick={() => onOpenUpdate?.(item)}>לצפייה בתוכן <span aria-hidden="true">←</span></a> : null}
            </li>;
          })}
        </ul> : null}
      </section>

      <div className="fc-side">
        <section className="fc-card" data-tone="follow" aria-labelledby="fc-follow-title">
          <h2 id="fc-follow-title">במעקב שלי</h2>
          <ul className="fc-inputs" aria-label="שלושה סוגי קלט נפרדים">
            {inputs.map((input) => <li key={input.key} data-active={input.active}><b>{input.label}</b><span>{input.note}</span></li>)}
          </ul>
          {following.state !== "ready" ? <ReadNotice state={following.state} what="רשימת המעקב" onRetry={() => onRetry?.("following")} /> : null}
          {following.state === "ready" && !following.groups.length ? <p className="fc-empty">עוד לא בחרתם לעקוב אחרי כותב, מספר או נושא. כפתור «עקוב» בדף כותב או בנושא יוסיף אותו לכאן.</p> : null}
          {following.state === "ready" ? following.groups.map((group) => <div key={group.key} className="fc-group">
            <h3>{group.heading}</h3>
            <ul className="fc-list">
              {group.items.map((entry) => {
                const href = withReturn(entry.href, returnHref);
                return <li key={entry.topic} className="fc-follow-row" data-change={entry.change}>
                  <span className="fc-icon" data-icon={entry.icon} aria-hidden="true"><NavigationIcon2029 name={entry.icon} size={22} /></span>
                  {href ? <a className="fc-name" href={href}>{entry.label}</a> : <span className="fc-name">{entry.label}</span>}
                  <button type="button" className="fc-btn" aria-label={`ביטול מעקב: ${entry.label}`} aria-busy={entry.change === "pending"} disabled={entry.change === "pending"} onClick={() => onUnfollow?.(entry.topic)}>
                    {entry.change === "pending" ? "מבטל…" : <>עוקב <NavigationIcon2029 name="check" size={16} /></>}</button>
                  {entry.change === "failed" ? <p className="fc-row-error" role="alert">לא התקבל אישור ביטול. המעקב עדיין פעיל. רעננו ונסו שוב.</p> : null}
                  {!href && group.key === "כתב" ? <p className="fc-row-note">אין דף ציבורי יחיד ומאומת לכותב הזה, לכן אין קישור.</p> : null}
                </li>;
              })}
            </ul>
          </div>) : null}
        </section>

        <section className="fc-card" data-tone="channel" aria-labelledby="fc-channel-title">
          <h2 id="fc-channel-title">איך לעדכן אותי</h2>
          <p className="fc-note-plain">מעקב לא מפעיל שום ערוץ. כל ערוץ מופעל בנפרד, בהסכמה מפורשת, אחרי אימות זהות.</p>
          <ul className="fc-list">
            {channels.map((channel) => <li key={channel.key} className="fc-channel" data-available={channel.available}>
              <span className="fc-icon" data-icon={channel.icon} data-available={channel.available} aria-hidden="true"><NavigationIcon2029 name={channel.icon} size={22} /></span>
              <div><strong>{channel.label}</strong><small>{channel.note}</small></div>
              <span className="fc-chip" data-on={channel.chosen}>{channel.chosen ? "פעיל" : channel.available ? "אפשר להפעיל" : "לא זמין עדיין"}</span>
            </li>)}
          </ul>
          <p className="fc-note-plain">מייל, תקציר ו־WhatsApp יופיעו כאן כשתהליך ההסכמה והמשלוח שלהם יהיה קיים בפועל.</p>
        </section>
      </div>
    </div>
  </section>;
}
