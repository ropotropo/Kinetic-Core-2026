// Real reference coordinates, not surveyed collision meshes or certified sites.
export const LUNAR_SITE_SOURCE = 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html';
export const LUNAR_SITES = Object.freeze([
  { id: 'tranquility', name: 'Tranquility approach', reference: 'Apollo 11', latitude: .67416, longitude: 23.47314, description: 'Mare Tranquillitatis. A broad, near-equatorial approach corridor.' },
  { id: 'ocean-storms', name: 'Ocean of Storms approach', reference: 'Apollo 12', latitude: -3.0128, longitude: -23.4219, description: 'Oceanus Procellarum. A western nearside approach.' },
  { id: 'hadley', name: 'Hadley approach', reference: 'Apollo 15', latitude: 26.13239, longitude: 3.63330, description: 'Hadley–Apennine reference. Terrain is illustrative; the rille and mountain slopes are not collision data.' },
  { id: 'taurus-littrow', name: 'Taurus–Littrow approach', reference: 'Apollo 17', latitude: 20.1911, longitude: 30.7723, description: 'Eastern nearside reference. A designated training pad; local terrain is illustrative.' },
].map(Object.freeze));
export const getLunarSite = id => LUNAR_SITES.find(site => site.id === id) ?? LUNAR_SITES[0];

export function getPracticeSites(destination) {
  const ice=destination==='europa'||['enceladus','ganymede','rhea','triton'].includes(destination);
  return [
    {id:'survey-plain',name:ice?'Ice plain rehearsal':'Survey plain rehearsal',description:'Fictional flat training zone. Moderate initial lateral offset.',offset:80,horizontalSpeed:0},
    {id:'ridge-approach',name:ice?'Fracture-field approach':'Ridge approach rehearsal',description:'Fictional surveyed pad with a larger approach offset and initial drift. Surface geometry is illustrative.',offset:160,horizontalSpeed:2},
    {id:'crater-margin',name:ice?'Chaos-margin rehearsal':'Crater-margin rehearsal',description:'Fictional pad approached from the opposite direction. No claim of an approved landing site.',offset:-140,horizontalSpeed:-1.5},
  ];
}
