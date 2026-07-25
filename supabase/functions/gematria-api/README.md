# SOD1820 Gematria API — למפתחים / ללקוחות

API ציבורי לחישוב גימטריה עברית על בסיס **מנוע SOD1820 הרשמי**. מקבל מילה/ביטוי,
מחזיר את הערך ב-9 שיטות + מרחק מ-1820.

> **למה Edge Function ולא שרת Flask נפרד?** כל המערכת (React + Supabase) בנויה על
> Edge Functions (Deno) + Postgres, וכל הגימטריה מחושבת במנוע הרשמי בתוך ה-DB
> (`fn_ragil`/`gem_calc`/...). שרת Flask מקביל היה מנוע-גימטריה שני (ערכים שונים,
> פריסה נפרדת). במקום זה — פונקציה אחת שקוראת למנוע האמיתי. הדוגמה ב-Python למטה
> מראה איך *לקוח* קורא ל-API הזה מפייתון.

## Endpoint

```
POST https://<project>.supabase.co/functions/v1/gematria-api
```

`GET` על אותה כתובת מחזיר מדריך-שימוש (JSON) — נוח לבדיקה מהדפדפן.

## בקשה

```json
{
  "text": "משיח בן דוד",
  "methods": ["ragil", "atbash"]   // אופציונלי — סינון שיטות. בלי זה: כל 9 השיטות.
}
```

Headers: `Content-Type: application/json`. אם גידור-המפתח מופעל — גם `x-api-key: <המפתח שלך>`.

## תשובה

```json
{
  "status": "success",
  "input": "משיח בן דוד",
  "value": 424,
  "hebrew_numeral": "תכ״ד",
  "distance_from_1820": 1396,
  "methods":    { "ragil": 424, "atbash": 701 },
  "methods_he": { "ragil": "רגיל", "atbash": "אתבש" },
  "answer": "הביטוי «משיח בן דוד» = 424 בגימטריה רגילה (מנוע SOD1820)."
}
```

- `value` — הערך הראשי (רגיל).
- `distance_from_1820` — ‎`1820 − value` (1820 = לב המערכת).
- רק אותיות עבריות נספרות; שאר התווים מתעלמים מהם.

### 9 השיטות
`ragil` (רגיל) · `miluy` (מילוי) · `misratar` (מסתתר) · `kadmi` (קדמי·משולש) ·
`gadol` (גדול) · `siduri` (סידורי) · `atbash` (אתבש) · `albam` (אלבם) · `kadmi_gadol` (משולש גדול).

## דוגמאות

**curl**
```bash
curl -X POST https://<project>.supabase.co/functions/v1/gematria-api \
  -H "Content-Type: application/json" \
  -d '{"text":"משיח בן דוד"}'
```

**JavaScript (fetch)**
```js
const r = await fetch("https://<project>.supabase.co/functions/v1/gematria-api", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "משיח בן דוד" }),
});
const data = await r.json();
console.log(data.value, data.methods);
```

**Python (client)**
```python
import requests

resp = requests.post(
    "https://<project>.supabase.co/functions/v1/gematria-api",
    json={"text": "משיח בן דוד"},
    headers={"x-api-key": "<your-key>"},  # רק אם גידור-מפתח מופעל
)
data = resp.json()
print(data["value"], data["distance_from_1820"])
print(data["methods"])
```

## אימות-מפתח (אופציונלי)

כברירת-מחדל ה-API **פתוח**. כדי לגדר אותו מאחורי מפתחות-לקוח:

1. הרץ את המיגרציה `supabase/migrations/20260724_gematria_api_keys.sql` (יוצרת
   `api_customers` / `api_keys` / `api_usage_log` + הפונקציות `api_key_verify` / `api_usage_log`).
2. צור לקוח + מפתח (הוראות בתחתית קובץ המיגרציה — המפתח נשמר כ-hash בלבד).
3. קבע ב-Edge secrets: `GEMATRIA_API_REQUIRE_KEY=1`.

אז כל בקשה חייבת `x-api-key` תקין, וכל שימוש נרשם ב-`api_usage_log`.

## פריסה

הפונקציה **לא נפרסה עדיין** (deploy_on_request). לפריסה:
`supabase functions deploy gematria-api --no-verify-jwt` (public), או דרך ה-Dashboard/MCP
עם `verify_jwt=false`. פונקציית ה-SQL `public.gematria_api` כבר חיה ב-DB.
