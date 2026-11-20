// ELS projection onto the existing Traffic pipeline. No collector, persistence or raw text.
const terminal = new Set(['completed','partial','failed','cancelled','tracking_stopped','empty']);
const outcomes = {done:'completed',complete:'completed',error:'failed',failed:'failed',cancelled:'cancelled',empty:'empty',partial:'partial',tracking_stopped:'tracking_stopped'};
export function createElsOperationTelemetry(operation, source, { capture, send, now = Date.now, id = () => globalThis.crypto.randomUUID() }) {
  let context, operationId;
  try { context = capture(); operationId = id(); } catch { return { update() {}, cancel() {} }; }
  // Immutable auth/session at start, never recaptured for a late response.
  const origin = { operation, operation_id:operationId, mode:['classic','research','guided'].includes(source?.mode)?source.mode:'research', scope:source?.scope==='tanakh'?'tanakh':'torah' };
  const started = now(); let ended = false, lastPhase = '', cancelSent = false;
  const emit = (event, extra = {}) => { try { void Promise.resolve(send(context,event,{...origin,...extra})).catch(()=>{}); } catch { /* measurement cannot affect a tool */ } };
  emit('operation_started');
  return {
    update(status, { partial = false, count } = {}) {
      if(ended) return;
      const outcome = partial && ['done','complete','partial'].includes(status) ? 'partial' : outcomes[status];
      if(outcome && terminal.has(outcome)) {
        ended=true;emit('operation_finished',{outcome,elapsed_ms:Math.max(0,now()-started),...(Number.isSafeInteger(count)&&count>=0?{count}: {})});
      } else if(['opening','searching','verifying','running','starting','cancelling'].includes(status)&&status!==lastPhase) {
        lastPhase=status;emit('operation_phase',{phase:status});
      }
    },
    cancel(){ if(!ended&&!cancelSent){cancelSent=true;emit('cancel_requested');} },
  };
}

const regions = [
 ['.els29-mode-selector','mode'],['.els29-native-query','search'],['#els29-discovery-panel','discovery'],
 ['#els29-context-panel','tools'],['.els29-native-toolstrip','tools'],['.els29-native-matrix-scroll','matrix'],
 ['.els29-native-stage','matrix_controls'],['.els29-native-bottom-controls','matrix_controls'],
];
export function elsUiAction(event, root) {
  const node=event.target?.closest?.('button,a,summary,select,input,[role="button"]');
  if(!node||!root?.contains(node)||node.disabled||node.getAttribute('aria-disabled')==='true')return null;
  if(event.type==='change'&&!node.matches('select,input[type="checkbox"],input[type="radio"],input[type="range"]'))return null;
  if(event.type==='click'&&node.matches('select,input'))return null;
  let region='page',owner=root;
  for(const [selector,key] of regions){const match=node.closest(selector);if(match&&root.contains(match)){region=key;owner=match;break;}}
  // Index identifies the control inside its bounded UI region. Never read text, values, hrefs or letter coordinates.
  const index=region==='matrix'?0:Array.from(owner.querySelectorAll('button,a,summary,select,input,[role="button"]')).indexOf(node);
  const action=node.getAttribute('data-tool-action');
  const control=['discovery','findings','results','research'].includes(action)?action:node.matches('.els29-native-cell')?'matrix_cell':node.tagName.toLowerCase();
  return {region,control,control_index:Math.max(0,index),gesture:event.type==='change'?'change':'activate'};
}
