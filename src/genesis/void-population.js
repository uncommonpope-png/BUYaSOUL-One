// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city in every direction.
// Each world is a complete Realm with districts, buildings, agents, weather.
// Beacons are created SYNCHRONOUSLY so they're always visible.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';

const WORLD_COUNT = 10;
const MIN_DIST = 600;
const MAX_DIST = 3000;
const WAKE_RADIUS = 400;
const SLEEP_RADIUS = 600;

const NAMES = [
  'Neon Citadel','Shadow Forge','Crystal Nexus','Void Empire','Ember Sanctum',
  'Frost Wilds','Storm Hub','Soul Arena','Cosmic Garden','Phantom Spire'
];
const TYPES = ['combat','crafting','trading','exploration','breeding','governance','economy','building','conversation','districts'];
const TYPE_COLORS = {
  combat: 0xff3355, crafting: 0x66ff88, trading: 0xffdd00, exploration: 0xaa66ff,
  breeding: 0xff66cc, governance: 0xff8844, economy: 0x00ffaa, building: 0x4488ff,
  conversation: 0xffaa00, districts: 0x00ffcc
};

function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647; };
}

export function install(Genesis) {
  if (!Genesis) return null;
  if (Genesis.VoidPopulation) return Genesis.VoidPopulation;

  const T = window.THREE;
  if (!T) return null;

  let scene = null;
  let camera = null;
  const worlds = [];
  const worldRoot = new T.Group();
  worldRoot.name = 'void-population';

  function flagOn() {
    return typeof window !== 'undefined' && window.__GENESIS_VOID_POPULATION !== false;
  }

  // Distribute points uniformly in a circle around origin
  function randomPosition(index, rng) {
    const angle = (index / WORLD_COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.8;
    const dist = MIN_DIST + rng() * (MAX_DIST - MIN_DIST);
    const y = (rng() - 0.5) * 80;
    return new T.Vector3(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
  }

  function createBeacon(name, type, plt, pos) {
    const color = TYPE_COLORS[type] || 0x66ffff;
    const group = new T.Group();
    group.position.copy(pos);

    // Ground platform — disc showing the world's footprint
    const platGeo = new T.CylinderGeometry(80, 90, 2, 24);
    const platMat = new T.MeshStandardMaterial({ color: 0x0a0a1a, emissive: color, emissiveIntensity: 0.08, metalness: 0.8, roughness: 0.4 });
    const plat = new T.Mesh(platGeo, platMat);
    plat.position.y = -1;
    plat.receiveShadow = true;
    group.add(plat);

    // Ground glow ring
    const ringGeo = new T.TorusGeometry(85, 0.8, 8, 48);
    const ringMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.5;
    group.add(ring);

    // Towering beacon beam
    const beamH = 400;
    const beamGeo = new T.CylinderGeometry(1.5, 1.5, beamH, 6);
    const beamMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = beamH / 2;
    group.add(beam);

    // Top orb
    const orbGeo = new T.SphereGeometry(8, 16, 12);
    const orbMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0, transparent: true, opacity: 0.9 });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = beamH + 10;
    group.add(orb);

    // Halo ring
    const haloGeo = new T.TorusGeometry(14, 0.5, 8, 32);
    const haloMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const halo = new T.Mesh(haloGeo, haloMat);
    halo.position.y = beamH + 10;
    group.add(halo);

    // Second halo
    const halo2Geo = new T.TorusGeometry(20, 0.3, 8, 32);
    const halo2Mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const halo2 = new T.Mesh(halo2Geo, halo2Mat);
    halo2.position.y = beamH + 10;
    group.add(halo2);

    // Point light — visible from far
    const light = new T.PointLight(color, 3.0, 200);
    light.position.y = beamH + 10;
    group.add(light);

    // Name label sprite
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 512, 90);
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText(type.toUpperCase() + '  ·  PLT ' + plt.profit + '/' + plt.love + '/' + plt.tax, 512, 170);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(100, 25, 1);
    label.position.y = beamH + 40;
    group.add(label);

    return group;
  }

  function createCitySkeleton(pos, type, rng) {
    // Simplified city silhouette — buildings, roads, grid — always visible
    const group = new T.Group();
    group.position.copy(pos);

    const color = TYPE_COLORS[type] || 0x66ffff;

    // Ground
    const ground = new T.Mesh(
      new T.PlaneGeometry(300, 300),
      new T.MeshStandardMaterial({ color: 0x080818, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.5;
    ground.receiveShadow = true;
    group.add(ground);

    // Grid
    const grid = new T.GridHelper(200, 25, color, 0x110022);
    grid.position.y = 0.6;
    grid.material.opacity = 0.1;
    grid.material.transparent = true;
    group.add(grid);

    // Buildings — scattered boxes of varying heights
    const buildingCount = 30 + Math.floor(rng() * 20);
    for (let i = 0; i < buildingCount; i++) {
      const x = (rng() - 0.5) * 160;
      const z = (rng() - 0.5) * 160;
      const h = 3 + rng() * 25;
      const w = 2 + rng() * 4;
      const d = 2 + rng() * 4;
      const bColor = rng() > 0.5 ? color : 0x222244;
      const geo = new T.BoxGeometry(w, h, d);
      const mat = new T.MeshStandardMaterial({
        color: bColor, emissive: bColor, emissiveIntensity: 0.05,
        metalness: 0.7, roughness: 0.3
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Windows on tall buildings
      if (h > 8 && rng() > 0.3) {
        for (let wy = 2; wy < h - 1; wy += 2.5) {
          const wGeo = new T.BoxGeometry(w * 0.7, 0.3, 0.05);
          const wMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
          const win = new T.Mesh(wGeo, wMat);
          win.position.set(x, wy, z + d / 2 + 0.03);
          group.add(win);
        }
      }
    }

    // Roads
    const roadMat = new T.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });
    for (let i = -70; i <= 70; i += 14) {
      const r1 = new T.Mesh(new T.BoxGeometry(140, 0.06, 2.5), roadMat);
      r1.position.set(0, 0.6, i);
      r1.receiveShadow = true;
      group.add(r1);
      const r2 = new T.Mesh(new T.BoxGeometry(2.5, 0.06, 140), roadMat);
      r2.position.set(i, 0.6, 0);
      r2.receiveShadow = true;
      group.add(r2);
    }

    return group;
  }

  function populate(opts) {
    opts = opts || {};
    scene = opts.scene || null;
    camera = opts.camera || null;
    if (!flagOn()) return { built: false, reason: 'flag-off' };
    if (!T || !scene) return { built: false, reason: 'no-THREE/scene' };

    // Clean previous
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0;

    const rng = seededRandom('void-population-genesis');

    for (let i = 0; i < WORLD_COUNT; i++) {
      const name = NAMES[i];
      const type = TYPES[i];
      const plt = { profit: 20 + Math.floor(rng() * 60), love: 20 + Math.floor(rng() * 60), tax: 10 + Math.floor(rng() * 40) };
      const pos = randomPosition(i, rng);

      // Create beacon — ALWAYS visible
      const beacon = createBeacon(name, type, plt, pos);
      worldRoot.add(beacon);

      // Create city skeleton — simplified buildings visible from far
      const city = createCitySkeleton(pos, type, rng);
      worldRoot.add(city);

      // Try to create full Realm if available
      let realm = null;
      const RealmWorld = Genesis.RealmWorld;
      if (RealmWorld && RealmWorld.Realm) {
        try {
          realm = new RealmWorld.Realm({
            id: 'void-' + i + '-' + name.toLowerCase().replace(/\s/g, '-'),
            config: { id: 'void-' + i, seed: 'void-' + i + '-' + name, name, type, plt, palette: { fog: 0x050510 } },
            THREE: T,
            scene: worldRoot,
            lazyUI: true
          });
          realm.init().then(() => {
            realm.root.position.copy(pos);
            realm.root.visible = false;
            worldRoot.add(realm.root);
          }).catch(e => console.warn('[VoidPopulation] Realm init failed for', name, e));
        } catch (e) {
          console.warn('[VoidPopulation] Realm create failed for', name, e);
        }
      }

      worlds.push({ realm, beacon, city, name, type, plt, position: pos, active: false });
    }

    scene.add(worldRoot);

    console.log('[VoidPopulation] Spawned', WORLD_COUNT, 'Lost Worlds at distances', MIN_DIST, '-', MAX_DIST, 'units');
    return { built: true, worlds: worlds.length };
  }

  function tick(dt) {
    if (!camera) return;
    const camPos = camera.position;

    for (const w of worlds) {
      const dx = camPos.x - w.position.x;
      const dy = camPos.y - w.position.y;
      const dz = camPos.z - w.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Show/hide full Realm city when close
      if (w.realm && w.realm.root) {
        if (!w.active && dist < WAKE_RADIUS) {
          w.realm.root.visible = true;
          w.active = true;
        } else if (w.active && dist > SLEEP_RADIUS) {
          w.realm.root.visible = false;
          w.active = false;
        }
        if (w.active) w.realm.update(dt);
      }

      // Pulse the orb when close
      if (w.beacon) {
        const orb = w.beacon.children[3]; // orb mesh
        if (orb) {
          const pulse = 1.0 + Math.sin(Date.now() * 0.003 + w.position.x) * 0.15;
          orb.scale.setScalar(pulse);
        }
      }
    }
  }

  function dispose() {
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0;
  }

  const api = {
    populate,
    tick,
    dispose,
    worlds: () => worlds.map(w => ({ name: w.name, type: w.type, plt: w.plt, position: { x: w.position.x, y: w.position.y, z: w.position.z }, active: w.active })),
    summary: () => ({
      enabled: flagOn(),
      worldCount: worlds.length,
      activeWorlds: worlds.filter(w => w.active).length
    })
  };

  Genesis.VoidPopulation = api;

  if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
    Genesis.EngineScheduler.defineTick('void-population', (dt) => tick(dt), () => flagOn());
  }

  return api;
}

export default { install };
