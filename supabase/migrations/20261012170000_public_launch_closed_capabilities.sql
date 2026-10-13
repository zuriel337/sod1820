-- Public launch availability. These rows extend site_flags_lock_law v3.
-- The explicit server/client gates fail closed while the rows are absent.
-- Opening either capability later requires a separate reviewed flag change.
insert into public.site_flags (key, enabled, mode, message)
values
  ('lock_heichal', true, 'all', 'ההיכל נמצא בהכנה וייפתח לאחר השלמת האימות.'),
  ('lock_world', true, 'all', 'העולם נמצא בהכנה וייפתח לאחר השלמת בדיקות המקורות.'),
  ('lock_raziel_site', true, 'all', 'רזיאל באתר נמצא בהכנה וייפתח לאחר השלמת האימות.'),
  ('lock_life_journey', true, 'all', 'המסע האישי נמצא בהכנה וייפתח לאחר השלמת ההגדרות.'),
  ('lock_books', true, 'all', 'אזור הספרים נמצא בהכנה וייפתח לאחר השלמת הבדיקה.'),
  ('lock_number', true, 'all', 'דף המספר נמצא בהכנה וייפתח בהמשך.')
on conflict (key) do update
set enabled = true, mode = 'all', message = excluded.message;
