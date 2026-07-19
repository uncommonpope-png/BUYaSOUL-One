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

console.log('[agent-gateway] PASS: ' + passed + ' checks green');
