// product-route.probe.cjs — Wallmeria product route profile proof
// Run: node tests/product-route.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');
const RuntimeConfig = require(path.join(__dirname, '..', 'src', 'genesis', 'runtime-config-injection.js'));
const Host = require(path.join(__dirname, '..', 'host', 'genesis-host.cjs'));

function fakeGenesis() {
  return { moduleRegistry: new Map(), registerModule(name, rec) { this.moduleRegistry.set(name, rec); } };
}
function installAll() {
  const G = fakeGenesis();
  require(path.join(__dirname, '..', 'src', 'genesis', 'runtime-manifest.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'agent-route-table.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'transport-adapter.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'auth-provider.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'deployment-profile.js')).install(G);
  require(path.join(__dirname, '..', 'src', 'genesis', 'engine-health.js')).install(G);
  RuntimeConfig.install(G);
  return G;
}
function applyManifest(G, manifest, token) {
  if (token) G.AuthProvider.setToken(token);
  G.RuntimeManifest.set({ profile: manifest.profile, endpoints: manifest.endpoints, auth: manifest.auth }, { location: { hostname: 'buyasoul-ai.github.io' } });
  G.AgentRouteTable.installFromManifest(G.RuntimeManifest.current());
  G.TransportAdapter.installFromRouteTable();
  return G.EngineHealth.proveRoutes();
}

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

console.log('\n=== PRODUCT ROUTE PROFILE PROBE ===\n');

check('dev-local profile routes but remains development harness', () => {
  const G = installAll();
  G.DeploymentProfile.set('dev-local', { endpoints: { gsk: 'http://localhost:3001', thoughts: 'ws://localhost:3002', sanctum: 'ws://localhost:9001' }, auth: { provider: 'bearer', token: 'dev' } });
  const proof = G.EngineHealth.proveRoutes();
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.productReady, false);
  assert.strictEqual(proof.routes.some(r => r.developmentHarness), true);
});

check('static profile without host endpoints does not fake product readiness', () => {
  const G = installAll();
  G.DeploymentProfile.set('static', { endpoints: {}, auth: { provider: 'none' } });
  const check = G.EngineHealth.check();
  assert.strictEqual(check.productReady, false);
  assert.ok(check.standingWalls > 0);
});

check('docker profile resolves all product routes without Craig hardcoding', () => {
  const G = installAll();
  const cfg = RuntimeConfig.build({ profile: 'docker', publicBaseUrl: 'https://docker.example.com', token: 'docker-token' });
  const proof = applyManifest(G, cfg, 'docker-token');
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.productReady, true);
  assert.ok(proof.routes.every(r => !r.developmentHarness));
});

check('vps profile resolves all product routes without Craig hardcoding', () => {
  const G = installAll();
  const cfg = RuntimeConfig.build({ profile: 'vps', publicBaseUrl: 'https://vps.example.com', token: 'vps-token' });
  const proof = applyManifest(G, cfg, 'vps-token');
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.productReady, true);
  assert.ok(proof.routes.every(r => r.endpoint.indexOf('localhost') === -1));
});

check('buyer-host public manifest feeds route table', () => {
  const state = Host.createHostState({ publicBaseUrl: 'https://engine.example.com', token: 'host-token', profile: 'docker' });
  const G = installAll();
  const proof = applyManifest(G, state.manifest, 'host-token');
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.productReady, true);
  assert.strictEqual(G.AgentRouteTable.resolveEndpoint('agent://sanctum', 'lobby'), 'wss://engine.example.com/sanctum');
});

console.log('\n=== PRODUCT ROUTE PROFILE: ' + passed + ' checks passed ===\n');
