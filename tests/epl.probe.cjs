// EPL probe — Walls of Wallmeria v0.1
// Run: node tests/epl.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');

function fakeGenesis() {
  return {
    moduleRegistry: new Map(),
    registerModule(name, record) { this.moduleRegistry.set(name, record); }
  };
}

function installAll(G) {
  require(path.join(__dirname, '..', 'src', 'genesis', 'runtime-manifest.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'agent-route-table.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'transport-adapter.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'engine-health.js')).install(G);
  return G;
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log('  ✅ ' + label);
}

console.log('\n=== EPL / Walls of Wallmeria Probe ===\n');

check('runtime manifest installs and defaults to dev harness', () => {
  const G = installAll(fakeGenesis());
  assert.ok(G.RuntimeManifest, 'missing RuntimeManifest');
  const m = G.RuntimeManifest.current();
  assert.strictEqual(m.version, 1);
  assert.strictEqual(m.dependsOnCraigPC, true, 'localhost default must be classified as Craig-PC/dev harness');
  assert.strictEqual(m.productReady, false, 'localhost default cannot be product-real');
});

check('runtime manifest accepts product-hosted endpoints', () => {
  const G = installAll(fakeGenesis());
  const m = G.RuntimeManifest.set({
    profile: 'docker',
    endpoints: {
      gsk: 'https://engine.example.com/gsk',
      thoughts: 'wss://engine.example.com/thoughts',
      sanctum: 'wss://engine.example.com/sanctum'
    },
    auth: { provider: 'bearer', token: 'test-token' }
  });
  assert.strictEqual(m.dependsOnCraigPC, false);
  assert.strictEqual(m.productReady, true);
  assert.strictEqual(m.endpoints.gsk.productReady, true);
});

check('agent route table registers default agent:// routes', () => {
  const G = installAll(fakeGenesis());
  assert.ok(G.AgentRouteTable.has('agent://gsk'), 'gsk route missing');
  assert.ok(G.AgentRouteTable.has('agent://scribe'), 'scribe route missing');
  assert.ok(G.AgentRouteTable.has('agent://sanctum'), 'sanctum route missing');
  const gsk = G.AgentRouteTable.resolve('agent://gsk', 'mcp');
  assert.strictEqual(gsk.kind, 'http');
  assert.ok(gsk.endpoint.indexOf('localhost:3001') !== -1);
});

check('route table can rebuild from product manifest', () => {
  const G = installAll(fakeGenesis());
  G.RuntimeManifest.set({
    profile: 'vps',
    endpoints: { gsk: 'https://gsk.example/gsk', thoughts: 'wss://gsk.example/thoughts', sanctum: 'wss://gsk.example/sanctum' },
    auth: { provider: 'bearer', token: 'x' }
  });
  G.AgentRouteTable.installFromManifest(G.RuntimeManifest.current());
  assert.strictEqual(G.AgentRouteTable.resolveEndpoint('agent://gsk', 'mcp'), 'https://gsk.example/gsk');
});

check('transport adapters classify dev harness vs product route', () => {
  const G = installAll(fakeGenesis());
  let h = G.TransportAdapter.health('agent://gsk', 'mcp');
  assert.strictEqual(h.ok, true);
  assert.strictEqual(h.developmentHarness, true);
  assert.strictEqual(h.productReady, false);

  G.RuntimeManifest.set({ profile: 'docker', endpoints: { gsk: 'https://engine.example/gsk', thoughts: 'wss://engine.example/thoughts', sanctum: 'wss://engine.example/sanctum' }, auth: { provider: 'bearer', token: 'x' } });
  G.AgentRouteTable.installFromManifest(G.RuntimeManifest.current());
  G.TransportAdapter.installFromRouteTable();
  h = G.TransportAdapter.health('agent://gsk', 'mcp');
  assert.strictEqual(h.developmentHarness, false);
  assert.strictEqual(h.productReady, true);
});

check('engine health reports 14 Wallmeria walls', () => {
  const G = installAll(fakeGenesis());
  const report = G.EngineHealth.check();
  assert.strictEqual(report.wallCount, 14);
  assert.ok(report.standingWalls > 0, 'default local harness should not clear walls');
  assert.strictEqual(report.dependsOnCraigPC, true);
});

check('engine health clears core walls under product-hosted manifest', () => {
  const G = installAll(fakeGenesis());
  G.RuntimeManifest.set({
    profile: 'vps',
    endpoints: { gsk: 'https://gsk.example/gsk', thoughts: 'wss://gsk.example/thoughts', sanctum: 'wss://gsk.example/sanctum' },
    auth: { provider: 'bearer', token: 'x' }
  });
  G.AgentRouteTable.installFromManifest(G.RuntimeManifest.current());
  G.TransportAdapter.installFromRouteTable();
  const report = G.EngineHealth.check();
  assert.strictEqual(report.dependsOnCraigPC, false);
  assert.strictEqual(report.productReady, true);
  assert.strictEqual(report.standingWalls, 0);
});

check('modules register with Genesis registry', () => {
  const G = installAll(fakeGenesis());
  assert.ok(G.moduleRegistry.has('runtime-manifest'));
  assert.ok(G.moduleRegistry.has('agent-route-table'));
  assert.ok(G.moduleRegistry.has('transport-adapter'));
  assert.ok(G.moduleRegistry.has('engine-health'));
});

console.log('\n=== Results: ' + passed + ' checks passed ===\n');
