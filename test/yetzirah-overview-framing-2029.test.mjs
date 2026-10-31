import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {viewportFov,CAMERA} from '../src/components/books2029/yetzirahModels/sourceModels.js';
import {overviewBounds} from './fixtures/yetzirah-overview-framing.mjs';
test('existing twelve-model default projection remains numerically identical',()=>{
 for(const width of [320,390,1440])for(const height of [500,700,1000]){
  const original=2*Math.atan(Math.tan(CAMERA.fov*Math.PI/360)/Math.min(1,width/height))*180/Math.PI;
  assert.equal(viewportFov(width,height),original);
 }
});
test('all twenty-two overview nodes and selected marker envelopes fit portrait, desktop and resized frusta',()=>{
 for(const width of [240,320,390,1100,1440])for(const height of [500,700,1000]){const bounds=overviewBounds(width,height);assert.ok(bounds.x<1&&bounds.y<1&&bounds.zMin>-1&&bounds.zMax<1,`${width}/${height}: ${JSON.stringify(bounds)}`);}
 const old=overviewBounds(320,700,46);assert.ok(old.x>1,'the old fixed-FOV portrait clipping is reproduced, not dismissed by page-overflow checks');
});
test('the existing overview camera consumes the shared fit helper and updates on canvas resize',()=>{
 const scene=readFileSync(new URL('../src/components/books2029/SeferYetzirahScene2029.jsx',import.meta.url),'utf8');
 assert.match(scene,/OVERVIEW_FOV = 54/);assert.match(scene,/viewportFov\(size.width, size.height, OVERVIEW_FOV\)/);assert.match(scene,/camera.updateProjectionMatrix\(\)/);assert.match(scene,/size.width, size.height/);assert.match(scene,/dataset.viewportFit = 'ready'/);
});
