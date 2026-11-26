import { publicReadingActionsLocked } from "../publicReadingRelease2029.js";
// The one open/closed state of the Post's follow panel (ZURIEL 25.11.2026): the bell in the action row and the invitation line before the comments both open
// THE SAME panel. Tiny on purpose (no Supabase, no engine): the heavy follow code loads only when the panel opens.
let open = false;
const listeners = new Set();
const emit = () => { for (const listener of [...listeners]) listener(); };
export const postFollowOpen = () => open;
export const openPostFollow = () => { if (!open) { open = true; emit(); } };
export const closePostFollow = () => { if (open) { open = false; emit(); } };
export const subscribePostFollow = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

// The public follow switch of the Post (ZURIEL 26.11.2026): a separate activation package, DORMANT here. While it is false the Post's follow panel follows the public
// reading lock exactly as before (publicReadingActionsLocked: closed to the public, open to the admin). Flipping it is the code step of the activation package
// (docs/reviews/follow-public-activation-20261126/README.md) and needs its own exact approval, after the database steps of that package.
export const POST_FOLLOW_PUBLIC_2029 = false;
export const postFollowLocked = (isAdmin) => publicReadingActionsLocked(isAdmin) && !POST_FOLLOW_PUBLIC_2029;
// WatchButton: the Post panel's own source may follow a category, a writer or a series (the existing engine, the existing topics) only when the switch is on.
export const postPanelFollowAllowed = (source, topic) => POST_FOLLOW_PUBLIC_2029 && source === "post_follow_panel_2029" && /^(?:cat|author|series):\S{1,120}$/.test(topic || "");
