-- SOD1820 Book Identity Projection Foundation v1
-- Human Gate: ZURIEL · 2026-09-05
-- Extends existing entity_types + nodes only.
-- Book ≠ Edition ≠ Witness ≠ Digital Object ≠ Page/Region.
-- No Book Store/Graph/Engine/Workspace and no canonical spatial coordinates.

insert into public.entity_types (type,label,parent,icon,tabs,relations,stats,route_pattern,description,is_active,sort)
select 'book','ספר','entity','📚',array['overview','source','structure','research','relations','spatial','ai'],array['source','research','graph'],array['pages','research','open_questions','updated'],'/book/:slug','ספר/חיבור כמושא מחקר first-class. Book identity נפרדת מ-Edition/Witness/Digital Object/Page; שכבות המקור נשמרות ב-Research Context וב-provenance.',true,13
where not exists (select 1 from public.entity_types where type='book');

insert into public.nodes (type,label,description,metadata,is_active,identity_key)
select 'book','אהבת תורה','ספר מחקר — אהבת תורה',jsonb_build_object(
  'space','core','slug','ahavat-torah','route','/book/ahavat-torah',
  'identity_tiers',jsonb_build_object(
    'book',jsonb_build_object('identity_key','book:ahavat-torah','title','אהבת תורה'),
    'edition',jsonb_build_object('status','bibliographic_metadata_partial'),
    'witness',jsonb_build_object('provider','HebrewBooks','native_id','5635','identity','witness:hebrewbooks:5635'),
    'digital_object',jsonb_build_object('bucket','gallery','path','Book/Hebrewbooks_org_5635.pdf','mime','application/pdf'),
    'locator',jsonb_build_object('kind','pdf_page_block','pattern','book:hebrewbooks:5635#p<PDF_PAGE>:<BLOCK_ID>')
  ),
  'source_ref_prefixes',jsonb_build_array('book:hebrewbooks:5635','hebrewbooks:5635'),
  'page_count',99,
  'projection',jsonb_build_object('supports',jsonb_build_array('2d','layered','3d'),'canonical_coordinates',false)
),true,'book:ahavat-torah'
where not exists (select 1 from public.nodes where type='book' and identity_key='book:ahavat-torah');

insert into public.nodes (type,label,description,metadata,is_active,identity_key)
select 'book','ספר הפליאה','ספר מחקר — ספר הפליאה',jsonb_build_object(
  'space','core','slug','sefer-hapliah','route','/book/sefer-hapliah',
  'identity_tiers',jsonb_build_object(
    'book',jsonb_build_object('identity_key','book:sefer-hapliah','title','ספר הפליאה'),
    'edition',jsonb_build_object('status','edition_identity_not_promoted_here'),
    'witness',jsonb_build_object('provider','HebrewBooks','native_id','6355','identity','witness:hebrewbooks:6355'),
    'digital_object',jsonb_build_object('bucket','gallery','path','Book/Hebrewbooks_org_6355.pdf','mime','application/pdf'),
    'locator',jsonb_build_object('kind','pdf_page_region','pattern','hebrewbooks:6355#p<PDF_PAGE>:<REGION>')
  ),
  'source_ref_prefixes',jsonb_build_array('hebrewbooks:6355','book:hebrewbooks:6355'),
  'page_count',327,
  'projection',jsonb_build_object('supports',jsonb_build_array('2d','layered','3d'),'canonical_coordinates',false)
),true,'book:sefer-hapliah'
where not exists (select 1 from public.nodes where type='book' and identity_key='book:sefer-hapliah');
