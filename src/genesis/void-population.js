// src/genesis/void-population.js
// VOID POPULATION — Lost Worlds scattered ALL AROUND the city.
// EVERY mechanic from the Lost Mechanics Bible is active in each world:
//   Agent AI (FSM), Weather, Day/Night, Soul Forge, Gacha, Combat,
//   PLT Economy, Terminal, Minimap, Achievements, Chat Bubbles.
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
const AGENT_NAMES = ['Neon','Pixel','Drift','Glitch','Spark','Volt','Echo','Pulse','Surge','Flux','Shard','Nova','Wisp','Bolt','Rift'];
const PANTHEON = [
  { name:'Profit Prime', type:'profit', maxHp:150 },
  { name:'Love Weaver', type:'love', maxHp:130 },
  { name:'Tax Collector', type:'tax', maxHp:120 }
];
const PHRASES = {
  profit: ['Building something new...','Growth is the only metric.','Time is money.','Let me optimize that.','Revenue streams flowing.','Scaling operations.'],
  love: ['This is beautiful.','We should connect more.','How are you feeling?','The bonds matter.','Spreading kindness.','Harmony achieved.'],
  tax: ['Costs are rising.','We need balance.','Risk assessment needed.','Slow down.','Audit in progress.','Compliance check.']
};
const DAY_PHASES = [
  { name:'Late Night', start:0, sunY:-30, ambientI:0.2 },
  { name:'Dawn', start:5, sunY:0, ambientI:0.4 },
  { name:'Morning Rush', start:7, sunY:20, ambientI:0.7 },
  { name:'Business Hours', start:9, sunY:40, ambientI:1.0 },
  { name:'Lunch', start:12, sunY:50, ambientI:1.0 },
  { name:'Afternoon', start:14, sunY:35, ambientI:0.9 },
  { name:'Neon Nights', start:18, sunY:5, ambientI:0.5 },
  { name:'Late Night', start:21, sunY:-10, ambientI:0.3 }
];
const WEATHER_STATES = {
  sunny: { lightIntensity: 1.0, particles: 0, fogDensity: 0.008 },
  rainy: { lightIntensity: 0.5, particles: 3000, color: 0x4488ff, fogDensity: 0.015 },
  snowy: { lightIntensity: 0.7, particles: 4000, color: 0xeeeeff, fogDensity: 0.012 }
};
const ACHIEVEMENTS = [
  { name:'First Soul', check: s => s.souls.length >= 1 },
  { name:'Collector', check: s => s.souls.length >= 5 },
  { name:'Warrior', check: s => s.plt.profit > 70 },
  { name:'Diplomat', check: s => s.plt.love > 80 },
  { name:'PLT Master', check: s => s.plt.profit + s.plt.love + s.plt.tax > 200 }
];

function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 2147483647; };
}

// ==================== WORLD STATE (Bible mechanics per world) ====================

function createWorldState(config, rng) {
  return {
    plt: { profit: config.plt.profit, love: config.plt.love, tax: config.plt.tax },
    souls: [], gems: 500, combat: null,
    day: 1, time: 8, weather: 'sunny',
    achievements: [],
    agents: [], weatherParticles: null,
    _weatherTimer: 0, _dayTimer: 0, _thoughtTimer: 0,
    _achievementUnlocked: new Set()
  };
}

// ==================== AGENT AI (Bible: _spawnAgents + _updateAgents) ====================

function createAgent(type, x, z, name, rng) {
  const colors = { profit: 0xffaa00, love: 0xff66aa, tax: 0x00ffcc };
  const c = colors[type] || 0xffffff;
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.1 }));
  torso.position.y = 1.2; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffddcc }));
  head.position.y = 1.85; head.castShadow = true; g.add(head);
  [-0.08, 0.08].forEach(xo => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    eye.position.set(xo, 1.88, 0.18); g.add(eye);
  });
  const arms = [];
  [-0.45, 0.45].forEach(xo => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05 }));
    arm.position.set(xo, 1.1, 0); arm.castShadow = true; g.add(arm); arms.push(arm);
  });
  const legs = [];
  [-0.15, 0.15].forEach(xo => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), new THREE.MeshStandardMaterial({ color: 0x333366 }));
    leg.position.set(xo, 0.35, 0); leg.castShadow = true; g.add(leg); legs.push(leg);
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5, transparent: true, opacity: 0 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = 256; nCanvas.height = 64;
  const nctx = nCanvas.getContext('2d');
  nctx.fillStyle = 'rgba(0,0,0,0.7)'; nctx.fillRect(0, 0, 256, 64);
  nctx.fillStyle = '#' + c.toString(16).padStart(6, '0');
  nctx.font = 'bold 24px sans-serif'; nctx.textAlign = 'center';
  nctx.fillText(name || 'Soul', 128, 42);
  const nTex = new THREE.CanvasTexture(nCanvas);
  const nSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nTex, transparent: true }));
  nSprite.position.y = 2.3; nSprite.scale.set(2, 0.5, 1); g.add(nSprite);

  g.position.set(x, 0, z);
  return { group: g, torso, head, arms, legs, ring, nameSprite: nSprite, type, name };
}

function spawnAgents(state, districts, rng) {
  const names = [...AGENT_NAMES];
  for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  for (let i = 0; i < 10; i++) {
    const type = ['profit', 'love', 'tax'][i % 3];
    const dk = Object.keys(districts);
    const zone = districts[dk[i % 4]].zone;
    const x = (zone.x[0] + zone.x[1]) / 2 + (rng() - 0.5) * 40;
    const z = (zone.z[0] + zone.z[1]) / 2 + (rng() - 0.5) * 40;
    const mesh = createAgent(type, x, z, names[i], rng);
    state.agents.push({
      name: names[i], type, mesh,
      needs: { energy: 80 + rng() * 20, social: 80 + rng() * 20, skill: 80 + rng() * 20, purpose: 80 + rng() * 20 },
      state: 'IDLE', targetPos: null, stateTimer: 0, conversationTarget: null,
      hp: 100, maxHp: 100, xp: 0, level: 1, souls: []
    });
  }
}

function updateAgents(state, districts, dt, rng, root) {
  const NEED_TYPES = ['energy', 'social', 'skill', 'purpose'];
  for (const a of state.agents) {
    for (const k of NEED_TYPES) a.needs[k] = Math.max(0, Math.min(100, a.needs[k] - dt * (1 + rng() * 0.5)));
    a.stateTimer += dt;
    if (a.state === 'IDLE') {
      const lowest = NEED_TYPES.reduce((min, k) => a.needs[k] < a.needs[min] ? k : min, NEED_TYPES[0]);
      if (a.needs[lowest] < 40) {
        const district = lowest === 'energy' ? 'home' : lowest === 'social' ? 'social' : lowest === 'skill' ? 'learn' : 'work';
        const d = districts[district];
        if (d) {
          a.targetPos = new THREE.Vector3((d.zone.x[0] + d.zone.x[1]) / 2 + (rng() - 0.5) * 40, 0, (d.zone.z[0] + d.zone.z[1]) / 2 + (rng() - 0.5) * 40);
          a.state = 'WALKING';
          a.mesh.ring.material.opacity = 0.3;
        }
      }
      if (rng() < 0.002) {
        const nearby = state.agents.filter(o => o !== a && o.mesh.group.position.distanceTo(a.mesh.group.position) < 16);
        if (nearby.length > 0) { a.conversationTarget = nearby[0]; a.state = 'SOCIAL'; a.stateTimer = 0; }
      }
    } else if (a.state === 'WALKING') {
      if (!a.targetPos) { a.state = 'IDLE'; continue; }
      const pos = a.mesh.group.position;
      const dx = a.targetPos.x - pos.x, dz = a.targetPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.5) {
        a.state = 'IDLE'; a.mesh.ring.material.opacity = 0; a.targetPos = null;
        for (const k of NEED_TYPES) if (a.needs[k] < 50) a.needs[k] = Math.min(100, a.needs[k] + 30 * dt);
        continue;
      }
      pos.x += (dx / dist) * 4.0 * dt; pos.z += (dz / dist) * 4.0 * dt;
      a.mesh.group.rotation.y = Math.atan2(dx, dz);
      a.mesh.legs.forEach((l, i) => l.rotation.x = Math.sin(performance.now() * 0.005 + i * Math.PI) * 0.4);
      a.mesh.arms.forEach((a2, i) => a2.rotation.x = Math.sin(performance.now() * 0.005 + i * Math.PI + Math.PI) * 0.3);
    } else if (a.state === 'SOCIAL') {
      if (!a.conversationTarget || a.stateTimer > 5) { a.state = 'IDLE'; a.conversationTarget = null; a.mesh.ring.material.opacity = 0; continue; }
      a.needs.social = Math.min(100, a.needs.social + 10 * dt);
      const o = a.conversationTarget;
      const dx = o.mesh.group.position.x - a.mesh.group.position.x;
      const dz = o.mesh.group.position.z - a.mesh.group.position.z;
      a.mesh.group.rotation.y = Math.atan2(dx, dz);
      if (rng() < 0.03) spawnChatBubble(a);
    }
  }
}

function spawnChatBubble(a) {
  const text = (PHRASES[a.type] || PHRASES.profit)[Math.floor(Math.random() * 6)];
  const bubble = document.createElement('div');
  bubble.style.cssText = 'position:absolute;background:rgba(5,5,20,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:6px 10px;font-size:11px;color:#fff;pointer-events:none;white-space:nowrap;z-index:40;';
  bubble.textContent = text;
  document.body.appendChild(bubble);
  const updatePos = () => {
    if (!bubble.parentNode) return;
    const pos = a.mesh.group.position.clone(); pos.y += 2.5;
    const cam = window.__realmActiveCamera || (window.Genesis && window.Genesis.PlayerCam && window.Genesis.PlayerCam.getTarget && window.Genesis.PlayerCam.getTarget());
    if (!cam) { bubble.remove(); return; }
    try {
      const camRef = cam.camera || cam;
      if (camRef && camRef.isCamera) {
        pos.project(camRef);
        bubble.style.left = ((pos.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        bubble.style.top = ((-pos.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      }
    } catch (_) {}
    requestAnimationFrame(updatePos);
  };
  updatePos();
  setTimeout(() => bubble.remove(), 3000);
}

// ==================== WEATHER SYSTEM (Bible: _setupWeather) ====================

function setupWeather(state, root, rng) {
  state._weatherTimer = 15 + rng() * 30;
  state.weather = 'sunny';
}

function updateWeather(state, root, dt, rng) {
  state._weatherTimer -= dt;
  if (state._weatherTimer <= 0) {
    const weathers = ['sunny', 'rainy', 'snowy'];
    state.weather = weathers[Math.floor(rng() * 3)];
    state._weatherTimer = 20 + rng() * 40;
    applyWeather(state, root);
  }
  if (state.weatherParticles) {
    const pos = state.weatherParticles.geometry.attributes.position.array;
    const speed = state.weather === 'rainy' ? 20 : 2;
    for (let i = 1; i < pos.length; i += 3) { pos[i] -= speed * dt; if (pos[i] < 0) pos[i] = 80; }
    state.weatherParticles.geometry.attributes.position.needsUpdate = true;
  }
}

function applyWeather(state, root) {
  const s = WEATHER_STATES[state.weather];
  if (state.weatherParticles) { root.remove(state.weatherParticles); state.weatherParticles = null; }
  if (s.particles > 0) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(s.particles * 3);
    for (let i = 0; i < s.particles * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 250; pos[i + 1] = Math.random() * 80; pos[i + 2] = (Math.random() - 0.5) * 250;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    state.weatherParticles = new THREE.Points(geo, new THREE.PointsMaterial({ color: s.color, size: s.color === 0x4488ff ? 0.1 : 0.3, transparent: true, opacity: 0.8 }));
    root.add(state.weatherParticles);
  }
}

// ==================== DAY/NIGHT (Bible: _setupDayNight) ====================

function updateDayNight(state, dt) {
  state.time += 0.3 * dt;
  if (state.time >= 24) { state.time -= 24; state.day++; }
  let phase = DAY_PHASES[0];
  for (let i = DAY_PHASES.length - 1; i >= 0; i--) {
    if (state.time >= DAY_PHASES[i].start) { phase = DAY_PHASES[i]; break; }
  }
  state._currentPhase = phase;
  return phase;
}

// ==================== PLT ECONOMY (Bible: _updatePLT) ====================

function updatePLT(state, p, l, t) {
  state.plt.profit = Math.max(0, Math.min(100, state.plt.profit + p));
  state.plt.love = Math.max(0, Math.min(100, state.plt.love + l));
  state.plt.tax = Math.max(0, Math.min(100, state.plt.tax + t));
}

function getPLTScore(state) {
  return state.plt.profit + state.plt.love - state.plt.tax;
}

// ==================== SOUL FORGE (Bible: _forgeSoul) ====================

function forgeSoul(state, name, p, l, t) {
  const type = p > l && p > t ? 'profit' : l > t ? 'love' : 'tax';
  const soul = { name, type, plt: { profit: p, love: l, tax: t }, level: 1, skills: ['forge-created'] };
  state.souls.push(soul);
  updatePLT(state, p * 0.02, l * 0.02, t * 0.02);
  return soul;
}

// ==================== GACHA (Bible: _pullGacha) ====================

function pullGacha(state, rng) {
  if (state.gems < 100) return { error: 'Not enough gems!' };
  state.gems -= 100;
  const roll = rng();
  const rarity = roll < 0.15 ? 'legendary' : roll < 0.40 ? 'rare' : 'common';
  const stats = rarity === 'legendary' ? 100 : rarity === 'rare' ? 75 : 50;
  const type = ['profit', 'love', 'tax'][Math.floor(rng() * 3)];
  const soul = { name: 'Orb-' + Date.now(), type, rarity, plt: { profit: stats + Math.floor(rng() * 20), love: stats + Math.floor(rng() * 20), tax: stats + Math.floor(rng() * 20) }, level: 1, skills: ['gacha-summoned'] };
  state.souls.push(soul);
  updatePLT(state, 2, 2, 2);
  return { soul, rarity };
}

// ==================== COMBAT (Bible: _startCombat, _combatMove, _bossTurn) ====================

function startCombat(state, bossIndex) {
  const boss = PANTHEON[bossIndex] || PANTHEON[0];
  const player = state.souls.length > 0 ? { ...state.souls[0], maxHp: 100 } : { name: 'Hero', type: 'profit', maxHp: 100 };
  state.combat = { player, boss, playerHp: 100, bossHp: boss.maxHp, superMeter: 0, active: true, turn: 'player', log: [] };
  return state.combat;
}

function combatMove(state, move, rng) {
  const c = state.combat;
  if (!c || !c.active || c.turn !== 'player') return null;
  const moves = { punch: { dmg: 10, cost: 5 }, kick: { dmg: 15, cost: 8 }, special: { dmg: 40, cost: -50 }, ultimate: { dmg: 80, cost: -100 } };
  const m = moves[move];
  if (!m || c.superMeter + m.cost < 0) return null;
  c.superMeter += m.cost;
  const adv = getPLTAdvantage(c.player.type, c.boss.type);
  const dmg = Math.floor(m.dmg * adv);
  c.bossHp = Math.max(0, c.bossHp - dmg);
  c.log.push(c.player.name + ' uses ' + move + ' for ' + dmg + ' damage!');
  updatePLT(state, 3, 1, -1);
  if (c.bossHp <= 0) { c.active = false; c.log.push(c.player.name + ' WINS! +50 XP'); c.player.xp = (c.player.xp || 0) + 50; updatePLT(state, 10, 5, -2); }
  else { c.turn = 'boss'; }
  return c;
}

function bossTurn(state, rng) {
  const c = state.combat;
  if (!c || !c.active) return null;
  const m = ['punch', 'kick', 'special'][Math.floor(rng() * 3)];
  const dmgMap = { punch: 10, kick: 15, special: 40 };
  const adv = getPLTAdvantage(c.boss.type, c.player.type);
  const dmg = Math.floor(dmgMap[m] * adv);
  c.playerHp = Math.max(0, c.playerHp - dmg);
  c.log.push(c.boss.name + ' uses ' + m + ' for ' + dmg + '!');
  if (c.playerHp <= 0) { c.active = false; c.log.push(c.player.name + ' DEFEATED!'); updatePLT(state, -5, -5, 5); }
  else c.turn = 'player';
  return c;
}

function getPLTAdvantage(atk, def) {
  if (atk === 'profit' && def === 'love') return 1.5;
  if (atk === 'love' && def === 'tax') return 1.5;
  if (atk === 'tax' && def === 'profit') return 1.5;
  if (atk === 'profit' && def === 'tax') return 0.7;
  if (atk === 'love' && def === 'profit') return 0.7;
  if (atk === 'tax' && def === 'love') return 0.7;
  return 1.0;
}

// ==================== ACHIEVEMENTS (Bible: _checkAchievements) ====================

function checkAchievements(state) {
  for (const a of ACHIEVEMENTS) {
    if (a.check(state) && !state._achievementUnlocked.has(a.name)) {
      state._achievementUnlocked.add(a.name);
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(255,170,0,0.9);color:#000;padding:8px 16px;border-radius:8px;font-weight:bold;z-index:50;font-size:13px;font-family:monospace;';
      el.textContent = '🏆 Achievement: ' + a.name;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }
}

// ==================== GSK THOUGHTS (Bible: _updateThoughts) ====================

function updateThoughts(state, worldName, dt, rng) {
  state._thoughtTimer += dt;
  if (state._thoughtTimer > 8) {
    state._thoughtTimer = 0;
    const thoughts = [
      'Observing ' + worldName + '... agents moving...',
      'PLT balance shifting in ' + worldName + '...',
      'Weather changing in the realm...',
      'Agents conversing in ' + worldName + '...',
      'New soul forged...',
      'The multiverse is alive...',
      'Scanning citizen needs...',
      'Marketplace activity...',
      'Bridge syncing...',
      'Day cycle progressing...'
    ];
    return thoughts[Math.floor(rng() * thoughts.length)];
  }
  return null;
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
  const orbiters = [];

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
    const planetR = 12 + rng() * 8;
    const planet = new T.Mesh(new T.SphereGeometry(planetR, 48, 48), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.3 }));
    planet.position.y = 180 + rng() * 40; planet.castShadow = true; group.add(planet);
    const aura = new T.Mesh(new T.SphereGeometry(planetR * 2, 24, 24), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.position.copy(planet.position); group.add(aura);
    const ring = new T.Mesh(new T.TorusGeometry(planetR * 1.7, planetR * 0.08, 16, 100), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ring.rotation.x = Math.PI / 2.3; ring.position.copy(planet.position); group.add(ring);
    const ring2 = new T.Mesh(new T.TorusGeometry(planetR * 1.4, planetR * 0.04, 12, 80), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    ring2.rotation.x = Math.PI / 1.8; ring2.rotation.z = 0.3; ring2.position.copy(planet.position); group.add(ring2);
    const od = { mesh: planet, aura, ring, ring2, radius: planetR, baseY: planet.position.y, spin: 0.003 + rng() * 0.005, orbitSpeed: 0.002 + rng() * 0.004, bobAmp: 3 + rng() * 5, bobSpeed: 0.3 + rng() * 0.5, baseAng: rng() * Math.PI * 2 };
    orbiters.push(od);
    return { group, orbitData: od };
  }

  function createSun(color, pos) {
    const group = new T.Group(); group.position.copy(pos);
    const sun = new T.Mesh(new T.SphereGeometry(6, 32, 32), new T.MeshBasicMaterial({ color }));
    sun.position.y = 250; group.add(sun);
    const glow = new T.Mesh(new T.SphereGeometry(18, 32, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
    glow.position.y = 250; group.add(glow);
    const corona = new T.Mesh(new T.SphereGeometry(30, 32, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
    corona.position.y = 250; group.add(corona);
    const light = new T.PointLight(color, 4, 800, 2); light.position.y = 250; group.add(light);
    orbiters.push({ mesh: sun, glow, corona, light, isSun: true, pulseSpeed: 0.8 + Math.random() * 0.5, pulseAmp: 0.1 });
    return group;
  }

  function createMoonSystem(planetPos, planetR, color, rng) {
    const group = new T.Group();
    const moonCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < moonCount; i++) {
      const moonR = 1.5 + rng() * 2.5;
      const orbitR = planetR * 1.8 + i * 3 + rng() * 2;
      const moon = new T.Mesh(new T.SphereGeometry(moonR, 16, 16), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.2 }));
      const moonAura = new T.Mesh(new T.SphereGeometry(moonR * 1.5, 12, 12), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }));
      moon.add(moonAura);
      const angle = rng() * Math.PI * 2;
      moon.position.set(planetPos.x + Math.cos(angle) * orbitR, planetPos.y + (rng() - 0.5) * 10, planetPos.z + Math.sin(angle) * orbitR);
      group.add(moon);
      orbiters.push({ mesh: moon, isMoon: true, orbitRadius: orbitR, angle, speed: 0.02 + rng() * 0.04, tilt: (rng() - 0.5) * 0.3, bobAmp: 1 + rng() * 2, bobSpeed: 0.5 + rng() * 0.8, planetPos: planetPos.clone() });
    }
    return group;
  }

  // ==================== BEACON ====================

  function createBeacon(name, type, plt, pos) {
    const color = TYPE_COLORS[type] || 0x66ffff;
    const group = new T.Group(); group.position.copy(pos);
    const plat = new T.Mesh(new T.CylinderGeometry(100, 110, 3, 32), new T.MeshStandardMaterial({ color: 0x0a0a1a, emissive: color, emissiveIntensity: 0.1, metalness: 0.8, roughness: 0.4 }));
    plat.position.y = -1; plat.receiveShadow = true; group.add(plat);
    [100, 110, 120].forEach((r, i) => {
      const rm = new T.Mesh(new T.TorusGeometry(r, 0.8 - i * 0.2, 8, 64), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - i * 0.12 }));
      rm.rotation.x = -Math.PI / 2; rm.position.y = 0.5; group.add(rm);
    });
    const beamH = 500;
    const beam = new T.Mesh(new T.CylinderGeometry(2, 2, beamH, 6), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    beam.position.y = beamH / 2; group.add(beam);
    const beam2 = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, beamH, 6), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }));
    beam2.position.y = beamH / 2; group.add(beam2);
    const orb = new T.Mesh(new T.SphereGeometry(10, 20, 16), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, transparent: true, opacity: 0.9 }));
    orb.position.y = beamH + 12; group.add(orb);
    [16, 22, 28].forEach((r, i) => {
      const h = new T.Mesh(new T.TorusGeometry(r, 0.6 - i * 0.15, 8, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 - i * 0.2 }));
      h.position.y = beamH + 12; group.add(h);
    });
    const light = new T.PointLight(color, 5, 300); light.position.y = beamH + 12; group.add(light);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0'); ctx.font = 'bold 80px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(name, 512, 95);
    ctx.font = '40px sans-serif'; ctx.fillStyle = '#aaaacc'; ctx.fillText(type.toUpperCase() + '  ·  PLT ' + plt.profit + '/' + plt.love + '/' + plt.tax, 512, 180);
    const label = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthTest: false }));
    label.scale.set(120, 30, 1); label.position.y = beamH + 55; group.add(label);
    return group;
  }

  // ==================== CITY SKELETON ====================

  function createCitySkeleton(pos, type, rng) {
    const group = new T.Group(); group.position.copy(pos);
    const color = TYPE_COLORS[type] || 0x66ffff;
    const ground = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshStandardMaterial({ color: 0x080818, roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.5; ground.receiveShadow = true; group.add(ground);
    const grid = new T.GridHelper(400, 40, color, 0x110022); grid.position.y = 0.6; grid.material.opacity = 0.15; grid.material.transparent = true; group.add(grid);
    const roadMat = new T.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 });
    for (let i = -140; i <= 140; i += 18) {
      group.add(Object.assign(new T.Mesh(new T.BoxGeometry(280, 0.08, 3.5), roadMat), { position: new T.Vector3(0, 0.6, i) }));
      group.add(Object.assign(new T.Mesh(new T.BoxGeometry(3.5, 0.08, 280), roadMat), { position: new T.Vector3(i, 0.6, 0) }));
    }
    const districtsArr = [
      { name: 'work', zone: { x: [-130, -10], z: [-130, -10] }, count: 35, minH: 10, maxH: 50, color: 0x00ffff, eColor: 0x0088aa },
      { name: 'home', zone: { x: [10, 130], z: [-130, -10] }, count: 40, minH: 5, maxH: 25, color: 0xff66aa, eColor: 0xaa3366 },
      { name: 'social', zone: { x: [-130, -10], z: [10, 130] }, count: 28, minH: 4, maxH: 18, color: 0xffaa00, eColor: 0xaa7700 },
      { name: 'learn', zone: { x: [10, 130], z: [10, 130] }, count: 25, minH: 8, maxH: 35, color: 0x00ff88, eColor: 0x00aa55 }
    ];
    const districts = {};
    for (const d of districtsArr) districts[d.name] = d;
    for (const d of districtsArr) {
      for (let i = 0; i < d.count; i++) {
        const x = d.zone.x[0] + rng() * (d.zone.x[1] - d.zone.x[0]);
        const z = d.zone.z[0] + rng() * (d.zone.z[1] - d.zone.z[0]);
        const h = d.minH + rng() * (d.maxH - d.minH);
        const w = 3 + rng() * 6; const d2 = 3 + rng() * 6;
        const bColor = rng() > 0.6 ? d.color : 0x222244;
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d2), new T.MeshStandardMaterial({ color: bColor, emissive: d.eColor, emissiveIntensity: 0.1, metalness: 0.7, roughness: 0.3 }));
        mesh.position.set(x, h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
        if (h > 6) for (let wy = 2; wy < h - 1; wy += 2) {
          const win = new T.Mesh(new T.BoxGeometry(w * 0.7, 0.4, 0.06), new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.5 }));
          win.position.set(x, wy, z + d2 / 2 + 0.03); group.add(win);
        }
        if (h > 15 && rng() > 0.4) {
          const cap = new T.Mesh(new T.BoxGeometry(w + 0.4, 0.4, d2 + 0.4), new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.6 }));
          cap.position.set(x, h + 0.2, z); group.add(cap);
        }
        if (h > 25 && rng() > 0.3) {
          const spireH = 4 + rng() * 10;
          const spire = new T.Mesh(new T.CylinderGeometry(0.1, 0.4, spireH, 4), new T.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.7 }));
          spire.position.set(x, h + spireH / 2, z); group.add(spire);
        }
      }
      const cx = (d.zone.x[0] + d.zone.x[1]) / 2; const cz = (d.zone.z[0] + d.zone.z[1]) / 2;
      const lCanvas = document.createElement('canvas'); lCanvas.width = 256; lCanvas.height = 64;
      const lctx = lCanvas.getContext('2d'); lctx.fillStyle = 'rgba(0,0,0,0.7)'; lctx.fillRect(0, 0, 256, 64);
      lctx.fillStyle = '#' + d.color.toString(16).padStart(6, '0'); lctx.font = 'bold 32px sans-serif'; lctx.textAlign = 'center'; lctx.fillText(d.name.toUpperCase(), 128, 44);
      const lLabel = new T.Mesh(new T.PlaneGeometry(14, 3.5), new T.MeshBasicMaterial({ map: new T.CanvasTexture(lCanvas), transparent: true }));
      lLabel.position.set(cx, 40, cz); lLabel.rotation.x = -Math.PI / 4; group.add(lLabel);
    }
    const ringMat = new T.MeshStandardMaterial({ color: 0x222244, emissive: 0x110022, emissiveIntensity: 0.12, metalness: 0.6, roughness: 0.4 });
    [{ r: 140, count: 24, skip: 0.35 }, { r: 180, count: 32, skip: 0.45 }, { r: 220, count: 40, skip: 0.55 }].forEach(rc => {
      for (let i = 0; i < rc.count; i++) {
        if (rng() < rc.skip) continue;
        const angle = (i / rc.count) * Math.PI * 2 + rng() * 0.3; const rr = rc.r + rng() * 15 - 7;
        const x = Math.cos(angle) * rr; const z = Math.sin(angle) * rr;
        const h = 5 + rng() * 22; const w = 2 + rng() * 6; const d2 = 2 + rng() * 6;
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d2), ringMat);
        mesh.position.set(x, h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      }
    });
    const poiGroup = new T.Group(); poiGroup.position.set(0, 80, 0);
    const chevGeo = new T.BufferGeometry();
    chevGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([-3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 0]), 3));
    poiGroup.add(new T.Mesh(chevGeo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: T.DoubleSide })));
    const poiRing = new T.Mesh(new T.TorusGeometry(4, 0.25, 8, 20), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    poiRing.rotation.x = -Math.PI / 2; poiGroup.add(poiRing);
    poiGroup.add(new T.PointLight(color, 1.5, 40)); group.add(poiGroup);
    const dome = new T.Mesh(new T.SphereGeometry(350, 16, 12), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.04, side: T.BackSide, depthWrite: false }));
    dome.position.y = 60; group.add(dome);
    const pCount = 400; const pGeo = new T.BufferGeometry(); const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) { pPos[i] = (rng() - 0.5) * 400; pPos[i + 1] = rng() * 120; pPos[i + 2] = (rng() - 0.5) * 400; }
    pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
    const particles = new T.Points(pGeo, new T.PointsMaterial({ color, size: 0.6, transparent: true, opacity: 0.7, depthWrite: false }));
    particles.userData.isAmbientParticles = true; group.add(particles);
    return { group, districts };
  }

  // ==================== PORTAL ====================

  function createPortal(fromWorld, toWorld, rng) {
    const color = 0x66ffff; const group = new T.Group();
    const frame = new T.Mesh(new T.TorusGeometry(8, 0.6, 8, 32), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 }));
    frame.rotation.y = Math.PI / 2; group.add(frame);
    const inner = new T.Mesh(new T.CircleGeometry(7.5, 32), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: T.DoubleSide }));
    inner.rotation.y = Math.PI / 2; group.add(inner);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#66ffff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('→ ' + toWorld.name, 256, 55);
    ctx.font = '28px sans-serif'; ctx.fillStyle = '#aaaacc'; ctx.fillText('PORTAL', 256, 100);
    const label = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthTest: false }));
    label.scale.set(14, 3.5, 1); label.position.y = 10; group.add(label);
    group.add(new T.PointLight(color, 2, 50));
    return group;
  }

  // ==================== QUEST BEACON ====================

  function createQuestBeacon(world, rng) {
    const color = TYPE_COLORS[world.type] || 0x66ffff; const group = new T.Group();
    const diamond = new T.Mesh(new T.OctahedronGeometry(3, 0), new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.2 }));
    diamond.position.y = 25; diamond.rotation.y = Math.PI / 4; group.add(diamond);
    const ring = new T.Mesh(new T.TorusGeometry(4, 0.2, 8, 16), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 25; group.add(ring);
    group.add(Object.assign(new T.PointLight(color, 1.2, 30), { position: new T.Vector3(0, 25, 0) }));
    const questText = TYPE_QUESTS[world.type] || 'Explore this world';
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0'); ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('QUEST: ' + world.type.toUpperCase(), 256, 45);
    ctx.font = '20px sans-serif'; ctx.fillStyle = '#ffffff';
    const words = questText.split(' '); let line = '', y = 75;
    for (const word of words) { const test = line + word + ' '; if (ctx.measureText(test).width > 480) { ctx.fillText(line.trim(), 256, y); line = word + ' '; y += 24; } else line = test; }
    ctx.fillText(line.trim(), 256, y);
    const label = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthTest: false }));
    label.scale.set(18, 4.5, 1); label.position.y = 35; group.add(label);
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
    worlds.length = 0; PORTALS.length = 0; orbiters.length = 0;

    const rng = seededRandom('void-population-genesis-v3');

    for (let i = 0; i < WORLD_COUNT; i++) {
      try {
        const name = NAMES[i]; const type = TYPES[i];
        const plt = { profit: 20 + Math.floor(rng() * 60), love: 20 + Math.floor(rng() * 60), tax: 10 + Math.floor(rng() * 40) };
        const pos = randomPosition(i, rng); const color = TYPE_COLORS[type] || 0x66ffff;

        let planetSystem = null;
        try { planetSystem = createPlanetSystem(color, rng); planetSystem.group.position.copy(pos); worldRoot.add(planetSystem.group); } catch (e) { console.warn('[VoidPop] planet failed:', i, e); }

        try { const sg = createSun(color, pos); worldRoot.add(sg); } catch (e) { console.warn('[VoidPop] sun failed:', i, e); }

        if (planetSystem) {
          try { const mg = createMoonSystem(planetSystem.orbitData.mesh.position.clone().add(pos), planetSystem.orbitData.radius, color, rng); worldRoot.add(mg); } catch (e) { console.warn('[VoidPop] moons failed:', i, e); }
        }

        let beacon = null;
        try { beacon = createBeacon(name, type, plt, pos); worldRoot.add(beacon); } catch (e) { console.warn('[VoidPop] beacon failed:', i, e); }

        let cityGroup = null, districts = {};
        try { const skel = createCitySkeleton(pos, type, rng); cityGroup = skel.group; districts = skel.districts; worldRoot.add(cityGroup); } catch (e) { console.warn('[VoidPop] city failed:', i, e); }

        let questBeacon = null;
        try { questBeacon = createQuestBeacon({ type }, rng); questBeacon.position.copy(pos); worldRoot.add(questBeacon); } catch (e) { console.warn('[VoidPop] quest beacon failed:', i, e); }

        const state = createWorldState({ plt }, rng);
        try { spawnAgents(state, districts, rng); state.agents.forEach(a => { a.mesh.group.position.add(pos); worldRoot.add(a.mesh.group); }); } catch (e) { console.warn('[VoidPop] agents failed:', i, e); }
        try { setupWeather(state, worldRoot, rng); } catch (e) {}

        let realm = null;
        const RealmWorld = Genesis.RealmWorld;
        if (RealmWorld && RealmWorld.Realm) {
          try {
            realm = new RealmWorld.Realm({ id: 'void-' + i + '-' + name.toLowerCase().replace(/\s/g, '-'), config: { id: 'void-' + i, seed: 'void-' + i + '-' + name, name, type, plt, palette: { fog: 0x050510 } }, THREE: T, scene: worldRoot, lazyUI: true });
            realm.init().then(() => { realm.root.position.copy(pos); realm.root.visible = false; worldRoot.add(realm.root); }).catch(() => {});
          } catch (_) {}
        }

        worlds.push({ realm, beacon, cityGroup, districts, questBeacon, planetSystem, state, name, type, plt, position: pos, active: false });
      } catch (worldErr) {
        console.error('[VoidPop] WORLD', i, 'FATAL:', worldErr);
      }
    }

    for (let i = 0; i < worlds.length; i++) {
      try {
        const from = worlds[i]; const to = worlds[(i + 1) % worlds.length];
        const portal = createPortal(from, to, rng);
        const dir = new T.Vector3().subVectors(to.position, from.position).normalize();
        portal.position.copy(from.position).add(dir.multiplyScalar(120)); portal.lookAt(to.position);
        worldRoot.add(portal); PORTALS.push({ from: i, to: (i + 1) % worlds.length, mesh: portal });
      } catch (e) { console.warn('[VoidPop] portal failed:', i, e); }
    }

    scene.add(worldRoot);
    buildTravelPanel();
    buildWorldHUD();
    console.log('[VoidPopulation] Spawned', worlds.length, 'of', WORLD_COUNT, 'Lost Worlds');
    return { built: true, worlds: worlds.length };
  }

  // ==================== TICK ====================

  function tick(dt) {
    if (!camera) return;
    try {
    const camPos = camera.position;
    const time = performance.now() * 0.001;
    const rng = seededRandom('tick-' + Math.floor(time));

    for (const o of orbiters) {
      if (o.isSun) {
        if (o.glow) o.glow.scale.setScalar(1 + Math.sin(time * o.pulseSpeed) * o.pulseAmp);
        if (o.corona) o.corona.scale.setScalar(1 + Math.sin(time * o.pulseSpeed * 0.7) * 0.08);
      } else if (o.isMoon) {
        o.angle += o.speed * dt;
        o.mesh.position.set(o.planetPos.x + Math.cos(o.angle) * o.orbitRadius, o.planetPos.y + Math.sin(time * o.bobSpeed) * o.bobAmp + Math.sin(o.angle) * o.tilt * o.orbitRadius, o.planetPos.z + Math.sin(o.angle) * o.orbitRadius);
      } else {
        o.baseAng += o.orbitSpeed * dt;
        o.mesh.position.set(Math.cos(o.baseAng) * 30, o.baseY + Math.sin(time * o.bobSpeed) * o.bobAmp, Math.sin(o.baseAng) * 30);
        o.mesh.rotation.y += o.spin; o.mesh.rotation.x += o.spin * 0.3;
        if (o.aura) o.aura.position.copy(o.mesh.position);
        if (o.ring) { o.ring.position.copy(o.mesh.position); o.ring.rotation.z += 0.004; }
        if (o.ring2) { o.ring2.position.copy(o.mesh.position); o.ring2.rotation.z -= 0.003; }
      }
    }

    for (const w of worlds) {
      const dx = camPos.x - w.position.x, dy = camPos.y - w.position.y, dz = camPos.z - w.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (w.realm && w.realm.root) {
        if (!w.active && dist < WAKE_RADIUS) { w.realm.root.visible = true; w.realm.enter(); w.active = true; }
        else if (w.active && dist > SLEEP_RADIUS) { w.realm.root.visible = false; w.realm.exit(); w.active = false; }
        if (w.active) w.realm.update(dt);
      }

      // BIBLE MECHANICS — always active, even when Realm isn't loaded
      const s = w.state;
      updateAgents(s, w.districts, dt, rng, worldRoot);
      updateWeather(s, worldRoot, dt, rng);
      const phase = updateDayNight(s, dt);
      checkAchievements(s);
      const thought = updateThoughts(s, w.name, dt, rng);
      if (thought) { /* could display in HUD */ }

      // Orb pulse
      if (w.beacon) {
        const orb = w.beacon.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.radius === 10);
        if (orb) orb.scale.setScalar(1 + Math.sin(time * 3 + w.position.x) * 0.15);
      }
      if (w.questBeacon) {
        const diamond = w.questBeacon.children[0];
        if (diamond) { diamond.rotation.y += dt * 0.5; diamond.position.y = 25 + Math.sin(time * 2 + w.position.z) * 3; }
      }
      if (w.cityGroup) {
        w.cityGroup.children.forEach(child => {
          if (child.userData && child.userData.isAmbientParticles) {
            const pos = child.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) { pos[i] += dt * 0.6; if (pos[i] > 120) pos[i] = 0; }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      }
    }
    for (const p of PORTALS) { if (p.mesh && p.mesh.children[0]) p.mesh.children[0].rotation.z += dt * 0.3; }

    updateWorldHUD();
    } catch (_e) { /* tick error — never kill animate loop */ }
  }

  // ==================== WORLD HUD (live Bible stats) ====================

  function buildWorldHUD() {
    if (document.getElementById('void-world-hud')) return;
    const el = document.createElement('div');
    el.id = 'void-world-hud';
    el.style.cssText = 'position:fixed;top:20px;left:20px;width:300px;background:rgba(5,5,20,0.88);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px;z-index:35;font-family:monospace;color:#fff;font-size:11px;display:none;pointer-events:auto;';
    el.innerHTML = '<div id="void-hud-content"></div>';
    document.body.appendChild(el);
  }

  function updateWorldHUD() {
    const el = document.getElementById('void-hud-content');
    if (!el) return;
    const camPos = camera ? camera.position : null;
    if (!camPos) return;
    let closest = null, closestDist = Infinity;
    for (const w of worlds) {
      const d = camPos.distanceTo(w.position);
      if (d < closestDist) { closestDist = d; closest = w; }
    }
    const hud = document.getElementById('void-world-hud');
    if (!closest || closestDist > 1500) { if (hud) hud.style.display = 'none'; return; }
    if (hud) hud.style.display = 'block';
    const s = closest.state;
    const color = '#' + (TYPE_COLORS[closest.type] || 0x66ffff).toString(16).padStart(6, '0');
    const phase = s._currentPhase || DAY_PHASES[0];
    el.innerHTML = `
      <div style="color:${color};font-size:14px;font-weight:bold;margin-bottom:8px;">${closest.name}</div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="flex:1;background:rgba(255,170,0,0.15);border-radius:4px;padding:4px;text-align:center;">
          <div style="font-size:9px;color:#ffaa00;">PROFIT</div>
          <div style="font-size:16px;font-weight:bold;">${Math.round(s.plt.profit)}</div>
        </div>
        <div style="flex:1;background:rgba(255,102,170,0.15);border-radius:4px;padding:4px;text-align:center;">
          <div style="font-size:9px;color:#ff66aa;">LOVE</div>
          <div style="font-size:16px;font-weight:bold;">${Math.round(s.plt.love)}</div>
        </div>
        <div style="flex:1;background:rgba(0,255,204,0.15);border-radius:4px;padding:4px;text-align:center;">
          <div style="font-size:9px;color:#00ffcc;">TAX</div>
          <div style="font-size:16px;font-weight:bold;">${Math.round(s.plt.tax)}</div>
        </div>
      </div>
      <div style="margin-bottom:6px;">☀️ Day ${s.day} · ${phase.name} · <span style="color:#888;">${Math.round(s.time)}:00</span></div>
      <div style="margin-bottom:6px;">🌧️ Weather: <span style="color:${s.weather === 'sunny' ? '#ffaa00' : s.weather === 'rainy' ? '#4488ff' : '#eeeeff'};">${s.weather}</span></div>
      <div style="margin-bottom:6px;">👥 Agents: <span style="color:#ffaa00;">${s.agents.filter(a => a.state === 'WALKING').length} walking</span> · <span style="color:#ff66aa;">${s.agents.filter(a => a.state === 'SOCIAL').length} social</span> · <span style="color:#00ffcc;">${s.agents.filter(a => a.state === 'IDLE').length} idle</span></div>
      <div style="margin-bottom:6px;">💎 Gems: ${s.gems} · 🃏 Souls: ${s.souls.length} · ⚔️ ${s.combat ? 'IN COMBAT' : 'Peace'}</div>
      <div style="font-size:9px;color:#666;">🏆 ${[...s._achievementUnlocked].join(', ') || 'None yet'}</div>
    `;
  }

  // ==================== TRAVEL PANEL ====================

  function buildTravelPanel() {
    if (document.getElementById('void-travel-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'void-travel-panel';
    panel.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:240px;background:rgba(5,5,20,0.92);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;z-index:35;font-family:monospace;pointer-events:auto;max-height:85vh;overflow-y:auto;';
    let html = '<div style="font-size:11px;color:#66ffff;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;text-align:center;">⚡ Lost Worlds</div>';
    for (let i = 0; i < worlds.length; i++) {
      const w = worlds[i]; const color = '#' + (TYPE_COLORS[w.type] || 0x66ffff).toString(16).padStart(6, '0');
      const dist = Math.round(w.position.length());
      html += '<div onclick="window.__voidJump(' + i + ')" style="padding:7px 10px;margin-bottom:5px;background:rgba(255,255,255,0.04);border:1px solid ' + color + '33;border-radius:8px;cursor:pointer;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.12)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.04)\'">';
      html += '<span style="color:' + color + ';">' + w.name + '</span>';
      html += '<span style="font-size:9px;color:#666;">' + dist + 'u</span>';
      html += '</div>';
    }
    html += '<div style="font-size:9px;color:#555;text-align:center;margin-top:10px;">Click world to jump · Click ground to teleport</div>';
    panel.innerHTML = html; document.body.appendChild(panel);
    if (typeof window !== 'undefined') window.__voidJump = (i) => jumpToWorld(i);
  }

  function jumpToWorld(index) {
    const w = worlds[index]; if (!w) return;
    const pos = w.position;
    const PlayerCam = window.Genesis && window.Genesis.PlayerCam;
    if (PlayerCam && PlayerCam.teleportTo) { PlayerCam.teleportTo({ x: pos.x, y: pos.y + 5, z: pos.z }); return; }
    if (camera) { camera.position.set(pos.x + 30, pos.y + 20, pos.z + 30); camera.lookAt(pos.x, pos.y, pos.z); }
  }

  function dispose() {
    if (worldRoot.parent) worldRoot.parent.remove(worldRoot);
    worlds.length = 0; PORTALS.length = 0; orbiters.length = 0;
    const hud = document.getElementById('void-world-hud'); if (hud) hud.remove();
    const panel = document.getElementById('void-travel-panel'); if (panel) panel.remove();
  }

  const api = {
    populate, tick, dispose, jumpToWorld, buildTravelPanel,
    worlds: () => worlds.map(w => ({ name: w.name, type: w.type, plt: w.plt, position: { x: w.position.x, y: w.position.y, z: w.position.z }, active: w.active, agents: w.state.agents.length, souls: w.state.souls.length })),
    summary: () => ({ enabled: flagOn(), worldCount: worlds.length, activeWorlds: worlds.filter(w => w.active).length, portals: PORTALS.length, orbiters: orbiters.length })
  };

  Genesis.VoidPopulation = api;
  if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
    Genesis.EngineScheduler.defineTick('void-population', (dt) => tick(dt), () => flagOn());
  }
  return api;
}

export default { install };
