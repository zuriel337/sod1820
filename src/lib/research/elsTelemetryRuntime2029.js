import { PUBLIC_READING_RELEASE } from '../publicReadingRelease2029.js';
import { captureMeasurement, measurementBody, sendMeasurement } from '../measurement2029.js';
import { readingActionProps } from '../publicReadingTelemetry2029.js';
import { isBot } from '../botVerdict.js';
import { createElsOperationTelemetry, elsUiAction } from './elsTelemetry2029.js';
function capture(source) {
  if(!PUBLIC_READING_RELEASE||source?.isAdmin||typeof location==='undefined'||!['sod1820.co.il','www.sod1820.co.il'].includes(location.hostname)||isBot())return null;
  return captureMeasurement();
}
function send(context,event,props){
  if(!context)return false;
  const safe=readingActionProps('els',event,props);
  const body=safe&&measurementBody(context,'els',event,safe);
  return body?sendMeasurement(context,body):false;
}
export const startElsTelemetry = (operation,source={}) => createElsOperationTelemetry(operation,source,{capture:()=>capture(source),send});
export function captureElsUi(event,source={}) {
  try {
  // Native surface observes itself, including fullscreen. The page observes only its outer controls.
  const root=event.currentTarget;
  if(!root.hasAttribute('data-els-native-telemetry')&&event.target.closest?.('[data-els-native-telemetry]'))return;
  const props=elsUiAction(event,root);
  if(props)void send(capture(source),'ui_action',{...props,mode:source.mode||'classic',scope:source.scope==='tanakh'?'tanakh':'torah'});
  } catch { /* Optional analytics must not interrupt an input handler. */ }
}
