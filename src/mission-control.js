import './mission-panel.css';
import './ascent-guidance.css';
import { advanceToStageBoundary, needsStageRelease, getFlightTimePolicy, installAscentReadouts } from './ascent-guidance.js';
import { createScene } from './scene.js';
import { createVehicleConfig, resolveConfig } from './catalog.js';
import { evaluateVehicle } from './physics.js';
import { validateVehicleDesign, evaluateDesign } from './vehicle-design.js';
import { MOON, createLunarMission, stepLunarMission, separateMissionStage, beginLunarDeparture, getLunarMissionTelemetry, restoreLunarMission, serializeLunarMission } from './lunar-mission.js';
import { createCustomDescent, stepCustomDescent, getCustomDescentTelemetry, restoreCustomDescent } from './custom-descent.js';
import { DESTINATIONS } from './destinations.js';
import { LUNAR_SITES, getPracticeSites, LUNAR_SITE_SOURCE } from './mission-sites.js';
import { drawMissionMap } from './mission-map.js';
import { getMissionJourney, getRetainedSpacecraftBudget } from './mission-journey.js';
import { icon } from './ui-icons.js';
import { createMiniMap } from './mini-map.js';
import { installDestinationCarousel } from './destination-carousel.js';
import kcMark from '../public/assets/branding/kinetic-core-kc-mark.svg?raw';
const KEY = 'kinetic-core.integrated-mission.v1';
// Presentation time only; the tested 3 s ground sequence and flight clock are unchanged.
const ROLLOUT_SECONDS = 12;
const fmt = (n, d = 1) => Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d }) : '—';
const time = s => s >= 86400 ? `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h ${Math.floor(s % 3600 / 60)}m` : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const distance = n => Math.abs(n) >= 100000 ? `${fmt(n / 1000, 0)} km` : `${fmt(n, Math.abs(n) < 1000 ? 1 : 0)} m`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const title = p => ({ rollout: 'Rollout', countdown: 'Ignition sequence', launch: 'Earth ascent', orbit: 'Earth orbit', window: 'Departure window', departure: 'Lunar departure', coast: 'Lunar coast', 'lunar-approach': 'Lunar approach', 'lunar-coast': 'Ballistic approach', capture: 'Lunar capture', 'lunar-orbit': 'Lunar orbit', descent: 'Powered descent', landing: 'Final descent', landed: 'Touchdown confirmed', failed: 'Flight debrief' }[p] ?? p);
const tool = (action, glyph, label) => `<button class="mc-tool" data-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}<span>${label}</span></button>`;
const modelNote = `The Moon route uses continuous 2D patched conics at real Earth–Moon distance, ideal engine pointing and a circular synthetic Moon epoch. Site longitude is projected into the training plane; terrain is illustrative. Other worlds are local surface rehearsals and skip launch and transfer. <a href="${LUNAR_SITE_SOURCE}" target="_blank" rel="noopener">NASA site references</a>`;

export function createMissionControl({ onOpen = () => {}, onClose = () => {}, onEditDesign = () => {} } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mission-control';
  dialog.setAttribute('aria-label', 'Spacecraft mission');
  dialog.innerHTML = `
    <header class="mc-header">
      <button type="button" class="mc-brand" data-action="home" aria-label="Kinetic Core home">${kcMark.replace('role="img" aria-labelledby="title"', 'aria-hidden="true" focusable="false"')}<strong data-title>Mission plan</strong></button>
      <nav aria-label="Mission navigation"><button data-action="close">${icon('arrow-left')}<span>Back</span></button></nav>
    </header>
    <section class="mc-planner">
      <div class="mc-planner-body">
        <div class="mc-intro"><h1>Choose your landing.</h1><p>The Moon expedition flies your assembled craft from Earth to touchdown.</p></div>
        <label class="mc-destination">Destination<select data-target>${DESTINATIONS.map(d => `<option value="${d.id}">${d.name}${d.id === 'moon' ? ' · full expedition' : ' · surface rehearsal'}</option>`).join('')}</select></label>
        <fieldset class="mc-site-field"><legend>Landing approach</legend><div data-site-list class="mc-sites"></div></fieldset>
        <div data-mission-summary class="mc-summary"></div>
        <details class="mc-model-note"><summary>Model and sources</summary><p>${modelNote}</p></details>
        <p data-planner-status class="mc-planner-status" role="status"></p>
      </div>
      <footer class="mc-planner-actions"><button class="primary-button" data-action="start">Start lunar mission</button><button data-action="resume-current" hidden>Resume paused flight</button><div><button data-action="edit-design">Edit rocket</button><button data-action="load-checkpoint">Restore checkpoint</button></div></footer>
    </section>
    <section class="mc-flight" hidden>
      <ol class="mc-journey" data-journey aria-label="Mission journey"></ol>
      <div class="mc-scene">
        <canvas data-flight-canvas tabindex="0" aria-label="Spacecraft view. Drag to inspect in 360 degrees; use Camera for view and zoom controls."></canvas>
        <div class="mc-scene-heading"><span data-phase>Rollout</span><strong data-clock>T+00:00</strong></div>
        <div class="mc-scene-tools" aria-label="Flight views and tools">${tool('pause', 'pause', 'Pause')}${tool('camera', 'camera', 'Camera')}${tool('time', 'time', 'Time')}${tool('telemetry', 'sliders', 'Tools')}</div>
        <div class="mc-inspect-hint" hidden><button class="kc-tool" data-action="reset-view" aria-label="Return to flight camera" title="Return to flight camera">${icon('reset')}</button></div>
        <div class="mc-mini-map" data-mini-map></div><div class="mc-cinematic" data-cinematic hidden></div>
        <div class="mc-live" aria-label="Critical flight readings"><span><small>Altitude</small><strong data-altitude>—</strong></span><span><small>Vertical speed</small><strong data-vertical>—</strong></span><span><small data-offset-label>Propellant</small><strong data-offset>—</strong></span></div>
        <div class="mc-paused" hidden><span>Paused</span><p data-pause-detail>Resume when ready.</p></div>
        <div class="mc-outcome" hidden></div>
      </div>
      <footer class="mc-command">
        <div class="mc-coach" aria-label="Next maneuver"><div><h2 data-next-title>Roll out to the pad</h2><p data-guidance-hint></p></div><button class="primary-button" data-action="next" hidden></button></div>
        <div class="mc-command-engine">
          <button class="mc-engine-tool" data-action="guidance" aria-pressed="true">${icon('rocket')}<span>Guidance<small data-guidance-state>On</small></span></button>
          <label class="mc-engine-control">Engine ceiling <strong data-power-label>100%</strong><input data-power type="range" min="0" max="100" value="100" aria-label="Engine ceiling"><small data-engine-output>Applied thrust 0%</small></label>
          <button class="mc-engine-tool engine-cut-button" data-action="cut" aria-label="Cut engine" title="Cut engine">${icon('power')}<span>Cut<small>Engine</small></span></button>
        </div>
        <div class="mc-pitch-controls" role="group" aria-label="Manual pitch" hidden><button data-turn="-1" aria-label="Hold to pitch left">${icon('chevron-left')}<span>Pitch left</span></button><span>Hold to turn</span><button data-turn="1" aria-label="Hold to pitch right"><span>Pitch right</span>${icon('chevron-right')}</button></div>
      </footer>
      <div class="mc-sheet-scrim" data-action="close-sheet" hidden></div>
      <section class="mc-sheet" data-sheet="tools" aria-label="Flight tools" hidden>
        <header><h2>Flight tools</h2><div class="mc-sheet-header-actions"><button class="mc-sheet-resume" data-resume-sheet>${icon('play')}<span>Resume</span></button><button class="mc-close" data-close-sheet aria-label="Close flight tools">${icon('close')}</button></div></header>
        <div class="mc-sheet-tabs" role="tablist" aria-label="Flight tools"><button role="tab" id="mc-data-tab" data-tab="data" aria-selected="true" aria-controls="mc-data-panel">Flight data</button><button role="tab" id="mc-controls-tab" data-tab="controls" aria-selected="false" aria-controls="mc-controls-panel">Controls</button><button role="tab" id="mc-help-tab" data-tab="help" aria-selected="false" aria-controls="mc-help-panel">Guide</button></div>
        <div class="mc-sheet-body">
          <div id="mc-data-panel" data-tab-panel="data" role="tabpanel" aria-labelledby="mc-data-tab"><h3 data-target-label>Moon expedition</h3><dl class="mc-instruments" data-instruments></dl><p data-status role="status" aria-live="polite"></p><div class="mc-checkpoints"><button data-action="save">Save checkpoint</button><button data-action="restore">Restore checkpoint</button></div><details class="mc-log"><summary>Flight events</summary><ol data-log></ol></details></div>
          <div id="mc-controls-panel" data-tab-panel="controls" role="tabpanel" aria-labelledby="mc-controls-tab" hidden><button class="kc-action" data-action="open-time">${icon('time')}<span>Time controls</span></button><p data-applied-warp></p><div class="mc-sheet-actions"><button data-action="stage">Separate stage</button><button data-action="skip-rollout" hidden>Skip rollout</button></div><p>Stage release is manual and discards the attached stage and its remaining fuel. Space cuts the engine during surface descent.</p></div>
          <div id="mc-help-panel" data-tab-panel="help" role="tabpanel" aria-labelledby="mc-help-tab" hidden><h3>Fly the next maneuver</h3><p>The journey marks actual flight phases. Follow the maneuver beneath the scene; depleted stages require your release.</p><dl class="mc-guide"><div><dt>Engine ceiling</dt><dd>Limits available thrust. Powered guidance uses real propellant and obeys this limit.</dd></div><div><dt>Guidance</dt><dd>On: steers and powers the maneuver. Off: use the engine slider and hold pitch buttons. No passive braking.</dd></div><div><dt>Camera</dt><dd>External chase, local descent view, 360° inspection and zoom. Inspection changes the view, never the trajectory.</dd></div><div><dt>Keyboard</dt><dd><kbd>W</kbd>/<kbd>S</kbd> engine · <kbd>A</kbd>/<kbd>D</kbd> pitch · <kbd>G</kbd> guidance · <kbd>Space</kbd> stage / descent engine cut · <kbd>Esc</kbd> pause</dd></div></dl><details class="mc-model-note"><summary>Model and sources</summary><p>${modelNote}</p></details></div>
        </div>
      </section>
      <section class="mc-sheet mc-map-sheet" data-sheet="map" aria-label="Navigation map" hidden><header><h2>Navigation map</h2><div class="mc-sheet-header-actions"><button class="mc-sheet-resume" data-resume-sheet>${icon('play')}<span>Resume</span></button><button class="mc-close" data-close-sheet aria-label="Close navigation map">${icon('close')}</button></div></header><div class="mc-sheet-body"><canvas width="380" height="220" data-map aria-label="Actual spacecraft position, direction and selected mission target"></canvas><p>Actual spacecraft position and direction. A local schematic, with illustrative surface geometry.</p></div></section>
      <section class="mc-sheet mc-time-sheet" data-sheet="time" aria-label="Time controls" hidden><header><h2>Time</h2><div class="mc-sheet-header-actions"><button class="mc-sheet-resume" data-resume-sheet>${icon('play')}<span>Resume</span></button><button class="mc-close" data-close-sheet aria-label="Close time controls">${icon('close')}</button></div></header><div class="mc-sheet-body"><p data-time-state></p><div class="flight-time-options" role="group" aria-label="Coast speed">${[1,10,100,1000,10000,50000].map(rate=>`<button data-mission-time="${rate}" aria-pressed="false">${rate.toLocaleString('en-US')}×</button>`).join('')}</div><p data-time-reason></p></div></section>
      <section class="mc-sheet mc-camera-sheet" data-sheet="camera" aria-label="Camera controls" hidden><header><h2>Camera</h2><div class="mc-sheet-header-actions"><button class="mc-sheet-resume" data-resume-sheet>${icon('play')}<span>Resume</span></button><button class="mc-close" data-close-sheet aria-label="Close camera controls">${icon('close')}</button></div></header><div class="mc-sheet-body"><div class="mc-camera-options"><button data-camera="chase" aria-pressed="true">${icon('camera')}<span>External chase<small>Follow the spacecraft</small></span></button><button data-camera="port" aria-pressed="false">${icon('arrow-down')}<span>Descent camera<small data-descent-camera-note>Available during local descent</small></span></button><button data-action="view" aria-pressed="false">${icon('rotate')}<span>360° inspection<small>Drag the scene to rotate</small></span></button></div><div class="mc-zoom"><span>Inspection zoom</span><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="reset-camera">Reset view</button></div></div></section>
    </section>`;
  document.body.append(dialog);
  const $ = s => dialog.querySelector(s);
  const listen = (s, event, fn) => $(s).addEventListener(event, fn);
  let active = false, planner = true, design = null, target = 'moon', site = 'tranquility', mission = null, renderer = null, paused = false, power = 1, guidance = true, warp = 1, camera = 'chase', last = performance.now(), animation, checkpoint = null, previousEvent = '', previousPhase = '', lastUI = 0, launchSite = { latitude: 28.5729, longitude: -80.649 };
  let rolloutElapsed = 0, activeSheet = null, sheetWasPaused = false, inspectMode = false, nextManeuver = null, lastFlightPhase = null, sheetTrigger = null;
  const keys = new Set(), touchTurns = new Set(), emittedMilestones = new Set();
  const miniMap = createMiniMap($('[data-mini-map]'));
  const destinationCarousel = installDestinationCarousel({ select: $('[data-target]'), dialog });
  const ascentReadouts = installAscentReadouts({ scene: $('.mc-scene'), tools: $('.mc-scene-tools'), icon, buttonClass: 'mc-tool', onToggle: () => clear() });
  const clear = () => { keys.clear(); touchTurns.clear(); dialog.querySelectorAll('[data-turn]').forEach(button => button.classList.remove('firing')); };
  const telemetry = () => mission?.kind === 'custom-descent' ? getCustomDescentTelemetry(mission) : getLunarMissionTelemetry(mission);
  const setHTML = (node, html) => { if (node.innerHTML !== html) node.innerHTML = html; };
  function status(message) { $('[data-status]').textContent = message; $('[data-planner-status]').textContent = message; }
  function save() {
    if (!mission || ['failed', 'landed'].includes(mission.phase)) return;
    let safe;
    try { safe = mission.kind === 'custom-descent' ? structuredClone(mission) : serializeLunarMission(mission); if (mission.kind === 'custom-descent') restoreCustomDescent(safe); }
    catch (error) { status(`Checkpoint validation failed: ${error.message} Previous checkpoint retained.`); return; }
    checkpoint = safe;
    try { localStorage.setItem(KEY, JSON.stringify(safe)); status('Checkpoint saved on this device.'); }
    catch { status('Checkpoint kept in this session. Browser storage is unavailable.'); }
  }
  function restore() {
    try {
      const raw = checkpoint ?? JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) throw Error('No saved mission yet.');
      const restored = raw.kind === 'custom-descent' ? restoreCustomDescent(raw) : restoreLunarMission(raw);
      mission = restored; emittedMilestones.clear(); design = mission.design; target = mission.destination ?? 'moon'; site = mission.siteId;
      rolloutElapsed = mission.phase === 'rollout' ? mission.sequenceTime / 3 * ROLLOUT_SECONDS : 0;
      power = 0; guidance = true; camera = 'chase'; inspectMode = false; previousPhase = ''; previousEvent = ''; lastFlightPhase = null; closeSheet(false); activateFlight(); renderer.resetOrbit(); pause(true);
      status('Checkpoint restored. Engine ceiling is zero; set power before resuming.');
    } catch (error) { status(`Cannot restore checkpoint: ${error.message}`); }
  }
  function pause(value = !paused) {
    clear(); paused = value;
    $('.mc-paused').hidden = !paused || !!activeSheet || !mission || ['landed', 'failed'].includes(mission.phase);
    const button = $('[data-action="pause"]');
    button.innerHTML = `${icon(paused ? 'play' : 'pause')}<span>${paused ? 'Resume' : 'Pause'}</span>`;
    button.setAttribute('aria-label', paused ? 'Resume flight' : 'Pause flight');
    button.title = paused ? 'Resume flight' : 'Pause flight';
    if (mission && !planner) update();
  }
  function open(raw) {
    design = validateVehicleDesign(raw); target = 'moon'; site = 'tranquility'; planner = true; onOpen(); clear(); closeSheet(false);
    $('.mc-planner').hidden = false; $('.mc-flight').hidden = true; $('[data-title]').textContent = 'Mission plan';
    if (!dialog.open) dialog.showModal(); active = true; renderPlanner(); last = performance.now(); cancelAnimationFrame(animation); animation = requestAnimationFrame(frame);
  }
  function close() { closeSheet(false); pause(true); active = false; dialog.close(); cancelAnimationFrame(animation); onClose(); }
  function renderPlanner() {
    const destination = DESTINATIONS.find(d => d.id === target), sites = target === 'moon' ? LUNAR_SITES : getPracticeSites(target);
    if (!sites.some(s => s.id === site)) site = sites[0].id;
    $('[data-target]').value = target;
    destinationCarousel.render();
    $('[data-site-list]').replaceChildren(...sites.map(s => {
      const button = document.createElement('button'); button.type = 'button'; button.className = s.id === site ? 'selected' : '';
      button.setAttribute('aria-pressed', String(s.id === site));
      const name = document.createElement('span'); name.textContent = s.name; button.append(name);
      if (s.reference) { const reference = document.createElement('small'); reference.textContent = s.reference; button.append(reference); }
      button.onclick = () => { site = s.id; renderPlanner(); }; return button;
    }));
    const evaluation = evaluateDesign(design), selectedSite = sites.find(s => s.id === site);
    const { retainedMass, surfaceTwr: maxTwr } = getRetainedSpacecraftBudget(design, destination.gravity);
    $('[data-mission-summary]').innerHTML = `<h2>${target === 'moon' ? 'Earth to Moon' : `${destination.name} surface rehearsal`}</h2><p>${selectedSite.description}</p><p class="mc-route-note">${target === 'moon' ? 'Launch → Transfer → Lunar orbit → Land. Staging remains manual.' : 'Starts above the surface. Earth launch, transfer and orbital capture are skipped.'}</p><dl><div><dt>${target === 'moon' ? 'Launch mass' : 'Retained mass'}</dt><dd>${fmt((target === 'moon' ? evaluation.wetMass : retainedMass) / 1000)} <small>t</small></dd></div><div><dt>Spacecraft ideal Δv</dt><dd>${fmt(evaluation.serviceDeltaV / 1000, 2)} <small>km/s</small></dd></div><div><dt>Surface thrust / weight</dt><dd>${fmt(maxTwr, 2)}</dd></div></dl>${maxTwr < 1 ? '<p class="warning">This engine cannot arrest a sustained descent at this loaded mass. Increase spacecraft thrust or reduce mass.</p>' : ''}`;
    $('[data-action="start"]').textContent = target === 'moon' ? 'Start lunar mission' : 'Start surface rehearsal';
    $('[data-action="start"]').disabled = !evaluation.valid;
    $('[data-action="resume-current"]').hidden = !mission || ['landed', 'failed'].includes(mission.phase);
    if (!evaluation.valid) { const message = document.createElement('p'); message.className = 'warning'; message.textContent = evaluation.errors.join(' '); $('[data-mission-summary]').append(message); }
  }
  function setupRenderer() {
    if (!renderer) renderer = createScene($('[data-flight-canvas]'), { onAssetWarning: status });
    const config = createVehicleConfig(design), summary = evaluateVehicle(config); launchSite = resolveConfig(config).site;
    renderer.setVehicle({ config, design, ...resolveConfig(config), summary }); renderer.setDestination(target); renderer.resize();
  }
  function activateFlight() {
    planner = false; $('.mc-planner').hidden = true; $('.mc-flight').hidden = false; $('.mc-outcome').hidden = true;
    setupRenderer(); $('[data-power]').value = Math.round(power * 100);
    $('[data-target-label]').textContent = target === 'moon' ? 'Moon expedition' : `${DESTINATIONS.find(d => d.id === target).name} · local rehearsal`;
    update();
  }
  function start() {
    closeSheet(false); clear(); emittedMilestones.clear(); rolloutElapsed = 0;
    mission = target === 'moon' ? createLunarMission(design, site) : createCustomDescent(design, target, site);
    if (target !== 'moon') { const practice = getPracticeSites(target).find(s => s.id === site); mission.position[0] = practice.offset; mission.velocity[0] = practice.horizontalSpeed; }
    power = 1; guidance = true; warp = 1; paused = false; camera = 'chase'; inspectMode = false; previousPhase = ''; previousEvent = ''; lastFlightPhase = null;
    activateFlight(); renderer.resetOrbit(); pause(false); save(); if (target !== 'moon') pause(true);
  }
  function stage() {
    if (!mission || ['rollout', 'countdown'].includes(mission.phase) || mission.phase === 'launch' && !mission.handedOver) return;
    const wasPaused = paused;
    if (mission.kind === 'custom-descent' || ['landing', 'descent'].includes(mission.phase)) { cutEngine(); return; }
    const result = separateMissionStage(mission); status(result.message);
    if (result.ok) { closeSheet(false); save(); if (wasPaused) pause(false); update(); }
  }
  function planDeparture() {
    try { if (beginLunarDeparture(mission)) { save(); update(); } else status(mission.event); }
    catch (error) { status(error.message); }
  }
  function safeWarp(t) { return getFlightTimePolicy(mission, warp, { guidance, altitude: t.altitude }).applied; }
  function renderView(t, dt) {
    const local = mission.kind === 'custom-descent' || t.primary === 'moon' && t.altitude < 30000;
    const phase = mission.phase;
    let mode = phase === 'rollout' ? 'rollout' : ['countdown', 'launch', 'orbit', 'window'].includes(phase) ? 'launch' : local ? 'landing' : 'transfer';
    if (phase === 'landed' && target === 'moon') mode = 'finale';
    const angle = local ? mission.kind === 'custom-descent' ? mission.angle : t.pitch : undefined;
    renderer.update({ ...t, mode, phase, customMission: true, crewEnabled: target === 'moon', destination: target, rolloutProgress: phase === 'rollout' ? rolloutElapsed / ROLLOUT_SECONDS : 1,
      position: local ? t.positionLocal : undefined, site: launchSite, landingSite: t.site, positionSI: t.positionSI, velocitySI: t.velocitySI, moonPositionSI: t.moonPositionSI, launchPositionSI: [6371000, 0],
      angle, craftAngle: t.craftAngle, pitch: t.pitch ?? 0, throttle: phase === 'countdown' || phase === 'rollout' ? 0 : t.throttle, stageIndex: t.stageIndex,
      time: mission.time, cameraMode: camera, paused, impact: mission.impact, orbitOverview: false }, dt);
  }
  function update() {
    if (!mission || planner) return;
    const phase = mission.phase, rolling = phase === 'rollout', ended = ['landed', 'failed'].includes(phase), t = telemetry();
    $('.mc-flight').classList.toggle('is-rollout', rolling); $('.mc-flight').classList.toggle('is-ended', ended);
    $('[data-title]').textContent = target === 'moon' ? 'Moon expedition' : `${DESTINATIONS.find(d => d.id === target).name} rehearsal`;
    $('[data-phase]').textContent = title(phase); $('[data-clock]').textContent = `T+ ${time(mission.time)}`;
    $('[data-altitude]').textContent = distance(t.altitude);
    $('[data-vertical]').textContent = `${fmt(t.verticalSpeed, t.altitude < 5000 ? 2 : 0)} m/s`;
    const local = t.primary === 'moon' || mission.kind === 'custom-descent';
    $('[data-offset-label]').textContent = local ? 'Pad offset' : 'Propellant';
    $('[data-offset]').textContent = local ? distance(t.padOffset) : `${fmt(t.totalFuel / 1000, 1)} t`;
    setHTML($('[data-instruments]'), `<div><dt>Reference body</dt><dd>${t.primary}</dd></div><div><dt>Reference-frame speed</dt><dd>${fmt(t.speed, 1)} m/s</dd></div><div><dt>Mass</dt><dd>${fmt(t.mass / 1000, 2)} t</dd></div><div><dt>Remaining propellant</dt><dd>${fmt(t.totalFuel, 1)} kg</dd></div><div><dt>Available engine Δv</dt><dd>${fmt(t.remainingDeltaV, 0)} m/s</dd></div><div><dt>Engine thrust applied</dt><dd>${fmt(t.throttle * 100, 0)}%</dd></div>${t.orbit ? `<div><dt>Earth apsides</dt><dd>${fmt(t.orbit.periapsis / 1000, 0)} × ${fmt(t.orbit.apoapsis / 1000, 0)} km</dd></div>` : ''}${t.lunarOrbit ? `<div><dt>Lunar apsides altitude</dt><dd>${fmt((t.lunarOrbit.periapsis - MOON.radius) / 1000, 0)} × ${fmt((t.lunarOrbit.apoapsis - MOON.radius) / 1000, 0)} km</dd></div>` : ''}`);
    $('[data-power-label]').textContent = `${Math.round(power * 100)}%`;
    $('[data-engine-output]').textContent = `Applied thrust ${fmt(t.throttle * 100, 0)}%`;
    $('[data-guidance-state]').textContent = guidance ? 'On' : 'Off';
    $('[data-action="guidance"]').setAttribute('aria-pressed', String(guidance)); $('[data-action="guidance"]').title = `Powered guidance ${guidance ? 'on' : 'off'}`;
    $('[data-action="guidance"]').setAttribute('aria-label', `Powered guidance ${guidance ? 'on' : 'off'}. ${guidance ? 'Turn off for manual flight' : 'Turn on'}`);
    const locked = ['rollout', 'countdown'].includes(phase) || phase === 'launch' && !mission.handedOver;
    $('[data-power]').disabled = locked || ended; $('[data-action="guidance"]').disabled = locked || ended; $('[data-action="cut"]').disabled = locked || ended;
    $('.mc-pitch-controls').hidden = guidance || locked || ended || !['launch', 'departure', 'lunar-approach', 'capture', 'descent', 'landing'].includes(phase);
    if (guidance || paused || locked) touchTurns.clear();
    const stageButton = $('[data-action="stage"]');
    stageButton.hidden = mission.kind === 'custom-descent' || t.stageIndex >= 2 || ['descent', 'landing'].includes(phase);
    stageButton.disabled = locked || ended; stageButton.classList.toggle('stage-ready', needsStageRelease(mission));
    $('[data-action="skip-rollout"]').hidden = !rolling;
    const timePolicy = getFlightTimePolicy(mission, warp, { guidance, altitude: t.altitude });
    const timeState = `Selected coast rate ${fmt(warp, 0)}× · ${paused ? 'paused; resumes at' : 'applied'} ${fmt(timePolicy.applied, 0)}×`;
    $('[data-applied-warp]').textContent = `${timeState}. ${timePolicy.reason}`;
    const timeButton = $('[data-action="time"]'); timeButton.querySelector('span').textContent = `Time ${timePolicy.applied >= 1000 ? fmt(timePolicy.applied / 1000, 0) + 'k' : fmt(timePolicy.applied, 0)}×`; timeButton.setAttribute('aria-label', `Time controls. Applied rate ${timePolicy.applied} times`); timeButton.title = `Time · ${timePolicy.applied}×`;
    $('[data-time-state]').textContent = timeState; $('[data-time-reason]').textContent = timePolicy.reason;
    dialog.querySelectorAll('[data-mission-time]').forEach(button => { const rate = Number(button.dataset.missionTime); button.disabled = rate > timePolicy.maximum; button.setAttribute('aria-pressed', String(rate === warp)); });
    const descentAvailable = !ended && (mission.kind === 'custom-descent' || t.primary === 'moon' && t.altitude < 30000);
    $('[data-camera="port"]').disabled = !descentAvailable;
    $('[data-descent-camera-note]').textContent = descentAvailable ? 'Look down toward the selected pad' : 'Available below 30 km during descent';
    if (!descentAvailable && camera === 'port') { camera = 'chase'; renderer?.resetOrbit(); }
    dialog.querySelectorAll('[data-camera]').forEach(button => button.setAttribute('aria-pressed', String(!inspectMode && button.dataset.camera === camera)));
    $('[data-action="view"]').setAttribute('aria-pressed', String(inspectMode));
    $('.mc-inspect-hint').hidden = !inspectMode || ended;
    if (phase !== 'failed') lastFlightPhase = phase;
    nextManeuver = getMissionJourney(mission, t, { guidance, power, warp, paused, lastPhase: lastFlightPhase });
    setHTML($('[data-journey]'), nextManeuver.steps.map(step => `<li class="is-${step.state}"${step.state === 'current' ? ' aria-current="step"' : ''}><span>${step.label}</span>${step.state === 'skipped' ? '<small>Skipped</small>' : ''}</li>`).join(''));
    $('[data-journey]').setAttribute('aria-label', nextManeuver.rehearsal ? 'Local rehearsal. Launch, transfer and orbit skipped.' : 'Moon expedition journey');
    $('[data-next-title]').textContent = nextManeuver.title; $('[data-guidance-hint]').textContent = nextManeuver.detail;
    const nextButton = $('[data-action="next"]'); nextButton.hidden = !nextManeuver.action || ended; nextButton.textContent = nextManeuver.label;
    $('.mc-coach').classList.toggle('is-urgent', !!nextManeuver.urgent);
    $('.mc-coach').dataset.stageUrgent = String(nextManeuver.action === 'stage' && !!nextManeuver.urgent);
    ascentReadouts.update(mission, t, { paused, guidance });
    $('.mc-paused').hidden = !paused || !!activeSheet || ended;
    $('[data-pause-detail]').textContent = nextManeuver.action === 'stage' ? 'Release the depleted stage below.' : 'The maneuver continues when you resume.';
    dialog.querySelectorAll('[data-resume-sheet]').forEach(button => {
      button.hidden = ended; button.disabled = nextManeuver.action === 'stage' && !!t.stageReady;
      button.setAttribute('aria-label', button.disabled ? 'Separate the depleted stage before resuming' : 'Resume flight and close tools');
    });
    const cinematic = $('[data-cinematic]'); cinematic.hidden = !['rollout', 'countdown'].includes(phase);
    cinematic.textContent = rolling ? 'Rollout to the pad' : phase === 'countdown' ? String(Math.max(1, 5 - Math.floor(mission.sequenceTime))) : '';
    if (mission.event !== previousEvent) {
      previousEvent = mission.event; status(mission.event);
      $('[data-log]').replaceChildren(...(mission.events?.slice(-8).reverse().map(event => { const li = document.createElement('li'); li.textContent = `T+${time(event.time)} ${event.message}`; return li; }) ?? []));
    }
    if (phase !== previousPhase) {
      const observedPreviousPhase = previousPhase; previousPhase = phase;
      if (!['failed', 'landed', 'rollout', 'countdown'].includes(phase)) save();
      if (ended) outcome(t);
      if (phase === 'landed' || mission.kind === 'lunar-mission' && phase === 'orbit') {
        const id = phase === 'landed' ? mission.kind === 'lunar-mission' ? 'lunar-touchdown' : 'surface-' + target : 'earth-orbit';
        if (!emittedMilestones.has(id)) { emittedMilestones.add(id); document.dispatchEvent(new CustomEvent('kc:milestone', { detail: { id, world: target, confirmedLanding: phase === 'landed' && !!observedPreviousPhase } })); }
      }
    }
    miniMap.updateMission(mission, t);
    if (activeSheet === 'map') drawMissionMap($('[data-map]'), mission, t);
  }
  function outcome(t) {
    clear(); closeSheet(false); const box = $('.mc-outcome'), ok = mission.phase === 'landed', impact = mission.impact;
    box.replaceChildren(); box.dataset.outcome = ok ? 'success' : 'failure';
    const heading = document.createElement('h2'); heading.textContent = ok ? 'Touchdown confirmed.' : 'Mission ended.';
    const detail = document.createElement('p'); detail.textContent = ok ? `${target === 'moon' ? 'Crew egress and the KC flag ceremony follow.' : 'Your spacecraft is secure in this local rehearsal.'} ${impact ? `Contact: ${fmt(Math.abs(impact.verticalSpeed), 2)} m/s vertical, ${fmt(Math.abs(impact.horizontalSpeed), 2)} m/s lateral.` : ''}` : mission.failure;
    const restoreButton = document.createElement('button'); restoreButton.textContent = 'Restore checkpoint'; restoreButton.onclick = restore;
    const exit = document.createElement('button'); exit.textContent = 'Back to workbench'; exit.onclick = close;
    box.append(heading, detail, restoreButton, exit);
    if (ok && target === 'moon') { const watch = document.createElement('button'); watch.textContent = 'Watch flag ceremony'; watch.className = 'primary-button'; watch.onclick = () => { box.hidden = true; pause(false); }; box.insertBefore(watch, restoreButton); }
    box.hidden = false;
  }
  function finishRollout() {
    if (mission?.phase !== 'rollout') return;
    rolloutElapsed = ROLLOUT_SECONDS; stepLunarMission(mission, {}, 3 - mission.sequenceTime); closeSheet(); update();
  }
  function cutEngine() { clear(); power = 0; $('[data-power]').value = 0; update(); }
  function nextAction() {
    switch (nextManeuver?.action) {
      case 'skip-rollout': finishRollout(); break;
      case 'resume': pause(false); break;
      case 'stage': stage(); break;
      case 'depart': planDeparture(); break;
      case 'restore': restore(); break;
      case 'power': power = 1; $('[data-power]').value = 100; update(); break;
      case 'warp': warp = nextManeuver.targetWarp; update(); break;
    }
  }
  function openSheet(name) {
    if (activeSheet === name) { closeSheet(); return; }
    if (!activeSheet) { sheetWasPaused = paused; sheetTrigger = document.activeElement; }
    clear(); activeSheet = name; pause(true); $('.mc-scene').inert = true; $('.mc-command').inert = true;
    dialog.querySelectorAll('[data-sheet]').forEach(sheet => { sheet.hidden = sheet.dataset.sheet !== name; });
    $('.mc-sheet-scrim').hidden = false; $('.mc-paused').hidden = true;
    if (name === 'map') drawMissionMap($('[data-map]'), mission, telemetry());
    $(`[data-sheet="${name}"] [data-close-sheet]`).focus();
  }
  function closeSheet(resume = false) {
    if (!activeSheet) return;
    const wasPaused = sheetWasPaused; activeSheet = null; $('.mc-scene').inert = false; $('.mc-command').inert = false;
    dialog.querySelectorAll('[data-sheet]').forEach(sheet => { sheet.hidden = true; }); $('.mc-sheet-scrim').hidden = true;
    if (resume && active && !planner) pause(wasPaused);
    if (sheetTrigger?.isConnected && !sheetTrigger.closest('[hidden]')) sheetTrigger.focus();
  }
  function setCamera(value) {
    camera = value; inspectMode = false; renderer?.resetOrbit(); closeSheet(activeSheet==='camera'); update(); $('[data-flight-canvas]').focus();
  }
  function inspect() {
    camera = 'chase'; inspectMode = true; renderer?.beginOrbit?.(); closeSheet(activeSheet==='camera'); update(); $('[data-flight-canvas]').focus();
  }
  function resetCamera() { inspectMode = false; renderer?.resetOrbit(); update(); }
  function frame(now) {
    if (!active) return;
    animation = requestAnimationFrame(frame); const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; if (planner) return;
    if (!paused && !['landed', 'failed'].includes(mission.phase)) {
      power = clamp(power + (Number(keys.has('KeyW')) - Number(keys.has('KeyS'))) * dt * .25, 0, 1); $('[data-power]').value = Math.round(power * 100);
      const locked = mission.phase === 'launch' && !mission.handedOver;
      const input = { throttle: locked ? 1 : power, guidance: locked ? true : guidance, turn: locked ? 0 : Number(keys.has('KeyD') || keys.has('ArrowRight') || touchTurns.has('1')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || touchTurns.has('-1')) }, t = telemetry();
      if (mission.phase === 'rollout') { rolloutElapsed = Math.min(ROLLOUT_SECONDS, rolloutElapsed + dt); if (rolloutElapsed >= ROLLOUT_SECONDS) finishRollout(); }
      else if (mission.kind === 'custom-descent') stepCustomDescent(mission, input, dt * safeWarp(t));
      else advanceToStageBoundary(mission, input, dt * safeWarp(t), stepLunarMission);
      const next = telemetry();
      if (needsStageRelease(mission) && !paused) { pause(true); status('Stage depleted. Select the stage-release action to continue.'); }
    }
    const t = telemetry(); renderView(t, dt);
    // The renderer may end inspection when a physical phase changes the scene.
    const inspectionChanged = inspectMode !== renderer.inspection; inspectMode = renderer.inspection;
    if (inspectionChanged || now - lastUI > 100) { update(); lastUI = now; }
  }
  listen('[data-action="telemetry"]', 'click', () => openSheet('tools'));
  listen('[data-action="home"]', 'click', () => document.dispatchEvent(new CustomEvent('kc:show-home')));
  listen('[data-action="time"]', 'click', () => openSheet('time'));
  listen('[data-action="camera"]', 'click', () => openSheet('camera'));
  listen('[data-action="close-sheet"]', 'click', () => closeSheet());
  dialog.querySelectorAll('[data-close-sheet]').forEach(button => button.addEventListener('click', () => closeSheet(activeSheet==='camera')));
  dialog.querySelectorAll('[data-resume-sheet]').forEach(button => button.addEventListener('click', () => { closeSheet(false); pause(false); $('[data-flight-canvas]').focus(); }));
  dialog.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    dialog.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
    dialog.querySelectorAll('[data-tab-panel]').forEach(panel => { panel.hidden = panel.dataset.tabPanel !== button.dataset.tab; });
  }));
  listen('[data-action="edit-design"]', 'click', () => { const raw = design; close(); onEditDesign(raw); });
  listen('[data-action="resume-current"]', 'click', () => { target = mission.destination ?? 'moon'; design = mission.design; site = mission.siteId; activateFlight(); pause(true); });
  listen('[data-target]', 'change', event => { target = event.target.value; site = target === 'moon' ? 'tranquility' : 'survey-plain'; renderPlanner(); });
  listen('[data-action="start"]', 'click', start); listen('[data-action="close"]', 'click', close); listen('[data-action="pause"]', 'click', () => pause());
  listen('[data-action="next"]', 'click', nextAction); listen('[data-action="stage"]', 'click', stage); listen('[data-action="skip-rollout"]', 'click', finishRollout);
  listen('[data-action="save"]', 'click', save); listen('[data-action="restore"]', 'click', restore); listen('[data-action="load-checkpoint"]', 'click', restore);
  listen('[data-power]', 'input', event => { power = Number(event.target.value) / 100; update(); });
  listen('[data-action="open-time"]', 'click', () => openSheet('time'));
  dialog.querySelectorAll('[data-mission-time]').forEach(button => button.addEventListener('click', () => { warp = Number(button.dataset.missionTime); update(); }));
  listen('[data-action="cut"]', 'click', cutEngine);
  dialog.querySelectorAll('[data-turn]').forEach(button => {
    button.addEventListener('pointerdown', event => { if (paused || guidance || button.closest('[hidden]')) return; event.preventDefault(); button.setPointerCapture(event.pointerId); touchTurns.add(button.dataset.turn); button.classList.add('firing'); });
    const release = () => { touchTurns.delete(button.dataset.turn); button.classList.remove('firing'); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', event => { if (!['Space', 'Enter'].includes(event.code) || paused || guidance) return; event.preventDefault(); touchTurns.add(button.dataset.turn); button.classList.add('firing'); });
    button.addEventListener('keyup', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); release(); } });
    button.addEventListener('blur', release);
  });
  listen('[data-action="guidance"]', 'click', () => { clear(); guidance = !guidance; update(); });
  dialog.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => setCamera(button.dataset.camera)));
  listen('[data-action="view"]', 'click', inspect);
  listen('[data-action="reset-view"]', 'click', () => { resetCamera(); $('[data-flight-canvas]').focus(); });
  listen('[data-action="reset-camera"]', 'click', resetCamera);
  listen('[data-action="zoom-in"]', 'click', () => { inspectMode = true; renderer?.zoomBy?.(.8); update(); });
  listen('[data-action="zoom-out"]', 'click', () => { inspectMode = true; renderer?.zoomBy?.(1.25); update(); });
  let dragOrigin = null;
  listen('[data-flight-canvas]', 'pointerdown', event => { dragOrigin = [event.clientX, event.clientY]; });
  listen('[data-flight-canvas]', 'pointermove', event => { if (dragOrigin && Math.hypot(event.clientX - dragOrigin[0], event.clientY - dragOrigin[1]) > 3) { inspectMode = true; update(); } });
  listen('[data-flight-canvas]', 'pointerup', () => { dragOrigin = null; }); listen('[data-flight-canvas]', 'pointercancel', () => { dragOrigin = null; });
  listen('[data-flight-canvas]', 'wheel', () => { inspectMode = true; update(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (activeSheet) closeSheet(); else if (planner) close(); else pause(); });
  window.addEventListener('keydown', event => {
    if (!active || planner) return;
    const focusedDialog = event.target.closest?.('dialog');
    if (focusedDialog && focusedDialog !== dialog) return;
    if (event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) { if (activeSheet) closeSheet(); else pause(); } return; }
    // Space/Enter on a focused control belong to that control, never flight shortcuts.
    const interactive = document.activeElement?.closest('button, a, input, select, textarea, summary, [role="button"], [contenteditable="true"]');
    if (interactive || activeSheet) return;
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyG', 'Space'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (paused) { if (event.code === 'Space' && !event.repeat && telemetry().stageReady) stage(); return; }
      keys.add(event.code);
      if (!event.repeat && event.code === 'Space') stage();
      if (!event.repeat && event.code === 'KeyG') { clear(); guidance = !guidance; update(); }
    }
  }, { capture: true });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { if (active && !planner) { sheetWasPaused = true; pause(true); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && active && !planner) { sheetWasPaused = true; pause(true); } });
  window.addEventListener('resize', () => renderer?.resize());
  // Navigation can pause while a tool sheet is open. Preserve that explicit pause
  // when the sheet closes; opening a sheet internally keeps its original state.
  function pauseExternally(value = !paused) {
    if (activeSheet) { sheetWasPaused = value; pause(true); } else pause(value);
  }
  return { open, close, pause: pauseExternally, getState: () => mission ? structuredClone(mission) : null, destroy() { close(); renderer?.dispose(); miniMap.destroy(); dialog.remove(); } };
}
