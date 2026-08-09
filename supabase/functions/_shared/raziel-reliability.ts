// ============================================================================
// חוקת רזיאל · שלב 3 — מעטפת reliability קנונית משותפת
// ----------------------------------------------------------------------------
// מנגנון retry/timeout/fallback אחד, שנגזר מ«זהב-התקן» של number-researcher
// (הערוץ היחיד שהחזיק את שלושת המנגנונים בתהליך). זהו ה«שומר» המשותף:
// לעולם לא כשל שקט (never_silent) — תמיד מוחזר טקסט מהותי, לעולם לא null.
//
// ⚠️ שלב 3 = הקמת המעטפת בלבד. הקובץ הזה **לא מיובא ע״י אף פונקציית-קצה עדיין**
//    (אפס import → אפס פריסה → אפס שינוי התנהגות). חיבור הערוצים = שלב עתידי,
//    ורק אחרי הוכחת-שקילות ואישור צוריאל.
//
// עקרון-הפרדה: המעטפת מספקת את ה*מנגנון* (ניסיונות/backoff/timeout/never_silent).
//   ה*תוכן* של תשובת-הגיבוי (guardian) נשאר של הערוץ — הערוץ מעביר buildFallback
//   → כך הפורמט/הקול/החתימה של כל ערוץ נשמרים (לא משנים פורמט תשובה).
// ============================================================================

export interface ReliabilityPolicy {
  retries: number;        // מספר ניסיונות (ברירת-מחדל 3)
  backoffMs: number[];    // המתנה לפני ניסיון i (i≥1). [700,1600] = זהב-התקן
  timeoutMs: number;      // timeout לכל ניסיון (AbortController). 45000 = זהב-התקן
}

// ברירת-המחדל הקנונית — זהה ל-shared.reliability ב-raziel_config (config_version≥1)
export const CANONICAL_RELIABILITY: ReliabilityPolicy = {
  retries: 3,
  backoffMs: [700, 1600],
  timeoutMs: 45000,
};

export interface CallClaudeArgs {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  // guardian של הערוץ: מרכיב תשובת-גיבוי מהותית מהעובדות שכבר בידנו.
  // reason ∈ {'timeout','overload','empty','error'} כדי לנסח בהתאם. חובה שיחזיר טקסט לא-ריק.
  buildFallback: (reason: string) => string;
  policy?: Partial<ReliabilityPolicy>;
  // hook אופציונלי לתיעוד ניסיון (לא חובה) — לצורך Replay/לוגים בעתיד.
  onAttempt?: (info: { attempt: number; status: number | null; error: string | null }) => void;
}

export interface CallClaudeResult {
  text: string;          // לעולם לא ריק — או תשובת-המודל או ה-guardian
  degraded: boolean;     // true אם נפלנו ל-guardian
  attempts: number;      // כמה ניסיונות בוצעו בפועל
  reason: string | null; // סיבת-הכשל האחרונה אם degraded
}

const TRANSIENT_HTTP = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/**
 * קריאה אמינה ל-Anthropic עם המעטפת הקנונית.
 * לעולם לא זורק ולעולם לא מחזיר טקסט ריק — never_silent מובטח ע״י buildFallback.
 */
export async function callClaudeReliable(args: CallClaudeArgs): Promise<CallClaudeResult> {
  const pol: ReliabilityPolicy = {
    retries: args.policy?.retries ?? CANONICAL_RELIABILITY.retries,
    backoffMs: args.policy?.backoffMs ?? CANONICAL_RELIABILITY.backoffMs,
    timeoutMs: args.policy?.timeoutMs ?? CANONICAL_RELIABILITY.timeoutMs,
  };

  let lastReason: string | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < pol.retries; attempt++) {
    attempts = attempt + 1;
    // backoff לפני ניסיון-חוזר (זהב-התקן: 700 ואז 1600)
    if (attempt > 0) {
      const wait = pol.backoffMs[attempt - 1] ?? pol.backoffMs[pol.backoffMs.length - 1] ?? 0;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), pol.timeoutMs);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": args.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: args.maxTokens,
          system: args.system,
          messages: [{ role: "user", content: args.user }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(to);

      if (!resp.ok) {
        lastReason = `http_${resp.status}`;
        args.onAttempt?.({ attempt: attempts, status: resp.status, error: lastReason });
        if (TRANSIENT_HTTP.has(resp.status)) continue; // ניסיון חוזר
        break; // שגיאה קבועה (למשל 400/401) — אין טעם לנסות שוב
      }

      const data = await resp.json();
      if (data?.stop_reason === "refusal") { lastReason = "refusal"; args.onAttempt?.({ attempt: attempts, status: 200, error: "refusal" }); break; }
      const text = (data?.content?.[0]?.text || "").trim();
      if (!text) { lastReason = "empty"; args.onAttempt?.({ attempt: attempts, status: 200, error: "empty" }); continue; }

      args.onAttempt?.({ attempt: attempts, status: 200, error: null });
      return { text, degraded: false, attempts, reason: null };
    } catch (e) {
      clearTimeout(to);
      lastReason = ctrl.signal.aborted ? "timeout" : String(e).slice(0, 120);
      args.onAttempt?.({ attempt: attempts, status: null, error: lastReason });
      continue; // רשת/timeout — ניסיון חוזר
    }
  }

  // never_silent — לעולם לא null: guardian של הערוץ
  const reason = lastReason === "timeout" ? "timeout" : (lastReason?.startsWith("http_5") || lastReason === "http_429" ? "overload" : (lastReason === "empty" ? "empty" : "error"));
  const fb = (args.buildFallback(reason) || "").trim() || "אירעה תקלה רגעית — נסה שוב בעוד רגע. 🌳";
  return { text: fb, degraded: true, attempts, reason: lastReason };
}
