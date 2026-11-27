// Priority-3 end-to-end scenarios against the real local stack (GoTrue JWTs, PostgREST, row level security, and the tables, functions and grants read
// from production by qa/extract/extract-definitions.sql): comments, likes and dislikes, follow. Synthetic accounts only (member A, B, C, an administrator
// and a guest); every request goes to the throwaway backend. Each result line starts with its family ("comments:", "likes:", "follow:") so the report can
// match it. Nothing here selects a row from production; the guest network protection is exercised with a random key created in the local database.
import { createHash, randomBytes } from 'node:crypto';

export async function runP3({ origin, anon, service, syntheticAccount, note }) {
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
  const rpc = (name, args, token, extra) => call('POST', `rpc/${name}`, token, args, extra);
  const asService = (method, path, body, extra) => fetch(`${origin}/rest/v1/${path}`, { method, headers: { apikey: service, Authorization: `Bearer ${service}`, 'content-type': 'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  const check = (family, ok, name, detail = '') => note(ok, `${family}: ${name}`, detail);
  const message = (r) => String(r.body?.message ?? '');
  const refused = (r, text) => r.status >= 400 && (text === undefined || message(r) === text);
  const ipHeader = (ip) => ({ 'cf-connecting-ip': ip });
  // the 4th octet is random so that two runs never share the hourly guest budget
  const base = `203.0.113.${1 + (randomBytes(1)[0] % 200)}`;
  const octet = (n) => `203.0.113.${((Number(base.split('.')[3]) + n) % 250) + 1}`;

  const [a, b, c, adm] = [await syntheticAccount(), await syntheticAccount(), await syntheticAccount(), await syntheticAccount('admin')];
  const [ta, tb, tc, tadm] = [await login(a), await login(b), await login(c), await login(adm)];
  const post = `qa-post-${a.id.slice(0, 8)}`;
  const read = (id, token, columns = 'id,status,body,author_name,author_user_id,pinned_at,edited_at,deleted_at,reactions,origin') => call('GET', `research_contributions?id=eq.${id}&select=${columns}`, token);
  const one = async (id, token, columns) => (await read(id, token, columns)).body?.[0] ?? null;
  const add = (args, token, extra) => rpc('add_contribution', { p_intent: 'תגובה', p_origin: 'community_2029', p_target_type: 'post', p_target_id: post, ...args }, token, extra);

  // ── Comments: a member ──
  const first = await add({ p_body: 'תגובה ראשונה מחבר א׳' }, ta);
  const c1 = first.body;
  const asGuest = await one(c1);
  check('comments', first.status === 200 && typeof c1 === 'string' && asGuest?.status === 'approved' && asGuest?.author_user_id === a.id && asGuest?.body === 'תגובה ראשונה מחבר א׳', 'member A adds a comment: it is approved at once, signed with the account, and a guest reads it', `status=${first.status} ${asGuest?.status}`);
  const reply = await add({ p_body: 'תשובה מחבר ב׳', p_parent_id: c1 }, tb);
  const c2 = reply.body;
  const counts = await rpc('community_reply_counts', { p_ids: [c1] });
  check('comments', reply.status === 200 && counts.status === 200 && counts.body?.find((r) => r.parent_id === c1)?.reply_count === 1, 'member B replies and the reply counter of the comment reads 1 for a guest', JSON.stringify(counts.body));
  const feed = await rpc('forum_feed_contributions', { p_limit: 200 });
  const question = await rpc('add_contribution', { p_intent: 'שאלה', p_origin: 'beit_midrash', p_body: 'שאלה שממתינה לסקירה', p_target_type: 'post', p_target_id: post }, ta);
  const q1 = question.body;
  const questionRow = await one(q1, ta);
  check('comments', questionRow?.status === 'pending', 'a member contribution that is not a plain comment waits for review (pending)', `status=${questionRow?.status}`);
  check('comments', (await one(q1)) === null && (await one(q1, tb)) === null && (await one(q1, tc)) === null && !!(await one(q1, tadm)), 'unreviewed content is private: invisible to a guest and to other members, visible to its author and to the administrator');
  const feedAfter = await rpc('forum_feed_contributions', { p_limit: 200 });
  check('comments', Array.isArray(feed.body) && feed.body.some((r) => r.id === c1) && !(feedAfter.body || []).some((r) => r.id === q1), 'the public forum feed lists the approved comment and never the unreviewed one');
  const direct = [await call('POST', 'research_contributions', ta, { author_user_id: a.id, body: 'bypass', origin: 'community_2029', intent: 'תגובה', status: 'approved' }, { prefer: 'return=minimal' }),
    await call('PATCH', `research_contributions?id=eq.${c1}`, ta, { body: 'rewritten' }, { prefer: 'return=representation' }), await call('DELETE', `research_contributions?id=eq.${c1}`, ta, undefined, { prefer: 'return=representation' })];
  check('comments', direct[0].status >= 400 && direct[1].status >= 400 && direct[2].status >= 400 && (await one(c1))?.body === 'תגובה ראשונה מחבר א׳', 'a member cannot write, change or delete comments straight in the table (only through the functions)', direct.map((r) => r.status).join('/'));
  const anonMember = await rpc('edit_contribution', { p_id: c1, p_body: 'x' });
  check('comments', refused(anonMember) && (await one(c1))?.body === 'תגובה ראשונה מחבר א׳', 'a guest cannot call the edit function', `status=${anonMember.status}`);
  const emptyBody = await add({ p_body: '   ' }, ta), badIntent = await add({ p_body: 'x', p_intent: 'לא קיים' }, ta);
  check('comments', refused(emptyBody, 'empty body') && refused(badIntent, 'invalid intent'), 'an empty body and an unknown intent are refused', `${message(emptyBody)} / ${message(badIntent)}`);

  // ── Comments: a guest, the network protection and the review ──
  const guestIp = octet(1);
  const noKey = await add({ p_body: 'אורח בלי מפתח רשת', p_author_name: 'דני' }, undefined, ipHeader(guestIp));
  check('comments', refused(noKey, 'rate_limited'), 'a guest comment fails closed while the network key does not exist (no trusted address reference)', `${noKey.status} ${message(noKey)}`);
  const key = randomBytes(16);
  const keyRow = await asService('POST', 'community_net_key', { key: `\\x${key.toString('hex')}` }, { prefer: 'resolution=ignore-duplicates,return=minimal' });
  check('comments', keyRow.status < 300, 'the QA network key is created in the local database (QA configuration, a random value)', `status=${keyRow.status}`);
  const netRef = (ip) => createHash('sha256').update(Buffer.concat([key, Buffer.from(ip, 'utf8')])).digest('hex');
  const noHeader = await add({ p_body: 'אורח בלי כתובת מהפרוקסי' }, undefined);
  check('comments', refused(noHeader, 'rate_limited'), 'a guest comment without the platform address header is refused', `${noHeader.status} ${message(noHeader)}`);
  const guest = await add({ p_body: 'תגובת אורח', p_author_name: 'דני' }, undefined, ipHeader(guestIp));
  const g1 = guest.body;
  const guestRow = await one(g1, tadm);
  check('comments', guest.status === 200 && guestRow?.status === 'pending' && guestRow?.author_user_id === null && guestRow?.author_name === 'דני', 'a guest comment is stored as pending, with the typed name and no account', `status=${guest.status} ${guestRow?.status}`);
  check('comments', (await one(g1)) === null && (await one(g1, ta)) === null && (await one(g1, tb)) === null, 'the pending guest comment is invisible to guests and members (privacy of unreviewed content)');
  const log = await asService('GET', `anon_contrib_log?select=ip&ip=eq.${netRef(guestIp)}`);
  check('comments', Array.isArray(log.body) && log.body.length === 1 && !JSON.stringify(log.body).includes(guestIp), 'the guest rate log keeps only a salted hash of the network, never the address', `rows=${log.body?.length}`);
  const noBlock = await rpc('moderate_contribution', { p_id: g1, p_status: 'approved' }, tb);
  check('comments', refused(noBlock, 'not authorized') && (await one(g1)) === null, 'a member cannot approve a guest comment', `${noBlock.status} ${message(noBlock)}`);
  const approve = await rpc('moderate_contribution', { p_id: g1, p_status: 'approved' }, tadm);
  const afterApprove = await one(g1);
  check('comments', approve.status < 300 && afterApprove?.status === 'approved' && afterApprove?.body === 'תגובת אורח', 'the administrator approves it and a guest then reads it', `status=${approve.status}`);
  const reloaded = await one(g1, await login(c));
  check('comments', reloaded?.status === 'approved', 'after a fresh sign-in of another member the approved guest comment is still there (persistence)');
  const hide = await rpc('moderate_contribution', { p_id: g1, p_status: 'hidden' }, tadm);
  check('comments', hide.status < 300 && (await one(g1)) === null, 'the administrator hides it and it disappears for guests', `status=${hide.status}`);
  const badStatus = await rpc('moderate_contribution', { p_id: g1, p_status: 'published' }, tadm);
  check('comments', refused(badStatus, 'bad status'), 'an unknown moderation status is refused', message(badStatus));
  await rpc('moderate_contribution', { p_id: g1, p_status: 'approved' }, tadm);
  // pin
  const memberPin = await rpc('pin_contribution', { p_id: c1, p_pin: true }, ta);
  const adminPin = await rpc('pin_contribution', { p_id: c1, p_pin: true }, tadm);
  const pinned = (await one(c1))?.pinned_at;
  const unpin = await rpc('pin_contribution', { p_id: c1, p_pin: false }, tadm);
  check('comments', refused(memberPin, 'not authorized') && adminPin.status < 300 && !!pinned && unpin.status < 300 && (await one(c1))?.pinned_at === null, 'the administrator pins and unpins a comment; a member cannot', `${memberPin.status}/${adminPin.status}/${unpin.status}`);
  // guest limits
  const limitIp = octet(2);
  const sixth = [];
  for (let i = 0; i < 6; i++) sixth.push(await add({ p_body: `אורח ${i}` }, undefined, ipHeader(limitIp)));
  check('comments', sixth.slice(0, 5).every((r) => r.status === 200) && refused(sixth[5], 'rate_limited'), 'a guest network may write five comments an hour; the sixth is refused', sixth.map((r) => r.status).join(','));
  const blockedIp = octet(3);
  const block = await asService('POST', 'community_net_blocks', { net_ref: netRef(blockedIp), duration_kind: 'h24', created_by: adm.id, reason: 'QA synthetic network block', expires_at: new Date(Date.now() + 86400000).toISOString() }, { prefer: 'return=representation' });
  const blockedGuest = await add({ p_body: 'מרשת חסומה' }, undefined, ipHeader(blockedIp));
  const blockedMember = await add({ p_body: 'חבר מרשת חסומה' }, ta, ipHeader(blockedIp));
  check('comments', block.status < 300 && refused(blockedGuest, 'community_write_blocked') && blockedMember.status === 200, 'a blocked network cannot write as a guest, but a signed-in member on the same network can', `${blockedGuest.status} ${message(blockedGuest)} / member ${blockedMember.status}`);
  await asService('PATCH', `community_net_blocks?net_ref=eq.${netRef(blockedIp)}`, { lifted_at: new Date().toISOString(), lifted_by: adm.id, lift_reason: 'QA lifted' });
  const liftedGuest = await add({ p_body: 'אחרי הסרת החסימה' }, undefined, ipHeader(blockedIp));
  check('comments', liftedGuest.status === 200, 'lifting the block lets the network write again', `status=${liftedGuest.status}`);

  // ── Comments: edit, delete, stranger ──
  const edit = await rpc('edit_contribution', { p_id: c1, p_body: 'תגובה ראשונה, ערוכה' }, ta);
  const edited = await one(c1);
  check('comments', edit.status < 300 && edited?.body === 'תגובה ראשונה, ערוכה' && !!edited?.edited_at, 'the author edits their comment: the text and the edit time change, and a guest reads the new text', `status=${edit.status}`);
  const history = await asService('GET', `research_contribution_edits?contribution_id=eq.${c1}&select=body`);
  check('comments', history.body?.length === 1 && history.body[0].body === 'תגובה ראשונה מחבר א׳', 'the previous text is kept in the edit history, which no member can read', `rows=${history.body?.length}`);
  const memberHistory = await call('GET', `research_contribution_edits?contribution_id=eq.${c1}&select=body`, ta);
  check('comments', memberHistory.status >= 400 || (memberHistory.body || []).length === 0, 'the edit history is closed to members', `status=${memberHistory.status}`);
  const strangerEdit = await rpc('edit_contribution', { p_id: c1, p_body: 'נפרצה' }, tb);
  const strangerRemove = await rpc('remove_contribution', { p_id: c1 }, tb);
  const adminEdit = await rpc('edit_contribution', { p_id: c1, p_body: 'מנהל משכתב' }, tadm);
  check('comments', refused(strangerEdit) && refused(strangerRemove) && (await one(c1))?.body === 'תגובה ראשונה, ערוכה' && (await one(c1))?.status === 'approved', 'a stranger cannot edit or delete another member\'s comment', `${strangerEdit.status}/${strangerRemove.status}`);
  check('comments', refused(adminEdit, 'not authorized') && (await one(c1))?.body === 'תגובה ראשונה, ערוכה', 'the administrator cannot rewrite a member\'s community comment through the edit function (only the author can)', `${adminEdit.status} ${message(adminEdit)}`);
  const noChange = await rpc('edit_contribution', { p_id: c1, p_body: '   ' }, ta);
  check('comments', refused(noChange), 'an edit to an empty text is refused and the comment is unchanged', `status=${noChange.status}`);
  // likes need an intact chain: make the reactions target now, delete the first comment afterwards
  const likeRoot = (await add({ p_body: 'תגובה לבדיקת לייקים' }, tb)).body;
  const likeReply = (await add({ p_body: 'תשובה בתוך הענף', p_parent_id: likeRoot }, tc)).body;

  // ── Likes and dislikes ──
  const reactions = async (id, token) => (await one(id, token, 'id,reactions'))?.reactions ?? null;
  const like1 = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👍' }, ta);
  const afterLike = await reactions(likeRoot);
  check('likes', like1.status === 200 && Array.isArray(afterLike?.['👍']) && afterLike['👍'].length === 1 && like1.body?.['👍']?.length === 1, 'member A likes a comment: the function returns the new list and a guest reads one like', `status=${like1.status}`);
  const like2 = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👍' }, tc);
  check('likes', like2.status === 200 && (await reactions(likeRoot))['👍'].length === 2, 'a like from a second account is counted separately (two likes)');
  check('likes', (await reactions(likeRoot, await login(a)))['👍'].length === 2, 'after a fresh sign-in the counter still reads two');
  const unlike = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👍' }, ta);
  const afterUnlike = await reactions(likeRoot);
  check('likes', unlike.status === 200 && afterUnlike['👍'].length === 1 && !afterUnlike['👍'].includes(a.id) && afterUnlike['👍'].includes(c.id), 'the same member pressing again removes only their own like', `likes=${afterUnlike['👍']?.length}`);
  check('likes', afterLike['👍'].includes(a.id), 'observation for the owner: the public reaction list holds the account ids of the members who reacted (the page uses it to mark "my like"), so a guest can read who liked');
  const guestKey = `qa-visitor-${randomBytes(4).toString('hex')}`;
  const guestIp2 = octet(4);
  const guestLike = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🔥', p_visitor: guestKey }, undefined, ipHeader(guestIp2));
  const guestLikeAfter = await reactions(likeRoot);
  check('likes', guestLike.status === 200 && guestLikeAfter['🔥']?.includes(`v:${guestKey}`), 'a guest can react with a browser identity when the platform address header is present', `status=${guestLike.status}`);
  const guestUnlike = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🔥', p_visitor: guestKey }, undefined, ipHeader(guestIp2));
  check('likes', guestUnlike.status === 200 && (await reactions(likeRoot))['🔥'].length === 0, 'the same guest identity pressing again removes it');
  const guestNoIp = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🔥', p_visitor: guestKey });
  const guestNoIdentity = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🔥' }, undefined, ipHeader(octet(5)));
  check('likes', refused(guestNoIp, 'rate_limited') && refused(guestNoIdentity, 'no identity'), 'a guest reaction without the address header, or without an identity, is refused', `${message(guestNoIp)} / ${message(guestNoIdentity)}`);
  const blockedNet = octet(6);
  const block2 = await asService('POST', 'community_net_blocks', { net_ref: netRef(blockedNet), duration_kind: 'd3', created_by: adm.id, reason: 'QA synthetic reaction block', expires_at: new Date(Date.now() + 86400000).toISOString() }, { prefer: 'return=minimal' });
  const guestBlocked = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👍', p_visitor: guestKey }, undefined, ipHeader(blockedNet));
  const memberBlockedNet = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '💡' }, tb, ipHeader(blockedNet));
  check('likes', block2.status < 300 && refused(guestBlocked, 'community_write_blocked') && memberBlockedNet.status === 200, 'a guest reaction from a blocked network is refused, while a signed-in member on the same network is never blocked', `${guestBlocked.status} ${message(guestBlocked)} / member ${memberBlockedNet.status}`);
  const badEmoji = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🤔' }, ta);
  const plainDislike = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👎' }, ta);
  check('likes', refused(badEmoji, 'bad emoji') && refused(plainDislike, 'bad emoji'), 'an unknown emoji and a dislike outside the dislike channel are refused', `${message(badEmoji)} / ${message(plainDislike)}`);
  // repeatable like and dislike (the community counters)
  const rep = [];
  for (let i = 0; i < 3; i++) rep.push(await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👍', p_visitor: 'community-repeatable-like' }, tb));
  const dis = [];
  for (let i = 0; i < 2; i++) dis.push(await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '👎', p_visitor: 'community-repeatable-dislike' }, tc));
  const counters = await reactions(likeRoot);
  check('likes', rep.every((r) => r.status === 200) && counters.community_likes === 3 && dis.every((r) => r.status === 200) && counters.community_dislikes === 2, 'the repeatable like adds one each press (3) and the repeatable dislike counts apart (2): they are never undone by pressing again', `likes=${counters.community_likes} dislikes=${counters.community_dislikes}`);
  check('likes', counters['👍'].length === 1 && (await reactions(likeRoot, await login(b))).community_likes === 3, 'the repeatable counters and the per-account likes are separate and survive a reload');
  const wrongPair = await rpc('toggle_contribution_reaction', { p_id: likeRoot, p_emoji: '🔥', p_visitor: 'community-repeatable-like' }, ta);
  check('likes', refused(wrongPair, 'not found'), 'the repeatable channel only accepts its own emoji', `${message(wrongPair)}`);
  const onPending = await rpc('toggle_contribution_reaction', { p_id: q1, p_emoji: '👍' }, tb);
  check('likes', refused(onPending, 'not found') && (await one(q1, tadm))?.reactions?.['👍'] === undefined, 'a reaction on an unreviewed comment is refused and changes nothing', message(onPending));
  await rpc('moderate_contribution', { p_id: likeRoot, p_status: 'hidden' }, tadm);
  const onHiddenRoot = await rpc('toggle_contribution_reaction', { p_id: likeReply, p_emoji: '👍' }, ta);
  await rpc('moderate_contribution', { p_id: likeRoot, p_status: 'approved' }, tadm);
  const afterRestore = await rpc('toggle_contribution_reaction', { p_id: likeReply, p_emoji: '👍' }, ta);
  check('likes', refused(onHiddenRoot, 'not found') && afterRestore.status === 200, 'a reply under a hidden comment cannot be reacted to; once the comment is approved again it can', `${message(onHiddenRoot)} / ${afterRestore.status}`);

  // ── Delete and counters ──
  const parentCount = (await rpc('community_reply_counts', { p_ids: [likeRoot] })).body?.[0]?.reply_count;
  await rpc('moderate_contribution', { p_id: likeReply, p_status: 'hidden' }, tadm);
  const hiddenCount = (await rpc('community_reply_counts', { p_ids: [likeRoot] })).body ?? [];
  await rpc('moderate_contribution', { p_id: likeReply, p_status: 'approved' }, tadm);
  check('comments', parentCount === 1 && hiddenCount.length === 0 && (await rpc('community_reply_counts', { p_ids: [likeRoot] })).body?.[0]?.reply_count === 1, 'the reply counter drops to zero when the reply is hidden and returns when it is approved again', `${parentCount}/${hiddenCount.length}`);
  const deleted = await rpc('remove_contribution', { p_id: c1 }, ta);
  const tomb = await one(c1, tadm);
  const archive = await asService('GET', `research_contribution_deletions?contribution_id=eq.${c1}&select=body,deleted_by`);
  check('comments', deleted.status < 300 && tomb?.body === null && tomb?.status === 'hidden' && !!tomb?.deleted_at && (await one(c1)) === null, 'the author deletes their comment: the text is removed, the row is hidden from guests, and the administrator sees an empty tombstone', `status=${deleted.status}`);
  check('comments', archive.body?.length === 1 && archive.body[0].body === 'תגובה ראשונה, ערוכה' && archive.body[0].deleted_by === a.id, 'the deleted text is archived for the administrators, with who deleted it');
  check('comments', (await rpc('community_reply_counts', { p_ids: [c1] })).body?.find((r) => r.parent_id === c1)?.reply_count === 1, 'the live reply stays counted under the deleted comment (the tombstone keeps its place)');
  const reactDeleted = await rpc('toggle_contribution_reaction', { p_id: c2, p_emoji: '👍' }, tc);
  check('likes', refused(reactDeleted, 'not found'), 'a reaction on a reply whose parent was deleted is refused', message(reactDeleted));
  const removeAgain = await rpc('remove_contribution', { p_id: c1 }, ta);
  check('comments', removeAgain.status < 300, 'deleting an already deleted comment is harmless', `status=${removeAgain.status}`);
  const adminRemove = await rpc('remove_contribution', { p_id: c2 }, tadm);
  check('comments', adminRemove.status < 300 && (await one(c2)) === null && (await one(c2, tadm))?.body === null, 'the administrator can delete another member\'s community comment', `status=${adminRemove.status}`);

  // ── Follow ──
  const prefsOf = async (token) => (await call('GET', 'notification_prefs?select=topics,user_id', token)).body ?? [];
  const f1 = await rpc('watch_toggle', { p_topic: 'number:1820', p_source: 'qa', p_on: true }, ta);
  const state1 = await rpc('follow_subject_state', { p_entity_type: 'number', p_stable_id: '1820' }, ta);
  check('follow', f1.status === 200 && f1.body?.following === true && f1.body?.topic === 'number:1820' && state1.body?.following === true, 'member A follows a number: the function answers following, and the state function agrees', JSON.stringify(f1.body));
  const mine = await prefsOf(ta), others = await prefsOf(tb);
  check('follow', mine.length === 1 && mine[0].topics.includes('number:1820') && !others.some((r) => r.user_id === a.id), 'the follow is stored on the account and invisible to another member');
  const reloadedState = await rpc('follow_subject_state', { p_entity_type: 'number', p_stable_id: '1820' }, await login(a));
  check('follow', reloadedState.body?.following === true, 'after a fresh sign-in the follow is still there (persistence)');
  const alias = await rpc('watch_toggle', { p_topic: 'num_1820', p_source: 'qa', p_on: true }, ta);
  const aliasPrefs = await prefsOf(ta);
  check('follow', alias.status === 200 && aliasPrefs[0].topics.filter((t) => t === 'number:1820' || t === 'num_1820').length === 1, 'following the old spelling of the same number does not duplicate the follow', JSON.stringify(aliasPrefs[0]?.topics));
  const unfollow = await rpc('watch_toggle', { p_topic: 'number:1820', p_source: 'qa', p_on: false }, ta);
  const stateOff = await rpc('follow_subject_state', { p_entity_type: 'number', p_stable_id: '1820' }, ta);
  check('follow', unfollow.status === 200 && unfollow.body?.following === false && stateOff.body?.following === false && (await prefsOf(ta))[0].topics.length === 0, 'unfollow clears it, and the cleared state persists after a reload', JSON.stringify(unfollow.body));
  const events = await call('GET', 'subscribe_events?select=action,topic&order=created_at.asc', ta);
  check('follow', events.body?.map((e) => e.action).join(',') === 'follow,unfollow' && (await call('GET', 'subscribe_events?select=id', tb)).body?.length === 0 && denied(await call('GET', 'subscribe_events?select=id')), 'the follow history (follow, unfollow) is readable only by its owner', JSON.stringify(events.body));
  const badSubject = await rpc('follow_subject_state', { p_entity_type: 'bogus', p_stable_id: 'x' }, ta), emptyTopic = await rpc('watch_toggle', { p_topic: '  ', p_source: 'qa', p_on: true }, ta);
  check('follow', refused(badSubject, 'unsupported follow subject') && refused(emptyTopic, 'bad topic'), 'an unsupported subject and an empty topic are refused', `${message(badSubject)} / ${message(emptyTopic)}`);
  const visitor = `qa-visitor-${randomBytes(4).toString('hex')}`, otherVisitor = `qa-visitor-${randomBytes(4).toString('hex')}`;
  const guestFollow = await rpc('watch_toggle', { p_topic: 'number:42', p_source: 'qa', p_on: true, p_visitor: visitor });
  const guestState = await rpc('follow_subject_state', { p_entity_type: 'number', p_stable_id: '42', p_visitor: visitor }), otherState = await rpc('follow_subject_state', { p_entity_type: 'number', p_stable_id: '42', p_visitor: otherVisitor });
  check('follow', guestFollow.status === 200 && guestState.body?.following === true && otherState.body?.following === false, 'a guest follow is kept on the browser identity and does not leak to another browser', JSON.stringify(guestFollow.body));
  const rawPrefs = await call('GET', 'notification_prefs?select=topics');
  check('follow', denied(rawPrefs) || (rawPrefs.body || []).length === 0, 'a guest cannot read the preferences table', `status=${rawPrefs.status}`);
  const noIdentity = await rpc('watch_toggle', { p_topic: 'number:43', p_source: 'qa', p_on: true });
  check('follow', refused(noIdentity, 'no identity'), 'a follow with neither an account nor a browser identity is refused', message(noIdentity));
  // the guest becomes an account holder: the proven identity edge carries the follow over and the guest row is removed
  const person = await asService('POST', 'persons', { account_user_id: b.id, first_source: 'qa' }, { prefer: 'return=representation' });
  const personId = person.body?.[0]?.person_id;
  const edge = await asService('POST', 'identity_edges', { sod_id: `qa-sod-${randomBytes(4).toString('hex')}`, person_id: personId, kind: 'legacy_seed', legacy_id: visitor }, { prefer: 'return=minimal' });
  const claimed = await prefsOf(tb);
  const guestPrefRow = await asService('GET', `notification_prefs?visitor_id=eq.${visitor}&select=id`);
  check('follow', person.status < 300 && edge.status < 300 && claimed.some((r) => r.user_id === b.id && r.topics.includes('number:42')) && guestPrefRow.body?.length === 0, 'a guest follow carries over to the account once the browser identity is proven, and the guest row is removed', `${person.status}/${edge.status}`);
  const routed = await rpc('watch_toggle', { p_topic: 'number:44', p_source: 'qa', p_on: true, p_visitor: visitor });
  check('follow', routed.status === 200 && routed.body?.claimed_account === true && (await prefsOf(tb))[0].topics.includes('number:44'), 'a later follow from that browser goes straight to the account', JSON.stringify(routed.body));
  // community thread follow (the explicit source that needs an account and a public root)
  const threadOk = await rpc('watch_toggle', { p_topic: `thread:${likeRoot}`, p_source: 'community_thread', p_on: true }, ta);
  const threadGuest = await rpc('watch_toggle', { p_topic: `thread:${likeRoot}`, p_source: 'community_thread', p_on: true, p_visitor: visitor });
  const threadPending = await rpc('watch_toggle', { p_topic: `thread:${q1}`, p_source: 'community_thread', p_on: true }, ta);
  const threadBad = await rpc('watch_toggle', { p_topic: 'thread:not-a-uuid', p_source: 'community_thread', p_on: true }, ta);
  check('follow', threadOk.status === 200 && threadOk.body?.following === true && refused(threadGuest) && refused(threadPending, 'public thread unavailable') && refused(threadBad, 'invalid community thread'), 'a community thread can be followed by an account when its root is public; a guest, an unreviewed root and a malformed id are refused', `${threadOk.status}/${threadGuest.status}/${message(threadPending)}/${message(threadBad)}`);
  const threadOff = await rpc('watch_toggle', { p_topic: `thread:${likeRoot}`, p_source: 'community_thread', p_on: false }, ta);
  check('follow', threadOff.status === 200 && threadOff.body?.following === false, 'the thread follow can be removed', JSON.stringify(threadOff.body));

  function denied(r) { return r.status >= 400; }
}
