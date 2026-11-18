import './site-menu.css';
import { icon } from './ui-icons.js';

// Existing credited project portrait; keep provenance in asset/source records.
export const AUTHOR_PORTRAIT_PATH = './assets/mykyta-portrait.jpg';
let installation;

// The guide exposes the creator directly; the full approved portrait remains
// in its existing biography dialog and retains the same pause/focus contract.
export function installSiteMenu({ onOpen = () => {}, onClose = () => {} } = {}) {
  if (installation) return installation;
  const guide = document.getElementById('guide-dialog');
  const more = document.getElementById('guide-panel-more');
  if (!guide || !more) throw new Error('Install author information after the field guide.');

  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'field-guide-author';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-label', 'About the author, Mykyta Borisov');
  trigger.innerHTML = `<span class="field-guide-author-photo" aria-hidden="true"><img src="${AUTHOR_PORTRAIT_PATH}" alt="" width="48" height="48" loading="lazy" decoding="async"></span><span class="field-guide-author-label"><strong>About the author</strong><small>Mykyta Borisov</small></span>${icon('chevron-right')}`;
  (guide.querySelector('[data-guide-author-entry]')||more).append(trigger);

  const biography = document.createElement('dialog');
  biography.className = 'site-biography'; biography.hidden = true;
  biography.setAttribute('aria-labelledby', 'kinetic-biography-title');
  biography.innerHTML = `<figure class="site-author-portrait"><img src="${AUTHOR_PORTRAIT_PATH}" alt="Mykyta Borisov in a spacesuit on an illustrative lunar surface" width="1024" height="1536" loading="lazy" decoding="async"></figure><div class="site-author-shade" aria-hidden="true"></div><header class="site-author-heading"><p class="site-author-eyebrow">The creator</p><h1 id="kinetic-biography-title" tabindex="-1">Mykyta Borisov</h1></header><button type="button" class="kc-tool site-author-close" aria-label="Close author information" title="Close author information">${icon('close')}</button><article class="site-author-copy" lang="en"><p class="site-author-country"><span class="site-country-mark" aria-hidden="true"></span>Ukraine · 14 years old</p><p class="site-author-biography">Drawn to space, technology and the people who pursue bold goals, Mykyta believes curiosity can change the world. To him, space exploration is humanity’s greatest journey of discovery—and Kinetic Core is an invitation to be part of it.</p><p class="site-author-attribution">Created by Mykyta Borisov</p></article>`;
  document.body.append(biography);

  let returnFocus, openNow = false;
  function showBiography() {
    if (openNow) return;
    returnFocus = document.activeElement; onOpen(); biography.hidden = false;
    try { biography.showModal(); }
    catch (error) { biography.hidden = true; onClose(); throw error; }
    openNow = true; biography.querySelector('.site-author-close').focus({ preventScroll: true });
  }
  function close() { if (biography.open) biography.close(); }
  function finish() {
    if (!openNow) return;
    openNow = false; biography.hidden = true; onClose();
    const target = returnFocus?.isConnected ? returnFocus : guide.open ? trigger : document.getElementById('guide-button');
    target?.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', showBiography);
  biography.querySelector('.site-author-close').addEventListener('click', close);
  biography.addEventListener('cancel', event => { event.preventDefault(); close(); });
  biography.addEventListener('close', finish);
  biography.addEventListener('keydown', event => event.stopPropagation());
  installation = { open() { document.getElementById('guide-button').click(); }, close, openBiography: showBiography,
    destroy() { close(); finish(); trigger.remove(); biography.remove(); installation = null; } };
  return installation;
}
