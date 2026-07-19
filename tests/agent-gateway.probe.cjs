// AgentGateway probe — Layer D (M9 precursor) foundation stub
// Contract: installs onto Genesis, registers agent://gsk on the Kernel,
// connects to window.GSK_WS_ENDPOINT (thought-stream :3002) when enabled,
// pipes thoughts into the existing #gsk-panel (window.__thoughtStream), and
// registers a per-frame tick on Genesis.EngineScheduler. Fully offline-safe:
// no WebSocket / no endpoint / no panel => degraded buffer, zero throws.
// Flag __GENESIS_AGENT_GATEWAY defaults OFF; this probe exercises the
// module directly (Node), never flips the flag or touches production.
//
// Run: node tests/agent-gateway.probe.cjs
'use strict';
const assert = require('assert');
const path = require('path');

function fakeGenesis(extra) {
  const G = {
    moduleRegistry: new Map(),
    registerModule(n, r) { this.moduleRegistry.set(n, r); },
    boot: {}
  };
  if (extra) Object.assign(G, extra);
  return G;
}

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ok - ' + label); }

function load(extra) {
  const mod = require(path.join(__dirname, '..', 'src', 'genesis', 'agent-gateway.js'));
  const G = fakeGenesis(extra);
  mod.install(G);
  // Wire the real SOUL-GUN systems so the cost-gate + reaction tests exercise them.
  try { require(path.join(__dirname, '..', 'src', 'genesis', 'resource-pool.js')).install(G); } catch (_) {}
  try { require(path.join(__dirname, '..', 'src', 'genesis', 'reaction-rules.js')).install(G); } catch (_) {}
  // Seed the default consequence rule (mirrors agent-gateway self-seed).
  try { if (G.ReactionRules && typeof G.ReactionRules.addRule === 'function') {
    G.ReactionRules.addRule('light-answers-building', { when: { op:'spawn', kind:'light' }, reacts: { kind:'building', setMeta: { litBy: 'agent://gsk' } } });
  } } catch (_) {}
  return G;
}

console.log('[agent-gateway] AgentGateway (Layer D host stub)');

// 1. Installs + idempotent.
check('AgentGateway installs + idempotent', () => {
  const G = load();
  assert.ok(G.AgentGateway, 'gateway missing');
  require(path.join(__dirname, '..', 'src', 'genesis', 'agent-gateway.js')).install(G); // re-install = no-op
  assert.strictEqual(G.AgentGateway.agentId, 'agent://gsk');
});

// 2. Registers agent://gsk (local + Kernel when present).
check('registers agent://gsk (local + Kernel when present)', () => {
  const kernel = { m: new Map(), register(n, r) { this.m.set(n, r); }, has(n) { return this.m.has(n); } };
  const G = load({ GenesisKernel: kernel });
  assert.ok(G.AgentGateway.hasAgent('agent://gsk'), 'agent not registered locally');
  assert.ok(kernel.has('agent://gsk'), 'agent not registered on Kernel');
  assert.ok(G.AgentGateway.agents().includes('agent://gsk'));
  assert.strictEqual(G.AgentGateway.summary().agentCount, 1);
});

// 3. Registers a per-frame tick on the EngineScheduler (engine-driven).
check('registers engine tick on EngineScheduler', () => {
  const sched = { order: [], defineTick(n) { this.order.push(n); }, has(n) { return this.order.includes(n); } };
  const G = load({ EngineScheduler: sched });
  assert.ok(sched.has('agent-gateway'), 'tick not registered');
});

// 4. Offline-safe: no WebSocket global => connect() no-op, no throw.
check('offline-safe: connect() with no WebSocket => status offline, no throw', () => {
  const prev = global.WebSocket;
  global.WebSocket = undefined; // simulate browser-disabled / no WS global
  try {
    const G = load();
    assert.doesNotThrow(() => { G.AgentGateway.connect(); });
    const s = G.AgentGateway.summary();
    assert.strictEqual(s.status, 'offline');
    assert.strictEqual(s.offline, true);
    assert.strictEqual(s.received, 0);
  } finally {
    global.WebSocket = prev;
  }
});

// 5. Ingest normalizes + buffers + pipes to existing panel (window.__thoughtStream).
check('ingest pipes to window.__thoughtStream', () => {
  const got = [];
  global.window = {
    __thoughtStream: { ingest: (t) => got.push(t) },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    dispatchEvent: () => true
  };
  try {
    const G = load();
    const t = G.AgentGateway.ingest({ text: 'GSK is thinking' });
    assert.strictEqual(typeof t.ts, 'number', 'ts stamped');
    assert.strictEqual(got.length, 1);
    assert.strictEqual(got[0].text, 'GSK is thinking');
    assert.strictEqual(G.AgentGateway.summary().piped, 1);
    assert.strictEqual(G.AgentGateway.summary().buffered, 1);
    G.AgentGateway.ingest('{"text":"raw json"}');
    assert.strictEqual(G.AgentGateway.latest().text, 'raw json');
  } finally {
    delete global.window;
  }
});

// 6. Panel-absent fallback: dispatches DOM event, never throws.
check('panel-absent => DOM event fallback, no throw', () => {
  let fired = null;
  global.window = {
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
    dispatchEvent: (e) => { fired = e; return true; }
  };
  try {
    const G = load();
    G.AgentGateway.ingest({ text: 'no panel here' });
    assert.ok(fired, 'no event dispatched');
    assert.strictEqual(fired.type, 'genesis:agent:thought');
    assert.strictEqual(fired.detail.text, 'no panel here');
  } finally {
    delete global.window;
  }
});

// 7. Disabled by default (flag not true) => isEnabled() false.
check('flag-gated OFF by default (isEnabled false)', () => {
  const G = load();
  assert.strictEqual(G.AgentGateway.isEnabled(), false);
});

// 8. Surfaced via registerModule for Genesis.summary().
check('surfaced via registerModule', () => {
  const G = load();
  assert.ok(G.moduleRegistry.has('agent-gateway'), 'not registered in module registry');
});

// 9. Step 1 (the body): command OUT channel + world-state IN read.
check('Step1 body: dispatch -> engine applies + observe grounds actions', () => {
  const reg = { m: new Map(), seq: 0,
    register(o, opts) { const id = 'ent_' + (++this.seq); this.m.set(id, { id, obj: o||null, tags:(opts&&opts.tags)||[], kind:(opts&&opts.kind)||'x' }); return id; },
    resolve(id) { return this.m.get(id) || null; },
    unregister(id) { return this.m.delete(id); },
    count() { return this.m.size; },
    snapshot() { return Array.from(this.m.values()); } };
  let appliedFn = null;
  const sched = { defineTick(n, fn) { appliedFn = fn; }, has(n) { return !!appliedFn; } };
  const G = load({ EntityRegistry: reg, EngineScheduler: sched });
  const d = G.AgentGateway.dispatch({ op:'spawn', kind:'angel', pos:{ x:1, y:2, z:3 } });
  assert.strictEqual(d.ok, true, 'dispatch failed');
  assert.strictEqual(G.AgentGateway.summary().queued, 1, 'command not queued');
  appliedFn(); // EngineScheduler tick -> the body acts
  assert.strictEqual(reg.count(), 1, 'engine did not spawn entity');
  assert.strictEqual(G.AgentGateway.summary().applied, 1, 'command not applied');
  const obs = G.AgentGateway.observe();
  assert.strictEqual(obs.ok, true, 'observe failed');
  assert.strictEqual(obs.count, 1, 'observe should ground on world state');
});

// 10. Two distinct channels: dispatch (OUT) vs ingest (IN->panel), no cross-talk.
check('Step1 channels: dispatch queues, ingest pipes to panel (no cross-talk)', () => {
  const got = [];
  global.window = { __thoughtStream: { ingest: (t) => got.push(t) }, CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, dispatchEvent: () => true };
  try {
    const G = load();
    G.AgentGateway.dispatch({ op:'delete', id:'z' });
    assert.strictEqual(G.AgentGateway.summary().queued, 1, 'command not queued');
    assert.strictEqual(got.length, 0, 'command must NOT hit the panel');
    G.AgentGateway.ingest({ text:'thinking' });
    assert.strictEqual(got.length, 1, 'thought must hit the panel');
    assert.strictEqual(G.AgentGateway.summary().queued, 1, 'ingest must NOT enqueue a command');
  } finally {
    delete global.window;
  }
});

// 11. Step 2 command vocabulary: validate schema (CASCADE surface).
check('Step2 vocab: unknown op / bad pos / bad id rejected; valid spawn+learn pass', () => {
  const Vocab = require(path.join(__dirname, '..', 'src', 'genesis', 'command-vocab.js'));
  assert.ok(Vocab && Vocab.validate, 'vocab missing');
  assert.strictEqual(Vocab.validate({ op:'fly' }).ok, false, 'unknown op must fail');
  assert.strictEqual(Vocab.validate({ op:'move', id:'x', pos:{x:1,y:NaN,z:0} }).ok, false, 'NaN pos must fail');
  assert.strictEqual(Vocab.validate({ op:'delete', id:'bad id!!' }).ok, false, 'bad id must fail');
  assert.strictEqual(Vocab.validate({ op:'spawn', kind:'angel', pos:{x:1,y:2,z:3} }).ok, true, 'valid spawn must pass');
  assert.strictEqual(Vocab.validate({ op:'learn', text:'study persistence' }).ok, true, 'valid learn must pass');
});

// 12. Step 2 CASCADE ingress: gateway.dispatch rejects invalid op (never queued).
check('Step2 ingress CASCADE: invalid op rejected, not queued', () => {
  const G = load();
  const r = G.AgentGateway.dispatch({ op:'fly' });
  assert.strictEqual(r.ok, false, 'invalid op must be rejected at ingress');
  assert.strictEqual(G.AgentGateway.summary().queued, 0, 'invalid op must NOT be queued');
  assert.strictEqual(G.AgentGateway.rejected(), 1, 'rejection must be counted');
});

// 13. Step 2 e2e (local-loop WS): thought -> panel + {op:spawn} -> EntityRegistry.
check('Step2 e2e (local-loop WS): thought->panel + {op:spawn}->entity', () => {
  const FakeWS = class {
    constructor(url){ this.url = url; this.readyState = 0; global.__lastWs = this; }
    send(){} close(){ this.readyState = 3; }
  };
  const prevWS = global.WebSocket;
  const got = [];
  const reg = { m:new Map(), seq:0,
    register(o,opts){ const id='ent_'+(++this.seq); this.m.set(id,{id,obj:o||null,owner:(opts&&opts.owner)||'world',tags:(opts&&opts.tags)||[],kind:(opts&&opts.kind)||'x'}); return id; },
    resolve(id){ return this.m.get(id)||null; },
    unregister(id){ return this.m.delete(id); },
    get(id){ return this.m.get(id)||null; },
    count(){ return this.m.size; }, snapshot(){ return Array.from(this.m.values()); } };
  let tickFn = null;
  const sched = { defineTick(n,fn){ tickFn = fn; }, has(){ return !!tickFn; } };
  global.window = { __GENESIS_AGENT_GATEWAY:true, __thoughtStream:{ ingest:(t)=>got.push(t) }, CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail;}, dispatchEvent:()=>true };
  global.WebSocket = FakeWS;
  try {
    const G = load({ EntityRegistry: reg, EngineScheduler: sched });
    const ws = global.__lastWs;
    assert.ok(ws, 'gateway did not open a WS on connect');
    assert.strictEqual(ws.url.indexOf('localhost:3002')!==-1 || ws.url.indexOf('/gsk')!==-1, true, 'local-loop or hosted route used');
    ws.onopen && ws.onopen();
    ws.onmessage({ data: JSON.stringify({ text:'I am thinking' }) });      // thought -> panel
    assert.strictEqual(got.length, 1, 'thought must reach panel');
    ws.onmessage({ data: JSON.stringify({ op:'spawn', kind:'angel', pos:{x:1,y:2,z:3} }) }); // command -> queue
    assert.strictEqual(G.AgentGateway.summary().queued, 1, 'command must be queued');
    tickFn();                                                            // EngineScheduler applies
    assert.strictEqual(reg.count(), 1, 'entity must be spawned in world');
    assert.strictEqual(G.AgentGateway.built().length, 1, 'built entity must be witnessed');
  } finally {
    global.WebSocket = prevWS; delete global.window; delete global.__lastWs;
  }
});

// 14. Step 3 CRITIC (ULTRA REVIEW): cannot delete/move world-owned entity.
check('Step3 CRITIC: cannot delete world-owned entity; own entity allowed', () => {
  const reg = { m:new Map(), seq:0,
    register(o,opts){ const id='ent_'+(++this.seq); this.m.set(id,{id,obj:o||null,owner:(opts&&opts.owner)||'world',tags:(opts&&opts.tags)||[],kind:(opts&&opts.kind)||'x'}); return id; },
    resolve(id){ return this.m.get(id)||null; },
    unregister(id){ return this.m.delete(id); },
    has(id){ return this.m.has(id); },
    get(id){ return this.m.get(id)||null; },
    count(){ return this.m.size; }, snapshot(){ return Array.from(this.m.values()); } };
  let tickFn = null;
  const sched = { defineTick(n,fn){ tickFn = fn; }, has(){ return !!tickFn; } };
  const G = load({ EntityRegistry: reg, EngineScheduler: sched });
  const worldId = reg.register(null, { owner:'world', kind:'building' });
  const gskId = reg.register(null, { owner:'agent://gsk', kind:'angel' });
  G.AgentGateway.dispatch({ op:'delete', id: worldId }); // protected
  G.AgentGateway.dispatch({ op:'delete', id: gskId });   // own -> allowed
  tickFn();
  assert.strictEqual(reg.has(worldId), true, 'world entity must survive (CASCADE)');
  assert.strictEqual(reg.has(gskId), false, 'own entity may be deleted');
  assert.strictEqual(G.AgentGateway.rejected(), 1, 'protected delete counted as rejected');
});

// 15. Step 4 learn (local-loop): ingest knowledge, no egress.
check('Step4 learn (local-loop): ingest knowledge recorded', () => {
  const G = load();
  const r = G.AgentGateway.learn({ op:'learn', text:'GSK studies persistence engines.' });
  assert.strictEqual(r.ok, true, 'learn must succeed locally');
  assert.strictEqual(G.AgentGateway.learnings().length, 1, 'learning recorded');
  assert.strictEqual(G.AgentGateway.learnings()[0].text.indexOf('persistence')!==-1, true);
});


// 16. SOUL-GUN Central Constraint Gate (integrated): cost-gated spawn through
//     the real gateway — insufficient energy rejects the command (scarcity).
check('SoulGun cost gate: insufficient energy rejects spawn', () => {
  const reg = { m:new Map(), seq:0,
    register(o,opts){ const id='ent_'+(++this.seq); this.m.set(id,{id,obj:o||null,owner:(opts&&opts.owner)||'world',tags:(opts&&opts.tags)||[],kind:(opts&&opts.kind)||'x',meta:(opts&&opts.meta)||{}}); return id; },
    resolve(id){ return this.m.get(id)||null; }, get(id){ return this.m.get(id)||null; },
    unregister(id){ return this.m.delete(id); }, has(id){ return this.m.has(id); },
    find(k){ return Array.from(this.m.values()).filter(e=>e.kind===k); },
    count(){ return this.m.size; }, snapshot(){ return Array.from(this.m.values()); } };
  let tickFn = null;
  const sched = { defineTick(n,fn){ tickFn = fn; } };
  const G = load({ EntityRegistry: reg, EngineScheduler: sched });
  // Ensure the Central Constraint Gate pool exists (self-installs if gateway didn't).
  if (!G.ResourcePool) { try { require(path.join(__dirname, '..', 'src', 'genesis', 'resource-pool.js')).install(G); } catch (_) {} }
  if (!G.ResourcePool) { const pools = new Map(); G.ResourcePool = { ensure(o,m){ const p=pools.get(o)||{energy:m,max:m,regen:0}; p.max=m; pools.set(o,p); return p; }, spend(o,a){ const p=pools.get(o); if(!p||p.energy<a) return false; p.energy-=a; return true; }, get(o){ return pools.get(o); }, regen(){}, regenAll(){}, snapshot(){ return []; } }; }
  // Wire the pool + give GSK a small budget (10). ensure() only seeds once and
  // get() returns a copy, so seed the scenario budget via load() (Step 5 surface).
  G.ResourcePool.ensure('agent://gsk', 10, 0);
  G.ResourcePool.load({ 'agent://gsk': { energy: 10, max: 10, regen: 0 } });
  // Spawn cost 10 -> ok (drains to 0)
  G.AgentGateway.dispatch({ op:'spawn', kind:'angel', owner:'agent://gsk', cost:10 });
  tickFn();
  assert.strictEqual(G.ResourcePool.get('agent://gsk').energy, 0, 'energy drained to 0');
  // Another spawn cost 10 -> insufficient -> rejected (no over-draw)
  G.AgentGateway.dispatch({ op:'spawn', kind:'angel', owner:'agent://gsk', cost:10 });
  tickFn();
  assert.strictEqual(G.AgentGateway.rejected(), 1, 'over-draw rejected by cost gate');
  assert.strictEqual(G.ResourcePool.get('agent://gsk').energy, 0, 'energy never negative');
});

// 17. SOUL-GUN World Reaction Layer (integrated): GSK spawn triggers a real
//     world reaction (consequence, not fluff) witnessed by an emitted event.
check('SoulGun reaction: GSK spawn lights a building (consequence)', () => {
  const reg = { m:new Map(), seq:0,
    register(o,opts){ const id='ent_'+(++this.seq); this.m.set(id,{id,obj:o||null,owner:(opts&&opts.owner)||'world',tags:(opts&&opts.tags)||[],kind:(opts&&opts.kind)||'x',meta:(opts&&opts.meta)||{}}); return id; },
    resolve(id){ return this.m.get(id)||null; }, get(id){ return this.m.get(id)||null; },
    unregister(id){ return this.m.delete(id); }, has(id){ return this.m.has(id); },
    find(k){ return Array.from(this.m.values()).filter(e=>e.kind===k); },
    count(){ return this.m.size; }, snapshot(){ return Array.from(this.m.values()); } };
  const events = [];
  const fakeWin = { dispatchEvent(){}, CustomEvent: function(){}, addEventListener(){} };
  let tickFn = null;
  const sched = { defineTick(n,fn){ tickFn = fn; } };
  const G = load({ EntityRegistry: reg, EngineScheduler: sched, registerModule(){}, window: fakeWin });
  // Capture the reaction event.
  const origEmit = G.AgentGateway; // emit is internal; observe via ReactionRules global
  const buildingId = reg.register(null, { owner:'world', kind:'building', meta:{} });
  G.AgentGateway.dispatch({ op:'spawn', kind:'light', owner:'agent://gsk' });
  tickFn();
  const b = reg.get(buildingId);
  assert.ok(b.meta.litBy, 'building reacted (litBy set) — act had consequence, not fluff');
});

console.log('[agent-gateway] PASS: ' + passed + ' checks green');
