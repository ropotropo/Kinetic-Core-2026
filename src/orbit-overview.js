import * as THREE from 'three';
// Metres scaled uniformly for an inertial orbit view. Markers are enlarged.
export function createOrbitOverview(scene,texture){
  const root=new THREE.Group();root.visible=false;scene.add(root);const scale=20/6371000;
  const globe=new THREE.Mesh(new THREE.SphereGeometry(20,64,40),new THREE.MeshBasicMaterial({map:texture}));root.add(globe);
  const craft=new THREE.Mesh(new THREE.SphereGeometry(.35,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));root.add(craft);
  const station=new THREE.Mesh(new THREE.OctahedronGeometry(.4),new THREE.MeshBasicMaterial({color:0x9bcaff}));root.add(station);
  const trail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xc0dbff}));root.add(trail);
  const orbit=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2,r=(6371000+200000)*scale;orbit.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0));}
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbit),new THREE.LineBasicMaterial({color:0x344657})));
  let points=[],last=-1,markers=[];
  return {root,update(view,debris){
    const p=view.positionSI;if(!p)return;const t=view.time??0;
    if(t<last){points=[];last=-1;}
    craft.position.set(p[0]*scale,p[1]*scale,.1);
    if(t-last>1||last<0){points.push(craft.position.clone());if(points.length>1000)points.shift();trail.geometry.dispose();trail.geometry=new THREE.BufferGeometry().setFromPoints(points);last=t;}
    const theta=t*Math.sqrt(3.986004418e14/(6571000**3));station.position.set(Math.cos(theta)*6571000*scale,Math.sin(theta)*6571000*scale,.1);globe.rotation.y=t*.0000729;
    while(markers.length<debris.length){const m=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:0xedb96d}));markers.push(m);root.add(m);}
    markers.forEach((m,i)=>{const b=debris[i]?.body;m.visible=!!b;if(b)m.position.set(b.position[0]*scale,b.position[1]*scale,.15);});
  }};
}
