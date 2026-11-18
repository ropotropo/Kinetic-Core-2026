// Visual response to applied thrust, not a fluid/condensation or power model.
export function descentPlumeResponse(appliedThrottle,atmosphere=false){
  const power=Math.max(0,Math.min(1,Number.isFinite(appliedThrottle)?appliedThrottle:0));
  if(power<=.001)return {visible:false,length:0,width:0,opacity:0,coreOpacity:0};
  const root=Math.sqrt(power);
  return {visible:true,length:.5+7*root,width:(atmosphere?.38:.5)+(atmosphere?.8:1.2)*root,opacity:.08+.19*root,coreOpacity:.16+.32*power};
}
