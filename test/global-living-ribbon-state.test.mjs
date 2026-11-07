import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// History of this contract. The reserved ribbon slot first rendered one of loading / unavailable / empty from the shared
// feed, and this test pinned that a failed or partial read could never be shown as "no updates" (88595d353).
// 87c5ba388 (3.11) made the slot a static notice that does not consume the feed, and #1235 (ZURIEL 5.11.2026) replaced
// that notice with one authored verse, Malachi 3:23: "no feed, timer or action". The honesty guarantee therefore became
// stronger, not weaker: whatever state the feed is in, the slot renders the same static verse, makes no claim about
// updates at all, and carries no pending/status/action semantics.
const VERSE_TEXT='הִנֵּה אָנֹכִי שֹׁלֵחַ לָכֶם אֵת אֵלִיָּה הַנָּבִיא לִפְנֵי בּוֹא יוֹם ה׳ הַגָּדוֹל וְהַנּוֹרָא';
const VERSE_SOURCE='מלאכי ג׳, כג';

test('the reserved ribbon slot is one static verse in every feed state and never claims anything about updates',async()=>{
 const server=await createServer({configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:0}});
 try{
   await server.listen();
   const {default:Ribbon,ELIJAH_VERSE_2029}=await server.ssrLoadModule('/src/components/experience2029/GlobalLivingRibbon2029.jsx');
   assert.equal(ELIJAH_VERSE_2029.text,VERSE_TEXT);
   assert.equal(ELIJAH_VERSE_2029.source,VERSE_SOURCE);
   const reference=renderToStaticMarkup(React.createElement(Ribbon));
   assert.ok(reference.includes('data-ribbon-state="verse"'));
   assert.ok(reference.includes('class="sod29-living-ribbon"'));
   assert.ok(reference.includes(VERSE_TEXT));
   assert.ok(reference.includes(VERSE_SOURCE));
   // The former states: loading, failed read, partial read and a genuinely empty settled feed (the old inputs), plus no feed.
   for(const feed of [
     {loading:true,rows:[]},
     {loading:false,error:true,rows:[]},
     {loading:false,unavailableSources:['posts'],rows:[]},
     {loading:false,unavailableSources:[],rows:[]},
     {loading:false,unavailableSources:[],rows:[{id:'x',title:'כותרת אחרת',href:'/post/x'}]},
     undefined,
   ]){
     const html=renderToStaticMarkup(React.createElement(Ribbon,{feed}));
     assert.equal(html,reference,'the ribbon must not consume or react to the shared feed');
     for(const claim of ['טוען עדכונים','אינם זמינים','אין עדכונים חדשים'])assert.equal(html.includes(claim),false,`no feed-state claim: ${claim}`);
     for(const stale of ['is-pending','data-ribbon-state="loading"','data-ribbon-state="unavailable"','data-ribbon-state="empty"','data-ribbon-state="renewal"'])assert.equal(html.includes(stale),false,`retired state: ${stale}`);
     assert.equal(/<(?:button|a|input|form)\b|role="status"|aria-live|onclick/i.test(html),false,'static slot: no action, link or live region');
   }
 }finally{await server.close();}
});
