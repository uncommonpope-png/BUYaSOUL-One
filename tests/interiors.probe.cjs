// interiors.probe.cjs — Genesis apartments / doors / avatars / private spaces proof
// Run: node tests/interiors.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');

function fakeGenesis() {
  return {
    moduleRegistry: new Map(),
    registerModule(name, record) { this.moduleRegistry.set(name, record); }
  };
}

function install(file, G) {
  const mod = require(path.join(__dirname, '..', 'src', 'genesis', file));
  if (mod && typeof mod.install === 'function') mod.install(G);
  return mod;
}

function installAll() {
  const G = fakeGenesis();
  global.window = {
    __GENESIS_INTERIORS: true,
    Genesis: G,
    CustomEvent: function (name, opts) { this.type = name; this.detail = opts && opts.detail; },
    dispatchEvent: function () { return true; }
  };
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
  return G;
}

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

console.log('\n=== GENESIS INTERIORS PROBE ===\n');

const G = installAll();
const BUYER = 'user://craig';
const GUEST = 'user://guest';
const INTRUDER = 'user://intruder';
G.ResourcePool.ensure(BUYER, 300, 0);

check('modules install and default apartments seed', () => {
  ['property-ledger', 'interior-instance-manager', 'door-portal-manager', 'interior-customizer', 'avatar-customizer', 'apartment-commerce', 'interior-persistence'].forEach((name) => {
    assert.ok(G.moduleRegistry.has(name), name + ' not registered');
  });
  assert.ok(G.ApartmentCommerce.listCatalog().length >= 3, 'default catalog missing');
  assert.ok(G.PropertyLedger.list({ status: 'for-sale' }).length >= 3, 'properties not seeded');
  assert.ok(G.DoorPortalManager.list().length >= 3, 'doors not seeded');
});

check('door portal enters preview interior and exits to exact street position', () => {
  const door = G.DoorPortalManager.get('door-neon-loft');
  const from = { x: 7, y: 0, z: 9 };
  const entered = G.DoorPortalManager.enter(GUEST, door.id, { from });
  assert.strictEqual(entered.ok, true);
  assert.strictEqual(entered.interiorId, 'interior-neon-loft');
  assert.deepStrictEqual(entered.returnTo, from);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-neon-loft').loaded, true);
  const exited = G.DoorPortalManager.exit(GUEST);
  assert.strictEqual(exited.ok, true);
  assert.deepStrictEqual(exited.returnTo, from);
});

check('apartment purchase spends energy, mints receipt, and transfers ownership', () => {
  const before = G.ResourcePool.get(BUYER).energy;
  const purchase = G.ApartmentCommerce.purchaseApartment(BUYER, 'listing-studio-a');
  assert.strictEqual(purchase.ok, true);
  assert.ok(purchase.receipt.id.indexOf('receipt_') === 0);
  assert.strictEqual(purchase.property.owner, BUYER);
  assert.strictEqual(G.PropertyLedger.get('apt-studio-a').status, 'owned');
  assert.strictEqual(G.ApartmentCommerce.getListing('listing-studio-a').status, 'sold');
  assert.strictEqual(G.ResourcePool.get(BUYER).energy, before - 40);
});

check('owned apartment becomes private, with guest/editor permissions', () => {
  assert.strictEqual(G.PropertyLedger.canEnter(BUYER, 'apt-studio-a'), true);
  assert.strictEqual(G.PropertyLedger.canEnter(INTRUDER, 'apt-studio-a'), false);
  const denied = G.DoorPortalManager.enter(INTRUDER, 'door-studio-a', { from: { x: 1, y: 0, z: 1 } });
  assert.strictEqual(denied.ok, false);
  assert.strictEqual(denied.error, 'permission-denied');
  assert.strictEqual(G.PropertyLedger.addGuest(BUYER, 'apt-studio-a', GUEST).ok, true);
  assert.strictEqual(G.PropertyLedger.addGuest(BUYER, 'apt-studio-a', 'user://designer', 'editor').ok, true);
  assert.strictEqual(G.PropertyLedger.canEnter(GUEST, 'apt-studio-a'), true);
  assert.strictEqual(G.PropertyLedger.canEdit('user://designer', 'apt-studio-a'), true);
});

check('customization places furniture, moves it, themes room, and denies non-editors', () => {
  const enter = G.DoorPortalManager.enter(BUYER, 'door-studio-a', { from: { x: 2, y: 0, z: 3 } });
  assert.strictEqual(enter.ok, true);
  const placed = G.InteriorCustomizer.placeItem(BUYER, 'interior-studio-a', { type: 'bed', pos: { x: -2, y: 0, z: -2 }, color: '#38bdf8' });
  assert.strictEqual(placed.ok, true);
  assert.strictEqual(G.InteriorCustomizer.listDecor('interior-studio-a').length, 1);
  const moved = G.InteriorCustomizer.moveItem(BUYER, 'interior-studio-a', placed.item.id, { pos: { x: -1, y: 0, z: -3 } });
  assert.strictEqual(moved.ok, true);
  assert.deepStrictEqual(moved.item.pos, { x: -1, y: 0, z: -3 });
  const theme = G.InteriorCustomizer.applyTheme(BUYER, 'interior-studio-a', { wall: '#020617', accent: '#facc15' });
  assert.strictEqual(theme.ok, true);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-studio-a').theme.accent, '#facc15');
  const denied = G.InteriorCustomizer.placeItem(INTRUDER, 'interior-studio-a', { type: 'plant' });
  assert.strictEqual(denied.ok, false);
  assert.strictEqual(denied.error, 'permission-denied');
});

check('only one interior stays loaded at a time', () => {
  assert.strictEqual(G.DoorPortalManager.enter(BUYER, 'door-studio-a').ok, true);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-studio-a').loaded, true);
  assert.strictEqual(G.DoorPortalManager.enter(GUEST, 'door-memory-suite').ok, true);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-memory-suite').loaded, true);
  assert.strictEqual(G.InteriorInstanceManager.get('interior-studio-a').loaded, false);
});

check('avatar profile saves palette and equipment', () => {
  const profile = G.AvatarCustomizer.createProfile(BUYER, { palette: { primary: '#00ffcc' }, title: 'Apartment Owner' });
  assert.strictEqual(profile.palette.primary, '#00ffcc');
  const equipped = G.AvatarCustomizer.equip(BUYER, 'accessory', 'crown-of-keys');
  assert.strictEqual(equipped.ok, true);
  assert.strictEqual(G.AvatarCustomizer.getProfile(BUYER).outfit.accessory, 'crown-of-keys');
});

check('affordance model exposes door/property actions', () => {
  assert.strictEqual(G.AffordanceModel.best({ id: 'door-studio-a', kind: 'door' }, { actor: BUYER }).id, 'enter');
  assert.ok(G.AffordanceModel.forEntity({ id: 'apt-studio-a', kind: 'property' }, { actor: BUYER }).some((a) => a.id === 'buy-apartment'));
});

check('interior persistence validates and proves exact restore', () => {
  const save = G.InteriorPersistence.snapshot({ probe: 'interiors' });
  assert.strictEqual(G.InteriorPersistence.validate(save).ok, true);
  const decorBefore = G.InteriorCustomizer.listDecor('interior-studio-a');
  assert.strictEqual(decorBefore.length, 1);
  G.PropertyLedger.clear();
  G.InteriorInstanceManager.clear();
  G.DoorPortalManager.clear();
  G.InteriorCustomizer.clear();
  G.AvatarCustomizer.clear();
  G.ApartmentCommerce.clear();
  assert.strictEqual(G.PropertyLedger.list().length, 0);
  const proof = G.InteriorPersistence.prove(save);
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(G.PropertyLedger.get('apt-studio-a').owner, BUYER);
  assert.strictEqual(G.InteriorCustomizer.listDecor('interior-studio-a')[0].type, 'bed');
  assert.strictEqual(G.AvatarCustomizer.getProfile(BUYER).outfit.accessory, 'crown-of-keys');
});

delete global.window;
console.log('\n=== GENESIS INTERIORS: ' + passed + ' checks passed ===\n');
