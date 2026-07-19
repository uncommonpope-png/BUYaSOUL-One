// soul-guns.probe.cjs — verify the two Soul Guns built from the mechanics links:
//  - Central Constraint Gate (resource-pool.js): scarcity gates actions
//  - World Reaction Layer (reaction-rules.js): acts have consequence (not fluff)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ok - ' + name); } else { fail++; console.log('  FAIL - ' + name); } }
function loadAbs(rel) { const code = fs.readFileSync(path.join(__dirname, rel), 'utf8'); const mod = { exports: {} }; const ctx = { module: mod, exports: mod.exports, window: undefined, console }; vm.runInNewContext(code, ctx); return ctx.module.exports; }
function makeGenesis() {
  const reg = new Map();
  const Genesis = {
    EntityRegistry: {
      register(obj, meta) { const id = 'e' + (reg.size + 1); reg.set(id, Object.assign({ id }, meta || {})); return id; },
      unregister(id) { return reg.delete(id); },
      get(id) { return reg.get(id) || null; },
      resolve(id) { return reg.get(id) || null; },
      snapshot() { return Array.from(reg.values()); },
      find(k) { return Array.from(reg.values()).filter(e => e.kind === k); },
      queryByTag(t) { return Array.from(reg.values()).filter(e => (e.tags || []).includes(t)); },
      count() { return reg.size; }
    },
    registerModule() {}
  };
  return Genesis;
}

console.log('[soul-guns] Central Constraint Gate + World Reaction Layer');
const Genesis = makeGenesis();
const Pool = loadAbs('../src/genesis/resource-pool.js');
Pool.install(Genesis);
const Rules = loadAbs('../src/genesis/reaction-rules.js');
Rules.install(Genesis);

// ---- Central Constraint Gate ----
const RP = Genesis.ResourcePool;
ok('pool installs', !!RP);
RP.ensure('agent://gsk', 30, 1);
ok('pool created with max 30', RP.get('agent://gsk').max === 30);
ok('spend 10 ok', RP.spend('agent://gsk', 10) === true);
ok('energy now 20', RP.get('agent://gsk').energy === 20);
ok('spend 25 rejected (insufficient)', RP.spend('agent://gsk', 25) === false);
ok('energy still 20 (no negative)', RP.get('agent://gsk').energy === 20);
ok('regen +1 -> 21', (RP.regen('agent://gsk'), RP.get('agent://gsk').energy === 21));
// persistence (ties to Step 5 Surface B)
const snap = RP.snapshot();
RP.spend('agent://gsk', 5);
ok('snap captured pre-spend energy', snap['agent://gsk'].energy === 21);
RP.load(snap);
ok('load restores energy', RP.get('agent://gsk').energy === 21);
// offline-safe: the module without a Genesis context installs nothing and
// exposes no global pool — the gateway treats a null ResourcePool as "no cost
// gate", so commands stay cost-free. Verified: load with no Genesis => no global.
ok('offline-safe: module without Genesis sets no global pool', (function(){ const code = fs.readFileSync(path.join(__dirname, '../src/genesis/resource-pool.js'), 'utf8'); const mod = { exports: {} }; const fakeWin = {}; const ctx = { module: mod, exports: mod.exports, window: fakeWin, console }; vm.runInNewContext(code, ctx); return !fakeWin.GenesisResourcePool; })());

// ---- World Reaction Layer ----
const RR = Genesis.ReactionRules;
ok('rules install', !!RR);
// seed a building in the world (so it can react)
const buildingId = Genesis.EntityRegistry.register(null, { kind: 'building', owner: 'agent://world', tags: ['world'], meta: {} });
// rule: GSK spawns a 'light' -> building lights up
RR.addRule('light-answers-building',
  (c) => !!(c.entity && c.entity.kind === 'light') && Array.isArray(c.world) && c.world.some(e => e.kind === 'building'),
  (c) => { const b = (c.Registry && c.Registry.find) ? c.Registry.find('building') : null; if (Array.isArray(b)) for (const e of b) if (e.meta) e.meta.litBy = (c.entity && c.entity.id) || null; return { kind: 'building-lit' }; });
// GSK spawns a light
const lightId = Genesis.EntityRegistry.register(null, { kind: 'light', owner: 'agent://gsk', tags: ['gsk'], meta: {} });
const world = Genesis.EntityRegistry.snapshot();
const light = Genesis.EntityRegistry.get(lightId);
  const fired = RR.evaluate(world, 'agent://gsk', light, Genesis.EntityRegistry);
ok('reaction fired on light spawn', fired.length === 1);
ok('building lit by GSK light', Genesis.EntityRegistry.get(buildingId).meta.litBy === lightId);
// no reaction when a non-light spawns
const rockId = Genesis.EntityRegistry.register(null, { kind: 'rock', owner: 'agent://gsk', tags: ['gsk'], meta: {} });
  const fired2 = RR.evaluate(Genesis.EntityRegistry.snapshot(), 'agent://gsk', Genesis.EntityRegistry.get(rockId), Genesis.EntityRegistry);
ok('no reaction for rock (not fluff)', fired2.length === 0);
ok('offline-safe: module without Genesis sets no global rules', (function(){ const code = fs.readFileSync(path.join(__dirname, '../src/genesis/reaction-rules.js'), 'utf8'); const mod = { exports: {} }; const fakeWin = {}; const ctx = { module: mod, exports: mod.exports, window: fakeWin, console }; vm.runInNewContext(code, ctx); return !fakeWin.GenesisReactionRules; })());

console.log('\n[soul-guns] ' + (fail === 0 ? 'PASS: ' + pass + ' checks green' : 'FAIL: ' + fail + ' failed, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
