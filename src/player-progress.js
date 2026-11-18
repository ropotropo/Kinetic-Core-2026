import { DESTINATIONS } from './destinations.js';
// Historical local milestones only. These never restore or alter a flight.
export const MILESTONES=Object.freeze({
  'earth-orbit':'Reach Earth orbit',
  'lunar-touchdown':'Complete the Moon expedition',
  'docking-capture':'Capture a docking port',
  'surface-touchdown':'Land a spacecraft',
});
const KEY='kinetic-core.player-milestones.v1';
export const LANDING_COUNTS_KEY='kinetic-core.landing-counts.v1';
const worlds=new Set(DESTINATIONS.map(body=>body.id));
export function readProgress(storage){
  try{storage??=globalThis.localStorage;const raw=JSON.parse(storage.getItem(KEY)||'{}');return Object.fromEntries(Object.keys(MILESTONES).filter(id=>raw[id]===true).map(id=>[id,true]));}catch{return{};}
}
export function saveMilestone(id,storage){
  if(DESTINATIONS.some(body=>id==='surface-'+body.id))id='surface-touchdown';
  if(!Object.hasOwn(MILESTONES,id))return false;
  try{storage??=globalThis.localStorage;const raw=readProgress(storage);raw[id]=true;storage.setItem(KEY,JSON.stringify(raw));return true;}catch{return false;}
}

function validatedLandingCounts(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  return Object.fromEntries([...worlds].filter(world=>Object.hasOwn(raw,world)&&Number.isSafeInteger(raw[world])&&raw[world]>0).map(world=>[world,raw[world]]));
}
// Counts begin with newly observed touchdowns. Historical boolean milestones
// cannot establish how many landings happened and are never migrated here.
export function readLandingCounts(storage){
  try{storage??=globalThis.localStorage;return validatedLandingCounts(JSON.parse(storage.getItem(LANDING_COUNTS_KEY)||'{}'));}catch{return{};}
}
export function recordLanding(world,storage){
  if(!worlds.has(world))return false;
  try{
    storage??=globalThis.localStorage;
    const counts=validatedLandingCounts(JSON.parse(storage.getItem(LANDING_COUNTS_KEY)||'{}')),previous=counts[world]||0;
    if(previous===Number.MAX_SAFE_INTEGER)return false;
    counts[world]=previous+1;storage.setItem(LANDING_COUNTS_KEY,JSON.stringify(counts));return true;
  }catch{return false;}
}
// The UI supplies confirmedLanding only on an observed transition into landed.
// Coalesce same-turn aliases, without suppressing a later genuine attempt.
export function createLandingRecorder(storage){
  const recordedThisTurn=new Set();
  return detail=>{
    if(detail?.confirmedLanding!==true||typeof detail.id!=='string')return false;
    const world=detail.id==='lunar-touchdown'?'moon':detail.id.startsWith('surface-')?detail.id.slice(8):null;
    if(!worlds.has(world)||detail.id!=='lunar-touchdown'&&detail.world!==undefined&&detail.world!==world||recordedThisTurn.has(world))return false;
    if(!recordLanding(world,storage))return false;
    recordedThisTurn.add(world);queueMicrotask(()=>recordedThisTurn.delete(world));return world;
  };
}
