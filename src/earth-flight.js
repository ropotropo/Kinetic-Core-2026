// Independent local Earth VTOL exercise, not an orbit/transfer solver. Fictional
// hardware; spherical map displacement, constant gravity and low quadratic drag.
// Altitude is the rocket base position in metres MSL, as are all surface heights.
// Velocities are m/s, lat/lng degrees, heading radians; all physics uses SI.
const G = 9.80665;
const RADIUS = 6371000;
const STEP = 1 / 60;
const TAU = 2 * Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
const wrap = v => ((v + 180) % 360 + 360) % 360 - 180;

export function createEarthFlight({lat, lng, surface = 0}) {
  return {
    lat: clamp(finite(lat), -84.9, 84.9), lng: wrap(finite(lng)),
    altitude: finite(surface) + 120, velocity: [0, 0, 0], heading: 0,
    fuel: 2000, dryMass: 6000, thrust: 180000, time: 0,
    phase: 'flying', assist: true, thrustFraction: 0,
    surfaceHeight: finite(surface), surfaceKind: 'ground',
    dataPending: false, stepRemainder: 0,
  };
}

function readSurface(provider, lat, lng) {
  const s = typeof provider === 'function' ? provider(lat, lng) : null;
  return s?.ready === true && Number.isFinite(s.height)
    && (s.kind === 'ground' || s.kind === 'building') ? s : null;
}

// Mutates and returns state. assist is a level (the UI owns the B-key toggle).
// Inputs are body-relative: forward=north at heading 0, right=east, yaw+=east.
// Without assist vertical requests signed thrust; with assist it requests m/s.
// Space/brake requests powered velocity arrest on all axes. No keyboard/DOM IO.
export function stepEarthFlight(state, input = {}, dt = 0, surfaceProvider) {
  if (state.phase === 'crashed') return state;
  if (typeof input.assist === 'boolean') state.assist = input.assist;
  const current = readSurface(surfaceProvider, state.lat, state.lng);
  if (!current) {
    state.dataPending = true;
    state.stepRemainder = 0;
    return state;
  }
  state.dataPending = false;
  state.surfaceHeight = current.height;
  state.surfaceKind = current.kind;
  state.stepRemainder += clamp(finite(dt), 0, 0.25);
  const axis = name => clamp(finite(input[name]), -1, 1);
  const forward = axis('forward'), right = axis('right');
  const vertical = axis('vertical'), yaw = axis('yaw');
  while (state.stepRemainder + 1e-12 >= STEP) {
    const startSurface = readSurface(surfaceProvider, state.lat, state.lng);
    if (!startSurface) {
      state.dataPending = true;
      state.stepRemainder = 0;
      break;
    }
    const relaunch = state.phase === 'landed' && vertical > 0 && state.fuel > 0;
    const onPad = state.phase === 'landed' && !relaunch;
    const heading = ((state.heading + yaw * 1.2 * STEP) % TAU + TAU) % TAU;
    const [east, north, up] = state.velocity;
    const mass = state.dryMass + Math.max(0, state.fuel);
    const maxAcceleration = state.thrust / mass;
    let ae = 10 * (forward * Math.sin(heading) + right * Math.cos(heading));
    let an = 10 * (forward * Math.cos(heading) - right * Math.sin(heading));
    let au = state.assist ? G + (vertical * 15 - up) / 0.5 : vertical * maxAcceleration;
    if (input.brake) {
      ae -= east / 0.5;
      an -= north / 0.5;
      au = G + (vertical * 15 - up) / 0.5;
    }
    if (onPad) ae = an = au = 0;
    const demand = Math.hypot(ae, an, au);
    const fraction = demand > 0 ? Math.min(1, maxAcceleration / demand) : 0;
    const requestedForce = demand * fraction * mass;
    const requestedFuel = requestedForce * STEP / (320 * G);
    const burn = Math.min(Math.max(0, state.fuel), requestedFuel);
    const powered = requestedFuel > 0 ? fraction * burn / requestedFuel : 0;
    // Cd*A=3 m², sea-level density. Physical drag only; no lateral assist damping.
    const drag = 0.5 * 1.225 * 3 * Math.hypot(east, north, up) / mass;
    const velocity = onPad ? [0, 0, 0] : [
      east + (ae * powered - drag * east) * STEP,
      north + (an * powered - drag * north) * STEP,
      up + (au * powered - G - drag * up) * STEP,
    ];
    const lat = clamp(state.lat + velocity[1] * STEP / RADIUS * 180 / Math.PI, -84.9, 84.9);
    const lng = wrap(state.lng + velocity[0] * STEP
      / (RADIUS * Math.cos(state.lat * Math.PI / 180)) * 180 / Math.PI);
    const altitude = onPad ? startSurface.height : state.altitude + velocity[2] * STEP;
    // Sample the swept footprint at <=1 m intervals, including the endpoint.
    // Buildings are solid height columns; no mesh/overhang or orbital physics.
    const samples = Math.max(1, Math.ceil(Math.hypot(velocity[0], velocity[1]) * STEP));
    let surface = startSurface, contact = null, pending = false;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const sampleLat = state.lat + (lat - state.lat) * t;
      const sampleLng = wrap(state.lng + wrap(lng - state.lng) * t);
      const s = readSurface(surfaceProvider, sampleLat, sampleLng);
      if (!s) { pending = true; break; }
      const height = state.altitude + (altitude - state.altitude) * t;
      if (!onPad && height <= s.height) {
        contact = {lat: sampleLat, lng: sampleLng, surface: s, altitude: height,
          side: s.kind === 'building' && state.altitude < s.height
            && (s.height > startSurface.height || state.altitude < startSurface.height)};
        break;
      }
      surface = s;
    }
    if (pending) {
      state.dataPending = true;
      state.stepRemainder = 0;
      break;
    }
    state.lat = contact?.lat ?? lat;
    state.lng = contact?.lng ?? lng;
    surface = contact?.surface ?? surface;
    state.altitude = contact ? (contact.side ? contact.altitude : surface.height) : altitude;
    state.velocity = velocity;
    state.heading = heading;
    state.fuel = Math.max(0, state.fuel - burn);
    state.thrustFraction = state.thrust > 0 ? burn * 320 * G / STEP / state.thrust : 0;
    state.surfaceHeight = surface.height;
    state.surfaceKind = surface.kind;
    state.time += STEP;
    state.stepRemainder = Math.max(0, state.stepRemainder - STEP);
    if (relaunch) state.phase = 'flying';
    if (contact) {
      state.phase = !contact.side && Math.abs(velocity[2]) <= 2
        && Math.hypot(velocity[0], velocity[1]) <= 2 ? 'landed' : 'crashed';
      if (state.phase === 'landed') state.velocity = [0, 0, 0];
      state.stepRemainder = 0;
      break;
    }
  }
  return state;
}

export function earthFlightTelemetry(state) {
  return {
    altitudeMSL: state.altitude, altitudeAGL: state.altitude - state.surfaceHeight,
    altitudeUnit: 'm', surfaceHeight: state.surfaceHeight, surfaceKind: state.surfaceKind,
    speed: Math.hypot(...state.velocity), horizontalSpeed: Math.hypot(...state.velocity.slice(0, 2)),
    verticalSpeed: state.velocity[2], speedUnit: 'm/s', fuel: state.fuel, fuelUnit: 'kg',
    fuelFraction: clamp(state.fuel / 2000, 0, 1), phase: state.phase,
    status: state.dataPending ? 'data-pending' : state.phase,
    dataPending: state.dataPending, assist: state.assist,
    thrustFraction: state.thrustFraction, time: state.time,
  };
}
