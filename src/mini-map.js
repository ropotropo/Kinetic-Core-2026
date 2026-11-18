import { EARTH, ORBIT_TARGET } from './physics.js';
import { MOON, moonState, getMissionWorldState } from './lunar-mission.js';
import { fitMiniMapPoints } from './mini-map-framing.js';
import './mini-map.css';
const fmt = value => Math.abs(value) >= 10000 ? `${Math.round(value / 1000).toLocaleString('en-US')} km` : Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
export function createMiniMap(host) {
  const node = document.createElement('figure'); node.className = 'mini-map'; node.hidden = true;
  node.innerHTML = '<canvas width="304" height="168" role="img"></canvas><figcaption></figcaption>'; host.append(node);
  const canvas = node.querySelector('canvas'), c = canvas.getContext('2d'), caption = node.querySelector('figcaption');
  const w = canvas.width, h = canvas.height;
  function dot(x,y,color,r=4){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  function setup(label){node.hidden=false;c.clearRect(0,0,w,h);c.lineWidth=1.5;c.font='18px system-ui';caption.textContent=label;canvas.setAttribute('aria-label',label+'. White is spacecraft, green is target. Schematic position view.');}
  function line(a,b){c.strokeStyle='#a8d8bd88';c.setLineDash([4,7]);c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.setLineDash([]);}
  function local(position,landing){
    const x=position[0]??0,y=position[landing?1:2]??0,range=Math.hypot(...position);
    setup(`${landing?'Pad':'Port'} · ${fmt(range)}`);
    const scale=Math.max(landing?25:5,Math.abs(x)*1.5,Math.abs(y)*1.2),target=[w/2,h-20],craft=[w/2+x/scale*100,h-20-y/scale*115];
    if(landing){c.strokeStyle='#ffffff35';c.beginPath();c.moveTo(12,h-19);c.lineTo(w-12,h-19);c.stroke();}
    line(craft,target);dot(...target,'#a8d8bd',5);dot(...craft,'#fff',5);
  }
  function orbit(position,radius,altitude,body='Earth',target=null){
    const range=Math.max(radius*1.25,Math.hypot(...position)*1.13),scale=70/range,cx=w/2,cy=h/2;
    setup(target?`Pad · ${fmt(Math.hypot(position[0]-target[0],position[1]-target[1]))}`:`${body} · ${fmt(altitude)} alt`);
    c.strokeStyle=body==='Earth'?'#8abce788':'#c8c8c866';c.beginPath();c.arc(cx,cy,radius*scale,0,Math.PI*2);c.stroke();
    if(body==='Earth'){c.setLineDash([3,6]);c.strokeStyle='#a8d8bd70';c.beginPath();c.arc(cx,cy,(radius+ORBIT_TARGET)*scale,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    const craft=[cx+position[0]*scale,cy-position[1]*scale];
    if(target){const p=[cx+target[0]*scale,cy-target[1]*scale];line(craft,p);dot(...p,'#a8d8bd');}
    dot(...craft,'#fff',5);
  }
  function updatePractice(state){
    const f=state?.flight;if(!f||['failed','docked','landed','assembly'].includes(state.phase)){node.hidden=true;return;}
    if(f.kind==='landing'||f.kind==='docking')local(f.position,f.kind==='landing');
    else orbit(f.position,EARTH.radius,Math.hypot(...f.position)-EARTH.radius);
  }
  function updateMission(m,t){
    if(!m||['landed','failed','rollout','countdown'].includes(m.phase)){node.hidden=true;return;}
    if(m.kind==='custom-descent'||(['descent','landing'].includes(m.phase)&&t.positionLocal)){local(t.positionLocal??m.position,true);return;}
    if(m.primary==='moon'){
      const angle=moonState(m.time).angle+Math.PI+(t.site?.longitude??0)*Math.PI/180;
      orbit(m.position,MOON.radius,t.altitude,'Moon',[Math.cos(angle)*MOON.radius,Math.sin(angle)*MOON.radius]);return;
    }
    const world=getMissionWorldState(m),moon=moonState(m.time);
    if(['launch','orbit','window'].includes(m.phase)){orbit(world.position,EARTH.radius,t.altitude);return;}
    // Orient the schematic toward the actual Moon without inventing a route.
    const a=Math.atan2(moon.position[1],moon.position[0]),rotate=p=>[p[0]*Math.cos(a)+p[1]*Math.sin(a),-p[0]*Math.sin(a)+p[1]*Math.cos(a)];
    const [origin,craft,target]=fitMiniMapPoints([[0,0],rotate(world.position),rotate(moon.position)],w,h);
    setup(`Moon · ${fmt(Math.hypot(world.position[0]-moon.position[0],world.position[1]-moon.position[1]))}`);
    dot(...origin,'#9bcaff',5);line(craft,target);dot(...target,'#a8d8bd',5);dot(...craft,'#fff',5);
  }
  return{updatePractice,updateMission,destroy(){node.remove();}};
}
