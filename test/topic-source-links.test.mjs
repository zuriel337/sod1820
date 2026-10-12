import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTopicSourceContext, INDIA_CAPTAIN_SOURCE} from '../src/lib/research/topicSourceContext.js';
import {topicConvergenceToUniversalFinding} from '../src/lib/research/topicConvergence.js';
import {buildTopic2029Projection} from '../src/lib/research/topic2029Projection.js';
import {post2029ReadingInternals,resolvePostExperienceConnections} from '../src/lib/research/post2029ReadingProjection.js';
import {projectPost2029Experience} from '../src/lib/research/post2029ExperienceProjection.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/topic-source-context-pilot.json',import.meta.url)));
const topic=fixture.topics.find(t=>t.slug==='india-axis');
const context=buildTopicSourceContext({...fixture,topic,occurrences:fixture.images,relatedTopics:fixture.topics});
test('Topic navigation adds provenance without changing authored facts, scores or source body',()=>{
 const card={...topic,findings:{posts:[{slug:'existing',title:'Authored Post'}]}};
 const finding=topicConvergenceToUniversalFinding({card});
 const original=JSON.stringify(finding);
 const base=buildTopic2029Projection(finding);
 const connected=buildTopic2029Projection(finding,{sourceContext:context});
 assert.equal(connected.relatedPosts.length,base.relatedPosts.length+1);
 assert.deepEqual(connected.relatedConvergences.map(t=>t.slug).sort(),['1237','hodu']);
 assert.equal(connected.authoredFactsCount,base.authoredFactsCount);
 assert.equal(connected.quality,base.quality);
 assert.deepEqual(connected.sections,base.sections);
 assert.equal(JSON.stringify(finding),original);
 for(const sourceContext of [{...context,topicSlug:'unrelated'},{...context,access:{scope:'private'}},{...context,access:{scope:'public',available:false}}]){
  assert.deepEqual(buildTopic2029Projection(finding,{sourceContext}).relatedConvergences,base.relatedConvergences);
 }
});
test('Post source link survives the real experience normalizer and live-public resolver',async()=>{
 const experience=post2029ReadingInternals.buildFz1073Experience(fixture.post);
 const normalized=projectPost2029Experience({...fixture.post,_experience:experience});
 const source=normalized.connections.find(c=>c.id==='topic-india-source');
 assert.equal(source.href,`/topic/india-axis#topic-source-media-post-5112-${INDIA_CAPTAIN_SOURCE.regionId}`);
 const resolved=await resolvePostExperienceConnections({connections:[source]},{readTopic:async()=>({slug:'india-axis'})});
 assert.equal(resolved.connections[0].href,source.href);
 for(const post of [{...fixture.post,tags:['טיוטה']},{...fixture.post,content:fixture.post.content.replace('אזרח הודי','אזרח')}]){
  assert.equal(post2029ReadingInternals.buildFz1073Experience(post).connections.some(c=>c.id==='topic-india-source'),false);
 }
});
