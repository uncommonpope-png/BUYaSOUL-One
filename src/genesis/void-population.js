// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city in every direction.
// Each world is a complete Realm with districts, buildings, agents, weather.
// Beacons are created SYNCHRONOUSLY so they're always visible.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';
import { installVoidCosmos } from './void-cosmos.js';

const WORLD_COUNT = 17;
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
  // Stormhold Castle — Outer Void at 3800u
  { x: 3800, y: 0, z: 0, zone: 'outer-void' },
  // Cosmic Colosseum — Outer Void at 4000u
  { x: 0, y: 0, z: -4000, zone: 'outer-void' },
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
  // Stormhold Castle — Outer Void fortress
  { name: 'Stormhold Castle', type: 'castle', plt: { profit: 30, love: 10, tax: 40 } },
  // Cosmic Colosseum — Outer Void arena
  { name: 'Cosmic Colosseum', type: 'colosseum', plt: { profit: 40, love: 20, tax: 30 } },
];

const NAMES = WORLD_CONFIG.map(w => w.name);
const TYPES = ['physics', 'arena', 'soulhome', 'combat', 'crafting', 'trading', 'exploration', 'breeding', 'governance', 'economy', 'building', 'conversation', 'districts', 'cplclone', 'grandtower', 'castle', 'colosseum'];

const TYPE_COLORS = {
  // Lost Mechanics Archetypes
  physics: 0xaa66ff, gacha: 0xff66cc, evolve: 0x66ff88,
  typeadv: 0xff8844, arena: 0xff3355, idle: 0x00ffaa,
  prestige: 0xffdd00, pantheon: 0x4488ff, soulhome: 0xffaa00,
  persona: 0x00ffcc, economy: 0x00ffaa, achievement: 0xff7722,
  // Original types
  combat: 0xff3355, crafting: 0x66ff88, trading: 0xffdd00, exploration: 0xaa66ff,
  breeding: 0xff66cc, governance: 0xff8844, building: 0x4488ff,
  conversation: 0xffaa00, districts: 0x00ffcc, cplclone: 0x66ffff, grandtower: 0xffcc44,   castle: 0xcc8844, colosseum: 0xff8844
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
  grandtower: 'The Grand Tower — ascend 100 floors, forge legendary souls',
  castle: 'Stormhold Castle — conquer the Outer Void fortress, claim its PLT treasury',
  colosseum: 'Cosmic Colosseum — triumph in the arena, earn glory beyond measure'
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
  grandtower: ['Tower Guardian','Forge Master','Soul Keeper','Gate Watcher','Crown Bearer'],
  castle: ['Castle Lord','Keep Warden','Wall Commander','Gate Captain','Iron Sentinel'],
  colosseum: ['Arena Champion','Gladiator Prime','Crowd Master','Sand Lord','Triumph Herald']
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

    // ── HEIGHT FUNCTION (terrain displacement) ──
    function getHeight(x, z) {
      let h = 0;
      h += Math.sin(x * 0.025) * Math.cos(z * 0.025) * 4.0;
      h += Math.sin(x * 0.08) * 1.2;
      h += Math.cos(z * 0.08) * 1.2;
      h += Math.sin(x * 0.15 + z * 0.1) * 0.6;
      return h;
    }

    // ── TERRAIN GROUND (displaced plane) ──
    const terrainGeo = new T.PlaneGeometry(240, 240, 60, 60);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPosAttr = terrainGeo.attributes.position;
    for (let i = 0; i < tPosAttr.count; i++) {
      const x = tPosAttr.getX(i);
      const z = tPosAttr.getZ(i);
      tPosAttr.setY(i, getHeight(x, z));
    }
    tPosAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();

    // Create vertex colors for depth (dark at low, lighter at high)
    const tColors = new Float32Array(tPosAttr.count * 3);
    for (let i = 0; i < tPosAttr.count; i++) {
      const y = tPosAttr.getY(i);
      const t = (y + 5) / 12; // normalize roughly 0-1
      const base = 0.04 + t * 0.04;
      const accent = t * 0.08;
      tColors[i * 3] = base;
      tColors[i * 3 + 1] = base + accent * 0.3;
      tColors[i * 3 + 2] = base + accent * 0.8;
    }
    terrainGeo.setAttribute('color', new T.BufferAttribute(tColors, 3));

    const terrainMat = new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: color,
      emissiveIntensity: 0.02,
      metalness: 0.7,
      roughness: 0.4
    });
    const terrainMesh = new T.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.y = -3;
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // ── WATER POOL (reflective disc at tower base) ──
    const waterGeo = new T.CircleGeometry(30, 48);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new T.MeshStandardMaterial({
      color: 0x1a3366,
      emissive: 0x2244aa,
      emissiveIntensity: 0.15,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });
    const waterMesh = new T.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -2.5;
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    // Water edge glow ring
    const waterRing = new T.Mesh(
      new T.TorusGeometry(30, 0.5, 8, 48),
      new T.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 })
    );
    waterRing.rotation.x = -Math.PI / 2;
    waterRing.position.y = -2.4;
    group.add(waterRing);

    // ── GROUND GLOW RINGS (around terrain edge) ──
    for (let r = 0; r < 3; r++) {
      const ringR = 105 + r * 12;
      const ringOp = 0.4 - r * 0.12;
      const ring = new T.Mesh(
        new T.TorusGeometry(ringR, 0.6 - r * 0.15, 8, 48),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: ringOp })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      group.add(ring);
    }

    // ── TOWER CORE (500u, varied geometry — not just boxes) ──
    const towerH = 500;
    const towerW = 22;
    const crownY = towerH + 20;

    // --- Base: 3-tier ziggurat (wider at bottom) ---
    for (let t = 0; t < 3; t++) {
      const tw = towerW * (1.4 - t * 0.25);
      const th = 30;
      const ty = t * th + th / 2 + 2;
      const tierMat = new T.MeshStandardMaterial({
        color: t === 0 ? 0x0f0f2a : 0x161640,
        emissive: color,
        emissiveIntensity: 0.06 + t * 0.02,
        metalness: 0.7,
        roughness: 0.3
      });
      const tier = new T.Mesh(new T.BoxGeometry(tw, th, tw), tierMat);
      tier.position.y = ty;
      tier.castShadow = true;
      tier.receiveShadow = true;
      group.add(tier);

      // Ziggurat glow edge on each tier
      const edge = new T.Mesh(
        new T.TorusGeometry(tw * 0.7, 0.5, 8, 32),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 - t * 0.1 })
      );
      edge.rotation.x = -Math.PI / 2;
      edge.position.y = ty + th / 2;
      group.add(edge);

      // Buttresses at base (4 angled supports)
      if (t === 0) {
        for (let b = 0; b < 4; b++) {
          const angle = (b / 4) * Math.PI * 2;
          const buttress = new T.Mesh(
            new T.ConeGeometry(3, 25, 4),
            new T.MeshStandardMaterial({ color: 0x1a1a3a, emissive: color, emissiveIntensity: 0.1, metalness: 0.7, roughness: 0.3 })
          );
          buttress.position.set(Math.cos(angle) * (tw / 2 + 4), 12, Math.sin(angle) * (tw / 2 + 4));
          buttress.rotation.z = -Math.cos(angle) * 0.3;
          buttress.rotation.x = Math.sin(angle) * 0.3;
          buttress.castShadow = true;
          group.add(buttress);
        }
      }
    }

    // --- Mid-section: alternating cylinder + box floors ---
    const midStart = 92;
    const midEnd = 350;
    const midFloorH = 28;
    const midCount = Math.floor((midEnd - midStart) / midFloorH);
    for (let i = 0; i < midCount; i++) {
      const y = midStart + i * midFloorH + midFloorH / 2;
      const taper = 1 - (i / midCount) * 0.3;
      const fw = towerW * taper;
      const isCyl = i % 3 === 1; // every 3rd floor is a cylinder

      const floorMat = new T.MeshStandardMaterial({
        color: isCyl ? 0x181838 : 0x1a1a3a,
        emissive: color,
        emissiveIntensity: 0.06 + (i / midCount) * 0.08,
        metalness: 0.7,
        roughness: 0.3
      });

      if (isCyl) {
        // Cylinder floor
        const cyl = new T.Mesh(new T.CylinderGeometry(fw * 0.5, fw * 0.55, midFloorH - 2, 12), floorMat);
        cyl.position.y = y;
        cyl.castShadow = true;
        cyl.receiveShadow = true;
        group.add(cyl);
      } else {
        // Box floor
        const box = new T.Mesh(new T.BoxGeometry(fw, midFloorH - 2, fw), floorMat);
        box.position.y = y;
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
      }

      // Window glow strips — all 4 faces
      for (let wy = 0; wy < 3; wy++) {
        const wGeo = new T.BoxGeometry(fw * 0.5, 0.25, 0.05);
        const wMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
        const wyPos = y - midFloorH / 2 + 4 + wy * 5;
        // Front/back
        const w1 = new T.Mesh(wGeo, wMat);
        w1.position.set(0, wyPos, fw / 2 + 0.03);
        group.add(w1);
        const w2 = new T.Mesh(wGeo, wMat);
        w2.position.set(0, wyPos, -fw / 2 - 0.03);
        group.add(w2);
        // Sides
        const w3 = new T.Mesh(new T.BoxGeometry(0.05, 0.25, fw * 0.5), wMat);
        w3.position.set(fw / 2 + 0.03, wyPos, 0);
        group.add(w3);
        const w4 = new T.Mesh(new T.BoxGeometry(0.05, 0.25, fw * 0.5), wMat);
        w4.position.set(-fw / 2 - 0.03, wyPos, 0);
        group.add(w4);
      }

      // Separator ring between floors
      const sepRing = new T.Mesh(
        new T.TorusGeometry(fw * 0.6, 0.35, 8, 24),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
      );
      sepRing.rotation.x = -Math.PI / 2;
      sepRing.position.y = y + midFloorH / 2;
      group.add(sepRing);
    }

    // --- Observation Deck (wider ring platform at ~250u) ---
    const deckY = 250;
    const deckR = towerW * 0.9;
    const deck = new T.Mesh(
      new T.CylinderGeometry(deckR + 8, deckR + 5, 4, 24),
      new T.MeshStandardMaterial({ color: 0x1a1a3a, emissive: color, emissiveIntensity: 0.12, metalness: 0.7, roughness: 0.3 })
    );
    deck.position.y = deckY;
    deck.castShadow = true;
    group.add(deck);

    // Deck railing (torus)
    const railing = new T.Mesh(
      new T.TorusGeometry(deckR + 8, 0.6, 8, 32),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    railing.rotation.x = -Math.PI / 2;
    railing.position.y = deckY + 2.5;
    group.add(railing);

    // --- Upper section: tapered spire (cone narrowing to crown) ---
    const spireH = towerH - deckY - 10;
    const spireBase = towerW * 0.6;
    const spire = new T.Mesh(
      new T.ConeGeometry(spireBase, spireH, 8),
      new T.MeshStandardMaterial({ color: 0x181838, emissive: color, emissiveIntensity: 0.1, metalness: 0.7, roughness: 0.3 })
    );
    spire.position.y = deckY + spireH / 2 + 2;
    spire.castShadow = true;
    group.add(spire);

    // Spire glow ring at base
    const spireRing = new T.Mesh(
      new T.TorusGeometry(spireBase, 0.4, 8, 24),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
    );
    spireRing.rotation.x = -Math.PI / 2;
    spireRing.position.y = deckY + 2;
    group.add(spireRing);

    // ── CROWN (orb + tilted halos at top) ──
    const orbGeo = new T.SphereGeometry(14, 16, 12);
    const orbMat = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.0, transparent: true, opacity: 0.95 });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = crownY;
    orb.userData.isGrandTowerOrb = true;
    group.add(orb);

    // Inner core (smaller, brighter)
    const coreGeo = new T.SphereGeometry(7, 12, 8);
    const coreMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const core = new T.Mesh(coreGeo, coreMat);
    core.position.y = crownY;
    group.add(core);

    // Halo 1 — horizontal
    const halo1 = new T.Mesh(
      new T.TorusGeometry(22, 0.7, 8, 32),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
    );
    halo1.position.y = crownY;
    halo1.userData.isHalo1 = true;
    group.add(halo1);

    // Halo 2 — tilted 60° on X
    const halo2 = new T.Mesh(
      new T.TorusGeometry(28, 0.4, 8, 32),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
    );
    halo2.position.y = crownY;
    halo2.rotation.x = Math.PI / 3;
    halo2.userData.isHalo2 = true;
    group.add(halo2);

    // Halo 3 — tilted 30° on Z
    const halo3 = new T.Mesh(
      new T.TorusGeometry(34, 0.25, 8, 32),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 })
    );
    halo3.position.y = crownY;
    halo3.rotation.z = Math.PI / 6;
    halo3.userData.isHalo3 = true;
    group.add(halo3);

    // Crown point light — bright, visible from far
    const crownLight = new T.PointLight(color, 6.0, 500);
    crownLight.position.y = crownY;
    group.add(crownLight);

    // Second light lower
    const midLight = new T.PointLight(color, 2.0, 200);
    midLight.position.y = towerH / 2;
    group.add(midLight);

    // ── BEAM TO SKY (tapered, open-ended) ──
    const beamH = 300;
    const beamGeo = new T.CylinderGeometry(1.5, 5, beamH, 12, 1, true);
    const beamMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = crownY + beamH / 2;
    group.add(beam);

    // Beam glow — wider tapered cylinder
    const beamGlowGeo = new T.CylinderGeometry(4, 10, beamH, 12, 1, true);
    const beamGlowMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: T.DoubleSide, depthWrite: false });
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

    // ── HELPER: add windows, caps, spires to a building ──
    const addBuildingDetails = (bx, bz, b, accent, g) => {
      if (b.h > 10) {
        for (let wy = 4; wy < b.h - 2; wy += 5) {
          const wGeo = new T.BoxGeometry(b.w * 0.5, 0.3, 0.05);
          const wMat = new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 });
          const w1 = new T.Mesh(wGeo, wMat);
          w1.position.set(bx, wy, bz + (b.d || b.w) / 2 + 0.03);
          g.add(w1);
          const w2 = new T.Mesh(wGeo, wMat);
          w2.position.set(bx, wy, bz - (b.d || b.w) / 2 - 0.03);
          g.add(w2);
        }
      }
      if (b.h > 14 && rng() > 0.4) {
        const capGeo = new T.BoxGeometry(b.w + 0.5, 0.4, (b.d || b.w) + 0.5);
        const capMat = new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.7 });
        const cap = new T.Mesh(capGeo, capMat);
        cap.position.set(bx, b.h + 2.2, bz);
        g.add(cap);
      }
      if (b.h > 30 && rng() > 0.4) {
        const spireH = 4 + rng() * 8;
        const spire = new T.Mesh(
          new T.CylinderGeometry(0.1, 0.35, spireH, 4),
          new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.8 })
        );
        spire.position.set(bx, b.h + spireH / 2 + 2, bz);
        g.add(spire);
      }
    };

    // ── 4 DISTRICTS around tower (each with own color, taller buildings) ──
    const districts = [
      { name: 'work', angle: 0, accent: 0xff3355, buildings: [
        { name: 'Forge', h: 28, w: 12, d: 10, shape: 'cylinder' },
        { name: 'Market', h: 20, w: 16, d: 12, shape: 'box' },
        { name: 'Barracks', h: 35, w: 10, d: 8, shape: 'box' },
        { name: 'Farm', h: 6, w: 20, d: 18, shape: 'flat' }
      ]},
      { name: 'home', angle: Math.PI / 2, accent: 0xff66aa, buildings: [
        { name: 'Town Hall', h: 40, w: 14, d: 14, shape: 'ziggurat' },
        { name: 'Vault', h: 22, w: 12, d: 12, shape: 'thick' },
        { name: 'Tower', h: 50, w: 8, d: 8, shape: 'spire' },
        { name: 'Residence', h: 18, w: 10, d: 10, shape: 'stacked' }
      ]},
      { name: 'social', angle: Math.PI, accent: 0x00ffcc, buildings: [
        { name: 'Breeding Den', h: 24, w: 14, d: 14, shape: 'dome' },
        { name: 'Monument', h: 45, w: 6, d: 6, shape: 'obelisk' },
        { name: 'Exchange', h: 18, w: 14, d: 14, shape: 'circle' },
        { name: 'Pavilion', h: 14, w: 18, d: 18, shape: 'open' }
      ]},
      { name: 'learn', angle: Math.PI * 1.5, accent: 0x4488ff, buildings: [
        { name: 'Mage Tower', h: 48, w: 10, d: 10, shape: 'crystal' },
        { name: 'Blacksmith', h: 22, w: 12, d: 10, shape: 'chimney' },
        { name: 'Library', h: 30, w: 14, d: 10, shape: 'box' },
        { name: 'Workshop', h: 20, w: 10, d: 10, shape: 'ziggurat' }
      ]}
    ];

    for (const d of districts) {
      const distRadius = 65;
      const cx = Math.cos(d.angle) * distRadius;
      const cz = Math.sin(d.angle) * distRadius;

      for (let bi = 0; bi < d.buildings.length; bi++) {
        const b = d.buildings[bi];
        const bx = cx + (rng() - 0.5) * 35;
        const bz = cz + (rng() - 0.5) * 35;
        const isColored = rng() > 0.4;
        const bColor = isColored ? d.accent : 0x222244;
        const mat = new T.MeshStandardMaterial({
          color: bColor, emissive: d.accent, emissiveIntensity: isColored ? 0.12 : 0.05, metalness: 0.7, roughness: 0.3
        });

        let mesh;
        if (b.shape === 'cylinder') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.4, b.w * 0.5, b.h, 8), mat);
        } else if (b.shape === 'dome') {
          mesh = new T.Mesh(new T.SphereGeometry(b.w * 0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        } else if (b.shape === 'spire') {
          mesh = new T.Mesh(new T.ConeGeometry(b.w * 0.4, b.h, 6), mat);
        } else if (b.shape === 'obelisk') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.15, b.w * 0.35, b.h, 4), mat);
        } else if (b.shape === 'crystal') {
          mesh = new T.Mesh(new T.OctahedronGeometry(b.w * 0.5, 0), mat);
          mesh.scale.y = b.h / b.w;
        } else if (b.shape === 'flat') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.5, b.w * 0.5, b.h, 6), mat);
        } else if (b.shape === 'circle') {
          mesh = new T.Mesh(new T.CylinderGeometry(b.w * 0.5, b.w * 0.5, b.h, 16), mat);
        } else if (b.shape === 'thick') {
          mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), new T.MeshStandardMaterial({
            color: 0x333355, emissive: d.accent, emissiveIntensity: 0.1, metalness: 0.8, roughness: 0.2
          }));
        } else if (b.shape === 'ziggurat') {
          // 3-tier tapered building
          const zGroup = new T.Group();
          for (let t = 0; t < 3; t++) {
            const tw = b.w * (1 - t * 0.2);
            const td = b.d * (1 - t * 0.2);
            const th = b.h / 3;
            const tier = new T.Mesh(
              new T.BoxGeometry(tw, th, td),
              new T.MeshStandardMaterial({ color: bColor, emissive: d.accent, emissiveIntensity: 0.08 + t * 0.03, metalness: 0.6, roughness: 0.3 })
            );
            tier.position.y = th / 2 + t * th;
            tier.castShadow = true;
            zGroup.add(tier);
          }
          mesh = zGroup;
          mesh.position.set(bx, 2, bz);
          mesh.userData.buildingType = b.name;
          mesh.userData.district = d.name;
          mesh.userData.isTowerBuilding = true;
          group.add(mesh);
          // Skip normal positioning
          addBuildingDetails(bx, bz, b, d.accent, group);
          continue;
        } else if (b.shape === 'stacked') {
          // 2-tier building
          const sGroup = new T.Group();
          for (let t = 0; t < 2; t++) {
            const tw = b.w * (1 - t * 0.15);
            const td = b.d * (1 - t * 0.15);
            const th = b.h / 2;
            const tier = new T.Mesh(
              new T.BoxGeometry(tw, th, td),
              new T.MeshStandardMaterial({ color: bColor, emissive: d.accent, emissiveIntensity: 0.1, metalness: 0.6, roughness: 0.3 })
            );
            tier.position.y = th / 2 + t * th;
            tier.castShadow = true;
            sGroup.add(tier);
          }
          mesh = sGroup;
          mesh.position.set(bx, 2, bz);
          mesh.userData.buildingType = b.name;
          mesh.userData.district = d.name;
          mesh.userData.isTowerBuilding = true;
          group.add(mesh);
          addBuildingDetails(bx, bz, b, d.accent, group);
          continue;
        } else if (b.shape === 'chimney') {
          const chimneyGroup = new T.Group();
          chimneyGroup.add(new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mat));
          const chimney = new T.Mesh(
            new T.CylinderGeometry(1.5, 2, 10, 6),
            new T.MeshStandardMaterial({ color: 0x444466, emissive: d.accent, emissiveIntensity: 0.15 })
          );
          chimney.position.set(b.w * 0.3, b.h / 2 + 5, 0);
          chimneyGroup.add(chimney);
          mesh = chimneyGroup;
          mesh.position.set(bx, 2, bz);
          mesh.userData.buildingType = b.name;
          mesh.userData.district = d.name;
          mesh.userData.isTowerBuilding = true;
          group.add(mesh);
          addBuildingDetails(bx, bz, b, d.accent, group);
          continue;
        } else {
          mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mat);
        }

        mesh.position.set(bx, b.h / 2 + 2, bz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.buildingType = b.name;
        mesh.userData.district = d.name;
        mesh.userData.isTowerBuilding = true;
        group.add(mesh);

        addBuildingDetails(bx, bz, b, d.accent, group);
      }

      // District ground label
      const lCanvas = document.createElement('canvas');
      lCanvas.width = 256; lCanvas.height = 64;
      const lctx = lCanvas.getContext('2d');
      lctx.fillStyle = 'rgba(0,0,0,0.7)';
      lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#' + d.accent.toString(16).padStart(6, '0');
      lctx.font = 'bold 28px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(d.name.toUpperCase(), 128, 42);
      const lTex = new T.CanvasTexture(lCanvas);
      const lLabel = new T.Mesh(new T.PlaneGeometry(10, 2.5), new T.MeshBasicMaterial({ map: lTex, transparent: true }));
      lLabel.position.set(cx, 25, cz);
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

  function createGalaxy(pos) {
    const count = 15000;
    const radius = 120;
    const branches = 4;
    const spin = 1.5;
    const randomness = 0.4;
    const randomnessPower = 2.5;
    const insideColor = 0xffaa44;
    const outsideColor = 0x4488ff;
    const ySpread = 3;

    const geometry = new T.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);

    const colorInside = new T.Color(insideColor);
    const colorOutside = new T.Color(outsideColor);

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * radius;
      const branchAngle = (i % branches) / branches * Math.PI * 2;
      const spinAngle = r * spin;
      const randomAngle = Math.random() * Math.PI * 2;
      const scatter = Math.pow(Math.random(), randomnessPower) * randomness * (1 - r / radius);
      const randX = Math.cos(randomAngle) * scatter;
      const randZ = Math.sin(randomAngle) * scatter;
      const randY = (Math.random() - 0.5) * ySpread * (1 - r / radius * 0.5);
      const angle = branchAngle + spinAngle;

      positions[i * 3] = Math.cos(angle) * r + randX;
      positions[i * 3 + 1] = randY;
      positions[i * 3 + 2] = Math.sin(angle) * r + randZ;
      radii[i] = r;
      angles[i] = angle;

      const mix = r / radius;
      const c = colorInside.clone().lerp(colorOutside, mix);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));

    const material = new T.PointsMaterial({
      size: 1.2, sizeAttenuation: true, depthWrite: false,
      blending: T.AdditiveBlending, vertexColors: true,
      transparent: true, opacity: 0.9
    });

    const points = new T.Points(geometry, material);
    points.userData.isGalaxy = true;
    points.userData.radii = radii;
    points.userData.angles = angles;
    points.userData.count = count;
    points.userData.branches = branches;
    points.userData.spin = spin;
    points.userData.radius = radius;

    const coreGeo = new T.SphereGeometry(8, 16, 16);
    const coreMat = new T.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.9 });
    const core = new T.Mesh(coreGeo, coreMat);
    core.userData.isGalaxyCore = true;

    const group = new T.Group();
    group.userData.isGalaxyGroup = true;
    group.add(points);
    group.add(core);
    group.position.copy(pos);
    group.rotation.x = 0.3;
    group.rotation.z = 0.1;

    return group;
  }

  function createExplodingPlanet(posOffset) {
    const count = 2000;
    const radius = 12;
    const geometry = new T.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const spherePos = new Float32Array(count * 3);
    const explodeDir = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.8 + Math.random() * 0.2);
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.sin(phi) * Math.sin(theta) * r;
      const z = Math.cos(phi) * r;
      spherePos[i * 3] = x;
      spherePos[i * 3 + 1] = y;
      spherePos[i * 3 + 2] = z;
      const angle = Math.random() * Math.PI * 2;
      const elev = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 20;
      explodeDir[i * 3] = Math.cos(angle) * Math.sin(elev) * dist;
      explodeDir[i * 3 + 1] = Math.cos(elev) * dist;
      explodeDir[i * 3 + 2] = Math.sin(angle) * Math.sin(elev) * dist;
      phases[i] = Math.random() * Math.PI * 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));

    const material = new T.PointsMaterial({
      color: 0xff8844, size: 0.8, sizeAttenuation: true,
      blending: T.AdditiveBlending, transparent: true, opacity: 0.9, depthWrite: false
    });

    const points = new T.Points(geometry, material);
    points.userData.isExplodingPlanet = true;
    points.userData.spherePos = spherePos;
    points.userData.explodeDir = explodeDir;
    points.userData.phases = phases;
    points.userData.count = count;

    const coreGeo = new T.SphereGeometry(2, 12, 12);
    const coreMat = new T.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.8 });
    const core = new T.Mesh(coreGeo, coreMat);
    core.userData.isExplodingCore = true;

    const group = new T.Group();
    group.userData.isExplodingGroup = true;
    group.add(points);
    group.add(core);
    group.position.copy(posOffset);

    return group;
  }

  function createInvertedPyramids(posOffset) {
    const count = 16;
    const geo = new T.ConeGeometry(3, 6, 4);
    const mat = new T.MeshStandardMaterial({
      color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.7, metalness: 0.3, roughness: 0.4
    });
    const mesh = new T.InstancedMesh(geo, mat, count);
    const dummy = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const ringR = 20 + Math.random() * 15;
      const yOff = 280 + Math.random() * 40;
      dummy.position.set(Math.cos(angle) * ringR, yOff, Math.sin(angle) * ringR);
      dummy.rotation.x = Math.PI;
      dummy.rotation.z = Math.random() * Math.PI;
      dummy.scale.setScalar(0.6 + Math.random() * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.isInvertedPyramids = true;
    mesh.userData.pyramidCount = count;
    mesh.position.copy(posOffset);
    return mesh;
  }

  function createSoulBoids(posOffset) {
    const count = 60;
    const geometry = new T.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const boids = [];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 120;
      const z = (Math.random() - 0.5) * 120;
      const y = 5 + Math.random() * 60;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      boids.push({
        pos: new T.Vector3(x, y, z),
        vel: new T.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 2),
        target: new T.Vector3((Math.random() - 0.5) * 100, 10 + Math.random() * 50, (Math.random() - 0.5) * 100),
        timer: Math.random() * 5
      });
    }

    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    const material = new T.PointsMaterial({
      color: 0x66ffff, size: 0.8, sizeAttenuation: true,
      blending: T.AdditiveBlending, transparent: true, opacity: 0.7, depthWrite: false
    });
    const points = new T.Points(geometry, material);
    points.userData.isSoulBoids = true;
    points.userData.boids = boids;
    points.position.copy(posOffset);
    return points;
  }

  function createCastle(pos, rng) {
    const g = new T.Group();
    g.position.copy(pos);

    const stoneMat = new T.MeshStandardMaterial({ color: 0x665544, roughness: 0.8, metalness: 0.2 });
    const roofMat = new T.MeshStandardMaterial({ color: 0x884422, roughness: 0.9, metalness: 0.1 });
    const glowMat = new T.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xffaa44, emissiveIntensity: 0.3 });
    const windowMat = new T.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xff8800, emissiveIntensity: 0.5 });

    const W = 70;
    const wallH = 25;
    const wallT = 3;

    // ── Outer Curtain Wall ──
    const walls = [
      { x: 0, z: W, w: W*2, d: wallT },
      { x: 0, z: -W, w: W*2, d: wallT },
      { x: W, z: 0, w: wallT, d: W*2 },
      { x: -W, z: 0, w: wallT, d: W*2 },
    ];
    for (const wp of walls) {
      const wall = new T.Mesh(new T.BoxGeometry(wp.w, wallH, wp.d), stoneMat);
      wall.position.set(wp.x, wallH/2, wp.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
      const bc = Math.floor(wp.w / 5);
      for (let i = 0; i < bc; i++) {
        if (i % 2 === 0) continue;
        const b = new T.Mesh(new T.BoxGeometry(2.5, 3, wp.d * 0.7), stoneMat);
        b.position.set(wp.x + (i / bc - 0.5) * wp.w, wallH + 1.5, wp.z);
        g.add(b);
      }
    }

    // ── Corner Towers ──
    const corners = [{ x: W, z: W }, { x: W, z: -W }, { x: -W, z: W }, { x: -W, z: -W }];
    for (const c of corners) {
      const th = wallH + 12;
      const tr = 7;
      const tower = new T.Mesh(new T.CylinderGeometry(tr * 0.6, tr, th, 10), stoneMat);
      tower.position.set(c.x, th/2, c.z);
      tower.castShadow = true;
      g.add(tower);
      const roof = new T.Mesh(new T.ConeGeometry(tr * 0.8, 8, 10), roofMat);
      roof.position.set(c.x, th + 4, c.z);
      roof.castShadow = true;
      g.add(roof);
      const slit = new T.Mesh(new T.BoxGeometry(0.4, 2.5, 0.3), windowMat);
      slit.position.set(c.x + tr * 0.6, th * 0.5, c.z);
      g.add(slit);
      const tip = new T.Mesh(new T.SphereGeometry(0.4, 6, 6), glowMat);
      tip.position.set(c.x, th + 8, c.z);
      g.add(tip);
    }

    // ── Central Keep ──
    const kw = 28, kd = 22, kh = 35;
    const keep = new T.Mesh(new T.BoxGeometry(kw, kh, kd), stoneMat);
    keep.position.set(0, kh/2, 0);
    keep.castShadow = true;
    keep.receiveShadow = true;
    g.add(keep);

    // Keep upper tier
    const uw = kw * 0.7, ud = kd * 0.7, uh = 12;
    const upper = new T.Mesh(new T.BoxGeometry(uw, uh, ud), new T.MeshStandardMaterial({ color: 0x776655, roughness: 0.7 }));
    upper.position.set(0, kh + uh/2, 0);
    upper.castShadow = true;
    g.add(upper);

    // Keep roof
    const kRoof = new T.Mesh(new T.ConeGeometry(uw * 0.5, 10, 4), roofMat);
    kRoof.position.set(0, kh + uh + 5, 0);
    g.add(kRoof);

    // Keep windows
    for (let wy = 5; wy < kh; wy += 7) {
      for (let side = -1; side <= 1; side += 2) {
        const ww = new T.Mesh(new T.BoxGeometry(1.5, 3, 0.4), windowMat);
        ww.position.set(kw/2 * side + 0.2, wy, 0);
        g.add(ww);
      }
    }

    // Keep crown beacon
    const crown = new T.Mesh(new T.SphereGeometry(2, 12, 12), new T.MeshStandardMaterial({
      color: 0xffaa44, emissive: 0xffaa44, emissiveIntensity: 1.5
    }));
    crown.position.set(0, kh + uh + 11, 0);
    crown.userData.isCastleCrown = true;
    g.add(crown);

    // Crown beam
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.4, 2.5, 70, 8, 1, true),
      new T.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false })
    );
    beam.position.set(0, kh + uh + 11 + 35, 0);
    beam.userData.isCastleBeam = true;
    g.add(beam);

    // ── Gatehouse ──
    for (let side = -1; side <= 1; side += 2) {
      const gt = new T.Mesh(new T.CylinderGeometry(3.5, 4.5, wallH + 4, 8), stoneMat);
      gt.position.set(side * 8, (wallH + 4)/2, W - 1);
      g.add(gt);
      const gr = new T.Mesh(new T.ConeGeometry(3.5, 5, 8), roofMat);
      gr.position.set(side * 8, wallH + 6.5, W - 1);
      g.add(gr);
    }
    const arch = new T.Mesh(new T.TorusGeometry(5, 1.2, 6, 10, Math.PI), stoneMat);
    arch.rotation.x = Math.PI / 2;
    arch.position.set(0, 5, W);
    g.add(arch);

    // ── Inner courtyard buildings ──
    for (let i = 0; i < 6; i++) {
      const bh = 7 + rng() * 6;
      const bw = 5 + rng() * 4;
      const b = new T.Mesh(new T.BoxGeometry(bw, bh, bw), stoneMat);
      b.position.set((rng() - 0.5) * 50, bh/2, (rng() - 0.5) * 50);
      b.castShadow = true;
      g.add(b);
      const w = new T.Mesh(new T.BoxGeometry(0.8, 1.2, 0.2), windowMat);
      w.position.set(b.position.x + bw/2 + 0.1, b.position.y, b.position.z);
      g.add(w);
    }

    // ── Ground platform ──
    const ground = new T.Mesh(
      new T.CircleGeometry(90, 32),
      new T.MeshStandardMaterial({ color: 0x443322, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    g.add(ground);

    // ── Torchlight particles ──
    const pc = 80;
    const pg = new T.BufferGeometry();
    const pp = new Float32Array(pc * 3);
    for (let i = 0; i < pc * 3; i += 3) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 80;
      pp[i] = Math.cos(a) * r;
      pp[i + 1] = rng() * 45;
      pp[i + 2] = Math.sin(a) * r;
    }
    pg.setAttribute('position', new T.BufferAttribute(pp, 3));
    const pm = new T.PointsMaterial({ color: 0xff8844, size: 0.4, transparent: true, opacity: 0.4, depthWrite: false });
    const particles = new T.Points(pg, pm);
    particles.userData.isCastleParticles = true;
    g.add(particles);

    return g;
  }

  function createColosseum(pos, rng) {
    const g = new T.Group();
    g.position.copy(pos);

    const outerRadius = 40;
    const innerRadius = 25;
    const height = 20;
    const tiers = 5;
    const archCount = 32;

    const stoneMat = new T.MeshStandardMaterial({ color: 0xccbb99, roughness: 0.7, metalness: 0.1 });
    const darkStoneMat = new T.MeshStandardMaterial({ color: 0x887766, roughness: 0.8, metalness: 0.05 });
    const floorMat = new T.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const marbleMat = new T.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.4, metalness: 0.2, emissive: 0x443322, emissiveIntensity: 0.05 });
    const torchMat = new T.MeshStandardMaterial({ color: 0xff6633, emissive: 0xff4400, emissiveIntensity: 2.0 });

    // 1. Arena floor
    const floor = new T.Mesh(new T.CircleGeometry(innerRadius - 0.5, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.1;
    floor.receiveShadow = true;
    g.add(floor);

    // 2. Inner wall
    const innerWall = new T.Mesh(
      new T.CylinderGeometry(innerRadius, innerRadius, 1.5, 64, 1, true),
      new T.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.8, side: T.DoubleSide })
    );
    innerWall.position.y = 0.75;
    innerWall.castShadow = true;
    g.add(innerWall);

    // 3. Seating tiers
    for (let t = 0; t < tiers; t++) {
      const frac = (t + 1) / tiers;
      const radius = innerRadius + frac * (outerRadius - innerRadius) * 0.7;
      const yBase = 1.5 + t * (height / tiers) * 0.8;
      const stepHeight = height / tiers * 0.6;

      const step = new T.Mesh(new T.RingGeometry(radius - 0.6, radius + 0.6, 64), stoneMat);
      step.rotation.x = -Math.PI / 2;
      step.position.y = yBase;
      step.receiveShadow = true;
      g.add(step);

      const riser = new T.Mesh(new T.CylinderGeometry(radius + 0.6, radius + 0.6, stepHeight, 64, 1, true), darkStoneMat);
      riser.position.y = yBase + stepHeight / 2;
      riser.castShadow = true;
      g.add(riser);

      const seat = new T.Mesh(new T.TorusGeometry(radius, 0.3, 8, 64), marbleMat);
      seat.position.y = yBase + 0.2;
      seat.rotation.x = Math.PI / 2;
      seat.scale.set(1, 1, 0.5);
      g.add(seat);
    }

    // 4. Outer wall with arches
    const wallRadius = outerRadius;
    const wallHeight = height;
    const pillarWidth = 0.8;
    const archWidth = 2.0;

    for (let i = 0; i < archCount; i++) {
      const angle = (i / archCount) * Math.PI * 2;
      const midAngle = (angle + ((i + 0.5) / archCount) * Math.PI * 2) / 2;

      const pillar = new T.Mesh(new T.BoxGeometry(pillarWidth, wallHeight, pillarWidth), stoneMat);
      pillar.position.set(Math.cos(angle) * wallRadius, wallHeight / 2, Math.sin(angle) * wallRadius);
      pillar.castShadow = true;
      g.add(pillar);

      const arch = new T.Mesh(new T.TorusGeometry(archWidth / 2, 0.5, 8, 8, Math.PI), marbleMat);
      arch.position.set(Math.cos(midAngle) * wallRadius, wallHeight - 2, Math.sin(midAngle) * wallRadius);
      arch.rotation.y = -midAngle;
      arch.rotation.x = Math.PI / 2;
      arch.scale.set(1, 1, 1.5);
      arch.castShadow = true;
      g.add(arch);

      const panel = new T.Mesh(
        new T.PlaneGeometry(archWidth * 0.8, 3),
        new T.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.8, side: T.DoubleSide })
      );
      panel.position.set(Math.cos(midAngle) * (wallRadius + 0.1), wallHeight - 2.5, Math.sin(midAngle) * (wallRadius + 0.1));
      panel.rotation.y = -midAngle;
      g.add(panel);
    }

    // 5. Upper cornice
    const cornice = new T.Mesh(new T.TorusGeometry(wallRadius + 0.5, 0.6, 8, 64), marbleMat);
    cornice.position.y = wallHeight + 0.2;
    cornice.rotation.x = Math.PI / 2;
    cornice.scale.set(1, 1, 0.8);
    cornice.castShadow = true;
    g.add(cornice);

    // 6. Inner columns
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const col = new T.Mesh(new T.CylinderGeometry(0.4, 0.5, 4, 8), marbleMat);
      col.position.set(Math.cos(angle) * (innerRadius + 0.5), 2, Math.sin(angle) * (innerRadius + 0.5));
      col.castShadow = true;
      g.add(col);

      const cap = new T.Mesh(new T.CylinderGeometry(0.6, 0.4, 0.3, 8), marbleMat);
      cap.position.set(Math.cos(angle) * (innerRadius + 0.5), 4.2, Math.sin(angle) * (innerRadius + 0.5));
      cap.castShadow = true;
      g.add(cap);
    }

    // 7. Giant entrance arch
    const entranceAngle = 0;
    const entranceHeight = wallHeight * 1.3;
    for (let side = -1; side <= 1; side += 2) {
      const ep = new T.Mesh(new T.BoxGeometry(1.5, entranceHeight, 1.5), marbleMat);
      ep.position.set(Math.cos(entranceAngle + side * 0.15) * wallRadius, entranceHeight / 2, Math.sin(entranceAngle + side * 0.15) * wallRadius);
      ep.castShadow = true;
      g.add(ep);
    }
    const archTop = new T.Mesh(new T.BoxGeometry(4, 1.5, 1.5), marbleMat);
    archTop.position.set(Math.cos(entranceAngle) * wallRadius, entranceHeight, Math.sin(entranceAngle) * wallRadius);
    archTop.castShadow = true;
    g.add(archTop);

    // 8. Torches
    for (let i = 0; i < archCount; i++) {
      const angle = (i / archCount) * Math.PI * 2;
      const torch = new T.Mesh(new T.SphereGeometry(0.3, 6, 6), torchMat);
      torch.position.set(Math.cos(angle) * (wallRadius + 0.8), wallHeight * 0.9, Math.sin(angle) * (wallRadius + 0.8));
      torch.userData = { torchPhase: i * 1.2 };
      g.add(torch);
    }

    // 9. Ground disc
    const groundDisc = new T.Mesh(
      new T.CircleGeometry(outerRadius + 5, 64),
      new T.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.9 })
    );
    groundDisc.rotation.x = -Math.PI / 2;
    groundDisc.position.y = -0.5;
    groundDisc.receiveShadow = true;
    g.add(groundDisc);

    // 10. Floating embers
    const ec = 200;
    const eg = new T.BufferGeometry();
    const ep2 = new Float32Array(ec * 3);
    for (let i = 0; i < ec * 3; i += 3) {
      const a = rng() * Math.PI * 2;
      const r = rng() * outerRadius;
      ep2[i] = Math.cos(a) * r;
      ep2[i + 1] = rng() * height * 1.5;
      ep2[i + 2] = Math.sin(a) * r;
    }
    eg.setAttribute('position', new T.BufferAttribute(ep2, 3));
    const em = new T.PointsMaterial({ color: 0xff8844, size: 0.2, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false });
    const embers = new T.Points(eg, em);
    embers.userData.isColosseumEmbers = true;
    g.add(embers);

    return g;
  }

  function populate(opts) {
    opts = opts || {};
    scene = opts.scene || null;
    camera = opts.camera || null;
    if (!flagOn()) return { built: false, reason: 'flag-off' };
    if (!T || !scene) return { built: false, reason: 'no-THREE/scene' };

    // Wire building click handler once
    if (!window.__towerBuildingClickWired) {
      window.__towerBuildingClickWired = true;
      const _ray = new T.Raycaster();
      const _ptr = new T.Vector2();
      window.addEventListener('pointerdown', (ev) => {
        if (!camera || !worldRoot) return;
        const rect = ev.target.getBoundingClientRect();
        _ptr.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        _ptr.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        _ray.setFromCamera(_ptr, camera);
        const hits = _ray.intersectObjects(worldRoot.children, true);
        for (const hit of hits) {
          let obj = hit.object;
          while (obj) {
            if (obj.userData && obj.userData.isTowerBuilding) {
              const type = obj.userData.buildingType;
              const dist = obj.userData.district;
              const name = type;
              if (window.Genesis && window.Genesis.EventBridge) {
                window.Genesis.EventBridge.emit('building:click', { type, district: dist, name });
              }
              if (window.Genesis && window.Genesis.PLT && typeof window.Genesis.PLT.record === 'function') {
                window.Genesis.PLT.record('building.click.' + type.toLowerCase(), { profit: 0.5, love: 0.3, tax: 0.1 }, { actor: 'player', building: type });
              }
              console.log('[Tower] Clicked', type);
              break;
            }
            obj = obj.parent;
          }
        }
      }, { passive: true });
    }

    // Wire Farm passive income mechanic (GT-P13)
    if (!window.__farmMechanicWired) {
      window.__farmMechanicWired = true;
      const RP = window.Genesis && window.Genesis.ResourcePool;
      if (RP) {
        RP.ensure('grand-tower-farm', 100, 2);
        console.log('[Farm] Pool ensured: max=100, regen=2/tick');
      }
      const EB = window.Genesis && window.Genesis.EventBridge;
      if (EB) {
        EB.registerTrigger({
          when: 'building:click',
          condition: (p) => p && p.type === 'Farm',
          action: () => {
            if (!RP) return;
            if (RP.spend('grand-tower-farm', 10)) {
              RP.regen('grand-tower-farm');
              RP.addPLT('grand-tower-farm', 5, 2, 1);
              window.__farmLastClickTime = Date.now();
              const stats = RP.get('grand-tower-farm');
              console.log('[Farm] Tended! +5 Profit, +2 Love, +1 Tax | Energy: ' + stats.energy + '/' + stats.max + ' | PLT: P' + stats.profit + ' L' + stats.love + ' T' + stats.tax);
            } else {
              console.log('[Farm] Too tired! Energy depleted — wait for regen.');
            }
          }
        });
        console.log('[Farm] EventBridge trigger registered.');
      }
    }

    // Wire Market trading mechanic (GT-P14)
    if (!window.__marketMechanicWired) {
      window.__marketMechanicWired = true;
      const RP = window.Genesis && window.Genesis.ResourcePool;
      if (RP) {
        RP.ensure('grand-tower-market', 100, 3);
        RP.addItem('grand-tower-market', 'profit', 5);
        RP.addItem('grand-tower-market', 'love', 5);
        RP.addItem('grand-tower-market', 'tax', 5);
        console.log('[Market] Pool + stock seeded.');
      }
      const EB = window.Genesis && window.Genesis.EventBridge;
      if (EB) {
        EB.registerTrigger({
          when: 'building:click',
          condition: (p) => p && p.type === 'Market',
          action: () => {
            if (!RP) return;
            if (RP.spend('grand-tower-market', 15)) {
              const roll = Math.random();
              let profit = 0, love = 0, tax = 0, quality = 'common';
              if (roll < 0.2) {
                profit = 12; love = 4; tax = 0; quality = 'rare';
              } else if (roll < 0.7) {
                profit = 5; love = 3; tax = 1; quality = 'common';
              } else {
                profit = 3; love = 1; tax = 3; quality = 'poor';
              }
              RP.addPLT('grand-tower-market', profit, love, tax);
              window.__marketLastTrade = { time: Date.now(), quality, profit, love, tax };
              const stats = RP.get('grand-tower-market');
              console.log('[Market] ' + quality.toUpperCase() + ' trade! +' + profit + ' Profit, +' + love + ' Love, +' + tax + ' Tax | Energy: ' + stats.energy + '/' + stats.max);
            } else {
              console.log('[Market] Not enough energy — wait for regen.');
            }
          }
        });
        console.log('[Market] EventBridge trigger registered.');
      }
    }

    // Wire Barracks combat mechanic (GT-P15)
    if (!window.__barracksMechanicWired) {
      window.__barracksMechanicWired = true;
      const RP = window.Genesis && window.Genesis.ResourcePool;
      if (RP) RP.ensure('grand-tower-barracks', 100, 2);
      const EB = window.Genesis && window.Genesis.EventBridge;
      if (EB) {
        EB.registerTrigger({
          when: 'building:click',
          condition: (p) => p && p.type === 'Barracks',
          action: () => {
            if (!RP) return;
            if (RP.spend('grand-tower-barracks', 20)) {
              const hit = Math.random();
              let profit = 0, love = 0, tax = 0, result = 'miss';
              if (hit < 0.2) {
                profit = 15; love = 5; tax = 2; result = 'critical';
              } else if (hit < 0.65) {
                profit = 8; love = 3; tax = 4; result = 'hit';
              } else {
                profit = 0; love = 1; tax = 5; result = 'blocked';
              }
              RP.addPLT('grand-tower-barracks', profit, love, tax);
              RP.regen('grand-tower-barracks');
              window.__barracksLastCombat = { time: Date.now(), result, profit, love, tax };
              const stats = RP.get('grand-tower-barracks');
              console.log('[Barracks] ' + result.toUpperCase() + '! +' + profit + 'P +' + love + 'L -' + tax + 'T | Energy: ' + stats.energy + '/' + stats.max);
            } else {
              console.log('[Barracks] Too exhausted to train!');
            }
          }
        });
        console.log('[Barracks] Combat trigger registered.');
      }
    }

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
      let city;
      if (type === 'cplclone') {
        city = createCPLCloneCity(pos, rng);
      } else if (type === 'grandtower') {
        city = createGrandTower(pos, rng);
        const galaxy = createGalaxy(new T.Vector3(0, 500, 0));
        city.add(galaxy);
        const planet = createExplodingPlanet(new T.Vector3(70, 300, 0));
        planet.userData.orbitSpeed = 0.15;
        city.add(planet);
        const pyramids = createInvertedPyramids(new T.Vector3(0, 0, 0));
        pyramids.userData.rotateSpeed = 0.08;
        city.add(pyramids);
        const boids = createSoulBoids(new T.Vector3(0, 0, 0));
        city.add(boids);
      } else if (type === 'castle') {
        city = createCastle(pos, rng);
      } else if (type === 'colosseum') {
        city = createColosseum(pos, rng);
      } else {
        city = createCitySkeleton(pos, type, rng);
      }
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

    // Throttled passive income: regen all ResourcePools once per second
    if (!window.__lastRegenTick || Date.now() - window.__lastRegenTick > 1000) {
      window.__lastRegenTick = Date.now();
      const RP = window.Genesis && window.Genesis.ResourcePool;
      if (RP) {
        RP.regenAll();
        const farm = RP.get('grand-tower-farm');
        if (farm) {
          if (farm.energy > 50) RP.addPLT('grand-tower-farm', 1, 0, 0);
        }
        const market = RP.get('grand-tower-market');
        if (market && market.energy > 60) {
          RP.addPLT('grand-tower-market', 2, 1, 0);
        }
        const barracks = RP.get('grand-tower-barracks');
        if (barracks && barracks.energy > 70) {
          RP.addPLT('grand-tower-barracks', 1, 0, 1);
        }
      }
    }

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
          // Animate water opacity
          if (child.material && child.material.metalness > 0.8 && child.geometry && child.geometry.type === 'CircleGeometry') {
            child.material.opacity = 0.6 + Math.sin(Date.now() * 0.001) * 0.1;
          }
          // Rotate tilted halos
          if (child.userData && child.userData.isHalo1) child.rotation.y += dt * 0.08;
          if (child.userData && child.userData.isHalo2) child.rotation.y += dt * 0.15;
          if (child.userData && child.userData.isHalo3) child.rotation.y -= dt * 0.1;
          // Galaxy differential rotation
          if (child.userData && child.userData.isGalaxy) {
            const posArr = child.geometry.attributes.position.array;
            const radii = child.userData.radii;
            const angles = child.userData.angles;
            const count = child.userData.count;
            const t = Date.now() * 0.00005;
            for (let i = 0; i < count; i++) {
              const r = radii[i];
              const speed = 1 / (0.3 + r * 0.02);
              const newAngle = angles[i] + t * speed;
              posArr[i * 3] = Math.cos(newAngle) * r;
              posArr[i * 3 + 2] = Math.sin(newAngle) * r;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
          // Galaxy core pulse
          if (child.userData && child.userData.isGalaxyCore) {
            const p = 1.0 + Math.sin(Date.now() * 0.003) * 0.15;
            child.scale.setScalar(p);
          }
          // Exploding planet orbit + cycle
          if (child.userData && child.userData.isExplodingGroup) {
            child.rotation.y += dt * (child.userData.orbitSpeed || 0.15);
          }
          if (child.userData && child.userData.isExplodingPlanet) {
            const posArr = child.geometry.attributes.position.array;
            const sp = child.userData.spherePos;
            const ed = child.userData.explodeDir;
            const ph = child.userData.phases;
            const cn = child.userData.count;
            const t = Date.now() * 0.001;
            for (let i = 0; i < cn; i++) {
              const cycle = Math.sin(t * 0.5 + ph[i]);
              const mix = cycle * 0.5 + 0.5;
              posArr[i * 3] = sp[i * 3] + ed[i * 3] * mix;
              posArr[i * 3 + 1] = sp[i * 3 + 1] + ed[i * 3 + 1] * mix;
              posArr[i * 3 + 2] = sp[i * 3 + 2] + ed[i * 3 + 2] * mix;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
          if (child.userData && child.userData.isExplodingCore) {
            const p = 1.0 + Math.sin(Date.now() * 0.005) * 0.2;
            child.scale.setScalar(p);
          }
          // Inverted pyramids rotation
          if (child.userData && child.userData.isInvertedPyramids) {
            child.rotation.y += dt * (child.userData.rotateSpeed || 0.08);
          }
          // Soul boids flocking
          if (child.userData && child.userData.isSoulBoids) {
            const posArr = child.geometry.attributes.position.array;
            const boids = child.userData.boids;
            const targetChangeSpeed = 3;
            for (let i = 0; i < boids.length; i++) {
              const b = boids[i];
              b.timer -= dt;
              if (b.timer <= 0) {
                b.target.set(
                  (Math.random() - 0.5) * 100,
                  10 + Math.random() * 50,
                  (Math.random() - 0.5) * 100
                );
                b.timer = 3 + Math.random() * targetChangeSpeed;
              }
              const steer = new T.Vector3().subVectors(b.target, b.pos).normalize().multiplyScalar(0.5);
              b.vel.add(steer);
              b.vel.x += (Math.random() - 0.5) * 0.1;
              b.vel.z += (Math.random() - 0.5) * 0.1;
              b.vel.clampLength(0, 2);
              b.pos.add(b.vel.clone().multiplyScalar(dt));
              posArr[i * 3] = b.pos.x;
              posArr[i * 3 + 1] = b.pos.y;
              posArr[i * 3 + 2] = b.pos.z;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
          // Farm click glow feedback
          if (window.__farmLastClickTime && child.userData && child.userData.buildingType === 'Farm' && child.isMesh && child.material) {
            const elapsed = Date.now() - window.__farmLastClickTime;
            if (elapsed < 1500) {
              const decay = 1 - elapsed / 1500;
              child.material.emissiveIntensity = 0.12 + Math.sin(elapsed * 0.02) * 0.5 * decay;
            } else {
              child.material.emissiveIntensity = 0.12;
            }
          }
          // Market trade glow feedback
          if (window.__marketLastTrade && child.userData && child.userData.buildingType === 'Market' && child.isMesh && child.material) {
            const elapsed = Date.now() - window.__marketLastTrade.time;
            if (elapsed < 1500) {
              const decay = 1 - elapsed / 1500;
              const isRare = window.__marketLastTrade.quality === 'rare';
              child.material.color.setHex(isRare ? 0xffdd44 : window.__marketLastTrade.quality === 'poor' ? 0xff4444 : 0x44ff88);
              child.material.emissiveIntensity = 0.5 + Math.sin(elapsed * 0.025) * 0.4 * decay;
            } else {
              child.material.color.setHex(0x222244);
              child.material.emissiveIntensity = 0.12;
            }
          }
          // Barracks combat glow feedback
          if (window.__barracksLastCombat && child.userData && child.userData.buildingType === 'Barracks' && child.isMesh && child.material) {
            const elapsed = Date.now() - window.__barracksLastCombat.time;
            if (elapsed < 1200) {
              const decay = 1 - elapsed / 1200;
              const isCrit = window.__barracksLastCombat.result === 'critical';
              child.material.color.setHex(isCrit ? 0xffaa00 : window.__barracksLastCombat.result === 'blocked' ? 0x4444ff : 0xff3355);
              child.material.emissiveIntensity = 0.6 + Math.sin(elapsed * 0.03) * 0.5 * decay;
            } else {
              child.material.color.setHex(0x222244);
              child.material.emissiveIntensity = 0.12;
            }
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

      // Castle animations
      if (w.city && w.type === 'castle') {
        w.city.children.forEach(child => {
          if (child.userData && child.userData.isCastleCrown) {
            const p = 1.0 + Math.sin(Date.now() * 0.003) * 0.15;
            child.scale.setScalar(p);
            child.material.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.002) * 0.5;
          }
          if (child.userData && child.userData.isCastleBeam) {
            child.rotation.y += dt * 0.1;
          }
          if (child.userData && child.userData.isCastleParticles) {
            const pos = child.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) {
              pos[i] += dt * 0.3;
              if (pos[i] > 45) pos[i] = 0;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      }

      // Colosseum animations
      if (w.city && w.type === 'colosseum') {
        w.city.children.forEach(child => {
          if (child.userData && child.userData.torchPhase !== undefined && child.isMesh && child.material) {
            const t = Date.now() * 0.002 + child.userData.torchPhase;
            child.material.emissiveIntensity = 1.5 + Math.sin(t) * 0.8;
          }
          if (child.userData && child.userData.isColosseumEmbers) {
            const pos = child.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) {
              pos[i] += dt * 0.5;
              if (pos[i] > 30) pos[i] = 0;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
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
