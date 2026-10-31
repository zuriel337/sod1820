import React from 'react';
import YetzirahModelCard from './YetzirahModelCard.jsx';
export default function TenDepthsModel2029(props){const href=typeof window==='undefined'?'#':(()=>{const url=new URL(window.location.href);url.searchParams.set('experience','depths');url.searchParams.set('page','53');return `${url.pathname}${url.search}${url.hash}`;})();return <><p><a href={href}>פתחו את מסלול עשרת העומקים וקריאת הפירושים</a></p><YetzirahModelCard {...props} modelKey="ten-depths"/></>;}
