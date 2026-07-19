// agent-citizen.probe.cjs — C3 verification (Dark City: agents as native inhabitants)
const path = require('path');
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ok - ' + name); } else { fail++; console.log('  FAIL - ' + name); } }

function makeGenesis() {
  const agents = new Map();
  const reg = new Map();
  const Genesis = {
    EntityRegistry: {
      register(obj, meta) { const id = 'e' + (reg.size + 1); const o = Object.assign({ id, position: { set(x,y,z){ this.x=x;this.y=y;this.z=z; } } }, meta || {}); reg.set(id, o); return id; },
      unregister(id) { return reg.delete(id); },
      resolve(id) { return reg.get(id) || null; },
      snapshot() { return Array.from(reg.values()); },
      find(k) { return Array.from(reg.values()).filter(e => e.kind === k); },
      queryByTag(t) { return Array.from(reg.values()).filter(e => (e.tags||[]).includes(t)); },
      count() { return reg.size; }
    },
    EngineScheduler: { defineTick(){} },
    GenesisKernel: { _m: new Map(), register(id, rec){ this._m.set(id, rec); }, all(){ return Array.from(this._m.values()); } },
    registerModule(){}
  };
  return Genesis;
}

function loadModAbs(rel) {
  const code = fs.readFileSync(rel, 'utf8');
  const mod = { exports: {} };
  const ctx = { module: mod, exports: mod.exports, window: undefined, console, WebSocket: undefined };
  vm.runInNewContext(code, ctx);
  return ctx.module.exports;
}
function loadMod(rel, fakeWin, genesis) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  const mod = { exports: {} };
  fakeWin.Genesis = genesis;
  const sandbox = { window: fakeWin, console, module: mod, exports: mod.exports, WebSocket: undefined };
  vm.runInNewContext(code, sandbox);
  return genesis;
}

const Vocab = loadModAbs(path.join(__dirname, '..', 'src', 'genesis', 'command-vocab.js'));
ok('vocab loads', !!Vocab && typeof Vocab.validate === 'function');

const Genesis = makeGenesis();
const fakeWindow = {
  __GENESIS_AGENT_CITIZENS: true,
  __agentVocab: Vocab,
  WebSocket: undefined,
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function(){}
};
loadMod(path.join('..', 'src', 'genesis', 'agent-citizen.js'), fakeWindow, Genesis);

const AC = Genesis.AgentCitizen;
ok('AgentCitizen factory installed', !!AC);

// Spawn Allie as a native inhabitant.
const r1 = AC.createCitizen({ id: 'allie', name: 'Allie', role: 'social-agent',
  brain: { core: 'social', learns: true, observes: true },
  spawn: { kind: 'citizen', tags: ['allie'], pos: { x: 10, y: 0, z: -5 } } });
ok('Allie citizen created', r1.ok === true);
ok('Allie scheme agent://allie', AC.citizen('allie') && AC.citizen('allie').scheme === 'agent://allie');

// Spawn ARIA as a native inhabitant.
const r2 = AC.createCitizen({ id: 'aria', name: 'ARIA', role: '3d-agent',
  brain: { core: '3d', learns: true, observes: true },
  spawn: { kind: 'citizen', tags: ['aria'], pos: { x: -8, y: 2, z: 4 } } });
ok('ARIA citizen created', r2.ok === true);
ok('citizen count = 2', AC.count() === 2);

// Each citizen manifested its own body entity (alive in the world).
const allie = AC.citizen('allie');
const ariab = AC.citizen('aria');
const allieEntity = allie.summary().entityId;
const ariaEntity = ariab.summary().entityId;
ok('Allie body manifested in world', !!allieEntity);
ok('ARIA body manifested in world', !!ariaEntity);
ok('world has 2 citizen entities', Genesis.EntityRegistry.count() === 2);
ok('Allie entity owner is agent://allie', Genesis.EntityRegistry.resolve(allieEntity).owner === 'agent://allie');
ok('ARIA entity owner is agent://aria', Genesis.EntityRegistry.resolve(ariaEntity).owner === 'agent://aria');

// CASCADE: Allie cannot delete ARIA's entity (cross-citizen protection).
const x = allie.applyCommand({ op: 'delete', id: ariaEntity });
ok('CASCADE denies Allie deleting ARIA entity', x.ok === false);

// Allie CAN delete her own entity.
const y = allie.applyCommand({ op: 'delete', id: allieEntity });
ok('Allie can delete her own entity', y.ok === true);

// Allie learns (own brain).
const l = allie.learn({ op: 'learn', text: 'new social pattern from web', topic: 'social' });
ok('Allie learns into her own brain', l.ok === true && allie.learnings().length === 1);

// Allie observes the world (grounded perception).
const o = allie.observe();
ok('Allie observes world', o.ok === true && Array.isArray(o.entities));

// dispatch routes through CASCADE gate (valid op accepted, invalid rejected).
ok('Allie dispatch valid op', allie.dispatch({ op: 'spawn', kind: 'allie-post', owner: 'agent://allie', tags: ['allie'] }).ok === true);
ok('Allie dispatch invalid op rejected', allie.dispatch({ op: 'explode' }).ok === false);

// World roster lists inhabitants.
ok('world roster lists 2 citizens', AC.worldRoster().length === 2);

// Idempotent re-create rejected.
ok('re-create Allie rejected', AC.createCitizen({ id: 'allie' }).ok === false);

// C4.1: relationship + dialogue memory + affordances
const allie2 = AC.citizen('allie');
ok('citizen has affordances', Array.isArray(allie2.affords) && allie2.affords.indexOf('talk') >= 0);
const d0 = allie2.dialogue().length;
allie2.talk('hello Allie', 'Hey! Love what we are building.');
allie2.talk('how are you', 'People are the point, you know?');
ok('dialogue recorded', allie2.dialogue().length === d0 + 2);
ok('affinity rose on talk', allie2.affinity() > 0);
// Serialize / restore round-trip (Step 5 persistence surface)
const snap = allie2.serialize();
ok('serialize carries affinity + dialogue', snap.affinity > 0 && Array.isArray(snap.dialogue) && snap.dialogue.length === 2);
const fresh = AC.createCitizen({ id: 'aria2', name: 'ARIA2', role: '3d-agent', brain:{ learns:true }, spawn:{ kind:'citizen' } });
const cz2 = AC.citizen('aria2');
cz2._restore(snap); // rehydrate from a saved self
ok('restore rehydrates affinity', cz2.affinity() === snap.affinity);
ok('restore rehydrates dialogue', cz2.dialogue().length === snap.dialogue.length);

console.log('\n[agent-citizen] ' + (fail === 0 ? 'PASS: ' + pass + ' checks green' : 'FAIL: ' + fail + ' failed, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
