-- החזרת D3: מסירת פונקציית הבחירה של המנהל. שורת site_flags של הבחירה (אם נכתבה) נשארת; להחזרתה ראו D3b-rollback.sql.
DROP FUNCTION IF EXISTS public.admin_set_home_featured_discovery_v1(jsonb);
