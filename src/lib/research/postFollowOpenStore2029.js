// The one open/closed state of the Post's follow panel (ZURIEL 25.11.2026): the bell in the action row and the invitation line before the comments both open
// THE SAME panel. Tiny on purpose (no Supabase, no engine): the heavy follow code loads only when the panel opens.
let open = false;
const listeners = new Set();
const emit = () => { for (const listener of [...listeners]) listener(); };
export const postFollowOpen = () => open;
export const openPostFollow = () => { if (!open) { open = true; emit(); } };
export const closePostFollow = () => { if (open) { open = false; emit(); } };
export const subscribePostFollow = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
