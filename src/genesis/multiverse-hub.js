// src/genesis/multiverse-hub.js
// MULTIVERSE HUB — the navigable space beyond the sky
// Fills the black void (scene.background 0x010008) with a scattered field of
// realm orbs connected by Weave threads. Zoom past the sky → enter hub.
// Click an orb → fly in + transitionTo that realm's stratum.
// Flag-gated by window.__GENESIS_MULTIVERSE_HUB (default ON).

import * as THREE from 'three';

const SKY_THRESHOLD = 640;       // Y above which hub becomes visible
const HUB_RADIUS = 1200;         // scatter radius of orbs
const ORB_HOVER_SCALE = 1.4;

export function createMultiverseHub(ctx = {}) {
  const THREE = ctx.THREE || window.THREE;
  const scene = ctx.scene;
  const camera = ctx.camera;
  const Genesis = ctx.Genesis;
  if (!THREE || !scene) { if (typeof console !== 'undefined') console.warn('[MultiverseHub] needs THREE + scene'); return null; }

  const hubGroup = new THREE.Group();
  hubGroup.name = 'multiverse-hub';
  hubGroup.visible = false;
  hubGroup.userData.verticalStratumId = 'multiverse-hub';
  hubGroup.userData.verticalState = 'LOADED';
  scene.add(hubGroup);

  const orbs = [];           // { mesh, ring, label, realm, baseScale, hovered }
  const threads = [];        // line meshes
  let starfield = null;
  let active = false;
  let transitionTarget = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // ---- Starfield backdrop ----
  function buildStarfield() {
    const count = 4000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3000 + Math.random() * 4000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const c = 0.5 + Math.random() * 0.5;
      col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = c * (0.8 + Math.random() * 0.2);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 3, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
    starfield = new THREE.Points(geo, mat);
    starfield.name = 'multiverse-starfield';
    hubGroup.add(starfield);
  }

  // ---- Realm orb ----
  function makeLabel(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx2d = canvas.getContext('2d');
    ctx2d.fillStyle = 'rgba(0,0,0,0.6)';
    ctx2d.fillRect(0, 0, 512, 128);
    ctx2d.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
    ctx2d.font = 'bold 36px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(40, 10, 1);
    return spr;
  }

  function registerRealm(realm, options = {}) {
    if (!realm) return null;
    // Orb mesh
    const geo = new THREE.SphereGeometry(realm.orb.size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: realm.orb.color,
      emissive: realm.orb.color,
      emissiveIntensity: 0.6,
      metalness: 0.3, roughness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.realmId = realm.id;
    mesh.userData.isRealmOrb = true;

    // Halo ring
    const ringGeo = new THREE.TorusGeometry(realm.orb.size * 1.6, 0.4, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: realm.orb.glow, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;

    const pos = options.position || { x: 0, y: 0, z: 0 };
    mesh.position.set(pos.x, pos.y, pos.z);
    ring.position.copy(mesh.position);

    const label = makeLabel(realm.name, realm.orb.glow);
    label.position.set(pos.x, pos.y + realm.orb.size + 12, pos.z);

    hubGroup.add(mesh);
    hubGroup.add(ring);
    hubGroup.add(label);

    const entry = { mesh, ring, label, realm, baseScale: 1, hovered: false };
    orbs.push(entry);

    // WeaveBridge registration
    if (Genesis && Genesis.WeaveBridge) {
      Genesis.WeaveBridge.registerRealm(realm.id, {
        name: realm.name, type: realm.type, plt: realm.plt, mechanics: realm.mechanics, seed: realm.seed
      });
    }
    // Vertical stack stratum (so transitionTo works)
    if (Genesis && Genesis.VerticalStackManager && options.root) {
      Genesis.VerticalStackManager.registerStratum(realm.id, options.root, { state: 'UNLOADED', role: realm.name });
    }
    return entry;
  }

  // ---- Weave threads between orbs ----
  function buildThreads() {
    for (let i = 0; i < orbs.length; i++) {
      for (let j = i + 1; j < orbs.length; j++) {
        if (Math.random() > 0.35) continue; // sparse connectivity
        const a = orbs[i].mesh.position, b = orbs[j].mesh.position;
        const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
        const mat = new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.12 });
        const line = new THREE.Line(geo, mat);
        line.userData.pulse = Math.random() * Math.PI * 2;
        hubGroup.add(line);
        threads.push(line);
      }
    }
  }

  // ---- Visibility driven by camera Y ----
  function setActive(on) {
    if (on === active) return;
    active = on;
    hubGroup.visible = on;
    if (Genesis && Genesis.VerticalStackManager) {
      // Mark hub as the active stratum when in it
      if (on && Genesis.VerticalStackManager.getActive() !== 'multiverse-hub') {
        // hub is an overlay; we don't force stratum change, just visibility
      }
    }
  }

  function update(dt, camPos) {
    if (!active) return;
    const t = performance.now() * 0.001;
    // Animate orbs
    for (const o of orbs) {
      o.mesh.rotation.y += dt * 0.2;
      const pulse = 1 + Math.sin(t * o.realm.orb.pulseSpeed + o.mesh.id) * 0.04;
      const target = o.hovered ? ORB_HOVER_SCALE : 1;
      o.baseScale += (target - o.baseScale) * Math.min(1, dt * 8);
      o.mesh.scale.setScalar(pulse * o.baseScale);
      o.ring.rotation.z += dt * 0.3;
      o.ring.material.opacity = 0.4 + Math.sin(t * 2 + o.mesh.id) * 0.15;
      // label faces camera
      o.label.position.copy(o.mesh.position);
      o.label.position.y += o.realm.orb.size + 12;
    }
    // Animate threads
    for (const line of threads) {
      line.userData.pulse += dt;
      line.material.opacity = 0.08 + (Math.sin(line.userData.pulse * 2) * 0.5 + 0.5) * 0.12;
    }
    if (starfield) starfield.rotation.y += dt * 0.005;
  }

  // ---- Click handling ----
  function handleClick(clientX, clientY) {
    if (!active || !camera) return null;
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = orbs.map(o => o.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const realmId = hits[0].object.userData.realmId;
      const entry = orbs.find(o => o.realm.id === realmId);
      return entry ? entry.realm : null;
    }
    return null;
  }

  function handleHover(clientX, clientY) {
    if (!active || !camera) return;
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = orbs.map(o => o.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    for (const o of orbs) o.hovered = false;
    if (hits.length > 0) {
      const realmId = hits[0].object.userData.realmId;
      const entry = orbs.find(o => o.realm.id === realmId);
      if (entry) entry.hovered = true;
    }
  }

  // ---- Build initial hub from realm list ----
  function build(realmList, positionFn) {
    // clear existing
    for (const o of orbs) { hubGroup.remove(o.mesh); hubGroup.remove(o.ring); hubGroup.remove(o.label); }
    orbs.length = 0;
    for (const line of threads) hubGroup.remove(line);
    threads.length = 0;

    buildStarfield();
    const total = realmList.length;
    realmList.forEach((realm, i) => {
      const pos = positionFn ? positionFn(i, total, HUB_RADIUS) : { x: 0, y: 0, z: 0 };
      registerRealm(realm, { position: pos });
    });
    buildThreads();
    return orbs.length;
  }

  function summary() {
    return {
      active,
      visible: hubGroup.visible,
      orbCount: orbs.length,
      threadCount: threads.length,
      realms: orbs.map(o => ({ id: o.realm.id, name: o.realm.name, type: o.realm.type }))
    };
  }

  return {
    group: hubGroup,
    build,
    registerRealm,
    update,
    setActive,
    handleClick,
    handleHover,
    isActive: () => active,
    SKY_THRESHOLD,
    HUB_RADIUS,
    summary
  };
}

export function install(Genesis, THREE, camera, scene) {
  if (!Genesis) return null;
  if (Genesis.MultiverseHub) return Genesis.MultiverseHub;
  if (!window.__GENESIS_MULTIVERSE_HUB && window.__GENESIS_MULTIVERSE_HUB !== undefined) return null;

  const hub = createMultiverseHub({ THREE: THREE || window.THREE, scene: scene || window.__genesisScene, camera, Genesis });
  if (!hub) { if (typeof console !== 'undefined') console.warn('[MultiverseHub] scene unavailable'); return null; }

  Genesis.MultiverseHub = hub;
  if (typeof Genesis.registerModule === 'function') {
    Genesis.registerModule('multiverse-hub', { status: 'validated', path: './src/genesis/multiverse-hub.js' });
  }
  if (typeof console !== 'undefined') console.log('[MultiverseHub] Initialized — void beyond sky is now navigable');
  return hub;
}
