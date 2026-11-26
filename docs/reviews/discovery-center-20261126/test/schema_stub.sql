-- A throwaway schema with only the columns the discovery readers use. Never a live project.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
CREATE TABLE gematria_words (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), phrase text, source text, created_at timestamptz DEFAULT now(), is_encrypted boolean DEFAULT false, is_verified boolean DEFAULT true, is_published boolean DEFAULT true,
  other_method text, ragil int, miluy int, ribua bigint, misratar int, gadol int);
CREATE TABLE gematria_methods (method_key text PRIMARY KEY, db_column text, active boolean, in_engine boolean, display_label text);
INSERT INTO gematria_methods VALUES ('רגיל','ragil',true,true,'רגיל'),('מילוי','miluy',true,true,'מילוי'),('ריבוע','ribua',true,true,'ריבוע (תצוגה)'),('מסתתר','misratar',true,true,'מסתתר'),('גדול','gadol',false,true,'גדול');
CREATE TABLE contributors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text, display_name text, kind text, wa_names text[], active boolean DEFAULT true, merged_into uuid, locked boolean, building boolean, dossier_settings jsonb, user_id uuid, trusted boolean);
CREATE TABLE site_flags (key text PRIMARY KEY, enabled boolean, message text, mode text, updated_at timestamptz);
CREATE TABLE research_contributions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now(), parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, status text, deleted_at timestamptz);
CREATE TABLE research_objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_ref text, created_at timestamptz DEFAULT now(), privacy_scope text, status text, meta jsonb, statement text);
CREATE TABLE channel_updates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contributor_id uuid, status text, expires_at timestamptz, created_at timestamptz DEFAULT now(), text text, seo_title text);
CREATE TABLE els_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text, visibility text, owner_user_id uuid, title text, description text, created_at timestamptz DEFAULT now());
CREATE TABLE posts (id serial PRIMARY KEY, date timestamptz, title text, excerpt text, tags text[], author text);
CREATE TABLE contributor_content (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contributor_id uuid, is_public boolean, is_personal boolean, title text, body text, created_at timestamptz DEFAULT now());
CREATE FUNCTION rd_is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('test.admin', true), ''), 'false')::boolean $$;
CREATE FUNCTION gematria_public_word_eligible(p uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM gematria_words WHERE id = p AND is_verified AND is_published) $$;
