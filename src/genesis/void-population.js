// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered in the void beyond the city.
// Spawns 10 complete Realm instances, each a self-contained Lost World
// with: districts, buildings, agent AI, weather, day/night, soul forge,
// gacha, combat, PLT economy. SectorManager LOD wakes/sleeps by distance.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';

const WORLD_COUNT = 10;
const VOID_MIN_DIST = 500;
const VOID_MAX_DIST = 2500;
const WAKE_RADIUS = 350;    // Realm wakes when camera is within this distance
const SLEEP_RADIUS = 500;   // Realm sleeps when camera exceeds this distance

const PREFIXES = ['Neon','Shadow','Crystal','Void','Ember','Frost','Storm','Soul','Cosmic','Phantom','Aether','Obsidian'];
const SUFFIXES = ['City','Arena','Realm','Empire','Hub','Forge','Wilds','Nexus','Citadel','Sanctum','Garden','Spire'];
const SEEDS = ['primal','genesis','weave','echo','flux','drift','spark','pulse','rift','nova'];

function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  const next = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647; };
  return next;
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

export function install(Genesis) {
  if (!Genesis) return null;
  if (Genesis.VoidPopulation) return Genesis.VoidPopulation;

  const T = window.THREE;
  if (!T) return null;

  let scene = null;
  let camera = null;
  const worlds = [];        // { realm, config, position, active }
  const worldRoot = new T.Group();
  worldRoot.name = 'void-population';

  function flagOn() {
    return typeof window !== 'undefined' && window.__GENESIS_VOID_POPULATION !== false;
  }

  function generateWorldConfig(index) {
    const seedSeed = SEEDS[index % SEEDS.length] + '-void-' + index;
    const rng = seededRandom(seedSeed);
    const prefix = pickRandom(PREFIXES, rng);
    const suffix = pickRandom(SUFFIXES, rng);
    const name = prefix + ' ' + suffix;
    const dominant = ['combat','breeding','districts','conversation','building','trading','exploration','crafting','governance','economy'][Math.floor(rng() * 10)];
    const seed = seedSeed + '-' + Math.random().toString(36).substring(2, 8);

    return {
      id: 'void-realm-' + index + '-' + prefix.toLowerCase(),
      seed,
      name,
      index,
      type: dominant,
      plt: {
        profit: Math.floor(rng() * 60) + 20,
        love: Math.floor(rng() * 60) + 20,
        tax: Math.floor(rng() * 40) + 10
      },
      cameraSpawn: [0, 25, 60],
      cameraLookAt: [0, 2, 0]
    };
  }

  function positionWorld(index) {
    // Scatter worlds in a spiral pattern across the void
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
    const angle = index * goldenAngle;
    const t = (index + 1) / WORLD_COUNT;
    const dist = VOID_MIN_DIST + t * (VOID_MAX_DIST - VOID_MIN_DIST);
    // Add some vertical variation for visual interest
    const y = (Math.sin(index * 1.7) * 0.5) * 5;
    return {
      x: Math.cos(angle) * dist,
      y,
      z: Math.sin(angle) * dist
    };
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

    // Import Realm class
    const RealmWorld = Genesis.RealmWorld;
    if (!RealmWorld || !RealmWorld.Realm) {
      console.warn('[VoidPopulation] RealmWorld not available — falling back to marker-only mode');
      return populateFallback(opts);
    }

    for (let i = 0; i < WORLD_COUNT; i++) {
      const config = generateWorldConfig(i);
      const pos = positionWorld(i);

      // Create the realm instance (lazy UI — only builds HUD when player is near)
      const realm = new RealmWorld.Realm({
        id: config.id,
        config,
        THREE: T,
        scene: worldRoot,
        lazyUI: true
      });

      // Initialize the realm (builds city, agents, weather, day/night, UI)
      realm.init().then(() => {
        // Position the realm's root group in the void
        realm.root.position.set(pos.x, pos.y, pos.z);

        // Beacon group — ALWAYS visible, never hidden
        const beaconGroup = new T.Group();
        beaconGroup.name = 'beacon-' + config.id;

        // Towering beacon beam
        const beamHeight = 350;
        const beamGeo = new T.CylinderGeometry(1.2, 1.2, beamHeight, 6);
        const themeColors = {
          combat: 0xff3355, breeding: 0xff66cc, districts: 0x00ffcc,
          conversation: 0xffaa00, building: 0x4488ff, trading: 0xffdd00,
          exploration: 0xaa66ff, crafting: 0x66ff88, governance: 0xff8844,
          economy: 0x00ffaa
        };
        const beamColor = themeColors[config.type] || 0x66ffff;
        const beamMat = new T.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.35 });
        const beam = new T.Mesh(beamGeo, beamMat);
        beam.position.y = beamHeight / 2 + 5;
        beaconGroup.add(beam);

        // Orb marker at top of beam
        const orbGeo = new T.SphereGeometry(6, 16, 12);
        const orbMat = new T.MeshStandardMaterial({ color: beamColor, emissive: beamColor, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
        const orb = new T.Mesh(orbGeo, orbMat);
        orb.position.y = beamHeight + 10;
        beaconGroup.add(orb);

        // Halo ring around orb
        const haloGeo = new T.TorusGeometry(10, 0.4, 8, 32);
        const haloMat = new T.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.5 });
        const halo = new T.Mesh(haloGeo, haloMat);
        halo.position.y = beamHeight + 10;
        beaconGroup.add(halo);

        // Strong point light
        const light = new T.PointLight(beamColor, 2.0, 120);
        light.position.y = beamHeight + 10;
        beaconGroup.add(light);

        // Name label — big, high up
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 1024, 256);
        ctx.fillStyle = '#' + beamColor.toString(16).padStart(6, '0');
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(config.name, 512, 80);
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#aaaacc';
        ctx.fillText(config.type.toUpperCase() + ' · PLT ' + config.plt.profit + '/' + config.plt.love + '/' + config.plt.tax, 512, 160);
        const tex = new T.CanvasTexture(canvas);
        const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        label.scale.set(80, 20, 1);
        label.position.y = beamHeight + 30;
        beaconGroup.add(label);

        // Add beacon to worldRoot IMMEDIATELY — always visible
        worldRoot.add(beaconGroup);

        // City group — only visible when player is near
        const cityGroup = realm.root;
        cityGroup.visible = false;
        worldRoot.add(cityGroup);
      });

      worlds.push({ realm, config, position: pos, active: false });
    }

    // Add all realm roots to the void group
    scene.add(worldRoot);

    // Register with SectorManager
    if (Genesis.SectorManager && typeof Genesis.SectorManager.register === 'function') {
      Genesis.SectorManager.register('void-population', worldRoot, { maxDistance: VOID_MAX_DIST + 200, autoSleep: false });
    }
    if (Genesis.Visibility && typeof Genesis.Visibility.register === 'function') {
      Genesis.Visibility.register('void-population', worldRoot, { priority: 1, maxDistance: VOID_MAX_DIST + 200 });
    }

    console.log('[VoidPopulation] Spawning', WORLD_COUNT, 'Lost Worlds across', VOID_MIN_DIST, '-', VOID_MAX_DIST, 'units');
    return { built: true, worlds: worlds.length };
  }

  function populateFallback(opts) {
    // If Realm class isn't available, spawn large markers
    for (let i = 0; i < WORLD_COUNT; i++) {
      const config = generateWorldConfig(i);
      const pos = positionWorld(i);
      const group = new T.Group();
      group.position.set(pos.x, pos.y, pos.z);

      const beamGeo = new T.CylinderGeometry(1.5, 1.5, 300, 6);
      const beamMat = new T.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.3 });
      const beam = new T.Mesh(beamGeo, beamMat);
      beam.position.y = 150;
      group.add(beam);

      const orbGeo = new T.SphereGeometry(8, 16, 12);
      const orbMat = new T.MeshStandardMaterial({ color: 0x66ffff, emissive: 0x66ffff, emissiveIntensity: 1.5 });
      const orb = new T.Mesh(orbGeo, orbMat);
      orb.position.y = 310;
      group.add(orb);

      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = '#66ffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.name, 512, 100);
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText(config.type + ' · PLT ' + config.plt.profit + '/' + config.plt.love + '/' + config.plt.tax, 512, 180);
      const tex = new T.CanvasTexture(canvas);
      const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      label.scale.set(60, 15, 1);
      label.position.y = 340;
      group.add(label);

      worldRoot.add(group);
      worlds.push({ realm: null, config, position: pos, active: false });
    }

    scene.add(worldRoot);
    return { built: true, worlds: worlds.length, fallback: true };
  }

  function tick(dt) {
    if (!camera) return;
    const camPos = camera.position;

    for (const w of worlds) {
      if (!w.realm) continue;
      const dx = camPos.x - w.position.x;
      const dy = camPos.y - w.position.y;
      const dz = camPos.z - w.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (!w.active && dist < WAKE_RADIUS) {
        w.realm.root.visible = true;
        w.active = true;
        console.log('[VoidPopulation] Woke:', w.config.name, 'at distance', Math.round(dist));
      } else if (w.active && dist > SLEEP_RADIUS) {
        w.realm.root.visible = false;
        w.active = false;
        console.log('[VoidPopulation] Sleeping:', w.config.name);
      }

      if (w.active) {
        w.realm.update(dt);
      }
    }
  }

  function dispose() {
    for (const w of worlds) {
      if (w.realm) w.realm.root.visible = false;
    }
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0;
  }

  const api = {
    populate,
    tick,
    dispose,
    worlds: () => worlds.map(w => ({ name: w.config.name, type: w.config.type, plt: w.config.plt, position: w.position, active: w.active })),
    summary: () => ({
      enabled: flagOn(),
      worldCount: worlds.length,
      activeWorlds: worlds.filter(w => w.active).length
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
