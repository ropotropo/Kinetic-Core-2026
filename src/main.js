// Mykyta is the sole game author. Development used AI assistance.
import './styles.css';
import { KC_MARKUP } from './brand.js';
import './solar-view.css';
import { CATALOG, DEFAULT_CONFIG, resolveConfig } from './catalog.js';
import { evaluateVehicle, createLaunch, stepLaunch, separateStage, getLaunchTelemetry, createDocking, stepDocking, getDockingTelemetry, orbitalElements, validateState } from './physics.js';
import { createScene } from './scene.js';
import { installNavigation } from './navigation.js';
import { createSolarView } from './solar-view.js';
import { installLandingDirector } from './landing-director.js';
import { installSiteMenu } from './site-menu.js';
import { createOnlineEarth } from './earth-online.js';
import { createRollout } from './rollout.js';
import { createRocketWorkshop } from './rocket-workshop.js';
import { createMissionControl } from './mission-control.js';
import { installModeHub } from './mode-hub.js';
import { landingAssistInput } from './landing-assist.js';
import { createEuropaGuide } from './europa-guide.js';
import { DESTINATIONS } from './destinations.js';
import { createLanding, stepLanding, getLandingTelemetry } from './landing.js';
import { makeCheckpoint, readCheckpoint, writeCheckpoint, validateCheckpoint, restoreCheckpointFlight } from './storage.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fmt = (x, digits = 0) => Number.isFinite(x) ? x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
const km = x => Number.isFinite(x) ? fmt(x / 1000, 1) : 'Escape';
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { capsule: 'Command capsule', service: 'Service module', upper: 'Upper stage', core: 'Core stage', cargo: 'Mission payload', site: 'Launch site' };
const categories = ['capsule', 'service', 'upper', 'core'];
const DOCKING_CAMERA_VIEWS = Object.freeze({
  chase: { label: 'External chase', hint: 'Follows the spacecraft. Drag for a 360° inspection; scroll to zoom.' },
  port: { label: 'Docking camera', hint: 'Nose-mounted alignment view along the docking axis. Use RCS to align; the camera does not steer.' },
  cockpit: { label: 'Cockpit', hint: 'Illustrative crew-eye view follows your actual attitude. Translation and rotation controls stay the same.' },
});
let storage = null;
try { storage = window.localStorage; } catch { /* Private modes may deny storage. */ }
const configValid = c => c && Object.keys(DEFAULT_CONFIG).every(k => CATALOG[k].some(p => p.id === c[k]));
const saved = readCheckpoint(storage, configValid);
let checkpoint = saved.checkpoint;
const state = { phase: 'assembly', config: { ...DEFAULT_CONFIG }, destination: 'moon', preview: false, flight: null, paused: false, warp: 10, throttle: 1, guidance: true, holdAttitude: true, cameraMode: 'chase', countdown: 0, log: [], selectedSlot: 'core', fine: false, landingAssist: false, outcomeDismissed: false };
const keys = new Set();
let rolloutReady=false;
let orbitOverview=false;
let earthViewOpen=false;
function syncOrbitView(){
  if(state.phase!=='orbit')orbitOverview=false;
  const button=$('orbit-overview-button');
  if(!button)return;
  button.disabled=state.phase!=='orbit';
  button.textContent=orbitOverview?'Return to spacecraft':'Orbit / trajectory view';
  button.title=state.phase==='orbit'?'Switch between spacecraft and trajectory cameras':'Available after orbital insertion';
  button.setAttribute('aria-pressed',String(orbitOverview));
}
const touch = new Set();
let vehicleSignature = '';
let modeHub;
let renderer, accumulator = 0, lastFrame = performance.now(), lastUI = 0, lastEvent = '', toastTimer, separationRequested = false;

document.getElementById('app').innerHTML = `
<div class="game-shell">
  <header class="app-header">
    <div class="identity"><span class="brand-symbol" aria-hidden="true">${KC_MARKUP}</span><div><span class="brand">Kinetic Core</span><span class="authorship">Created by Mykyta Borisov</span></div></div>
    <div class="flight-identity"><span class="mission-number">Mission laboratory</span><span class="destination-badge" id="destination-badge">Moon / Earth system</span></div>
    <div class="header-actions"><button class="quiet-button" id="guide-button"><span aria-hidden="true">?</span> How to play</button><button class="icon-button" id="pause-button" aria-label="Pause simulation" disabled>Ⅱ</button></div>
  </header>
  <nav class="mission-nav" aria-label="Mission progress"><ol><li id="nav-assembly" class="current"><span>01</span> Vehicle assembly</li><li id="nav-launch"><span>02</span> Ascent &amp; staging</li><li id="nav-docking"><span>03</span> Manual docking</li><li id="nav-landing"><span>04</span> Surface operations</li></ol><div class="simulation-label"><span class="status-dot"></span><span id="simulation-status">Vehicle design</span></div></nav>
  <div class="workspace">
    <aside class="library" aria-label="Vehicle configuration and mission plan">
      <div id="assembly-library"><div class="section-heading"><div><p class="eyebrow">Vehicle architecture</p><h1>Vehicle<br>setup.</h1></div><span class="outline-label">2 stages</span></div><p class="intro-copy">Select the hardware. Check mass and propulsion margins before flight.</p><button class="destination-launcher" id="destination-button"><small>Surface destination</small><strong id="selected-destination">Moon</strong><span>Explore planets & moons</span></button><div id="module-slots" class="module-slots"></div><div class="extra-selects"><label>Mission payload<select id="cargo-select"></select></label><label>Launch site<select id="site-select"></select></label></div><p class="design-disclosure">Fictional training hardware. Performance is calculated from the selected design.</p></div>
      <div id="flight-library" hidden><p class="eyebrow" id="plan-label">Launch operations</p><h1 id="flight-heading">From Earth.<br>To orbit.</h1><div id="flight-plan" class="flight-plan"></div><div class="flight-log"><h2>Flight log</h2><ol id="log-list"></ol></div><button id="return-builder" class="quiet-button full-width">Return to vehicle assembly</button></div>
    </aside>
    <section class="flight-center" aria-label="Interactive spacecraft view">
      <div class="viewport" id="viewport"><canvas id="flight-canvas" aria-label="Three-dimensional spacecraft and flight environment"></canvas><div class="view-heading"><div><p id="view-caption">Vehicle assembly bay</p><span id="view-subtitle">Pioneer / Atlas launch configuration</span></div><button class="view-button" id="camera-button" title="Change camera view">Change view <span aria-hidden="true">↗</span></button></div><div class="view-tabs" id="view-tabs" role="group" aria-label="Workbench view"><button id="vehicle-view" class="selected" aria-pressed="true">Vehicle</button><button id="destination-view" aria-pressed="false">Destination</button></div><div class="model-dimensions" id="model-dimensions"><span id="height-value">—</span><span>overall height</span></div><div class="view-location" id="view-location"><span class="location-marker" aria-hidden="true">+</span><span id="site-caption">Kennedy Space Center, Florida</span></div><div class="flight-clock" id="flight-clock" hidden><span>Mission elapsed time</span><strong id="clock-value">T+ 00:00</strong></div><div class="countdown" id="countdown" hidden><span>Ignition sequence</span><strong id="countdown-number">3</strong></div><div id="descent-hud" class="descent-hud" hidden aria-hidden="true"><div><small>Altitude</small><strong id="hud-altitude">—</strong></div><div><small>Vertical speed</small><strong id="hud-vertical">—</strong></div><div><small>Pad offset</small><strong id="hud-offset">—</strong></div></div><div id="landing-marker" class="landing-marker" hidden aria-hidden="true"><span>+</span><small>Landing zone</small></div><div id="docking-reticle" class="docking-reticle" hidden aria-hidden="true"><span class="reticle-circle"></span><span class="reticle-cross"></span><span id="alignment-dot" class="alignment-dot"></span></div><div id="view-error" class="view-error" hidden><strong>3D graphics are unavailable</strong><p>Enable WebGL in your browser, then reload the game. Your design and checkpoint are safe.</p></div><div class="viewport-bottom"><span id="view-hint">Drag to inspect the vehicle</span><span id="vehicle-label">Pioneer CM</span></div><div id="outcome-overlay" class="outcome-overlay" role="status" aria-live="polite" hidden></div><div id="paused-overlay" class="paused-overlay" hidden><div><p class="eyebrow">Simulation paused</p><h2>Take your time.</h2><p>All thrust inputs are released.</p><button id="resume-button" class="primary-button">Resume flight</button></div></div></div>
      <section class="docking-camera-controls" id="docking-camera-controls" aria-label="Docking camera controls" hidden><div class="docking-camera-buttons" role="group" aria-label="Docking camera view"><span class="docking-camera-label">Camera view</span><button type="button" data-docking-view="chase" aria-pressed="true" class="selected">External chase</button><button type="button" data-docking-view="port" aria-pressed="false">Docking camera</button><button type="button" data-docking-view="cockpit" aria-pressed="false">Cockpit</button></div><p id="docking-camera-guidance" aria-live="polite"></p></section>
      <div class="command-deck" id="command-deck"></div>
      <div class="touch-controls" id="touch-controls" hidden><div class="touch-tabs"><button id="touch-translation" class="selected">Translate</button><button id="touch-rotation">Rotate</button><button id="touch-fine" aria-pressed="false">Fine RCS</button><span>Hold a control to fire RCS</span></div><div id="touch-pad" class="touch-pad"></div></div>
    </section>
    <aside class="instruments" aria-label="Vehicle performance and flight instruments"><div class="instrument-heading"><span class="eyebrow" id="instrument-label">Design performance</span><span class="unit-system">SI</span></div><div id="instrument-values"></div><div id="readiness" class="readiness"></div><div class="checkpoint-section"><div><span class="checkpoint-dot"></span><span id="checkpoint-label">Checkpoints save locally</span></div><button id="save-button" class="secondary-button" disabled>Save checkpoint</button><button id="restore-button" class="quiet-button full-width" ${checkpoint ? '' : 'disabled'}>Restore checkpoint</button></div><div class="training-actions"><button id="practice-button" class="text-button">Docking practice</button><button id="landing-practice" class="text-button">Surface landing practice</button></div></aside>
  </div>
  <footer class="app-footer"><span><span class="status-dot"></span> Mission laboratory <b>v0.4.4</b></span><span id="footer-hint">Design the vehicle. Fly the physics.</span><button id="model-button">Flight model &amp; credits</button></footer>
</div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<dialog id="guide-dialog" class="guide-dialog"><div class="dialog-header"><div><p class="eyebrow">Kinetic Core field guide</p><h2>How to play.</h2></div><button class="icon-button" id="close-guide" aria-label="Close flight guide">×</button></div><div class="guide-content"><section class="quickstart"><h3>Your first Moon mission</h3><ol class="quickstart-steps"><li>Open <strong>Modes → Rocket workshop</strong> and load the <strong>Lunar demonstrator</strong>. Edit or save it if you wish.</li><li>Select <strong>Start Flight → Moon</strong>, choose an approach and start the lunar mission.</li><li>Keep <strong>Powered guidance on</strong> and the engine ceiling at 100% for your first flight. The director flies the first 100 m.</li><li>At core depletion, the game pauses. Select <strong>Separate stage</strong> or press <kbd>Space</kbd> to continue.</li><li>In Earth orbit, select <strong>Plan lunar departure</strong>. Release the depleted upper stage when asked; use time warp during coasts.</li><li>Guidance spends your actual propellant to approach the Moon, capture, orbit and land. Watch altitude, vertical speed and pad offset.</li></ol><p><strong>Save checkpoint</strong> before a risky maneuver. Restore pauses with the engine ceiling at zero: set power before resuming. <kbd>Esc</kbd> pauses and releases held controls.</p></section><section><h3>Practice one maneuver</h3><p><strong>Modes → Manual docking</strong> starts near the station. Choose External chase, Docking camera or Cockpit. WASD translates; R/F moves up/down; arrows turn; Q/E rolls; hold Space to brake. Shift or the phone’s <strong>Fine RCS</strong> toggle reduces thrust.</p><p><strong>Modes → Surface landing</strong> starts a separate landing exercise with <strong>Landing assist</strong> on. W/S adjusts power; A/D or ←/→ tilts. Touch buttons and the slider work on phones. In the integrated mission, turning guidance off exposes the manual pitch buttons; <strong>Cut engine</strong> sets power to zero.</p><p>Docking practice and other-world surface rehearsals skip their transfers. They are separate from the continuous Earth–Moon mission.</p></section><section><h3>Earth launch exercise</h3><p>Select a command capsule, service module and two launch stages. Mass, ideal delta-v and liftoff thrust-to-weight respond to your choices. These are fictional training designs with real physical units.</p></section><section><h3>02 / Reach orbit</h3><p>Guidance steers the rocket using actual thrust; it never changes your position or velocity directly. Keep it on for your first flight. You control staging and the throttle ceiling.</p><dl class="key-guide"><dt><kbd>W</kbd> / <kbd>S</kbd></dt><dd>Increase / decrease throttle</dd><dt><kbd>A</kbd> / <kbd>D</kbd></dt><dd>Pitch trim; manual pitch when guidance is off</dd><dt><kbd>Space</kbd></dt><dd>Separate the active stage</dd><dt><kbd>G</kbd></dt><dd>Toggle ascent guidance</dd></dl><p>The first stage burns out; separate it to ignite the upper stage. After orbital insertion, release the upper stage to expose the spacecraft.</p></section><section><h3>03 / Dock manually</h3><p>After orbit, a separate terminal-approach scenario starts 70 m from a station in a circular reference orbit. It does not simulate the full rendezvous. Nose toward the station is −Z; RCS translation follows the spacecraft's body axes.</p><dl class="key-guide"><dt><kbd>W</kbd> / <kbd>S</kbd></dt><dd>Approach / retreat</dd><dt><kbd>A</kbd> / <kbd>D</kbd></dt><dd>Translate left / right</dd><dt><kbd>R</kbd> / <kbd>F</kbd></dt><dd>Translate up / down</dd><dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></dt><dd>Pitch / yaw</dd><dt><kbd>Q</kbd> / <kbd>E</kbd></dt><dd>Roll</dd><dt><kbd>Shift</kbd></dt><dd>Fine RCS control (20% thrust)</dd><dt><kbd>Space</kbd></dt><dd>Hold translation brake; consumes propellant</dd><dt><kbd>B</kbd></dt><dd>Toggle powered attitude hold</dd></dl><p>Choose <strong>External chase</strong>, <strong>Docking camera</strong> or <strong>Cockpit</strong> in the visible camera row. The docking camera is mounted at the nose; the fictional cockpit follows the spacecraft’s actual attitude. Changing views never changes position, attitude or thrust. Drag to orbit and scroll to zoom in External chase.</p><p>There is no passive vacuum braking. Counter-thrust cancels drift. Slow below 0.15 m/s closing speed before contact, align within 0.35 m and 5°, and keep rotation below 1°/s. All assists use propellant.</p></section><section><h3>04 / Land on another world</h3><p>Select a moon in assembly, inspect its globe, then start surface landing practice. This is a separate terminal descent with a standard fictional lander; launch stages and payload do not change this training vehicle. Transfers, ascent from the moon and sample collection are planned.</p><dl class="key-guide"><dt><kbd>W</kbd> / <kbd>S</kbd></dt><dd>Increase / decrease engine throttle</dd><dt><kbd>A</kbd> / <kbd>D</kbd></dt><dd>Tilt left / right (also left/right arrows)</dd><dt><kbd>B</kbd></dt><dd>Toggle powered upright attitude hold</dd><dt><kbd>Space</kbd></dt><dd>Cut engine throttle</dd></dl><p>Land within 25 m of the pad center, below 2 m/s vertical and 1.5 m/s lateral speed, within 8° of upright and below 3°/s rotation. These are game safety limits. Use the descent camera to inspect the zone; the external camera shows the lander. Small-body exercises begin lower and slower with thrust limited for controllability. Titan uses a simple dense-atmosphere drag model. Radiation, heat, tides, irregular gravity and terrain slopes are not survival models yet.</p><p>The globes use credited NASA/JPL image maps. Local landing terrain, clouds and spacecraft are illustrative procedural reconstructions rather than surveyed surface geometry. Orbital context images are shown for orientation rather than ephemeris-accurate geometry.</p></section><section><h3>Checkpoints &amp; pause</h3><p>Checkpoints save after launch preparation, staging and the terminal-scenario handoff. You can also save manually. <kbd>Esc</kbd> pauses. Leaving the game releases controls and pauses flight. Browser storage may be unavailable in private browsing.</p></section><section id="model-section"><h3>Flight model &amp; credits</h3><p>Fixed-step Newtonian flight, inverse-square Earth gravity, a simplified layered atmosphere, aerodynamic drag, propellant mass flow and stage mass changes. Docking uses local Hill relative motion near a circular orbit and rigid-body RCS rotation. No structural flex, Earth oblateness, full weather, ground-track plane change, long-range rendezvous or certification-grade contact mechanics.</p><p>The pad and station are illustrative; the spacecraft is fictional. Design limits and docking tolerances are game-specific values. Orbit is confirmed from energy and apsides, not an altitude timer.</p><p>Sole game author: <strong>Mykyta Borisov</strong>. No NASA affiliation or endorsement is implied.</p><p>Earth image: NASA Earth Observatory / NASA Goddard Space Flight Center; Blue Marble: Next Generation, produced by Reto Stöckli.</p><ul class="source-links"><li><a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener">NASA 3D Resources: moon and planet visualization maps</a></li><li><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener">NASA SVS: LROC Moon color and LOLA relief maps</a></li><li><a href="https://ssd.jpl.nasa.gov/sats/phys_par/sep.html" target="_blank" rel="noopener">JPL: satellite radii and gravitational parameters</a></li><li><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noopener">NASA Earth Observatory: Blue Marble base map</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" target="_blank" rel="noopener">NASA Glenn: ideal rocket equation</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/" target="_blank" rel="noopener">NASA Glenn: specific impulse</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/" target="_blank" rel="noopener">NASA Glenn: atmosphere approximation</a></li><li><a href="https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/" target="_blank" rel="noopener">NASA Space Apps: Space Mission Design Game</a></li><li><a href="https://threejs.org/" target="_blank" rel="noopener">Three.js — MIT license</a></li></ul><p class="small-copy">Full equations, tests and limitations are included in docs/PHYSICS.md in the repository.</p></section></div></dialog>
<dialog id="destination-dialog" class="destination-dialog"><div class="dialog-header"><div><p class="eyebrow">Solar System destinations</p><h2>Where will you touch down?</h2></div><button id="close-destination" class="icon-button" aria-label="Close destinations">×</button></div><p class="intro-copy">Fourteen destinations. Choose a terminal landing exercise; interplanetary transfers and environmental survival come in later missions.</p><div class="destination-layout"><div id="destination-grid" class="destination-grid" aria-label="Select a destination"></div><section id="destination-detail" class="destination-detail" aria-label="Selected destination"></section></div></dialog>
<dialog id="confirm-dialog" class="confirm-dialog"><p class="eyebrow">Flight decision</p><h2 id="confirm-title"></h2><p id="confirm-copy"></p><div class="button-row"><button id="confirm-cancel" class="secondary-button">Keep flying</button><button id="confirm-action" class="primary-button">Confirm</button></div></dialog>`;

function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4300); }
if (import.meta.env.DEV) window.addEventListener('error', event => notify(`Development error: ${event.message}`));
function log(message) { if (!message || message === lastEvent) return; lastEvent = message; state.log.push({ time: state.flight?.time ?? 0, message }); state.log = state.log.slice(-30); renderLog(); }
function renderLog() { $('log-list').innerHTML = state.log.slice(-5).reverse().map(e => `<li><time>T+${clock(e.time)}</time><span>${escape(e.message)}</span></li>`).join(''); }
function dataValue(id, label, value, unit, detail = '') { return `<div class="instrument"><span class="instrument-name">${label}</span><div><strong id="${id}">${value}</strong><span class="instrument-unit">${unit}</span></div>${detail ? `<small>${detail}</small>` : ''}</div>`; }
function setText(id, value) { const node = $(id); if (node && node.textContent !== String(value)) node.textContent = value; }
function activeFlight() { return ['launch', 'orbit', 'docking', 'landing'].includes(state.phase); }
function clearInputs() { keys.clear(); touch.clear(); document.querySelectorAll('[data-control]').forEach(b => b.classList.remove('firing')); }
function pause(value = !state.paused) { if (!activeFlight()) return; clearInputs(); state.paused = value; accumulator = 0; $('paused-overlay').hidden = !value; $('pause-button').textContent = value ? '▶' : 'Ⅱ'; $('pause-button').setAttribute('aria-label', value ? 'Resume simulation' : 'Pause simulation'); setText('simulation-status', value ? 'Simulation paused' : state.phase === 'orbit' ? 'Orbital coast' : state.phase === 'launch' ? 'Ascent simulation' : state.phase === 'landing' ? 'Powered descent' : 'Terminal approach'); }
function save(silent = false) { if (state.phase === 'failed') return; const snapshot = makeCheckpoint(state.config, state.phase, state.flight, state.log, state.destination); if (!validateCheckpoint(snapshot, configValid)) { if (!silent) notify('This flight state cannot be saved safely. Your previous checkpoint is intact.'); return; } checkpoint = snapshot; const persisted = writeCheckpoint(storage, snapshot, configValid); $('restore-button').disabled = false; setText('checkpoint-label', persisted ? `Saved at ${new Date(snapshot.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Checkpoint kept for this session'); if (!silent) notify(persisted ? 'Checkpoint saved on this device.' : 'Checkpoint kept in memory. Browser storage is unavailable.'); }

function trustedRestore(snapshot) {
  if (!validateCheckpoint(snapshot, configValid)) return false;
  const raw = snapshot.flight;
  let flight;
  try { flight = restoreCheckpointFlight(snapshot, configValid); } catch { return false; }
  state.destination = snapshot.flight?.destination ?? snapshot.destination ?? state.destination; state.preview = false; state.outcomeDismissed = false; state.config = { ...snapshot.config }; state.phase = snapshot.phase; state.flight = flight; state.log = structuredClone(snapshot.log); state.countdown = 0; state.throttle = flight?.commandedThrottle ?? 1; state.guidance = flight?.guidance ?? true; state.holdAttitude = flight?.holdAttitude ?? true; state.landingAssist = false; state.paused = false; clearInputs(); accumulator = 0; renderPhase(); if (activeFlight()) pause(true); log('Checkpoint restored.'); return true;
}

function restore() { if (!checkpoint || !trustedRestore(checkpoint)) { notify('This checkpoint cannot be restored. Start a new flight.'); return; } notify('Checkpoint restored. Resume when you are ready.'); }
let confirmAction = null, confirmWasPaused = false;
function confirm(title, copy, action, label = 'Confirm') { confirmWasPaused = state.paused; pause(true); $('confirm-title').textContent = title; $('confirm-copy').textContent = copy; $('confirm-action').textContent = label; confirmAction = action; $('confirm-dialog').showModal(); }
$('confirm-cancel').onclick = () => { separationRequested = false; $('confirm-dialog').close(); if (!confirmWasPaused) pause(false); };
$('confirm-action').onclick = () => { $('confirm-dialog').close(); const action = confirmAction; confirmAction = null; action?.(); };
$('confirm-dialog').addEventListener('cancel', () => { separationRequested = false; if (!confirmWasPaused) pause(false); });

function assemble() { state.preview = false; state.outcomeDismissed = false; clearInputs(); separationRequested = false; state.phase = 'assembly'; state.flight = null; state.paused = false; state.countdown = 0; accumulator = 0; renderPhase(); }
function beginLaunch() { if(!rolloutReady){rollout.open();return;}rolloutReady=false;state.preview = false; state.outcomeDismissed = false; if (!evaluateVehicle(state.config).valid || !renderer) return; clearInputs(); state.flight = createLaunch(state.config); state.phase = 'launch'; state.throttle = 1; state.guidance = true; state.paused = false; state.countdown = 3; state.log = []; lastEvent = ''; accumulator = 0; renderPhase(); save(true); log('Launch sequence armed. Guidance active; staging is manual.'); }
function beginDocking(practice = false) { state.preview = false; state.outcomeDismissed = false; clearInputs(); state.flight = createDocking(state.config); state.phase = 'docking'; state.paused = false; state.holdAttitude = true; state.fine = false; state.cameraMode = 'chase'; renderer?.resetOrbit?.(); state.warp = 1; state.countdown = 0; accumulator = 0; renderPhase(); log(practice ? 'Terminal docking practice. The launch phase has been skipped.' : 'Terminal approach scenario loaded. Long-range rendezvous is not simulated.'); save(true); }
function stage() { if (!state.flight || state.flight.kind !== 'launch' || state.countdown > 0 || state.paused || separationRequested) return; const execute = () => { separationRequested = false; const result = separateStage(state.flight); if (result.ok) { state.paused = false; renderer?.update({ mode: 'launch', ...getLaunchTelemetry(state.flight), phase: state.phase, positionSI: state.flight.position.slice(), velocitySI: state.flight.velocity.slice(), separation: state.flight.stageIndex, stageIndex: state.flight.stageIndex }, 0); log(result.message); save(true); renderPhase(); } else notify(result.message); }; const t = getLaunchTelemetry(state.flight); if (state.phase === 'launch' && t.fuelFraction > 0.05) { separationRequested = true; confirm('Separate a fueled stage?', `${fmt(t.fuel / 1000, 1)} tonnes of propellant will be discarded. This cannot be recovered during the flight.`, execute, 'Separate stage'); } else execute(); }

function renderBuilder() {
  const vehicle = evaluateVehicle(state.config), parts = vehicle.parts;
  $('module-slots').innerHTML = categories.map((category, index) => `<section class="module-slot ${state.selectedSlot === category ? 'expanded' : ''}"><button class="slot-heading" data-slot="${category}" aria-expanded="${state.selectedSlot === category}"><span class="slot-number">${String(index + 1).padStart(2, '0')}</span><span><small>${labels[category]}</small><strong>${escape(parts[category].name)}</strong></span><span class="slot-chevron" aria-hidden="true">${state.selectedSlot === category ? '−' : '+'}</span></button><div class="part-options" ${state.selectedSlot === category ? '' : 'hidden'}>${CATALOG[category].map(part => `<button class="part-option ${part.id === state.config[category] ? 'selected' : ''}" data-category="${category}" data-part="${part.id}" aria-pressed="${part.id === state.config[category]}"><span><strong>${escape(part.name)}</strong><small>${escape(part.description)}</small></span><span class="selection-circle" aria-hidden="true"></span><span class="part-mass">${fmt((part.dryMass + (part.propellant ?? part.rcsFuel ?? 0)) / 1000, 1)} t</span></button>`).join('')}</div></section>`).join('');
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { state.selectedSlot = state.selectedSlot === b.dataset.slot ? null : b.dataset.slot; renderBuilder(); });
  document.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { state.config[b.dataset.category] = b.dataset.part; renderBuilder(); updateVehicle(); renderInstruments(); renderCommand(); });
  for (const key of ['cargo', 'site']) { const select = $(`${key}-select`); select.innerHTML = CATALOG[key].map(p => `<option value="${p.id}">${escape(p.name)}</option>`).join(''); select.value = state.config[key]; select.onchange = () => { state.config[key] = select.value; updateVehicle(); renderInstruments(); renderCommand(); }; }
  setText('height-value', `${fmt(vehicle.height, 1)} m`); setText('view-subtitle', `${parts.capsule.name} / ${parts.core.name}`); setText('site-caption', parts.site.id === 'kennedy' ? 'Kennedy Space Center, Florida' : 'Wallops Flight Facility, Virginia');
}
function updateVehicle() { const summary = evaluateVehicle(state.config); const signature = JSON.stringify(state.config); if (renderer && signature !== vehicleSignature) { renderer.setVehicle({ config: state.config, ...summary.parts, summary }); vehicleSignature = signature; } setText('vehicle-label', `${summary.parts.capsule.name} + ${summary.parts.service.name}`); setText('site-caption', summary.parts.site.id === 'kennedy' ? 'Kennedy Space Center, Florida' : 'Wallops Flight Facility, Virginia'); }
const destination = () => DESTINATIONS.find(d => d.id === state.destination) ?? DESTINATIONS[0];
function beginLanding(assisted = false) {
  assisted = assisted === true;
  if (!renderer) return;
  clearInputs(); state.preview = false; state.outcomeDismissed = false;
  state.flight = createLanding(state.destination); state.phase = 'landing';
  state.landingAssist = assisted; if(assisted) state.flight.event = 'Powered landing assist controls thrust and attitude using finite propellant.'; state.throttle = assisted ? 1 : state.flight.throttle ?? 0; state.holdAttitude = true;
  state.paused = false; state.countdown = 0; state.warp = 1; state.cameraMode = 'chase';
  state.log = []; lastEvent = ''; accumulator = 0;
  renderPhase(); log(`${destination().name} terminal descent exercise. Standard training lander; transfer skipped.`); save(true); pause(true);
}
function openDestinations() { renderDestinations(); $('destination-dialog').showModal(); }
function renderDestinations() {
  $('destination-grid').innerHTML = DESTINATIONS.map(d => `<button class="destination-option ${d.id === state.destination ? 'selected' : ''}" data-destination="${d.id}" aria-pressed="${d.id === state.destination}"><small>${escape(d.parent)}</small><strong>${escape(d.name)}</strong><span>${fmt(d.gravity, d.gravity < .1 ? 4 : 2)} m/s²</span></button>`).join('');
  const d = destination();
  $('destination-detail').innerHTML = `<p class="eyebrow">${escape(d.parent)} system</p><h3>${escape(d.name)}</h3><p>${escape(d.surface)}</p><dl class="destination-stats"><div><dt>Surface gravity</dt><dd>${fmt(d.gravity, 4)} m/s²</dd></div><div><dt>Mean radius</dt><dd>${fmt(d.radius / 1000, 1)} km</dd></div><div><dt>Atmosphere</dt><dd>${escape(d.atmosphere)}</dd></div></dl><h4>Mission challenge</h4><p>${escape(d.hazard)}</p><h4>Sample strategy</h4><p>${escape(d.sampleMethod)}</p><p class="model-note">Terminal descent is playable. Sampling and environmental survival are mission-planning context for future versions.</p><a class="source-link" href="${escape(d.source)}" target="_blank" rel="noopener">JPL physical parameters</a> <a class="source-link" href="${escape(d.factSource)}" target="_blank" rel="noopener">NASA destination profile</a>${d.id === 'europa' ? '<button id="europa-evidence" class="secondary-button full-width">Inspect surface evidence</button>' : ''}<button id="inspect-destination" class="primary-button full-width">Inspect ${escape(d.name)} in 3D</button>`;
  document.querySelectorAll('[data-destination]').forEach(b => b.onclick = () => {
    state.destination = b.dataset.destination; renderer?.setDestination(state.destination);
    renderDestinations(); updateDestinationLabels();
  });
  if($('europa-evidence')) $('europa-evidence').onclick = () => { $('destination-dialog').close(); europaGuide.open(); };
  $('inspect-destination').onclick = () => { $('destination-dialog').close(); state.preview = true; renderPhase(); };
}
function updateDestinationLabels() {
  const d = destination(); setText('selected-destination', d.name);
  setText('destination-badge', `${d.name} / ${d.parent} system`);
}
function renderOutcome() {
  const overlay = $('outcome-overlay');
  if (!['failed', 'docked', 'landed'].includes(state.phase) || state.outcomeDismissed) { overlay.hidden = true; $('viewport').classList.remove('has-outcome'); return; }
  const failed = state.phase === 'failed', landing = state.flight.kind === 'landing';
  const t = landing ? getLandingTelemetry(state.flight) : state.flight.kind === 'docking' ? getDockingTelemetry(state.flight) : getLaunchTelemetry(state.flight);
  const title = failed ? landing ? t.impact ? 'Contact exceeded limits.' : 'Descent exercise ended.' : 'Mission interrupted.' : landing ? `Touchdown on ${destination().name}.` : 'Soft capture confirmed.';
  const detail = failed ? state.flight.failure : landing ? 'Engines safe. The landing conditions are within limits.' : 'Docking axes locked. Your vehicle is secured.';
  const metrics = landing ? [[fmt(Math.abs(t.impact?.verticalSpeed ?? t.verticalSpeed), 2) + ' m/s', t.impact ? 'Vertical contact' : 'Vertical speed'], [fmt(Math.abs(t.impact?.horizontalSpeed ?? t.horizontalSpeed), 2) + ' m/s', t.impact ? 'Lateral contact' : 'Lateral speed'], [fmt(t.fuel, 1) + ' kg', 'Fuel remaining']] : [[clock(t.time), 'Mission time'], [fmt(t.fuelUsed ?? 0, 1) + ' kg', 'Propellant used']];
  overlay.dataset.outcome = failed ? 'failure' : 'success';
  overlay.innerHTML = `<button id="outcome-close" class="icon-button" aria-label="Dismiss flight debrief">×</button><span class="outcome-kicker">${failed ? 'Flight debrief' : 'Milestone complete'}</span><h2>${escape(title)}</h2><p>${escape(detail ?? 'Review the flight and try again.')}</p><div class="outcome-metrics">${metrics.map(([value,label]) => `<div><strong>${value}</strong><small>${label}</small></div>`).join('')}</div><div class="outcome-actions"><button class="primary-button" id="outcome-retry">${failed ? 'Restore checkpoint' : landing ? 'Repeat landing' : 'Repeat docking'}</button><button id="outcome-design" class="quiet-button">Mission workbench</button></div>`;
  overlay.hidden = false; $('viewport').classList.add('has-outcome');
  $('outcome-close').onclick = () => { state.outcomeDismissed = true; overlay.hidden = true; $('viewport').classList.remove('has-outcome'); };
  if(landing&&!failed&&state.destination==='moon'){const watch=document.createElement('button');watch.className='quiet-button';watch.textContent='Watch flag ceremony';watch.onclick=$('outcome-close').onclick;overlay.querySelector('.outcome-actions').prepend(watch);}
  $('outcome-retry').onclick = failed ? restore : landing ? beginLanding : () => beginDocking(true);
  $('outcome-design').onclick = assemble;
}
function renderInstruments() {
  if (state.phase === 'assembly' && state.preview) {
    const d = destination();
    $('instrument-values').innerHTML = dataValue('gravity-value', 'Surface gravity', fmt(d.gravity, d.gravity < .1 ? 4 : 2), 'm/s²') + dataValue('radius-value', 'Mean radius', fmt(d.radius / 1000, 1), 'km') + dataValue('parent-value', 'Primary body', escape(d.parent), '') + `<div class="instrument"><span class="instrument-name">Surface</span><p>${escape(d.surface)}</p></div>`;
    $('readiness').innerHTML = `<div class="readiness-title">Terminal landing exercise</div><p>${escape(d.hazard)}</p><p class="model-note">Standard lander. Environmental survival and sample collection are not simulated yet.</p>`; return;
  }
  if (state.flight?.kind === 'landing') {
    $('instrument-values').innerHTML = dataValue('altitude-value', 'Feet altitude', '—', 'm') + dataValue('vertical-value', 'Vertical speed', '—', 'm/s') + dataValue('horizontal-value', 'Lateral speed', '—', 'm/s') + dataValue('offset-value', 'Pad offset', '—', 'm') + dataValue('angle-value', 'Tilt from upright', '—', '°') + dataValue('fuel-value', 'Lander propellant', '—', 'kg');
    $('readiness').innerHTML = `<div id="landing-status" class="readiness-title">Control your descent</div><p id="landing-detail">Land inside ±25 m. Vertical ≤ 2 m/s, lateral ≤ 1.5 m/s, tilt ≤ 8° and rotation ≤ 3°/s.</p><div class="fuel-track"><i id="fuel-track-fill"></i></div>`; return;
  }
  if (state.phase === 'assembly') { const v = evaluateVehicle(state.config); $('instrument-values').innerHTML = dataValue('mass-value', 'Liftoff mass', fmt(v.wetMass / 1000, 1), 't') + dataValue('dv-value', 'Ideal delta-v', fmt(v.deltaV / 1000, 2), 'km/s', 'Vacuum ideal; before flight losses') + dataValue('twr-value', 'Liftoff thrust / weight', fmt(v.twr, 2), 'TWR') + dataValue('rcs-value', 'RCS propellant', fmt(v.rcsFuel), 'kg'); $('readiness').innerHTML = `<div class="readiness-title ${v.valid ? 'ready' : 'warning'}"><span>${v.valid ? '✓' : '!'}</span>${v.valid ? 'Ready for launch' : 'Review vehicle design'}</div><p>${v.warnings.length ? escape(v.warnings[0]) : 'Two launch stages. A command capsule. Enough reserve to begin the mission.'}</p><div class="mass-bar"><i style="width:${v.propellantMass / v.wetMass * 100}%"></i></div><div class="legend-line"><span>Launch propellant</span><span>${fmt(v.propellantMass / v.wetMass * 100, 1)}%</span></div>`; return; }
  const dock = state.flight?.kind === 'docking';
  if (dock) { $('instrument-values').innerHTML = dataValue('range-value', 'Port range', '—', 'm') + dataValue('closing-value', 'Closing speed', '—', 'm/s') + dataValue('offset-value', 'Lateral offset', '—', 'm') + `<div class="attitude-readout"><span class="instrument-name">Attitude error</span><div><span>Pitch <b id="pitch-value">—</b>°</span><span>Yaw <b id="yaw-value">—</b>°</span><span>Roll <b id="roll-value">—</b>°</span></div></div>` + dataValue('fuel-value', 'RCS propellant', '—', 'kg'); $('readiness').innerHTML = `<div id="capture-label" class="readiness-title"><span>⊕</span>Align for capture</div><p id="capture-detail">Closing ≤ 0.15 m/s · offset ≤ 0.35 m · attitude ≤ 5° · rotation ≤ 1°/s</p><div class="fuel-track"><i id="fuel-track-fill"></i></div>`; }
  else { $('instrument-values').innerHTML = dataValue('altitude-value', 'Altitude', '—', 'km') + dataValue('speed-value', 'Inertial speed', '—', 'km/s') + `<div class="orbit-readout"><span><small>Apoapsis</small><b id="apo-value">—</b><em> km</em></span><span><small>Periapsis</small><b id="peri-value">—</b><em> km</em></span></div>` + dataValue('load-value', 'Acceleration load', '—', 'g') + dataValue('q-value', 'Dynamic pressure', '—', 'kPa'); $('readiness').innerHTML = `<div id="flight-status-label" class="readiness-title"><span>↑</span>Awaiting ignition</div><p id="flight-status-detail">Guidance controls thrust direction. Stage separation stays with you.</p><div class="fuel-track"><i id="fuel-track-fill"></i></div><div class="legend-line"><span id="active-stage-name">Core propellant</span><span id="fuel-percent">100%</span></div>`; }
}
function renderPlan() {
  if (state.flight?.kind === 'landing') {
    setText('plan-label', 'Surface operations'); $('flight-heading').innerHTML = `Descent to<br>${escape(destination().name)}.`;
    const steps = ['Arrest lateral drift', 'Manage descent energy', 'Align over the landing zone', 'Touch down within limits'];
    $('flight-plan').innerHTML = steps.map((text,i) => `<div class="plan-step ${i === 0 ? 'active' : ''}"><span>${i + 1}</span><span>${text}</span></div>`).join('') + `<p class="model-note">${escape(destination().name)}: ${fmt(destination().gravity, 4)} m/s². Terminal exercise; interplanetary transfer skipped. Pad ±25 m. The standard lander is independent of your launch design.</p>`; return;
  }
  const dock = state.flight?.kind === 'docking'; $('plan-label').textContent = dock ? 'Terminal operations' : 'Launch operations'; $('flight-heading').innerHTML = dock ? 'Terminal<br>approach.' : 'From Earth.<br>To orbit.'; const steps = dock ? ['Cancel lateral drift', 'Align the docking axes', 'Approach under RCS', 'Brake to soft capture'] : ['Ignition & liftoff', 'Core depletion & separation', 'Upper-stage insertion', 'Spacecraft separation']; const index = dock ? 0 : state.flight?.stageIndex ?? 0; $('flight-plan').innerHTML = steps.map((s, i) => `<div class="plan-step ${i < index ? 'complete' : i === index ? 'active' : ''}"><span>${i < index ? '✓' : String(i + 1).padStart(2, '0')}</span><span>${s}</span></div>`).join('') + `<p class="model-note">${dock ? 'Local approach scenario. No automatic forward motion. Powered assists consume propellant.' : 'Goal: a bound orbit with periapsis above 150 km. Stage separation is manual.'}</p>`; }

function renderCommand() {
  if (state.phase === 'assembly' && state.preview) {
    const d = destination();
    $('command-deck').innerHTML = `<div class="command-intro"><span class="eyebrow">${escape(d.parent)} system</span><h2>${escape(d.name)}</h2><p>Practice a manual descent with a standard lander. Transfer and sampling are planned.</p></div><div class="button-column"><button id="start-landing" class="primary-button">Land on ${escape(d.name)}</button><button id="choose-world" class="quiet-button">Choose another moon</button></div>`;
    $('start-landing').onclick = beginLanding; $('choose-world').onclick = openDestinations; return;
  }
  if (state.phase === 'landed') {
    $('command-deck').innerHTML = `<div class="result-copy"><span class="eyebrow success">Touchdown confirmed</span><h2>Landing secured.</h2><p>Review your contact speeds, fuel reserve and flight path.</p></div><div class="button-column"><button id="land-again" class="primary-button">Repeat landing</button><button id="new-world" class="quiet-button">Choose next destination</button></div>`;
    $('land-again').onclick = beginLanding; $('new-world').onclick = () => { assemble(); openDestinations(); }; return;
  }
  if (state.phase === 'landing') {
    $('command-deck').innerHTML = `<div class="landing-command"><div class="throttle-label"><label for="throttle">${state.landingAssist ? 'Engine ceiling' : 'Descent engine'} <strong id="throttle-label">${Math.round(state.throttle * 100)}%</strong></label><input id="throttle" type="range" min="0" max="100" step="1" value="${Math.round(state.throttle * 100)}"><p><kbd>W</kbd> / <kbd>S</kbd> power · <kbd>A</kbd> / <kbd>D</kbd> tilt · <kbd>Space</kbd> engine cut</p><span id="hover-hint" class="assist-note"></span></div><div class="landing-controls"><button id="landing-assist-button" class="landing-assist-toggle toggle-button ${state.landingAssist ? 'on' : ''}" aria-pressed="${state.landingAssist}">Landing assist ${state.landingAssist ? 'on' : 'off'}</button><button id="hold-button" class="toggle-button ${state.holdAttitude ? 'on' : ''}" aria-pressed="${state.holdAttitude}">Upright hold ${state.holdAttitude ? 'on' : 'off'} <kbd>B</kbd></button><div class="button-row"><button id="turn-left" class="secondary-button">Tilt left</button><button id="turn-right" class="secondary-button">Tilt right</button></div><button id="engine-cut" class="quiet-button">Cut engine</button></div></div>`;
    $('landing-assist-button').onclick = () => { state.landingAssist = !state.landingAssist; if(state.landingAssist) state.throttle = 1; renderCommand(); notify(state.landingAssist ? 'Powered landing assist active. Engine and attitude jets consume propellant; manual tilt adds a correction.' : 'Manual landing control. Cancel drift with counter-thrust.'); };
    $('throttle').oninput = e => { state.throttle = Number(e.target.value) / 100; setText('throttle-label', `${e.target.value}%`); };
    $('hold-button').onclick = () => { state.holdAttitude = !state.holdAttitude; renderCommand(); };
    bindHold($('turn-left'), 'left'); bindHold($('turn-right'), 'right');
    $('engine-cut').onclick = () => { state.throttle = 0; renderCommand(); }; return;
  }
  if (state.phase === 'assembly') { const v = evaluateVehicle(state.config); $('command-deck').innerHTML = `<div class="command-intro"><span class="eyebrow">Earth flight exercise</span><h2>Launch. Separate. Dock.</h2><p>Reach Earth orbit, release the spacecraft, then fly a terminal docking approach.</p></div><button id="launch-button" class="primary-button launch-button" ${v.valid && renderer ? '' : 'disabled'}><span>Begin launch sequence</span><span aria-hidden="true">↗</span></button>`; $('launch-button').onclick = beginLaunch; return; }
  if (state.phase === 'failed') { $('command-deck').innerHTML = `<div class="result-copy"><span class="eyebrow warning">Flight ended</span><h2>${state.flight.kind === 'docking' ? 'Approach aborted.' : 'Mission aborted.'}</h2><p>${escape(state.flight.failure ?? 'Review the flight and try again.')}</p></div><div class="button-column"><button class="primary-button" id="retry-button">Restore last checkpoint</button><button class="quiet-button" id="redesign-button">Change vehicle design</button></div>`; $('retry-button').onclick = restore; $('redesign-button').onclick = assemble; return; }
  if (state.phase === 'orbit') { const t = getLaunchTelemetry(state.flight); $('command-deck').innerHTML = `<div class="result-copy"><span class="eyebrow success">Orbital insertion confirmed</span><h2>Welcome to orbit.</h2><p>${km(t.periapsis)} × ${km(t.apoapsis)} km. ${t.canDock ? 'Ready for a separate terminal-approach scenario.' : 'Separate the upper stage to release your spacecraft.'}</p></div><button id="orbit-action" class="primary-button">${t.canDock ? 'Begin terminal approach' : 'Release upper stage'} <span aria-hidden="true">↗</span></button>`; $('orbit-action').onclick = t.canDock ? () => beginDocking(false) : stage; return; }
  if (state.phase === 'docked') { const t = getDockingTelemetry(state.flight); $('command-deck').innerHTML = `<div class="result-copy"><span class="eyebrow success">Soft capture confirmed</span><h2>Connection made.</h2><p>Vehicle secured. ${fmt(t.fuelUsed, 1)} kg of RCS propellant used in ${clock(t.time)}.</p></div><div class="button-column"><button id="fly-again" class="primary-button">Build the next mission</button><button id="dock-again" class="quiet-button">Repeat docking practice</button></div>`; $('fly-again').onclick = assemble; $('dock-again').onclick = () => beginDocking(true); return; }
  if (state.phase === 'launch') { $('command-deck').innerHTML = `<div class="ascent-controls"><div class="throttle-label"><label for="throttle">Throttle ceiling <strong id="throttle-label">${Math.round(state.throttle * 100)}%</strong></label><input id="throttle" type="range" min="0" max="100" value="${Math.round(state.throttle * 100)}" step="1"></div><div class="assist-controls"><button id="guidance-button" class="toggle-button ${state.guidance ? 'on' : ''}" aria-pressed="${state.guidance}"><span class="toggle-indicator"></span>Guidance ${state.guidance ? 'on' : 'off'} <kbd>G</kbd></button><div class="ascent-pitch-controls" role="group" aria-label="Pitch controls"><button id="ascent-pitch-left" class="secondary-button" data-control="left">Pitch left</button><button id="ascent-pitch-right" class="secondary-button" data-control="right">Pitch right</button></div><div class="warp-controls" role="group" aria-label="Simulation speed">${[1, 5, 10].map(w => `<button data-warp="${w}" class="${state.warp === w ? 'selected' : ''}" aria-pressed="${state.warp === w}">${w}×</button>`).join('')}</div></div></div><div class="stage-control"><div><span class="eyebrow" id="stage-label">Active launch stage</span><p id="stage-action-hint">Wait for depletion, then separate.</p></div><button id="stage-button" class="secondary-button">Separate stage <kbd>Space</kbd></button></div>`; $('throttle').oninput = e => { state.throttle = Number(e.target.value) / 100; setText('throttle-label', `${e.target.value}%`); }; $('guidance-button').onclick = toggleGuidance; document.querySelectorAll('[data-warp]').forEach(b => b.onclick = () => { state.warp = Number(b.dataset.warp); renderCommand(); }); $('stage-button').onclick = stage; bindHold($('ascent-pitch-left'),'left'); bindHold($('ascent-pitch-right'),'right'); }
  else { $('command-deck').innerHTML = `<div class="docking-command"><div><span class="eyebrow">Manual RCS control</span><h2>Translate and align.</h2><p><kbd>W</kbd><kbd>S</kbd> approach · <kbd>A</kbd><kbd>D</kbd> lateral · <kbd>R</kbd><kbd>F</kbd> vertical</p><p><kbd>Arrows</kbd> pitch / yaw · <kbd>Q</kbd><kbd>E</kbd> roll · <kbd>Shift</kbd> fine thrust</p></div><div class="button-column"><button id="hold-button" class="toggle-button ${state.holdAttitude ? 'on' : ''}" aria-pressed="${state.holdAttitude}"><span class="toggle-indicator"></span>Attitude hold ${state.holdAttitude ? 'on' : 'off'} <kbd>B</kbd></button><button id="brake-button" class="secondary-button" data-control="brake">Hold to brake <kbd>Space</kbd></button><span class="assist-note">Assists use RCS propellant</span></div></div>`; $('hold-button').onclick = () => { state.holdAttitude = !state.holdAttitude; renderCommand(); }; bindHold($('brake-button'), 'brake'); }
}
function toggleGuidance() { state.guidance = !state.guidance; renderCommand(); }

function syncDockingCameraViews() {
  const docking = state.flight?.kind === 'docking';
  $('docking-camera-controls').hidden = !docking;
  if (!docking) return;
  if (!Object.hasOwn(DOCKING_CAMERA_VIEWS, state.cameraMode)) state.cameraMode = 'chase';
  const view = DOCKING_CAMERA_VIEWS[state.cameraMode];
  for (const button of document.querySelectorAll('[data-docking-view]')) {
    const selected = button.dataset.dockingView === state.cameraMode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  setText('docking-camera-guidance', view.hint);
  setText('view-caption', `Manual docking / ${view.label}`);
  setText('view-hint', state.cameraMode === 'chase' ? 'Drag to orbit / scroll to zoom / RCS stays in body axes' : 'W / S translate along the nose / arrows rotate the spacecraft');
}
function selectDockingCamera(mode) {
  if (state.flight?.kind !== 'docking' || !Object.hasOwn(DOCKING_CAMERA_VIEWS, mode)) return;
  state.cameraMode = mode;
  renderer?.resetOrbit?.();
  syncDockingCameraViews();
}

function renderPhase() {
  modeHub?.setCurrent(state.flight?.kind === 'docking' ? 'manual-docking' : state.flight?.kind === 'landing' ? 'surface-landing' : 'earth-launch');
  syncOrbitView();
  const assembly = state.phase === 'assembly', docking = state.flight?.kind === 'docking', landing = state.flight?.kind === 'landing';
  $('assembly-library').hidden = !assembly; $('flight-library').hidden = assembly;
  $('model-dimensions').hidden = !assembly || state.preview; $('flight-clock').hidden = assembly;
  $('docking-reticle').hidden = !docking || ['failed', 'docked'].includes(state.phase);
  $('landing-marker').hidden = !landing || state.phase !== 'landing'; $('descent-hud').hidden = !landing || state.phase !== 'landing';
  $('pause-button').disabled = !activeFlight(); $('save-button').disabled = !activeFlight();
  $('practice-button').hidden = !assembly; $('landing-practice').hidden = !assembly;
  $('camera-button').hidden = !landing || state.phase !== 'landing';
  if (landing && !['chase', 'port'].includes(state.cameraMode)) state.cameraMode = 'chase'; $('touch-controls').hidden = state.phase !== 'docking';
  $('view-tabs').hidden = !assembly; $('countdown').hidden = state.countdown <= 0;
  $('paused-overlay').hidden = !state.paused || !activeFlight();
  $('paused-overlay').querySelector('h2').textContent = landing ? 'Prepare for descent.' : 'Take your time.';
  $('paused-overlay').querySelector('div > p:not(.eyebrow)').textContent = landing ? 'W / S changes power. A / D tilts the lander. Cancel drift and aim inside the pad before contact.' : 'All thrust inputs are released.';
  $('nav-assembly').className = assembly ? 'current' : 'complete';
  $('nav-launch').className = assembly || landing ? '' : docking ? 'complete' : 'current';
  $('nav-docking').className = docking ? 'current' : '';
  $('nav-landing').className = landing ? 'current' : '';
  $('vehicle-view').classList.toggle('selected', !state.preview); $('vehicle-view').setAttribute('aria-pressed', !state.preview);
  $('destination-view').classList.toggle('selected', state.preview); $('destination-view').setAttribute('aria-pressed', state.preview);
  $('pause-button').textContent = state.paused ? '▶' : 'Ⅱ';
  $('pause-button').setAttribute('aria-label', state.paused ? 'Resume simulation' : 'Pause simulation');
  setText('camera-button', state.cameraMode === 'port' ? 'External camera' : 'Descent camera');
  setText('view-caption', assembly ? state.preview ? destination().name : 'Vehicle assembly bay' : landing ? `${destination().name} terminal descent` : docking ? 'Terminal docking scenario' : 'Earth ascent');
  setText('instrument-label', assembly ? state.preview ? 'Destination facts' : 'Design performance' : landing ? 'Descent instruments' : docking ? 'Relative navigation' : 'Flight instruments');
  setText('simulation-status', assembly ? state.preview ? 'Destination survey' : 'Vehicle design' : state.paused ? 'Simulation paused' : state.phase === 'failed' ? 'Flight ended' : state.phase === 'orbit' ? 'Orbit confirmed' : state.phase === 'docked' ? 'Docking complete' : state.phase === 'landed' ? 'Touchdown confirmed' : landing ? 'Powered descent' : docking ? 'Terminal approach' : 'Ascent simulation');
  setText('view-hint', assembly ? state.preview ? 'Drag to inspect this world' : 'Drag to inspect the vehicle' : landing ? 'W / S power · A / D tilt · Space engine cut' : docking ? 'Body-axis controls · nose toward −Z' : 'W / S throttle · A / D pitch · Space stage');
  setText('footer-hint', assembly ? 'Design the mission. Fly the critical moments.' : landing ? 'Local descent exercise. Gravity and propellant are physical.' : docking ? 'No passive braking. Every maneuver uses propellant.' : 'Fixed-step simulation. Real time and mission time are distinct.');
  renderer?.setDestination(state.destination);
  renderer?.setMode(assembly ? state.preview ? 'destination' : 'assembly' : landing ? 'landing' : docking ? 'docking' : 'launch');
  updateVehicle(); updateDestinationLabels();
  if (assembly) renderBuilder();
  if (assembly && state.preview) setText('view-subtitle', `${destination().parent} system / NASA / JPL image map`);
  else if (!assembly) setText('view-subtitle', landing ? 'Standard training lander / terminal scenario' : docking ? 'Station reference orbit / 200 km' : `${resolveConfig(state.config).site.name} / eastbound ascent`);
  $('view-location').hidden = docking || landing || state.preview;
  if (landing || (assembly && state.preview)) setText('vehicle-label', destination().name);
  renderInstruments(); renderCommand(); renderPlan(); renderLog(); renderTouch(); updateUI(); renderOutcome(); syncDockingCameraViews();
}

function bindHold(button, control) { button.addEventListener('pointerdown', e => { if (state.paused) return; e.preventDefault(); button.setPointerCapture(e.pointerId); touch.add(control); button.classList.add('firing'); }); const release = () => { touch.delete(control); button.classList.remove('firing'); }; button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release); }
let touchMode = 'translate';
function renderTouch() { $('touch-fine').setAttribute('aria-pressed',String(state.fine));$('touch-fine').classList.toggle('selected',state.fine);const controls = touchMode === 'translate' ? [['up', 'Up'], ['approach', 'Approach'], ['left', 'Left'], ['brake', 'Brake'], ['right', 'Right'], ['retreat', 'Retreat'], ['down', 'Down']] : [['pitchUp', 'Pitch +'], ['yawLeft', 'Yaw −'], ['rollLeft', 'Roll −'], ['pitchDown', 'Pitch −'], ['yawRight', 'Yaw +'], ['rollRight', 'Roll +']]; $('touch-pad').innerHTML = controls.map(([c, name]) => `<button data-control="${c}" aria-label="Hold to ${name.toLowerCase()}">${name}</button>`).join(''); $('touch-pad').querySelectorAll('button').forEach(b => bindHold(b, b.dataset.control)); }
$('touch-translation').onclick = () => { clearInputs(); touchMode = 'translate'; $('touch-translation').classList.add('selected'); $('touch-rotation').classList.remove('selected'); renderTouch(); };
$('touch-rotation').onclick = () => { clearInputs(); touchMode = 'rotate'; $('touch-rotation').classList.add('selected'); $('touch-translation').classList.remove('selected'); renderTouch(); };
$('touch-fine').onclick=()=>{clearInputs();state.fine=!state.fine;renderTouch();};
const held = (key, control) => keys.has(key) || (control && touch.has(control));
function dockingInput() { const fine = keys.has('Shift') || state.fine ? 0.2 : 1; return { x: (Number(held('KeyD', 'right')) - Number(held('KeyA', 'left'))) * fine, y: (Number(held('KeyR', 'up')) - Number(held('KeyF', 'down'))) * fine, z: (Number(held('KeyW', 'approach')) - Number(held('KeyS', 'retreat'))) * fine, pitch: (Number(held('ArrowUp', 'pitchUp')) - Number(held('ArrowDown', 'pitchDown'))) * fine, yaw: (Number(held('ArrowLeft', 'yawLeft')) - Number(held('ArrowRight', 'yawRight'))) * fine, roll: (Number(held('KeyQ', 'rollLeft')) - Number(held('KeyE', 'rollRight'))) * fine, holdAttitude: state.holdAttitude, brake: held('Space', 'brake') }; }
function simulate(dt) {
  if (!activeFlight() || state.paused || state.countdown > 0) return;
  if (state.phase === 'launch' || state.phase === 'orbit') { const throttleInput = Number(keys.has('KeyW')) - Number(keys.has('KeyS')); state.throttle = state.phase==='orbit'?0:clamp(state.throttle + throttleInput * dt * 0.1, 0, 1); stepLaunch(state.flight, { throttle: state.throttle, guidance: state.guidance, pitchTrim: Number(held('KeyD','right') || keys.has('ArrowRight')) - Number(held('KeyA','left') || keys.has('ArrowLeft')) }, dt); }
  else if (state.phase === 'landing') {
    const throttleInput = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    state.throttle = clamp(state.throttle + throttleInput * dt * .25, 0, 1);
    const turn = Number(held('KeyD','right') || keys.has('ArrowRight')) - Number(held('KeyA','left') || keys.has('ArrowLeft'));
    stepLanding(state.flight, state.landingAssist ? landingAssistInput(state.flight, state.throttle, turn) : { throttle: state.throttle, turn, holdAttitude: state.holdAttitude }, dt);
  } else stepDocking(state.flight, dockingInput(), dt);
  if (state.flight.event !== lastEvent) log(state.flight.event);
  if (state.flight.phase === 'failed') { state.phase = 'failed'; state.paused = false; clearInputs(); renderPhase(); }
  else if (state.flight.phase === 'orbit' && state.phase === 'launch') { state.phase = 'orbit'; state.throttle = 0; clearInputs(); renderPhase(); save(true); }
  else if (state.flight.phase === 'landed') { state.phase = 'landed'; clearInputs(); renderPhase(); }
  else if (state.flight.phase === 'docked') { state.phase = 'docked'; clearInputs(); renderPhase(); }
}
function updateUI() {
  if (!state.flight) return;
  setText('clock-value', `T+ ${clock(state.flight.time)}`);
  if (state.flight.kind === 'landing') {
    const t = getLandingTelemetry(state.flight);
    setText('hud-altitude', `${fmt(t.altitude,1)} m`); setText('hud-vertical', `${fmt(t.verticalSpeed,2)} m/s`); setText('hud-offset', `${fmt(t.offset,1)} m`);
    setText('altitude-value', fmt(t.altitude, 1)); setText('vertical-value', fmt(t.verticalSpeed, 2));
    setText('horizontal-value', fmt(t.horizontalSpeed, 2)); setText('offset-value', fmt(t.offset, 1));
    setText('angle-value', fmt(t.angleDegrees, 1)); setText('fuel-value', fmt(t.fuel, 1));
    setText('throttle-label', `${Math.round(state.throttle * 100)}%`);
    if ($('throttle') && document.activeElement !== $('throttle')) $('throttle').value = Math.round(state.throttle * 100);
    if ($('fuel-track-fill')) $('fuel-track-fill').style.width = `${t.fuelFraction * 100}%`;
    const brakingCritical = t.verticalSpeed < -2 && t.altitude < t.brakingAltitude * 1.25;
    $('landing-status')?.classList.toggle('warning', brakingCritical);
    setText('landing-detail', state.phase === 'failed' ? state.flight.failure : state.phase === 'landed' ? 'Contact was within the landing limits. Engines are safe.' : t.fuel <= 0 ? 'Propellant depleted. Thrust and attitude jets are unavailable.' : brakingCritical ? 'Braking margin is low. Increase thrust and reduce tilt.' : `Land inside ±25 m. Vertical ≤ 2 m/s, lateral ≤ 1.5 m/s, tilt ≤ 8°. Rotation ${fmt(t.angularSpeedDegrees,1)}°/s / limit 3°/s.`);
    setText('landing-status', state.phase === 'landed' ? 'Touchdown confirmed' : state.phase === 'failed' ? 'Landing limits exceeded' : t.fuel <= 0 ? 'Propellant depleted' : t.safeToLand ? 'Contact conditions within limits' : 'Control your descent');
    $('landing-status')?.classList.toggle('ready', t.safeToLand);
    setText('hover-hint', `${state.landingAssist ? 'Assist engine: '+fmt(t.throttle*100,0)+'% / ' : ''}Approx. hover ${fmt(t.hoverThrottle * 100, 1)}% power / ${fmt(t.gravity, 4)} m/s² gravity`);
    return;
  }
  if (state.flight.kind === 'launch') { const t = getLaunchTelemetry(state.flight); setText('altitude-value', km(t.altitude)); setText('speed-value', fmt(t.speed / 1000, 2)); setText('apo-value', km(t.apoapsis)); setText('peri-value', km(t.periapsis)); setText('load-value', fmt(t.loadG, 2)); setText('q-value', fmt(t.dynamicPressure / 1000, 1)); setText('active-stage-name', t.stageName); setText('fuel-percent', `${fmt(t.fuelFraction * 100)}%`); if ($('fuel-track-fill')) $('fuel-track-fill').style.width = `${t.fuelFraction * 100}%`; setText('stage-label', t.stageIndex < 2 ? `${t.stageIndex + 1} / 2 · ${t.stageName}` : 'Launch stages released'); setText('stage-action-hint', t.stageReady ? 'Propellant depleted. Separate now.' : `${fmt(t.fuel / 1000, 1)} t of propellant remaining`); if ($('stage-button')) { $('stage-button').classList.toggle('stage-ready', t.stageReady); $('stage-button').disabled = state.countdown > 0 || !state.flight.liftoff || t.stageIndex >= 2 || state.paused; } setText('throttle-label', `${Math.round(state.throttle * 100)}%`); if ($('throttle') && document.activeElement !== $('throttle')) $('throttle').value = Math.round(state.throttle * 100); setText('flight-status-label', t.stageReady ? 'Stage depletion confirmed' : state.phase === 'orbit' ? 'Bound orbit confirmed' : state.countdown > 0 ? 'Ignition sequence armed' : t.altitude < 100000 ? 'Atmospheric ascent' : 'Orbital insertion burn'); setText('flight-status-detail', t.stageReady ? 'Jettison the depleted stage to continue the mission.' : state.phase === 'orbit' ? (t.canDock ? 'Launch stages released. Terminal scenario is ready.' : 'Periapsis is above 150 km. Release the upper stage.') : `Vertical speed ${fmt(t.verticalSpeed)} m/s · pitch ${fmt(t.pitchDegrees, 1)}°`); }
  else { const t = getDockingTelemetry(state.flight); setText('range-value', fmt(t.range, 1)); setText('closing-value', `${t.closingSpeed > 0 ? '+' : ''}${fmt(t.closingSpeed, 2)}`); setText('offset-value', fmt(t.lateralOffset, 2)); setText('pitch-value', fmt(t.pitchDegrees, 1)); setText('yaw-value', fmt(t.yawDegrees, 1)); setText('roll-value', fmt(t.rollDegrees, 1)); setText('fuel-value', fmt(t.fuel, 1)); if ($('fuel-track-fill')) $('fuel-track-fill').style.width = `${t.fuelFraction * 100}%`; if ($('capture-label')) { setText('capture-label', t.captureReady ? 'Capture conditions aligned' : t.fuel <= 0 ? 'RCS propellant depleted' : 'Align for capture'); $('capture-label').classList.toggle('ready', t.captureReady); } $('closing-value')?.parentElement.classList.toggle('warning', t.range < 20 && t.closingSpeed > 0.15); const dot = $('alignment-dot'); dot.style.transform = `translate(${clamp(t.offsetX * 14, -65, 65)}px,${clamp(-t.offsetY * 14, -65, 65)}px)`; dot.classList.toggle('aligned', t.lateralOffset < 0.35); }
}

function renderFrame(now) {
  requestAnimationFrame(renderFrame);
  const realDt = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now;
  if (state.countdown > 0 && !state.paused) { state.countdown = Math.max(0, state.countdown - realDt); $('countdown').hidden = state.countdown <= 0; setText('countdown-number', Math.ceil(state.countdown)); }
  if (activeFlight() && !state.paused && state.countdown <= 0) { accumulator += realDt * (state.flight?.kind === 'launch' ? state.warp : 1); let safety = 0; while (accumulator >= 1 / 60 && safety++ < 120) { simulate(1 / 60); accumulator -= 1 / 60; if (!activeFlight()) { accumulator = 0; break; } } }
  if (renderer && !earthViewOpen) {
    const dock = state.flight?.kind === 'docking', land = state.flight?.kind === 'landing';
    const t = state.flight ? land ? getLandingTelemetry(state.flight) : dock ? getDockingTelemetry(state.flight) : getLaunchTelemetry(state.flight) : {};
    const projection = renderer.update({ mode: state.phase === 'assembly' ? state.preview ? 'destination' : 'assembly' : land ? 'landing' : dock ? 'docking' : 'launch', ...t,
      phase: state.phase, destination: state.destination, site: resolveConfig(state.config).site, time: state.flight?.time ?? now / 1000,
      position: dock || land ? state.flight.position : undefined, angle: land ? state.flight.angle : undefined,
      positionSI: state.flight?.kind==='launch'?state.flight.position:undefined,
      velocitySI: state.flight?.kind==='launch'?state.flight.velocity:undefined,
      orbitOverview,
      quaternion: dock ? state.flight.orientation : undefined,
      firing: dock && !state.paused && activeFlight() ? state.flight.lastThrust.map((force,i) => Math.abs(force) / state.flight.thrust + Math.abs(state.flight.lastTorque[i]) / state.flight.torque) : [0,0,0],
      stageIndex: state.flight?.stageIndex ?? 0, throttle: state.countdown > 0 ? 0 : t.throttle ?? 0,
      cameraMode: state.cameraMode, paused: state.paused }, realDt);
    if (land && projection) {
      const marker = $('landing-marker'); marker.style.left = `${projection.targetX * 100}%`; marker.style.top = `${projection.targetY * 100}%`; marker.hidden = !projection.targetVisible || state.phase !== 'landing';
    }
    if (dock && projection) {
      const reticle = $('docking-reticle'); reticle.style.left = `${projection.targetX * 100}%`;
      reticle.style.top = `${projection.targetY * 100}%`; reticle.hidden = !projection.targetVisible || !activeFlight();
    }
  }
  if (now - lastUI > 80) { updateUI(); navigation.draw(); updateLandingDirector(state); lastUI = now; }
}

const controlledCodes = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyF', 'KeyQ', 'KeyE', 'KeyG', 'KeyB', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
window.addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (!navigation.dialog.open && !$('guide-dialog').open && !$('confirm-dialog').open && !$('destination-dialog').open && !e.repeat) { e.preventDefault(); pause(); } return; }
  if (!activeFlight() || navigation.dialog.open || $('guide-dialog').open || $('confirm-dialog').open || $('destination-dialog').open || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (controlledCodes.has(e.code)) { e.preventDefault(); if (state.paused) return; if (e.code.startsWith('Shift')) keys.add('Shift'); else keys.add(e.code); }
  if (e.repeat) return;
  if (e.code === 'Space' && state.phase === 'launch') stage();
  if (e.code === 'KeyG' && state.phase === 'launch') toggleGuidance();
  if (e.code === 'Space' && state.phase === 'landing') { state.throttle = 0; renderCommand(); }
  if (e.code === 'KeyB' && ['docking', 'landing'].includes(state.phase)) { state.holdAttitude = !state.holdAttitude; renderCommand(); }
});
window.addEventListener('keyup', e => { keys.delete(e.code); if (e.code.startsWith('Shift')) keys.delete('Shift'); });
window.addEventListener('blur', () => { clearInputs(); pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInputs(); pause(true); } });
$('pause-button').onclick = () => pause(); $('resume-button').onclick = () => pause(false); $('save-button').onclick = () => save(); $('restore-button').onclick = restore;
$('return-builder').onclick = () => confirm('Return to assembly?', 'Your last checkpoint stays available. The active flight will end.', assemble, 'Return to assembly');
$('practice-button').onclick = () => { if (renderer) beginDocking(true); };
$('landing-practice').onclick = () => beginLanding();
$('destination-button').onclick = openDestinations;
$('close-destination').onclick = () => $('destination-dialog').close();
$('vehicle-view').onclick = () => { state.preview = false; renderPhase(); };
$('destination-view').onclick = () => { state.preview = true; renderPhase(); };
$('camera-button').onclick = () => {
  if (state.flight?.kind !== 'landing') return;
  state.cameraMode = state.cameraMode === 'chase' ? 'port' : 'chase';
  renderer?.resetOrbit?.();
  setText('camera-button', state.cameraMode === 'port' ? 'External camera' : 'Descent camera');
};
for (const button of document.querySelectorAll('[data-docking-view]')) button.onclick = () => selectDockingCamera(button.dataset.dockingView);
let guideWasPaused = false;
function openGuide(model = false) { guideWasPaused = state.paused; pause(true); $('guide-dialog').showModal(); if (model) $('model-section').scrollIntoView({ block: 'start' }); }
$('guide-button').onclick = () => openGuide(false); $('model-button').onclick = () => openGuide(true); $('close-guide').onclick = () => $('guide-dialog').close(); $('guide-dialog').addEventListener('close', () => { if (!guideWasPaused) pause(false); });

try { renderer = createScene($('flight-canvas'), { onAssetWarning: message => notify(message) }); } catch (error) { $('view-error').hidden = false; console.error('3D initialization failed:', error); }
$('flight-canvas').addEventListener('webglcontextlost', event => { event.preventDefault(); clearInputs(); pause(true); notify('Graphics context lost. Flight paused; your checkpoint is available.'); });
$('flight-canvas').addEventListener('webglcontextrestored', () => notify('Graphics restored. Resume the flight when ready.'));
renderPhase(); if (saved.error) notify(saved.error); else if (checkpoint) setText('checkpoint-label', 'Previous checkpoint available');
window.addEventListener('resize', () => renderer?.resize());
const europaGuide=createEuropaGuide({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);}});
const navigation = installNavigation({state,selectDestination(id){state.destination=id;renderer?.setDestination(id);updateDestinationLabels();renderPhase();},resetCamera(){orbitOverview=false;syncOrbitView();renderer?.resetOrbit();}});
const updateLandingDirector=installLandingDirector();
installSiteMenu({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);}});
const rollout=createRollout({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);},onReady(){rolloutReady=true;beginLaunch();}});
const missionControl=createMissionControl({onOpen(){clearInputs();pause(true);modeHub?.setCurrent('moon-mission');},onClose(){clearInputs();pause(true);},onEditDesign(design){workshop.setDesign(design);workshop.open();}});
const workshop=createRocketWorkshop({onOpen(){clearInputs();pause(true);modeHub?.setCurrent('workshop');},onClose(){clearInputs();pause(true);},onStartFlight(design){missionControl.open(design);}});
const workshopButton=document.createElement('button');workshopButton.className='secondary-button';workshopButton.textContent='Build custom rocket';workshopButton.onclick=()=>workshop.open();document.querySelector('.navigation-tools').prepend(workshopButton);
let mapWasPaused=false;
document.getElementById('open-map').addEventListener('click',()=>{mapWasPaused=state.paused;clearInputs();pause(true);});
navigation.dialog.addEventListener('close',()=>{clearInputs();if(!mapWasPaused)pause(false);});
let solarWasPaused=false;
const solar=createSolarView({onOpen(){solarWasPaused=state.paused;clearInputs();pause(true);modeHub?.setCurrent('solar-system');},onClose(){clearInputs();if(!solarWasPaused)pause(false);},onLanding(id){state.destination=id;renderer?.setDestination(id);updateDestinationLabels();beginLanding();}});
const solarButton=document.createElement('button');solarButton.className='primary-button';solarButton.textContent='Explore Solar System';solarButton.onclick=()=>solar.open();document.querySelector('.navigation-tools').prepend(solarButton);
const onlineEarth=createOnlineEarth({onOpen(){earthViewOpen=true;clearInputs();pause(true);modeHub?.setCurrent('online-earth');},onClose(){earthViewOpen=false;clearInputs();pause(true);}});
const earthButton=document.createElement('button');earthButton.className='secondary-button';earthButton.textContent='Earth / free flight';earthButton.onclick=()=>onlineEarth.open();document.querySelector('.navigation-tools').append(earthButton);
const localPause=document.createElement('button');localPause.className='quiet-button';localPause.textContent='Pause / resume';localPause.onclick=()=>pause();document.querySelector('.navigation-tools').append(localPause);
const localGuide=document.createElement('button');localGuide.className='quiet-button';localGuide.textContent='How to play';localGuide.onclick=()=>openGuide();document.querySelector('.navigation-tools').append(localGuide);
const orbitButton=document.createElement('button');orbitButton.id='orbit-overview-button';orbitButton.className='secondary-button';orbitButton.onclick=()=>{if(state.phase!=='orbit')return;orbitOverview=!orbitOverview;syncOrbitView();renderer?.resetOrbit();notify(orbitOverview?'Trajectory inspection: white spacecraft, amber stages, blue illustrative station reference. Use Return to spacecraft or Reset camera to leave.':'Spacecraft camera restored. Orbital motion continues.');};document.querySelector('.navigation-tools').append(orbitButton);syncOrbitView();
window.addEventListener('blur',()=>{mapWasPaused=guideWasPaused=solarWasPaused=true;});
requestAnimationFrame(renderFrame);
try { if (typeof ResizeObserver === 'function') new ResizeObserver(() => renderer?.resize()).observe($('viewport')); } catch (error) { console.warn('Optional viewport observer unavailable:', error); }

// Optional developer hooks for deterministic game testing; no network access.
window.render_game_to_text = () => JSON.stringify({ phase: state.phase, paused: state.paused, cameraView: state.cameraMode, config: state.config, timeUnits: 'seconds', distanceUnits: 'meters', dockingAxes: '+X right, +Y up, +Z away from target; craft nose −Z', destination: state.destination, preview: state.preview, telemetry: state.flight ? state.flight.kind === 'landing' ? getLandingTelemetry(state.flight) : state.flight.kind === 'docking' ? getDockingTelemetry(state.flight) : getLaunchTelemetry(state.flight) : evaluateVehicle(state.config) });
window.render_mission_to_text = () => JSON.stringify(missionControl.getState());
window.advanceTime = milliseconds => { const count = Math.ceil(clamp(milliseconds, 0, 600000) / (1000 / 60)); for (let i = 0; i < count && activeFlight(); i++) simulate(1 / 60); updateUI(); return window.render_game_to_text(); };

// Every mode has one visible entry. Switching keeps the previous flight paused.
modeHub=installModeHub({onOpen(){clearInputs();pause(true);missionControl.pause(true);onlineEarth.pause?.(true);rollout.pause?.(true);},onClose(){clearInputs();pause(true);},onSelect(mode){
  clearInputs();pause(true);workshop.close();missionControl.close();solar.close();onlineEarth.close();rollout.close();
  if(mode==='workshop')workshop.open();
  else if(mode==='moon-mission')missionControl.open(workshop.getDesign());
  else if(mode==='earth-launch'){assemble();rolloutReady=true;beginLaunch();}
  else if(mode==='manual-docking')beginDocking(true);
  else if(mode==='surface-landing')beginLanding(true);
  else if(mode==='online-earth')onlineEarth.open();
  else if(mode==='solar-system')solar.open();
}});
for(const button of [workshopButton,solarButton,earthButton,localPause,localGuide])button.hidden=true;
for(const nav of ['nav-assembly','nav-launch','nav-docking','nav-landing']){$(nav).tabIndex=0;$(nav).setAttribute('role','button');const action=()=>{if(nav==='nav-assembly')assemble();else if(nav==='nav-docking')beginDocking(true);else if(nav==='nav-landing')beginLanding(true);else{assemble();rolloutReady=true;beginLaunch();}};$(nav).onclick=action;$(nav).onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();action();}};}
