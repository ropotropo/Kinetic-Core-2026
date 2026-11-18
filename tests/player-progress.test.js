import test from 'node:test';
import assert from 'node:assert/strict';
import {readProgress,saveMilestone,readLandingCounts,recordLanding,createLandingRecorder,LANDING_COUNTS_KEY} from '../src/player-progress.js';
const storage=()=>{let value=null;return {getItem:()=>value,setItem:(_key,next)=>{value=next;}};};
test('historical progress keeps only explicitly confirmed known milestones',()=>{const s=storage();s.setItem('',JSON.stringify({'earth-orbit':true,'lunar-touchdown':'true','docking-capture':0,'fake-win':true}));assert.deepEqual(readProgress(s),{'earth-orbit':true});assert.equal(saveMilestone('fake-win',s),false);assert.equal(saveMilestone('docking-capture',s),true);assert.deepEqual(readProgress(s),{'earth-orbit':true,'docking-capture':true});});
test('denied or malformed progress storage cannot prevent play',()=>{const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};assert.deepEqual(readProgress(denied),{});assert.equal(saveMilestone('earth-orbit',denied),false);const s=storage();s.setItem('','{broken');assert.deepEqual(readProgress(s),{});assert.equal(saveMilestone('lunar-touchdown',s),true);});

test('surface practice counts confirmed known worlds without claiming a Moon expedition',()=>{const s=storage();assert.equal(saveMilestone('surface-phobos',s),true);assert.deepEqual(readProgress(s),{'surface-touchdown':true});assert.equal(saveMilestone('surface-jupiter',s),false);});

const keyedStorage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('landing counts validate known worlds and positive safe integers only',()=>{
  const s=keyedStorage();s.setItem(LANDING_COUNTS_KEY,JSON.stringify({moon:4,io:1,mars:0,phobos:-1,europa:1.5,titan:true,triton:'7',jupiter:9,mercury:Number.MAX_SAFE_INTEGER+1}));
  assert.deepEqual(readLandingCounts(s),{moon:4,io:1});
  for(const raw of ['null','[]','true','"moon"','{broken']){s.setItem(LANDING_COUNTS_KEY,raw);assert.deepEqual(readLandingCounts(s),{});}
});
test('landing totals start from actual records and never infer counts from old boolean milestones',()=>{
  const s=keyedStorage();saveMilestone('surface-moon',s);saveMilestone('lunar-touchdown',s);
  assert.deepEqual(readLandingCounts(s),{});assert.equal(s.getItem(LANDING_COUNTS_KEY),null);
  assert.equal(recordLanding('moon',s),true);assert.equal(recordLanding('moon',s),true);assert.equal(recordLanding('io',s),true);assert.equal(recordLanding('jupiter',s),false);
  assert.deepEqual(readLandingCounts(s),{moon:2,io:1});assert.deepEqual(readProgress(s),{'lunar-touchdown':true,'surface-touchdown':true});
});
test('denied reads, failed writes, malformed data and integer overflow do not invent landings',()=>{
  let writes=0;const denied={getItem(){throw Error('denied')},setItem(){writes++;}};
  assert.equal(recordLanding('moon',denied),false);assert.equal(writes,0);assert.deepEqual(readLandingCounts(denied),{});
  const readonly={getItem:()=>null,setItem(){throw Error('readonly')}};assert.equal(recordLanding('io',readonly),false);
  const s=keyedStorage();s.setItem(LANDING_COUNTS_KEY,'{broken');assert.equal(recordLanding('moon',s),false);assert.equal(s.getItem(LANDING_COUNTS_KEY),'{broken');
  s.setItem(LANDING_COUNTS_KEY,JSON.stringify({moon:Number.MAX_SAFE_INTEGER,io:2}));assert.equal(recordLanding('moon',s),false);assert.deepEqual(readLandingCounts(s),{moon:Number.MAX_SAFE_INTEGER,io:2});
});
test('only explicitly confirmed, world-consistent touchdown events can record a landing',()=>{
  const s=keyedStorage(),record=createLandingRecorder(s);
  for(const detail of [{id:'surface-io'},{id:'lunar-touchdown',confirmedLanding:false},{id:'surface-io',confirmedLanding:'true'},{id:'surface-io',world:'moon',confirmedLanding:true},{id:'surface-jupiter',confirmedLanding:true},{id:'earth-orbit',world:'moon',confirmedLanding:true}])assert.equal(record(detail),false);
  assert.deepEqual(readLandingCounts(s),{});assert.equal(record({id:'surface-io',world:'io',confirmedLanding:true}),'io');
  assert.equal(record({id:'lunar-touchdown',world:'io',confirmedLanding:true}),'moon');assert.deepEqual(readLandingCounts(s),{moon:1,io:1});
});
test('same-turn Moon expedition and surface aliases count once, while a later attempt counts again',async()=>{
  const s=keyedStorage(),record=createLandingRecorder(s);
  assert.equal(record({id:'surface-moon',confirmedLanding:true}),'moon');assert.equal(record({id:'lunar-touchdown',confirmedLanding:true}),false);assert.equal(record({id:'surface-moon',confirmedLanding:true}),false);assert.deepEqual(readLandingCounts(s),{moon:1});
  await Promise.resolve();assert.equal(record({id:'lunar-touchdown',confirmedLanding:true}),'moon');assert.deepEqual(readLandingCounts(s),{moon:2});
});
