// Phase 1 Foundation probe — GenesisKernel + EntityRegistry + EngineScheduler
// Contract: the three foundation modules install onto Genesis, register/lookup/
// order subsystems, and the Scheduler executes its tick chain in deterministic
// order WITHOUT altering any tick's behavior (zero-delta relative to the legacy
// animate() if-chain). All three gates default OFF in index.html, so the live
// floor is byte-identical when the modules are not imported.
//
// Run: node tests/phase1-scheduler.probe.cjs
'use strict';
const assert = require('assert');
const path = require('path');

function load(name) {
  const mod = require(path.join(__dirname, '..', 'src', 'genesis', name + '.js'));
  const G = { moduleRegistry: new Map(), registerModule(n, r) { this.moduleRegistry.set(n, r); }, boot: {} };
  mod.install(G);
  return G;
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log('  ok - ' + label);
}

console.log('[phase1] GenesisKernel / EntityRegistry / EngineScheduler');

// 1. All three install onto Genesis.
const G = (function () {
  const g = { moduleRegistry: new Map(), registerModule(n, r) { this.moduleRegistry.set(n, r); }, boot: {} };
  require(path.join(__dirname, '..', 'src', 'genesis', 'kernel.js')).install(g);
  require(path.join(__dirname, '..', 'src', 'genesis', 'entity-registry.js')).install(g);
  require(path.join(__dirname, '..', 'src', 'genesis', 'scheduler.js')).install(g);
  return g;
})();

check('GenesisKernel present + idempotent', () => {
  assert.ok(G.GenesisKernel, 'kernel missing');
  require(path.join(__dirname, '..', 'src', 'genesis', 'kernel.js')).install(G); // re-install = no-op
  assert.strictEqual(typeof G.GenesisKernel.register, 'function');
});

check('EntityRegistry present', () => {
  assert.ok(G.EntityRegistry, 'registry missing');
  assert.strictEqual(typeof G.EntityRegistry.register, 'function');
});

check('EngineScheduler present', () => {
  assert.ok(G.EngineScheduler, 'scheduler missing');
  assert.strictEqual(typeof G.EngineScheduler.run, 'function');
});

// 2. Kernel boot + system registration.
check('Kernel boots + registers systems', () => {
  G.GenesisKernel.boot();
  assert.strictEqual(G.GenesisKernel.isBooted(), true);
  assert.strictEqual(G.GenesisKernel.registerSystem('probe', () => {}), true);
  assert.ok(G.GenesisKernel.systems().includes('probe'));
});

// 3. EntityRegistry assigns stable ids + snapshot (perception shape for agents).
check('EntityRegistry assigns stable id + snapshot', () => {
  const id = G.EntityRegistry.register({ type: 'Mesh', position: { x: 1, y: 2, z: 3 } }, { kind: 'citizen', tags: ['npc'] });
  assert.ok(/^ent_\d+$/.test(id), 'id format');
  assert.strictEqual(G.EntityRegistry.count(), 1);
  const snap = G.EntityRegistry.snapshot();
  assert.strictEqual(snap[0].id, id);
  assert.strictEqual(snap[0].kind, 'citizen');
  assert.deepStrictEqual(snap[0].pos, { x: 1, y: 2, z: 3 });
  assert.ok(G.EntityRegistry.queryByTag('npc').length === 1);
});

// 4. Scheduler executes ticks in canonical order with deterministic args (zero-delta).
check('Scheduler runs ticks in order, passes (dt, serial, ctx)', () => {
  const order = [];
  G.EngineScheduler.clear();
  G.EngineScheduler.defineTick('a', (dt, serial, ctx) => { order.push('a:' + dt + ':' + serial); }, () => true);
  G.EngineScheduler.defineTick('b', (dt, serial) => { order.push('b:' + dt + ':' + serial); }, () => true);
  const res = G.EngineScheduler.run({ dt: 0.016, serial: 5 });
  assert.strictEqual(res.ran, 2);
  assert.strictEqual(res.errors, 0);
  assert.strictEqual(order[0], 'a:0.016:6');
  assert.strictEqual(order[1], 'b:0.016:6');
  assert.deepStrictEqual(G.EngineScheduler.order(), ['a', 'b']);
});

// 5. Scheduler gates skip disabled ticks (mirrors animate() if-chain guards).
check('Scheduler respects gate (skip when false)', () => {
  G.EngineScheduler.clear();
  let ranA = 0, ranB = 0;
  G.EngineScheduler.defineTick('a', () => { ranA++; }, () => true);
  G.EngineScheduler.defineTick('b', () => { ranB++; }, () => false); // gated off
  const res = G.EngineScheduler.run({ dt: 0.016 });
  assert.strictEqual(ranA, 1);
  assert.strictEqual(ranB, 0);
  assert.strictEqual(res.ran, 1);
  assert.strictEqual(res.skipped, 1);
});

// 6. Fault isolation: a throwing tick does not break the chain.
check('Scheduler isolates tick errors', () => {
  G.EngineScheduler.clear();
  let ranGood = 0;
  G.EngineScheduler.defineTick('bad', () => { throw new Error('boom'); }, () => true);
  G.EngineScheduler.defineTick('good', () => { ranGood++; }, () => true);
  const res = G.EngineScheduler.run({ dt: 0.016 });
  assert.strictEqual(res.errors, 1);
  assert.strictEqual(ranGood, 1);
});

console.log('[phase1] PASS: ' + passed + ' checks green');
