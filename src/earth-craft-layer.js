import * as THREE from 'three';

const MERCATOR_LATITUDE = 85.0511287798066;

// Fictional hardware, in metres. The hull radius is 1.5; deployed legs extend
// beyond it. All solid hardware is within Y=0..15, with the feet on Y=0.
function makeCraft() {
  const root = new THREE.Group();
  root.name = 'earth-craft';
  root.visible = false;
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f7, roughness: 0.46, metalness: 0.12 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa1a1a8, roughness: 0.36, metalness: 0.78 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x202025, roughness: 0.66, metalness: 0.22 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: 0.18, metalness: 0.48 });
  const navigation = new THREE.MeshStandardMaterial({ color: 0x9bcaff, roughness: 0.45, metalness: 0.2 });
  function mesh(name, geometry, material, x = 0, y = 0, z = 0, parent = root) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function ring(name, radius, tube, y, material = metal) {
    const object = mesh(name, new THREE.TorusGeometry(radius, tube, 8, 64), material, 0, y);
    object.rotation.x = Math.PI / 2;
    return object;
  }
  function strut(name, start, end, radius, material) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const object = mesh(name, new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material);
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  }

  mesh('ceramic-tank', new THREE.CylinderGeometry(1.5, 1.5, 8.3, 64), white, 0, 6.95);
  mesh('aft-skirt', new THREE.CylinderGeometry(1.5, 1.33, 0.7, 64), carbon, 0, 2.45);
  mesh('capsule-shoulder', new THREE.CylinderGeometry(1.22, 1.5, 1.3, 64), white, 0, 11.75);
  mesh('conical-capsule', new THREE.ConeGeometry(1.22, 2.6, 64), white, 0, 13.7);
  for (const y of [2.82, 5.1, 8.9, 11.05, 12.4]) ring('hull-seam', y > 12 ? 1.22 : 1.49, 0.022, y);
  ring('aft-collar', 1.4, 0.065, 2.17, carbon);

  // Three forward windows on the capsule shoulder, looking toward local -Z.
  for (const angle of [-0.52, 0, 0.52]) {
    const x = Math.sin(angle), z = -Math.cos(angle);
    const bezel = mesh('window-bezel', new THREE.BoxGeometry(0.52, 0.56, 0.1), metal, x * 1.36, 11.75, z * 1.36);
    bezel.rotation.y = -angle;
    const window = mesh('dark-window', new THREE.BoxGeometry(0.4, 0.42, 0.11), glass, x * 1.39, 11.75, z * 1.39);
    window.rotation.y = -angle;
  }

  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.sin(angle), z = Math.cos(angle);
    strut('landing-leg', [x * 1.28, 3.8, z * 1.28], [x * 2.65, 0.22, z * 2.65], 0.105, metal);
    strut('landing-brace', [x * 1.35, 2.2, z * 1.35], [x * 2.45, 0.65, z * 2.45], 0.065, carbon);
    mesh('leg-hinge', new THREE.SphereGeometry(0.18, 12, 8), metal, x * 1.28, 3.8, z * 1.28);
    const foot = mesh('landing-foot', new THREE.CylinderGeometry(0.34, 0.43, 0.16, 16), carbon, x * 2.65, 0.08, z * 2.65);
    foot.rotation.y = angle;
    // Small exposed service lines and panel fasteners give the hull scale.
    strut('service-line', [x * 1.505, 3.1, z * 1.505], [x * 1.505, 8.4, z * 1.505], 0.025, metal);
    for (const y of [3, 5.2, 8.8, 10.85]) {
      mesh('panel-fastener', new THREE.SphereGeometry(0.045, 8, 6), metal, x * 1.5, y, z * 1.5);
    }
  }
  mesh('engine-mount', new THREE.CylinderGeometry(0.84, 0.65, 0.7, 32), metal, 0, 1.95);
  mesh('engine-bell', new THREE.CylinderGeometry(0.34, 0.84, 1.15, 48, 1, true), metal, 0, 1.075);
  ring('nozzle-rim', 0.84, 0.045, 0.5);
  mesh('nozzle-interior', new THREE.CircleGeometry(0.79, 48), carbon, 0, 0.56).rotation.x = Math.PI / 2;

  // A single blue forward fin and a raised arrow make yaw readable in VTOL.
  const finShape = new THREE.Shape();
  finShape.moveTo(-1.42, 4.1);
  finShape.lineTo(-2.15, 4.1);
  finShape.lineTo(-1.42, 6.4);
  finShape.closePath();
  const fin = mesh('forward-heading-fin', new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: false }), navigation);
  // Shape X becomes local Z: the fin protrudes north (-Z), never along +Z.
  fin.rotation.y = -Math.PI / 2;
  fin.position.x = 0.05;
  const pointer = mesh('heading-pointer', new THREE.ConeGeometry(0.19, 0.72, 3), navigation, 0, 10.1, -1.53);
  pointer.rotation.x = -Math.PI / 2;

  const exhaust = new THREE.Group();
  exhaust.name = 'thrust-exhaust';
  exhaust.position.y = 0.49;
  exhaust.visible = false;
  root.add(exhaust);
  const plumeMaterial = new THREE.MeshBasicMaterial({ color: 0x8fcaff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5ff, transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending });
  // Cone tips point down; each plume begins at the nozzle, not at its centre.
  const plume = mesh('exhaust-plume', new THREE.ConeGeometry(0.73, 1, 32), plumeMaterial, 0, -0.5, 0, exhaust);
  plume.rotation.z = Math.PI;
  const core = mesh('exhaust-core', new THREE.ConeGeometry(0.4, 1, 24), coreMaterial, 0, -0.5, 0, exhaust);
  core.rotation.z = Math.PI;
  return { root, exhaust, plumeMaterial, coreMaterial };
}

/**
 * MapLibre 5.6.1 Mercator-only custom layer; Three.js r187, no DOM/assets.
 * getState(): null hides the craft. Otherwise supply lat/lng, altitude
 * (feet altitude in metres MSL), heading (radians clockwise from north),
 * optional tilt (radians toward heading; omitted/non-finite becomes zero),
 * thrustFraction (0..1) and phase. Landed/crashed always suppress exhaust.
 * Local axes: +X east, +Y up, -Z north. T * S(s,-s,s) * Rx(PI/2)
 * maps these to Mercator; root yaw is -heading, so PI/2 points east.
 * Caller sets Mercator projection and requests the first repaint on activation.
 */
export function createEarthCraftLayer(lib, getState) {
  if (!lib?.MercatorCoordinate?.fromLngLat || typeof getState !== 'function') {
    throw new TypeError('createEarthCraftLayer requires MapLibre and a state getter.');
  }
  let craft = makeCraft();
  let scene, camera, renderer, map;
  let renderedFrames = 0, active = false;
  const local = new THREE.Matrix4();
  const orientation = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const scaleVector = new THREE.Vector3();

  return {
    id: 'kinetic-earth-craft',
    type: 'custom',
    renderingMode: '3d',
    // Read-only accessors for inspection; the layer retains resource ownership.
    get root() { return craft?.root ?? null; },
    get diagnostics() { return Object.freeze({ active, renderedFrames, attached: Boolean(renderer) }); },

    onAdd(nextMap, gl) {
      if (renderer) this.onRemove();
      craft ??= makeCraft();
      map = nextMap;
      scene = new THREE.Scene();
      camera = new THREE.Camera();
      scene.add(craft.root);
      scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x62616a, 2.3));
      const sun = new THREE.DirectionalLight(0xffffff, 3.2);
      sun.position.set(-30, 60, -40);
      scene.add(sun);
      const rim = new THREE.DirectionalLight(0xadcfff, 1.3);
      rim.position.set(25, 15, 30);
      scene.add(rim);
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      renderer.autoClearColor = false;
      renderer.autoClearDepth = false;
      renderer.autoClearStencil = false;
      map.triggerRepaint();
    },

    render(gl, args) {
      active = false;
      if (!renderer || !craft) return;
      craft.root.visible = false;
      craft.exhaust.visible = false;
      const state = getState();
      if (!state) return;
      const altitude = state.altitude;
      const heading = state.heading ?? 0;
      const tilt = Number.isFinite(state.tilt) ? state.tilt : 0;
      const thrust = state.thrustFraction ?? 0;
      const matrix = args?.defaultProjectionData?.mainMatrix;
      if (![state.lng, state.lat, altitude, heading, tilt, thrust].every(Number.isFinite)
        || Math.abs(state.lat) > MERCATOR_LATITUDE
        || !matrix || matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite)) return;
      // Do not attempt to apply a Mercator matrix during globe inspection.
      const projection = map.getProjection?.();
      if (projection && projection.type !== 'mercator') return;
      const coordinate = lib.MercatorCoordinate.fromLngLat({ lng: state.lng, lat: state.lat }, altitude);
      const s = coordinate.meterInMercatorCoordinateUnits();
      if (![coordinate.x, coordinate.y, coordinate.z, s].every(Number.isFinite) || s <= 0) return;
      local.makeTranslation(coordinate.x, coordinate.y, coordinate.z)
        .scale(scaleVector.set(s, -s, s)).multiply(orientation);
      camera.projectionMatrix.fromArray(matrix).multiply(local);
      // MapLibre's matrix already includes its view transform. Keep the Three
      // camera view at identity to avoid applying that view twice. This inverse
      // matches the combined projection, not the physical map camera pose;
      // view-dependent material highlights use the identity-camera approximation.
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      craft.root.rotation.set(-tilt, -(heading % (2 * Math.PI)), 0, 'YXZ');
      craft.root.visible = true;
      const fraction = state.phase === 'landed' || state.phase === 'crashed' ? 0 : THREE.MathUtils.clamp(thrust, 0, 1);
      craft.exhaust.visible = fraction > 0;
      if (fraction > 0) {
        const seconds = performance.now() * 0.001;
        const flicker = 1 + 0.045 * Math.sin(seconds * 47) + 0.025 * Math.sin(seconds * 79);
        const width = 0.55 + 0.45 * fraction;
        craft.exhaust.scale.set(width, (0.45 + 5.5 * fraction) * flicker, width);
        craft.plumeMaterial.opacity = 0.2 + 0.3 * fraction;
        craft.coreMaterial.opacity = 0.55 + 0.35 * fraction;
      }
      active = true;
      // Share the existing colour/depth buffers: no clear(), clearDepth(), size
      // changes or separate animation loop. Buildings retain depth occlusion.
      renderer.resetState();
      try {
        renderer.render(scene, camera);
        renderedFrames++;
      } finally {
        renderer.resetState();
      }
    },

    onRemove() {
      active = false;
      if (craft) {
        const geometries = new Set(), materials = new Set();
        craft.root.traverse(object => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) {
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
          }
        });
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        craft.root.removeFromParent();
        craft.root.clear();
      }
      // dispose() releases this renderer's resources/listeners, without calling
      // forceContextLoss(): MapLibre continues owning the shared GL context.
      renderer?.dispose();
      scene?.clear();
      craft = scene = camera = renderer = map = null;
    },
  };
}
