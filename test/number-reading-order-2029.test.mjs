import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultNumberReadingExpression,numberConnectionLocator} from '../src/lib/research/numberReadingOrder.js';

test('default reading inherits server order without sorting by a fact, title, score or curatorial badge',()=>{
 const rows=[{phrase:'Human first',lead_rank:1},{phrase:'Human second',lead_rank:2}];
 assert.equal(defaultNumberReadingExpression({rows,fallback:'Different anchor prose'}),'Human first');
 assert.deepEqual(rows.map(row=>row.lead_rank),[1,2]);
});
test('connection return locators replay exact operand/method without collisions from spaces or URI encoding',()=>{
 const id=numberConnectionLocator('גלוי סוד יהוה בעתה','מילוי');assert.match(id,/^number-connection-[a-f0-9-]+$/);
 assert.equal(id,numberConnectionLocator('גלוי סוד יהוה בעתה','מילוי'));
 assert.notEqual(id,numberConnectionLocator('גלוי סוד יהוה בעתה','רגיל'));
 assert.notEqual(numberConnectionLocator('a b','x'),numberConnectionLocator('a_b','x'));
});
test('pending and failed ordering remain unknown; only a successful empty read may use the existing engine fallback',()=>{
 for(const state of[{loading:true},{error:new Error('offline')}])assert.equal(defaultNumberReadingExpression({...state,fallback:'canonical discovery'}),'');
 assert.equal(defaultNumberReadingExpression({fallback:'canonical discovery'}),'canonical discovery');
 assert.equal(defaultNumberReadingExpression({rows:[{phrase:''},null,{phrase:' Existing admitted row '}],loading:true}),'Existing admitted row');
});
