import { LANDER, LANDING_LIMITS } from './landing.js';

// This coach reads physical state. It never steers or changes the simulation.
export function installLandingDirector() {
  const node = document.createElement('div');
  node.className = 'landing-director';
  node.hidden = true;
  node.setAttribute('aria-label', 'Landing next action');
  node.setAttribute('role', 'status');
  node.innerHTML = '<strong></strong><span></span>';
  // The coach occupies a dedicated row between the scene and engine controls.
  // It cannot cover the primary instruments or the landing target on a phone.
  const controls = document.getElementById('docking-camera-controls');
  controls.before(node);
  let last = '';
  return function update(state) {
    const flight = state.flight;
    node.hidden = flight?.kind !== 'landing' || state.phase !== 'landing';
    if (node.hidden) return;
    const mass = LANDER.dryMass + flight.fuel;
    const net = flight.scenario.thrustLimit / mass - flight.gravity;
    const down = Math.max(0, -flight.velocity[1]);
    const stoppingDistance = net > 0 ? down * down / (2 * net) : Infinity;
    const offset = flight.position[0], drift = flight.velocity[0], height = flight.position[1];
    const critical = height < stoppingDistance * 1.25 + 8 && down > LANDING_LIMITS.verticalSpeed;
    let title, action;
    if (state.paused) { title = 'Ready for descent'; action = state.landingAssist ? 'Landing assist is on.' : 'Set engine power, then resume.'; }
    else if (flight.fuel <= 0) { title = 'Propellant depleted'; action = 'Restore a checkpoint to retry.'; }
    else if (state.throttle <= .001) { title = 'Engine ceiling is zero'; action = 'Increase power to brake the descent.'; }
    else if (critical) { title = 'Braking margin low'; action = state.landingAssist ? 'Keep the engine ceiling at 100%.' : 'Increase power and stay upright.'; }
    else if (height < 100 && Math.abs(drift) > LANDING_LIMITS.horizontalSpeed) { title = 'Reduce lateral drift'; action = state.landingAssist ? 'Assist is controlling the approach.' : `Tilt ${drift > 0 ? 'left' : 'right'} to counter drift.`; }
    else if (Math.abs(offset) > LANDING_LIMITS.padRadius) { title = 'Align over the pad'; action = `Landing zone is to your ${offset > 0 ? 'left' : 'right'}.`; }
    else if (height < 80) { title = 'Final descent'; action = 'Contact below 2 m/s, inside the pad.'; }
    else { title = 'Control descent'; action = state.landingAssist ? 'Landing assist on. Keep power available.' : 'Manage power and keep the lander upright.'; }
    const signature = title + action;
    if (signature !== last) { node.firstElementChild.textContent = title; node.lastElementChild.textContent = action; last = signature; }
    node.dataset.warning = String(!state.paused && (critical || flight.fuel <= 0 || state.throttle <= .001));
  };
}
