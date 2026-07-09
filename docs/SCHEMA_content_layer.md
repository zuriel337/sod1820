# SOD1820 — סכימת שכבת-התוכן (ל-AI Tools / Function Calling)

> **מה מותר לקריאה (read-only):** רק הטבלאות כאן — שכבת התוכן/הגרף. **בלי** מיילים, וואטסאפ (`wa_*`), auth, לוגים, `research_leads`, Vault.
> העמודות למטה = מה שרלוונטי לניתוח. עמודות רגישות (`phrase_encrypted`, `created_by`, `vip_source`, `fb_*`) — לא נחשפות.

## `gematria_words` — הליבה (כל ביטוי + 14 ערכי-שיטות)
`phrase` (טקסט) · `ragil` (int) — ואז שאר השיטות. **מיפוי עמודה → שם-שיטה בעברית:**
| עמודה | שיטה |
|---|---|
| `ragil` | רגיל |
| `misratar` | מסתתר |
| `kadmi` | קדמי (=משולש) |
| `miluy` | מילוי |
| `gadol` | גדול |
| `siduri` | סידורי |
| `atbash` | אתבש |
| `albam` | אלבם |
| `ribua` | ריבוע |
| `ribua_gadol` | ריבוע גדול |
| `kadmi_gadol` | משולש גדול |
| `hakpala` | הכפלה |
| `hakpala_gadol` | הכפלה גדולה |
| `miluy_demiluy` | מילוי דמילוי |

מטא: `all_values` (int[] — כל הערכים לסינון) · `category` · `source` · `tags` (text[]) · `is_verified` (bool) · `visibility_tier` (smallint) · `lead_rank` (smallint — סדר קנוני) · `node_id` (→ nodes).

## `nodes` — צמתי הגרף + חוקי המערכת
`id` (uuid) · `type` (number/entity/convergence/post/word/rule…) · `rule_id` (טקסט — לחוקים) · `label` · `description` · `metadata` (jsonb) · `is_active` (bool) · `weight`.

## `edges` — הקשרים בגרף (עץ אחד)
`from_node` (uuid) · `to_node` (uuid) · `relation_type` (טקסט) · `weight` (float) · `metadata` (jsonb).

## `posts` — פוסטים
`id` · `title` · `slug` · `excerpt` · `date` · `categories` (text[]) · `tags` (text[]) · `author` · `source` (ai/…) · `has_1820` (bool) · `convergence_score` · `ai_number`.

## `topic_cards` — התכנסויות (שכבת ההתכנסות)
`slug` · `title` · `subtitle` · `numbers` (int[]) · `highlight_numbers` (int[]) · `findings` (jsonb) · `status` · `quality` (smallint) · `meter_score` (int) · `occurred_at` (date).

## `insights` — חידושים
`title` · `body` · `related_numbers` (int[]) · `related_phrases` (text[]) · `origin` (ai/system…) · `convergence_score` · `has_1820` (bool) · `gematria_pairs` (jsonb) · `source_ref`.

---

## הכלים (Tools) המומלצים — SELECT-only RPCs
במקום גישה גולמית לטבלאות, חושפים **פונקציות-קריאה מאושרות**. חלקן **כבר קיימות** במערכת:
| Tool | קיים? | מה מחזיר |
|---|---|---|
| `get_parallels(value)` | ✅ `getAllValuePhrases` | כל הביטויים בערך רגיל נתון |
| `get_value_families(value)` | ✅ `getValueFamilies` | ביטויים שווים בכל שיטה (מ-bidim) |
| `get_top_values()` | ✅ `top_primary_values` | המספרים הפופולריים (אנליטיקה מצוברת) |
| `get_entity(term)` | ✅ `getEntityBundle` | חבילת הישות המלאה (ערכים+גרף) |
| `get_gematria_row(phrase)` | 🔶 חדש | שורת 14 השיטות לביטוי |
| `get_graph_neighbors(node_id)` | 🔶 חדש | שכנים בגרף (edges) |
