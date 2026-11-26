-- D3b-rollback · החזרה של הבחירה הראשונית בלבד. מוגנת: מוחקת את שורת הדגל רק אם ההודעה עדיין זהה בדיוק לטקסט ש-D3b כתב (אותו מערך JSON, אותם מזהים ואותן שיטות).
-- אם מנהל בחר מאז משהו אחר דרך D3 (או ביטל), ההודעה שונה, לא נמחקת שורה, והמנהל רואה 0 שורות. אין כאן שום כתיבה אחרת.
DO $$
DECLARE n integer;
BEGIN
  DELETE FROM public.site_flags
   WHERE key = 'home_featured_discovery' AND enabled
     AND message = '[{"id": "d057b2cf-c50b-4f4c-9e22-f3ff90ec008b", "method": "ריבוע"}, {"id": "b3fff8e8-2c77-45dc-ad1e-7b72eb352298", "method": "מילוי"}]';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'D3b rollback: % row(s) removed (0 = a later admin selection exists and was left untouched)', n;
END $$;
