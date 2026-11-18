import { EARTH } from './physics.js';
import { drawWorldDisc } from './map-world-disc.js';
import { MOON, moonState, getMissionWorldState } from './lunar-mission.js';
const names=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'];
export function drawMissionMap(canvas,m,t){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#020305';c.fillRect(0,0,w,h);
  c.font='12px system-ui';c.lineWidth=1;
  const body=(x,y,r,name,color)=>{if(['Earth','Moon'].includes(name))drawWorldDisc(c,x,y,r,name.toLowerCase(),color);else{c.fillStyle=color;c.beginPath();c.arc(x,y,Math.max(2,r),0,Math.PI*2);c.fill();}c.fillStyle='#cad0d8';c.fillText(name,x+r+5,y+4);};
  if(m.kind==='custom-descent'||m.primary==='moon'&&t.altitude<100000){
    const pos=t.positionLocal??m.position,vel=t.velocityLocal??m.velocity;
    const scale=Math.max(2,Math.abs(pos[0])/90,pos[1]/90),x=w*.48+pos[0]/scale,y=h-35-pos[1]/scale;
    c.strokeStyle='#496750';c.beginPath();c.moveTo(15,h-35);c.lineTo(w-15,h-35);c.stroke();body(w*.48,h-35,3,t.site?.name??'Selected pad','#a8d8bd');
    c.strokeStyle='#a8d8bd';c.setLineDash([4,5]);c.beginPath();c.moveTo(x,y);c.lineTo(w*.48,h-35);c.stroke();c.setLineDash([]);
    arrow(c,x,y,(t.pitch??0)-Math.PI/2,'#fff');c.fillStyle='#a1a1a8';c.fillText(`${Math.round(scale)} m / px · live local frame`,12,19);return;
  }
  if(m.primary==='moon'){
    const r=Math.hypot(...m.position),s=Math.min(w,h)*.4/Math.max(MOON.radius*1.3,r*1.15),cx=w*.45,cy=h*.55;
    const p=[cx+m.position[0]*s,cy-m.position[1]*s],a=moonState(m.time).angle+Math.PI+t.site.longitude*Math.PI/180;
    body(cx,cy,MOON.radius*s,'Moon','#55585c');
    const target=[cx+Math.cos(a)*MOON.radius*s,cy-Math.sin(a)*MOON.radius*s];body(...target,3,'Selected pad','#a8d8bd');
    c.strokeStyle='#a8d8bd';c.setLineDash([4,5]);c.beginPath();c.moveTo(...p);c.lineTo(...target);c.stroke();c.setLineDash([]);arrow(c,...p,-m.craftAngle,'#fff');
    c.fillStyle='#a1a1a8';c.fillText('Moon-centred frame · live position',12,19);c.font='9px system-ui';c.fillText('Dashed: pad bearing, not an autopilot route',12,h-9);return;
  }
  const world=getMissionWorldState(m),moon=moonState(m.time),wide=['coast','lunar-approach','capture','lunar-orbit','descent','landing'].includes(m.phase);
  const range=wide?MOON.distance*1.16:Math.max(EARTH.radius*1.4,Math.hypot(...world.position)*1.25),s=Math.min(w,h)*.42/range,cx=w*.43,cy=h*.55;
  const project=p=>[cx+p[0]*s,cy-p[1]*s];
  const e=project([0,0]),p=project(world.position),mpos=project(moon.position);
  if(wide){c.strokeStyle='#20252c';c.beginPath();c.arc(...e,MOON.distance*s,0,Math.PI*2);c.stroke();}
  body(...e,Math.max(wide?3:12,EARTH.radius*s),'Earth','#5c91b6');
  if(wide)body(...mpos,Math.max(3,MOON.radius*s),'Moon','#d0cfcb');
  c.strokeStyle='#8a977c';c.setLineDash([4,5]);c.beginPath();c.moveTo(...p);c.lineTo(...(wide?mpos:e));c.stroke();c.setLineDash([]);
  if(m.track?.length){c.strokeStyle='#597589';c.beginPath();m.track.forEach((q,i)=>{const v=project(q);i?c.lineTo(...v):c.moveTo(...v)});c.stroke();}
  arrow(c,...p,-m.craftAngle,'#fff');
  c.fillStyle='#a1a1a8';c.fillText(wide?'Earth–Moon route · actual positions':'Earth ascent · actual position',12,19);
  c.font='9px system-ui';c.fillText('Dashed: target bearing, not a solved collision-free path',12,h-9);
}
function arrow(c,x,y,a,color){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=color;c.beginPath();c.moveTo(9,0);c.lineTo(-5,-4);c.lineTo(-3,0);c.lineTo(-5,4);c.closePath();c.fill();c.restore();}
