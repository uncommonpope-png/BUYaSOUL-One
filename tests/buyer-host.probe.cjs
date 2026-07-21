// buyer-host.probe.cjs — buyer-host runtime proof without starting local server
// Run: node tests/buyer-host.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');
const host = require(path.join(__dirname, '..', 'host', 'genesis-host.cjs'));

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }
function req(url, headers) { return { url, headers: headers || {} }; }

console.log('\n=== BUYER HOST RUNTIME PROBE ===\n');

check('creates product manifest for buyer host', () => {
  const state = host.createHostState({ publicBaseUrl: 'https://engine.example.com', token: 'secret-token', profile: 'docker' });
  assert.strictEqual(state.manifest.productReady, true);
  assert.strictEqual(state.manifest.dependsOnCraigPC, false);
  assert.strictEqual(state.manifest.endpoints.gsk, 'https://engine.example.com');
  assert.strictEqual(state.manifest.endpoints.thoughts, 'wss://engine.example.com/thoughts');
});

check('auth is required and validates bearer / x-api-key / query token', () => {
  const state = host.createHostState({ publicBaseUrl: 'https://engine.example.com', token: 'secret-token' });
  assert.strictEqual(host.verifyAuth(req('/mcp/status', { authorization: 'Bearer secret-token' }), state).ok, true);
  assert.strictEqual(host.verifyAuth(req('/mcp/status', { 'x-api-key': 'secret-token' }), state).ok, true);
  assert.strictEqual(host.verifyAuth(req('/thoughts?token=secret-token', {}), state).ok, true);
  assert.strictEqual(host.verifyAuth(req('/mcp/status', { authorization: 'Bearer wrong' }), state).ok, false);
});

check('runtime script does not leak token', () => {
  const state = host.createHostState({ publicBaseUrl: 'https://engine.example.com', token: 'secret-token' });
  const js = host.runtimeScript(state);
  assert.ok(js.indexOf('GENESIS_RUNTIME_MANIFEST') !== -1);
  assert.ok(js.indexOf('https://engine.example.com') !== -1);
  assert.ok(js.indexOf('secret-token') === -1);
});

check('normalizes /gsk prefixed product routes', () => {
  assert.strictEqual(host.normalizePath('/gsk/mcp/health'), '/mcp/health');
  assert.strictEqual(host.normalizePath('/gsk/mcp/status'), '/mcp/status');
  assert.strictEqual(host.normalizePath('/mcp/status'), '/mcp/status');
});

check('websocket handshake accept matches RFC sample', () => {
  assert.strictEqual(host.websocketAccept('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

check('health/status payloads are truthful and no-fake-insight', () => {
  const state = host.createHostState({ publicBaseUrl: 'https://engine.example.com', token: 'secret-token' });
  const health = host.healthPayload(state);
  const status = host.statusPayload(state);
  assert.strictEqual(health.authRequired, true);
  assert.strictEqual(status.noFakeInsight, true);
  assert.strictEqual(status.systems.chambers.phase, 'buyer-host-runtime');
});

console.log('\n=== BUYER HOST RUNTIME: ' + passed + ' checks passed ===\n');
