import { DESTINATIONS } from './destinations.js';
import { BODY_TEXTURE_PATHS } from './celestial.js';
import { icon } from './ui-icons.js';
import { readLandingCounts, LANDING_COUNTS_KEY } from './player-progress.js';
import './destination-carousel.css';

const landingWorlds = new Set(DESTINATIONS.map(world => world.id));
// A shared image rail; the atlas can provide survey bodies without acquiring
// landing capability, a second renderer, or a second source of progress data.
export function installDestinationCarousel({ select, dialog, bodies = DESTINATIONS,
  heading = 'Choose your world', ariaLabel = 'Landing worlds',
  actionLabel = body => `Land on ${body.name}`, isOpen = () => !!dialog.open } = {}) {
  if (!select || !dialog) return null;
  const group = document.createElement('section'); group.className = 'world-carousel';
  group.innerHTML = `<div class="world-carousel-heading"><span></span><div><button type="button" data-world-step="-1" aria-label="Previous body">${icon('chevron-left')}</button><button type="button" data-world-step="1" aria-label="Next body">${icon('chevron-right')}</button></div></div><div class="world-rail" role="group"></div>`;
  group.querySelector('.world-carousel-heading > span').textContent = heading;
  const rail = group.querySelector('.world-rail'); rail.setAttribute('aria-label', ariaLabel);
  const enclosingLabel = select.closest('label'), previousHidden = select.hidden, labelHidden = enclosingLabel?.hidden;
  (enclosingLabel ?? select).after(group); select.hidden = true;
  if (enclosingLabel) enclosingLabel.hidden = true;
  const explicitLabel = select.id ? dialog.querySelector(`label[for="${select.id}"]`) : null;
  const explicitHidden = explicitLabel?.hidden; if (explicitLabel) explicitLabel.hidden = true;
  let signature = '';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function refreshCounts() {
    const counts = readLandingCounts();
    for (const button of rail.querySelectorAll('[data-world]')) {
      const count = counts[button.dataset.landingWorld] || 0, badge = button.querySelector('.world-landings');
      badge.hidden = !count; badge.querySelector('span').textContent = count > 999 ? '999+' : String(count);
      button.setAttribute('aria-label', button.dataset.baseLabel + (count ? `. ${count.toLocaleString('en-US')} successful landing${count === 1 ? '' : 's'}` : ''));
    }
  }
  function sync(scroll = false) {
    const buttons = [...rail.querySelectorAll('[data-world]')];
    const index = buttons.findIndex(button => button.dataset.world === select.value);
    for (const button of buttons) {
      const active = button.dataset.world === select.value;
      button.setAttribute('aria-pressed', String(active)); button.tabIndex = active ? 0 : -1;
      if (active && scroll && isOpen()) button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'instant' : 'smooth' });
    }
    group.querySelector('[data-world-step="-1"]').disabled = index <= 0;
    group.querySelector('[data-world-step="1"]').disabled = index < 0 || index >= buttons.length - 1;
  }
  function choose(id, focus = false) {
    if (!Array.from(select.options).some(option => option.value === id && !option.disabled)) return;
    select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); sync(true);
    if (focus) rail.querySelector(`[data-world="${id}"]`)?.focus({ preventScroll: true });
  }
  function render(scroll = false) {
    const metadata = new Map((typeof bodies === 'function' ? bodies() : bodies).map(body => [String(body.id), body]));
    const choices = Array.from(select.options).filter(option => !option.disabled).map(option => ({ option, body: metadata.get(option.value) })).filter(item => item.body);
    const next = JSON.stringify(choices.map(({ option, body }) => [option.value, body.name, body.parent, body.color, body.textureKey, body.landingId, body.subtitle]));
    if (signature !== next) {
      signature = next; rail.replaceChildren();
      for (const { option, body } of choices) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'world-choice';
        button.dataset.world = option.value; button.dataset.worldName = body.name; button.dataset.baseLabel = actionLabel(body);
        const landingId = body.landingId === undefined ? body.id : body.landingId;
        button.dataset.landingWorld = landingWorlds.has(landingId) ? landingId : '';
        button.dataset.landingAvailable = String(!!button.dataset.landingWorld);
        const key = body.textureKey ?? body.id;
        const globe = document.createElement('span'); globe.className = `world-globe world-globe-${String(key).replace(/[^a-z0-9-]/gi, '-')}`; globe.setAttribute('aria-hidden', 'true');
        globe.style.setProperty('--world-color', body.color ?? '#97999e');
        const map = BODY_TEXTURE_PATHS[key]; if (map) globe.style.backgroundImage = `url("${new URL(map, document.baseURI).href}")`;
        const badge = document.createElement('span'); badge.className = 'world-landings'; badge.hidden = true; badge.innerHTML = `${icon('land')}<span></span>`; globe.append(badge);
        const name = document.createElement('strong'); name.textContent = body.name; name.title = body.name;
        const parent = document.createElement('small'); parent.textContent = body.subtitle ?? (body.parent === body.name ? 'Planet' : `${body.parent} system`);
        button.append(globe, name, parent); button.addEventListener('click', () => choose(option.value)); rail.append(button);
      }
    }
    refreshCounts(); sync(scroll && isOpen());
  }
  function step(direction) {
    const buttons = [...rail.querySelectorAll('[data-world]')], index = buttons.findIndex(button => button.dataset.world === select.value);
    const next = Math.max(0, Math.min(buttons.length - 1, index + direction));
    if (buttons[next]) choose(buttons[next].dataset.world, true);
  }
  group.querySelectorAll('[data-world-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.worldStep))));
  rail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const buttons = [...rail.querySelectorAll('[data-world]')]; if (!buttons.length) return;
    if (event.key === 'Home' || event.key === 'End') choose((event.key === 'Home' ? buttons[0] : buttons.at(-1)).dataset.world, true);
    else step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  const onChange = () => sync(), onStorage = event => { if (event.key === null || event.key === LANDING_COUNTS_KEY) refreshCounts(); };
  select.addEventListener('change', onChange); document.addEventListener('kc:milestone', refreshCounts); document.addEventListener('kc:landing-progress', refreshCounts); window.addEventListener('storage', onStorage);
  const observer = new MutationObserver(() => render(true)); observer.observe(select, { childList: true }); observer.observe(dialog, { attributes: true, attributeFilter: ['open', 'hidden'] }); render();
  return { element: group, render, sync, destroy() { observer.disconnect(); select.removeEventListener('change', onChange); document.removeEventListener('kc:milestone', refreshCounts); document.removeEventListener('kc:landing-progress', refreshCounts); window.removeEventListener('storage', onStorage); group.remove(); select.hidden = previousHidden; if (enclosingLabel) enclosingLabel.hidden = labelHidden; if (explicitLabel) explicitLabel.hidden = explicitHidden; } };
}
