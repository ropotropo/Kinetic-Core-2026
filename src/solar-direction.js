import { AdditiveBlending } from 'three';

// Fixed illustrative scenario illumination, not a dated/live solar ephemeris.
// XY is the solver's inertial plane; Z is its out-of-plane display axis.
export const SCENARIO_SUN_SI=Object.freeze([.13,-.59,-.8]);
export const SURFACE_SUN=Object.freeze([-.55,.32,-.77]);
export const SURFACE_PARENT_BEARING=Object.freeze([-.16,.13,-.97]);
const finiteVector=v=>Array.isArray(v)&&v.length>=2&&v.slice(0,3).every(Number.isFinite);
const normalized=v=>{const length=Math.hypot(...v);return length>1e-10?v.map(value=>value/length):null;};
const integratedMoonSurface=view=>['landing','finale'].includes(view.mode)&&view.customMission&&view.destination==='moon'&&finiteVector(view.positionSI)&&finiteVector(view.moonPositionSI);
export function sceneFrameAngle(view={}){
  if(Number.isFinite(view.localFrameAngle))return view.localFrameAngle;
  const p=finiteVector(view.positionSI)?view.positionSI:[6371000,0];
  const surface=integratedMoonSurface(view);
  const moon=finiteVector(view.moonPositionSI)?view.moonPositionSI:[384400000,0];
  return Math.atan2(p[1]-(surface?moon[1]:0),p[0]-(surface?moon[0]:0));
}
export function inertialToRender(vector,angle=0,docking=false){
  const c=Math.cos(angle),s=Math.sin(angle),east=-s*vector[0]+c*vector[1],up=c*vector[0]+s*vector[1],cross=vector[2]||0;
  // Docking's fixed scenario axes are [radial,along,cross]=[y,-z,-x].
  return docking?[-cross,up,-east]:[east,up,cross];
}
export function solarDirection(view={}){
  const localSurface=['landing','finale'].includes(view.mode)&&!integratedMoonSurface(view);
  if(localSurface)return normalized(SURFACE_SUN);
  const source=finiteVector(view.sunDirectionSI)&&Math.hypot(...view.sunDirectionSI)>1e-10?view.sunDirectionSI:SCENARIO_SUN_SI;
  return normalized(inertialToRender(source,sceneFrameAngle(view),view.mode==='docking'));
}
export function raySphereOccluded(origin,direction,center,radius,maxDistance=Infinity){
  if(!(radius>0)||!finiteVector(origin)||!finiteVector(direction)||!finiteVector(center))return false;
  const d=normalized(direction);if(!d)return false;
  const offset=center.map((value,i)=>value-(origin[i]||0)),along=offset.reduce((sum,value,i)=>sum+value*d[i],0),distanceSq=offset.reduce((sum,value)=>sum+value*value,0);
  if(distanceSq<radius*radius)return true;
  const perpendicularSq=Math.max(0,distanceSq-along*along);
  if(along<=0||perpendicularSq>=radius*radius)return false;
  const near=along-Math.sqrt(radius*radius-perpendicularSq);
  return near>=0&&near<maxDistance;
}
export function heightFieldOccluded(origin,direction,heightAt,maxDistance=200000,samples=64){
  const d=normalized(direction);if(!d||typeof heightAt!=='function')return false;
  // Bounded near-dense sampling follows the same illustrative height field as
  // the rendered ground; rocks/vehicles use a precise mesh ray in scene.js.
  for(let i=1;i<=samples;i++){
    const t=Math.expm1(Math.log1p(maxDistance)*i/samples),x=origin[0]+d[0]*t,z=origin[2]+d[2]*t,y=origin[1]+d[1]*t,ground=heightAt(x,z);
    if(!Number.isFinite(ground)||y<ground+.08)return true;
  }
  return false;
}
export function isSolarOccluder(object){
  if(!object?.isMesh||object.userData.solarTerrain)return false;
  for(let parent=object;parent;parent=parent.parent)if(parent.visible===false||parent.userData?.effect)return false;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  return materials.some(material=>material&&material.visible!==false&&!material.isShadowMaterial&&material.blending!==AdditiveBlending&&(!material.transparent||material.opacity>.15));
}
export function solarGlareStrength(projected,occluded=false){
  const [x,y,z]=projected;if(occluded||![x,y,z].every(Number.isFinite)||z<=-1||z>=1)return 0;
  const edge=Math.max(Math.abs(x),Math.abs(y));if(edge>=1)return 0;
  const t=Math.max(0,Math.min(1,(1-edge)/.2)),fade=t*t*(3-2*t);
  return fade*(.3+.7*Math.exp(-(x*x+y*y)*1.8));
}
