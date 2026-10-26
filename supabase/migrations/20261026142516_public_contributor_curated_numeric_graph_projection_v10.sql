-- PUBLIC CONTRIBUTOR CURATED NUMERIC GRAPH PROJECTION v10
--
-- Human Gate: ZURIEL approved continued admission of public writer material
-- on 2026-10-26. This bounded batch projects only exact, already-approved
-- contributions by Zvi and Ariel whose complete numeric claim set was replayed
-- through the canonical method registry and whose destinations are existing,
-- unique, active public number nodes.
--
-- The contribution remains the attributed source. Numeric equality is the only
-- verified scope; interpretation remains attributed commentary. Curated writer
-- rows are not counted as additional independent source occurrences. No source
-- row, status, privacy field or authored text is changed or deleted.
--
-- Explicitly excluded from this batch:
--   * three Zvi rows containing a deterministic contradiction;
--   * one ambiguous verse-fragment equality and one unsourced frequency claim;
--   * acrostic/phrase-only material without a numeric destination;
--   * Shimon rows whose public source still says raw/verified=false;
--   * ELS, interpretation-only and general essay material.

DO $batch$
DECLARE
  v_admin_id uuid;
  v_admin_count integer;
  v_selected_count integer;
  v_ready_count integer;
  v_author_count integer;
  v_target_count integer;
  v_distinct_target_count integer;
  v_claim_count integer;
  v_claim_match_count integer;
  v_formula_count integer;
  v_formula_match_count integer;
  v_target_cardinality_count integer;
  v_claim_cardinality_count integer;
  v_formula_cardinality_count integer;
  v_number_nodes_before integer;
  v_number_nodes_after integer;
  v_processed_sources integer := 0;
  v_processed_edges integer := 0;
  v_row_digest text;
  v_claims_digest text;
  v_formulas_digest text;
  v_targets_digest text;
  v_projected_node_id uuid;
  v_row record;
  v_target_row record;
BEGIN
  SELECT count(*), min(id::text)::uuid
  INTO v_admin_count, v_admin_id
  FROM public.users
  WHERE role = 'admin';

  IF v_admin_count <> 1 OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'expected exactly one canonical admin, found %', v_admin_count;
  END IF;

  LOCK TABLE public.research_contributions IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.contributors IN SHARE MODE;
  LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.edges IN SHARE ROW EXCLUSIVE MODE;

  CREATE TEMP TABLE _curated_writer_selected_v10 (
    id uuid PRIMARY KEY,
    contributor_id uuid NOT NULL,
    expected_status text NOT NULL,
    expected_research_state text NOT NULL,
    expected_intent text NOT NULL,
    expected_target_count integer NOT NULL,
    expected_claim_count integer NOT NULL,
    expected_formula_count integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _curated_writer_selected_v10
    (id, contributor_id, expected_status, expected_research_state, expected_intent,
     expected_target_count, expected_claim_count, expected_formula_count)
  VALUES
    ('069740be-fd6c-4f2d-8661-6a2423e75638','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,7,0),
    ('0fdd031c-58c3-41a6-b3f0-a5f325cda616','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,4,2),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,3,1),
    ('15781a93-58b8-4038-920b-02e51970fc7e','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,7,3),
    ('18564cbb-8f70-458f-8c7e-42a8b9402776','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,3,0),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,5,1),
    ('2a900812-da8f-4e8b-8a68-af612b59bdd5','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,6,3),
    ('38c3eb45-4f57-4aac-8001-8144f13c34c1','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('5aca2a7c-bd0c-4c20-9a01-56a5a2062d90','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,3,0),
    ('5d070abc-3a44-466f-b93e-15cd76966c17','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,1),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,7,0),
    ('86c16987-25e7-4307-9286-107fd604354a','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('955f5157-d370-4dfc-9e59-9b0dd8efe19c','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,3,1),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,5,3),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,3,1),
    ('d69e5193-5b74-4829-ae2c-5b84dcfea685','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,2,0),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,5,1),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','gematria',1,6,3),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','c66f0464-0928-490e-be9b-66d8a87e7fc8','approved','validated','חידוש',1,10,3),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','0999ac77-8efe-4282-907e-d2a561fca133','approved','validated','חידוש',4,8,0);

  CREATE TEMP TABLE _curated_writer_targets_v10 (
    finding_id uuid NOT NULL REFERENCES _curated_writer_selected_v10(id),
    expected integer NOT NULL,
    PRIMARY KEY (finding_id, expected)
  ) ON COMMIT DROP;

  INSERT INTO _curated_writer_targets_v10 (finding_id, expected)
  VALUES
    ('069740be-fd6c-4f2d-8661-6a2423e75638',119),
    ('0fdd031c-58c3-41a6-b3f0-a5f325cda616',610),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6',504),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028',786),
    ('15781a93-58b8-4038-920b-02e51970fc7e',238),
    ('18564cbb-8f70-458f-8c7e-42a8b9402776',702),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81',131),
    ('2a900812-da8f-4e8b-8a68-af612b59bdd5',336),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a',102),
    ('38c3eb45-4f57-4aac-8001-8144f13c34c1',560),
    ('5aca2a7c-bd0c-4c20-9a01-56a5a2062d90',102),
    ('5d070abc-3a44-466f-b93e-15cd76966c17',306),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09',448),
    ('86c16987-25e7-4307-9286-107fd604354a',142),
    ('955f5157-d370-4dfc-9e59-9b0dd8efe19c',238),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02',204),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5',112),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd',358),
    ('d69e5193-5b74-4829-ae2c-5b84dcfea685',786),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b',102),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65',254),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073',1020),
    ('aa14df60-9cc1-4703-a653-8754c34c301e',337),
    ('aa14df60-9cc1-4703-a653-8754c34c301e',68),
    ('aa14df60-9cc1-4703-a653-8754c34c301e',287),
    ('aa14df60-9cc1-4703-a653-8754c34c301e',292);

  CREATE TEMP TABLE _curated_writer_claims_v10 (
    finding_id uuid NOT NULL REFERENCES _curated_writer_selected_v10(id),
    method text NOT NULL,
    phrase text NOT NULL,
    expected integer NOT NULL,
    PRIMARY KEY (finding_id, method, phrase)
  ) ON COMMIT DROP;

  INSERT INTO _curated_writer_claims_v10 (finding_id, method, phrase, expected)
  VALUES
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','מעט',119),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','דמעה',119),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','אביונים',119),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','ויבכו בכי גדול',119),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','הנה יום בא',119),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','עוד מעט',199),
    ('069740be-fd6c-4f2d-8661-6a2423e75638','רגיל','צדקה',199),
    ('0fdd031c-58c3-41a6-b3f0-a5f325cda616','רגיל','והיה אור הלבנה כאור החמה',610),
    ('0fdd031c-58c3-41a6-b3f0-a5f325cda616','רגיל','ומחץ מכתו',610),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','רגיל','רחל',238),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','רגיל','חברון',266),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','רגיל','כח',28),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','רגיל','חי',18),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028','רגיל','עתיק יומין',696),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028','רגיל','צ',90),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028','רגיל','תשפו',786),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','דמעה',119),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','רחל',238),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','חסד עליון',238),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','חצצן',238),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','חסד',72),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','סוד',70),
    ('15781a93-58b8-4038-920b-02e51970fc7e','רגיל','מאנה',96),
    ('18564cbb-8f70-458f-8c7e-42a8b9402776','רגיל','שבע יפול צדיק',702),
    ('18564cbb-8f70-458f-8c7e-42a8b9402776','רגיל','שבת',702),
    ('18564cbb-8f70-458f-8c7e-42a8b9402776','רגיל','ליהודה נחשון בן עמינדב',702),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','רגיל','מצא',131),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','רגיל','צמא',131),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','רגיל','אמץ',131),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','רגיל','אמונה',102),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','רגיל','יבטח',29),
    ('2a900812-da8f-4e8b-8a68-af612b59bdd5','רגיל','צבי לצדיק',336),
    ('2a900812-da8f-4e8b-8a68-af612b59bdd5','רגיל','פורים',336),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','נא',51),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','אמונה',102),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','צבי',102),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','אגג',7),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','המן',95),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','רגיל','טוב',17),
    ('38c3eb45-4f57-4aac-8001-8144f13c34c1','רגיל','ישרים',560),
    ('38c3eb45-4f57-4aac-8001-8144f13c34c1','רגיל','אבות העולם',560),
    ('5aca2a7c-bd0c-4c20-9a01-56a5a2062d90','אתבש','משה',102),
    ('5aca2a7c-bd0c-4c20-9a01-56a5a2062d90','רגיל','צבי',102),
    ('5aca2a7c-bd0c-4c20-9a01-56a5a2062d90','רגיל','עבד יהוה',102),
    ('5d070abc-3a44-466f-b93e-15cd76966c17','רגיל','צבי',102),
    ('5d070abc-3a44-466f-b93e-15cd76966c17','רגיל','מודה אני לפניך',306),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','להגיד בבקר חסדך',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','מלך משיח',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','כח הקדושה',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','התחלה',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','ויושיעום',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','ירוצו ולא ייגעו',448),
    ('7f655179-8eb2-43fd-8604-0029f72cfa09','רגיל','הקשיבה יהוה',448),
    ('86c16987-25e7-4307-9286-107fd604354a','רגיל','םקב',142),
    ('86c16987-25e7-4307-9286-107fd604354a','רגיל','בלעם',142),
    ('955f5157-d370-4dfc-9e59-9b0dd8efe19c','רגיל','ויהי אור',238),
    ('955f5157-d370-4dfc-9e59-9b0dd8efe19c','רגיל','רחל',238),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02','רגיל','צדיק',204),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02','רגיל','צבי',102),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02','רגיל','אמונה',102),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','רגיל','יבק',112),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','רגיל','אלהים',86),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','רגיל','יהוה',26),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','רגיל','תשפד',784),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','רגיל','וליהודים',111),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd','רגיל','רחל',238),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd','רגיל','אליהו הנביא',120),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd','רגיל','משיח',358),
    ('d69e5193-5b74-4829-ae2c-5b84dcfea685','רגיל','ברוך מחיה המתים',786),
    ('d69e5193-5b74-4829-ae2c-5b84dcfea685','רגיל','תשפו',786),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','רגיל','צבי',102),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','רגיל','אמונה',102),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','רגיל','וילון',102),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','רגיל','עבד יהוה',102),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','רגיל','מאוד',51),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','איהוה',27),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','ליהוה',56),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','פיהוה',106),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','אדני',65),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','רחום',254),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','רגיל','צדיקים',254),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','צבי',102),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','השגחה פרטית',1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','תורה אחת',1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','ובתורתו',1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','קשת',800),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','סוד',70),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','יהוה',26),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','קציר שערים',1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','קציר כתר',1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','רגיל','מעלפת ספירים',1020),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','שזל',337),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','רופאים',337),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','חכם',68),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','חיים',68),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','רופא',287),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','הרמבם',287),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','רפואה',292),
    ('aa14df60-9cc1-4703-a653-8754c34c301e','רגיל','דרך חיים',292);

  CREATE TEMP TABLE _curated_writer_formulas_v10 (
    finding_id uuid NOT NULL REFERENCES _curated_writer_selected_v10(id),
    label text NOT NULL,
    lhs integer NOT NULL,
    operator text NOT NULL CHECK (operator IN ('+', '*')),
    rhs integer NOT NULL,
    expected integer NOT NULL,
    PRIMARY KEY (finding_id, label)
  ) ON COMMIT DROP;

  INSERT INTO _curated_writer_formulas_v10
    (finding_id, label, lhs, operator, rhs, expected)
  VALUES
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','238+266',238,'+',266,504),
    ('13ab2129-804e-4435-91dc-322e0f5f8ee6','28*18',28,'*',18,504),
    ('15671cf4-6d8f-4bbd-a712-ba6006b44028','696+90',696,'+',90,786),
    ('15781a93-58b8-4038-920b-02e51970fc7e','119+119',119,'+',119,238),
    ('15781a93-58b8-4038-920b-02e51970fc7e','72+70',72,'+',70,142),
    ('15781a93-58b8-4038-920b-02e51970fc7e','142+96',142,'+',96,238),
    ('1e6ef86b-b8bc-407d-ac29-4c080e412c81','102+29',102,'+',29,131),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','51+51',51,'+',51,102),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','7+95',7,'+',95,102),
    ('343e021b-929d-41a9-8da2-5f1e6e14143a','6*17',6,'*',17,102),
    ('5d070abc-3a44-466f-b93e-15cd76966c17','102*3',102,'*',3,306),
    ('b5dc1100-0791-4185-8c39-0f31260bdc02','102+102',102,'+',102,204),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','86+26',86,'+',26,112),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','112*7',112,'*',7,784),
    ('be397e1e-c5bb-460f-8887-8a2c22d9f4f5','111+1',111,'+',1,112),
    ('bfac1d39-5277-4b07-81b1-7d6312e287fd','238+120',238,'+',120,358),
    ('ed9fe0bd-8d65-4a6d-abcc-5a657078940b','51+51',51,'+',51,102),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','27+56',27,'+',56,83),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','83+106',83,'+',106,189),
    ('ee8e879d-ca42-4c15-81df-e9f88769fb65','189+65',189,'+',65,254),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','102*10',102,'*',10,1020),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','1020+800',1020,'+',800,1820),
    ('de16de47-8d91-41ee-b36e-c0a3ba466073','70*26',70,'*',26,1820);

  CREATE TEMP TABLE _curated_writer_ready_v10
  ON COMMIT DROP
  AS
  SELECT
    selected.*,
    contribution.title,
    contribution.body,
    contribution.gematria_claim,
    contribution.origin,
    contribution.target_type,
    contribution.target_id,
    contributor.slug,
    contributor.display_name
  FROM _curated_writer_selected_v10 selected
  JOIN public.research_contributions contribution
    ON contribution.id = selected.id
   AND contribution.author_contributor_id = selected.contributor_id
   AND contribution.status = selected.expected_status
   AND contribution.research_state = selected.expected_research_state
   AND contribution.intent = selected.expected_intent
  JOIN public.contributors contributor
    ON contributor.id = selected.contributor_id
  WHERE contribution.deleted_at IS NULL
    AND contribution.graph_node_id IS NULL
    AND contribution.gematria_claim IS NOT NULL
    AND contributor.active IS TRUE
    AND contributor.locked IS NOT TRUE
    AND contributor.building IS NOT TRUE
    AND (
      nullif(btrim(contributor.dossier_settings ->> 'visibility'), '') IS NULL
      OR lower(contributor.dossier_settings ->> 'visibility') = 'public'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.nodes prior
      WHERE prior.type = 'contribution'
        AND prior.metadata ->> 'contribution_id' = selected.id::text
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.contribution_links extra_link
      WHERE extra_link.from_contribution_id = selected.id
    );

  CREATE TEMP TABLE _curated_writer_resolved_targets_v10
  ON COMMIT DROP
  AS
  SELECT target.finding_id, target.expected, node.id AS target_node_id
  FROM _curated_writer_targets_v10 target
  JOIN public.nodes node
    ON node.type = 'number'
   AND node.label = target.expected::text
   AND node.is_active IS TRUE
   AND coalesce(node.metadata ->> 'space', 'core') = 'core'
  WHERE (
    SELECT count(*) FROM public.nodes unique_target
    WHERE unique_target.type = 'number'
      AND unique_target.label = target.expected::text
  ) = 1;

  CREATE TEMP TABLE _curated_writer_checks_v10
  ON COMMIT DROP
  AS
  SELECT claims.*, public.fn_method_value(claims.method, claims.phrase) AS computed
  FROM _curated_writer_claims_v10 claims;

  CREATE TEMP TABLE _curated_writer_formula_checks_v10
  ON COMMIT DROP
  AS
  SELECT formulas.*,
    CASE formulas.operator
      WHEN '+' THEN formulas.lhs + formulas.rhs
      WHEN '*' THEN formulas.lhs * formulas.rhs
    END AS computed
  FROM _curated_writer_formulas_v10 formulas;

  SELECT count(*) INTO v_selected_count FROM _curated_writer_selected_v10;
  SELECT count(*), count(DISTINCT contributor_id)
  INTO v_ready_count, v_author_count
  FROM _curated_writer_ready_v10;
  SELECT count(*), count(DISTINCT target_node_id)
  INTO v_target_count, v_distinct_target_count
  FROM _curated_writer_resolved_targets_v10;
  SELECT count(*), count(*) FILTER (WHERE computed = expected)
  INTO v_claim_count, v_claim_match_count
  FROM _curated_writer_checks_v10;
  SELECT count(*), count(*) FILTER (WHERE computed = expected)
  INTO v_formula_count, v_formula_match_count
  FROM _curated_writer_formula_checks_v10;

  SELECT count(*) INTO v_target_cardinality_count
  FROM _curated_writer_selected_v10 selected
  LEFT JOIN (
    SELECT finding_id, count(*)::integer AS actual
    FROM _curated_writer_resolved_targets_v10 GROUP BY finding_id
  ) actual ON actual.finding_id = selected.id
  WHERE coalesce(actual.actual, 0) = selected.expected_target_count;

  SELECT count(*) INTO v_claim_cardinality_count
  FROM _curated_writer_selected_v10 selected
  LEFT JOIN (
    SELECT finding_id, count(*)::integer AS actual
    FROM _curated_writer_checks_v10 GROUP BY finding_id
  ) actual ON actual.finding_id = selected.id
  WHERE coalesce(actual.actual, 0) = selected.expected_claim_count;

  SELECT count(*) INTO v_formula_cardinality_count
  FROM _curated_writer_selected_v10 selected
  LEFT JOIN (
    SELECT finding_id, count(*)::integer AS actual
    FROM _curated_writer_formula_checks_v10 GROUP BY finding_id
  ) actual ON actual.finding_id = selected.id
  WHERE coalesce(actual.actual, 0) = selected.expected_formula_count;

  SELECT md5(string_agg(
    id::text || '|' || contributor_id::text || '|' || expected_status || '|' ||
    expected_research_state || '|' || expected_intent || '|' ||
    coalesce(title, '') || '|' || coalesce(body, '') || '|' ||
    coalesce(gematria_claim::text, '{}') || '|' || coalesce(origin, '') || '|' ||
    coalesce(target_type, '') || '|' || coalesce(target_id, '') || '|' ||
    slug || '|' || display_name,
    E'\n' ORDER BY id
  )) INTO v_row_digest
  FROM _curated_writer_ready_v10;

  SELECT md5(string_agg(
    finding_id::text || '|' || method || '|' || phrase || '|' || expected::text || '|' || computed::text,
    E'\n' ORDER BY finding_id, method, phrase
  )) INTO v_claims_digest
  FROM _curated_writer_checks_v10;

  SELECT md5(string_agg(
    finding_id::text || '|' || label || '|' || lhs::text || operator || rhs::text || '|' || expected::text || '|' || computed::text,
    E'\n' ORDER BY finding_id, label
  )) INTO v_formulas_digest
  FROM _curated_writer_formula_checks_v10;

  SELECT md5(string_agg(
    finding_id::text || '|' || expected::text || '|' || target_node_id::text,
    E'\n' ORDER BY finding_id, expected
  )) INTO v_targets_digest
  FROM _curated_writer_resolved_targets_v10;

  IF v_selected_count <> 23
     OR v_ready_count <> 23
     OR v_author_count <> 2
     OR v_target_count <> 26
     OR v_distinct_target_count <> 22
     OR v_claim_count <> 99
     OR v_claim_match_count <> 99
     OR v_formula_count <> 23
     OR v_formula_match_count <> 23
     OR v_target_cardinality_count <> 23
     OR v_claim_cardinality_count <> 23
     OR v_formula_cardinality_count <> 23
     OR v_row_digest <> '4fe4c12cdd81639948d527d703ecad5c'
     OR v_claims_digest <> '72bdb1316d5fe44edc2f038af8156b94'
     OR v_formulas_digest <> 'a816ab467c0e9481db3a07ca8d676af2'
     OR v_targets_digest <> '013ca2215344e17d7e64b7ad2e869ce3' THEN
    RAISE EXCEPTION
      'curated writer cohort drift: selected % ready % authors % targets %/% claims %/% formulas %/% cardinality %/%/% digests %/%/%/%',
      v_selected_count, v_ready_count, v_author_count, v_target_count, v_distinct_target_count,
      v_claim_count, v_claim_match_count, v_formula_count, v_formula_match_count,
      v_target_cardinality_count, v_claim_cardinality_count, v_formula_cardinality_count,
      v_row_digest, v_claims_digest, v_formulas_digest, v_targets_digest;
  END IF;

  SELECT count(*) INTO v_number_nodes_before
  FROM public.nodes WHERE type = 'number';

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  FOR v_row IN SELECT * FROM _curated_writer_ready_v10 ORDER BY id
  LOOP
    SELECT public.project_contribution_to_graph(v_row.id)
    INTO v_projected_node_id;

    IF v_projected_node_id IS NULL THEN
      RAISE EXCEPTION 'curated contribution projection returned no node for %', v_row.id;
    END IF;

    UPDATE public.nodes
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'world_projection_v10', jsonb_build_object(
        'human_gate', 'ZURIEL',
        'reviewed_at', '2026-10-26',
        'contributor_id', v_row.contributor_id,
        'target_node_ids', (
          SELECT jsonb_agg(target_node_id ORDER BY expected)
          FROM _curated_writer_resolved_targets_v10 target
          WHERE target.finding_id = v_row.id
        ),
        'verification_scope', 'numeric equality and explicit arithmetic only; interpretation remains attributed source material',
        'claim_count', v_row.expected_claim_count,
        'formula_count', v_row.expected_formula_count,
        'independent_source_counted', false,
        'provenance_role', 'curated_writer_source',
        'row_digest', v_row_digest,
        'claims_digest', v_claims_digest,
        'formulas_digest', v_formulas_digest,
        'targets_digest', v_targets_digest,
        'privacy_changed', false,
        'publication_changed', false,
        'source_text_changed', false
      )
    )
    WHERE id = v_projected_node_id
      AND type = 'contribution'
      AND metadata ->> 'contribution_id' = v_row.id::text
      AND coalesce(metadata ->> 'space', '') = 'core';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'curated contribution node failed closed for % / %', v_row.id, v_projected_node_id;
    END IF;

    FOR v_target_row IN
      SELECT * FROM _curated_writer_resolved_targets_v10
      WHERE finding_id = v_row.id
      ORDER BY expected
    LOOP
      PERFORM public.upsert_edge(
        v_projected_node_id,
        v_target_row.target_node_id,
        'contributes_to',
        jsonb_build_object(
          'via', 'verified_curated_writer_claim',
          'space', 'core',
          'independent_source_counted', false
        )
      );

      UPDATE public.edges
      SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'space', 'core',
        'independent_source_counted', false,
        'world_projection_v10', jsonb_build_object(
          'human_gate', 'ZURIEL',
          'reviewed_at', '2026-10-26',
          'expected', v_target_row.expected,
          'verification_scope', 'numeric equality only',
          'claims_digest', v_claims_digest,
          'formulas_digest', v_formulas_digest
        )
      )
      WHERE from_node = v_projected_node_id
        AND to_node = v_target_row.target_node_id
        AND relation_type = 'contributes_to';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'curated contribution edge failed closed for % / %', v_row.id, v_target_row.target_node_id;
      END IF;

      v_processed_edges := v_processed_edges + 1;
    END LOOP;

    v_processed_sources := v_processed_sources + 1;
  END LOOP;

  SELECT count(*) INTO v_number_nodes_after
  FROM public.nodes WHERE type = 'number';

  IF v_processed_sources <> 23
     OR v_processed_edges <> 26
     OR v_number_nodes_after <> v_number_nodes_before THEN
    RAISE EXCEPTION
      'curated projection postcondition failed: sources % edges % number nodes before/after %/%',
      v_processed_sources, v_processed_edges, v_number_nodes_before, v_number_nodes_after;
  END IF;

  IF (
    SELECT count(*)
    FROM _curated_writer_selected_v10 selected
    JOIN public.research_contributions contribution ON contribution.id = selected.id
    JOIN public.nodes source_node ON source_node.id = contribution.graph_node_id
    WHERE contribution.status = selected.expected_status
      AND contribution.research_state = selected.expected_research_state
      AND contribution.author_contributor_id = selected.contributor_id
      AND source_node.type = 'contribution'
      AND coalesce(source_node.metadata ->> 'space', '') = 'core'
      AND coalesce((source_node.metadata #>> '{world_projection_v10,privacy_changed}')::boolean, true) IS FALSE
      AND coalesce((source_node.metadata #>> '{world_projection_v10,publication_changed}')::boolean, true) IS FALSE
  ) <> 23 THEN
    RAISE EXCEPTION 'curated projection postcondition failed: all sources must preserve exact public identity and access state';
  END IF;

  IF (
    SELECT count(*)
    FROM _curated_writer_resolved_targets_v10 target
    JOIN public.research_contributions contribution ON contribution.id = target.finding_id
    JOIN public.edges relation
      ON relation.from_node = contribution.graph_node_id
     AND relation.to_node = target.target_node_id
     AND relation.relation_type = 'contributes_to'
    WHERE coalesce(relation.metadata ->> 'space', '') = 'core'
      AND coalesce((relation.metadata ->> 'independent_source_counted')::boolean, true) IS FALSE
  ) <> 26 THEN
    RAISE EXCEPTION 'curated projection postcondition failed: all exact targets must be connected without independent-source inflation';
  END IF;
END;
$batch$;
