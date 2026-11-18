import { EARTH, FIXED_STEP, ORBIT_TARGET, atmosphere, getLaunchTelemetry, stepLaunch } from './physics.js';
const EPSILON = 1e-6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// This fictional vehicle ceiling matches launchSubstep's strict q > 110 kPa
// failure condition. Regression tests bind it to the solver; the two display
// margins give notice before that ceiling without adding a new physics rule.
export const ASCENT_PRESSURE_LIMIT = 110000;
export function getAscentLoadIndicator(dynamicPressure) {
  const pressure = Number.isFinite(dynamicPressure) && dynamicPressure >= 0 ? dynamicPressure : null;
  const fraction = pressure === null ? null : pressure / ASCENT_PRESSURE_LIMIT;
  return { pressure, fraction, limit: ASCENT_PRESSURE_LIMIT,
    state: fraction === null ? 'unknown' : fraction >= .95 ? 'danger' : fraction >= .8 ? 'caution' : 'normal' };
}

export function activeMissionEngine(flight) {
  if (!flight) return null;
  if (flight.kind === 'lunar-mission' && flight.resources) {
    const r = flight.resources, upper = r.upperAttached;
    return { index: upper ? 1 : 2, attached: true, name: upper ? 'Upper stage' : 'Spacecraft', fuel: upper ? r.upperFuel : r.serviceFuel,
      initialFuel: upper ? r.initialUpperFuel : r.initialServiceFuel, thrust: upper ? r.upperThrust : r.serviceThrust, isp: upper ? r.upperIsp : r.serviceIsp, vacuum: true };
  }
  const launch = flight.kind === 'lunar-mission' ? flight.launch : flight;
  if (launch?.kind !== 'launch') return null;
  const stage = launch.stages?.[launch.stageIndex];
  return stage?.attached ? { index: launch.stageIndex, attached: true, name: stage.name, fuel: stage.fuel, initialFuel: stage.propellant,
    thrust: stage.thrustVac, isp: stage.ispVac, stage, vacuum: false } : null;
}

export function needsStageRelease(flight) {
  const engine = activeMissionEngine(flight);
  const launch = flight?.kind === 'lunar-mission' ? flight.launch : flight;
  return Boolean(engine?.attached && engine.index < 2 && engine.fuel <= (flight.resources ? .001 : EPSILON) && launch?.liftoff && ['launch', 'departure'].includes(flight.phase));
}

// The caller pauses at this physical boundary. No automatic stage release,
// velocity change, engine assistance or synthetic mission-time progress occurs.
export function advanceToStageBoundary(flight, input, duration, step = stepLaunch) {
  if (!Number.isFinite(duration) || duration <= 0) return { held: needsStageRelease(flight), advanced: 0 };
  let remaining = duration, advanced = 0;
  while (remaining > 1e-10) {
    if (needsStageRelease(flight)) return { held: true, advanced };
    // A coast budget must not carry its multiplier into a new powered phase.
    // Locate the transition by probing the existing solver, then retain only
    // its physical boundary state and discard the unused fast-forward budget.
    if (flight.kind === 'lunar-mission' && ['orbit', 'window', 'coast', 'lunar-coast', 'lunar-orbit'].includes(flight.phase)) {
      const initial = structuredClone(flight), phase = flight.phase;
      step(flight, input, remaining);
      if (flight.phase !== phase) {
        let low = 0, high = remaining, boundary = flight;
        for (let i = 0; i < 40 && high - low > FIXED_STEP / 64; i++) {
          const probe = structuredClone(initial), middle = (low + high) / 2;
          step(probe, input, middle);
          if (probe.phase === phase) low = middle; else { high = middle; boundary = probe; }
        }
        Object.assign(flight, boundary);
        return { held: needsStageRelease(flight), advanced: advanced + high, phaseChanged: true };
      }
      return { held: needsStageRelease(flight), advanced: advanced + remaining };
    }
    const engine = activeMissionEngine(flight);
    const watchStage = engine?.index < 2 && ['launch', 'departure'].includes(flight.phase);
    const dt = watchStage ? Math.min(FIXED_STEP, remaining) : remaining;
    step(flight, input, dt); remaining -= dt; advanced += dt;
    if (['failed', 'landed'].includes(flight.phase)) break;
  }
  return { held: needsStageRelease(flight), advanced };
}

export function getEngineReadout(flight, telemetry = {}) {
  const engine = activeMissionEngine(flight);
  if (!engine) return { name: 'Spacecraft', index: 2, fuel: 0, fraction: 0, massFlow: 0, burnSeconds: null };
  let isp = engine.isp;
  if (!engine.vacuum) {
    const pressure = clamp(atmosphere(telemetry.altitude ?? 0).pressure / 101290, 0, 1);
    isp = engine.stage.ispVac - (engine.stage.ispVac - engine.stage.ispSea) * pressure;
  }
  const thrust = telemetry.thrust ?? (telemetry.maxThrust ?? engine.thrust) * (telemetry.throttle ?? 0);
  const massFlow = thrust > 0 && isp > 0 ? thrust / (isp * EARTH.g0) : 0;
  return { name: engine.name, index: engine.index, fuel: engine.fuel,
    fraction: engine.initialFuel > 0 ? clamp(engine.fuel / engine.initialFuel, 0, 1) : 0,
    massFlow, burnSeconds: engine.fuel <= EPSILON ? 0 : massFlow > 0 ? engine.fuel / massFlow : null };
}

export function getAscentGuidance(flight, telemetry = getLaunchTelemetry(flight), { countdown = 0, guidance = true, paused = false } = {}) {
  const fuel = getEngineReadout(flight, telemetry), stageRequired = needsStageRelease(flight);
  const orbit = telemetry.orbit;
  const orbitConfirmed = flight.phase === 'orbit' && orbit?.energy < 0 && orbit.periapsis >= 150000 && orbit.apoapsis >= 180000 && telemetry.altitude >= 150000;
  let next = countdown > 0 ? 'Ignition countdown. Guidance flies the ascent; stage release is manual.'
    : stageRequired ? `${fuel.index === 0 ? 'Booster' : 'Upper stage'} empty. Flight held — select Separate stage.`
    : orbitConfirmed ? telemetry.canDock ? 'Earth orbit confirmed. Docking opens a separate practice.' : 'Earth orbit confirmed. Release the upper stage for docking practice.'
    : flight.phase === 'failed' ? flight.failure
    : paused ? 'Flight paused. Resume when ready; stage release stays manual.'
    : !flight.liftoff ? 'Ignition. Wait for positive thrust to lift the vehicle.'
    : telemetry.altitude < 1200 ? 'Climb vertically. Guidance begins the pitch turn above 1.2 km.'
    : !guidance ? 'Manual ascent: control pitch and thrust; watch speed and both apsides.'
    : telemetry.altitude < 100000 ? 'Guidance is turning toward orbit. Separate the active stage only when empty.'
    : 'Build orbital speed. Both apsides must clear the atmosphere; altitude alone is not orbit.';
  return { ...fuel, stageRequired, orbitConfirmed, next, targetAltitude: ORBIT_TARGET,
    altitude: telemetry.altitude, altitudeFraction: clamp(telemetry.altitude / ORBIT_TARGET, 0, 1) };
}

let readoutId = 0;
export function installAscentReadouts({ scene, tools, icon, onToggle = () => {}, buttonClass = 'kc-tool' }) {
  const id = `ascent-mini-${++readoutId}`;
  const hud = document.createElement('div'); hud.className = 'ascent-reference'; hud.hidden = true;
  hud.innerHTML = '<div class="ascent-fuel-line"><span data-engine></span><strong data-fuel></strong><small data-burn></small></div><div class="ascent-pressure-readout" hidden><span>Dynamic pressure</span><strong data-pressure></strong></div><div class="ascent-altitude-reference"><div><span>Altitude reference</span><strong data-altitude></strong></div><meter min="0" max="200000" value="0" aria-label="Altitude reference only, not orbit completion"></meter><small data-orbit-note>Orbit also needs speed and safe apsides.</small></div>';
  const panel = document.createElement('div'); panel.className = 'ascent-mini-telemetry'; panel.id = id; panel.hidden = true; panel.setAttribute('aria-label', 'Optional live flight telemetry'); panel.innerHTML = '<dl></dl>';
  const button = document.createElement('button'); button.type = 'button'; button.className = buttonClass + ' ascent-data-toggle'; button.hidden = true;
  button.setAttribute('aria-label', 'Show compact live telemetry'); button.title = 'Live telemetry'; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', id);
  button.innerHTML = `${icon('chart')}<span${buttonClass === 'kc-tool' ? ' class="kc-tool-label"' : ''}>Data</span>`;
  tools.append(button); scene.append(hud, panel);
  const pressureScope = scene.closest('.game-shell, .mission-control');
  let expanded = false;
  button.onclick = () => { onToggle(); expanded = !expanded; panel.hidden = !expanded; button.setAttribute('aria-expanded', String(expanded)); button.setAttribute('aria-pressed', String(expanded)); button.setAttribute('aria-label', expanded ? 'Hide compact live telemetry' : 'Show compact live telemetry'); };
  const number = (value, decimals = 1) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: decimals }) : '—';
  const text = (selector, value) => { const node = hud.querySelector(selector); if (node.textContent !== value) node.textContent = value; };
  return { update(flight, telemetry = {}, options = {}) {
    const launch = flight?.kind === 'lunar-mission' ? flight.launch : flight?.kind === 'launch' ? flight : null;
    const earthAscent = launch && ['launch', 'orbit', 'failed'].includes(flight.phase) && (flight.primary ?? 'earth') === 'earth' && (flight.phase !== 'failed' || launch.phase === 'failed');
    const load = getAscentLoadIndicator(earthAscent ? launch.dynamicPressure : null);
    if (pressureScope) pressureScope.dataset.aeroPressure = load.state;
    hud.dataset.aeroPressure = load.state;
    hud.querySelector('.ascent-pressure-readout').hidden = !['caution', 'danger'].includes(load.state);
    text('[data-pressure]', `${number(load.pressure === null ? NaN : load.pressure / 1000)} / ${number(load.limit / 1000, 0)} kPa`);
    const available = flight && ['launch', 'orbit', 'window', 'departure', 'coast', 'lunar-approach', 'lunar-coast', 'capture', 'lunar-orbit', 'descent', 'landing'].includes(flight.phase) && ['launch', 'lunar-mission'].includes(flight.kind);
    hud.hidden = !available; button.hidden = !available; panel.hidden = !available || !expanded; if (!available) return;
    const fuel = getEngineReadout(flight, telemetry), ascent = ['launch', 'orbit'].includes(flight.phase) && (flight.primary ?? 'earth') === 'earth';
    text('[data-engine]', flight.kind === 'launch' && fuel.index >= 2 ? 'Launch stages released' : fuel.name); text('[data-fuel]', flight.kind === 'launch' && fuel.index >= 2 ? 'Spacecraft ready' : `${number(fuel.fuel / 1000, 2)} t propellant`);
    text('[data-burn]', fuel.burnSeconds === null ? 'Engine off' : fuel.burnSeconds === 0 ? 'Stage empty' : `~${number(fuel.burnSeconds, 0)} s at ${options.paused ? 'last' : 'current'} thrust`);
    hud.querySelector('.ascent-altitude-reference').hidden = !ascent;
    if (ascent) {
      const guide = getAscentGuidance(launch, telemetry, options);
      text('[data-altitude]', `${number(guide.altitude / 1000)} / ${number(guide.targetAltitude / 1000, 0)} km`);
      hud.querySelector('meter').value = clamp(guide.altitude, 0, guide.targetAltitude);
      text('[data-orbit-note]', guide.orbitConfirmed ? 'Bound orbit and safe apsides confirmed.' : 'Altitude alone is not orbit; speed and apsides matter.');
      hud.classList.toggle('is-orbit-confirmed', guide.orbitConfirmed);
    }
    if (expanded) {
      const orbit = telemetry.orbit;
      const rows = [['Pitch', `${number((telemetry.pitch ?? 0) * 180 / Math.PI)}°`], ['Engine applied', `${number((telemetry.throttle ?? 0) * 100, 0)}%`], ...(orbit ? [['Periapsis', `${number(orbit.periapsis / 1000)} km`], ['Apoapsis', Number.isFinite(orbit.apoapsis) ? `${number(orbit.apoapsis / 1000)} km` : 'Unbound']] : [['Speed', `${number(telemetry.speed / 1000, 2)} km/s`], ['Engine Δv', `${number(telemetry.remainingDeltaV, 0)} m/s`]])];
      if (earthAscent) rows.push(['Dynamic pressure', `${number(load.pressure === null ? NaN : load.pressure / 1000)} kPa`, load.state]);
      panel.querySelector('dl').innerHTML = rows.map(([label, value, pressureState]) => `<div><dt>${label}</dt><dd${pressureState ? ` data-aero-pressure="${pressureState}"` : ''}>${value}</dd></div>`).join('');
    }
  } };
}

// Only physically unpowered coasts may accelerate. Terminal controls and every
// powered maneuver stay at real time even if a faster coast rate was selected.
export function getFlightTimePolicy(flight, requested = 1, { guidance = flight?.guide, altitude = Infinity } = {}) {
  const selected = Number.isFinite(requested) && requested >= 1 ? requested : 1;
  const phase = flight?.phase;
  let maximum = 1, reason = 'Flight controls run at 1× real time.', coasting = false;
  if (flight?.kind === 'launch' && phase === 'orbit' && getAscentGuidance(flight).orbitConfirmed) {
    maximum = 10; coasting = true; reason = 'Confirmed Earth orbit. Unpowered coast can run faster.';
  } else if (flight?.kind === 'lunar-mission' && ['orbit', 'window', 'coast', 'lunar-coast', 'lunar-orbit'].includes(phase)) {
    const manualLunarBurn = guidance === false && ['lunar-coast', 'lunar-orbit'].includes(phase);
    if (!manualLunarBurn) {
      maximum = flight.primary === 'moon' ? 5000 : 50000; coasting = true;
      if (flight.primary === 'moon' && altitude < 50000) maximum = 1;
      reason = maximum === 1 ? 'Close lunar approach stays at 1×.' : 'Unpowered coast. Time returns to 1× for the next burn.';
    } else reason = 'Manual thrust is available here. Keep the maneuver at 1×.';
  } else if (['rollout', 'countdown', 'launch'].includes(phase)) reason = 'Launch and stage release run at 1× real time.';
  else if (['departure', 'lunar-approach', 'capture', 'descent', 'landing'].includes(phase)) reason = 'Powered approach and landing run at 1× real time.';
  else if (flight?.kind === 'docking') reason = 'Docking alignment and contact run at 1× real time.';
  if (needsStageRelease(flight)) { maximum = 1; coasting = false; reason = 'Release the depleted stage before continuing at 1×.'; }
  return { requested: selected, applied: Math.min(selected, maximum), maximum, coasting: coasting && maximum > 1, reason };
}
