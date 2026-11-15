// Visual debris uses the same inertial metre/second frame as launch physics.
// Springs/spin are fictional separation hardware, not certified stage dynamics.
const MU=3.986004418e14;
export function advanceBallistic(body,dt){
  const count=Math.ceil(Math.max(0,dt)/.25);if(!count)return;
  const h=dt/count;
  for(let i=0;i<count;i++){
    const r=Math.hypot(...body.position),a=body.position.map(x=>-MU*x/r**3);
    const next=body.position.map((x,j)=>x+body.velocity[j]*h+.5*a[j]*h*h);
    const nr=Math.hypot(...next),na=next.map(x=>-MU*x/nr**3);
    body.velocity=body.velocity.map((v,j)=>v+.5*(a[j]+na[j])*h);body.position=next;
  }
}
export function inertialToLocal(position,origin){
  const r=Math.hypot(...origin),ux=origin[0]/r,uy=origin[1]/r;
  const x=position[0]-origin[0],y=position[1]-origin[1];
  return [-uy*x+ux*y,ux*x+uy*y];
}
export function releaseBody(position,velocity,pitch){
  const r=Math.hypot(...position),u=position.map(x=>x/r),e=[-u[1],u[0]];
  const axis=u.map((x,i)=>x*Math.cos(pitch)+e[i]*Math.sin(pitch));
  return {position:position.slice(),velocity:velocity.map((v,i)=>v-axis[i]*2),age:0};
}
