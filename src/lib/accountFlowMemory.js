// Remembers that this tab is in the "choose a new password" step of a password reset.
//
// Why this exists: verifying a recovery code opens a session, and the page frame re-mounts when a user appears. Component state would
// be lost at exactly that moment and the person would be left signed in without having chosen a password. Only the fact "this tab is
// in that step" and a timestamp are kept: never a code, a password or an address. It lives in the tab's session storage, with an
// in-memory fallback when storage is unavailable, and it expires so a stale flag can never trap anyone.

export const NEW_PASSWORD_STEP_TTL_MS = 15 * 60 * 1000;
const KEY = "sod-account-new-password-step";
let memoryStamp = 0;

function tabStorage() {
  try { return globalThis.sessionStorage || null; } catch { return null; }
}

export function armNewPasswordStep({ now = Date.now(), storage = tabStorage() } = {}) {
  memoryStamp = now;
  try { storage?.setItem(KEY, String(now)); } catch { /* the in-memory stamp still covers this page load */ }
}

export function newPasswordStepArmed({ now = Date.now(), storage = tabStorage() } = {}) {
  let stamp = memoryStamp;
  try {
    const stored = Number(storage?.getItem(KEY));
    if (Number.isFinite(stored) && stored > stamp) stamp = stored;
  } catch { /* storage unreadable: memory only */ }
  if (!stamp || now - stamp > NEW_PASSWORD_STEP_TTL_MS || now < stamp - NEW_PASSWORD_STEP_TTL_MS) {
    disarmNewPasswordStep({ storage });
    return false;
  }
  return true;
}

export function disarmNewPasswordStep({ storage = tabStorage() } = {}) {
  memoryStamp = 0;
  try { storage?.removeItem(KEY); } catch { /* nothing to clear */ }
}

// A one-shot message that must survive the re-mount a sign-out or sign-in causes (for example "your verification expired, start again").
// It is read once, then cleared, and it expires within a minute. It holds the message text only.
export const ACCOUNT_FLASH_TTL_MS = 60 * 1000;
const FLASH_KEY = "sod-account-flash";
let memoryFlash = null;

export function setAccountFlash(text, { now = Date.now(), storage = tabStorage() } = {}) {
  memoryFlash = { text: String(text || ""), at: now };
  try { storage?.setItem(FLASH_KEY, JSON.stringify(memoryFlash)); } catch { /* memory fallback */ }
}

export function takeAccountFlash({ now = Date.now(), storage = tabStorage() } = {}) {
  let flash = memoryFlash;
  try {
    const stored = JSON.parse(storage?.getItem(FLASH_KEY) || "null");
    if (stored && typeof stored.text === "string" && Number.isFinite(stored.at) && (!flash || stored.at > flash.at)) flash = stored;
  } catch { /* unreadable: memory only */ }
  memoryFlash = null;
  try { storage?.removeItem(FLASH_KEY); } catch { /* nothing to clear */ }
  if (!flash || !flash.text || now - flash.at > ACCOUNT_FLASH_TTL_MS || now < flash.at - ACCOUNT_FLASH_TTL_MS) return "";
  return flash.text;
}
