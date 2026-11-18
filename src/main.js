// Mykyta is the sole game author. Development used AI assistance.
import './styles.css';
import { KC_MARKUP } from './brand.js';
import { icon } from './ui-icons.js';
import './solar-view.css';
import { CATALOG, DEFAULT_CONFIG, resolveConfig } from './catalog.js';
import { evaluateVehicle, createLaunch, stepLaunch, separateStage, getLaunchTelemetry, createDocking, stepDocking, getDockingTelemetry, orbitalElements, validateState } from './physics.js';
import { createScene } from './scene.js';
import { installNavigation } from './navigation.js';
import { createSolarView } from './solar-view.js';
import { installLandingDirector } from './landing-director.js';
import { installSiteMenu, AUTHOR_PORTRAIT_PATH } from './site-menu.js';
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
import './practice-flight-ui.css';
import './ascent-guidance.css';
import { advanceToStageBoundary, needsStageRelease, getAscentGuidance, getFlightTimePolicy, installAscentReadouts } from './ascent-guidance.js';
import { installDestinationCarousel } from './destination-carousel.js';
import './icon-controls.css';
import './docking-feed.css';
import './flight-guide.css';

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
const state = { phase: 'assembly', config: { ...DEFAULT_CONFIG }, destination: 'moon', preview: false, flight: null, paused: false, warp: 1, throttle: 1, guidance: true, holdAttitude: true, cameraMode: 'chase', countdown: 0, log: [], selectedSlot: 'core', fine: false, landingAssist: false, outcomeDismissed: false };
const keys = new Set();
let rolloutReady=false;
let orbitOverview=false;
let earthViewOpen=false;
function syncOrbitView(){
  if(state.phase!=='orbit')orbitOverview=false;
  const button=$('orbit-overview-button');
  if(!button)return;
  button.hidden=state.phase!=='orbit';
  button.disabled=state.phase!=='orbit';
  button.innerHTML=icon('orbit') + `<span class="kc-tool-label">${orbitOverview ? 'Ship' : 'Orbit'}</span>`;
  button.setAttribute('aria-label',orbitOverview?'Return to spacecraft':'Inspect actual orbit');
  button.title=state.phase==='orbit'?'Switch between spacecraft and trajectory cameras':'Available after orbital insertion';
  button.setAttribute('aria-pressed',String(orbitOverview));
}
const touch = new Set();
let vehicleSignature = '';
let ascentReadouts = null;
let practiceCameraReturn = null;
let modeHub;
let renderer, accumulator = 0, lastFrame = performance.now(), lastUI = 0, lastEvent = '', toastTimer, separationRequested = false;

document.getElementById('app').innerHTML = `
<div class="game-shell" data-workspace="assembly">
  <header class="app-header">
    <button type="button" class="identity" id="home-button" aria-label="Kinetic Core home"><span class="brand-symbol" aria-hidden="true">${KC_MARKUP}</span><span class="identity-wordmark"><span class="brand">Kinetic Core</span><span class="authorship">Created by Mykyta Borisov</span></span></button>
    <div class="flight-identity"><span class="mission-number">Flight practice</span><span class="destination-badge" id="destination-badge">Moon / Earth system</span></div>
    <div class="header-actions"><button class="kc-tool" id="guide-button" aria-label="How to play">${icon("help")}<span class="kc-sr">Guide</span></button><button class="kc-tool" id="pause-button" aria-label="Pause simulation" disabled>${icon("pause")}<span class="kc-sr">Pause</span></button></div>
  </header>
  <nav class="mission-nav" aria-label="Current exercise">
    <div class="mission-context"><strong id="practice-title">Earth launch setup</strong><button id="landing-world-button" class="landing-world-button" hidden aria-haspopup="dialog" aria-label="Change landing world"><span><small>World</small><strong id="landing-world-name">Moon</strong></span>${icon('chevron-down')}</button><span id="practice-next-action">Choose hardware, then launch.</span></div>
    <div class="mission-context-actions"><span class="simulation-label"><span class="status-dot"></span><span id="simulation-status">Vehicle design</span></span><button id="flight-details-button" class="kc-tool practice-details-button" hidden aria-label="Open flight details" title="Flight details">${icon('info')}<span>Details</span></button><details class="practice-shortcuts"><summary aria-label="Choose a practice exercise">Practice ${icon('chevron')}</summary><div class="practice-shortcut-menu"><button id="nav-assembly" class="current">Vehicle setup</button><button id="nav-launch">Earth launch</button><button id="nav-docking">Manual docking</button><button id="nav-landing">Surface landing</button></div></details></div>
  </nav>
  <div class="workspace">
    <aside class="library" aria-label="Vehicle configuration and mission plan">
      <div id="assembly-library"><div class="section-heading"><div><p class="eyebrow">Vehicle architecture</p><h1>Earth launch<br>setup.</h1></div><span class="outline-label">2 stages</span></div><p class="intro-copy">Choose your standard vehicle. Check the margins, then fly.</p><button class="destination-launcher" id="destination-button"><small>Surface destination</small><strong id="selected-destination">Moon</strong><span>Explore planets & moons</span></button><div id="module-slots" class="module-slots"></div><div class="extra-selects"><div class="payload-control"><span id="payload-label">Mission payload</span><select id="cargo-select" hidden aria-labelledby="payload-label"></select><div id="payload-options" class="payload-options" role="group" aria-labelledby="payload-label" aria-describedby="payload-note"></div><small id="payload-note">Added mass affects flight performance.</small></div><label>Launch site<select id="site-select"></select></label></div><p class="design-disclosure">Fictional training hardware. Performance is calculated from the selected design.</p></div>
      <div id="flight-library" hidden><p class="eyebrow" id="plan-label">Launch operations</p><h1 id="flight-heading">From Earth.<br>To orbit.</h1><div id="flight-plan" class="flight-plan"></div><details class="flight-log"><summary>Flight log</summary><ol id="log-list"></ol></details><button id="return-builder" class="quiet-button full-width">Return to vehicle assembly</button></div>
    </aside>
    <section class="flight-center" aria-label="Interactive spacecraft view">
      <div class="viewport" id="viewport"><div id="scene-inspection" class="scene-inspection" hidden><span>Inspection</span><button id="inspection-reset" class="kc-tool" aria-label="Return to flight camera" title="Return to flight camera">${icon('reset')}<span class="kc-tool-label">Reset</span></button></div><canvas id="flight-canvas" tabindex="0" aria-label="Three-dimensional spacecraft and flight environment"></canvas><div id="docking-feed-effect" class="docking-feed-effect" aria-hidden="true" hidden></div><div class="view-heading"><div><p id="view-caption">Vehicle assembly bay</p><span id="view-subtitle">Pioneer / Atlas launch configuration</span></div><button class="view-button" id="camera-button" title="Change camera view">Change view <span aria-hidden="true">↗</span></button></div><div class="view-tabs" id="view-tabs" role="group" aria-label="Workbench view"><button id="vehicle-view" class="selected" aria-pressed="true">Vehicle</button><button id="destination-view" aria-pressed="false">Destination</button></div><div class="model-dimensions" id="model-dimensions"><span id="height-value">—</span><span>overall height</span></div><div class="view-location" id="view-location"><span class="location-marker" aria-hidden="true">+</span><span id="site-caption">Kennedy Space Center, Florida</span></div><div class="flight-clock" id="flight-clock" hidden><span>Mission elapsed time</span><strong id="clock-value">T+ 00:00</strong></div><div class="countdown" id="countdown" hidden><span>Ignition sequence</span><strong id="countdown-number">3</strong></div><div id="descent-hud" class="descent-hud primary-telemetry" hidden aria-label="Primary flight instruments"><div><small id="hud-label-first">Altitude</small><strong id="hud-altitude">—</strong></div><div><small id="hud-label-second">Vertical speed</small><strong id="hud-vertical">—</strong></div><div><small id="hud-label-third">Pad offset</small><strong id="hud-offset">—</strong></div></div><div id="landing-marker" class="landing-marker" hidden aria-hidden="true"><span>+</span><small>Landing zone</small></div><div id="docking-reticle" class="docking-reticle" hidden aria-hidden="true"><span class="reticle-circle"></span><span class="reticle-cross"></span><span id="alignment-dot" class="alignment-dot"></span></div><div id="view-error" class="view-error" hidden><strong>3D graphics are unavailable</strong><p>Enable WebGL in your browser, then reload the game. Your design and checkpoint are safe.</p></div><div class="viewport-bottom"><span id="view-hint">Drag to inspect the vehicle</span><span id="vehicle-label">Pioneer CM</span></div><div id="outcome-overlay" class="outcome-overlay" role="status" aria-live="polite" hidden></div><div id="paused-overlay" class="paused-overlay" hidden><div><p class="eyebrow">Simulation paused</p><h2>Take your time.</h2><p>All thrust inputs are released.</p><button id="resume-button" class="primary-button">Resume flight</button></div></div></div>
      <section class="docking-camera-controls" id="docking-camera-controls" aria-label="Docking camera controls" hidden><div class="docking-camera-buttons" role="group" aria-label="Docking camera view"><span class="docking-camera-label">Camera</span><button type="button" data-docking-view="chase" aria-pressed="true" class="selected">External chase</button><button type="button" data-docking-view="port" aria-pressed="false">Docking camera</button><button type="button" data-docking-view="cockpit" aria-pressed="false">Cockpit</button></div><p id="docking-camera-guidance" aria-live="polite"></p></section>
      <div class="command-deck" id="command-deck"></div>
      <div class="touch-controls" id="touch-controls" hidden><div class="touch-tabs" role="group" aria-label="Thruster control group"><button id="touch-translation" class="selected" aria-pressed="true">Translate</button><button id="touch-rotation" aria-pressed="false">Rotate</button><button id="touch-fine" aria-pressed="false">Fine RCS</button><span>Hold to fire</span></div><div id="touch-pad" class="touch-pad"></div></div>
    </section>
    <aside class="instruments" aria-label="Vehicle performance and flight instruments"><div class="instrument-heading"><span class="eyebrow" id="instrument-label">Design performance</span><span class="unit-system">SI</span></div><div id="instrument-values"></div><div id="readiness" class="readiness"></div><div class="checkpoint-section"><div><span class="checkpoint-dot"></span><span id="checkpoint-label">Checkpoints save locally</span></div><button id="save-button" class="secondary-button" disabled>Save checkpoint</button><button id="restore-button" class="quiet-button full-width" ${checkpoint ? '' : 'disabled'}>Restore checkpoint</button></div><div class="training-actions"><button id="practice-button" class="text-button">Docking practice</button><button id="landing-practice" class="text-button">Surface landing practice</button></div></aside>
  </div>
  <footer class="app-footer"><span><span class="status-dot"></span> Mission laboratory <b>v0.5.6</b></span><span id="footer-hint">Design the vehicle. Fly the physics.</span><button id="model-button">Flight model &amp; credits</button></footer>
</div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<dialog id="practice-details" class="practice-details"><div class="dialog-header"><div><p class="eyebrow">Current exercise</p><h2 id="practice-details-title">Flight details</h2></div><button id="close-practice-details" class="kc-tool" aria-label="Close flight details">${icon('close')}<span class="kc-sr">Close</span></button></div><div class="practice-detail-tabs" role="tablist" aria-label="Flight details"><button id="practice-tab-goal" role="tab" aria-selected="true" aria-controls="practice-panel-goal">Goal</button><button id="practice-tab-telemetry" role="tab" aria-selected="false" aria-controls="practice-panel-telemetry">Telemetry</button><button id="practice-tab-controls" role="tab" aria-selected="false" aria-controls="practice-panel-controls">Controls</button></div><div class="practice-detail-body"><section id="practice-panel-goal" role="tabpanel" aria-labelledby="practice-tab-goal"></section><section id="practice-panel-telemetry" role="tabpanel" aria-labelledby="practice-tab-telemetry" hidden></section><section id="practice-panel-controls" role="tabpanel" aria-labelledby="practice-tab-controls" hidden></section></div></dialog>
<dialog id="practice-time" class="flight-time-sheet" aria-labelledby="practice-time-title"><header><h2 id="practice-time-title">Time</h2><button id="close-practice-time" class="kc-tool" aria-label="Close time controls">${icon('close')}</button></header><p id="practice-time-state"></p><div class="flight-time-options" role="group" aria-label="Coast speed">${[1,5,10].map(rate=>`<button data-practice-time="${rate}" aria-pressed="false">${rate}×</button>`).join('')}</div><p id="practice-time-reason"></p><button id="resume-practice-time" class="primary-button">Resume flight</button></dialog>
<dialog id="landing-chooser" class="landing-chooser" aria-labelledby="landing-chooser-title">
  <div class="dialog-header"><div><p class="eyebrow">Surface landing practice</p><h2 id="landing-chooser-title">Choose a world</h2></div><button id="landing-chooser-close" class="kc-tool" aria-label="Cancel world selection">${icon('close')}</button></div>
  <div class="landing-chooser-body"><p>Local descent with a standard lander. Transfer skipped.</p><label for="landing-world-select">Landing world</label><select id="landing-world-select"></select><div class="landing-chooser-facts"><small>Surface gravity</small><strong id="landing-world-gravity">—</strong></div><div class="landing-chooser-challenge"><small>World challenge</small><p id="landing-world-challenge"></p></div><p class="landing-chooser-note">Environmental survival is not simulated. Landing assist starts on.</p></div>
  <div class="landing-chooser-actions"><button id="landing-chooser-cancel" class="secondary-button">Cancel</button><button id="landing-chooser-begin" class="primary-button">Begin landing</button></div>
</dialog>
<dialog id="guide-dialog" class="guide-dialog field-guide flight-guide" aria-labelledby="field-guide-title">
  <header class="dialog-header guide-header"><div class="guide-brand"><span>${KC_MARKUP}</span><strong>Kinetic Core</strong></div><h2 id="field-guide-title">How to play</h2><button type="button" class="kc-tool" id="close-guide" aria-label="Close flight guide">${icon('close')}</button></header>
  <div class="guide-scroll">
    <section class="guide-creator" aria-labelledby="guide-creator-title">
      <figure class="guide-creator-portrait"><img src="${AUTHOR_PORTRAIT_PATH}" alt="Mykyta Borisov in a spacesuit on an illustrative lunar surface" width="1024" height="1536" decoding="async"></figure>
      <div class="guide-creator-copy"><p class="guide-eyebrow">Created by</p><h1 id="guide-creator-title">Mykyta<br>Borisov</h1><p class="guide-creator-intro">Build a spacecraft. Learn its controls.<br>Fly your next mission.</p><div class="guide-creator-actions"><button type="button" id="guide-play" class="primary-button guide-play">${icon('play')}<span>Play</span></button><div data-guide-author-entry></div></div><p class="guide-play-hint">Choose a mission or practice.</p></div>
    </section>
    <section class="guide-lessons" aria-labelledby="guide-lessons-title">
      <div class="guide-lessons-heading"><div><p class="guide-eyebrow">Flight guide</p><h2 id="guide-lessons-title">How to play</h2></div><p>Choose a maneuver. Learn the next step.</p></div>
  <nav class="field-guide-tabs" role="tablist" aria-label="Choose a flight guide">
    <button id="guide-tab-moon" role="tab" aria-selected="true" aria-controls="guide-panel-moon">Moon</button>
    <button id="guide-tab-docking" role="tab" aria-selected="false" aria-controls="guide-panel-docking" tabindex="-1">Docking</button>
    <button id="guide-tab-landing" role="tab" aria-selected="false" aria-controls="guide-panel-landing" tabindex="-1">Landing</button>
    <button id="guide-tab-more" role="tab" aria-selected="false" aria-controls="guide-panel-more" tabindex="-1">More</button>
  </nav>
  <div class="guide-content field-guide-body">
    <section id="guide-panel-moon" class="field-guide-panel" role="tabpanel" aria-labelledby="guide-tab-moon">
      <h3>Your first Moon expedition</h3><p>Fly the same spacecraft from Earth launch to lunar touchdown.</p>
      <ol class="field-guide-steps">
        <li><strong>Prepare.</strong> Open <strong>Missions → Prepare expedition</strong>. Choose a landing approach, then <strong>Start lunar mission</strong>. Use <strong>Edit rocket</strong> to change hardware.</li>
        <li><strong>Keep power available.</strong> For a first flight, leave <strong>Guidance on</strong> and the engine ceiling at <strong>100%</strong>. Guidance spends actual propellant.</li>
        <li><strong>Release empty stages.</strong> Follow the next maneuver beneath the scene. Select <strong>Separate stage</strong> when asked, then plan lunar departure from Earth orbit.</li>
        <li><strong>Fly the approach.</strong> Use time warp for coasts. During descent, watch altitude, vertical speed and pad offset. Save before a risky maneuver in <strong>Tools → Flight data</strong>.</li>
      </ol>
      <div class="field-guide-next"><span data-guide-next="moon-mission">Next: choose a lunar landing approach.</span><button class="primary-button" data-guide-mode="moon-mission">Prepare expedition</button></div>
    </section>
    <section id="guide-panel-docking" class="field-guide-panel" role="tabpanel" aria-labelledby="guide-tab-docking" hidden>
      <h3>Align. Approach. Brake.</h3><p><strong>Missions → Docking</strong> starts near a station. This separate exercise skips launch and rendezvous.</p>
      <ul class="field-guide-points"><li>Choose <strong>External chase</strong>, <strong>Docking camera</strong> or <strong>Cockpit</strong>.</li><li>Use <strong>Translate</strong> to remove drift and <strong>Rotate</strong> to align the ports. <strong>Fine RCS</strong> reduces thrust.</li><li>Hold <strong>Brake</strong> before contact. Vacuum has no passive braking; every assist uses propellant.</li></ul>
      <p class="field-guide-limit">Capture: closing ≤ 0.15 m/s, offset ≤ 0.35 m, attitude ≤ 5°. Full live limits and keys are in <strong>Details → Goal / Controls</strong>.</p>
      <div class="field-guide-next"><span data-guide-next="manual-docking">Next: align the ports before closing the range.</span><button class="primary-button" data-guide-mode="manual-docking">Start docking practice</button></div>
    </section>
    <section id="guide-panel-landing" class="field-guide-panel" role="tabpanel" aria-labelledby="guide-tab-landing" hidden>
      <h3>Bring the lander down.</h3><p><strong>Missions → Surface landing</strong> starts a separate descent with a standard lander and <strong>Landing assist on</strong>. Transfer is skipped.</p>
      <ul class="field-guide-points"><li>Keep the engine ceiling at <strong>100%</strong> for assisted descent. It limits the power available to the assist.</li><li><strong>Landing assist</strong> manages descent and attitude. <strong>Upright hold</strong> controls attitude only.</li><li>For manual flight, adjust engine power and hold the tilt controls. Counter-thrust cancels drift; <strong>Cut engine</strong> sets power to zero.</li></ul>
      <p class="field-guide-limit">Touchdown: inside ±25 m, vertical ≤ 2 m/s, lateral ≤ 1.5 m/s. Tilt and rotation also matter. See <strong>Details → Goal</strong> for every live limit.</p>
      <div class="field-guide-next"><span data-guide-next="surface-landing">Next: resume when the engine and assists are set.</span><button class="primary-button" data-guide-mode="surface-landing">Start landing practice</button></div>
    </section>
    <section id="guide-panel-more" class="field-guide-panel" role="tabpanel" aria-labelledby="guide-tab-more" hidden>
      <details id="guide-earth-launch-detail" class="field-guide-disclosure"><summary>Earth launch practice</summary><p><strong>Missions → Earth launch</strong> starts the standard two-stage vehicle. Guidance steers; you control the engine ceiling and stage release. Separate depleted stages and reach a bound orbit above 150 km periapsis. Docking then opens a separate terminal exercise.</p><p>Use <strong>Details → Goal → Return to vehicle assembly</strong> in the workbench to change standard hardware. Full keys and live flight data are in <strong>Details</strong>.</p><button class="secondary-button" data-guide-mode="earth-launch">Start Earth launch practice</button></details>
      <details class="field-guide-disclosure"><summary>Pause, checkpoints and cameras</summary><p><kbd>Esc</kbd> pauses. Leaving the game releases held controls. Checkpoints save on this device; private browser storage may be unavailable.</p><p>Restoring pauses the flight. Set engine power deliberately before resuming. Practice uses <strong>Details → Telemetry</strong>; the expedition uses <strong>Tools → Flight data</strong>.</p><p>Use one finger to rotate; drag upward for a view toward the surface. Pinch with two fingers to zoom. <strong>Inspection</strong> changes the view, never the flight. The curved-arrow icon returns to the flight camera; mounted docking views stay body-fixed.</p></details>
      <section id="model-section"><details id="guide-model-detail" class="field-guide-disclosure"><summary>Flight model, credits and sources</summary>
        <p>Fixed-step Newtonian flight uses inverse-square gravity, simplified atmosphere and drag, finite propellant and stage mass changes. Orbit is confirmed from physical energy and apsides.</p><p>The Moon route uses 2D patched-conic segments, ideal engine pointing and a synthetic Moon epoch. Docking uses local Hill motion and rigid-body RCS rotation. Terrain, the pad, station and fictional spacecraft are illustrative.</p><p>There is no structural flex, Earth oblateness, full weather, long-range rendezvous or certification-grade contact model. Other-world landings are local rehearsals; environmental survival, sampling and return are not implemented. Titan has simplified atmospheric drag, not a full entry or parachute model.</p>
        <p>Created by <strong>Mykyta Borisov</strong>, the sole game author. No NASA affiliation or endorsement is implied.</p><p>Earth imagery: NASA Earth Observatory / NASA Goddard, Blue Marble: Next Generation by Reto Stöckli. NASA/JPL maps provide globe imagery; local terrain and hardware are procedural reconstructions.</p>
        <ul class="source-links"><li><a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener">NASA 3D visualization maps</a></li><li><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener">NASA SVS: Moon color and relief</a></li><li><a href="https://ssd.jpl.nasa.gov/sats/phys_par/sep.html" target="_blank" rel="noopener">JPL satellite physical parameters</a></li><li><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noopener">NASA Blue Marble base map</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/" target="_blank" rel="noopener">NASA Glenn: rocket equation</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/" target="_blank" rel="noopener">NASA Glenn: specific impulse</a></li><li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/" target="_blank" rel="noopener">NASA Glenn: atmosphere model</a></li><li><a href="https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/" target="_blank" rel="noopener">NASA Space Apps challenge</a></li><li><a href="https://threejs.org/" target="_blank" rel="noopener">Three.js, MIT license</a></li></ul><p>Equations, tests and limitations are in <strong>docs/PHYSICS.md</strong> in the repository.</p>
      </details></section>
    </section>
  </div>
    </section>
  </div>
</dialog>
<dialog id="destination-dialog" class="destination-dialog"><div class="dialog-header"><div><p class="eyebrow">Solar System destinations</p><h2>Where will you touch down?</h2></div><button id="close-destination" class="kc-tool" aria-label="Close destinations">${icon('close')}</button></div><p class="intro-copy">Choose a world to inspect. Surface landings are separate local exercises.</p><div class="destination-layout"><select id="destination-world-select" aria-label="Select a destination">${DESTINATIONS.map(d=>`<option value="${d.id}">${escape(d.name)}</option>`).join('')}</select><section id="destination-detail" class="destination-detail" aria-label="Selected destination"></section></div><footer class="destination-actions"><button id="inspect-destination" class="primary-button full-width">Inspect world in 3D</button></footer></dialog>
<dialog id="confirm-dialog" class="confirm-dialog"><p class="eyebrow">Flight decision</p><h2 id="confirm-title"></h2><p id="confirm-copy"></p><div class="button-row"><button id="confirm-cancel" class="secondary-button">Keep flying</button><button id="confirm-action" class="primary-button">Confirm</button></div></dialog>`;


const gameShell = document.querySelector('.game-shell');
const workspace = document.querySelector('.workspace');
const flightCenter = document.querySelector('.flight-center');
const vehicleLibrary = document.querySelector('.library');
const fullInstruments = document.querySelector('.instruments');
const flightPlan = $('flight-library');
flightCenter.insertBefore($('descent-hud'), $('viewport'));
$('practice-panel-telemetry').prepend($('flight-clock'));
let detailsWasPaused = true;
function focusFlightView() { if (activeFlight()) $('flight-canvas').focus({ preventScroll: true }); }
function selectDetailsTab(name) {
  for (const id of ['goal', 'telemetry', 'controls']) {
    $(`practice-tab-${id}`).setAttribute('aria-selected', String(id === name));
    $(`practice-tab-${id}`).tabIndex = id === name ? 0 : -1;
    $(`practice-panel-${id}`).hidden = id !== name;
  }
}
for (const name of ['goal', 'telemetry', 'controls']) $('practice-tab-' + name).onclick = () => selectDetailsTab(name);
document.querySelector('.practice-detail-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const names = ['goal', 'telemetry', 'controls'];
  const index = names.findIndex(name => $('practice-tab-' + name) === document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
  selectDetailsTab(names[next]); $('practice-tab-' + names[next]).focus();
});
$('flight-details-button').onclick = () => { detailsWasPaused = state.paused; clearInputs(); pause(true); selectDetailsTab('telemetry'); $('practice-details').showModal(); };
$('close-practice-details').onclick = () => $('practice-details').close();
$('practice-details').addEventListener('close', () => { clearInputs(); pause(true); focusFlightView(); });
function syncPracticeLayout() {
  const assembly = state.phase === 'assembly';
  gameShell.dataset.workspace = assembly ? 'assembly' : 'flight';
  gameShell.dataset.flightKind = state.flight?.kind ?? '';
  gameShell.dataset.phase = state.phase;
  gameShell.dataset.paused = String(state.paused);
  document.body.dataset.practiceFlight = assembly ? '' : state.flight?.kind ?? '';
  $('flight-details-button').hidden = assembly;
  const landingContext = !assembly && state.flight?.kind === 'landing';
  $('landing-world-button').hidden = !landingContext; $('practice-title').hidden = landingContext;
  setText('landing-world-name', destination().name);
  $('landing-world-button').setAttribute('aria-label', 'Change landing world. Current world: ' + destination().name);
  if (assembly) { vehicleLibrary.append(flightPlan); workspace.append(fullInstruments); }
  else { $('practice-panel-goal').append(flightPlan); $('practice-panel-telemetry').append(fullInstruments); }
  const title = assembly ? state.preview ? 'Destination survey' : 'Earth launch setup' : state.flight?.kind === 'landing' ? destination().name + ' landing practice' : state.flight?.kind === 'docking' ? 'Manual docking practice' : 'Earth launch practice';
  setText('practice-title', title); setText('practice-details-title', title);
}
function setPrimaryTelemetry(labels, values) {
  for (const reading of $('descent-hud').children) reading.classList.remove('warning');
  ['first', 'second', 'third'].forEach((name, i) => setText('hud-label-' + name, labels[i]));
  ['altitude', 'vertical', 'offset'].forEach((name, i) => setText('hud-' + name, values[i]));
}
function setPracticeCheck(name, passed, value) {
  const node = $('practice-check-' + name); if (!node) return;
  node.dataset.state = passed ? 'within' : 'pending';
  setText('practice-check-value-' + name, value);
}
function emitMilestone(id) { document.dispatchEvent(new CustomEvent('kc:milestone', { detail: { id, world: id.startsWith('surface-') ? state.destination : undefined, confirmedLanding: id.startsWith('surface-') } })); }

function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4300); }
if (import.meta.env.DEV) window.addEventListener('error', event => notify(`Development error: ${event.message}`));
function log(message) { if (!message || message === lastEvent) return; lastEvent = message; state.log.push({ time: state.flight?.time ?? 0, message }); state.log = state.log.slice(-30); renderLog(); }
function renderLog() { $('log-list').innerHTML = state.log.slice(-5).reverse().map(e => `<li><time>T+${clock(e.time)}</time><span>${escape(e.message)}</span></li>`).join(''); }
function dataValue(id, label, value, unit, detail = '') { return `<div class="instrument"><span class="instrument-name">${label}</span><div><strong id="${id}">${value}</strong><span class="instrument-unit">${unit}</span></div>${detail ? `<small>${detail}</small>` : ''}</div>`; }
function setText(id, value) { const node = $(id); if (node && node.textContent !== String(value)) node.textContent = value; }
function activeFlight() { return ['launch', 'orbit', 'docking', 'landing'].includes(state.phase); }
function clearInputs() { keys.clear(); touch.clear(); document.querySelectorAll('[data-control]').forEach(b => b.classList.remove('firing')); }
function pause(value = !state.paused) {
  if (!activeFlight()) return;
  if (!value && state.flight?.kind === 'launch' && needsStageRelease(state.flight)) { value = true; notify('Stage empty. Select Separate stage to resume ascent.'); }
  clearInputs(); state.paused = value; accumulator = 0;
  gameShell.dataset.paused = String(value);
  $('paused-overlay').hidden = !value;
  $('pause-button').innerHTML = icon(value ? 'play' : 'pause') + `<span class="kc-sr">${value ? 'Resume' : 'Pause'}</span>`;
  $('pause-button').setAttribute('aria-label', value ? 'Resume simulation' : 'Pause simulation');
  setText('simulation-status', value ? 'Paused' : state.phase === 'orbit' ? 'Orbit confirmed' : state.phase === 'launch' ? 'Ascent' : state.phase === 'landing' ? 'Descent' : 'Approach');
  if (!value) focusFlightView();
}

function save(silent = false) { if (state.phase === 'failed') return; const snapshot = makeCheckpoint(state.config, state.phase, state.flight, state.log, state.destination); if (!validateCheckpoint(snapshot, configValid)) { if (!silent) notify('This flight state cannot be saved safely. Your previous checkpoint is intact.'); return; } checkpoint = snapshot; const persisted = writeCheckpoint(storage, snapshot, configValid); $('restore-button').disabled = false; setText('checkpoint-label', persisted ? `Saved at ${new Date(snapshot.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Checkpoint kept for this session'); if (!silent) notify(persisted ? 'Checkpoint saved on this device.' : 'Checkpoint kept in memory. Browser storage is unavailable.'); }

function trustedRestore(snapshot) {
  if (!validateCheckpoint(snapshot, configValid)) return false;
  const raw = snapshot.flight;
  let flight;
  try { flight = restoreCheckpointFlight(snapshot, configValid); } catch { return false; }
  state.destination = snapshot.flight?.destination ?? snapshot.destination ?? state.destination; state.preview = false; state.outcomeDismissed = false; state.config = { ...snapshot.config }; state.phase = snapshot.phase; state.flight = flight; state.log = structuredClone(snapshot.log); state.countdown = 0; if (flight?.kind === 'launch') state.warp = 1; state.throttle = flight?.commandedThrottle ?? 1; state.guidance = flight?.guidance ?? true; state.holdAttitude = flight?.holdAttitude ?? true; state.landingAssist = false; state.paused = false; clearInputs(); accumulator = 0; renderPhase(); if (activeFlight()) pause(true); log('Checkpoint restored.'); return true;
}

function restore() { detailsWasPaused = true; if (!checkpoint || !trustedRestore(checkpoint)) { notify('This checkpoint cannot be restored. Start a new flight.'); return; } notify('Checkpoint restored. Resume when you are ready.'); }
let confirmAction = null, confirmWasPaused = false;
function confirm(title, copy, action, label = 'Confirm') { confirmWasPaused = state.paused; pause(true); $('confirm-title').textContent = title; $('confirm-copy').textContent = copy; $('confirm-action').textContent = label; confirmAction = action; $('confirm-dialog').showModal(); }
$('confirm-cancel').onclick = () => { separationRequested = false; $('confirm-dialog').close(); if (!confirmWasPaused) pause(false); };
$('confirm-action').onclick = () => { $('confirm-dialog').close(); const action = confirmAction; confirmAction = null; action?.(); };
$('confirm-dialog').addEventListener('cancel', () => { separationRequested = false; if (!confirmWasPaused) pause(false); });

function assemble() { state.preview = false; state.outcomeDismissed = false; clearInputs(); separationRequested = false; state.phase = 'assembly'; state.flight = null; state.paused = false; state.countdown = 0; accumulator = 0; renderPhase(); }
function beginLaunch() { if(!rolloutReady){rollout.open();return;}rolloutReady=false;state.preview = false; state.outcomeDismissed = false; if (!evaluateVehicle(state.config).valid || !renderer) return; clearInputs(); state.flight = createLaunch(state.config); state.phase = 'launch'; state.warp = 1; state.throttle = 1; state.guidance = true; state.paused = false; state.countdown = 3; state.log = []; lastEvent = ''; accumulator = 0; renderPhase(); save(true); log('Launch sequence armed. Guidance active; staging is manual.'); focusFlightView(); }
function beginDocking(practice = false) { state.preview = false; state.outcomeDismissed = false; clearInputs(); state.flight = createDocking(state.config); state.phase = 'docking'; state.paused = false; state.holdAttitude = true; state.fine = false; state.cameraMode = 'chase'; renderer?.resetOrbit?.(); state.warp = 1; state.countdown = 0; accumulator = 0; renderPhase(); log(practice ? 'Terminal docking practice. The launch phase has been skipped.' : 'Terminal approach scenario loaded. Long-range rendezvous is not simulated.'); save(true); focusFlightView(); }
function stage() { if (!state.flight || state.flight.kind !== 'launch' || state.countdown > 0 || separationRequested) return; const execute = () => { separationRequested = false; const result = separateStage(state.flight); if (result.ok) { state.paused = false; renderer?.update({ mode: 'launch', ...getLaunchTelemetry(state.flight), phase: state.phase, positionSI: state.flight.position.slice(), velocitySI: state.flight.velocity.slice(), separation: state.flight.stageIndex, stageIndex: state.flight.stageIndex }, 0); log(result.message); save(true); renderPhase(); } else notify(result.message); }; const t = getLaunchTelemetry(state.flight); if (state.phase === 'launch' && t.fuelFraction > 0.05) { separationRequested = true; confirm('Separate a fueled stage?', `${fmt(t.fuel / 1000, 1)} tonnes of propellant will be discarded. This cannot be recovered during the flight.`, execute, 'Separate stage'); } else execute(); }

function renderBuilder() {
  const vehicle = evaluateVehicle(state.config), parts = vehicle.parts;
  $('module-slots').innerHTML = categories.map((category, index) => `<section class="module-slot ${state.selectedSlot === category ? 'expanded' : ''}"><button class="slot-heading" data-slot="${category}" aria-expanded="${state.selectedSlot === category}"><span class="slot-number">${String(index + 1).padStart(2, '0')}</span><span><small>${labels[category]}</small><strong>${escape(parts[category].name)}</strong></span><span class="slot-chevron" aria-hidden="true">${state.selectedSlot === category ? '−' : '+'}</span></button><div class="part-options" ${state.selectedSlot === category ? '' : 'hidden'}>${CATALOG[category].map(part => `<button class="part-option ${part.id === state.config[category] ? 'selected' : ''}" data-category="${category}" data-part="${part.id}" aria-pressed="${part.id === state.config[category]}"><span><strong>${escape(part.name)}</strong><small>${escape(part.description)}</small></span><span class="selection-circle" aria-hidden="true"></span><span class="part-mass">${fmt((part.dryMass + (part.propellant ?? part.rcsFuel ?? 0)) / 1000, 1)} t</span></button>`).join('')}</div></section>`).join('');
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { state.selectedSlot = state.selectedSlot === b.dataset.slot ? null : b.dataset.slot; renderBuilder(); });
  document.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { state.config[b.dataset.category] = b.dataset.part; renderBuilder(); updateVehicle(); renderInstruments(); renderCommand(); });
  for (const key of ['cargo', 'site']) { const select = $(`${key}-select`); select.innerHTML = CATALOG[key].map(p => `<option value="${p.id}">${escape(p.name)}</option>`).join(''); select.value = state.config[key]; select.onchange = () => { state.config[key] = select.value; updateVehicle(); renderInstruments(); renderCommand(); if(key==='cargo')renderPayloadChoices(); }; }
  renderPayloadChoices();
  setText('height-value', `${fmt(vehicle.height, 1)} m`); setText('view-subtitle', `${parts.capsule.name} / ${parts.core.name}`); setText('site-caption', parts.site.id === 'kennedy' ? 'Kennedy Space Center, Florida' : 'Wallops Flight Facility, Virginia');
}
function renderPayloadChoices() {
  const holder=$('payload-options'),select=$('cargo-select');
  holder.replaceChildren();
  for(const payload of CATALOG.cargo){
    const button=document.createElement('button');button.type='button';button.dataset.payload=payload.id;
    button.setAttribute('aria-pressed',String(state.config.cargo===payload.id));
    button.innerHTML=`<strong>${escape(payload.name)}</strong><small>+${fmt(payload.dryMass)} kg</small>`;
    button.onclick=()=>{select.value=payload.id;select.dispatchEvent(new Event('change',{bubbles:true}));holder.querySelector(`[data-payload="${payload.id}"]`)?.focus({preventScroll:true});};
    holder.append(button);
  }
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
let landingChooserDidBegin = false, landingChooserReturnMode = 'earth-launch';
function currentVisibleMode() {
  if (document.querySelector('.mission-control[open]')) return 'moon-mission';
  if (document.querySelector('.rocket-workshop[open]')) return 'workshop';
  if (document.querySelector('.solar-explorer:not([hidden])')) return 'solar-system';
  if (document.querySelector('.earth-online:not([hidden])')) return 'online-earth';
  return state.flight?.kind === 'landing' ? 'surface-landing' : state.flight?.kind === 'docking' ? 'manual-docking' : 'earth-launch';
}
function updateLandingChoice() {
  const world = DESTINATIONS.find(item => item.id === $('landing-world-select').value) ?? destination();
  setText('landing-world-gravity', `${fmt(world.gravity, world.gravity < .1 ? 5 : 2)} m/s²`);
  setText('landing-world-challenge', world.hazard.split(';')[0]);
}
function openLandingChooser() {
  clearInputs(); pause(true);
  landingChooserReturnMode = currentVisibleMode(); landingChooserDidBegin = false;
  $('landing-world-select').innerHTML = DESTINATIONS.map(world => `<option value="${world.id}">${escape(world.name)}${world.parent !== world.name ? ' / ' + escape(world.parent) : ''}</option>`).join('');
  $('landing-world-select').value = state.destination; updateLandingChoice();
  $('landing-chooser').showModal();
}
function updatePracticeTime() {
  const policy = getFlightTimePolicy(state.flight, state.warp, { guidance: state.guidance });
  setText('practice-time-state', `Selected coast rate ${policy.requested}× · ${state.paused ? 'paused; resumes at' : 'applied'} ${policy.applied}×`);
  setText('practice-time-reason', policy.reason);
  document.querySelectorAll('[data-practice-time]').forEach(button => { const rate = Number(button.dataset.practiceTime); button.disabled = rate > policy.maximum; button.setAttribute('aria-pressed', String(rate === state.warp)); });
  $('resume-practice-time').disabled = state.flight?.kind === 'launch' && needsStageRelease(state.flight);
}
let practiceTimeResumeRequested = false;
document.addEventListener('kc:time-practice', () => { if (!activeFlight()) return; practiceTimeResumeRequested = false; clearInputs(); pause(true); updatePracticeTime(); $('practice-time').showModal(); });
$('close-practice-time').onclick = () => { practiceTimeResumeRequested = false; $('practice-time').close(); };
$('practice-time').addEventListener('cancel', () => { practiceTimeResumeRequested = false; });
$('practice-time').addEventListener('close', () => {
  const resume = practiceTimeResumeRequested; practiceTimeResumeRequested = false;
  clearInputs(); pause(!resume); // pause(false) still enforces a depleted-stage hold.
});
$('resume-practice-time').onclick = () => { practiceTimeResumeRequested = true; $('practice-time').close(); };
document.querySelectorAll('[data-practice-time]').forEach(button => button.onclick = () => { state.warp = Number(button.dataset.practiceTime); updatePracticeTime(); });
$('landing-world-select').onchange = updateLandingChoice;
installDestinationCarousel({ select: $('landing-world-select'), dialog: $('landing-chooser') });
const destinationCarousel = installDestinationCarousel({ select: $('destination-world-select'), dialog: $('destination-dialog') });
$('destination-world-select').addEventListener('change',()=>{state.destination=$('destination-world-select').value;renderer?.setDestination(state.destination);renderDestinations();updateDestinationLabels();});
$('landing-world-button').onclick = openLandingChooser;
for (const id of ['landing-chooser-close', 'landing-chooser-cancel']) $(id).onclick = () => $('landing-chooser').close();
$('landing-chooser').addEventListener('close', () => { clearInputs(); pause(true); if (!landingChooserDidBegin) modeHub?.setCurrent(landingChooserReturnMode); });
$('landing-chooser-begin').onclick = () => {
  const selected = DESTINATIONS.find(world => world.id === $('landing-world-select').value);
  if (!selected || !renderer) return;
  landingChooserDidBegin = true; $('landing-chooser').close();
  closeAlternateModeViews();
  state.destination = selected.id; renderer.setDestination(selected.id); updateDestinationLabels();
  beginLanding(true);
};
function openDestinations() { renderDestinations(); $('destination-dialog').showModal(); }
function renderDestinations() {
  $('destination-world-select').value=state.destination; destinationCarousel.render();
  const d = destination();
  $('destination-detail').innerHTML = `<p class="eyebrow">${escape(d.parent)} system</p><h3>${escape(d.name)}</h3><p>${escape(d.hazard)}</p><dl class="destination-stats"><div><dt>Surface gravity</dt><dd>${fmt(d.gravity, 4)} m/s²</dd></div><div><dt>Atmosphere</dt><dd>${escape(d.atmosphere)}</dd></div></dl><details class="destination-science"><summary>World details & sources</summary><p>${escape(d.surface)}</p><p>Mean radius: ${fmt(d.radius / 1000, 1)} km.</p><h4>Sample strategy</h4><p>${escape(d.sampleMethod)}</p><p class="model-note">Sampling and environmental survival are planning context for future versions.</p><a class="source-link" href="${escape(d.source)}" target="_blank" rel="noopener">JPL physical parameters</a> <a class="source-link" href="${escape(d.factSource)}" target="_blank" rel="noopener">NASA destination profile</a>${d.id === 'europa' ? '<button id="europa-evidence" class="secondary-button full-width">Inspect surface evidence</button>' : ''}</details>`;
  $('inspect-destination').textContent = `Inspect ${d.name} in 3D`;
  if($('europa-evidence')) $('europa-evidence').onclick = () => { $('destination-dialog').close(); europaGuide.open(); };
  $('inspect-destination').onclick = () => { $('destination-dialog').close(); state.preview = true; renderPhase(); window.scrollTo({top:0,left:0,behavior:'instant'}); };
}
function updateDestinationLabels() {
  const d = destination(); setText('selected-destination', d.name);
  setText('destination-badge', `${d.name} / ${d.parent} system`);
}
function renderOutcome() {
  const overlay = $('outcome-overlay');
  if (!['failed', 'docked', 'landed'].includes(state.phase) || state.outcomeDismissed || state.phase === 'docked' && performance.now() < (state.dockedRevealUntil ?? 0)) { overlay.hidden = true; $('viewport').classList.remove('has-outcome'); return; }
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
  if(state.phase==='docked'){
    const inspect=document.createElement('button');inspect.className='primary-button';inspect.textContent='Inspect docked craft';
    inspect.onclick=()=>{clearInputs();state.outcomeDismissed=true;state.cameraMode='chase';renderer?.resetOrbit?.(true);renderer?.beginOrbit?.();renderOutcome();syncSceneInspection();focusFlightView();};
    overlay.querySelector('.outcome-actions').prepend(inspect);$('outcome-retry').className='quiet-button';
  }
  $('outcome-retry').onclick = failed ? restore : landing ? () => beginLanding(state.landingAssist) : () => beginDocking(true);
  $('outcome-design').onclick = assemble;
}
function renderInstruments() {
  if (state.phase === 'assembly' && state.preview) {
    const d = destination();
    $('instrument-values').innerHTML = dataValue('gravity-value', 'Surface gravity', fmt(d.gravity, d.gravity < .1 ? 4 : 2), 'm/s²') + dataValue('radius-value', 'Mean radius', fmt(d.radius / 1000, 1), 'km') + dataValue('parent-value', 'Primary body', escape(d.parent), '') + `<div class="instrument"><span class="instrument-name">Surface</span><p>${escape(d.surface)}</p></div>`;
    $('readiness').innerHTML = `<div class="readiness-title">Terminal landing exercise</div><p>${escape(d.hazard)}</p><p class="model-note">Standard lander. Environmental survival and sample collection are not simulated yet.</p>`; return;
  }
  if (state.flight?.kind === 'landing') {
    $('instrument-values').innerHTML = dataValue('altitude-value', 'Altitude above surface', '—', 'm') + dataValue('vertical-value', 'Vertical speed', '—', 'm/s') + dataValue('horizontal-value', 'Lateral speed', '—', 'm/s') + dataValue('offset-value', 'Pad offset', '—', 'm') + dataValue('angle-value', 'Tilt from upright', '—', '°') + dataValue('fuel-value', 'Lander propellant', '—', 'kg');
    $('readiness').innerHTML = `<div id="landing-status" class="readiness-title">Control your descent</div><p id="landing-detail">Land inside ±25 m. Vertical ≤ 2 m/s, lateral ≤ 1.5 m/s, tilt ≤ 8° and rotation ≤ 3°/s.</p><div class="fuel-track"><i id="fuel-track-fill"></i></div>`; return;
  }
  if (state.phase === 'assembly') { const v = evaluateVehicle(state.config); $('instrument-values').innerHTML = dataValue('mass-value', 'Liftoff mass', fmt(v.wetMass / 1000, 1), 't') + dataValue('dv-value', 'Ideal delta-v', fmt(v.deltaV / 1000, 2), 'km/s', 'Vacuum ideal; before flight losses') + dataValue('twr-value', 'Liftoff thrust / weight', fmt(v.twr, 2), 'TWR') + dataValue('rcs-value', 'RCS propellant', fmt(v.rcsFuel), 'kg'); $('readiness').innerHTML = `<div class="readiness-title ${v.valid ? 'ready' : 'warning'}"><span>${v.valid ? '✓' : '!'}</span>${v.valid ? 'Ready for launch' : 'Review vehicle design'}</div><p>${v.warnings.length ? escape(v.warnings[0]) : 'Two launch stages. A command capsule. Enough reserve to begin the mission.'}</p><div class="mass-bar"><i style="width:${v.propellantMass / v.wetMass * 100}%"></i></div><div class="legend-line"><span>Launch propellant</span><span>${fmt(v.propellantMass / v.wetMass * 100, 1)}%</span></div>`; return; }
  const dock = state.flight?.kind === 'docking';
  if (dock) { $('instrument-values').innerHTML = dataValue('range-value', 'Port range', '—', 'm') + dataValue('closing-value', 'Closing speed', '—', 'm/s') + dataValue('offset-value', 'Lateral offset', '—', 'm') + `<div class="attitude-readout"><span class="instrument-name">Attitude error</span><div><span>Pitch <b id="pitch-value">—</b>°</span><span>Yaw <b id="yaw-value">—</b>°</span><span>Roll <b id="roll-value">—</b>°</span></div></div>` + dataValue('fuel-value', 'RCS propellant', '—', 'kg'); $('readiness').innerHTML = `<div id="capture-label" class="readiness-title"><span>⊕</span>Align for capture</div><p id="capture-detail">Closing ≤ 0.15 m/s · offset ≤ 0.35 m · attitude ≤ 5° · rotation ≤ 1°/s</p><div class="fuel-track"><i id="fuel-track-fill"></i></div>`; }
  else { $('instrument-values').innerHTML = dataValue('altitude-value', 'Altitude', '—', 'km') + dataValue('speed-value', 'Inertial speed', '—', 'km/s') + `<div class="orbit-readout"><span><small>Apoapsis</small><b id="apo-value">—</b><em> km</em></span><span><small>Periapsis</small><b id="peri-value">—</b><em> km</em></span></div>` + dataValue('load-value', 'Acceleration load', '—', 'g') + dataValue('q-value', 'Dynamic pressure', '—', 'kPa'); $('readiness').innerHTML = `<div id="flight-status-label" class="readiness-title"><span>↑</span>Awaiting ignition</div><p id="flight-status-detail">Guidance controls thrust direction. Stage separation stays with you.</p><div class="fuel-track"><i id="fuel-track-fill"></i></div><div class="legend-line"><span id="active-stage-name">Core propellant</span><span id="fuel-percent">100%</span></div>`; }
}
function renderPlan() {
  const landing = state.flight?.kind === 'landing', docking = state.flight?.kind === 'docking';
  const check = (id, label, limit) => `<div id="practice-check-${id}" data-state="pending"><dt>${label}<small>${limit}</small></dt><dd id="practice-check-value-${id}">—</dd></div>`;
  setText('plan-label', 'Exercise goal');
  setText('flight-heading', landing ? `Touch down on ${destination().name}.` : docking ? 'Make a soft capture.' : 'Reach a bound Earth orbit.');
  $('flight-plan').innerHTML = landing
    ? `<dl class="practice-checks">${check('vertical', 'Vertical speed', '≤ 2 m/s at contact')}${check('lateral', 'Lateral speed', '≤ 1.5 m/s at contact')}${check('offset', 'Landing zone', 'Within ±25 m')}${check('attitude', 'Tilt', '≤ 8° from upright')}${check('rotation', 'Rotation', '≤ 3°/s')}</dl><p class="model-note">Separate terminal descent. Standard training lander; transfer skipped. These are game contact limits.</p>`
    : docking
      ? `<dl class="practice-checks">${check('closing', 'Closing speed', '≤ 0.15 m/s at capture')}${check('speed', 'Total relative speed', '≤ 0.2 m/s at capture')}${check('offset', 'Port alignment', '≤ 0.35 m lateral')}${check('attitude', 'Attitude error', '≤ 5°')}${check('rotation', 'Rotation', '≤ 1°/s')}</dl><p class="model-note">Separate terminal approach near a station. Full rendezvous is skipped. RCS and attitude hold use finite propellant.</p>`
      : `<dl class="practice-checks">${check('liftoff', 'Liftoff', 'Positive ascent from Earth')}${check('core', 'Core separation', 'Release the first stage')}${check('orbit', 'Bound orbit', 'Periapsis above 150 km')}${check('spacecraft', 'Spacecraft release', 'Separate the upper stage')}</dl><p class="model-note">This exercise ends in Earth orbit. The optional docking handoff loads a separate terminal approach.</p>`;
  const controls = landing
    ? [['W / S', 'Increase / decrease engine power'], ['A / D or ← / →', 'Tilt left / right'], ['Space', 'Cut engine'], ['B', 'Toggle powered upright hold']]
    : docking
      ? [['W / S', 'Approach / retreat'], ['A / D', 'Translate left / right'], ['R / F', 'Translate up / down'], ['↑ / ↓ / ← / →', 'Pitch / yaw'], ['Q / E', 'Roll left / right'], ['Space', 'Hold powered brake'], ['Shift', 'Fine RCS, 20% thrust'], ['B', 'Toggle powered attitude hold']]
      : [['W / S', 'Increase / decrease throttle ceiling'], ['A / D', 'Pitch trim; manual pitch with guidance off'], ['Space', 'Separate active stage'], ['G', 'Toggle ascent guidance']];
  $('practice-panel-controls').innerHTML = `<p class="practice-control-note">${landing ? 'Landing assist controls engine and attitude. Upright hold controls attitude only. Both spend propellant.' : docking ? 'RCS translates in body axes. The spacecraft nose is −Z. Changing camera never changes thrust or attitude.' : 'Guidance controls thrust direction. You control the engine ceiling and stage separation.'}</p><dl class="practice-key-list">${controls.map(([key, text]) => `<div><dt><kbd>${key}</kbd></dt><dd>${text}</dd></div>`).join('')}</dl><p class="practice-control-note">Hold the on-screen controls to fire. Esc pauses. All held inputs release on pause or when leaving the game.</p>${landing ? '<p id="hover-hint" class="practice-control-note"></p>' : ''}<button class="quiet-button full-width" id="practice-open-guide">Full flight guide</button>`;
  $('practice-open-guide').onclick = () => { const wasPaused = detailsWasPaused; detailsWasPaused = true; $('practice-details').close(); openGuide(); guideWasPaused = wasPaused; };
}

function syncDockingHoldPlacement() {
  if (state.phase !== 'docking') return;
  const hold = $('hold-button');
  if (!hold) return;
  if (window.matchMedia('(max-width: 650px), (max-height: 600px) and (max-width: 980px)').matches) document.querySelector('#touch-controls .touch-tabs').append(hold);
  else document.querySelector('.docking-command .button-column')?.prepend(hold);
}
function renderCommand() {
  // Replacing a held control must release its input before its DOM is removed.
  clearInputs();
  $('touch-controls').querySelector('#hold-button')?.remove();
  if (state.phase === 'assembly' && state.preview) {
    const d = destination();
    $('command-deck').innerHTML = `<div class="command-intro"><h2>${escape(d.name)} landing practice</h2><p>Standard lander. Terminal descent; transfer skipped.</p></div><div class="button-column"><button id="start-landing" class="primary-button">Start landing</button><button id="choose-world" class="quiet-button">Change destination</button></div>`;
    $('start-landing').onclick = () => beginLanding(true); $('choose-world').onclick = openDestinations; return;
  }
  if (state.phase === 'landed') {
    $('command-deck').innerHTML = `<div class="result-copy"><h2>Touchdown confirmed</h2></div><div class="button-column"><button id="land-again" class="primary-button">Repeat landing</button><button id="new-world" class="quiet-button">Change destination</button></div>`;
    $('land-again').onclick = () => beginLanding(state.landingAssist); $('new-world').onclick = openLandingChooser; return;
  }
  if (state.phase === 'landing') {
    $('command-deck').innerHTML = `<div class="landing-command"><div class="throttle-label"><label for="throttle">${state.landingAssist ? 'Engine ceiling' : 'Descent engine'} <strong id="throttle-label">${Math.round(state.throttle * 100)}%</strong></label><input id="throttle" type="range" min="0" max="100" step="1" value="${Math.round(state.throttle * 100)}" aria-label="${state.landingAssist ? 'Engine ceiling' : 'Descent engine'}"></div><div class="landing-controls"><button id="landing-assist-button" class="landing-assist-toggle toggle-button ${state.landingAssist ? 'on' : ''}" aria-pressed="${state.landingAssist}">Landing assist <span>${state.landingAssist ? 'On' : 'Off'}</span></button><button id="hold-button" class="toggle-button ${state.holdAttitude ? 'on' : ''}" aria-pressed="${state.holdAttitude}">Upright hold <span>${state.holdAttitude ? 'On' : 'Off'}</span></button><div class="button-row" role="group" aria-label="Manual tilt"><button id="turn-left" class="secondary-button" data-control="left"><span aria-hidden="true">←</span> Tilt left</button><button id="turn-right" class="secondary-button" data-control="right">Tilt right <span aria-hidden="true">→</span></button></div><button id="engine-cut" class="quiet-button">Cut engine</button></div></div>`;
    $('landing-assist-button').onclick = () => { state.landingAssist = !state.landingAssist; if(state.landingAssist) state.throttle = 1; renderCommand(); notify(state.landingAssist ? 'Landing assist on. Engine and attitude jets spend propellant.' : 'Manual landing. Counter-thrust cancels drift.'); };
    $('throttle').oninput = e => { state.throttle = Number(e.target.value) / 100; setText('throttle-label', `${e.target.value}%`); };
    $('hold-button').onclick = () => { state.holdAttitude = !state.holdAttitude; renderCommand(); };
    bindHold($('turn-left'), 'left'); bindHold($('turn-right'), 'right');
    $('engine-cut').onclick = () => { state.throttle = 0; renderCommand(); }; return;
  }
  if (state.phase === 'assembly') {
    const v = evaluateVehicle(state.config);
    $('command-deck').innerHTML = `<div class="command-intro"><h2>Ready for ascent?</h2><p>Fly to Earth orbit with manual staging.</p></div><button id="launch-button" class="primary-button launch-button" ${v.valid && renderer ? '' : 'disabled'}>${icon('rocket')}<span>Start Earth launch</span></button>`;
    $('launch-button').onclick = beginLaunch; return;
  }
  if (state.phase === 'failed') {
    $('command-deck').innerHTML = `<div class="result-copy"><h2>Flight ended</h2></div><div class="button-column"><button class="primary-button" id="retry-button">Restore checkpoint</button><button class="quiet-button" id="redesign-button">Vehicle setup</button></div>`;
    $('retry-button').onclick = restore; $('redesign-button').onclick = assemble; return;
  }
  if (state.phase === 'orbit') {
    const t = getLaunchTelemetry(state.flight);
    $('command-deck').innerHTML = `<div class="result-copy"><h2>Earth orbit confirmed</h2><p>${km(t.periapsis)} × ${km(t.apoapsis)} km</p></div><button id="orbit-action" class="primary-button">${t.canDock ? 'Start docking practice' : 'Release upper stage'}</button>`;
    $('orbit-action').onclick = t.canDock ? () => beginDocking(false) : stage; return;
  }
  if (state.phase === 'docked') {
    $('command-deck').innerHTML = `<div class="result-copy"><h2>Soft capture confirmed</h2></div><div class="button-column"><button id="dock-again" class="primary-button">Repeat docking</button><button id="fly-again" class="quiet-button">Vehicle setup</button></div>`;
    $('fly-again').onclick = assemble; $('dock-again').onclick = () => beginDocking(true); return;
  }
  if (state.phase === 'launch') {
    $('command-deck').innerHTML = `<div class="ascent-controls"><div class="throttle-label"><label for="throttle">Engine ceiling <strong id="throttle-label">${Math.round(state.throttle * 100)}%</strong></label><input id="throttle" type="range" min="0" max="100" value="${Math.round(state.throttle * 100)}" step="1" aria-label="Engine ceiling"></div><div class="assist-controls"><button id="guidance-button" class="toggle-button ${state.guidance ? 'on' : ''}" aria-pressed="${state.guidance}"><span class="toggle-indicator"></span>Guidance ${state.guidance ? 'on' : 'off'}</button><div class="ascent-pitch-controls" role="group" aria-label="Pitch controls"><button id="ascent-pitch-left" class="secondary-button" data-control="left">← Pitch</button><button id="ascent-pitch-right" class="secondary-button" data-control="right">Pitch →</button></div></div></div><div class="stage-control"><div><span id="stage-label">Active launch stage</span><p id="stage-action-hint">Separate when empty.</p><p id="stage-burn-estimate" class="ascent-burn-estimate"></p></div><button id="stage-button" class="secondary-button">${icon('stage')} Separate stage</button></div>`;
    $('throttle').oninput = e => { state.throttle = Number(e.target.value) / 100; setText('throttle-label', `${e.target.value}%`); };
    $('guidance-button').onclick = toggleGuidance;
    $('stage-button').onclick = stage; bindHold($('ascent-pitch-left'),'left'); bindHold($('ascent-pitch-right'),'right'); return;
  }
  $('command-deck').innerHTML = `<div class="docking-command"><span class="rcs-power-note">RCS uses propellant</span><div class="button-column"><button id="hold-button" class="toggle-button ${state.holdAttitude ? 'on' : ''}" aria-pressed="${state.holdAttitude}"><span class="toggle-indicator"></span><span class="hold-long-label">Attitude </span>hold ${state.holdAttitude ? 'on' : 'off'}</button><button id="brake-button" class="secondary-button" data-control="brake">Hold to brake</button></div></div>`;
  $('hold-button').setAttribute('aria-label', 'Powered attitude hold ' + (state.holdAttitude ? 'on' : 'off'));
  $('hold-button').onclick = () => { state.holdAttitude = !state.holdAttitude; renderCommand(); }; bindHold($('brake-button'), 'brake'); syncDockingHoldPlacement();
}
function toggleGuidance() { state.guidance = !state.guidance; renderCommand(); }

function syncDockingCameraViews() {
  const docking = state.flight?.kind === 'docking';
  $('docking-feed-effect').hidden = !docking || state.cameraMode !== 'port' || Boolean(renderer?.inspection);
  $('docking-camera-controls').hidden = !docking;
  if (!docking) return;
  if (!Object.hasOwn(DOCKING_CAMERA_VIEWS, state.cameraMode)) state.cameraMode = 'chase';
  const view = DOCKING_CAMERA_VIEWS[state.cameraMode];
  for (const button of document.querySelectorAll('[data-docking-view]')) {
    const selected = !renderer?.inspection && button.dataset.dockingView === state.cameraMode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  setText('docking-camera-guidance', renderer?.inspection ? 'Scene inspection. Select a camera or reset the view to return.' : view.hint);
  setText('view-caption', renderer?.inspection ? 'Scene inspection' : `Manual docking / ${view.label}`);
  setText('view-hint', state.cameraMode === 'chase' ? 'Drag to orbit / scroll to zoom / RCS stays in body axes' : 'W / S translate along the nose / arrows rotate the spacecraft');
}
function selectDockingCamera(mode) {
  if (state.flight?.kind !== 'docking' || !Object.hasOwn(DOCKING_CAMERA_VIEWS, mode)) return;
  clearInputs(); state.cameraMode = mode;
  renderer?.resetOrbit?.();
  syncDockingCameraViews();
}

function renderPhase() {
  modeHub?.setCurrent(state.flight?.kind === 'docking' ? 'manual-docking' : state.flight?.kind === 'landing' ? 'surface-landing' : 'earth-launch');
  syncOrbitView();
  const assembly = state.phase === 'assembly', docking = state.flight?.kind === 'docking', landing = state.flight?.kind === 'landing';
  syncPracticeLayout();
  $('assembly-library').hidden = !assembly || state.preview; $('flight-library').hidden = assembly;
  $('model-dimensions').hidden = !assembly || state.preview; $('flight-clock').hidden = assembly;
  $('docking-reticle').hidden = !docking || ['failed', 'docked'].includes(state.phase);
  $('landing-marker').hidden = !landing || state.phase !== 'landing'; $('descent-hud').hidden = assembly;
  $('pause-button').disabled = !activeFlight(); $('save-button').disabled = !activeFlight();
  $('practice-button').hidden = true; $('landing-practice').hidden = true;
  $('camera-button').hidden = !landing || state.phase !== 'landing';
  if (landing && !['chase', 'port'].includes(state.cameraMode)) state.cameraMode = 'chase'; $('touch-controls').hidden = state.phase !== 'docking';
  $('view-tabs').hidden = !assembly; $('countdown').hidden = state.countdown <= 0;
  $('paused-overlay').hidden = !state.paused || !activeFlight();
  $('paused-overlay').querySelector('h2').textContent = landing ? 'Ready for descent?' : 'Flight paused';
  $('paused-overlay').querySelector('div > p:not(.eyebrow)').textContent = landing ? 'Landing assist is ' + (state.landingAssist ? 'on.' : 'off. Set engine power before resuming.') : 'All held controls are released.';
  $('nav-assembly').className = assembly ? 'current' : '';
  $('nav-launch').className = !assembly && !docking && !landing ? 'current' : '';
  $('nav-docking').className = docking ? 'current' : '';
  $('nav-landing').className = landing ? 'current' : '';
  $('vehicle-view').classList.toggle('selected', !state.preview); $('vehicle-view').setAttribute('aria-pressed', !state.preview);
  $('destination-view').classList.toggle('selected', state.preview); $('destination-view').setAttribute('aria-pressed', state.preview);
  $('pause-button').innerHTML = icon(state.paused ? 'play' : 'pause') + `<span class="kc-sr">${state.paused ? 'Resume' : 'Pause'}</span>`;
  $('pause-button').setAttribute('aria-label', state.paused ? 'Resume simulation' : 'Pause simulation');
  setText('camera-button', state.cameraMode === 'port' ? 'External camera' : 'Descent camera');
  setText('view-caption', assembly ? state.preview ? destination().name : 'Vehicle assembly bay' : landing ? `${destination().name} terminal descent` : docking ? 'Terminal docking scenario' : 'Earth ascent');
  setText('instrument-label', assembly ? state.preview ? 'Destination facts' : 'Design performance' : landing ? 'Descent instruments' : docking ? 'Relative navigation' : 'Flight instruments');
  setText('simulation-status', assembly ? state.preview ? 'Survey' : 'Vehicle design' : state.paused ? 'Paused' : state.phase === 'failed' ? 'Flight ended' : state.phase === 'orbit' ? 'Orbit confirmed' : state.phase === 'docked' ? 'Captured' : state.phase === 'landed' ? 'Landed' : landing ? 'Descent' : docking ? 'Approach' : 'Ascent');
  if (assembly) setText('practice-next-action', state.preview ? 'Choose a destination for a separate landing exercise.' : 'Choose hardware, then fly to Earth orbit.');
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

function bindHold(button, control) {
  const press = () => { if (state.paused || !activeFlight()) return; touch.add(control); button.classList.add('firing'); };
  const release = () => { touch.delete(control); button.classList.remove('firing'); };
  const holdKey = event => event.code === 'Space' || event.code === 'Enter' || event.key === ' ' || event.key === 'Enter';
  button.addEventListener('pointerdown', event => { event.preventDefault(); if (state.paused) return; button.setPointerCapture(event.pointerId); press(); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) button.addEventListener(event, release);
  button.addEventListener('keydown', event => { if (!holdKey(event)) return; event.preventDefault(); event.stopPropagation(); if (!event.repeat) press(); });
  // Let the global keyup handler also release any keyboard flight input.
  button.addEventListener('keyup', event => { if (!holdKey(event)) return; event.preventDefault(); release(); });
}

let touchMode = 'translate';
function renderTouch() {
  $('touch-fine').setAttribute('aria-pressed', String(state.fine)); $('touch-fine').classList.toggle('selected', state.fine);
  for (const [name, mode] of [['translation', 'translate'], ['rotation', 'rotate']]) { $('touch-' + name).setAttribute('aria-pressed', String(touchMode === mode)); $('touch-' + name).classList.toggle('selected', touchMode === mode); }
  const groups = touchMode === 'translate'
    ? [[['left', '←', 'Left'], ['right', '→', 'Right'], ['up', '↑', 'Up'], ['down', '↓', 'Down']], [['approach', '↑', 'Approach'], ['retreat', '↓', 'Back'], ['brake', '■', 'Brake']]]
    : [[['pitchUp', '↑', 'Pitch +'], ['pitchDown', '↓', 'Pitch −'], ['yawLeft', '←', 'Yaw −'], ['yawRight', '→', 'Yaw +']], [['rollLeft', '↶', 'Roll −'], ['rollRight', '↷', 'Roll +'], ['brake', '■', 'Brake']]];
  $('touch-pad').innerHTML = groups.map((controls, i) => `<div class="rcs-thumb-group" role="group" aria-label="${i === 0 ? touchMode === 'translate' ? 'Lateral and vertical translation' : 'Pitch and yaw' : touchMode === 'translate' ? 'Approach and brake' : 'Roll'}">${controls.map(([control, direction, name]) => `<button data-control="${control}" aria-label="Hold to ${name.toLowerCase()}"><span class="control-direction" aria-hidden="true">${direction}</span><span>${name}</span></button>`).join('')}</div>`).join('');
  $('touch-pad').querySelectorAll('button').forEach(button => bindHold(button, button.dataset.control));
}
$('touch-translation').onclick = () => { clearInputs(); touchMode = 'translate'; $('touch-translation').classList.add('selected'); $('touch-rotation').classList.remove('selected'); renderTouch(); };
$('touch-rotation').onclick = () => { clearInputs(); touchMode = 'rotate'; $('touch-rotation').classList.add('selected'); $('touch-translation').classList.remove('selected'); renderTouch(); };
$('touch-fine').onclick=()=>{clearInputs();state.fine=!state.fine;renderTouch();};
const held = (key, control) => keys.has(key) || (control && touch.has(control));
function dockingInput() { const fine = keys.has('Shift') || state.fine ? 0.2 : 1; return { x: (Number(held('KeyD', 'right')) - Number(held('KeyA', 'left'))) * fine, y: (Number(held('KeyR', 'up')) - Number(held('KeyF', 'down'))) * fine, z: (Number(held('KeyW', 'approach')) - Number(held('KeyS', 'retreat'))) * fine, pitch: (Number(held('ArrowUp', 'pitchUp')) - Number(held('ArrowDown', 'pitchDown'))) * fine, yaw: (Number(held('ArrowLeft', 'yawLeft')) - Number(held('ArrowRight', 'yawRight'))) * fine, roll: (Number(held('KeyQ', 'rollLeft')) - Number(held('KeyE', 'rollRight'))) * fine, holdAttitude: state.holdAttitude, brake: held('Space', 'brake') }; }
function simulate(dt) {
  if (!activeFlight() || state.paused || state.countdown > 0) return;
  if (state.phase === 'launch' || state.phase === 'orbit') { const throttleInput = Number(keys.has('KeyW')) - Number(keys.has('KeyS')); state.throttle = state.phase==='orbit'?0:clamp(state.throttle + throttleInput * dt * 0.1, 0, 1); const advance = advanceToStageBoundary(state.flight, { throttle: state.throttle, guidance: state.guidance, pitchTrim: Number(held('KeyD','right') || keys.has('ArrowRight')) - Number(held('KeyA','left') || keys.has('ArrowLeft')) }, dt); if (advance.held) { pause(true); renderCommand(); updateUI(); log('Stage propellant depleted. Flight held for manual stage release.'); save(true); notify('Stage empty. Select the red Separate stage action to continue.'); } }
  else if (state.phase === 'landing') {
    const throttleInput = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    state.throttle = clamp(state.throttle + throttleInput * dt * .25, 0, 1);
    const turn = Number(held('KeyD','right') || keys.has('ArrowRight')) - Number(held('KeyA','left') || keys.has('ArrowLeft'));
    stepLanding(state.flight, state.landingAssist ? landingAssistInput(state.flight, state.throttle, turn) : { throttle: state.throttle, turn, holdAttitude: state.holdAttitude }, dt);
  } else stepDocking(state.flight, dockingInput(), dt);
  if (state.flight.event !== lastEvent) log(state.flight.event);
  if (state.flight.phase === 'failed') { state.phase = 'failed'; state.paused = false; clearInputs(); renderPhase(); }
  else if (state.flight.phase === 'orbit' && state.phase === 'launch') { state.phase = 'orbit'; emitMilestone('earth-orbit'); state.throttle = 0; clearInputs(); renderPhase(); save(true); }
  else if (state.flight.phase === 'landed') { state.phase = 'landed'; emitMilestone('surface-' + state.destination); clearInputs(); renderPhase(); }
  else if (state.flight.phase === 'docked') {
    state.phase='docked';state.cameraMode='chase';state.dockedRevealUntil=performance.now()+2200;renderer?.resetOrbit?.(true);
    emitMilestone('docking-capture');clearInputs();renderPhase();
    const capturedFlight=state.flight;
    setTimeout(()=>{if(state.flight===capturedFlight&&state.phase==='docked'&&!state.outcomeDismissed)renderOutcome();},2250);
  }
}
function syncSceneInspection() {
  const inspecting = Boolean(renderer?.inspection);
  if(inspecting&&state.phase==='docked'&&!state.outcomeDismissed){state.outcomeDismissed=true;renderOutcome();}
  $('scene-inspection').hidden = !inspecting || state.phase === 'assembly';
  $('viewport').dataset.inspection = String(inspecting);
  if (state.flight?.kind === 'docking') syncDockingCameraViews();
}
function updateUI() {
  syncSceneInspection();
  const timeControl = $('open-time-controls');
  if (timeControl) { const policy = getFlightTimePolicy(state.flight, state.warp, { guidance: state.guidance }); timeControl.querySelector('.kc-tool-label').textContent = `Time ${policy.applied}×`; timeControl.setAttribute('aria-label', `Time controls. Applied rate ${policy.applied} times`); timeControl.title=`Time · ${policy.applied}×`; }
  if (state.flight?.kind !== 'launch') { gameShell.dataset.stageHold = 'false'; $('resume-button').classList.remove('stage-hold-action'); setText('resume-button', 'Resume flight'); ascentReadouts?.update(null); }
  if (!state.flight) return;
  setText('clock-value', `T+ ${clock(state.flight.time)}`);
  if (state.flight.kind === 'landing') {
    const t = getLandingTelemetry(state.flight);
    setPrimaryTelemetry(['Altitude', 'Vertical speed', 'Pad offset'], [`${fmt(t.altitude, 1)} m`, `${fmt(t.verticalSpeed, 2)} m/s`, `${fmt(t.offset, 1)} m`]);
    setText('practice-next-action', state.phase === 'landed' ? 'Touchdown confirmed within the landing limits.' : state.phase === 'failed' ? state.flight.failure : 'Land inside ±25 m at ≤ 2 m/s vertical speed.');
    setPracticeCheck('vertical', Math.abs(t.verticalSpeed) <= 2, `${fmt(Math.abs(t.verticalSpeed), 2)} m/s`);
    setPracticeCheck('lateral', Math.abs(t.horizontalSpeed) <= 1.5, `${fmt(Math.abs(t.horizontalSpeed), 2)} m/s`);
    setPracticeCheck('offset', Math.abs(t.offset) <= 25, `${fmt(Math.abs(t.offset), 1)} m`);
    setPracticeCheck('attitude', Math.abs(t.angleDegrees) <= 8, `${fmt(Math.abs(t.angleDegrees), 1)}°`);
    setPracticeCheck('rotation', t.angularSpeedDegrees <= 3, `${fmt(t.angularSpeedDegrees, 1)}°/s`);
    $('descent-hud').children[1].classList.toggle('warning', t.altitude < 80 && Math.abs(t.verticalSpeed) > 2);
    $('descent-hud').children[2].classList.toggle('warning', t.altitude < 80 && Math.abs(t.offset) > 25);
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
  if (state.flight.kind === 'launch') { const t = getLaunchTelemetry(state.flight);
    setPrimaryTelemetry(['Altitude', 'Speed', state.phase === 'orbit' ? 'Periapsis' : 'Stage fuel'], [`${km(t.altitude)} km`, `${fmt(t.speed / 1000, 2)} km/s`, state.phase === 'orbit' ? Number.isFinite(t.periapsis) ? `${km(t.periapsis)} km` : 'Escape' : t.fuelFraction > 0 && t.fuelFraction < .01 ? '<1%' : `${fmt(t.fuelFraction * 100)}%`]);
    const guide = getAscentGuidance(state.flight, t, { countdown: state.countdown, guidance: state.guidance, paused: state.paused });
    setText('practice-next-action', guide.next);
    gameShell.dataset.stageHold = String(guide.stageRequired);
    $('resume-button').classList.toggle('stage-hold-action', guide.stageRequired);
    setText('resume-button', guide.stageRequired ? 'Separate stage' : 'Resume flight');
    if (guide.stageRequired) { $('paused-overlay').querySelector('h2').textContent = 'Stage empty'; $('paused-overlay').querySelector('div > p:not(.eyebrow)').textContent = 'Flight held. Release the empty stage to ignite the next engine.'; }
    setText('stage-burn-estimate', guide.burnSeconds === null ? 'Engine off' : guide.stageRequired ? 'Engine off · awaiting your release' : `~${fmt(guide.burnSeconds, 0)} s estimated at current thrust`);
    ascentReadouts?.update(state.flight, t, { countdown: state.countdown, guidance: state.guidance, paused: state.paused });
    setPracticeCheck('liftoff', state.flight.liftoff, state.flight.liftoff ? 'Confirmed' : 'Awaiting ignition');
    setPracticeCheck('core', t.stageIndex >= 1, t.stageIndex >= 1 ? 'Released' : 'Attached');
    setPracticeCheck('orbit', state.flight.phase === 'orbit', state.flight.phase === 'orbit' ? 'Confirmed' : `${km(t.periapsis)} km periapsis`);
    setPracticeCheck('spacecraft', t.stageIndex >= 2, t.stageIndex >= 2 ? 'Released' : 'Attached');
    setText('altitude-value', km(t.altitude)); setText('speed-value', fmt(t.speed / 1000, 2)); setText('apo-value', km(t.apoapsis)); setText('peri-value', km(t.periapsis)); setText('load-value', fmt(t.loadG, 2)); setText('q-value', fmt(t.dynamicPressure / 1000, 1)); setText('active-stage-name', t.stageName); setText('fuel-percent', t.fuelFraction > 0 && t.fuelFraction < .01 ? '<1%' : `${fmt(t.fuelFraction * 100)}%`); if ($('fuel-track-fill')) $('fuel-track-fill').style.width = `${t.fuelFraction * 100}%`; setText('stage-label', t.stageIndex < 2 ? `${t.stageIndex + 1} / 2 · ${t.stageName}` : 'Launch stages released'); setText('stage-action-hint', guide.stageRequired ? 'Propellant depleted. Separate now.' : `${fmt(t.fuel / 1000, 1)} t in this stage${t.stageReady ? ' · almost empty' : ''}`); if ($('stage-button')) { $('stage-button').classList.toggle('stage-ready', guide.stageRequired); $('stage-button').disabled = state.countdown > 0 || !state.flight.liftoff || t.stageIndex >= 2; } setText('throttle-label', `${Math.round(state.throttle * 100)}%`); if ($('throttle') && document.activeElement !== $('throttle')) $('throttle').value = Math.round(state.throttle * 100); setText('flight-status-label', guide.stageRequired ? 'Stage depletion confirmed' : state.phase === 'orbit' ? 'Bound orbit confirmed' : state.countdown > 0 ? 'Ignition sequence armed' : t.altitude < 100000 ? 'Atmospheric ascent' : 'Orbital insertion burn'); setText('flight-status-detail', guide.stageRequired ? 'Jettison the depleted stage to continue the mission.' : state.phase === 'orbit' ? (t.canDock ? 'Launch stages released. Terminal scenario is ready.' : 'Periapsis is above 150 km. Release the upper stage.') : `Vertical speed ${fmt(t.verticalSpeed)} m/s · pitch ${fmt(t.pitchDegrees, 1)}°`); }
  else { const t = getDockingTelemetry(state.flight);
    setPrimaryTelemetry(['Port range', 'Closing speed', 'Lateral offset'], [`${fmt(t.range, 1)} m`, `${t.closingSpeed > 0 ? '+' : ''}${fmt(t.closingSpeed, 2)} m/s`, `${fmt(t.lateralOffset, 2)} m`]);
    const attitudeLimit = state.flight.capture.angle * 180 / Math.PI;
    setText('practice-next-action', state.phase === 'docked' ? 'Soft capture confirmed. Vehicle secured.' : state.phase === 'failed' ? state.flight.failure : t.fuel <= 0 ? 'RCS depleted. Restore a checkpoint to retry.' : t.range < 20 && t.closingSpeed > state.flight.capture.closingSpeed ? 'Hold brake. Contact must be below 0.15 m/s.' : t.lateralOffset > state.flight.capture.lateral ? 'Cancel lateral drift and align the two ports.' : t.angleDegrees > attitudeLimit ? 'Rotate to align the docking axes.' : 'Approach gently. Brake before contact.');
    setPracticeCheck('closing', Math.abs(t.closingSpeed) <= state.flight.capture.closingSpeed, `${fmt(Math.abs(t.closingSpeed), 2)} m/s`);
    setPracticeCheck('speed', t.relativeSpeed <= state.flight.capture.speed, `${fmt(t.relativeSpeed, 2)} m/s`);
    setPracticeCheck('offset', t.lateralOffset <= state.flight.capture.lateral, `${fmt(t.lateralOffset, 2)} m`);
    setPracticeCheck('attitude', t.angleDegrees <= attitudeLimit, `${fmt(t.angleDegrees, 1)}°`);
    setPracticeCheck('rotation', t.angularSpeed <= state.flight.capture.angularSpeed, `${fmt(t.angularSpeedDegrees, 1)}°/s`);
    $('descent-hud').children[1].classList.toggle('warning', t.range < 20 && t.closingSpeed > 0.15);
    $('descent-hud').children[2].classList.toggle('warning', t.range < 10 && t.lateralOffset > 0.35);
    setText('range-value', fmt(t.range, 1)); setText('closing-value', `${t.closingSpeed > 0 ? '+' : ''}${fmt(t.closingSpeed, 2)}`); setText('offset-value', fmt(t.lateralOffset, 2)); setText('pitch-value', fmt(t.pitchDegrees, 1)); setText('yaw-value', fmt(t.yawDegrees, 1)); setText('roll-value', fmt(t.rollDegrees, 1)); setText('fuel-value', fmt(t.fuel, 1)); if ($('fuel-track-fill')) $('fuel-track-fill').style.width = `${t.fuelFraction * 100}%`; if ($('capture-label')) { setText('capture-label', t.captureReady ? 'Capture conditions aligned' : t.fuel <= 0 ? 'RCS propellant depleted' : 'Align for capture'); $('capture-label').classList.toggle('ready', t.captureReady); } $('closing-value')?.parentElement.classList.toggle('warning', t.range < 20 && t.closingSpeed > 0.15); const dot = $('alignment-dot'); dot.style.transform = `translate(${clamp(t.offsetX * 14, -65, 65)}px,${clamp(-t.offsetY * 14, -65, 65)}px)`; dot.classList.toggle('aligned', t.lateralOffset < 0.35); }
}

function renderFrame(now) {
  requestAnimationFrame(renderFrame);
  const realDt = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now;
  if (state.countdown > 0 && !state.paused) { state.countdown = Math.max(0, state.countdown - realDt); $('countdown').hidden = state.countdown <= 0; setText('countdown-number', Math.ceil(state.countdown)); }
  if (activeFlight() && !state.paused && state.countdown <= 0) { accumulator += realDt * (getFlightTimePolicy(state.flight, state.warp, { guidance: state.guidance }).applied); let safety = 0; while (accumulator >= 1 / 60 && safety++ < 120) { simulate(1 / 60); if (!activeFlight() || state.paused) { accumulator = 0; break; } accumulator -= 1 / 60; } }
  // Covered scenes have their own renderer. Avoid drawing an invisible second
  // WebGL scene; physics stepping and the real-time clock remain unchanged.
  const mainSceneCovered = Boolean(document.querySelector('.mode-hub-dialog[open], .mission-control[open], .rocket-workshop[open], .rollout[open], .solar-explorer:not([hidden]), .earth-online:not([hidden]), .site-biography:not([hidden]), #practice-details[open], #practice-time[open], #guide-dialog[open], #destination-dialog[open], #landing-chooser[open]'));
  if (renderer && !earthViewOpen && !mainSceneCovered) {
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
  if (e.code === 'Escape') { if (!document.querySelector('dialog[open]') && !e.repeat) { e.preventDefault(); pause(); } return; }
  if (!activeFlight() || document.querySelector('dialog[open]') || e.target.closest?.('button, input, select, textarea, summary, a, [role="button"], [contenteditable="true"]')) return;
  if (controlledCodes.has(e.code)) { e.preventDefault(); if (state.paused) { if (e.code === 'Space' && !e.repeat && state.flight?.kind === 'launch' && needsStageRelease(state.flight)) stage(); return; } if (e.code.startsWith('Shift')) keys.add('Shift'); else keys.add(e.code); }
  if (e.repeat) return;
  if (e.code === 'Space' && state.phase === 'launch') stage();
  if (e.code === 'KeyG' && state.phase === 'launch') toggleGuidance();
  if (e.code === 'Space' && state.phase === 'landing') { state.throttle = 0; renderCommand(); }
  if (e.code === 'KeyB' && ['docking', 'landing'].includes(state.phase)) { state.holdAttitude = !state.holdAttitude; renderCommand(); }
});
window.addEventListener('keyup', e => { keys.delete(e.code); if (e.code.startsWith('Shift')) keys.delete('Shift'); });
document.addEventListener('click', e => { if (e.target.closest?.('#command-deck, #touch-controls, #docking-camera-controls') && !e.target.closest('input, select') && !document.querySelector('dialog[open]')) focusFlightView(); });
document.addEventListener('focusin', e => { if (e.target.closest?.('button, input, select, textarea, summary, a, [contenteditable="true"]')) clearInputs(); });
window.addEventListener('blur', () => { practiceCameraReturn=null;clearInputs(); pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { practiceCameraReturn=null;clearInputs(); pause(true); } });
$('inspection-reset').onclick = () => { clearInputs(); renderer?.resetOrbit?.(); syncSceneInspection(); };
$('home-button').onclick = () => document.dispatchEvent(new CustomEvent('kc:show-home'));
$('pause-button').onclick = () => pause(); $('resume-button').onclick = () => { if (state.flight?.kind === 'launch' && needsStageRelease(state.flight)) stage(); else pause(false); focusFlightView(); }; $('save-button').onclick = () => save(); $('restore-button').onclick = restore;
$('return-builder').onclick = () => { if ($('practice-details').open) $('practice-details').close(); confirm('Return to assembly?', 'Your last checkpoint stays available. The active flight will end.', assemble, 'Return to assembly'); };
$('practice-button').onclick = () => { if (renderer) beginDocking(true); };
$('landing-practice').onclick = openLandingChooser;
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
let guideWasPaused = false, guidePreviousFocus = null;
const guideTabs = ['moon', 'docking', 'landing', 'more'];
function selectGuideTab(name, scroll = false) {
  for (const tab of guideTabs) {
    const selected = tab === name;
    $('guide-tab-' + tab).setAttribute('aria-selected', String(selected));
    $('guide-tab-' + tab).tabIndex = selected ? 0 : -1;
    $('guide-panel-' + tab).hidden = !selected;
  }
  if (scroll && $('guide-dialog').open) {
    const scroller = document.querySelector('#guide-dialog .guide-scroll');
    const tabs = document.querySelector('#guide-dialog .field-guide-tabs');
    const panel = $('guide-panel-' + name);
    // The sticky tab bar is already in view after a deep lesson scroll.
    // Reveal the new panel through the actual scroll owner instead.
    const top = scroller.scrollTop + panel.getBoundingClientRect().top - scroller.getBoundingClientRect().top - tabs.offsetHeight - 24;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }
}
for (const name of guideTabs) $('guide-tab-' + name).onclick = () => selectGuideTab(name, true);
document.querySelector('.field-guide-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = guideTabs.findIndex(tab => $('guide-tab-' + tab) === document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? guideTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : guideTabs.length - 1)) % guideTabs.length;
  selectGuideTab(guideTabs[next], true); $('guide-tab-' + guideTabs[next]).focus({ preventScroll: true });
});
function refreshGuideActions() {
  const expeditionOpen = Boolean(document.querySelector('.mission-control[open]'));
  const expeditionFlying = Boolean(document.querySelector('.mission-control[open] .mc-flight:not([hidden])'));
  const practiceVisible = !document.querySelector('.mission-control[open], .rocket-workshop[open], .rollout[open], .solar-explorer:not([hidden]), .earth-online:not([hidden]), .site-biography:not([hidden])');
  const current = expeditionOpen ? 'moon-mission' : practiceVisible ? state.flight?.kind === 'docking' ? 'manual-docking' : state.flight?.kind === 'landing' ? 'surface-landing' : state.flight?.kind === 'launch' ? 'earth-launch' : null : null;
  const labels = { 'moon-mission': ['Prepare expedition', 'Return to expedition'], 'manual-docking': ['Start docking practice', 'Return to docking'], 'surface-landing': ['Start landing practice', 'Return to landing'], 'earth-launch': ['Start Earth launch practice', 'Return to Earth launch'] };
  for (const button of document.querySelectorAll('[data-guide-mode]')) {
    const id = button.dataset.guideMode, same = id === current;
    button.dataset.guideReturn = String(same);
    button.textContent = labels[id][Number(same)];
  }
  for (const node of document.querySelectorAll('[data-guide-next]')) {
    const id = node.dataset.guideNext;
    node.textContent = id === current
      ? 'Next: ' + (id === 'moon-mission' ? expeditionFlying ? document.querySelector('.mc-coach [data-next-title]')?.textContent || 'follow the next maneuver beneath the scene.' : 'choose a landing approach, then start the lunar mission.' : $('practice-next-action').textContent)
      : id === 'moon-mission' ? 'Next: choose a lunar landing approach.' : id === 'manual-docking' ? 'Next: align the ports before closing the range.' : 'Next: resume when the engine and assists are set.';
  }
  return current;
}
for (const button of document.querySelectorAll('[data-guide-mode]')) button.onclick = () => {
  if (button.dataset.guideReturn === 'true') { $('guide-dialog').close(); return; }
  // A deliberate new mode starts paused according to its own entry contract.
  guideWasPaused = true; guidePreviousFocus = null; $('guide-dialog').close();
  document.dispatchEvent(new CustomEvent('kc:open-mode', { detail: { id: button.dataset.guideMode } }));
};
function openGuide(model = false) {
  if ($('guide-dialog').open) return;
  guidePreviousFocus = document.activeElement;
  guideWasPaused = state.paused; clearInputs(); pause(true);
  const current = refreshGuideActions();
  selectGuideTab(model || current === 'earth-launch' ? 'more' : current === 'manual-docking' ? 'docking' : current === 'surface-landing' ? 'landing' : 'moon');
  if (!model && current === 'earth-launch') $('guide-earth-launch-detail').open = true;
  $('guide-dialog').showModal();
  document.querySelector('#guide-dialog .guide-scroll').scrollTop = 0;
  $('close-guide').focus({ preventScroll: true });
  if (model) { $('guide-model-detail').open = true; $('model-section').scrollIntoView({ block: 'start' }); }
}
$('guide-button').onclick = () => openGuide(false); $('model-button').onclick = () => openGuide(true); $('close-guide').onclick = () => $('guide-dialog').close();
$('guide-play').onclick = () => {
  clearInputs(); pause(true); guideWasPaused = true; guidePreviousFocus = null;
  $('guide-dialog').close(); document.dispatchEvent(new CustomEvent('kc:show-home'));
};
$('guide-dialog').addEventListener('close', () => {
  clearInputs(); pause(true);
  const target = guidePreviousFocus; guidePreviousFocus = null;
  const topDialog = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (target?.isConnected && (!topDialog || topDialog.contains(target))) target.focus({ preventScroll: true });
});


try { renderer = createScene($('flight-canvas'), { onAssetWarning: message => notify(message) }); } catch (error) { $('view-error').hidden = false; console.error('3D initialization failed:', error); }
$('flight-canvas').addEventListener('webglcontextlost', event => { event.preventDefault(); practiceCameraReturn=null;clearInputs(); pause(true); notify('Graphics context lost. Flight paused; your checkpoint is available.'); });
$('flight-canvas').addEventListener('webglcontextrestored', () => notify('Graphics restored. Resume the flight when ready.'));
renderPhase(); if (saved.error) notify(saved.error); else if (checkpoint) setText('checkpoint-label', 'Previous checkpoint available');
window.addEventListener('resize', () => { renderer?.resize(); syncDockingHoldPlacement(); });
const europaGuide=createEuropaGuide({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);}});
const navigation = installNavigation({state,selectDestination(id){state.destination=id;renderer?.setDestination(id);updateDestinationLabels();renderPhase();},resetCamera(){orbitOverview=false;syncOrbitView();renderer?.resetOrbit();},zoomCamera:factor=>renderer?.zoomBy(factor),inspectCamera:()=>renderer?.beginOrbit()});
ascentReadouts = installAscentReadouts({ scene: $('viewport'), tools: document.querySelector('.navigation-tools'), icon, onToggle: clearInputs });
const updateLandingDirector=installLandingDirector();
document.addEventListener('kc:pause-practice',()=>{practiceCameraReturn=!state.paused&&activeFlight()?state.flight:null;clearInputs();pause(true);});
navigation.cameraDialog.addEventListener('close',()=>{
  const resume=navigation.cameraDialog.returnValue==='selected'&&practiceCameraReturn===state.flight&&activeFlight()&&!needsStageRelease(state.flight);
  practiceCameraReturn=null;clearInputs();pause(!resume);focusFlightView();
});
installSiteMenu({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);}});
const rollout=createRollout({onOpen(){clearInputs();pause(true);},onClose(){clearInputs();pause(true);},onReady(){rolloutReady=true;beginLaunch();}});
const missionControl=createMissionControl({onOpen(){clearInputs();pause(true);modeHub?.setCurrent('moon-mission');},onClose(){clearInputs();pause(true);},onEditDesign(design){workshop.setDesign(design);workshop.open();}});
const workshop=createRocketWorkshop({onOpen(){clearInputs();pause(true);modeHub?.setCurrent('workshop');},onClose(){clearInputs();pause(true);},onStartFlight(design){missionControl.open(design);}});
const workshopButton=document.createElement('button');workshopButton.className='secondary-button';workshopButton.textContent='Build custom rocket';workshopButton.onclick=()=>workshop.open();document.querySelector('.navigation-tools').prepend(workshopButton);
let mapWasPaused=false;
navigation.dialog.addEventListener('close',()=>{clearInputs();pause(true);});
let solarWasPaused=false;
const solar=createSolarView({onOpen(){solarWasPaused=state.paused;clearInputs();pause(true);modeHub?.setCurrent('solar-system');},onClose(){clearInputs();pause(true);},onLanding(id){state.destination=id;renderer?.setDestination(id);updateDestinationLabels();beginLanding(true);}});
const solarButton=document.createElement('button');solarButton.className='primary-button';solarButton.textContent='Explore Solar System';solarButton.onclick=()=>solar.open();document.querySelector('.navigation-tools').prepend(solarButton);
const onlineEarth=createOnlineEarth({onOpen(){earthViewOpen=true;clearInputs();pause(true);modeHub?.setCurrent('online-earth');},onClose(){earthViewOpen=false;clearInputs();pause(true);}});
const earthButton=document.createElement('button');earthButton.className='secondary-button';earthButton.textContent='Earth / free flight';earthButton.onclick=()=>onlineEarth.open();document.querySelector('.navigation-tools').append(earthButton);
const localPause=document.createElement('button');localPause.className='quiet-button';localPause.textContent='Pause / resume';localPause.onclick=()=>pause();document.querySelector('.navigation-tools').append(localPause);
const localGuide=document.createElement('button');localGuide.className='quiet-button';localGuide.textContent='How to play';localGuide.onclick=()=>openGuide();document.querySelector('.navigation-tools').append(localGuide);
const orbitButton=document.createElement('button');orbitButton.id='orbit-overview-button';orbitButton.className='kc-tool';orbitButton.onclick=()=>{if(state.phase!=='orbit')return;orbitOverview=!orbitOverview;syncOrbitView();renderer?.resetOrbit();notify(orbitOverview?'Trajectory inspection: white spacecraft, amber stages, blue illustrative station reference. Use Return to spacecraft or Reset camera to leave.':'Spacecraft camera restored. Orbital motion continues.');};document.querySelector('.navigation-tools').append(orbitButton);syncOrbitView();
window.addEventListener('blur',()=>{mapWasPaused=guideWasPaused=solarWasPaused=detailsWasPaused=true;});
requestAnimationFrame(renderFrame);
try { if (typeof ResizeObserver === 'function') new ResizeObserver(() => renderer?.resize()).observe($('viewport')); } catch (error) { console.warn('Optional viewport observer unavailable:', error); }

// Optional developer hooks for deterministic game testing; no network access.
window.render_game_to_text = () => JSON.stringify({ phase: state.phase, paused: state.paused, cameraView: renderer?.inspection ? 'inspection' : state.cameraMode, mountedCameraView: state.cameraMode, inspection: Boolean(renderer?.inspection), config: state.config, timeUnits: 'seconds', distanceUnits: 'meters', dockingAxes: '+X right, +Y up, +Z away from target; craft nose −Z', destination: state.destination, preview: state.preview, telemetry: state.flight ? state.flight.kind === 'landing' ? getLandingTelemetry(state.flight) : state.flight.kind === 'docking' ? getDockingTelemetry(state.flight) : getLaunchTelemetry(state.flight) : evaluateVehicle(state.config) });
window.render_mission_to_text = () => JSON.stringify(missionControl.getState());
window.advanceTime = milliseconds => { const count = Math.ceil(clamp(milliseconds, 0, 600000) / (1000 / 60)); for (let i = 0; i < count && activeFlight(); i++) simulate(1 / 60); updateUI(); return window.render_game_to_text(); };

function closeAlternateModeViews() { workshop.close(); missionControl.close(); solar.close(); onlineEarth.close(); rollout.close(); }

// Every mode has one visible entry. Switching keeps the previous flight paused.
modeHub=installModeHub({onOpen(){clearInputs();pause(true);missionControl.pause(true);onlineEarth.pause?.(true);rollout.pause?.(true);},onClose(){clearInputs();pause(true);},onSelect(mode){
  clearInputs();pause(true);
  if(mode==='surface-landing'){openLandingChooser();return;}
  closeAlternateModeViews();
  if(mode==='workshop')workshop.open();
  else if(mode==='moon-mission')missionControl.open(workshop.getDesign());
  else if(mode==='earth-launch'){assemble();rolloutReady=true;beginLaunch();}
  else if(mode==='manual-docking')beginDocking(true);
  else if(mode==='online-earth')onlineEarth.open();
  else if(mode==='solar-system')solar.open();
}});
for(const button of [workshopButton,solarButton,earthButton,localPause,localGuide])button.hidden=true;
for(const nav of ['nav-assembly','nav-launch','nav-docking','nav-landing']){const action=()=>{clearInputs();document.querySelector('.practice-shortcuts').open=false;if(nav==='nav-assembly')assemble();else if(nav==='nav-docking')beginDocking(true);else if(nav==='nav-landing')openLandingChooser();else{assemble();rolloutReady=true;beginLaunch();}};$(nav).onclick=action;}
