// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city in every direction.
// Each world is a complete Realm with districts, buildings, agents, weather.
// Beacons are created SYNCHRONOUSLY so they're always visible.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';
import { installVoidCosmos } from './void-cosmos.js';

const WORLD_COUNT = 15;
const MIN_DIST = 360; // Lost Mechanics Ring starts here (CPL Territory ends at 360u)
const MAX_DIST = 3000;
const WAKE_RADIUS = 800;
const SLEEP_RADIUS = 1200;
const NO_BUILD_ZONE = 360; // CPL Territory: 0-360u forbidden zone

// Explicit world coordinates from VOID-COORDINATES.md / void-map.html
// Zone 1: Lost Mechanics Ring (360-600u) - 3 Lost Mechanics cities
// Zone 2: Lost Worlds Ring (600-3000u) - 10 Worlds
const WORLD_COORDINATES = [
  // Lost Mechanics Ring (360-600u)
  { x: -490, y: 0, z: 59, zone: 'lost-mechanics' },    // Lost Mech I - Physics Gate
  { x: -360, y: 0, z: -21, zone: 'lost-mechanics' },  // Lost Mech II - Arena Core  
  { x: -218, y: 0, z: -288, zone: 'lost-mechanics' }, // Lost Mech III - Soul Home
  // Lost Worlds Ring (600-3000u)
  { x: 2090, y: 39.6, z: 221 },    // Neon Citadel — combat
  { x: 2301, y: 19.1, z: 632 },    // Shadow Forge — crafting
  { x: 400, y: 0, z: 400 },        // Crystal Nexus — trading/refactored
  { x: -23, y: -27.3, z: 1409 },   // Void Empire — exploration
  { x: -976, y: -22.6, z: 510 },   // Ember Sanctum — breeding
  { x: -589, y: 0, z: -118 },      // Frost Wilds — governance/PLT Engine
  { x: -2211, y: -14.1, z: -567 }, // Storm Hub — economy
  { x: -1048, y: -8.8, z: -2792 }, // Soul Arena — building
  { x: 1553, y: 17.3, z: -2135 },  // Cosmic Garden — conversation
  { x: 1152, y: 32.5, z: -561 },   // Phantom Spire — districts
  // New City — CPL clone at (313, 0, 179) in Lost Mechanics Ring
  { x: 313, y: 0, z: 179, zone: 'lost-mechanics', cplclone: true },   // New City — LM bible randomized
  // Grand Tower — the central tower at (-104, 0, 401)
  { x: -104, y: 0, z: 401, zone: 'lost-mechanics' },
];

const WORLD_CONFIG = [
  // Lost Mechanics Ring (360-600u)
  { name: 'Lost Mech I - Physics Gate', type: 'physics', plt: { profit: 15, love: 10, tax: -2 } },
  { name: 'Lost Mech II - Arena Core', type: 'arena', plt: { profit: 13, love: 8, tax: -3 } },
  { name: 'Lost Mech III - Soul Home', type: 'soulhome', plt: { profit: 9, love: 14, tax: -3 } },
  // Lost Worlds Ring (600-3000u)
  { name: 'Neon Citadel', type: 'combat' },
  { name: 'Shadow Forge', type: 'crafting' },
  { name: 'Crystal Nexus', type: 'trading' },
  { name: 'Void Empire', type: 'exploration' },
  { name: 'Ember Sanctum', type: 'breeding' },
  { name: 'Frost Wilds', type: 'governance' },
  { name: 'Storm Hub', type: 'economy' },
  { name: 'Soul Arena', type: 'building' },
  { name: 'Cosmic Garden', type: 'conversation' },
  { name: 'Phantom Spire', type: 'districts' },
  // New City — CPL clone with LM bible randomization
  { name: 'New City', type: 'cplclone', plt: { profit: 25, love: 25, tax: 0 } },
  // Grand Tower — the central tower
  { name: 'Grand Tower', type: 'grandtower', plt: { profit: 50, love: 50, tax: 50 } },
];

const NAMES = WORLD_CONFIG.map(w => w.name);
const TYPES = ['physics', 'arena', 'soulhome', 'combat', 'crafting', 'trading', 'exploration', 'breeding', 'governance', 'economy', 'building', 'conversation', 'districts', 'cplclone', 'grandtower'];

const TYPE_COLORS = {
  // Lost Mechanics Archetypes
  physics: 0xaa66ff, gacha: 0xff66cc, evolve: 0x66ff88,
  typeadv: 0xff8844, arena: 0xff3355, idle: 0x00ffaa,
  prestige: 0xffdd00, pantheon: 0x4488ff, soulhome: 0xffaa00,
  persona: 0x00ffcc, economy: 0x00ffaa, achievement: 0xff7722,
  // Original types
  combat: 0xff3355, crafting: 0x66ff88, trading: 0xffdd00, exploration: 0xaa66ff,
  breeding: 0xff66cc, governance: 0xff8844, building: 0x4488ff,
  conversation: 0xffaa00, districts: 0x00ffcc, cplclone: 0x66ffff, grandtower: 0xffcc44
};
const TYPE_QUESTS = {
  // Lost Mechanics Archetypes
  physics: 'Master Momentum Fields — control collision and force',
  gacha: 'Complete a full collection — 100% drop rate achieved',
  evolve: 'Evolve to Apex Form — transcend the base state',
  typeadv: 'Master all 12 types — achieve perfect counter balance',
  arena: 'Defeat the Pantheon Champion — prove your worth',
  idle: 'Achieve 24-hour automation — watch the world build itself',
  prestige: 'Ascend 3 times — reset with bonus multipliers',
  pantheon: 'Gain favor with all 12 Deities — unlock divine powers',
  soulhome: 'Build your perfect sanctuary — customize every corner',
  persona: 'Create a perfect companion — match personality to need',
  economy: 'Trigger a PLT market boom — exceed 200 PLT',
  achievement: 'Complete all 12 Lost Mechanics — unlock the Door',
  // Original types
  combat: 'Defeat the Arena Champion — prove your strength in the Pantheon',
  crafting: 'Forge 3 Legendary Souls — master the Soul Forge',
  trading: 'Accumulate 1000 PLT — become the greatest merchant',
  exploration: 'Discover all 5 hidden beacons — map the unknown',
  breeding: 'Breed a Legendary Soul — combine Profit and Love',
  governance: 'Achieve 90% citizen satisfaction — lead with wisdom',
  building: 'Construct a Mega-Structure — reach building level 10',
  conversation: 'Hold 10 conversations — connect every citizen',
  districts: 'Unlock all 4 districts — achieve total unity',
  cplclone: 'Build a CPL clone city — randomized by the Lost Mechanics Bible',
  grandtower: 'The Grand Tower — ascend 100 floors, forge legendary souls'
};
const TYPE_DENIZEN_NAMES = {
  // Lost Mechanics Archetypes
  physics: ['Vector Master','Momentum Keeper','Force Weaver','Collision Sage','Field Architect'],
  gacha: ['Luck Broker','Rarity Seeker','Dragon Hoarder','Wish Fulfiller','Pity Timer'],
  evolve: ['Mutation Sage','Branch Keeper','Ascension Guide','Transcendent One','Life Architect'],
  typeadv: ['Elementalist','Counter Master','Advantage Seeker','Weakness Exploiter','Type Sage'],
  arena: ['Pantheon Warrior','Bone Master','Gladiator','Champion','Protector'],
  idle: ['Idle Sage','Automation Master','Progress Watcher','Offline Duke','Passive Income'],
  prestige: ['Ascension Sage','Rebirth Keeper','Reset Master','Bonus Oracle','Transcendant'],
  pantheon: ['Divine Judge','God Tongue','Heavenly Arbiter','Celestial Knight','Deity Speaker'],
  soulhome: ['Home Keeper','Nest Builder','Family Head','Host','Caretaker'],
  persona: ['Mind Weaver','Dialogue Sage','Personality Architect','Soul Reader','Character Architect'],
  economy: ['Market Sage','Token Master','Ledger Keeper','PLT Scorer','Exchange Artisan'],
  achievement: ['Milestone Keeper','Triumph Bearer','Completionist','Reward Seeker','Honor Guard'],
  // Original types
  combat: ['Blade Master','War Chief','Arena Guard','Berserker','Paladin'],
  crafting: ['Forge Keeper','Artisan','Smith','Runecaster','Alchemist'],
  trading: ['Merchant Lord','Broker','Dealer','Banker','Auctioneer'],
  exploration: ['Pathfinder','Scout','Cartographer','Ranger','Explorer'],
  breeding: ['Breeder','Nurturer','Hatchery Master','Geneticist','Keeper'],
  governance: ['Councilor','Judge','Advisor','Elder','Chancellor'],
  building: ['Architect','Engineer','Builder','Mason','Contractor'],
  conversation: ['Orator','Diplomat','Counselor','Mediator','Liaison'],
  districts: ['Warden','Overseer','Administrator','Coordinator','Director'],
  cplclone: ['City Architect','Neon Weaver','Grid Keeper','District Mind','Clone Master'],
  grandtower: ['Tower Guardian','Forge Master','Soul Keeper','Gate Watcher','Crown Bearer']
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
  let voidCosmosApi = null;
  const worlds = [];
  const worldRoot = new T.Group();
  worldRoot.name = 'void-population';

  // Portal connections between worlds
  const PORTALS = [];

  // Initialize void cosmos module if available
  if (typeof installVoidCosmos === 'function') {
    voidCosmosApi = installVoidCosmos(Genesis);
  }

  function flagOn() {
    return typeof window !== 'undefined' && window.__GENESIS_VOID_POPULATION !== false;
  }

  // Get world position from explicit coordinates
  // Respects no-build zone (0-360u): positions < 360u are forbidden
  function getWorldPosition(index, rng) {
    const coords = WORLD_COORDINATES[index] || { x: 0, y: 0, z: 0 };
    const dist = Math.sqrt(coords.x * coords.x + coords.z * coords.z);
    
    // Validate: Position must be outside no-build zone
    if (dist < NO_BUILD_ZONE) {
      console.warn('[VoidPopulation] World ' + index + ' (' + NAMES[index] + ') at distance ' + dist + 
        'u is inside NO-BUILD ZONE (' + NO_BUILD_ZONE + 'u). Using fallback position.');
      // Fallback: place on minimum allowed ring
      const angle = (index / WORLD_COUNT) * Math.PI * 2;
      return new T.Vector3(Math.cos(angle) * NO_BUILD_ZONE * 1.1, coords.y, Math.sin(angle) * NO_BUILD_ZONE * 1.1);
    }
    
    return new T.Vector3(coords.x, coords.y, coords.z);
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

    // Second glow ring
    const ring2Geo = new T.TorusGeometry(95, 0.4, 8, 48);
    const ring2Mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 });
    const ring2 = new T.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.5;
    group.add(ring2);

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
    // Detailed city silhouette — buildings, roads, grid — always visible
    const group = new T.Group();
    group.position.copy(pos);

    const color = TYPE_COLORS[type] || 0x66ffff;

    // Ground
    const ground = new T.Mesh(
      new T.PlaneGeometry(400, 400),
      new T.MeshStandardMaterial({ color: 0x080818, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.5;
    ground.receiveShadow = true;
    group.add(ground);

    // Grid
    const grid = new T.GridHelper(300, 30, color, 0x110022);
    grid.position.y = 0.6;
    grid.material.opacity = 0.12;
    grid.material.transparent = true;
    group.add(grid);

    // Roads — wider, more detailed
    const roadMat = new T.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });
    for (let i = -100; i <= 100; i += 16) {
      const r1 = new T.Mesh(new T.BoxGeometry(200, 0.06, 3), roadMat);
      r1.position.set(0, 0.6, i);
      r1.receiveShadow = true;
      group.add(r1);
      const r2 = new T.Mesh(new T.BoxGeometry(3, 0.06, 200), roadMat);
      r2.position.set(i, 0.6, 0);
      r2.receiveShadow = true;
      group.add(r2);
    }

    // Buildings — 4 districts with varying styles
    const districts = [
      { name: 'work', zone: { x: [-90, -10], z: [-90, -10] }, count: 25, minH: 8, maxH: 35, color: 0x00ffff, eColor: 0x0088aa },
      { name: 'home', zone: { x: [10, 90], z: [-90, -10] }, count: 30, minH: 4, maxH: 18, color: 0xff66aa, eColor: 0xaa3366 },
      { name: 'social', zone: { x: [-90, -10], z: [10, 90] }, count: 20, minH: 3, maxH: 12, color: 0xffaa00, eColor: 0xaa7700 },
      { name: 'learn', zone: { x: [10, 90], z: [10, 90] }, count: 18, minH: 6, maxH: 25, color: 0x00ff88, eColor: 0x00aa55 }
    ];

    for (const d of districts) {
      for (let i = 0; i < d.count; i++) {
        const x = d.zone.x[0] + rng() * (d.zone.x[1] - d.zone.x[0]);
        const z = d.zone.z[0] + rng() * (d.zone.z[1] - d.zone.z[0]);
        const h = d.minH + rng() * (d.maxH - d.minH);
        const w = 2 + rng() * 5;
        const d2 = 2 + rng() * 5;
        const bColor = rng() > 0.6 ? d.color : 0x222244;
        const geo = new T.BoxGeometry(w, h, d2);
        const mat = new T.MeshStandardMaterial({
          color: bColor, emissive: d.eColor, emissiveIntensity: 0.08,
          metalness: 0.7, roughness: 0.3
        });
        const mesh = new T.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Windows on buildings
        if (h > 6) {
          for (let wy = 2; wy < h - 1; wy += 2.5) {
            const wGeo = new T.BoxGeometry(w * 0.7, 0.3, 0.05);
            const wMat = new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.4 });
            const win = new T.Mesh(wGeo, wMat);
            win.position.set(x, wy, z + d2 / 2 + 0.03);
            group.add(win);
          }
        }

        // Cap on tall buildings
        if (h > 15 && rng() > 0.5) {
          const cGeo = new T.BoxGeometry(w + 0.3, 0.3, d2 + 0.3);
          const cMat = new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.5 });
          const cap = new T.Mesh(cGeo, cMat);
          cap.position.set(x, h + 0.15, z);
          group.add(cap);
        }

        // Antenna spire on very tall buildings
        if (h > 25 && rng() > 0.4) {
          const spireH = 3 + rng() * 8;
          const spire = new T.Mesh(
            new T.CylinderGeometry(0.1, 0.3, spireH, 4),
            new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.6 })
          );
          spire.position.set(x, h + spireH / 2, z);
          group.add(spire);
        }
      }

      // District label
      const cx = (d.zone.x[0] + d.zone.x[1]) / 2;
      const cz = (d.zone.z[0] + d.zone.z[1]) / 2;
      const lCanvas = document.createElement('canvas');
      lCanvas.width = 256; lCanvas.height = 64;
      const lctx = lCanvas.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0.7)';
      lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      lctx.font = 'bold 28px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(d.name.toUpperCase(), 128, 42);
      const lTex = new T.CanvasTexture(lCanvas);
      const lLabel = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: lTex, transparent: true }));
      lLabel.position.set(cx, 30, cz);
      lLabel.rotation.x = -Math.PI / 4;
      group.add(lLabel);
    }

    // Outer ring buildings
    const ringMat = new T.MeshStandardMaterial({ color: 0x222244, emissive: 0x110022, emissiveIntensity: 0.1, metalness: 0.6, roughness: 0.4 });
    const ringCounts = [{ r: 120, count: 20, skip: 0.4 }, { r: 160, count: 28, skip: 0.5 }, { r: 200, count: 35, skip: 0.6 }];
    for (const rc of ringCounts) {
      for (let i = 0; i < rc.count; i++) {
        if (rng() < rc.skip) continue;
        const angle = (i / rc.count) * Math.PI * 2 + rng() * 0.3;
        const rr = rc.r + rng() * 15 - 7;
        const x = Math.cos(angle) * rr;
        const z = Math.sin(angle) * rr;
        const h = 4 + rng() * 18;
        const w = 2 + rng() * 5;
        const d2 = 2 + rng() * 5;
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d2), ringMat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }

    // POI marker — glowing chevron above the city
    const poiGroup = new T.Group();
    poiGroup.position.set(0, 60, 0);

    // Chevron
    const chevGeo = new T.BufferGeometry();
    const chevVerts = new Float32Array([
      -2, 0, 0,  0, 2, 0,  0, 0, 0,
      0, 0, 0,  0, 2, 0,  2, 0, 0
    ]);
    chevGeo.setAttribute('position', new T.BufferAttribute(chevVerts, 3));
    const chevMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: T.DoubleSide });
    const chevron = new T.Mesh(chevGeo, chevMat);
    chevGeo.computeVertexNormals();
    poiGroup.add(chevron);

    // Glow ring
    const poiRingGeo = new T.TorusGeometry(3, 0.2, 8, 16);
    const poiRingMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const poiRing = new T.Mesh(poiRingGeo, poiRingMat);
    poiRing.rotation.x = -Math.PI / 2;
    poiGroup.add(poiRing);

    // Point light
    const poiLight = new T.PointLight(color, 1.0, 30);
    poiGroup.add(poiLight);

    group.add(poiGroup);

    // Per-world atmosphere dome
    const domeGeo = new T.SphereGeometry(250, 16, 12);
    const domeMat = new T.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.03,
      side: T.BackSide,
      depthWrite: false
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.position.y = 50;
    group.add(dome);

    // Ambient particles
    const particleCount = 200;
    const particleGeo = new T.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (rng() - 0.5) * 300;
      particlePos[i + 1] = rng() * 80;
      particlePos[i + 2] = (rng() - 0.5) * 300;
    }
    particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
    const particleMat = new T.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const particles = new T.Points(particleGeo, particleMat);
    particles.userData.isAmbientParticles = true;
    group.add(particles);

    return group;
  }

  function createPortal(fromWorld, toWorld, rng) {
    const color = 0x66ffff;
    const group = new T.Group();

    // Portal frame — torus
    const frameGeo = new T.TorusGeometry(6, 0.5, 8, 32);
    const frameMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 });
    const frame = new T.Mesh(frameGeo, frameMat);
    frame.rotation.y = Math.PI / 2;
    group.add(frame);

    // Inner glow
    const innerGeo = new T.CircleGeometry(5.5, 32);
    const innerMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: T.DoubleSide });
    const inner = new T.Mesh(innerGeo, innerMat);
    inner.rotation.y = Math.PI / 2;
    group.add(inner);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#66ffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→ ' + toWorld.name, 256, 50);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('PORTAL', 256, 90);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(12, 3, 1);
    label.position.y = 8;
    group.add(label);

    // Point light
    const light = new T.PointLight(color, 1.5, 40);
    group.add(light);

    return group;
  }

  function createQuestBeacon(world, rng) {
    const color = TYPE_COLORS[world.type] || 0x66ffff;
    const group = new T.Group();

    // Quest marker — floating diamond
    const diamondGeo = new T.OctahedronGeometry(2, 0);
    const diamondMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0, metalness: 0.8, roughness: 0.2 });
    const diamond = new T.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 20;
    diamond.rotation.y = Math.PI / 4;
    group.add(diamond);

    // Glow ring
    const ringGeo = new T.TorusGeometry(3, 0.15, 8, 16);
    const ringMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 20;
    group.add(ring);

    // Point light
    const light = new T.PointLight(color, 0.8, 20);
    light.position.y = 20;
    group.add(light);

    // Quest text sprite
    const questText = TYPE_QUESTS[world.type] || 'Explore this world';
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUEST: ' + world.type.toUpperCase(), 256, 40);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#ffffff';
    // Word wrap quest text
    const words = questText.split(' ');
    let line = '';
    let y = 70;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > 480) {
        ctx.fillText(line.trim(), 256, y);
        line = word + ' ';
        y += 22;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), 256, y);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(15, 3.75, 1);
    label.position.y = 28;
    group.add(label);

    return group;
  }

  function createDenizens(pos, type, rng) {
    const group = new T.Group();
    const color = TYPE_COLORS[type] || 0x66ffff;
    const names = TYPE_DENIZEN_NAMES[type] || ['Citizen'];

    for (let i = 0; i < 5; i++) {
      const name = names[i % names.length];
      const dx = (rng() - 0.5) * 60;
      const dz = (rng() - 0.5) * 60;

      const denizen = new T.Group();
      denizen.position.set(dx, 0, dz);

      // Body
      const torso = new T.Mesh(
        new T.BoxGeometry(0.5, 0.7, 0.25),
        new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1 })
      );
      torso.position.y = 1.0;
      torso.castShadow = true;
      denizen.add(torso);

      // Head
      const head = new T.Mesh(
        new T.SphereGeometry(0.18, 8, 8),
        new T.MeshStandardMaterial({ color: 0xffddcc })
      );
      head.position.y = 1.55;
      head.castShadow = true;
      denizen.add(head);

      // Eyes
      [-0.06, 0.06].forEach(xo => {
        const eye = new T.Mesh(
          new T.SphereGeometry(0.03, 6, 6),
          new T.MeshStandardMaterial({ color: 0x222222 })
        );
        eye.position.set(xo, 1.58, 0.15);
        denizen.add(eye);
      });

      // Arms
      [-0.38, 0.38].forEach(xo => {
        const arm = new T.Mesh(
          new T.BoxGeometry(0.12, 0.5, 0.12),
          new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.05 })
        );
        arm.position.set(xo, 0.9, 0);
        arm.castShadow = true;
        denizen.add(arm);
      });

      // Legs
      [-0.12, 0.12].forEach(xo => {
        const leg = new T.Mesh(
          new T.BoxGeometry(0.14, 0.6, 0.14),
          new T.MeshStandardMaterial({ color: 0x333366 })
        );
        leg.position.set(xo, 0.3, 0);
        leg.castShadow = true;
        denizen.add(leg);
      });

      // Name label
      const nCanvas = document.createElement('canvas');
      nCanvas.width = 256; nCanvas.height = 64;
      const nctx = nCanvas.getContext('2d');
      nctx.fillStyle = 'rgba(0,0,0,0.7)';
      nctx.fillRect(0, 0, 256, 64);
      nctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      nctx.font = 'bold 20px sans-serif';
      nctx.textAlign = 'center';
      nctx.fillText(name, 128, 40);
      const nTex = new T.CanvasTexture(nCanvas);
      const nSprite = new T.Sprite(new T.SpriteMaterial({ map: nTex, transparent: true }));
      nSprite.position.y = 2.0;
      nSprite.scale.set(2, 0.5, 1);
      denizen.add(nSprite);

      group.add(denizen);
    }

    group.position.copy(pos);
    return group;
  }

  // ====== CPL CLONE CITY — randomized using Lost Mechanics Bible ======
  // Builds a CPL-inspired neon city at (313, 0, 179) with 4 LM-themed districts
  function createCPLCloneCity(pos, rng) {
    const group = new T.Group();
    group.position.copy(pos);

    // LM archetype palette for randomization
    const LM_COLORS = [0xaa66ff, 0xff66cc, 0x66ff88, 0xff8844, 0xff3355, 0x00ffaa, 0xffdd00, 0x4488ff, 0xffaa00, 0x00ffcc, 0x00ffaa, 0xff7722];
    const LM_NAMES = ['physics', 'gacha', 'evolve', 'typeadv', 'arena', 'idle', 'prestige', 'pantheon', 'soulhome', 'persona', 'economy', 'achievement'];
    const accentColor = LM_COLORS[Math.floor(rng() * LM_COLORS.length)];

    // Ground platform
    const ground = new T.Mesh(
      new T.CircleGeometry(150, 32),
      new T.MeshStandardMaterial({ color: 0x080818, roughness: 0.9, side: T.DoubleSide })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.5;
    ground.receiveShadow = true;
    group.add(ground);

    // Circular ground glow ring
    const glowRing = new T.Mesh(
      new T.RingGeometry(145, 150, 48),
      new T.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.08, side: T.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.6;
    group.add(glowRing);

    // Road grid — 7x7 like CPL
    const gridSize = 7;
    const spacing = 14;
    const roadMat = new T.MeshStandardMaterial({ color: 0x0a0a22, roughness: 0.8 });
    for (let i = 0; i < gridSize; i++) {
      const offset = (i - Math.floor(gridSize / 2)) * spacing;
      const r1 = new T.Mesh(new T.BoxGeometry(90, 0.06, 2.5), roadMat);
      r1.position.set(0, 0.6, offset);
      r1.receiveShadow = true;
      group.add(r1);
      const r2 = new T.Mesh(new T.BoxGeometry(2.5, 0.06, 90), roadMat);
      r2.position.set(offset, 0.6, 0);
      r2.receiveShadow = true;
      group.add(r2);
    }

    // 4 districts — each themed by a random LM archetype
    const districts = [];
    const usedTypes = [];
    for (let d = 0; d < 4; d++) {
      let ti;
      do { ti = Math.floor(rng() * LM_NAMES.length); } while (usedTypes.includes(ti));
      usedTypes.push(ti);
      const isTop = d < 2;
      const isLeft = d % 2 === 0;
      districts.push({
        name: LM_NAMES[ti],
        color: LM_COLORS[ti],
        zone: {
          x: isLeft ? [-56, -8] : [8, 56],
          z: isTop ? [-56, -8] : [8, 56]
        },
        count: 12 + Math.floor(rng() * 6),
        minH: 3 + rng() * 5,
        maxH: 10 + rng() * 20,
        emitIntensity: 0.1 + rng() * 0.3
      });
    }

    // Build district buildings
    for (const d of districts) {
      const eColor = d.color;
      for (let i = 0; i < d.count; i++) {
        const x = d.zone.x[0] + rng() * (d.zone.x[1] - d.zone.x[0]);
        const z = d.zone.z[0] + rng() * (d.zone.z[1] - d.zone.z[0]);
        const h = d.minH + rng() * (d.maxH - d.minH);
        const w = 2 + rng() * 4;
        const d2 = 2 + rng() * 4;
        const bColor = rng() > 0.5 ? d.color : 0x222244;

        // Choose shape: box, cylinder, taper, or stack
        const shape = rng();
        let mesh;
        if (shape < 0.15 && h > 10) {
          // Cylinder tower
          mesh = new T.Mesh(
            new T.CylinderGeometry(w * 0.5, w * 0.6, h, 8),
            new T.MeshStandardMaterial({ color: bColor, emissive: eColor, emissiveIntensity: d.emitIntensity, metalness: 0.7, roughness: 0.3 })
          );
        } else if (shape < 0.30 && h > 12) {
          // Tapered (ziggurat) — 3 tiers
          const taperGroup = new T.Group();
          for (let t = 0; t < 3; t++) {
            const tw = w * (1 - t * 0.2);
            const td = d2 * (1 - t * 0.2);
            const th = h / 3;
            const tier = new T.Mesh(
              new T.BoxGeometry(tw, th, td),
              new T.MeshStandardMaterial({ color: bColor, emissive: eColor, emissiveIntensity: d.emitIntensity * (1 - t * 0.2), metalness: 0.6, roughness: 0.3 })
            );
            tier.position.y = th / 2 + t * th;
            tier.castShadow = true;
            taperGroup.add(tier);
          }
          mesh = taperGroup;
          mesh.position.set(x, 0, z);
          group.add(mesh);
          continue;
        } else if (shape < 0.45 && h > 7) {
          // Stacked — 2 tiers
          const stackGroup = new T.Group();
          for (let t = 0; t < 2; t++) {
            const tw = w * (1 - t * 0.15);
            const td = d2 * (1 - t * 0.15);
            const th = h / 2;
            const tier = new T.Mesh(
              new T.BoxGeometry(tw, th, td),
              new T.MeshStandardMaterial({ color: bColor, emissive: eColor, emissiveIntensity: d.emitIntensity, metalness: 0.6, roughness: 0.3 })
            );
            tier.position.y = th / 2 + t * th;
            tier.castShadow = true;
            stackGroup.add(tier);
          }
          mesh = stackGroup;
          mesh.position.set(x, 0, z);
          group.add(mesh);
          continue;
        } else {
          // Default box
          mesh = new T.Mesh(
            new T.BoxGeometry(w, h, d2),
            new T.MeshStandardMaterial({ color: bColor, emissive: eColor, emissiveIntensity: d.emitIntensity, metalness: 0.7, roughness: 0.3 })
          );
        }
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Window glow strips
        if (h > 5) {
          for (let wy = 1.5; wy < h - 1; wy += 2.5) {
            const wGeo = new T.BoxGeometry(w * 0.6, 0.2, 0.05);
            const wMat = new T.MeshStandardMaterial({ color: eColor, emissive: eColor, emissiveIntensity: 0.6 });
            const win = new T.Mesh(wGeo, wMat);
            win.position.set(x, wy, z + d2 / 2 + 0.03);
            group.add(win);
            const win2 = new T.Mesh(wGeo, wMat);
            win2.position.set(x, wy, z - d2 / 2 - 0.03);
            group.add(win2);
          }
        }

        // Cap on tall buildings
        if (h > 12 && rng() > 0.4) {
          const cGeo = new T.BoxGeometry(w + 0.3, 0.3, d2 + 0.3);
          const cMat = new T.MeshStandardMaterial({ color: eColor, emissive: eColor, emissiveIntensity: 0.7 });
          const cap = new T.Mesh(cGeo, cMat);
          cap.position.set(x, h + 0.15, z);
          group.add(cap);
        }

        // Antenna spire on very tall buildings
        if (h > 18 && rng() > 0.5) {
          const spireH = 2 + rng() * 6;
          const spire = new T.Mesh(
            new T.CylinderGeometry(0.08, 0.25, spireH, 4),
            new T.MeshStandardMaterial({ color: eColor, emissive: eColor, emissiveIntensity: 0.8 })
          );
          spire.position.set(x, h + spireH / 2, z);
          group.add(spire);
        }
      }

      // District ground label
      const cx = (d.zone.x[0] + d.zone.x[1]) / 2;
      const cz = (d.zone.z[0] + d.zone.z[1]) / 2;
      const lCanvas = document.createElement('canvas');
      lCanvas.width = 256; lCanvas.height = 64;
      const lctx = lCanvas.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0.7)';
      lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      lctx.font = 'bold 24px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(d.name.toUpperCase(), 128, 40);
      const lTex = new T.CanvasTexture(lCanvas);
      const lLabel = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: lTex, transparent: true }));
      lLabel.position.set(cx, 25, cz);
      lLabel.rotation.x = -Math.PI / 4;
      group.add(lLabel);
    }

    // Outer ring buildings — 2 rings at 80 and 110 radius
    for (const ringR of [80, 110]) {
      const count = ringR === 80 ? 16 : 22;
      for (let i = 0; i < count; i++) {
        if (rng() > 0.5) continue;
        const angle = (i / count) * Math.PI * 2 + rng() * 0.3;
        const rr = ringR + rng() * 10 - 5;
        const x = Math.cos(angle) * rr;
        const z = Math.sin(angle) * rr;
        const h = 4 + rng() * 14;
        const w = 2 + rng() * 3;
        const ci = Math.floor(rng() * LM_COLORS.length);
        const mesh = new T.Mesh(
          new T.BoxGeometry(w, h, w),
          new T.MeshStandardMaterial({ color: 0x222244, emissive: LM_COLORS[ci], emissiveIntensity: 0.06, metalness: 0.6, roughness: 0.4 })
        );
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }

    // Central beacon beam
    const beamH = 200;
    const beamGeo = new T.CylinderGeometry(1.0, 1.0, beamH, 6);
    const beamMat = new T.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.2 });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = beamH / 2;
    group.add(beam);

    // Top orb
    const orbGeo = new T.SphereGeometry(6, 16, 12);
    const orbMat = new T.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 2.0, transparent: true, opacity: 0.9 });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = beamH + 8;
    group.add(orb);

    // Halo
    const haloGeo = new T.TorusGeometry(10, 0.4, 8, 32);
    const haloMat = new T.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.5 });
    const halo = new T.Mesh(haloGeo, haloMat);
    halo.position.y = beamH + 8;
    group.add(halo);

    // Point light
    const light = new T.PointLight(accentColor, 2.0, 150);
    light.position.y = beamH + 8;
    group.add(light);

    // Ambient particles
    const particleCount = 300;
    const particleGeo = new T.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (rng() - 0.5) * 300;
      particlePos[i + 1] = rng() * 100;
      particlePos[i + 2] = (rng() - 0.5) * 300;
    }
    particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
    const particleMat = new T.PointsMaterial({
      color: accentColor, size: 0.4, transparent: true, opacity: 0.5, depthWrite: false
    });
    const particles = new T.Points(particleGeo, particleMat);
    particles.userData.isAmbientParticles = true;
    group.add(particles);

    // Atmosphere dome
    const domeGeo = new T.SphereGeometry(200, 16, 12);
    const domeMat = new T.MeshBasicMaterial({
      color: accentColor, transparent: true, opacity: 0.02, side: T.BackSide, depthWrite: false
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.position.y = 50;
    group.add(dome);

    return group;
  }

  // ====== GRAND TOWER — the massive central tower ======
  function createGrandTower(pos, rng) {
    const group = new T.Group();
    group.position.copy(pos);
    const color = 0xffcc44;

    // ── GROUND PLATFORM (200u diameter) ──
    const ground = new T.Mesh(
      new T.CylinderGeometry(100, 110, 3, 32),
      new T.MeshStandardMaterial({ color: 0x0a0a1a, emissive: color, emissiveIntensity: 0.08, metalness: 0.8, roughness: 0.4 })
    );
    ground.position.y = -1;
    ground.receiveShadow = true;
    group.add(ground);

    // Ground glow rings — 3 rings for more drama
    for (let r = 0; r < 3; r++) {
      const ringR = 105 + r * 12;
      const ringOp = 0.5 - r * 0.15;
      const ring = new T.Mesh(
        new T.TorusGeometry(ringR, 0.8 - r * 0.2, 8, 48),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: ringOp })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      group.add(ring);
    }

    // ── TOWER CORE (500u tall, 15 floors) ──
    const towerH = 500;
    const towerW = 22;
    const floorCount = 15;
    const floorH = towerH / floorCount;
    for (let i = 0; i < floorCount; i++) {
      const taper = 1 - i * 0.04;
      const fw = towerW * taper;
      const fh = floorH - 1;
      const intensity = 0.04 + i * 0.015;
      const floorMat = new T.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x1a1a3a : 0x222255,
        emissive: color,
        emissiveIntensity: intensity,
        metalness: 0.7,
        roughness: 0.3
      });
      const floor = new T.Mesh(new T.BoxGeometry(fw, fh, fw), floorMat);
      floor.position.y = i * floorH + floorH / 2 + 2;
      floor.castShadow = true;
      floor.receiveShadow = true;
      group.add(floor);

      // Window strips on each floor — front and back
      if (i > 0) {
        for (let wy = 0; wy < 4; wy++) {
          const wGeo = new T.BoxGeometry(fw * 0.6, 0.3, 0.05);
          const wMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7 });
          const win = new T.Mesh(wGeo, wMat);
          win.position.set(0, i * floorH + 4 + wy * 4, fw / 2 + 0.03);
          group.add(win);
          const win2 = new T.Mesh(wGeo, wMat);
          win2.position.set(0, i * floorH + 4 + wy * 4, -fw / 2 - 0.03);
          group.add(win2);
          // Side windows
          const win3 = new T.Mesh(new T.BoxGeometry(0.05, 0.3, fw * 0.6), wMat);
          win3.position.set(fw / 2 + 0.03, i * floorH + 4 + wy * 4, 0);
          group.add(win3);
          const win4 = new T.Mesh(new T.BoxGeometry(0.05, 0.3, fw * 0.6), wMat);
          win4.position.set(-fw / 2 - 0.03, i * floorH + 4 + wy * 4, 0);
          group.add(win4);
        }
      }

      // Floor separator ring
      if (i < floorCount - 1) {
        const sepRing = new T.Mesh(
          new T.TorusGeometry(fw * 0.7, 0.4, 8, 16),
          new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
        );
        sepRing.rotation.x = -Math.PI / 2;
        sepRing.position.y = (i + 1) * floorH + 2;
        group.add(sepRing);
      }
    }

    // ── CROWN (orb + halos at top) ──
    const crownY = towerH + 20;
    const orbGeo = new T.SphereGeometry(14, 16, 12);
    const orbMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.0, transparent: true, opacity: 0.95 });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = crownY;
    orb.userData.isGrandTowerOrb = true;
    group.add(orb);

    // Halo rings
    const haloGeo = new T.TorusGeometry(20, 0.8, 8, 32);
    const haloMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.65 });
    const halo = new T.Mesh(haloGeo, haloMat);
    halo.position.y = crownY;
    group.add(halo);

    const halo2Geo = new T.TorusGeometry(28, 0.4, 8, 32);
    const halo2Mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
    const halo2 = new T.Mesh(halo2Geo, halo2Mat);
    halo2.position.y = crownY;
    group.add(halo2);

    // Third halo
    const halo3Geo = new T.TorusGeometry(34, 0.2, 8, 32);
    const halo3Mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 });
    const halo3 = new T.Mesh(halo3Geo, halo3Mat);
    halo3.position.y = crownY;
    group.add(halo3);

    // Crown point light — bright, visible from far
    const crownLight = new T.PointLight(color, 6.0, 500);
    crownLight.position.y = crownY;
    group.add(crownLight);

    // Second light lower
    const midLight = new T.PointLight(color, 2.0, 200);
    midLight.position.y = towerH / 2;
    group.add(midLight);

    // ── BEAM TO SKY ──
    const beamH = 300;
    const beamGeo = new T.CylinderGeometry(2, 2, beamH, 6);
    const beamMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = crownY + beamH / 2;
    group.add(beam);

    // Beam glow — wider cylinder
    const beamGlowGeo = new T.CylinderGeometry(6, 6, beamH, 8);
    const beamGlowMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.06 });
    const beamGlow = new T.Mesh(beamGlowGeo, beamGlowMat);
    beamGlow.position.y = crownY + beamH / 2;
    group.add(beamGlow);

    // ── NAME LABEL ──
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRAND TOWER', 512, 100);
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('50 / 50 / 50 PLT', 512, 170);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(120, 30, 1);
    label.position.y = crownY + 60;
    group.add(label);

    // ── 4 DISTRICTS around tower ──
    const districts = [
      { name: 'work', angle: 0, buildings: [
        { name: 'Forge', h: 12, w: 8, d: 8, shape: 'cylinder' },
        { name: 'Market', h: 8, w: 12, d: 8, shape: 'box' },
        { name: 'Barracks', h: 16, w: 8, d: 6, shape: 'box' },
        { name: 'Farm', h: 3, w: 14, d: 14, shape: 'flat' }
      ]},
      { name: 'home', angle: Math.PI / 2, buildings: [
        { name: 'Town Hall', h: 20, w: 10, d: 10, shape: 'box' },
        { name: 'Vault', h: 10, w: 10, d: 10, shape: 'thick' },
        { name: 'Tower', h: 30, w: 6, d: 6, shape: 'spire' },
        { name: 'Residence', h: 8, w: 8, d: 8, shape: 'box' }
      ]},
      { name: 'social', angle: Math.PI, buildings: [
        { name: 'Breeding Den', h: 10, w: 10, d: 10, shape: 'dome' },
        { name: 'Monument', h: 25, w: 5, d: 5, shape: 'obelisk' },
        { name: 'Exchange', h: 8, w: 10, d: 10, shape: 'circle' },
        { name: 'Pavilion', h: 6, w: 12, d: 12, shape: 'open' }
      ]},
      { name: 'learn', angle: Math.PI * 1.5, buildings: [
        { name: 'Mage Tower', h: 28, w: 7, d: 7, shape: 'crystal' },
        { name: 'Blacksmith', h: 10, w: 8, d: 8, shape: 'chimney' },
        { name: 'Library', h: 14, w: 10, d: 8, shape: 'box' },
        { name: 'Workshop', h: 8, w: 8, d: 8, shape: 'box' }
      ]}
    ];

    const distColor = 0xffcc44;
    for (const d of districts) {
      const distRadius = 60;
      const cx = Math.cos(d.angle) * distRadius;
      const cz = Math.sin(d.angle) * distRadius;

      for (let bi = 0; bi < d.buildings.length; bi++) {
        const b = d.buildings[bi];
        const bx = cx + (rng() - 0.5) * 30;
        const bz = cz + (rng() - 0.5) * 30;
        const mat = new T.MeshStandardMaterial({
          color: 0x222244, emissive: distColor, emissiveIntensity: 0.06, metalness: 0.7, roughness: 0.3
        });

        let mesh;
        if (b.shape === 'cylinder') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.4, b.w * 0.5, b.h, 8), mat);
        } else if (b.shape === 'dome') {
          mesh = new T.Mesh(new T.SphereGeometry(b.w * 0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        } else if (b.shape === 'spire') {
          mesh = new T.Mesh(new T.ConeGeometry(b.w * 0.4, b.h, 6), mat);
        } else if (b.shape === 'obelisk') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.2, b.w * 0.4, b.h, 4), mat);
        } else if (b.shape === 'crystal') {
          mesh = new T.Mesh(new T.OctahedronGeometry(b.w * 0.5, 0), mat);
          mesh.scale.y = b.h / b.w;
        } else if (b.shape === 'flat') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.5, b.w * 0.5, b.h, 6), mat);
        } else if (b.shape === 'circle') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.5, b.w * 0.5, b.h, 16), mat);
        } else if (b.shape === 'thick') {
          mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), new T.MeshStandardMaterial({
            color: 0x333355, emissive: distColor, emissiveIntensity: 0.08, metalness: 0.8, roughness: 0.2
          }));
        } else if (b.shape === 'chimney') {
          const chimneyGroup = new T.Group();
          chimneyGroup.add(new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mat));
          const chimney = new T.Mesh(
            new T.CylinderGeometry(1, 1.5, 6, 6),
            new T.MeshStandardMaterial({ color: 0x444466, emissive: distColor, emissiveIntensity: 0.1 })
          );
          chimney.position.set(b.w * 0.3, b.h / 2 + 3, 0);
          chimneyGroup.add(chimney);
          mesh = chimneyGroup;
          mesh.position.set(bx, 0, bz);
          group.add(mesh);
          continue;
        } else if (b.shape === 'open') {
          mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mat);
        } else {
          mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mat);
        }

        mesh.position.set(bx, b.h / 2 + 2, bz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Window glow on tall buildings
        if (b.h > 8) {
          for (let wy = 3; wy < b.h - 2; wy += 4) {
            const wGeo = new T.BoxGeometry(b.w * 0.5, 0.25, 0.05);
            const wMat = new T.MeshStandardMaterial({ color: distColor, emissive: distColor, emissiveIntensity: 0.5 });
            const win = new T.Mesh(wGeo, wMat);
            win.position.set(bx, wy, bz + (b.d || b.w) / 2 + 0.03);
            group.add(win);
          }
        }
      }

      // District label
      const lCanvas = document.createElement('canvas');
      lCanvas.width = 256; lCanvas.height = 64;
      const lctx = lCanvas.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0.7)';
      lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#ffcc44';
      lctx.font = 'bold 28px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(d.name.toUpperCase(), 128, 42);
      const lTex = new T.CanvasTexture(lCanvas);
      const lLabel = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: lTex, transparent: true }));
      lLabel.position.set(cx, 35, cz);
      lLabel.rotation.x = -Math.PI / 4;
      group.add(lLabel);
    }

    // ── ROAD GRID ──
    const roadMat = new T.MeshStandardMaterial({ color: 0x0a0a22, roughness: 0.8 });
    for (let i = -80; i <= 80; i += 16) {
      const r1 = new T.Mesh(new T.BoxGeometry(160, 0.06, 2.5), roadMat);
      r1.position.set(0, 0.6, i);
      r1.receiveShadow = true;
      group.add(r1);
      const r2 = new T.Mesh(new T.BoxGeometry(2.5, 0.06, 160), roadMat);
      r2.position.set(i, 0.6, 0);
      r2.receiveShadow = true;
      group.add(r2);
    }

    // ── ATMOSPHERE ──
    // Dome
    const domeGeo = new T.SphereGeometry(180, 16, 12);
    const domeMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.02, side: T.BackSide, depthWrite: false
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.position.y = 50;
    group.add(dome);

    // Ambient particles
    const particleCount = 400;
    const particleGeo = new T.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (rng() - 0.5) * 250;
      particlePos[i + 1] = rng() * 150;
      particlePos[i + 2] = (rng() - 0.5) * 250;
    }
    particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
    const particleMat = new T.PointsMaterial({
      color, size: 0.5, transparent: true, opacity: 0.5, depthWrite: false
    });
    const particles = new T.Points(particleGeo, particleMat);
    particles.userData.isAmbientParticles = true;
    group.add(particles);

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
    PORTALS.length = 0;

    const rng = seededRandom('void-population-genesis');

    for (let i = 0; i < WORLD_COUNT; i++) {
      const name = NAMES[i];
      const type = TYPES[i];
      // Use explicit PLT from WORLD_CONFIG if defined, otherwise generate random
      const config = WORLD_CONFIG[i] || {};
      const plt = config.plt || { profit: 20 + Math.floor(rng() * 60), love: 20 + Math.floor(rng() * 60), tax: 10 + Math.floor(rng() * 40) };
      const pos = getWorldPosition(i, rng);

      // Create beacon — ALWAYS visible
      const beacon = createBeacon(name, type, plt, pos);
      worldRoot.add(beacon);

      // Create city skeleton — detailed buildings visible from far
      const city = type === 'cplclone' ? createCPLCloneCity(pos, rng) : type === 'grandtower' ? createGrandTower(pos, rng) : createCitySkeleton(pos, type, rng);
      worldRoot.add(city);

      // Create quest beacon
      const questBeacon = createQuestBeacon({ type }, rng);
      questBeacon.position.copy(pos);
      worldRoot.add(questBeacon);

      // Create denizens
      const denizens = createDenizens(pos, type, rng);
      worldRoot.add(denizens);

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

      worlds.push({ realm, beacon, city, questBeacon, denizens, name, type, plt, position: pos, active: false });
    }

    // Create portal connections — each world connects to 2 others
    for (let i = 0; i < WORLD_COUNT; i++) {
      const from = worlds[i];
      const toIndex = (i + 1) % WORLD_COUNT;
      const to = worlds[toIndex];
      const portal = createPortal(from, to, rng);
      // Position portal at edge of from world
      const dir = new T.Vector3().subVectors(to.position, from.position).normalize();
      portal.position.copy(from.position).add(dir.multiplyScalar(100));
      portal.lookAt(to.position);
      worldRoot.add(portal);
      PORTALS.push({ from: i, to: toIndex, mesh: portal });
    }

    scene.add(worldRoot);

    // Populate void cosmos (starfield, nebulae, suns, planets, moons, sky dome)
    if (voidCosmosApi && voidCosmosApi.populateCosmos) {
      const worldPositions = worlds.map(w => w.position);
      voidCosmosApi.populateCosmos(worldPositions, scene);
    }

    // Build travel panel for easy navigation
    buildTravelPanel();

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
          w.realm.enter();
          w.active = true;
        } else if (w.active && dist > SLEEP_RADIUS) {
          w.realm.root.visible = false;
          w.realm.exit();
          w.active = false;
        }
        if (w.active) w.realm.update(dt);
      }

      // Pulse the orb when close
      if (w.beacon) {
        const orb = w.beacon.children[4]; // orb mesh
        if (orb) {
          const pulse = 1.0 + Math.sin(Date.now() * 0.003 + w.position.x) * 0.15;
          orb.scale.setScalar(pulse);
        }
      }

      // Pulse Grand Tower orb + halos
      if (w.city && w.type === 'grandtower') {
        w.city.children.forEach(child => {
          if (child.userData && child.userData.isGrandTowerOrb) {
            const t = Date.now() * 0.002;
            child.scale.setScalar(1.0 + Math.sin(t) * 0.2);
            child.material.emissiveIntensity = 2.5 + Math.sin(t * 1.5) * 1.0;
          }
        });
      }

      // Animate quest beacon diamond
      if (w.questBeacon) {
        const diamond = w.questBeacon.children[0]; // diamond mesh
        if (diamond) {
          diamond.rotation.y += dt * 0.5;
          diamond.position.y = 20 + Math.sin(Date.now() * 0.002 + w.position.z) * 2;
        }
      }

      // Animate ambient particles
      if (w.city) {
        w.city.children.forEach(child => {
          if (child.userData && child.userData.isAmbientParticles) {
            const positions = child.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
              positions[i] += dt * 0.5;
              if (positions[i] > 80) positions[i] = 0;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      }
    }

    // Animate portal frames
    for (const p of PORTALS) {
      if (p.mesh && p.mesh.children[0]) {
        p.mesh.children[0].rotation.z += dt * 0.3; // rotate frame
      }
    }

    // Animate void cosmos
    if (voidCosmosApi && voidCosmosApi.tickCosmos) {
      voidCosmosApi.tickCosmos(dt);
    }
  }

  function dispose() {
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    if (voidCosmosApi && voidCosmosApi.disposeCosmos) {
      voidCosmosApi.disposeCosmos();
    }
    worlds.length = 0;
    PORTALS.length = 0;
  }

  function jumpToWorld(index) {
    const w = worlds[index];
    if (!w) return;
    const pos = w.position;
    // Try PlayerCam first
    const PlayerCam = (typeof window !== 'undefined' && window.Genesis && window.Genesis.PlayerCam);
    if (PlayerCam && PlayerCam.teleportTo) {
      PlayerCam.teleportTo({ x: pos.x, y: pos.y + 5, z: pos.z });
      return;
    }
    // Fallback: move camera directly
    const cam = camera;
    if (cam) {
      cam.position.set(pos.x + 30, pos.y + 20, pos.z + 30);
      cam.lookAt(pos.x, pos.y, pos.z);
    }
  }

  function buildTravelPanel() {
    if (document.getElementById('void-travel-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'void-travel-panel';
    panel.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:220px;background:rgba(5,5,20,0.92);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:14px;z-index:35;font-family:monospace;pointer-events:auto;max-height:80vh;overflow-y:auto;';

    // Grand Tower — highlighted first
    let html = '<div style="font-size:11px;color:#ffcc44;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;text-align:center;">🏰 GRAND TOWER</div>';
    const towerWorld = worlds.find(w => w.type === 'grandtower');
    if (towerWorld) {
      const towerIdx = worlds.indexOf(towerWorld);
      const dist = Math.round(towerWorld.position.length());
      html += '<div onclick="window.__voidJump(' + towerIdx + ')" style="padding:8px 10px;margin-bottom:8px;background:rgba(255,204,68,0.12);border:1px solid #ffcc44;border-radius:8px;cursor:pointer;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s;font-weight:bold;" onmouseover="this.style.background=\'rgba(255,204,68,0.25)\'" onmouseout="this.style.background=\'rgba(255,204,68,0.12)\'">';
      html += '<span style="color:#ffcc44;">🏰 Grand Tower</span>';
      html += '<span style="font-size:10px;color:#ffcc44aa;">' + dist + 'u</span>';
      html += '</div>';
    }

    // Separator
    html += '<div style="border-top:1px solid rgba(255,255,255,0.1);margin:6px 0;"></div>';
    html += '<div style="font-size:10px;color:#66ffff;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;text-align:center;">⚡ Lost Worlds</div>';

    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i];
      if (w.type === 'grandtower') continue; // skip tower, already shown above
      const color = '#' + (TYPE_COLORS[w.type] || 0x66ffff).toString(16).padStart(6, '0');
      const dist = Math.round(w.position.length());
      html += '<div onclick="window.__voidJump(' + i + ')" style="padding:6px 8px;margin-bottom:4px;background:rgba(255,255,255,0.04);border:1px solid ' + color + '33;border-radius:6px;cursor:pointer;font-size:11px;color:#fff;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.04)\'">';
      html += '<span style="color:' + color + ';">' + w.name + '</span>';
      html += '<span style="font-size:9px;color:#666;">' + dist + 'u</span>';
      html += '</div>';
    }
    html += '<div style="font-size:9px;color:#555;text-align:center;margin-top:8px;">Click world to jump · Click ground to teleport</div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);
    // Wire jump function
    if (typeof window !== 'undefined') {
      window.__voidJump = (i) => jumpToWorld(i);
    }
  }

  const api = {
    populate,
    tick,
    dispose,
    jumpToWorld,
    buildTravelPanel,
    worlds: () => worlds.map(w => ({ name: w.name, type: w.type, plt: w.plt, position: { x: w.position.x, y: w.position.y, z: w.position.z }, active: w.active })),
    summary: () => ({
      enabled: flagOn(),
      worldCount: worlds.length,
      activeWorlds: worlds.filter(w => w.active).length,
      portals: PORTALS.length
    })
  };

  Genesis.VoidPopulation = api;

  if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
    Genesis.EngineScheduler.defineTick('void-population', (dt) => tick(dt), () => flagOn());
  }

  return api;
}

export default { install };
