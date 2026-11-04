import React from 'react';
import {catalogFields} from './catalogModels.js';
export function SourceValue({value}){
  if(value===null||value===undefined)return <span className="ym-missing">לא מופה במקור זה</span>;
  if(typeof value==='number')return <bdi className="ym-number" dir="ltr">{value}</bdi>;
  return <bdi dir="rtl">{Array.isArray(value)?value.join(' · '):value}</bdi>;
}
export function SourceCatalogTable({model,active,onSelect,sourceAction,comparison=false}){
  return <div className="ym-catalog-table"><table><caption>{model.title} · שדות המקור</caption><thead><tr><th scope="col">הרכיב</th>{model.fields.map(([key,label])=><th scope="col" key={key}>{label}</th>)}<th scope="col">עמוד המקור</th></tr></thead><tbody>{model.components.map(c=><tr key={c.stable_id} data-catalog-row={c.stable_id} data-selected={String(active?.stable_id===c.stable_id)}><th scope="row" data-label="הרכיב">{comparison?<strong>{c.label_he}</strong>:<button type="button" data-component-id={c.stable_id} aria-pressed={active?.stable_id===c.stable_id} onClick={()=>onSelect(c)}>{c.label_he}</button>}</th>{catalogFields(model,c).map(f=><td key={f.key} data-label={f.label}><SourceValue value={f.value}/>{f.source.source_ref!==c.source.source_ref&&sourceAction({...c,source:f.source},null,model,f)}</td>)}<td data-label="עמוד המקור">{sourceAction(c,null,model)}</td></tr>)}</tbody></table></div>;
}
export function SourceCatalogFacts({model,component,sourceAction}){
  return <dl className="ym-source-facts">{catalogFields(model,component).map(f=><div key={f.id} data-source-field={f.id}><dt>{f.label}</dt><dd><SourceValue value={f.value}/>{sourceAction({...component,source:f.source},null,model,f)}</dd></div>)}</dl>;
}
