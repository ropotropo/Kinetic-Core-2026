import * as THREE from 'three';
import './rollout.css';
import { icon } from './ui-icons.js';

// Fictional ground-handling exercise. Metres, seconds and radians throughout.
// A low-speed tracked kinematic model: driven acceleration, rolling resistance,
// service brake and differential steering; no suspension or structural solver.
const STEP = 1 / 60;
const PAD_Z = -180;
const LIMITS = Object.freeze({ position: 2, heading: 4 * Math.PI / 180, speed: 0.08 });
const clamp = THREE.MathUtils.clamp;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));

/**
 * onOpen(): pause the host game and clear its held inputs.
 * onClose({reason}): overlay has closed; reason is 'cancel' or 'ready'.
 * onReady(result): once per open, after manual placement and confirmation;
 * called AFTER onClose. Host decides whether/how to resume or start launch.
 * open() starts a fresh exercise. close() cancels. destroy() releases resources.
 */
export function createRollout({ onOpen = () => {}, onClose = () => {}, onReady = () => {} } = {}) {
  if (![onOpen, onClose, onReady].every(fn => typeof fn === 'function')) {
    throw new TypeError('Rollout callbacks must be functions.');
  }
  const panel = document.createElement('dialog');
  panel.className = 'rollout';
  panel.setAttribute('aria-label', 'Manual launch vehicle rollout');
  panel.innerHTML = `
    <canvas class="rollout-scene" aria-label="3D crawler carrying a rocket from assembly to launchpad"></canvas>
    <header class="rollout-header"><div><span class="rollout-eyebrow">Practice · manual ground handling</span><h1>Rollout to the pad</h1></div><button type="button" class="kc-tool" data-return aria-label="Return to game" title="Return to game">${icon('back')}</button></header>
    <section class="rollout-instruments" aria-label="Rollout telemetry">
      <div><span>Pad distance</span><output data-distance>360.0</output><small>m</small><em data-check="distance">Target ≤2 m</em></div>
      <div><span>Ground speed</span><output data-speed>0.00</output><small>m/s</small><em data-check="speed">Stop ≤0.08 m/s</em></div>
      <div><span>Heading</span><output data-heading>000.0</output><small>°</small><em data-check="heading">Target 000° ±4°</em></div>
      <div class="rollout-alignment"><output data-alignment>Approach</output><small data-offset></small></div>
    </section>
    <nav class="rollout-view-tools" aria-label="Rollout view tools"><button type="button" class="kc-tool" data-camera aria-label="Camera: chase. Switch to overview" title="Camera: chase" aria-pressed="false">${icon('camera')}<span class="kc-tool-label" data-camera-label>Chase</span></button><button type="button" class="kc-tool" data-pause aria-pressed="false" aria-label="Pause rollout" title="Pause rollout">${icon('pause')}<span class="kc-tool-label">Pause</span></button><button type="button" class="kc-tool" data-info aria-label="Rollout controls and information" title="Rollout information" aria-haspopup="dialog">${icon('info')}<span class="kc-tool-label">Info</span></button></nav>
    <section class="rollout-command" aria-label="Driving controls">
      <p data-status role="status" aria-live="polite">Drive out of assembly and follow the road to the launchpad.</p>
      <div class="rollout-touch" role="group" aria-label="Hold to drive">
        <button type="button" data-drive="left" aria-label="Hold to steer left">${icon('chevron-left')}<span>Left</span></button>
        <button type="button" data-drive="forward" aria-label="Hold to accelerate forward">${icon('arrow-up')}<span>Forward</span></button>
        <button type="button" data-drive="brake" aria-label="Hold service brake">${icon('pause')}<span>Brake</span></button>
        <button type="button" data-drive="reverse" aria-label="Hold to accelerate in reverse">${icon('arrow-down')}<span>Reverse</span></button>
        <button type="button" data-drive="right" aria-label="Hold to steer right">${icon('chevron-right')}<span>Right</span></button>
      </div>
      <div class="rollout-handoff"><span>Meet all three parking limits.</span><button type="button" class="kc-action kc-action-primary" data-ready disabled>Confirm placement</button></div>
    </section><dialog class="rollout-info" aria-labelledby="rollout-info-title"><header><h2 id="rollout-info-title">Park at the launchpad</h2><button type="button" class="kc-tool" data-info-close aria-label="Close rollout information">${icon('close')}</button></header><div><p>Follow the centre line. Park within <strong>2 m</strong>, align to <strong>000° ±4°</strong> and brake below <strong>0.08 m/s</strong>. The indicators follow your actual position, heading and speed.</p><dl><dt>W / ↑</dt><dd>Accelerate forward</dd><dt>S / ↓</dt><dd>Reverse</dd><dt>A / D / ← / →</dt><dd>Steer</dd><dt>Space</dt><dd>Service brake</dd><dt>P</dt><dd>Pause / resume</dd></dl><p>Touch: hold the labelled driving controls. Keyboard: focused driving buttons also work with Enter or Space. Information pauses rollout; close it and choose Resume when ready.</p><details><summary>Model and mission boundary</summary><p>This is an independent ground-handling exercise with fictional hardware and a procedural launch site. Its low-speed kinematic model includes acceleration, rolling resistance, differential steering and service braking; suspension and structural loads are not simulated.</p><p>Confirm becomes available only after the physical parking limits and the route's travel requirement are met. This is distinct from the Moon mission's rollout cinematic.</p></details></div></dialog>`;
  document.body.append(panel);
  const $ = selector => panel.querySelector(selector);
  const canvas = $('canvas');
  const info = $('.rollout-info');
  const keys = new Set();
  const pointers = new Map();
  const buttonKeys = new Set();
  const abort = new AbortController();
  const listen = (target, event, fn, options = {}) => target.addEventListener(event, fn, { ...options, signal: abort.signal });
  let renderer, scene, camera, crawler, trackRuns = [], wheels = [];
  let active = false, paused = false, destroyed = false, readySent = false, overview = false;
  let animation = 0, previousTime = 0, accumulator = 0, hudTime = 0, previousFocus;
  let width = 0, height = 0;
  const state = { x: 0, z: 180, heading: 0, speed: 0, distanceTravelled: 0 };
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const keyActions = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'reverse', ArrowDown: 'reverse', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'brake' };

  function release() {
    keys.clear(); pointers.clear(); buttonKeys.clear();
    panel.querySelectorAll('[data-drive]').forEach(button => button.classList.remove('is-held'));
  }
  function held(action) { return [...keys].some(code => keyActions[code] === action) || buttonKeys.has(action) || [...pointers.values()].includes(action); }
  function metrics() {
    return { distance: Math.hypot(state.x, state.z - PAD_Z), headingError: Math.abs(angle(state.heading)), speed: Math.abs(state.speed) };
  }
  function aligned() {
    const m = metrics();
    return active && !paused && !readySent && state.distanceTravelled > 300 && m.distance <= LIMITS.position && m.headingError <= LIMITS.heading && m.speed <= LIMITS.speed;
  }
  function setPaused(value) {
    paused = value; release(); accumulator = 0; previousTime = 0;
    $('[data-pause]').innerHTML = `${icon(paused ? 'play' : 'pause')}<span class="kc-tool-label">${paused ? 'Resume' : 'Pause'}</span>`;
    $('[data-pause]').setAttribute('aria-label', paused ? 'Resume rollout' : 'Pause rollout');
    $('[data-pause]').title = paused ? 'Resume rollout' : 'Pause rollout';
    $('[data-pause]').setAttribute('aria-pressed', String(paused));
    updateHUD();
  }

  function initScene() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101821);
    scene.fog = new THREE.Fog(0x101821, 350, 1100);
    camera = new THREE.PerspectiveCamera(48, 1, 0.2, 1800);
    scene.add(new THREE.HemisphereLight(0xc9e2ff, 0x444034, 2.2));
    const sun = new THREE.DirectionalLight(0xffecd1, 3.4);
    sun.position.set(-160, 240, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -280, right: 280, top: 280, bottom: -280, near: 1, far: 700 });
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    const materials = {};
    const mat = (name, color, metalness = 0, roughness = 0.8) => (materials[name] ||= new THREE.MeshStandardMaterial({ color, metalness, roughness }));
    const concrete = mat('concrete', 0x777a78);
    const steel = mat('steel', 0x424b50, 0.65, 0.45);
    const dark = mat('dark', 0x161c20, 0.45);
    const white = mat('white', 0xe5e6df, 0.2, 0.4);
    const amber = mat('amber', 0xdfae5d, 0.3);
    const blue = mat('blue', 0x91c4eb, 0.3);
    const red = mat('red', 0x873b30, 0.5);
    const mesh = (parent, geometry, material, x = 0, y = 0, z = 0) => {
      const item = new THREE.Mesh(geometry, material);
      item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
    };
    const box = (p, w, h, d, m, x = 0, y = 0, z = 0) => mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const cylinder = (p, top, bottom, h, m, x, y, z, segments = 24) => mesh(p, new THREE.CylinderGeometry(top, bottom, h, segments), m, x, y, z);
    const beam = (p, a, b, radius = 0.18, material = steel) => {
      const direction = new THREE.Vector3().subVectors(b, a);
      const item = cylinder(p, radius, radius, direction.length(), material, 0, 0, 0, 8);
      item.position.copy(a).add(b).multiplyScalar(0.5);
      item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return item;
    };
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    box(scene, 1400, 1, 1500, mat('terrain', 0x3f4c42), 0, -0.65, 0);
    box(scene, 42, 0.22, 490, mat('road', 0x686b66), 0, -0.02, 25);
    for (const x of [-20, 20]) box(scene, 0.22, 0.03, 460, white, x, 0.12, 25);
    for (let z = -135; z < 220; z += 18) {
      box(scene, 0.3, 0.03, 8, amber, 0, 0.13, z);
      for (const x of [-25, 25]) { cylinder(scene, 0.16, 0.2, 1.1, steel, x, 0.55, z); cylinder(scene, 0.23, 0.23, 0.22, blue, x, 1.15, z); }
    }
    // Open assembly bay: side walls, roof, ribs, doors and work apron.
    box(scene, 100, 0.3, 100, concrete, 0, 0, 235);
    box(scene, 3, 103, 76, mat('building', 0x899393, 0.25), -39, 51, 253);
    box(scene, 3, 103, 76, materials.building, 39, 51, 253);
    box(scene, 80, 103, 3, materials.building, 0, 51, 290);
    box(scene, 80, 3, 78, materials.building, 0, 103, 252);
    for (let x = -36; x <= 36; x += 6) box(scene, 0.5, 100, 0.5, white, x, 51, 291.7);
    for (const x of [-38, 38]) {
      box(scene, 8, 95, 2, steel, x, 47.5, 213);
      for (let y = 5; y < 100; y += 8) box(scene, 8, 0.4, 2.4, dark, x, y, 212);
    }
    for (let y = 15; y < 102; y += 18) beam(scene, v(-37, y, 214), v(37, y, 214), 0.35);
    // Actual pad apron with flame trench, receiving platform and target rails.
    box(scene, 112, 0.5, 112, concrete, 0, 0, PAD_Z);
    box(scene, 12, 0.04, 75, dark, 0, 0.28, PAD_Z - 9);
    for (const x of [-11, 11]) box(scene, 7, 0.3, 40, steel, x, 0.32, PAD_Z);
    for (const x of [-16.5, 16.5]) box(scene, 0.35, 0.05, 36, blue, x, 0.51, PAD_Z);
    for (const z of [PAD_Z - 18, PAD_Z + 18]) box(scene, 33, 0.05, 0.35, blue, 0, 0.51, z);
    for (const x of [-24, 24]) for (const z of [PAD_Z - 25, PAD_Z + 25]) {
      box(scene, 4, 2, 4, steel, x, 1, z);
      box(scene, 4.3, 0.2, 4.3, amber, x, 2.1, z);
    }
    // Lattice service tower, access levels, stairs, swing arms and lightning mast.
    const tx = 31, tz = PAD_Z - 10;
    for (const x of [-5, 5]) for (const z of [-5, 5]) box(scene, 0.8, 85, 0.8, steel, tx + x, 42.5, tz + z);
    for (let y = 3; y <= 84; y += 7) {
      box(scene, 12, 0.35, 12, steel, tx, y, tz);
      for (const z of [-5, 5]) { beam(scene, v(tx - 5, y, tz + z), v(tx + 5, y + 7, tz + z)); beam(scene, v(tx + 5, y, tz + z), v(tx - 5, y + 7, tz + z)); }
      beam(scene, v(tx - 5, y, tz - 5), v(tx - 5, y + 7, tz + 5));
      if (y > 35 && y < 80) box(scene, 17, 0.6, 2, white, tx - 10, y, tz);
    }
    cylinder(scene, 0.12, 0.25, 24, white, tx, 96, tz);
    for (const x of [-65, 65]) {
      cylinder(scene, 5, 5, 14, white, x, 7, PAD_Z - 60);
      mesh(scene, new THREE.SphereGeometry(5, 20, 12), white, x, 14, PAD_Z - 60).scale.y = 0.5;
      beam(scene, v(x, 1, PAD_Z - 60), v(x, 1, PAD_Z), 0.5);
    }
    box(scene, 42, 10, 20, materials.building, -100, 5, -90);
    for (let x = -115; x < -85; x += 6) box(scene, 4, 2, 0.1, blue, x, 6, -79.9);

    crawler = new THREE.Group(); scene.add(crawler);
    // Four twin-track corner bogies; visible road wheels, shoes and sprockets.
    for (const x of [-11, 11]) for (const z of [-10, 10]) {
      box(crawler, 7, 2.7, 12, dark, x, 2.25, z);
      box(crawler, 5, 1.4, 9, steel, x, 4, z);
      for (const side of [-1, 1]) {
        const sx = x + side * 2.6;
        for (let i = 0; i < 6; i++) {
          const wheel = cylinder(crawler, 1.22, 1.22, 1, steel, sx, 2.2, z - 4.4 + i * 1.76, 16);
          wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
          const hub = cylinder(crawler, 0.43, 0.43, 1.1, amber, sx, 2.2, z - 4.4 + i * 1.76, 12); hub.rotation.z = Math.PI / 2;
        }
        const shoes = [];
        for (let i = 0; i < 30; i++) shoes.push(box(crawler, 1.7, 0.25, 0.65, steel));
        trackRuns.push({ x: sx, z, phase: 0, shoes });
      }
      cylinder(crawler, 1, 1, 2.5, steel, x, 5, z);
    }
    box(crawler, 31, 2.2, 34, steel, 0, 5.8, 0);
    box(crawler, 33, 0.7, 36, concrete, 0, 7.25, 0);
    for (let z = -15; z <= 15; z += 5) {
      box(crawler, 30, 0.6, 0.7, dark, 0, 4.6, z);
      for (const side of [-1, 1]) beam(crawler, v(side * 14, 4.8, z - 2), v(side * 14, 6.5, z + 2), 0.16, amber);
    }
    for (const side of [-1, 1]) {
      for (let z = -17; z <= 17; z += 3.4) cylinder(crawler, 0.07, 0.07, 1.5, amber, side * 16, 8.3, z, 6);
      beam(crawler, v(side * 16, 9.05, -17), v(side * 16, 9.05, 17), 0.08, amber);
      box(crawler, 3.8, 3.5, 4.5, white, side * 12.5, 8.8, -14);
      box(crawler, 3, 1.5, 0.12, blue, side * 12.5, 9.3, -16.3);
      for (let z = -9; z < 12; z += 4) box(crawler, 3, 1.7, 2.4, dark, side * 12.6, 8.4, z);
      for (let i = 0; i < 10; i++) box(crawler, 2, 0.15, 0.7, steel, side * 15, 7.6 + i * 0.16, 9 + i * 0.6);
    }
    // Launch mount, engines, tanks, interstage, booster separation bands and fins.
    for (const x of [-5, 5]) for (const z of [-5, 5]) box(crawler, 1.2, 3, 1.2, red, x, 9, z);
    cylinder(crawler, 6.6, 6.6, 0.8, steel, 0, 10.4, 0);
    cylinder(crawler, 4.2, 4.2, 35, white, 0, 30, 0, 40);
    cylinder(crawler, 4.3, 4.3, 3.5, dark, 0, 49.2, 0, 40);
    cylinder(crawler, 4.2, 4.2, 17, white, 0, 59.5, 0, 40);
    cylinder(crawler, 5.1, 4.2, 4, white, 0, 70, 0, 40);
    cylinder(crawler, 5.1, 5.1, 9, white, 0, 76.5, 0, 40);
    mesh(crawler, new THREE.ConeGeometry(5.1, 11, 40), white, 0, 86.5, 0);
    for (const y of [13, 25, 46, 52, 67, 72, 81]) cylinder(crawler, y < 68 ? 4.25 : 5.15, y < 68 ? 4.25 : 5.15, 0.22, steel, 0, y, 0, 40);
    box(crawler, 0.16, 27, 0.24, steel, 4.2, 30, 0);
    for (const x of [-6.2, 6.2]) {
      cylinder(crawler, 1.7, 1.7, 29, white, x, 28, 0);
      mesh(crawler, new THREE.ConeGeometry(1.7, 5, 24), white, x, 45, 0);
      cylinder(crawler, 1.3, 2, 2.4, dark, x, 12.5, 0);
      for (const y of [17, 28, 40]) cylinder(crawler, 1.75, 1.75, 0.4, steel, x, y, 0);
      box(crawler, 2, 0.5, 0.7, steel, x * 0.7, 39, 0);
    }
    for (const x of [-1.8, 1.8]) for (const z of [-1.8, 1.8]) cylinder(crawler, 0.65, 1.25, 2.8, dark, x, 11.4, z);
    for (let i = 0; i < 4; i++) {
      const fin = box(crawler, 0.18, 5, 4.7, steel, 0, 15, 5.1);
      const pivot = new THREE.Group(); crawler.add(pivot); pivot.add(fin); pivot.rotation.y = i * Math.PI / 2;
    }
    updateVehicle(0);
  }

  function step(dt) {
    const drive = Number(held('forward')) - Number(held('reverse'));
    const brake = held('brake');
    if (brake) state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - 2.4 * dt);
    else {
      state.speed += drive * 0.65 * dt;
      state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - 0.1 * dt);
    }
    state.speed = clamp(state.speed, -2, 6);
    const steer = Number(held('right')) - Number(held('left'));
    state.heading = angle(state.heading + steer * state.speed / 22 * dt);
    const dx = Math.sin(state.heading) * state.speed * dt;
    const dz = -Math.cos(state.heading) * state.speed * dt;
    const x = clamp(state.x + dx, -135, 135), z = clamp(state.z + dz, -280, 205);
    state.distanceTravelled += Math.hypot(x - state.x, z - state.z);
    if (x !== state.x + dx || z !== state.z + dz) state.speed = 0;
    state.x = x; state.z = z;
    // Stop against the tower base instead of letting the vehicle pass through it.
    if (Math.abs(state.x - 31) < 22 && Math.abs(state.z - (PAD_Z - 10)) < 27) {
      state.x -= dx; state.z -= dz; state.speed = 0;
    }
    updateVehicle(dt);
  }
  function updateVehicle(dt) {
    crawler.position.set(state.x, 0, state.z);
    crawler.rotation.y = -state.heading;
    for (const wheel of wheels) wheel.rotation.x -= state.speed * dt / 1.22;
    for (const track of trackRuns) {
      track.phase = (track.phase + state.speed * dt) % 29.2;
      track.shoes.forEach((shoe, index) => {
        const t = ((index / track.shoes.length * 29.2 + track.phase) % 29.2 + 29.2) % 29.2;
        // Rectangular closed belt with rounded end arcs.
        let y, z, rotation = 0;
        if (t < 10) { z = -5 + t; y = 0.7; }
        else if (t < 14.6) { const a = (t - 10) / 4.6 * Math.PI; z = 5 + Math.sin(a) * 1.46; y = 2.16 - Math.cos(a) * 1.46; rotation = -a; }
        else if (t < 24.6) { z = 5 - (t - 14.6); y = 3.62; }
        else { const a = (t - 24.6) / 4.6 * Math.PI; z = -5 - Math.sin(a) * 1.46; y = 2.16 + Math.cos(a) * 1.46; rotation = -a; }
        shoe.position.set(track.x, y, track.z + z); shoe.rotation.x = rotation;
      });
    }
  }
  function updateHUD() {
    const m = metrics(), ready = aligned();
    $('[data-distance]').textContent = m.distance.toFixed(1);
    $('[data-speed]').textContent = state.speed.toFixed(2);
    $('[data-heading]').textContent = ((state.heading * 180 / Math.PI + 360) % 360).toFixed(1).padStart(5, '0');
    $('[data-offset]').textContent = `Lateral ${Math.abs(state.x).toFixed(1)} m · angle ${(m.headingError * 180 / Math.PI).toFixed(1)}°`;
    $('[data-alignment]').textContent = ready ? 'In position' : m.distance < 20 ? 'Fine approach' : 'Approach';
    $('[data-ready]').disabled = !ready;
    panel.classList.toggle('is-aligned', ready);
    for(const [name,passed] of [['distance',m.distance<=LIMITS.position&&state.distanceTravelled>300],['speed',m.speed<=LIMITS.speed],['heading',m.headingError<=LIMITS.heading]]){$(`[data-check="${name}"]`).classList.toggle('is-met',passed);$(`[data-check="${name}"]`).setAttribute('aria-label',`${name} parking limit ${passed?'met':'not met'}`);}
    const message = paused ? 'Paused. Resume when ready.' : ready ? 'Parking limits verified. Confirm placement.' : m.distance < 20 ? 'Align with the pad outline and brake to a stop.' : m.distance < 90 ? 'Pad ahead. Slow down and align to 000°.' : 'Follow the centre line to the launchpad.';
    if ($('[data-status]').textContent !== message) $('[data-status]').textContent = message;
  }
  function frame(now) {
    if (!active) return;
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
    previousTime = now;
    if (!paused) { accumulator += dt; while (accumulator >= STEP) { step(STEP); accumulator -= STEP; } }
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const narrow = w < 700;
    if (overview) desiredCamera.set(state.x + 150, 230, state.z + 130);
    // Road-side three-quarter chase: keep the camera ahead of the crawler,
    // clear of the assembly bay (z = 213–292), even at the initial position.
    // A world-aligned offset also prevents steering from swinging into its wall.
    else desiredCamera.set(state.x + 65, narrow ? 112 : 87, state.z - (narrow ? 175 : 145));
    camera.position.copy(desiredCamera);
    cameraTarget.set(state.x, overview ? 0 : 37, state.z - (overview ? 65 : 14)); camera.lookAt(cameraTarget);
    hudTime += dt; if (hudTime >= 0.1) { updateHUD(); hudTime = 0; }
    renderer.render(scene, camera);
    animation = requestAnimationFrame(frame);
  }
  function close(reason = 'cancel') {
    if (!active) return;
    active = false; release(); cancelAnimationFrame(animation); accumulator = 0;
    if (info.open) info.close();
    panel.close();
    if (previousFocus?.isConnected) previousFocus.focus();
    onClose({ reason });
  }
  listen($('[data-return]'), 'click', () => close());
  listen(panel, 'cancel', event => { event.preventDefault(); close(); });
  listen($('[data-pause]'), 'click', () => setPaused(!paused));
  listen($('[data-camera]'), 'click', () => { overview = !overview; $('[data-camera-label]').textContent=overview?'Overview':'Chase';$('[data-camera]').setAttribute('aria-pressed',String(overview));$('[data-camera]').setAttribute('aria-label',`Camera: ${overview?'overview. Switch to chase':'chase. Switch to overview'}`);$('[data-camera]').title=`Camera: ${overview?'overview':'chase'}`; });
  listen($('[data-info]'),'click',()=>{setPaused(true);info.showModal();$('[data-info-close]').focus();});listen($('[data-info-close]'),'click',()=>info.close());listen(info,'close',()=>{if(active)$('[data-info]').focus({preventScroll:true});});
  listen($('[data-ready]'), 'click', () => {
    if (!aligned()) return;
    readySent = true;
    const result = Object.freeze({ position: Object.freeze({ x: state.x, z: state.z }), speed: state.speed, heading: state.heading, distance: metrics().distance, distanceTravelled: state.distanceTravelled, units: 'm, s, rad', scenario: 'procedural-rollout' });
    close('ready'); onReady(result);
  });
  listen(window, 'keydown', event => {
    if (!active) return;
    const focusedDialog = event.target.closest?.('dialog');
    if (focusedDialog && focusedDialog !== info) return;
    if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(info.open)info.close();else close();return;}
    if(info.open)return;
    if(event.target instanceof Element&&(event.target.closest('input,select,textarea,summary,a,[contenteditable="true"]')||event.target.closest('button')&&['Space','Enter'].includes(event.code)))return;
    const action = keyActions[event.code];
    if (action) { event.preventDefault(); event.stopImmediatePropagation(); if (!paused && !event.repeat) keys.add(event.code); }
    else if (event.code === 'KeyP') { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) setPaused(!paused); }
  }, { capture: true });
  listen(window, 'keyup', event => {
    if (!active || !keyActions[event.code]) return;
    if(event.target instanceof Element&&event.target.closest('button')&&['Space','Enter'].includes(event.code))return;
    event.preventDefault(); event.stopImmediatePropagation(); keys.delete(event.code);
  }, { capture: true });
  listen(window, 'blur', () => { if (active) setPaused(true); });
  listen(document, 'visibilitychange', () => { if (active && document.hidden) setPaused(true); });
  panel.querySelectorAll('[data-drive]').forEach(button => {
    const action = button.dataset.drive;
    listen(button, 'pointerdown', event => {
      if (paused || !active || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); button.focus(); button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, action); button.classList.add('is-held');
    });
    const end = event => { pointers.delete(event.pointerId); if (![...pointers.values()].includes(action)&&!buttonKeys.has(action)) button.classList.remove('is-held'); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, type, end);
    // Focused held controls keep normal Enter/Space ownership; elsewhere Space brakes.
    listen(button, 'keydown', event => { if (['Enter','Space'].includes(event.code)) { event.preventDefault();event.stopPropagation();if(!paused){buttonKeys.add(action);button.classList.add('is-held');} } });
    listen(button, 'keyup', event => { if (['Enter','Space'].includes(event.code)) { event.preventDefault();event.stopPropagation();buttonKeys.delete(action);if(![...pointers.values()].includes(action))button.classList.remove('is-held'); } });
    listen(button, 'blur', () => { buttonKeys.delete(action);if(![...pointers.values()].includes(action))button.classList.remove('is-held'); });
  });
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); if (active) { setPaused(true); $('[data-status]').textContent = '3D graphics interrupted. Return and reopen the exercise.'; } });
  return {
    pause(value=true){setPaused(value);},
    open() {
      if (destroyed) throw new Error('Rollout controller has been destroyed.');
      if (active) { $('[data-return]').focus(); return; }
      previousFocus = document.activeElement;
      if (!renderer) {
        try { initScene(); } catch (error) { renderer?.dispose(); renderer = undefined; throw new Error('Rollout requires WebGL graphics support.', { cause: error }); }
      }
      onOpen();
      Object.assign(state, { x: 0, z: 180, heading: 0, speed: 0, distanceTravelled: 0 });
      active = true; readySent = false; previousTime = 0; hudTime = 0;
      updateVehicle(0); panel.showModal(); setPaused(false); $('[data-return]').focus();
      animation = requestAnimationFrame(frame);
    },
    close: () => close(),
    destroy() {
      if (destroyed) return;
      close(); destroyed = true; abort.abort();
      const geometries = new Set(), materials = new Set();
      scene?.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      renderer?.dispose(); panel.remove(); trackRuns = []; wheels = [];
    },
  };
}
