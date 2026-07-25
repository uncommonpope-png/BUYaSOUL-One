// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city in every direction.
// Each world has: planet, sun, moons, orbiting mechanics, beacons, cities, agents.
// Beacons are created SYNCHRONOUSLY so they're always visible.
// Flag-gated by window.__GENESIS_VOID_POPULATION (default ON).

import * as THREE from 'three';

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
  const worlds = [];
  const worldRoot = new T.Group();
  worldRoot.name = 'void-population';
  const PORTALS = [];
  const orbiters = []; // planets, moons, suns for animation

  function flagOn() {
    return typeof window !== 'undefined' && window.__GENESIS_VOID_POPULATION !== false;
  }

  function randomPosition(index, rng) {
    const angle = (index / WORLD_COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.8;
    const dist = MIN_DIST + rng() * (MAX_DIST - MIN_DIST);
    const y = (rng() - 0.5) * 80;
    return new T.Vector3(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
  }

  // ==================== PLANET SYSTEM ====================

  function createPlanetSystem(color, rng) {
    const group = new T.Group();

    // Planet radius 12-20 (big, visible from far)
    const planetR = 12 + rng() * 8;
    const planetGeo = new T.SphereGeometry(planetR, 48, 48);
    const planetMat = new T.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
      roughness: 0.3, metalness: 0.3
    });
    const planet = new T.Mesh(planetGeo, planetMat);
    planet.position.y = 180 + rng() * 40;
    planet.castShadow = true;
    group.add(planet);

    // Aura glow (2x radius)
    const auraGeo = new T.SphereGeometry(planetR * 2, 24, 24);
    const auraMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const aura = new T.Mesh(auraGeo, auraMat);
    aura.position.copy(planet.position);
    group.add(aura);

    // Atmosphere ring (1.7x radius)
    const ringR = planetR * 1.7;
    const ringGeo = new T.TorusGeometry(ringR, planetR * 0.08, 16, 100);
    const ringMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: T.DoubleSide
    });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.3;
    ring.position.copy(planet.position);
    group.add(ring);

    // Second ring (1.4x radius, tilted differently)
    const ring2Geo = new T.TorusGeometry(planetR * 1.4, planetR * 0.04, 12, 80);
    const ring2Mat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: T.DoubleSide
    });
    const ring2 = new T.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 1.8;
    ring2.rotation.z = 0.3;
    ring2.position.copy(planet.position);
    group.add(ring2);

    // Store orbital data
    const orbitData = {
      mesh: planet,
      aura,
      ring,
      ring2,
      radius: planetR,
      baseY: planet.position.y,
      spin: 0.003 + rng() * 0.005,
      orbitSpeed: 0.002 + rng() * 0.004,
      bobAmp: 3 + rng() * 5,
      bobSpeed: 0.3 + rng() * 0.5,
      baseAng: rng() * Math.PI * 2
    };
    orbiters.push(orbitData);

    return { group, planet, aura, ring, ring2, orbitData };
  }

  // ==================== SUN SYSTEM ====================

  function createSun(color, pos) {
    const group = new T.Group();
    group.position.copy(pos);

    // Sun core (radius 6)
    const sunGeo = new T.SphereGeometry(6, 32, 32);
    const sunMat = new T.MeshBasicMaterial({ color });
    const sun = new T.Mesh(sunGeo, sunMat);
    sun.position.y = 250;
    group.add(sun);

    // Sun glow (3x radius, additive)
    const glowGeo = new T.SphereGeometry(18, 32, 32);
    const glowMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.BackSide
    });
    const glow = new T.Mesh(glowGeo, glowMat);
    glow.position.y = 250;
    group.add(glow);

    // Sun corona (5x radius, very faint)
    const coronaGeo = new T.SphereGeometry(30, 32, 32);
    const coronaMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.04,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.BackSide
    });
    const corona = new T.Mesh(coronaGeo, coronaMat);
    corona.position.y = 250;
    group.add(corona);

    // PointLight (intensity 4, range 800)
    const light = new T.PointLight(color, 4, 800, 2);
    light.position.y = 250;
    group.add(light);

    // Store for animation
    orbiters.push({
      mesh: sun,
      glow,
      corona,
      light,
      isSun: true,
      pulseSpeed: 0.8 + Math.random() * 0.5,
      pulseAmp: 0.1
    });

    return { group, sun, glow, corona, light };
  }

  // ==================== MOON SYSTEM ====================

  function createMoonSystem(planetPos, planetR, color, rng) {
    const group = new T.Group();
    const moons = [];

    const moonCount = 2 + Math.floor(rng() * 2); // 2-3 moons
    for (let i = 0; i < moonCount; i++) {
      const moonR = 1.5 + rng() * 2.5;
      const orbitR = planetR * 1.8 + i * 3 + rng() * 2;
      const moonGeo = new T.SphereGeometry(moonR, 16, 16);
      const moonMat = new T.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.3,
        roughness: 0.5, metalness: 0.2
      });
      const moon = new T.Mesh(moonGeo, moonMat);

      // Moon aura
      const moonAuraGeo = new T.SphereGeometry(moonR * 1.5, 12, 12);
      const moonAuraMat = new T.MeshBasicMaterial({
        color, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const moonAura = new T.Mesh(moonAuraGeo, moonAuraMat);
      moon.add(moonAura);

      const angle = rng() * Math.PI * 2;
      moon.position.set(
        planetPos.x + Math.cos(angle) * orbitR,
        planetPos.y + (rng() - 0.5) * 10,
        planetPos.z + Math.sin(angle) * orbitR
      );

      group.add(moon);
      moons.push({
        mesh: moon,
        orbitRadius: orbitR,
        angle,
        speed: 0.02 + rng() * 0.04,
        tilt: (rng() - 0.5) * 0.3,
        bobAmp: 1 + rng() * 2,
        bobSpeed: 0.5 + rng() * 0.8,
        planetPos: planetPos.clone()
      });
    }

    // Store for animation
    for (const m of moons) {
      orbiters.push({ ...m, isMoon: true });
    }

    return { group, moons };
  }

  // ==================== BEACON ====================

  function createBeacon(name, type, plt, pos) {
    const color = TYPE_COLORS[type] || 0x66ffff;
    const group = new T.Group();
    group.position.copy(pos);

    // Ground platform (100 radius, bigger)
    const platGeo = new T.CylinderGeometry(100, 110, 3, 32);
    const platMat = new T.MeshStandardMaterial({
      color: 0x0a0a1a, emissive: color, emissiveIntensity: 0.1,
      metalness: 0.8, roughness: 0.4
    });
    const plat = new T.Mesh(platGeo, platMat);
    plat.position.y = -1;
    plat.receiveShadow = true;
    group.add(plat);

    // Ground glow rings (3 rings, bigger)
    [100, 110, 120].forEach((r, i) => {
      const rGeo = new T.TorusGeometry(r, 0.8 - i * 0.2, 8, 64);
      const rMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - i * 0.12 });
      const rMesh = new T.Mesh(rGeo, rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.y = 0.5;
      group.add(rMesh);
    });

    // Beacon beam (500 units tall, taller)
    const beamH = 500;
    const beamGeo = new T.CylinderGeometry(2, 2, beamH, 6);
    const beamMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
    const beam = new T.Mesh(beamGeo, beamMat);
    beam.position.y = beamH / 2;
    group.add(beam);

    // Second beam (thinner, brighter)
    const beam2Geo = new T.CylinderGeometry(0.8, 0.8, beamH, 6);
    const beam2Mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const beam2 = new T.Mesh(beam2Geo, beam2Mat);
    beam2.position.y = beamH / 2;
    group.add(beam2);

    // Top orb (radius 10, bigger)
    const orbGeo = new T.SphereGeometry(10, 20, 16);
    const orbMat = new T.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 2.5,
      transparent: true, opacity: 0.9
    });
    const orb = new T.Mesh(orbGeo, orbMat);
    orb.position.y = beamH + 12;
    group.add(orb);

    // Halo rings (3 halos, bigger)
    [16, 22, 28].forEach((r, i) => {
      const hGeo = new T.TorusGeometry(r, 0.6 - i * 0.15, 8, 32);
      const hMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 - i * 0.2 });
      const hMesh = new T.Mesh(hGeo, hMat);
      hMesh.position.y = beamH + 12;
      group.add(hMesh);
    });

    // Point light (intensity 5, range 300)
    const light = new T.PointLight(color, 5, 300);
    light.position.y = beamH + 12;
    group.add(light);

    // Name label sprite
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 512, 95);
    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText(type.toUpperCase() + '  ·  PLT ' + plt.profit + '/' + plt.love + '/' + plt.tax, 512, 180);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(120, 30, 1);
    label.position.y = beamH + 55;
    group.add(label);

    return group;
  }

  // ==================== CITY SKELETON ====================

  function createCitySkeleton(pos, type, rng) {
    const group = new T.Group();
    group.position.copy(pos);
    const color = TYPE_COLORS[type] || 0x66ffff;

    // Ground (500x500, much bigger)
    const ground = new T.Mesh(
      new T.PlaneGeometry(500, 500),
      new T.MeshStandardMaterial({ color: 0x080818, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.5;
    ground.receiveShadow = true;
    group.add(ground);

    // Grid (400x400)
    const grid = new T.GridHelper(400, 40, color, 0x110022);
    grid.position.y = 0.6;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    group.add(grid);

    // Roads (wider, more)
    const roadMat = new T.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });
    for (let i = -140; i <= 140; i += 18) {
      const r1 = new T.Mesh(new T.BoxGeometry(280, 0.08, 3.5), roadMat);
      r1.position.set(0, 0.6, i); r1.receiveShadow = true; group.add(r1);
      const r2 = new T.Mesh(new T.BoxGeometry(3.5, 0.08, 280), roadMat);
      r2.position.set(i, 0.6, 0); r2.receiveShadow = true; group.add(r2);
    }

    // 4 districts (bigger, more buildings)
    const districts = [
      { name: 'work', zone: { x: [-130, -10], z: [-130, -10] }, count: 35, minH: 10, maxH: 50, color: 0x00ffff, eColor: 0x0088aa },
      { name: 'home', zone: { x: [10, 130], z: [-130, -10] }, count: 40, minH: 5, maxH: 25, color: 0xff66aa, eColor: 0xaa3366 },
      { name: 'social', zone: { x: [-130, -10], z: [10, 130] }, count: 28, minH: 4, maxH: 18, color: 0xffaa00, eColor: 0xaa7700 },
      { name: 'learn', zone: { x: [10, 130], z: [10, 130] }, count: 25, minH: 8, maxH: 35, color: 0x00ff88, eColor: 0x00aa55 }
    ];

    for (const d of districts) {
      for (let i = 0; i < d.count; i++) {
        const x = d.zone.x[0] + rng() * (d.zone.x[1] - d.zone.x[0]);
        const z = d.zone.z[0] + rng() * (d.zone.z[1] - d.zone.z[0]);
        const h = d.minH + rng() * (d.maxH - d.minH);
        const w = 3 + rng() * 6;
        const d2 = 3 + rng() * 6;
        const bColor = rng() > 0.6 ? d.color : 0x222244;
        const geo = new T.BoxGeometry(w, h, d2);
        const mat = new T.MeshStandardMaterial({
          color: bColor, emissive: d.eColor, emissiveIntensity: 0.1,
          metalness: 0.7, roughness: 0.3
        });
        const mesh = new T.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);

        // Windows (more rows)
        if (h > 6) {
          for (let wy = 2; wy < h - 1; wy += 2) {
            const wGeo = new T.BoxGeometry(w * 0.7, 0.4, 0.06);
            const wMat = new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.5 });
            const win = new T.Mesh(wGeo, wMat);
            win.position.set(x, wy, z + d2 / 2 + 0.03);
            group.add(win);
          }
        }

        // Cap
        if (h > 15 && rng() > 0.4) {
          const cGeo = new T.BoxGeometry(w + 0.4, 0.4, d2 + 0.4);
          const cMat = new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.6 });
          const cap = new T.Mesh(cGeo, cMat);
          cap.position.set(x, h + 0.2, z);
          group.add(cap);
        }

        // Antenna spire
        if (h > 25 && rng() > 0.3) {
          const spireH = 4 + rng() * 10;
          const spire = new T.Mesh(
            new T.CylinderGeometry(0.1, 0.4, spireH, 4),
            new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.7 })
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
      lctx.font = 'bold 32px sans-serif';
      lctx.textAlign = 'center';
      lctx.fillText(d.name.toUpperCase(), 128, 44);
      const lTex = new T.CanvasTexture(lCanvas);
      const lLabel = new T.Mesh(new T.PlaneGeometry(14, 3.5), new T.MeshBasicMaterial({ map: lTex, transparent: true }));
      lLabel.position.set(cx, 40, cz);
      lLabel.rotation.x = -Math.PI / 4;
      group.add(lLabel);
    }

    // Outer ring buildings (bigger, more rings)
    const ringMat = new T.MeshStandardMaterial({ color: 0x222244, emissive: 0x110022, emissiveIntensity: 0.12, metalness: 0.6, roughness: 0.4 });
    const ringCounts = [
      { r: 140, count: 24, skip: 0.35 },
      { r: 180, count: 32, skip: 0.45 },
      { r: 220, count: 40, skip: 0.55 }
    ];
    for (const rc of ringCounts) {
      for (let i = 0; i < rc.count; i++) {
        if (rng() < rc.skip) continue;
        const angle = (i / rc.count) * Math.PI * 2 + rng() * 0.3;
        const rr = rc.r + rng() * 15 - 7;
        const x = Math.cos(angle) * rr;
        const z = Math.sin(angle) * rr;
        const h = 5 + rng() * 22;
        const w = 2 + rng() * 6;
        const d2 = 2 + rng() * 6;
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d2), ringMat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
      }
    }

    // POI chevron (bigger, higher)
    const poiGroup = new T.Group();
    poiGroup.position.set(0, 80, 0);
    const chevGeo = new T.BufferGeometry();
    const chevVerts = new Float32Array([
      -3, 0, 0,  0, 3, 0,  0, 0, 0,
      0, 0, 0,  0, 3, 0,  3, 0, 0
    ]);
    chevGeo.setAttribute('position', new T.BufferAttribute(chevVerts, 3));
    const chevMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: T.DoubleSide });
    const chevron = new T.Mesh(chevGeo, chevMat);
    chevGeo.computeVertexNormals();
    poiGroup.add(chevron);
    const poiRingGeo = new T.TorusGeometry(4, 0.25, 8, 20);
    const poiRingMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const poiRing = new T.Mesh(poiRingGeo, poiRingMat);
    poiRing.rotation.x = -Math.PI / 2;
    poiGroup.add(poiRing);
    const poiLight = new T.PointLight(color, 1.5, 40);
    poiGroup.add(poiLight);
    group.add(poiGroup);

    // Atmosphere dome (bigger, more visible)
    const domeGeo = new T.SphereGeometry(350, 16, 12);
    const domeMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.04,
      side: T.BackSide, depthWrite: false
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.position.y = 60;
    group.add(dome);

    // Ambient particles (more)
    const particleCount = 400;
    const particleGeo = new T.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (rng() - 0.5) * 400;
      particlePos[i + 1] = rng() * 120;
      particlePos[i + 2] = (rng() - 0.5) * 400;
    }
    particleGeo.setAttribute('position', new T.BufferAttribute(particlePos, 3));
    const particleMat = new T.PointsMaterial({
      color, size: 0.6, transparent: true, opacity: 0.7, depthWrite: false
    });
    const particles = new T.Points(particleGeo, particleMat);
    particles.userData.isAmbientParticles = true;
    group.add(particles);

    return group;
  }

  // ==================== PORTAL ====================

  function createPortal(fromWorld, toWorld, rng) {
    const color = 0x66ffff;
    const group = new T.Group();

    const frameGeo = new T.TorusGeometry(8, 0.6, 8, 32);
    const frameMat = new T.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
      metalness: 0.8, roughness: 0.2
    });
    const frame = new T.Mesh(frameGeo, frameMat);
    frame.rotation.y = Math.PI / 2;
    group.add(frame);

    const innerGeo = new T.CircleGeometry(7.5, 32);
    const innerMat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: 0.25, side: T.DoubleSide
    });
    const inner = new T.Mesh(innerGeo, innerMat);
    inner.rotation.y = Math.PI / 2;
    group.add(inner);

    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#66ffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→ ' + toWorld.name, 256, 55);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('PORTAL', 256, 100);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(14, 3.5, 1);
    label.position.y = 10;
    group.add(label);

    const light = new T.PointLight(color, 2, 50);
    group.add(light);

    return group;
  }

  // ==================== QUEST BEACON ====================

  function createQuestBeacon(world, rng) {
    const color = TYPE_COLORS[world.type] || 0x66ffff;
    const group = new T.Group();

    // Floating diamond (bigger)
    const diamondGeo = new T.OctahedronGeometry(3, 0);
    const diamondMat = new T.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.2,
      metalness: 0.8, roughness: 0.2
    });
    const diamond = new T.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 25;
    diamond.rotation.y = Math.PI / 4;
    group.add(diamond);

    const ringGeo = new T.TorusGeometry(4, 0.2, 8, 16);
    const ringMat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 25;
    group.add(ring);

    const light = new T.PointLight(color, 1.2, 30);
    light.position.y = 25;
    group.add(light);

    // Quest text
    const questText = TYPE_QUESTS[world.type] || 'Explore this world';
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUEST: ' + world.type.toUpperCase(), 256, 45);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffffff';
    const words = questText.split(' ');
    let line = '', y = 75;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > 480) { ctx.fillText(line.trim(), 256, y); line = word + ' '; y += 24; }
      else line = test;
    }
    ctx.fillText(line.trim(), 256, y);
    const tex = new T.CanvasTexture(canvas);
    const label = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    label.scale.set(18, 4.5, 1);
    label.position.y = 35;
    group.add(label);

    return group;
  }

  // ==================== DENIZENS ====================

  function createDenizens(pos, type, rng) {
    const group = new T.Group();
    const color = TYPE_COLORS[type] || 0x66ffff;
    const names = TYPE_DENIZEN_NAMES[type] || ['Citizen'];

    for (let i = 0; i < 8; i++) { // 8 denizens per world
      const name = names[i % names.length];
      const dx = (rng() - 0.5) * 80;
      const dz = (rng() - 0.5) * 80;

      const denizen = new T.Group();
      denizen.position.set(dx, 0, dz);

      const torso = new T.Mesh(
        new T.BoxGeometry(0.6, 0.8, 0.3),
        new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 })
      );
      torso.position.y = 1.2; torso.castShadow = true; denizen.add(torso);

      const head = new T.Mesh(
        new T.SphereGeometry(0.22, 8, 8),
        new T.MeshStandardMaterial({ color: 0xffddcc })
      );
      head.position.y = 1.75; head.castShadow = true; denizen.add(head);

      [-0.07, 0.07].forEach(xo => {
        const eye = new T.Mesh(new T.SphereGeometry(0.04, 6, 6), new T.MeshStandardMaterial({ color: 0x222222 }));
        eye.position.set(xo, 1.78, 0.18); denizen.add(eye);
      });

      [-0.42, 0.42].forEach(xo => {
        const arm = new T.Mesh(
          new T.BoxGeometry(0.14, 0.55, 0.14),
          new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.08 })
        );
        arm.position.set(xo, 1.0, 0); arm.castShadow = true; denizen.add(arm);
      });

      [-0.13, 0.13].forEach(xo => {
        const leg = new T.Mesh(
          new T.BoxGeometry(0.16, 0.65, 0.16),
          new T.MeshStandardMaterial({ color: 0x333366 })
        );
        leg.position.set(xo, 0.32, 0); leg.castShadow = true; denizen.add(leg);
      });

      const nCanvas = document.createElement('canvas');
      nCanvas.width = 256; nCanvas.height = 64;
      const nctx = nCanvas.getContext('2d');
      nctx.fillStyle = 'rgba(0,0,0,0.7)';
      nctx.fillRect(0, 0, 256, 64);
      nctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
      nctx.font = 'bold 22px sans-serif';
      nctx.textAlign = 'center';
      nctx.fillText(name, 128, 42);
      const nTex = new T.CanvasTexture(nCanvas);
      const nSprite = new T.Sprite(new T.SpriteMaterial({ map: nTex, transparent: true }));
      nSprite.position.y = 2.2;
      nSprite.scale.set(2.2, 0.55, 1);
      denizen.add(nSprite);

      group.add(denizen);
    }

    group.position.copy(pos);
    return group;
  }

  // ==================== POPULATE ====================

  function populate(opts) {
    opts = opts || {};
    scene = opts.scene || null;
    camera = opts.camera || null;
    if (!flagOn()) return { built: false, reason: 'flag-off' };
    if (!T || !scene) return { built: false, reason: 'no-THREE/scene' };

    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0;
    PORTALS.length = 0;
    orbiters.length = 0;

    const rng = seededRandom('void-population-genesis-v2');

    for (let i = 0; i < WORLD_COUNT; i++) {
      const name = NAMES[i];
      const type = TYPES[i];
      const plt = { profit: 20 + Math.floor(rng() * 60), love: 20 + Math.floor(rng() * 60), tax: 10 + Math.floor(rng() * 40) };
      const pos = randomPosition(i, rng);
      const color = TYPE_COLORS[type] || 0x66ffff;

      // Planet system (orbiting above)
      const planetSystem = createPlanetSystem(color, rng);
      planetSystem.group.position.copy(pos);
      worldRoot.add(planetSystem.group);

      // Sun (light source for this world)
      const sun = createSun(color, pos);
      worldRoot.add(sun.group);

      // Moons orbiting the planet
      const moonSystem = createMoonSystem(
        planetSystem.planet.position.clone().add(pos),
        planetSystem.orbitData.radius,
        color, rng
      );
      moonSystem.group.position.copy(pos);
      worldRoot.add(moonSystem.group);

      // Beacon (ALWAYS visible)
      const beacon = createBeacon(name, type, plt, pos);
      worldRoot.add(beacon);

      // City skeleton (detailed, ALWAYS visible)
      const city = createCitySkeleton(pos, type, rng);
      worldRoot.add(city);

      // Quest beacon
      const questBeacon = createQuestBeacon({ type }, rng);
      questBeacon.position.copy(pos);
      worldRoot.add(questBeacon);

      // Denizens (8 per world)
      const denizens = createDenizens(pos, type, rng);
      worldRoot.add(denizens);

      // Full Realm (async, hidden until close)
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

      worlds.push({
        realm, beacon, city, questBeacon, denizens,
        planetSystem, sun, moonSystem,
        name, type, plt, position: pos, active: false
      });
    }

    // Portal connections
    for (let i = 0; i < WORLD_COUNT; i++) {
      const from = worlds[i];
      const to = worlds[(i + 1) % WORLD_COUNT];
      const portal = createPortal(from, to, rng);
      const dir = new T.Vector3().subVectors(to.position, from.position).normalize();
      portal.position.copy(from.position).add(dir.multiplyScalar(120));
      portal.lookAt(to.position);
      worldRoot.add(portal);
      PORTALS.push({ from: i, to: (i + 1) % WORLD_COUNT, mesh: portal });
    }

    scene.add(worldRoot);
    buildTravelPanel();

    console.log('[VoidPopulation] Spawned', WORLD_COUNT, 'Lost Worlds with planets, suns, moons at distances', MIN_DIST, '-', MAX_DIST, 'units');
    return { built: true, worlds: worlds.length };
  }

  // ==================== TICK ====================

  function tick(dt) {
    if (!camera) return;
    const camPos = camera.position;
    const time = performance.now() * 0.001;

    // Animate orbiters (planets, moons, suns)
    for (const o of orbiters) {
      if (o.isSun) {
        // Sun pulse
        if (o.glow) {
          const pulse = 1 + Math.sin(time * o.pulseSpeed) * o.pulseAmp;
          o.glow.scale.setScalar(pulse);
        }
        if (o.corona) {
          const pulse = 1 + Math.sin(time * o.pulseSpeed * 0.7) * 0.08;
          o.corona.scale.setScalar(pulse);
        }
      } else if (o.isMoon) {
        // Moon orbit
        o.angle += o.speed * dt;
        const px = o.planetPos.x + Math.cos(o.angle) * o.orbitRadius;
        const pz = o.planetPos.z + Math.sin(o.angle) * o.orbitRadius;
        const py = o.planetPos.y + Math.sin(time * o.bobSpeed) * o.bobAmp + Math.sin(o.angle) * o.tilt * o.orbitRadius;
        o.mesh.position.set(px, py, pz);
      } else {
        // Planet orbit
        o.baseAng += o.orbitSpeed * dt;
        const bobY = Math.sin(time * o.bobSpeed) * o.bobAmp;
        const px = Math.cos(o.baseAng) * 30;
        const pz = Math.sin(o.baseAng) * 30;
        o.mesh.position.x = px;
        o.mesh.position.z = pz;
        o.mesh.position.y = o.baseY + bobY;
        o.mesh.rotation.y += o.spin;
        o.mesh.rotation.x += o.spin * 0.3;
        // Sync aura, rings
        if (o.aura) { o.aura.position.copy(o.mesh.position); }
        if (o.ring) { o.ring.position.copy(o.mesh.position); o.ring.rotation.z += 0.004; }
        if (o.ring2) { o.ring2.position.copy(o.mesh.position); o.ring2.rotation.z -= 0.003; }
      }
    }

    for (const w of worlds) {
      const dx = camPos.x - w.position.x;
      const dy = camPos.y - w.position.y;
      const dz = camPos.z - w.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Realm activation
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

      // Orb pulse
      if (w.beacon) {
        const orb = w.beacon.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius === 10);
        if (orb) {
          const pulse = 1.0 + Math.sin(time * 3 + w.position.x) * 0.15;
          orb.scale.setScalar(pulse);
        }
      }

      // Quest diamond animation
      if (w.questBeacon) {
        const diamond = w.questBeacon.children[0];
        if (diamond) {
          diamond.rotation.y += dt * 0.5;
          diamond.position.y = 25 + Math.sin(time * 2 + w.position.z) * 3;
        }
      }

      // Particle animation
      if (w.city) {
        w.city.children.forEach(child => {
          if (child.userData && child.userData.isAmbientParticles) {
            const positions = child.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
              positions[i] += dt * 0.6;
              if (positions[i] > 120) positions[i] = 0;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      }
    }

    // Portal frame rotation
    for (const p of PORTALS) {
      if (p.mesh && p.mesh.children[0]) {
        p.mesh.children[0].rotation.z += dt * 0.3;
      }
    }
  }

  function dispose() {
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0;
    PORTALS.length = 0;
    orbiters.length = 0;
  }

  function jumpToWorld(index) {
    const w = worlds[index];
    if (!w) return;
    const pos = w.position;
    const PlayerCam = (typeof window !== 'undefined' && window.Genesis && window.Genesis.PlayerCam);
    if (PlayerCam && PlayerCam.teleportTo) {
      PlayerCam.teleportTo({ x: pos.x, y: pos.y + 5, z: pos.z });
      return;
    }
    if (camera) {
      camera.position.set(pos.x + 30, pos.y + 20, pos.z + 30);
      camera.lookAt(pos.x, pos.y, pos.z);
    }
  }

  function buildTravelPanel() {
    if (document.getElementById('void-travel-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'void-travel-panel';
    panel.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:240px;background:rgba(5,5,20,0.92);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;z-index:35;font-family:monospace;pointer-events:auto;max-height:85vh;overflow-y:auto;';
    let html = '<div style="font-size:11px;color:#66ffff;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;text-align:center;">⚡ Lost Worlds</div>';
    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i];
      const color = '#' + (TYPE_COLORS[w.type] || 0x66ffff).toString(16).padStart(6, '0');
      const dist = Math.round(w.position.length());
      html += '<div onclick="window.__voidJump(' + i + ')" style="padding:7px 10px;margin-bottom:5px;background:rgba(255,255,255,0.04);border:1px solid ' + color + '33;border-radius:8px;cursor:pointer;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.12)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.04)\'">';
      html += '<span style="color:' + color + ';">' + w.name + '</span>';
      html += '<span style="font-size:9px;color:#666;">' + dist + 'u</span>';
      html += '</div>';
    }
    html += '<div style="font-size:9px;color:#555;text-align:center;margin-top:10px;">Click world to jump · Click ground to teleport</div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);
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
      portals: PORTALS.length,
      orbiters: orbiters.length
    })
  };

  Genesis.VoidPopulation = api;

  if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
    Genesis.EngineScheduler.defineTick('void-population', (dt) => tick(dt), () => flagOn());
  }

  return api;
}

export default { install };
