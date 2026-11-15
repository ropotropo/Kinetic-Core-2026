import './mode-hub.css';

const MODES = Object.freeze([
  { id: 'workshop', name: 'Rocket workshop', note: 'Choose compatible attachment points, save your spacecraft and prepare it for flight.', symbol: 'build' },
  { id: 'moon-mission', name: 'Complete Moon mission', note: 'Fly your assembled spacecraft from Earth launch through lunar transfer and touchdown.', symbol: 'moon' },
  { id: 'earth-launch', name: 'Earth launch', note: 'Configure a training vehicle, launch, reach orbit and separate its stages manually.', symbol: 'launch' },
  { id: 'manual-docking', name: 'Manual docking', note: 'Start near a station. Control translation, rotation, braking and soft capture yourself.', symbol: 'dock' },
  { id: 'surface-landing', name: 'Surface landing', note: 'Choose a world and practice powered descent. Landing guidance and manual control are available.', symbol: 'land' },
  { id: 'online-earth', name: 'Online Earth', note: 'Explore real terrain and buildings, then fly a local training rocket. Internet required.', symbol: 'earth' },
  { id: 'solar-system', name: 'Solar System', note: 'Inspect planets and moons in the 3D atlas. The atlas is separate from mission flight.', symbol: 'system' },
]);
const SYMBOLS = {
  build: '<path d="M8 5h8v14H8zM5 9h3m8 0h3M5 15h3m8 0h3M11 5V2m2 17v3"/>',
  moon: '<path d="M18.7 16.2A8 8 0 0 1 7.8 5.3 8 8 0 1 0 18.7 16.2Z"/>',
  launch: '<path d="M9 17V8l3-5 3 5v9M9 12l-3 4v4l3-2m6-6 3 4v4l-3-2M10 21v-2m4 2v-2"/>',
  dock: '<path d="M2 8h5v8H2m20-8h-5v8h5M7 12h10M10 8v8m4-8v8"/><circle cx="12" cy="12" r="9"/>',
  land: '<path d="M8 10h8v6H8zM8 13l-4 7m12-7 4 7M2 21h5m10 0h5M12 3v5m-3-3 3 3 3-3"/>',
  earth: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  system: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-28 12 12)"/><path d="m19 5 2-1m-17 14 2-1"/>',
};
let activeHub = null;
// Registered while the module loads, before the host constructs flight listeners.
// A native modal prevents pointer input; this guard also blocks held flight keys.
function guardKeys(event) {
  if (!activeHub?.isOpen()) return;
  event.stopImmediatePropagation();
  if (event.type === 'keydown' && event.code === 'Escape') {
    event.preventDefault(); if (!event.repeat) activeHub.close();
  } else if (event.type === 'keydown' && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.code)) {
    event.preventDefault(); activeHub.moveFocus(event.code);
  }
}
window.addEventListener('keydown', guardKeys, { capture: true });
window.addEventListener('keyup', guardKeys, { capture: true });
window.addEventListener('keypress', guardKeys, { capture: true });

/** The host pauses all active simulations in onOpen/onClose. Closing this menu
 * never resumes a mission. onSelect explicitly enters the requested mode. */
export function installModeHub({ onOpen = () => {}, onClose = () => {}, onSelect = () => {}, initialMode = 'earth-launch' } = {}) {
  if (![onOpen, onClose, onSelect].every(callback => typeof callback === 'function')) throw new TypeError('Mode hub callbacks must be functions.');
  const dialog = document.createElement('dialog');
  dialog.className = 'mode-hub-dialog';
  dialog.setAttribute('aria-labelledby', 'mode-hub-title');
  dialog.innerHTML = `<header class="mh-header"><div><p>Kinetic Core</p><h2 id="mode-hub-title">Choose a flight mode</h2></div><button type="button" class="mh-close" aria-label="Close mode selection">×</button></header><p class="mh-intro">Build a mission, practice a maneuver or explore.</p><nav class="mh-modes" aria-label="Available game modes"></nav><footer class="mh-footer">The current flight stays paused. Select a mode to continue, or close this menu to review your current view.</footer>`;
  document.body.append(dialog);
  let current = MODES.some(mode => mode.id === initialMode) ? initialMode : null;
  let openNow = false, destroyed = false, previousFocus;
  const triggers = new Set(), wrappers = new Set();
  const abort = new AbortController();
  const listen = (element, event, handler, options = {}) => element.addEventListener(event, handler, { ...options, signal: abort.signal });
  const list = dialog.querySelector('.mh-modes');
  for (const mode of MODES) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mh-mode'; button.dataset.mode = mode.id;
    button.innerHTML = `<svg class="mh-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SYMBOLS[mode.symbol]}</svg><span class="mh-mode-copy"><strong>${mode.name}</strong><small>${mode.note}</small></span><span class="mh-current" aria-hidden="true">Current</span>`;
    listen(button, 'click', () => { const next = mode.id; close(); setCurrent(next); onSelect(next); });
    list.append(button);
  }
  function setCurrent(mode) {
    current = MODES.some(item => item.id === mode) ? mode : null;
    for (const button of list.querySelectorAll('[data-mode]')) {
      const selected = button.dataset.mode === current;
      button.classList.toggle('is-current', selected);
      if (selected) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
    }
    for (const trigger of triggers) trigger.title = current ? `Modes / ${MODES.find(item => item.id === current).name}` : 'Choose a flight mode';
  }
  function moveFocus(key) {
    const buttons = [...list.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
    const next = key === 'Home' ? 0 : key === 'End' ? buttons.length - 1 : key === 'ArrowDown' ? (index + 1 + buttons.length) % buttons.length : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  const controller = { isOpen: () => openNow, close, moveFocus };
  function open() {
    if (destroyed || openNow) return;
    previousFocus = document.activeElement;
    onOpen();
    dialog.showModal(); openNow = true; activeHub = controller;
    setCurrent(current);
    const preferred = list.querySelector('[aria-current="true"]') ?? list.querySelector('button');
    preferred?.focus();
  }
  function close() {
    if (!openNow) return;
    openNow = false; if (activeHub === controller) activeHub = null;
    dialog.close();
    try { onClose(); } finally { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); }
  }
  function addTrigger(host) {
    if (host.querySelector(':scope > .mode-hub-trigger')) return;
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.className = 'mode-hub-trigger'; trigger.textContent = 'Modes';
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-label', 'Modes / choose a flight mode');
    listen(trigger, 'click', open); host.prepend(trigger); triggers.add(trigger);
  }
  function mountTriggers() {
    for (const host of document.querySelectorAll('.app-header .header-actions, .mc-header nav, .rw-header-actions')) addTrigger(host);
    for (const header of document.querySelectorAll('.solar-explorer > header, .earth-online > header, .rollout-header')) {
      let host = header.querySelector(':scope > .mode-hub-header-actions');
      if (!host) {
        host = document.createElement('div'); host.className = 'mode-hub-header-actions';
        for (const button of [...header.children].filter(child => child.tagName === 'BUTTON')) host.append(button);
        header.append(host); wrappers.add(host);
      }
      addTrigger(host);
    }
    setCurrent(current);
  }
  listen(dialog.querySelector('.mh-close'), 'click', close);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  listen(dialog, 'close', () => { if (openNow) close(); });
  const observer = new MutationObserver(mountTriggers);
  mountTriggers(); observer.observe(document.body, { childList: true, subtree: true });
  return { open, close, setCurrent, isOpen: () => openNow, destroy() {
    close(); destroyed = true; observer.disconnect(); abort.abort();
    for (const trigger of triggers) trigger.remove();
    for (const wrapper of wrappers) { while (wrapper.firstChild) wrapper.parentNode?.insertBefore(wrapper.firstChild, wrapper); wrapper.remove(); }
    dialog.remove();
  } };
}
