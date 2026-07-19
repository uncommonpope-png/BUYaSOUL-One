// scribe-gateway.probe.cjs — C2 verification (mirrors agent-gateway.probe.cjs)
const path = require('path');
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ok - ' + name); } else { fail++; console.log('  FAIL - ' + name); } }

// Minimal Genesis sandbox (no browser globals).
function makeGenesis() {
  const agents = new Map();
  const reg = new Map();
  const Genesis = {
    EntityRegistry: {
      register(obj, meta) { const id = 'e' + (reg.size + 1); const o = Object.assign({ id, position: { set(){} } }, meta || {}); reg.set(id, o); return id; },
      unregister(id) { return reg.delete(id); },
      resolve(id) { return reg.get(id) || null; },
      snapshot() { return Array.from(reg.values()); },
      find(k) { return Array.from(reg.values()).filter(e => e.kind === k); },
      queryByTag(t) { return Array.from(reg.values()).filter(e => (e.tags||[]).includes(t)); },
      count() { return reg.size; }
    },
    EngineScheduler: { defineTick(){} },
    GenesisKernel: { register(id, rec) { agents.set(id, rec); } },
    registerModule(){}
  };
  return Genesis;
}

// Load vocab + scribe-gateway via vm (module.exports path).
function loadMod(rel) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  const mod = { exports: {} };
  const ctx = { module: mod, exports: mod.exports, window: undefined, console, WebSocket: undefined };
  vm.runInNewContext(code, ctx);
  return ctx.module.exports;
}
function loadModAbs(rel) {
  const code = fs.readFileSync(rel, 'utf8');
  const mod = { exports: {} };
  const ctx = { module: mod, exports: mod.exports, window: undefined, console, WebSocket: undefined };
  vm.runInNewContext(code, ctx);
  return ctx.module.exports;
}

const Vocab = loadModAbs(path.join(__dirname, '..', 'src', 'genesis', 'command-vocab.js'));
ok('vocab loads', !!Vocab && typeof Vocab.validate === 'function');

const { install } = loadMod(path.join('..', 'src', 'genesis', 'scribe-gateway.js'));
ok('scribe-gateway exports install', typeof install === 'function');

// Install with a fake window exposing the flag + vocab.
const Genesis = makeGenesis();
let witnessed = null;
const fakeWindow = {
  __GENESIS_SCRIBE_GATEWAY: true,
  __agentVocab: Vocab,
  WebSocket: undefined,
  addEventListener(type, fn) { if (type === 'genesis:agent:entity-built') fakeWindow._onBuilt = fn; },
  dispatchEvent() { return true; },
  CustomEvent: function(){}
};
const sandbox = { window: fakeWindow, console, module: { exports: {} }, exports: {}, WebSocket: undefined };
// Re-evaluate scribe-gateway with fakeWindow so it sees the flag.
const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'genesis', 'scribe-gateway.js'), 'utf8');
fakeWindow.Genesis = Genesis; // so the file's auto-install branch fires
vm.runInNewContext(code, sandbox);

const G = Genesis.ScribeGateway;
ok('ScribeGateway installed', !!G);
ok('scheme is agent://scribe', G && G.scheme === 'agent://scribe');
ok('registered on kernel', Genesis.GenesisKernel && Genesis.GenesisKernel.register.called !== false);

// dispatch routes through CRITIC gate (valid op accepted)
const d1 = G.dispatch({ op: 'spawn', kind: 'scribe-book', owner: 'agent://scribe', tags: ['scribe-controlled'] });
ok('dispatch valid spawn queued', d1.ok === true);

// invalid op rejected by vocab
const d2 = G.dispatch({ op: 'bananas' });
ok('dispatch invalid op rejected', d2.ok === false);

// witness hook records GSK build
fakeWindow._onBuilt && fakeWindow._onBuilt({ detail: { owner: 'agent://gsk', kind: 'gsk-monument', id: 'eX' } });
ok('scribe witnessed GSK build', G.built().length === 1 && G.built()[0].from === 'agent://gsk');

// tick drains + applies scribe-owned spawn
const t = G.tick();
ok('tick applied scribe command', t.applied >= 1);
ok('scribe-owned entity in registry', Genesis.EntityRegistry.count() >= 1);

// CASCADE: scribe cannot delete non-scribe entity
const r = G.applyCommand({ op: 'delete', id: 'foreign' });
ok('cascade denies delete of non-scribe entity', r.ok === false);

console.log('\n[scribe-gateway] ' + (fail === 0 ? 'PASS: ' + pass + ' checks green' : 'FAIL: ' + fail + ' failed, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
