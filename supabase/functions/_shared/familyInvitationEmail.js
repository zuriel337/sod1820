const EMAIL_MAX_LENGTH = 254;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

const clean = value => String(value || "").trim();

export function normalizeFamilyInvitationEmail(value) {
  const email = clean(value).toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH || /[\s<>]/.test(email)) return null;
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0].length > 64) return null;
  if (!/^[^@\s]+$/.test(parts[0])) return null;
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(parts[1])) return null;
  return email;
}

export function normalizeFamilyInvitationInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const claimId = clean(value.claim_id);
  const rawToken = clean(value.raw_token).toLowerCase();
  const recipientEmail = normalizeFamilyInvitationEmail(value.recipient_email);
  if (!UUID_PATTERN.test(claimId) || !RAW_TOKEN_PATTERN.test(rawToken) || !recipientEmail) return null;
  return Object.freeze({ claimId, rawToken, recipientEmail });
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeHexEqual(left, right) {
  const a = clean(left).toLowerCase();
  const b = clean(right).toLowerCase();
  if (!RAW_TOKEN_PATTERN.test(a) || !RAW_TOKEN_PATTERN.test(b)) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

export async function authorizeFamilyInvitationEmail({ claim, ownerPersonId, rawToken, targetExists, now = new Date() }) {
  if (!claim || clean(claim.flow) !== "invitation" || clean(claim.status) !== "pending") return false;
  if (!ownerPersonId || clean(claim.issuer_owner_id) !== clean(ownerPersonId) || targetExists !== true) return false;
  const expiresAt = new Date(claim.token_expires_at || 0);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) return false;
  const presentedHash = await sha256Hex(rawToken);
  return constantTimeHexEqual(presentedHash, claim.token_hash);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function familyJourneyUrl(siteUrl) {
  try {
    const url = new URL(clean(siteUrl) || "https://sod1820.co.il");
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("invalid protocol");
    url.pathname = "/2029/journey";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "https://sod1820.co.il/2029/journey";
  }
}

export function buildFamilyInvitationEmail({ rawToken, siteUrl }) {
  const token = clean(rawToken).toLowerCase();
  if (!RAW_TOKEN_PATTERN.test(token)) throw new Error("invalid invitation token");
  const journeyUrl = familyJourneyUrl(siteUrl);
  const safeUrl = escapeHtml(journeyUrl);
  const safeToken = escapeHtml(token);
  const subject = "הזמנה פרטית לחיבור למסע החיים — סוד 1820";
  const text = [
    "הוזמנת לחבר את החשבון שלך לזהות משפחתית קיימת במסע החיים של סוד 1820.",
    "",
    `פתחו את מסע החיים: ${journeyUrl}`,
    "התחברו לחשבון האישי שלכם, ובאזור „קיבלתי קוד הזמנה” הזינו את הקוד:",
    token,
    "",
    "הקוד חד־פעמי ותקף לזמן מוגבל. אין להעביר אותו לאדם אחר.",
    "החיבור מאמת זהות בלבד: הוא אינו מעביר מחקר פרטי ואינו מעניק גישה לנתונים של שולח ההזמנה.",
    "אם ההזמנה אינה מוכרת לכם, אפשר להתעלם מהמייל.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head>
<body style="margin:0;background:#f5f0e5;color:#21180b;font-family:Arial,'Noto Sans Hebrew',sans-serif;">
  <main lang="he" dir="rtl" style="max-width:600px;margin:0 auto;padding:28px 18px;text-align:right;line-height:1.75;">
    <section style="background:#fffaf0;border:1px solid #b9953e;border-radius:18px;padding:26px;">
      <h1 style="margin:0 0 16px;font-size:24px;color:#21180b;">הזמנה פרטית למסע החיים</h1>
      <p>הוזמנת לחבר את החשבון שלך לזהות משפחתית קיימת במסע החיים של סוד 1820.</p>
      <p><a href="${safeUrl}" style="display:inline-block;background:#6b4e0f;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">פתחו את מסע החיים</a></p>
      <p>לאחר ההתחברות לחשבון האישי, באזור <strong>„קיבלתי קוד הזמנה”</strong> הזינו את הקוד:</p>
      <p dir="ltr" style="padding:12px;background:#f0e5ca;border:1px solid #9b792d;border-radius:10px;overflow-wrap:anywhere;text-align:left;"><code style="color:#21180b;font-size:15px;">${safeToken}</code></p>
      <p><strong>הקוד חד־פעמי ותקף לזמן מוגבל.</strong> אין להעביר אותו לאדם אחר.</p>
      <p style="font-size:14px;color:#4b3c22;">החיבור מאמת זהות בלבד. הוא אינו מעביר מחקר פרטי ואינו מעניק גישה לנתונים של שולח ההזמנה.</p>
      <p style="font-size:13px;color:#5d513e;">אם ההזמנה אינה מוכרת לכם, אפשר להתעלם מהמייל.</p>
    </section>
  </main>
</body>
</html>`;
  return Object.freeze({ subject, html, text, journeyUrl });
}
