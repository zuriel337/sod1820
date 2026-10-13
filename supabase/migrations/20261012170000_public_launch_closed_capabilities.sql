-- Public launch availability. These rows extend site_flags_lock_law v3.
-- The existing public World stays open by ZURIEL's cutover instruction.
-- The other named server/client launch gates fail closed while their rows are absent.
insert into public.site_flags (key, enabled, mode, message)
values
  ('lock_heichal', true, 'all', 'ההיכל נמצא בהכנה וייפתח לאחר השלמת האימות.'),
  ('lock_world', false, 'all', ''),
  ('lock_raziel_site', true, 'all', 'רזיאל באתר נמצא בהכנה וייפתח לאחר השלמת האימות.'),
  ('lock_life_journey', true, 'all', 'המסע האישי נמצא בהכנה וייפתח לאחר השלמת ההגדרות.'),
  ('lock_books', true, 'all', 'אזור הספרים נמצא בהכנה וייפתח לאחר השלמת הבדיקה.'),
  ('lock_number', true, 'all', 'דף המספר נמצא בהכנה וייפתח בהמשך.')
on conflict (key) do update
set enabled = excluded.enabled, mode = excluded.mode, message = excluded.message;
