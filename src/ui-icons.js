import './ui-kit.css';
const paths = {
  time:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  missions:'<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
  rocket:'<path d="M9 16V8l3-5 3 5v8M9 12l-3 4v3l3-2m6-5 3 4v3l-3-2M10 21v-2m4 2v-2"/>',
  moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  dock:'<path d="M3 7h4v10H3m18-10h-4v10h4M7 12h10m-7-4v8m4-8v8"/><circle cx="12" cy="12" r="10"/>',
  land:'<path d="M8 10h8v6H8zM8 13l-4 7m12-7 4 7M2 21h5m10 0h5M12 2v6m-3-3 3 3 3-3"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  camera:'<path d="M3 7h5l2-3h4l2 3h5v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3v.1"/>',
  pause:'<path d="M9 5v14m6-14v14"/>',
  power:'<path d="M12 3v9M7.1 5.6a8 8 0 1 0 9.8 0"/>',
  play:'<path d="m8 4 12 8-12 8V4Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  back:'<path d="m14 5-7 7 7 7M7 12h14"/>',
  reset:'<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
  expand:'<path d="M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  save:'<path d="M4 3h13l3 3v15H4V3Zm3 0v6h9V3M7 21v-8h10v8"/>',
  restore:'<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6m2-3v5l3 2"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  chevron:'<path d="m8 4 8 8-8 8"/>',
  wrench:'<path d="M14 4a6 6 0 0 0-6 8L3 17l4 4 5-5a6 6 0 0 0 8-7l-4 4-5-5 4-4Z"/>',
  stage:'<path d="M7 3h10v6H7V3Zm0 12h10v6H7v-6ZM4 12h16m-8-3v6"/>',
  orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-30 12 12)"/>',
  chart:'<path d="M3 3v18h18M6 16l5-6 4 3 6-9"/>',
  sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  flag:'<path d="M5 22V3m0 0c6-4 8 4 15 0v11c-7 4-9-4-15 0"/>',
  'chevron-down':'<path d="m5 9 7 7 7-7"/>',
  'arrow-up':'<path d="M12 21V3m-7 7 7-7 7 7"/>',
  'arrow-down':'<path d="M12 3v18m-7-7 7 7 7-7"/>',
  'chevron-left':'<path d="m15 5-7 7 7 7"/>',
  'chevron-right':'<path d="m9 5 7 7-7 7"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  minus:'<path d="M4 12h16"/>'
};
paths['arrow-left']=paths.back;paths.rotate=paths.orbit;
export function icon(name) {
  return `<svg class="kc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]??paths.info}</svg>`;
}
