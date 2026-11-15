import { getLandingTelemetry, LANDER } from './landing.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** Powered terminal guidance outputs ordinary engine/torque commands only. */
export function landingAssistInput(state,ceiling=1,manualTurn=0){
 const t=getLandingTelemetry(state),[x,y]=state.position,[vx,vy]=state.velocity,up=Math.max(.01,t.maxThrust/t.mass-t.gravity);
 const desiredVy=-Math.max(.25,Math.min(state.scenario.microgravity?.8:12,y/20,.4*Math.sqrt(2*up*Math.max(y,0))+.2));
 const maxVx=state.scenario.microgravity?.25:2,desiredVx=clamp(-x/20,-maxVx,maxVx);
 const ax=clamp((desiredVx-vx)/5,-t.gravity*.5,t.gravity*.5),vertical=Math.max(0,t.gravity+(desiredVy-vy)/3);
 let angle=clamp(Math.atan2(ax,Math.max(.0001,vertical)),-Math.PI/6,Math.PI/6);if(y<12&&Math.abs(x)<20)angle=0;
 return {throttle:clamp(t.mass*Math.hypot(ax,vertical)/t.maxThrust,0,1)*clamp(ceiling,0,1),turn:clamp((.12*(angle-state.angle)-.65*state.angularVelocity)*LANDER.inertia/LANDER.torque+manualTurn,-1,1),holdAttitude:false};
}
