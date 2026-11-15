import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TYPES, SLOTS, createEmptyDesign, createLunarDesign, normalizeDesign, evaluateDesign, getAttachmentPoints } from './vehicle-design.js';
import { createVehicleGeometry } from './vehicle-geometry.js';
import './rocket-workshop.css';

// The canonical typed slots, geometry and performance model are shared with flight.
const STORAGE_KEY = 'kineti-core.rocket-workshop.v2';
const LEGACY_STORAGE_KEY = 'kineti-core.rocket-workshop.v1';
const IMPORT_LIMIT = 128 * 1024;
const SLOT_MAP = new Map(SLOTS.map(slot => [slot.id, slot]));
const format = (value, digits = 0) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : '—';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clone = value => JSON.parse(JSON.stringify(value));
const compatible = (slot, type) => !!slot?.accepts.includes(type);

/** onOpen pauses flight and releases inputs. onClose must never resume flight.
 * onStartFlight receives the exact validated v2 design currently shown here.
 */
export function createRocketWorkshop({ onOpen = () => {}, onClose = () => {}, onStartFlight = () => {}, initialDesign } = {}) {
  if (![onOpen, onClose, onStartFlight].every(callback => typeof callback === 'function')) throw new TypeError('Workshop callbacks must be functions.');
  const panel = document.createElement('dialog');
  panel.className = 'rocket-workshop';
  panel.setAttribute('aria-label', 'Rocket assembly platform');
  panel.innerHTML = `
    <header class="rw-header"><div><span>Kinetic Core / Vehicle engineering</span><h1>Assembly platform</h1></div><div class="rw-header-actions"><button type="button" data-action="close">Back to game</button><button type="button" class="rw-primary rw-flight" data-action="start">Start Flight</button></div></header>
    <div class="rw-boundary"><p><strong data-design-label>Lunar demonstrator</strong><span data-readiness>Checking flight readiness</span></p><div class="rw-presets"><button type="button" data-action="preset">Load lunar demonstrator</button><button type="button" data-action="empty">Empty platform</button><button type="button" data-action="undo" disabled>Undo</button></div></div>
    <div class="rw-placement" hidden><div><strong data-placement-label></strong><span data-placement-hint></span></div><button type="button" data-action="cancel-placement">Cancel placement</button></div>
    <div class="rw-layout">
      <aside class="rw-palette" aria-label="Component palette"><h2>Choose hardware</h2><p>Select a component, then place it on a compatible attachment point. Addition order never determines its position.</p><div class="rw-palette-grid">${Object.entries(TYPES).map(([type, spec]) => `<button type="button" draggable="true" data-part="${type}" aria-pressed="false"><span class="rw-icon rw-icon-${type}" aria-hidden="true"></span><strong>${escape(spec.label)}</strong><small>Choose attachment point</small></button>`).join('')}</div></aside>
      <section class="rw-scene" aria-label="Assembly platform and compatible attachment points"><canvas tabindex="0" aria-label="3D vehicle. Drag to orbit, right-drag to pan, scroll to zoom. Click installed hardware to inspect it."></canvas><div class="rw-attachment-points" aria-label="Visible attachment points"></div><div class="rw-scene-top"><span data-count>0 / ${SLOTS.length} attachment points occupied</span><button type="button" data-action="frame">Frame vehicle</button></div><p class="rw-empty">Your assembly platform.<br><span>Choose hardware, then select its attachment point.</span></p><p class="rw-scene-help">Drag to orbit · Right-drag to pan · Scroll to zoom<br>Click installed hardware to inspect · Dimensions in metres</p><p class="rw-webgl" hidden>3D preview is unavailable. Use the attachment-point list to assemble and save.</p></section>
      <aside class="rw-inspector" aria-label="Attachment points and engineering instruments"><h2>Attachment points</h2><p class="rw-slot-help">Each point has a fixed role in the vehicle. Select any component to inspect it.</p><ol class="rw-parts" aria-label="Vehicle attachment points"></ol>
      <fieldset class="rw-dimensions" disabled><legend data-selected>No component selected</legend><label>Radius / half-width (m)<input data-dimension="radius" type="number" min="0.1" max="5" step="0.05" value="1"></label><label>Length (m)<input data-dimension="length" type="number" min="0.1" max="20" step="0.05" value="1"></label><button type="button" data-action="duplicate">Copy to another point</button><button type="button" data-action="delete">Remove component</button></fieldset>
      <section class="rw-engineering"><h2>Flight readiness</h2><div class="rw-validation" aria-live="polite"></div><dl class="rw-stats"></dl><details class="rw-assumptions"><summary>Fictional hardware & flight model</summary><p>Dimensions, attachment roles, stage masses, propellant and engine performance come from one shared vehicle model. The craft shown here is the craft passed to flight; choosing a different order of placement does not change its geometry.</p><p>Hardware specifications are invented for this game. Thrust-to-weight uses Earth gravity; ideal delta-v is a staged vacuum budget before flight losses. Mission readiness warnings identify performance margins, not certification. Flight still uses finite propellant and the selected hardware.</p><p>Attachment points provide a constrained engineering layout. Structural flex, plumbing, arbitrary joint stress and collision-aware CAD validation are not simulated.</p></details></section></aside>
    </div>
    <footer class="rw-footer"><div class="rw-file-actions"><button type="button" data-action="save">Save locally</button><button type="button" data-action="load">Load local save</button><button type="button" data-action="export">Export JSON</button><button type="button" data-action="import">Import JSON</button><input type="file" accept=".json,application/json" hidden data-import></div><p role="status" aria-live="polite" data-status>One vehicle model from assembly to flight.</p><small>Ctrl/⌘ S save · D copy to a point · Delete remove · F frame · Esc close. Flight controls are blocked while editing.</small></footer>`;
  document.body.append(panel);
  const $ = selector => panel.querySelector(selector);
  const canvas = $('canvas'), viewport = $('.rw-scene'), list = $('.rw-parts');
  let design = normalizeDesign(initialDesign ?? createLunarDesign());
  let selectedSlot = null, pending = null, active = false, destroyed = false;
  let label = initialDesign ? 'Custom vehicle' : 'Lunar demonstrator';
  let previousFocus, previousOverflow, animation, renderer, controls, scene, camera, vehicle, platform, selectionBox;
  let fileRevision = 0, pointerStart, lastWidth = 0, lastHeight = 0;
  const history = [];
  const markers = new Map();
  const listeners = new AbortController();
  const listen = (target, event, handler, options = {}) => target.addEventListener(event, handler, { ...options, signal: listeners.signal });
  const status = message => { $('[data-status]').textContent = message; };
  const currentPart = () => pending ?? design.slots[selectedSlot];
  const documentValue = () => normalizeDesign(design);
  const pointEntries = () => getAttachmentPoints(design);

  function disposeObject(object) {
    if (!object) return;
    if (typeof object.userData.dispose === 'function') {
      object.userData.dispose(); object.removeFromParent(); return;
    }
    const geometries = new Set(), materials = new Set();
    object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : child.material ? [child.material] : []) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    object.removeFromParent();
  }

  function initScene() {
    if (renderer || scene) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      camera = new THREE.PerspectiveCamera(40, 1, .05, 20000);
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false;
      controls.minDistance = 2;
      controls.maxDistance = 10000;
      const key = new THREE.DirectionalLight(0xfff5e7, 3.6);
      key.position.set(18, 38, 24);
      const rim = new THREE.DirectionalLight(0x9bcaff, 1.7);
      rim.position.set(-22, 15, -18);
      scene.add(key, rim, new THREE.HemisphereLight(0xc1c8d3, 0x171719, 1.2));
      platform = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(12, 12.5, .65, 64), new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: .7, roughness: .6 }));
      deck.position.y = -.35;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(10.8, .035, 8, 96), new THREE.MeshStandardMaterial({ color: 0x6e747b, metalness: .8, roughness: .4 }));
      collar.rotation.x = Math.PI / 2; collar.position.y = -.012;
      const inner = collar.clone(); inner.geometry = new THREE.TorusGeometry(6.4, .025, 8, 96);
      platform.add(deck, collar, inner);
      scene.add(platform);
    } catch {
      renderer?.dispose(); renderer = null;
      $('.rw-webgl').hidden = false;
      status('3D is unavailable. The attachment-point list still assembles the same flight design.');
    }
  }

  function rebuild() {
    if (!scene || !renderer) return;
    disposeObject(selectionBox); selectionBox = null;
    disposeObject(vehicle);
    vehicle = createVehicleGeometry(design, { selectedSlot });
    scene.add(vehicle);
    const selected = vehicle.userData.parts?.get(selectedSlot);
    if (selected && !pending) {
      const bounds = new THREE.Box3().setFromObject(selected);
      if (!bounds.isEmpty()) {
        selectionBox = new THREE.Box3Helper(bounds, 0x9bcaff);
        selectionBox.material.transparent = true; selectionBox.material.opacity = .5;
        scene.add(selectionBox);
      }
    }
    const vehicleRadius = vehicle.userData.radius ?? 6;
    platform.scale.setScalar(Math.max(1, (vehicleRadius + 2) / 12));
  }

  function frameDesign() {
    if (!camera || !controls) return;
    const bounds = vehicle ? new THREE.Box3().setFromObject(vehicle) : new THREE.Box3();
    if (pending || bounds.isEmpty()) for (const point of pointEntries()) {
      if (!pending || compatible(SLOT_MAP.get(point.slotId ?? point.id), pending.type)) bounds.expandByPoint(new THREE.Vector3(...point.position));
    }
    if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(3, 12, 3));
    bounds.expandByPoint(new THREE.Vector3(0, -.8, 0));
    const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
    const distance = Math.max(size.length(), 6) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.min(camera.aspect || 1, 1) * 1.15;
    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(.65, .17, 1).normalize().multiplyScalar(distance));
    controls.update();
  }

  function renderMarkers() {
    const holder = $('.rw-attachment-points');
    holder.replaceChildren(); markers.clear();
    if (!pending) return;
    for (const slot of SLOTS.filter(item => compatible(item, pending.type))) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'rw-attachment-marker';
      button.dataset.slot = slot.id;
      button.setAttribute('aria-label', `${design.slots[slot.id] ? 'Replace component at' : 'Place component at'} ${slot.label}`);
      button.innerHTML = `<span aria-hidden="true">+</span><small>${escape(slot.label)}</small>`;
      button.onclick = () => placePart(slot.id);
      button.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
      button.addEventListener('drop', event => {
        event.preventDefault(); event.stopPropagation();
        const type = event.dataTransfer.getData('application/x-kineti-rocket-part');
        if (type && (!pending || pending.type !== type)) chooseType(type);
        placePart(slot.id);
      });
      holder.append(button); markers.set(slot.id, button);
    }
  }

  function renderUI() {
    list.replaceChildren();
    for (const slot of SLOTS) {
      const part = design.slots[slot.id], canPlace = pending && compatible(slot, pending.type);
      const row = document.createElement('li');
      row.classList.toggle('rw-selected', selectedSlot === slot.id && !pending);
      row.classList.toggle('rw-compatible', !!canPlace);
      row.classList.toggle('rw-incompatible', !!pending && !canPlace);
      const choose = document.createElement('button');
      choose.type = 'button'; choose.dataset.slot = slot.id;
      choose.setAttribute('aria-pressed', String(selectedSlot === slot.id && !pending));
      choose.disabled = !!pending && !canPlace;
      choose.innerHTML = `<span><strong>${escape(slot.label)}</strong><small>${part ? escape(TYPES[part.type].label) + ` / ${format(part.radius, 2)} × ${format(part.length, 2)} m` : `Accepts ${slot.accepts.map(type => TYPES[type].label).join(' / ')}`}</small></span><em>${pending && canPlace ? part ? 'Replace' : 'Place' : part ? 'Installed' : 'Empty'}</em>`;
      choose.onclick = () => {
        if (pending) placePart(slot.id);
        else { selectedSlot = slot.id; renderUI(); }
        list.querySelector(`[data-slot="${slot.id}"]`)?.focus({ preventScroll: true });
      };
      row.append(choose); list.append(row);
    }
    for (const button of panel.querySelectorAll('[data-part]')) {
      button.setAttribute('aria-pressed', String(pending?.type === button.dataset.part));
      button.classList.toggle('rw-chosen', pending?.type === button.dataset.part);
    }
    const part = currentPart(), spec = part && TYPES[part.type];
    $('.rw-dimensions').disabled = !part;
    $('[data-selected]').textContent = part ? pending ? `${spec.label} / awaiting placement` : SLOT_MAP.get(selectedSlot).label : 'Select hardware or an attachment point';
    for (const input of panel.querySelectorAll('[data-dimension]')) {
      input.setCustomValidity('');
      if (!part) continue;
      const dimension = input.dataset.dimension;
      input.min = String(spec[dimension === 'radius' ? 'minRadius' : 'minLength'] ?? .1);
      input.max = String(spec[dimension === 'radius' ? 'maxRadius' : 'maxLength'] ?? (dimension === 'radius' ? 5 : 20));
      input.value = String(part[dimension]);
    }
    $('[data-action="duplicate"]').disabled = !design.slots[selectedSlot] || !!pending;
    $('[data-action="delete"]').disabled = !design.slots[selectedSlot] || !!pending;
    $('[data-action="undo"]').disabled = !history.length;
    $('[data-count]').textContent = `${Object.keys(design.slots).length} / ${SLOTS.length} attachment points occupied`;
    $('[data-design-label]').textContent = label;
    $('.rw-empty').hidden = Object.keys(design.slots).length > 0 || !!pending;
    $('.rw-placement').hidden = !pending;
    if (pending) {
      const count = SLOTS.filter(slot => compatible(slot, pending.type)).length;
      $('[data-placement-label]').textContent = `${spec.label} / ${format(part.radius, 2)} m radius × ${format(part.length, 2)} m length`;
      $('[data-placement-hint]').textContent = `Choose one of ${count} highlighted points. Occupied points explicitly replace that component.`;
    }
    const e = evaluateDesign(design);
    $('[data-action="start"]').disabled = !e.valid || !!pending;
    $('[data-readiness]').textContent = pending ? 'Place or cancel the selected hardware before flight' : e.valid ? e.warnings.length ? 'Flight available / review margins' : 'Ready for mission planning' : 'Complete the required flight hardware';
    $('[data-readiness]').className = e.valid ? 'rw-ready' : 'rw-not-ready';
    $('.rw-validation').innerHTML = [...e.errors.map(message => `<p class="rw-error">${escape(message)}</p>`), ...e.warnings.map(message => `<p class="rw-warning">${escape(message)}</p>`)].join('') || '<p class="rw-good">Hardware is ready. Start Flight opens mission planning.</p>';
    $('.rw-stats').innerHTML = [['Initial mass', `${format(e.wetMass / 1000, 1)} t`], ['Dry mass', `${format(e.dryMass / 1000, 1)} t`], ['Propellant', `${format(e.propellantMass / 1000, 1)} t`], ['Liftoff thrust', `${format(e.thrust / 1000)} kN`], ['Earth initial TWR', format(e.twr, 2)], ['Staged ideal Δv', `${format(e.deltaV)} m/s`], ['Vehicle height', `${format(e.height, 1)} m`]].map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('');
    rebuild(); renderMarkers();
  }

  function remember() { history.push(clone(design)); if (history.length > 30) history.shift(); }
  function changed(next, message, nextLabel = 'Custom vehicle') {
    const trusted = normalizeDesign(next);
    remember(); design = trusted; label = nextLabel; fileRevision++;
    renderUI(); status(message);
  }
  function chooseType(type) {
    if (!Object.hasOwn(TYPES, type)) return;
    pending = { type, radius: TYPES[type].radius, length: TYPES[type].length };
    selectedSlot = null; renderUI(); frameDesign();
    status(`${TYPES[type].label} selected. Click a highlighted attachment point or choose one in the list.`);
    if (window.matchMedia('(max-width: 760px)').matches) viewport.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function placePart(slotId) {
    const slot = SLOT_MAP.get(slotId);
    if (!pending || !compatible(slot, pending.type)) { status('That point is not compatible with the selected component.'); return; }
    const part = { ...pending }, replacing = !!design.slots[slotId];
    const next = clone(design); next.slots[slotId] = part;
    selectedSlot = slotId; pending = null;
    changed(next, `${TYPES[part.type].label} ${replacing ? 'replaced at' : 'placed on'} ${slot.label}. Physical position comes from this attachment point.`);
  }
  function cancelPlacement() { pending = null; renderUI(); status('Placement canceled. The installed vehicle is unchanged.'); }
  function duplicate() {
    const part = design.slots[selectedSlot];
    if (!part) return;
    pending = { ...part }; selectedSlot = null; renderUI();
    status('Copy prepared. Choose a compatible attachment point to place it.');
  }
  function remove() {
    if (!design.slots[selectedSlot]) return;
    const name = SLOT_MAP.get(selectedSlot).label, next = clone(design);
    delete next.slots[selectedSlot];
    changed(next, `${name} is empty. Undo restores the removed component.`);
  }
  function undo() {
    if (!history.length) return;
    design = normalizeDesign(history.pop()); pending = null; selectedSlot = null; label = 'Custom vehicle'; fileRevision++;
    renderUI(); frameDesign(); status('Previous vehicle design restored.');
  }
  function replaceDesign(value, nextLabel = 'Loaded vehicle') {
    const trusted = normalizeDesign(value), migrated = value?.version === 1;
    pending = null; selectedSlot = null;
    changed(trusted, migrated ? 'Version 1 design migrated by component type into explicit attachment points. Review placement and performance before flight.' : nextLabel === 'Empty platform' ? 'Empty platform. Choose hardware, then select a compatible attachment point.' : 'Vehicle loaded. Geometry and performance updated; review flight readiness before starting.', nextLabel);
    frameDesign();
    return documentValue();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(documentValue())); status('Vehicle saved locally. Load it later and use Start Flight to fly the same design.'); }
    catch { status('Local storage is unavailable or full. Use Export JSON.'); }
  }
  function load() {
    try {
      const json = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (json === null) { status('No local vehicle saved yet.'); return; }
      if (json.length > IMPORT_LIMIT) throw new Error('Saved design exceeds the 128 KiB limit.');
      replaceDesign(JSON.parse(json), 'Saved vehicle');
    } catch (error) { status(`Could not load design: ${error.message}`); }
  }
  function exportJSON() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(documentValue(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'kinetic-core-rocket-v2.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Vehicle JSON exported. Import it to recover the same typed attachment layout and fly it.');
  }
  function startFlight() {
    const snapshot = documentValue(), result = evaluateDesign(snapshot);
    if (!result.valid) { status(`Flight unavailable: ${result.errors.join(' ')}`); return; }
    close(); onStartFlight(snapshot);
  }

  for (const button of panel.querySelectorAll('[data-part]')) {
    listen(button, 'click', () => chooseType(button.dataset.part));
    listen(button, 'dragstart', event => {
      chooseType(button.dataset.part);
      event.dataTransfer.setData('application/x-kineti-rocket-part', button.dataset.part);
      event.dataTransfer.effectAllowed = 'copy';
    });
  }
  listen(viewport, 'dragover', event => {
    if (!Array.from(event.dataTransfer.types).includes('application/x-kineti-rocket-part')) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; viewport.classList.add('rw-drop');
  });
  listen(viewport, 'dragleave', event => { if (!viewport.contains(event.relatedTarget)) viewport.classList.remove('rw-drop'); });
  listen(viewport, 'drop', event => {
    event.preventDefault(); viewport.classList.remove('rw-drop');
    status('Drop onto a highlighted attachment point, or click a compatible point in the list. Components never attach automatically.');
  });
  listen(panel, 'dragend', () => viewport.classList.remove('rw-drop'));
  for (const input of panel.querySelectorAll('[data-dimension]')) {
    listen(input, 'change', () => {
      const part = currentPart(); if (!part) return;
      const value = input.valueAsNumber;
      if (!Number.isFinite(value) || value < Number(input.min) || value > Number(input.max)) {
        input.setCustomValidity(`Enter a value from ${input.min} to ${input.max} metres.`); input.reportValidity(); return;
      }
      if (pending) { pending = { ...pending, [input.dataset.dimension]: value }; renderUI(); status('Selected component dimensions updated. Choose its attachment point.'); }
      else {
        const next = clone(design); next.slots[selectedSlot][input.dataset.dimension] = value;
        try { changed(next, 'Vehicle dimensions and flight performance updated.'); }
        catch (error) { input.setCustomValidity(error.message); input.reportValidity(); }
      }
    });
    listen(input, 'input', () => input.setCustomValidity(''));
  }
  listen($('[data-import]'), 'change', async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > IMPORT_LIMIT) { status('Import rejected: maximum file size is 128 KiB.'); return; }
    const revision = fileRevision;
    try {
      const value = JSON.parse(await file.text());
      if (destroyed || !active || revision !== fileRevision) { status('Import canceled because the workspace changed. Try again.'); return; }
      replaceDesign(value, 'Imported vehicle');
    } catch (error) { status(`Import rejected: ${error.message}`); }
  });
  const actions = { close, frame: frameDesign, duplicate, delete: remove, save, load, undo, start: startFlight,
    preset: () => replaceDesign(createLunarDesign(), 'Lunar demonstrator'), empty: () => replaceDesign(createEmptyDesign(), 'Empty platform'),
    'cancel-placement': cancelPlacement, export: exportJSON, import: () => $('[data-import]').click() };
  for (const button of panel.querySelectorAll('[data-action]')) listen(button, 'click', () => actions[button.dataset.action]());
  listen(canvas, 'pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY, button: event.button }; });
  listen(canvas, 'pointerup', event => {
    if (!vehicle || !pointerStart || pointerStart.button !== 0 || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = ray.intersectObjects(vehicle.children, true)[0];
    if (!hit) return;
    let object = hit.object, slotId;
    while (object && object !== vehicle) {
      slotId = object.userData.slotId ?? object.userData.partId;
      if (slotId) break;
      for (const [id, group] of vehicle.userData.parts ?? []) if (group === object) { slotId = id; break; }
      if (slotId) break;
      object = object.parent;
    }
    if (!SLOT_MAP.has(slotId)) return;
    if (pending) placePart(slotId);
    else { selectedSlot = slotId; renderUI(); list.querySelector(`[data-slot="${slotId}"]`)?.scrollIntoView({ block: 'nearest' }); }
  });
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); $('.rw-webgl').hidden = false; });
  listen(canvas, 'webglcontextrestored', () => { $('.rw-webgl').hidden = true; });

  // Capture before the host's flight listeners. Closing only returns to paused flight.
  listen(window, 'keydown', event => {
    if (!active) return;
    event.stopImmediatePropagation();
    const editing = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
    else if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'delete' || key === 'backspace') { event.preventDefault(); remove(); }
      else if (key === 'd' && !event.repeat) { event.preventDefault(); duplicate(); }
      else if (key === 'f') { event.preventDefault(); frameDesign(); }
    }
  }, { capture: true });
  for (const type of ['keyup', 'keypress']) listen(window, type, event => { if (active) event.stopImmediatePropagation(); }, { capture: true });
  listen(panel, 'cancel', event => { event.preventDefault(); close(); });
  listen(panel, 'close', () => { if (active) close(); });

  function tick() {
    if (!active) return;
    animation = requestAnimationFrame(tick);
    if (!renderer) return;
    const width = Math.max(canvas.clientWidth, 1), height = Math.max(canvas.clientHeight, 1);
    if (width !== lastWidth || height !== lastHeight) {
      lastWidth = width; lastHeight = height;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    controls.update();
    const points = new Map(pointEntries().map(point => [point.slotId ?? point.id, point]));
    for (const [slotId, button] of markers) {
      const point = points.get(slotId); if (!point) { button.hidden = true; continue; }
      const world = new THREE.Vector3(...point.position), projected = world.clone().project(camera);
      const cameraDirection = world.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
      button.hidden = cameraDirection <= 0 || projected.x < -1.05 || projected.x > 1.05 || projected.y < -1.05 || projected.y > 1.05;
      button.style.left = `${(projected.x * .5 + .5) * width}px`;
      button.style.top = `${(-projected.y * .5 + .5) * height}px`;
    }
    renderer.render(scene, camera);
  }
  function open() {
    if (active || destroyed) return;
    previousFocus = document.activeElement; onOpen();
    try { panel.showModal(); } catch (error) { onClose(); throw error; }
    active = true; previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    initScene(); renderUI(); tick(); frameDesign();
    $('[data-action="start"]').disabled ? $('[data-action="close"]').focus() : $('[data-action="start"]').focus();
  }
  function close() {
    if (!active) return;
    active = false; pending = null; fileRevision++; cancelAnimationFrame(animation);
    if (panel.open) panel.close();
    document.documentElement.style.overflow = previousOverflow;
    try { onClose(); } finally { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); }
  }
  function destroy() {
    close(); destroyed = true; listeners.abort(); disposeObject(selectionBox); disposeObject(vehicle); disposeObject(platform);
    controls?.dispose(); renderer?.dispose(); panel.remove();
  }
  renderUI();
  return { open, close, destroy, getDesign: documentValue, setDesign: value => replaceDesign(value, 'Loaded vehicle') };
}
