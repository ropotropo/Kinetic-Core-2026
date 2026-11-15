import './site-menu.css';
import { KC_MARKUP } from './brand.js';

// Kept as a literal so the portable build can embed the project's portrait.
export const AUTHOR_PORTRAIT_PATH = './assets/mykyta-portrait.jpg';

let installation;

/**
 * Install after the game header and navigation have been rendered.
 * Both callbacks must clear held inputs and explicitly pause the simulation.
 * Closing navigation never requests an automatic resume. A menu → biography
 * transition is one open/close session. Returns an idempotent controller.
 */
export function installSiteMenu({ onOpen = () => {}, onClose = () => {} } = {}) {
  if (installation) return installation;
  if (typeof onOpen !== 'function' || typeof onClose !== 'function') {
    throw new TypeError('Site menu callbacks must be functions.');
  }
  const actions = document.querySelector('.header-actions');
  const shell = document.querySelector('.game-shell');
  if (!actions || !shell) throw new Error('Install the site menu after the game header is rendered.');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'site-menu-trigger';
  trigger.setAttribute('aria-label', 'Open site menu');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'kinetic-site-menu');
  trigger.innerHTML = '<span aria-hidden="true"><i></i><i></i><i></i></span>';

  const dialog = document.createElement('dialog');
  dialog.id = 'kinetic-site-menu';
  dialog.className = 'site-menu-dialog';
  dialog.setAttribute('aria-labelledby', 'kinetic-menu-title');
  dialog.innerHTML = `<header class="site-menu-heading"><h2 id="kinetic-menu-title"><span class="menu-kc">${KC_MARKUP}</span>Kinetic Core</h2><button type="button" class="site-menu-close" aria-label="Close site menu">×</button></header><nav aria-label="Site navigation"><button type="button" data-site-game>Game</button><button type="button" data-site-guide>How to play</button><button type="button" data-site-biography>About the author</button></nav>`;

  const biography = document.createElement('section');
  biography.className = 'site-biography';
  biography.hidden = true;
  biography.setAttribute('role', 'dialog');
  biography.setAttribute('aria-modal', 'true');
  biography.setAttribute('aria-labelledby', 'kinetic-biography-title');
  biography.innerHTML = `<header class="site-biography-header"><span class="site-menu-brand"><span class="menu-kc">${KC_MARKUP}</span>Kinetic Core</span><button type="button" class="site-biography-back">Back to game</button></header><div class="site-biography-content" lang="en"><figure class="site-author-portrait"><div class="site-author-image"><img src="${AUTHOR_PORTRAIT_PATH}" alt="Микита Борисов in a spacesuit" width="1024" height="1536" loading="lazy" decoding="async"></div></figure><article class="site-author-copy"><h1 id="kinetic-biography-title" lang="uk" tabindex="-1">Микита Борисов</h1><p class="site-author-country"><span class="site-country-mark" aria-hidden="true"></span>Ukraine · 14 years old</p><p class="site-author-biography">Drawn to space, technology and the people who pursue bold goals, Mykyta believes curiosity can change the world. To him, space exploration is humanity’s greatest journey of discovery—and Kinetic Core is an invitation to be part of it.</p><p class="site-author-attribution">Created by Mykyta Borisov</p></article></div>`;
  actions.append(trigger);
  // Siblings of the game, so making the shell inert never disables the page.
  document.body.append(dialog, biography);

  let view = 'game';
  let returnFocus;
  let previousInert = false;
  let previousOverflow;
  let destroyed = false;
  const listeners = new AbortController();
  const listen = (node, event, handler, options = {}) => node.addEventListener(event, handler, { ...options, signal: listeners.signal });

  function lockScroll() {
    previousOverflow = [document.documentElement.style.getPropertyValue('overflow'), document.documentElement.style.getPropertyPriority('overflow')];
    document.documentElement.style.setProperty('overflow', 'hidden');
  }

  function open() {
    if (destroyed || view !== 'game' || shell.inert || document.querySelector('dialog[open]')) return;
    returnFocus = document.activeElement;
    onOpen();
    lockScroll();
    view = 'menu';
    trigger.setAttribute('aria-expanded', 'true');
    try {
      dialog.showModal();
      dialog.querySelector('[data-site-game]').focus();
    } catch (error) {
      close();
      throw error;
    }
  }

  function showBiography() {
    if (destroyed) return;
    if (view === 'game') open();
    if (view !== 'menu') return;
    view = 'biography';
    trigger.setAttribute('aria-expanded', 'false');
    dialog.close();
    previousInert = shell.inert;
    shell.inert = true;
    biography.hidden = false;
    biography.querySelector('h1').focus({ preventScroll: true });
  }

  function close() {
    if (view === 'game') return;
    const wasBiography = view === 'biography';
    view = 'game';
    if (dialog.open) dialog.close();
    biography.hidden = true;
    if (wasBiography) shell.inert = previousInert;
    trigger.setAttribute('aria-expanded', 'false');
    if (previousOverflow[0]) document.documentElement.style.setProperty('overflow', ...previousOverflow);
    else document.documentElement.style.removeProperty('overflow');
    try {
      onClose();
    } finally {
      const target = returnFocus?.isConnected && !returnFocus.closest('[inert]') ? returnFocus : trigger;
      target.focus({ preventScroll: true });
    }
  }

  listen(trigger, 'click', open);
  listen(dialog.querySelector('.site-menu-close'), 'click', close);
  listen(dialog.querySelector('[data-site-game]'), 'click', close);
  listen(dialog.querySelector('[data-site-guide]'), 'click', () => { close(); document.getElementById('guide-button').click(); });
  listen(dialog.querySelector('[data-site-biography]'), 'click', showBiography);
  listen(biography.querySelector('button'), 'click', close);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  listen(dialog, 'close', () => { if (view === 'menu' && !dialog.open) close(); });
  listen(dialog, 'click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  // The game's window keydown handler otherwise toggles pause on Escape and
  // interprets Space/G/B while an overlay is focused. Keyup still releases keys.
  listen(window, 'keydown', event => {
    if (view === 'game') return;
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) close();
    } else if (view === 'biography' && event.key === 'Tab') {
      event.preventDefault();
      biography.querySelector('button').focus();
    }
  }, { capture: true });
  listen(document, 'focusin', event => {
    if (view === 'biography' && !biography.contains(event.target)) biography.querySelector('button').focus();
  });

  // Only presentation text in existing identity/credits/map scopes is changed.
  // Text-node edits preserve links, scientific credit and existing listeners.
  const scopes = '.identity, #model-section, #guide-dialog .eyebrow, .navigation-map .eyebrow';
  function rebrand(root) {
    const targets = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(scopes)) targets.push(root);
    if (root.querySelectorAll) targets.push(...root.querySelectorAll(scopes));
    for (const target of targets) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        const value = text.data
          .replace(/\bKineti Core\b/g, 'Kinetic Core');
        if (value !== text.data) text.data = value;
      }
    }
  }
  rebrand(document);
  document.title = document.title.replace(/Kineti Core/g, 'Kinetic Core');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = description.content.replace(/\bKineti Core\b/g, 'Kinetic Core');
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      const scope = element?.closest(scopes);
      if (scope) rebrand(scope);
      for (const node of record.addedNodes) rebrand(node);
    }
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });

  installation = {
    open,
    close,
    openBiography: showBiography,
    destroy() {
      if (destroyed) return;
      try { close(); } finally {
        destroyed = true;
        observer.disconnect();
        listeners.abort();
        trigger.remove();
        dialog.remove();
        biography.remove();
        installation = undefined;
      }
    },
  };
  return installation;
}
