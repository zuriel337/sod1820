-- PROPOSAL ONLY (ZURIEL request 12.11.2026): add Esther (users.id 9196e2b4-…, username eftgem, "Esther Gem") to the chat staff.
-- Effect: community_moderator=true → «צוות» label AND the moderator powers that flag carries today (e.g. deleting messages).
update public.users set community_moderator = true
 where id = '9196e2b4-6473-4d44-9bad-913a4e4c4865' and community_moderator is distinct from true
returning id, username, display_name, community_moderator;
-- ROLLBACK: update public.users set community_moderator = false where id = '9196e2b4-6473-4d44-9bad-913a4e4c4865';
