// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city in every direction.
// Each world is a complete Realm with districts, buildings, agents, weather.
// Beacons are created SYNCHRONOUSLY so they're always visible.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';
import { installVoidCosmos } from './void-cosmos.js';

const WORLD_COUNT = 10;
const MIN_DIST = 600;
const MAX_DIST = 3000;
const WAKE_RADIUS = 800;
const SLEEP_RADIUS = 1200;

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
const TYPE_QUESTS = {
  combat: 'Defeat the Arena Champion — prove your strength in the Pantheon',
  crafting: 'Forge 3 Legendary Souls — master the Soul Forge',
  trading: 'Accumulate 1000 PLT — become the greatest merchant',
  exploration: 'Discover all 5 hidden beacons — map the unknown',
  breeding: 'Breed a Legendary Soul — combine Profit and Love',
  governance: 'Achieve 90% citizen satisfaction — lead with wisdom',
  economy: 'Trigger a market boom — PLT must exceed 200',
  building: 'Construct a Mega-Structure — reach building level 10',
  conversation: 'Hold 10 conversations — connect every citizen',
  districts: 'Unlock all 4 districts — achieve total unity'
};
const TYPE_DENIZEN_NAMES = {
  combat: ['Blade Master','War Chief','Arena Guard','Berserker','Paladin'],
  crafting: ['Forge Keeper','Artisan','Smith','Runecaster','Alchemist'],
  trading: ['Merchant Lord','Broker','Dealer','Banker','Auctioneer'],
  exploration: ['Pathfinder','Scout','Cartographer','Ranger','Explorer'],
  breeding: ['Breeder','Nurturer','Hatchery Master','Geneticist','Keeper'],
  governance: ['Councilor','Judge','Advisor','Elder','Chancellor'],
  economy: ['Economist','Tax Collector','Market Analyst','Investor','Auditor'],
  building: ['Architect','Engineer','Builder','Mason','Contractor'],
  conversation: ['Orator','Diplomat','Counselor','Mediator','Liaison'],
  districts: ['Warden','Overseer','Administrator','Coordinator','Director']
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
      const plt = { profit: 20 + Math.floor(rng() * 60), love: 20 + Math.floor(rng() * 60), tax: 10 + Math.floor(rng() * 40) };
      const pos = randomPosition(i, rng);

      // Create beacon — ALWAYS visible
      const beacon = createBeacon(name, type, plt, pos);
      worldRoot.add(beacon);

      // Create city skeleton — detailed buildings visible from far
      const city = createCitySkeleton(pos, type, rng);
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
    let html = '<div style="font-size:10px;color:#66ffff;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;text-align:center;">⚡ Lost Worlds</div>';
    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i];
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
