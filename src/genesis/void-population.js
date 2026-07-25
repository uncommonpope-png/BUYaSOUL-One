// src/genesis/void-population.js
// VOID POPULATION — randomized multiverse objects in the void beyond the city.
// Spawns Lost-World-mechanic structures (realms, monoliths, beacons, fractals)
// scattered across the void at distances 400-2000 from city center.
// Seeded so each world gets a unique void layout.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';

const VOID_MIN_DIST = 400;
const VOID_MAX_DIST = 2000;
const VOID_DENSITY = 60;      // total objects to attempt spawning
const VOID_SEED_KEY = 'cpl-void-seed';

// Lost World mechanic pools (from realm-generator.js + camera-portal.js)
const REALM_PREFIXES = ['Neon','Shadow','Crystal','Void','Ember','Frost','Storm','Soul','Cosmic','Phantom','Aether','Obsidian'];
const REALM_SUFFIXES = ['Nexus','Arena','Spire','Vault','Citadel','Sanctum','Forge','Bastion','Archives','Colosseum','Garden','Rift'];
const MECHANICS_POOL = ['combat','breeding','districts','conversation','building','trading','exploration','crafting','governance','economy'];
const PLT_BASE = { profit: 1.0, love: 1.0, tax: 1.0 };

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export function install(Genesis) {
  if (!Genesis) return null;
  if (Genesis.VoidPopulation) return Genesis.VoidPopulation;

  const T = window.THREE;
  if (!T) return null;

  let root = null;
  let camera = null;
  let scene = null;
  let controls = null;
  const realms = [];

  function flagOn() {
    return typeof window !== 'undefined' && window.__GENESIS_VOID_POPULATION !== false;
  }

  function getSeed() {
    try {
      const saved = localStorage.getItem(VOID_SEED_KEY);
      if (saved) return Number(saved);
    } catch (_) {}
    const seed = Math.floor(Math.random() * 999999) + 1;
    try { localStorage.setItem(VOID_SEED_KEY, String(seed)); } catch (_) {}
    return seed;
  }

  function generateRealmConfig(name, rng) {
    const mechanicsCount = 3 + Math.floor(rng() * 4);
    const mechanics = [];
    for (let i = 0; i < mechanicsCount; i++) {
      const m = pickRandom(MECHANICS_POOL, rng);
      if (!mechanics.includes(m)) mechanics.push(m);
    }
    const boost = Math.floor(rng() * 100);
    return {
      name,
      mechanics,
      plt: {
        profit: PLT_BASE.profit + (boost % 30) / 50,
        love: PLT_BASE.love + ((boost + 17) % 40) / 50,
        tax: PLT_BASE.tax + ((boost + 31) % 20) / 50
      },
      soulSpectrum: Math.floor(rng() * 7) + 3,
      gravity: 9.8 + (rng() * 10),
      timeScale: 0.8 + rng() * 0.4
    };
  }

  function makeVoidBuilding(x, z, rng) {
    const isTower = rng() > 0.6;
    const w = isTower ? 6 + rng() * 10 : 12 + rng() * 14;
    const d = isTower ? 6 + rng() * 10 : 12 + rng() * 14;
    const h = isTower ? 30 + rng() * 120 : 8 + rng() * 30;
    const hue = Math.floor(rng() * 0x333344);
    const color = 0x0a0a1e + hue;
    const emissive = 0x06061a + Math.floor(hue * 0.6);
    const geo = new T.BoxGeometry(w, h, d);
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.1, emissive, emissiveIntensity: 0.3 });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeVoidMonolith(x, z, rng) {
    const height = 20 + rng() * 80;
    const radius = 2 + rng() * 4;
    const geo = new T.CylinderGeometry(radius * 0.3, radius, height, 6);
    const colorHex = [0x66ffff, 0xff66ff, 0xffaa44, 0x44ff88, 0xaa88ff][Math.floor(rng() * 5)];
    const mat = new T.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.7 });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    return mesh;
  }

  function makeVoidBeacon(x, z, rng) {
    const height = 40 + rng() * 100;
    const group = new T.Group();
    // Pillar
    const pillarGeo = new T.CylinderGeometry(0.5, 0.8, height, 8);
    const pillarMat = new T.MeshStandardMaterial({ color: 0x222244, emissive: 0x111133, roughness: 0.5, metalness: 0.3 });
    const pillar = new T.Mesh(pillarGeo, pillarMat);
    pillar.position.y = height / 2;
    group.add(pillar);
    // Orb at top
    const orbGeo = new T.SphereGeometry(2 + rng() * 3, 12, 8);
    const orbColor = [0x66ffff, 0xff66ff, 0xffd700, 0x44ff88][Math.floor(rng() * 4)];
    const orbMat = new T.MeshStandardMaterial({ color: orbColor, emissive: orbColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = height + 2;
    group.add(orb);
    // Point light
    const light = new T.PointLight(orbColor, 0.6, 30);
    light.position.y = height + 2;
    group.add(light);
    group.position.set(x, 0, z);
    return group;
  }

  function makeVoidFractalNode(x, z, rng) {
    const scale = 3 + rng() * 8;
    const detail = Math.floor(rng() * 3);
    const geoType = Math.floor(rng() * 3);
    let geo;
    if (geoType === 0) geo = new T.IcosahedronGeometry(scale, detail);
    else if (geoType === 1) geo = new T.OctahedronGeometry(scale, detail);
    else geo = new T.DodecahedronGeometry(scale, detail);
    const hue = rng();
    const color = new T.Color().setHSL(hue, 0.7, 0.5);
    const mat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, wireframe: rng() > 0.5, roughness: 0.3, metalness: 0.4 });
    const mesh = new T.Mesh(geo, mat);
    const y = 10 + rng() * 60;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    return mesh;
  }

  function makeVoidRealmMarker(x, z, config, rng) {
    const group = new T.Group();
    // Floating ring
    const ringGeo = new T.TorusGeometry(8, 0.6, 8, 32);
    const ringColor = [0x66ffff, 0xff66ff, 0xffd700, 0x44ff88, 0xaa88ff][Math.floor(rng() * 5)];
    const ringMat = new T.MeshStandardMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 1.0, transparent: true, opacity: 0.6 });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 25;
    group.add(ring);
    // Core sphere
    const coreGeo = new T.SphereGeometry(3, 12, 8);
    const coreMat = new T.MeshStandardMaterial({ color: ringColor, emissive: ringColor, emissiveIntensity: 1.2 });
    const core = new T.Mesh(coreGeo, coreMat);
    core.position.y = 25;
    group.add(core);
    // Beacon beam
    const beamGeo = new T.CylinderGeometry(0.3, 0.3, 80, 4);
    const beamMat = new T.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.25 });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = 40;
    group.add(beam);
    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#' + ringColor.toString(16).padStart(6, '0');
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.name, 256, 50);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText(config.mechanics.join(' · '), 256, 90);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(30, 8, 1);
    label.position.y = 40;
    group.add(label);
    // Light
    const light = new T.PointLight(ringColor, 0.8, 40);
    light.position.y = 25;
    group.add(light);
    group.position.set(x, 0, z);
    return group;
  }

  function makeVoidStarCluster(x, z, rng) {
    const group = new T.Group();
    const count = 8 + Math.floor(rng() * 15);
    for (let i = 0; i < count; i++) {
      const sx = (rng() - 0.5) * 30;
      const sy = rng() * 40;
      const sz = (rng() - 0.5) * 30;
      const size = 0.3 + rng() * 1.2;
      const geo = new T.SphereGeometry(size, 6, 4);
      const color = new T.Color().setHSL(rng(), 0.5, 0.7);
      const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 + rng() * 0.4 });
      const star = new T.Mesh(geo, mat);
      star.position.set(sx, sy, sz);
      group.add(star);
    }
    group.position.set(x, 0, z);
    return group;
  }

  function populate(opts) {
    opts = opts || {};
    scene = opts.scene || null;
    camera = opts.camera || null;
    controls = opts.controls || null;
    if (!flagOn()) return { built: false, reason: 'flag-off' };
    if (!T || !scene) return { built: false, reason: 'no-THREE/scene' };

    // Clean previous
    if (root && root.parent) root.parent.remove(root);
    root = new T.Group();
    root.name = 'genesis-void-population';

    const seed = getSeed();
    const rng = seededRandom(seed);
    let placed = 0;

    // Generate positions scattered in the void ring
    for (let i = 0; i < VOID_DENSITY; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = VOID_MIN_DIST + rng() * (VOID_MAX_DIST - VOID_MIN_DIST);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Don't overlap with existing multiverse-world nodes (radius 300)
      if (dist < 340) continue;

      const roll = rng();
      let obj;

      if (roll < 0.25) {
        // Void buildings (25%)
        obj = makeVoidBuilding(x, z, rng);
      } else if (roll < 0.40) {
        // Monoliths (15%)
        obj = makeVoidMonolith(x, z, rng);
      } else if (roll < 0.55) {
        // Beacons (15%)
        obj = makeVoidBeacon(x, z, rng);
      } else if (roll < 0.70) {
        // Fractal nodes (15%)
        obj = makeVoidFractalNode(x, z, rng);
      } else if (roll < 0.85) {
        // Realm markers with Lost World config (15%)
        const prefix = pickRandom(REALM_PREFIXES, rng);
        const suffix = pickRandom(REALM_SUFFIXES, rng);
        const config = generateRealmConfig(prefix + ' ' + suffix, rng);
        obj = makeVoidRealmMarker(x, z, config, rng);
        realms.push({ x, z, config, obj });
      } else {
        // Star clusters (15%)
        obj = makeVoidStarCluster(x, z, rng);
      }

      if (obj) {
        root.add(obj);
        placed++;
      }
    }

    // Add a distant void fog plane (subtle gradient)
    const fogGeo = new T.PlaneGeometry(5000, 5000);
    const fogMat = new T.MeshBasicMaterial({ color: 0x020208, transparent: true, opacity: 0.4, side: T.DoubleSide });
    const fogPlane = new T.Mesh(fogGeo, fogMat);
    fogPlane.rotation.x = -Math.PI / 2;
    fogPlane.position.y = -2;
    fogPlane.name = 'void-fog-plane';
    root.add(fogPlane);

    scene.add(root);

    // Register with SectorManager if available
    if (Genesis.SectorManager && typeof Genesis.SectorManager.register === 'function') {
      Genesis.SectorManager.register('void-population', root, { maxDistance: VOID_MAX_DIST + 200, autoSleep: false });
    }
    if (Genesis.Visibility && typeof Genesis.Visibility.register === 'function') {
      Genesis.Visibility.register('void-population', root, { priority: 1, maxDistance: VOID_MAX_DIST + 200 });
    }

    console.log('[VoidPopulation] Spawned', placed, 'void objects across', VOID_MIN_DIST, '-', VOID_MAX_DIST, 'units. Seed:', seed);
    return { built: true, placed, seed, realms: realms.length };
  }

  function tick(dt) {
    if (!root || !camera) return;
    // Gentle rotation on fractal nodes for life
    const time = Date.now() * 0.001;
    root.children.forEach((child, i) => {
      if (child.name && child.name.includes('fractal')) {
        child.rotation.y = time * 0.1 + i;
      }
    });
  }

  function dispose() {
    if (root && root.parent) root.parent.remove(root);
    root = null;
    realms.length = 0;
  }

  const api = {
    populate,
    tick,
    dispose,
    realms: () => realms,
    summary: () => ({
      enabled: flagOn(),
      placed: root ? root.children.length : 0,
      seed: localStorage.getItem(VOID_SEED_KEY),
      realmCount: realms.length
    })
  };

  Genesis.VoidPopulation = api;

  // Register tick
  if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
    Genesis.EngineScheduler.defineTick('void-population', (dt) => tick(dt), () => flagOn());
  }

  return api;
}

export default { install };
