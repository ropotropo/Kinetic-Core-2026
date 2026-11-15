// A trajectory overview is an explicit orbital inspection mode, never a
// replacement for the launch camera or a view carried into another mission.
export function shouldShowOrbitOverview(view){
  return view.mode==='launch'&&view.phase==='orbit'&&view.orbitOverview===true
    &&Array.isArray(view.positionSI)&&view.positionSI.length===2
    &&view.positionSI.every(Number.isFinite);
}
