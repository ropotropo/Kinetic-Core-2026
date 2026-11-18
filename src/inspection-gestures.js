// Pointer bookkeeping only; this never touches flight controls or state.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createInspectionGestures(){
  const pointers=new Map();let anchor=null;
  const sample=()=>{const points=[...pointers.values()];if(points.length===1)return {count:1,x:points[0].x,y:points[0].y};if(points.length===2)return {count:2,distance:Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)};return {count:points.length};};
  const rebase=()=>{anchor=sample();};
  return {
    has:id=>pointers.has(id),
    down(id,x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;pointers.set(id,{x,y});rebase();},
    move(id,x,y,width,height){
      if(!pointers.has(id)||!Number.isFinite(x)||!Number.isFinite(y))return null;
      const previous=anchor;pointers.set(id,{x,y});const next=sample();anchor=next;
      if(!previous||next.count!==previous.count)return null;
      if(next.count===1){const dx=clamp((next.x-previous.x)/Math.max(1,width),-.06,.06),dy=clamp((next.y-previous.y)/Math.max(1,height),-.06,.06);return {yaw:-dx*Math.PI*2,pitch:-dy*Math.PI,zoom:1};}
      if(next.count===2&&previous.distance>=8&&next.distance>=8)return {yaw:0,pitch:0,zoom:clamp(previous.distance/next.distance,1/1.18,1.18)};
      return null;
    },
    up(id){pointers.delete(id);rebase();},
    clear(){pointers.clear();anchor=null;},
  };
}
