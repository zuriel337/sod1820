import {SEFER_YETZIRAH_LETTERS,getSeferYetzirahGateNumber} from '../../data/seferYetzirahWorld2029.js';
// Reuse the existing lab's enumeration. These are companion combinations, not transcribed table cells.
export const GATE_LETTERS=Object.freeze(SEFER_YETZIRAH_LETTERS.map(l=>l.letter));
export function gateSelection(search){
 const params=new URLSearchParams(search),letter=params.get('letter'),partner=params.get('partner');
 if(!GATE_LETTERS.includes(letter))return {first:'א',second:'ב'};
 return {first:letter,second:GATE_LETTERS.includes(partner)&&partner!==letter?partner:''};
}
export function letterGateRows(first){
 if(!GATE_LETTERS.includes(first))return [];
 return GATE_LETTERS.filter(letter=>letter!==first).map(second=>({first,second,id:getSeferYetzirahGateNumber(first,second),forward:first+second,reverse:second+first}));
}
export function allLetterGates(){
 return GATE_LETTERS.flatMap((first,i)=>GATE_LETTERS.slice(i+1).map(second=>({first,second,id:getSeferYetzirahGateNumber(first,second),forward:first+second,reverse:second+first})));
}
export function gateSelectionUrl(href,first,second,expanded){
 const url=new URL(href);url.searchParams.set('letter',first);
 if(second)url.searchParams.set('partner',second);else url.searchParams.delete('partner');
 if(expanded)url.searchParams.set('pairs','open');else url.searchParams.delete('pairs');
 return `${url.pathname}${url.search}${url.hash}`;
}
