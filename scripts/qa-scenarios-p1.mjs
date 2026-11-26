// Priority-1 end-to-end scenarios against the real local stack (GoTrue JWTs, PostgREST, row level security, the triggers and functions
// read from production): private messages, notifications and read marks, counters. Synthetic accounts only; every request goes to the
// throwaway backend. Each result line starts with its family ("messages:", "notifications:", "counters:") so the report can match it.
export async function runP1({ origin, anon, service, syntheticAccount, note }) {
  const headers = (token, extra = {}) => ({ apikey: anon, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json', ...extra });
  const login = async (account) => {
    const response = await fetch(`${origin}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email: account.email, password: account.password }) });
    if (!response.ok) throw new Error(`token_${response.status}`);
    return (await response.json()).access_token;
  };
  const call = async (method, path, token, body, extra) => {
    const response = await fetch(`${origin}/rest/v1/${path}`, { method, headers: headers(token, extra), body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const rpc = (name, args, token) => call('POST', `rpc/${name}`, token, args);
  const check = (family, ok, name, detail = '') => note(ok, `${family}: ${name}`, detail);
  const denied = (r) => r.status >= 400;

  const [a, b, c] = [await syntheticAccount(), await syntheticAccount(), await syntheticAccount()];
  const [ta, tb, tc] = [await login(a), await login(b), await login(c)];

  // ── Private messages ──
  const sent = await rpc('dm_send', { p_to: b.id, p_body: '  שלום מחבר א׳  ' }, ta);
  check('messages', sent.status === 200 && sent.body?.ok === true, 'member A sends a private message to member B', `status=${sent.status}`);
  const inboxB = await rpc('dm_inbox', {}, tb);
  const rowB = (inboxB.body || []).find((r) => r.counterpart === a.id);
  check('messages', rowB?.unread === 1 && rowB?.last_body === 'שלום מחבר א׳', 'B receives it in the inbox as one unread message with the trimmed body', JSON.stringify(rowB || null).slice(0, 120));
  const inboxA = await rpc('dm_inbox', {}, ta);
  check('messages', (inboxA.body || []).find((r) => r.counterpart === b.id)?.unread === 0, 'the sender sees the conversation with no unread of their own');
  for (const [label, args, token, error] of [['to themselves', { p_to: a.id, p_body: 'x' }, ta, 'bad_recipient'], ['an empty body', { p_to: b.id, p_body: '   ' }, ta, 'empty'], ['a body over 4000 characters', { p_to: b.id, p_body: 'x'.repeat(4001) }, ta, 'too_long'], ['to a user that does not exist', { p_to: '00000000-0000-0000-0000-00000000dead', p_body: 'x' }, ta, 'no_such_user']]) {
    const r = await rpc('dm_send', args, token);
    check('messages', r.body?.ok === false && r.body?.error === error, `the function refuses a message ${label}`, `error=${r.body?.error}`);
  }
  const thirdThread = await rpc('dm_thread', { p_with: a.id }, tc);
  const thirdTable = await call('GET', 'direct_messages?select=id', tc);
  const thirdInbox = await rpc('dm_inbox', {}, tc);
  check('messages', Array.isArray(thirdThread.body) && thirdThread.body.length === 0 && Array.isArray(thirdTable.body) && thirdTable.body.length === 0 && (thirdInbox.body || []).length === 0, 'a third member sees no part of the conversation (thread, table and inbox)');
  const anonSend = await rpc('dm_send', { p_to: b.id, p_body: 'x' });
  const anonInbox = await rpc('dm_inbox', {});
  check('messages', denied(anonSend) && denied(anonInbox), 'an anonymous caller cannot send or read private messages', `${anonSend.status}/${anonInbox.status}`);
  const directInsert = await call('POST', 'direct_messages', ta, { from_user: a.id, to_user: b.id, body: 'bypass' }, { prefer: 'return=minimal' });
  check('messages', denied(directInsert), 'a member cannot write a message straight into the table (only through the function)', `status=${directInsert.status}`);

  // ── Notifications and read marks ──
  const unreadFor = async (token) => (await call('GET', 'user_notifications?select=id,kind,title,read_at&read_at=is.null', token)).body || [];
  const notificationsB = await unreadFor(tb);
  const dmNotice = notificationsB.find((n) => n.kind === 'dm');
  check('notifications', notificationsB.length === 1 && !!dmNotice, 'B receives one notification from the trigger that fires on the message', `unread=${notificationsB.length}`);
  check('notifications', (await unreadFor(ta)).length === 0 && (await unreadFor(tc)).length === 0, 'the sender and a third member receive none');
  const stranger = await call('PATCH', `user_notifications?id=eq.${dmNotice?.id}`, tc, { read_at: new Date().toISOString() }, { prefer: 'return=representation' });
  check('notifications', !(Array.isArray(stranger.body) && stranger.body.length) , 'another member cannot mark B\'s notification as read', `status=${stranger.status}`);
  const wrongColumn = await call('PATCH', `user_notifications?id=eq.${dmNotice?.id}`, tb, { title: 'rewritten' }, { prefer: 'return=representation' });
  check('notifications', denied(wrongColumn), 'the owner can change only read_at (any other column is refused)', `status=${wrongColumn.status}`);
  const marked = await call('PATCH', `user_notifications?id=eq.${dmNotice?.id}`, tb, { read_at: new Date().toISOString() }, { prefer: 'return=representation' });
  check('notifications', marked.status < 300 && marked.body?.[0]?.read_at, 'the owner marks it as read', `status=${marked.status}`);
  check('notifications', (await unreadFor(tb)).length === 0, 'the unread counter drops to zero and stays there after a fresh read');
  // read marks on the message itself: opening the thread marks the received messages as read
  await rpc('dm_send', { p_to: b.id, p_body: 'עוד אחת' }, ta);
  const before = (await rpc('dm_inbox', {}, tb)).body?.find((r) => r.counterpart === a.id)?.unread;
  const thread = await rpc('dm_thread', { p_with: a.id }, tb);
  const after = (await rpc('dm_inbox', {}, tb)).body?.find((r) => r.counterpart === a.id)?.unread;
  check('messages', before === 1 && Array.isArray(thread.body) && thread.body.length === 3 && after === 0, 'opening the thread returns the whole conversation and marks the received messages as read', `unread ${before} -> ${after}`);
  check('messages', thread.body?.every((m) => (m.to_user === b.id ? m.read_at : true)), 'only messages addressed to the reader are marked');
  // preferences
  const prefs = await call('POST', 'notification_prefs', tb, { user_id: b.id, topics: ['author:qa'], channels: ['site'] }, { prefer: 'return=representation' });
  check('notifications', prefs.status < 300, 'a member saves their own notification preferences', `status=${prefs.status}`);
  const foreignPrefs = await call('POST', 'notification_prefs', tb, { user_id: a.id, topics: [] }, { prefer: 'return=minimal' });
  check('notifications', denied(foreignPrefs), 'a member cannot write preferences for another member', `status=${foreignPrefs.status}`);
  check('notifications', ((await call('GET', 'notification_prefs?select=user_id', ta)).body || []).length === 0, 'preferences are private to their owner');
  // push subscription
  const endpoint = `https://qa.invalid/push/${b.id}`;
  const pushArgs = { p_endpoint: endpoint, p_p256dh: 'qa-key', p_auth: 'qa-auth', p_topics: ['author:qa'], p_user_agent: 'qa', p_visitor: null };
  const bad = await rpc('push_subscription_upsert_v1', { ...pushArgs, p_endpoint: 'http://insecure' }, tb);
  check('notifications', denied(bad), 'a push subscription with a non-HTTPS endpoint is refused', `status=${bad.status}`);
  const good = await rpc('push_subscription_upsert_v1', pushArgs, tb);
  const mine = await call('GET', 'push_subscriptions?select=endpoint', tb), theirs = await call('GET', 'push_subscriptions?select=endpoint', tc);
  check('notifications', good.status < 300 && (mine.body || []).length === 1 && (theirs.body || []).length === 0, 'a member registers a push subscription that only they can read', `status=${good.status}`);
  const hijack = await rpc('push_subscription_upsert_v1', { ...pushArgs, p_topics: ['taken-over'] }, tc);
  const stillMine = await call('GET', 'push_subscriptions?select=topics', tb);
  check('notifications', JSON.stringify(stillMine.body?.[0]?.topics) === JSON.stringify(['author:qa']), 'another member cannot take over the same endpoint', `status=${hijack.status}`);
  await rpc('push_subscription_delete_v1', { p_endpoint: endpoint }, tb);
  check('notifications', ((await call('GET', 'push_subscriptions?select=endpoint', tb)).body || []).length === 0, 'the owner removes the subscription');

  // ── Counters ──
  const ref = `qa-${a.id.slice(0, 8)}`;
  for (let i = 0; i < 3; i++) await call('POST', 'page_views', undefined, { kind: 'post', ref }, { prefer: 'return=minimal' });
  const count = await rpc('view_count', { p_kind: 'post', p_ref: ref, p_days: 7 });
  check('counters', count.status === 200 && Number(count.body) === 3, 'three anonymous views make the view counter read 3', `count=${JSON.stringify(count.body)}`);
  const readViews = await call('GET', 'page_views?select=id');
  check('counters', denied(readViews) || (Array.isArray(readViews.body) && readViews.body.length === 0), 'the raw views table is not readable by an anonymous visitor', `status=${readViews.status}`);
  const other = await rpc('view_count', { p_kind: 'post', p_ref: 'another-page', p_days: 7 });
  check('counters', Number(other.body) === 0, 'a different page keeps its own counter');
  const activity = await call('POST', 'user_activity', tb, { kind: 'read', ref: 'qa', title: 'QA' }, { prefer: 'return=minimal' });
  check('counters', activity.status < 300, 'a member records their own activity (the id is generated by the database)', `status=${activity.status}`);
  const forged = await call('POST', 'user_activity', tb, { user_id: a.id, kind: 'read' }, { prefer: 'return=minimal' });
  check('counters', denied(forged), 'a member cannot record activity in someone else\'s name', `status=${forged.status}`);
  check('counters', ((await call('GET', 'user_activity?select=id', tb)).body || []).length === 1 && ((await call('GET', 'user_activity?select=id', tc)).body || []).length === 0, 'activity is private to its owner');
}
