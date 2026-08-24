from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

# 1) Canonical engine: expose existing cross-search as a host request, preserving the current axis.
engine = 'tools/els/els-code.template.html'
replace_once(engine,
    '  function runCross(A){\n    const xr=document.getElementById("xrun");\n    // סימטריה: הציר נבחר אוטומטית מבין {הציר שהוקלד + כל המונחים} — הגדולה מכילה את האחרות\n    const parts=[A,...st.crossTerms];const axisN=chooseAxis(parts);',
    '  function runCross(A,hostRequestId=null,fixedAxis=false,hostPrevTerms=null){\n    const xr=document.getElementById("xrun");\n    // UI legacy keeps symmetric auto-axis selection; host add-finding explicitly preserves the active research axis.\n    const parts=[A,...st.crossTerms];const axisN=fixedAxis?norm(A):chooseAxis(parts);',
    'runCross host signature')
replace_once(engine,
    '      if(!meetings.length){toast("לא נמצאה התכנסות טהורה של המונחים סביב «"+axis+"». הרפה את הטוהר או נסה מונחים אחרים.");return;}',
    '      if(!meetings.length){\n        if(hostRequestId){if(Array.isArray(hostPrevTerms)){st.crossTerms=hostPrevTerms;renderXTerms();}window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:hostRequestId,ok:false,reason:"not-found",term:terms[terms.length-1]||""},location.origin);}\n        toast("לא נמצאה התכנסות טהורה של המונחים סביב «"+axis+"». הרפה את הטוהר או נסה מונחים אחרים.");return;}',
    'runCross host miss')
replace_once(engine,
    '      toast("🔀 "+heb(meetings.length)+" אזורים · הטוב: "+meetings[0].nFound+"/"+total+" · "+meetings[0].stars+"★"+(sw?" · סובב סביב «"+axis+"» (הדילוג הגדול)":""));\n    },10);',
    '      toast("🔀 "+heb(meetings.length)+" אזורים · הטוב: "+meetings[0].nFound+"/"+total+" · "+meetings[0].stars+"★"+(sw?" · סובב סביב «"+axis+"» (הדילוג הגדול)":""));\n      if(hostRequestId)window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:hostRequestId,ok:true,term:terms[terms.length-1]||"",axis:axis},location.origin);\n    },10);',
    'runCross host success')
replace_once(engine,
    '    if(d.type==="load-matrix"&&d.item&&d.item.term){   // 🔗 עמוד-צופן קנוני: טען צופן ספציפי',
    '    if(d.type==="add-finding"&&d.term){   // ➕ Host Research Studio: use canonical cross-search, never a parallel finder\n      const term=(d.term||"").trim(),axis=(d.axis||q.value||st.raw||"").trim();\n      if(!canCross()){gate("cross");window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:d.requestId||null,ok:false,reason:"gate",term},location.origin);return;}\n      if(norm(term).length<2||norm(axis).length<2){window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:d.requestId||null,ok:false,reason:"invalid",term},location.origin);return;}\n      if(st.crossTerms.some(x=>norm(x)===norm(term))){window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:d.requestId||null,ok:false,reason:"duplicate",term},location.origin);return;}\n      if(st.crossTerms.length>=8){window.parent.postMessage({source:"tzofen",type:"finding-result",requestId:d.requestId||null,ok:false,reason:"limit",term},location.origin);return;}\n      const prev=st.crossTerms.slice();st.crossTerms.push(term);renderXTerms();q.value=axis;runCross(axis,d.requestId||null,true,prev);return;\n    }\n    if(d.type==="load-matrix"&&d.item&&d.item.term){   // 🔗 עמוד-צופן קנוני: טען צופן ספציפי',
    'host add-finding message')

# Rebuild generated public artifact from canonical template.
import subprocess
subprocess.run(['python', 'tools/els/build.py'], check=True)

# 2) Host iframe wrapper: request/result contract only; no search logic in React.
embed = 'src/components/TzofenEmbed.jsx'
replace_once(embed,
    'export default function TzofenEmbed({ seed = "", full = false, matrix = null, fromTopic = null, onQuality = null, onState = null, hiddenBridge = false, lensRequest = null, onLens = null, loadRequest = null, onLoadError = null }) {',
    'export default function TzofenEmbed({ seed = "", full = false, matrix = null, fromTopic = null, onQuality = null, onState = null, hiddenBridge = false, lensRequest = null, onLens = null, loadRequest = null, onLoadError = null, findingRequest = null, onFindingResult = null }) {',
    'embed props')
replace_once(embed,
    '        if (lensRequest) postToTool({ type: "request-lens", lens: lensRequest.lens, target: lensRequest.target || {} });\n        return;',
    '        if (lensRequest) postToTool({ type: "request-lens", lens: lensRequest.lens, target: lensRequest.target || {} });\n        if (findingRequest?.term) postToTool({ type: "add-finding", requestId: findingRequest.id, term: findingRequest.term, axis: findingRequest.axis });\n        return;',
    'embed ready resend')
replace_once(embed,
    '      if (d.type === "load-error") {\n        onLoadError?.(d);\n        return;\n      }',
    '      if (d.type === "load-error") {\n        onLoadError?.(d);\n        return;\n      }\n      if (d.type === "finding-result") {\n        onFindingResult?.(d);\n        return;\n      }',
    'embed finding result')
replace_once(embed,
    '  }, [verified, postTier, saveToCloud, user, pushSavedMatrices, matrix, postToTool, navigate, isAdmin, onQuality, onState, onLens, lensRequest, loadRequest, onLoadError]);',
    '  }, [verified, postTier, saveToCloud, user, pushSavedMatrices, matrix, postToTool, navigate, isAdmin, onQuality, onState, onLens, lensRequest, loadRequest, onLoadError, findingRequest, onFindingResult]);',
    'embed deps')
replace_once(embed,
    '  // 🧭 Journey/navigation load — raw loadMatrix item from the host. Re-sent on ready above if the iframe was not ready yet.\n  useEffect(() => {',
    '  // ➕ Manual Finding request — delegates to the canonical engine cross-search.\n  useEffect(() => {\n    if (!findingRequest?.term) return;\n    postToTool({ type: "add-finding", requestId: findingRequest.id, term: findingRequest.term, axis: findingRequest.axis });\n  }, [findingRequest, postToTool]);\n\n  // 🧭 Journey/navigation load — raw loadMatrix item from the host. Re-sent on ready above if the iframe was not ready yet.\n  useEffect(() => {',
    'embed request effect')

# 3) Lab surface: compact add-finding control above matrix.
page = 'src/pages/ElsWorkAreaPage.jsx'
replace_once(page,
    '  const journeyPendingRef = useRef(null);',
    '  const journeyPendingRef = useRef(null);\n  const [findingDraft, setFindingDraft] = useState("");\n  const [findingRequest, setFindingRequest] = useState(null);\n  const [findingPending, setFindingPending] = useState(false);\n  const [findingMessage, setFindingMessage] = useState("");',
    'page finding state')
replace_once(page,
    '  const runSearch = (e) => {',
    '  const onFindingResult = useCallback((d) => {\n    if (!findingRequest || d?.requestId !== findingRequest.id) return;\n    setFindingPending(false); setFindingRequest(null);\n    if (d?.ok) { setFindingDraft(""); setFindingMessage(`✓ «${d.term || "הממצא"}» נוסף דרך מנוע ההצלבה`); return; }\n    const msg = d?.reason === "not-found" ? "לא נמצאה כרגע התכנסות של המונח עם הציר הפעיל."\n      : d?.reason === "duplicate" ? "המונח כבר נמצא ברשימת הממצאים."\n      : d?.reason === "limit" ? "הגעת למגבלת 8 המונחים של מנוע ההצלבה."\n      : d?.reason === "gate" ? "הוספת ממצא משתמשת בחיפוש המוצלב ודורשת הרשמה."\n      : "לא ניתן להוסיף את המונח לבדיקה כרגע.";\n    setFindingMessage(msg);\n  }, [findingRequest]);\n  const addFinding = (e) => {\n    e?.preventDefault?.();\n    const term = findingDraft.trim(), axisTerm = (s?.termRaw || s?.term || "").trim();\n    if (!ok || term.length < 2 || axisTerm.length < 2 || findingPending) return;\n    const req = { id: `finding-${Date.now()}-${Math.random()}`, term, axis: axisTerm };\n    setFindingMessage(""); setFindingPending(true); setFindingRequest(req);\n  };\n\n  const runSearch = (e) => {',
    'page finding handlers')
replace_once(page,
    '    journeyPendingRef.current = null; setJourneyPending(null); setJourneyLoad(null); setJourneyTrail([]); setJourneyError("");',
    '    journeyPendingRef.current = null; setJourneyPending(null); setJourneyLoad(null); setJourneyTrail([]); setJourneyError("");\n    setFindingDraft(""); setFindingRequest(null); setFindingPending(false); setFindingMessage("");',
    'page reset finding on search')
replace_once(page,
    '<TzofenEmbed key={`${seed}-${runNonce}`} seed={seed || undefined} onState={onState} hiddenBridge={!showEngine} lensRequest={lensRequest} onLens={onLens} loadRequest={journeyLoad} onLoadError={onLoadError} />',
    '<TzofenEmbed key={`${seed}-${runNonce}`} seed={seed || undefined} onState={onState} hiddenBridge={!showEngine} lensRequest={lensRequest} onLens={onLens} loadRequest={journeyLoad} onLoadError={onLoadError} findingRequest={findingRequest} onFindingResult={onFindingResult} />',
    'page embed finding props')
replace_once(page,
    '        {ok && findings.length > 0 && <div style={{ ...soft, padding: "9px 10px", display: "grid", gap: 7 }}>',
    '        {ok && <div style={{ ...soft, padding: "9px 10px", display: "grid", gap: 8 }}>\n          <form onSubmit={addFinding} style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>\n            <span style={{ ...title, fontSize: 11.5 }}>＋ הוסף ממצא לבדיקה</span>\n            <input value={findingDraft} onChange={(e) => setFindingDraft(e.target.value)} placeholder="למשל: תורה" disabled={findingPending} style={{ flex: "1 1 180px", minHeight: 42, borderRadius: 11, border: `1px solid ${P.border}`, background: P.card, color: P.ink, padding: "0 11px", fontFamily: F.body, fontSize: 14 }} />\n            <button type="submit" disabled={findingPending || findingDraft.trim().length < 2} style={{ minHeight: 42, borderRadius: 11, border: 0, padding: "0 14px", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontWeight: 900, opacity: findingPending || findingDraft.trim().length < 2 ? .5 : 1 }}>{findingPending ? "בודק במנוע…" : "בדוק והוסף"}</button>\n            {findingMessage && <span style={{ ...muted, fontSize: 11.5 }}>{findingMessage}</span>}\n          </form>\n          {findings.length > 0 && <>',
    'page add finding form open')
replace_once(page,
    '          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <button key={`top-${f.t}-${i}`} type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>)}</div>\n        </div>}',
    '          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{findings.map((f, i) => <button key={`top-${f.t}-${i}`} type="button" disabled={Boolean(journeyPending) || !Array.isArray(f.shown) || !f.shown.length} onClick={() => promoteFinding(f)} style={{ minHeight: 42, borderRadius: 12, padding: "0 12px", border: `1px solid ${P.border}`, background: P.cardSoft, color: P.ink, fontFamily: F.heading, fontWeight: 850, opacity: Array.isArray(f.shown) && f.shown.length ? 1 : .45 }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: f.color, marginInlineEnd: 5 }} />↑ ציר · {f.t}</button>)}</div>\n          </>}\n        </div>}',
    'page add finding form close')

# Source invariants
for path, needles in {
    engine: ['d.type==="add-finding"', 'runCross(axis,d.requestId||null,true,prev)', 'type:"finding-result"'],
    embed: ['findingRequest = null', 'type: "add-finding"', 'd.type === "finding-result"'],
    page: ['＋ הוסף ממצא לבדיקה', 'findingRequest={findingRequest}', 'const addFinding = (e) =>'],
}.items():
    s = Path(path).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in s:
            raise SystemExit(f'{path}: missing invariant {needle}')
print('ELS add-finding bridge patch applied')
