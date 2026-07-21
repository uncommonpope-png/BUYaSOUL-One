// interior-renderer.probe.cjs — P-APT-2 visible/walkable apartment proof
// Run: node tests/interior-renderer.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');

function v3() { return { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }; }

class FakeObject3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = v3();
    this.rotation = v3();
    this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, setScalar(s) { this.x = this.y = this.z = s; return this; } };
    this.userData = {};
    this.visible = true;
    this.isObject3D = true;
    this.name = '';
  }
  add(...items) { for (const item of items) { if (!item) continue; item.parent = this; this.children.push(item); } }
  remove(item) { this.children = this.children.filter((c) => c !== item); if (item) item.parent = null; }
  traverse(fn) { fn(this); for (const c of this.children) { if (c && typeof c.traverse === 'function') c.traverse(fn); else fn(c); } }
}
class FakeGroup extends FakeObject3D {}
class FakeMesh extends FakeObject3D {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material || {}; this.isMesh = true; }
}
class FakeLight extends FakeObject3D { constructor(color, intensity) { super(); this.color = color; this.intensity = intensity; } }
class FakeGeometry { constructor(...args) { this.args = args; } }
class FakeMaterial { constructor(opts) { Object.assign(this, opts || {}); } }

const THREE = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  Object3D: FakeObject3D,
  PointLight: FakeLight,
  BoxGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  MeshStandardMaterial: FakeMaterial,
  MeshBasicMaterial: FakeMaterial
};

function fakeGenesis() {
  return { moduleRegistry: new Map(), registerModule(name, record) { this.moduleRegistry.set(name, record); } };
}

function install(file, G, extra) {
  const mod = require(path.join(__dirname, '..', 'src', 'genesis', file));
  if (mod && typeof mod.install === 'function') mod.install(G, extra);
  return mod;
}

function names(root) {
  const out = [];
  if (root && root.traverse) root.traverse((n) => { if (n && n.name) out.push(n.name); });
  return out;
}

function installAll() {
  const G = fakeGenesis();
  const listeners = new Map();
  global.window = {
    THREE,
    Genesis: G,
    __GENESIS_INTERIORS: true,
    __GENESIS_INTERIOR_RENDERER: true,
    CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; },
    dispatchEvent: function (ev) { const list = listeners.get(ev.type) || []; for (const fn of list) fn(ev); return true; },
    addEventListener: function (name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    removeEventListener: function () { return true; },
    innerWidth: 1024,
    innerHeight: 768
  };
  global.document = { addEventListener() {}, body: { appendChild() {} } };
  install('entity-registry.js', G);
  install('event-bridge.js', G);
  install('resource-pool.js', G);
  install('affordance-model.js', G);
  install('property-ledger.js', G);
  install('interior-instance-manager.js', G);
  install('door-portal-manager.js', G);
  install('interior-customizer.js', G);
  install('avatar-customizer.js', G);
  install('apartment-commerce.js', G);
  install('interior-persistence.js', G);
  G.scene = new THREE.Group();
  G.camera = new THREE.Object3D();
  G.camera.lookAt = function (target) { this.lastLookAt = target; };
  G.renderer = { domElement: { addEventListener() {}, removeEventListener() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 1024, height: 768 }; } } };
  install('interior-renderer.js', G, THREE);
  return G;
}

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

console.log('\n=== GENESIS INTERIOR RENDERER PROBE ===\n');

const G = installAll();
const BUYER = 'user://craig';
const GUEST = 'user://guest';
G.ResourcePool.ensure(BUYER, 300, 0);

check('renderer installs and attaches visible door markers', () => {
  assert.ok(G.moduleRegistry.has('interior-renderer'), 'renderer module not registered');
  const attached = G.InteriorRenderer.attach({ scene: G.scene, camera: G.camera, renderer: G.renderer, actor: GUEST });
  assert.strictEqual(attached.ok, true);
  assert.ok(attached.markers >= 3, 'expected seeded apartment markers');
  assert.strictEqual(G.InteriorRenderer.markerCount() >= 3, true);
  const markerNames = names(G.InteriorRenderer.markerGroup());
  assert.ok(markerNames.some((n) => n.indexOf('Apartment Door Marker') === 0), 'door marker group missing');
});

check('entering a door builds a procedural walkable room and hides street markers', () => {
  const from = { x: 7, y: 0, z: 9 };
  const entered = G.InteriorRenderer.enterDoor('door-neon-loft', { actor: GUEST, from });
  assert.strictEqual(entered.ok, true);
  assert.strictEqual(entered.interiorId, 'interior-neon-loft');
  assert.deepStrictEqual(entered.returnTo, from);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-neon-loft').loaded, true);
  assert.strictEqual(G.InteriorRenderer.markerGroup().visible, false);
  const activeNames = names(G.InteriorRenderer.activeGroup());
  assert.ok(activeNames.includes('interior-floor'), 'floor not built');
  assert.ok(activeNames.includes('interior-exit-door'), 'exit door not built');
  assert.ok(activeNames.includes('avatar-dressing-room-spot'), 'avatar dressing spot not built');
});

check('custom theme, furniture, and avatar profile materialize inside owned room', () => {
  const purchase = G.ApartmentCommerce.purchaseApartment(BUYER, 'listing-studio-a');
  assert.strictEqual(purchase.ok, true);
  const placed = G.InteriorCustomizer.placeItem(BUYER, 'interior-studio-a', { type: 'bed', pos: { x: -2, y: 0, z: -2 }, color: '#38bdf8' });
  assert.strictEqual(placed.ok, true);
  assert.strictEqual(G.InteriorCustomizer.applyTheme(BUYER, 'interior-studio-a', { wall: '#020617', accent: '#facc15' }).ok, true);
  assert.strictEqual(G.AvatarCustomizer.createProfile(BUYER, { palette: { primary: '#00ffcc' }, title: 'Apartment Owner' }).title, 'Apartment Owner');
  const entered = G.InteriorRenderer.enterDoor('door-studio-a', { actor: BUYER, from: { x: 2, y: 0, z: 3 } });
  assert.strictEqual(entered.ok, true);
  assert.strictEqual(G.InteriorRenderer.activeGroup().userData.theme.accent, '#facc15');
  const activeNames = names(G.InteriorRenderer.activeGroup());
  assert.ok(activeNames.includes('decor-' + placed.item.id), 'custom decor holder not built');
  assert.ok(activeNames.includes('bed-base'), 'bed geometry not built');
  assert.ok(activeNames.includes('avatar-body'), 'avatar body not built');
});

check('exit destroys interior scene and returns to exact street position', () => {
  const out = G.InteriorRenderer.exitInterior({ actor: BUYER });
  assert.strictEqual(out.ok, true);
  assert.deepStrictEqual(out.returnTo, { x: 2, y: 0, z: 3 });
  assert.strictEqual(G.InteriorRenderer.activeGroup(), null);
  assert.strictEqual(G.InteriorRenderer.markerGroup().visible, true);
  assert.strictEqual(G.InteriorRenderer.summary().activeInteriorId, null);
  assert.strictEqual(G.camera.position.x, 8);
  assert.strictEqual(G.camera.position.z, 12);
});

check('active room can refresh after new customization without reloading all rooms', () => {
  const entered = G.InteriorRenderer.enterDoor('door-studio-a', { actor: BUYER, from: { x: 4, y: 0, z: 5 } });
  assert.strictEqual(entered.ok, true);
  const beforeNames = names(G.InteriorRenderer.activeGroup());
  assert.ok(beforeNames.includes('bed-base'));
  const plant = G.InteriorCustomizer.placeItem(BUYER, 'interior-studio-a', { type: 'plant', pos: { x: 1, y: 0, z: 1 } });
  assert.strictEqual(plant.ok, true);
  const refreshed = G.InteriorRenderer.refreshActive();
  assert.strictEqual(refreshed.ok, true);
  const afterNames = names(G.InteriorRenderer.activeGroup());
  assert.ok(afterNames.includes('plant-pot'), 'plant not materialized after refresh');
  assert.strictEqual(G.InteriorInstanceManager.list({ loaded: true }).length, 1, 'more than one loaded interior');
});

delete global.window;
delete global.document;
console.log('\n=== GENESIS INTERIOR RENDERER: ' + passed + ' checks passed ===\n');
