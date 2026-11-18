// Pure presentation contracts. No flight state, timing policy or force changes.
const smoothstep=(value,min,max)=>{const t=Math.max(0,Math.min(1,(value-min)/(max-min)));return t*t*(3-2*t);};
export function canStartSeparationBeat(previous,current,{reducedMotion=false,inspection=false,discontinuity=false}={}){
  return !!previous&&!reducedMotion&&!inspection&&!discontinuity&&!current.paused
    &&previous.mode==='launch'&&current.mode==='launch'&&current.stage>previous.stage
    &&current.time>0&&current.time>=previous.time&&current.altitude>=100
    &&['launch','orbit'].includes(current.phase);
}
export function advanceSeparationClock(age,dt,paused){return age+(paused?0:Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)));}
export function separationBeatWeight(age){return smoothstep(age,0,.75)*(1-smoothstep(age,3.35,4.7));}
export function separationEnvelope(a,ar,b,br){
  const delta=b.map((n,i)=>n-a[i]),distance=Math.hypot(...delta);
  if(ar>=distance+br)return {center:a.slice(),radius:ar};
  if(br>=distance+ar)return {center:b.slice(),radius:br};
  const radius=(distance+ar+br)*.5,t=distance>1e-8?(radius-ar)/distance:0;
  return {center:a.map((n,i)=>n+delta[i]*t),radius};
}
