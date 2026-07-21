// runtime-config-injection.probe.cjs — P57/P113 config injection proof
// Run: node tests/runtime-config-injection.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');
const mod = require(path.join(__dirname, '..', 'src', 'genesis', 'runtime-config-injection.js'));

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

console.log('\n=== RUNTIME CONFIG INJECTION PROBE ===\n');

check('builds product-ready manifest from public base URL', () => {
  const cfg = mod.build({ profile: 'docker', publicBaseUrl: 'https://engine.example.com', token: 'secret-token' });
  assert.strictEqual(cfg.endpoints.gsk, 'https://engine.example.com');
  assert.strictEqual(cfg.endpoints.thoughts, 'wss://engine.example.com/thoughts');
  assert.strictEqual(cfg.endpoints.sanctum, 'wss://engine.example.com/sanctum');
  assert.strictEqual(cfg.productReady, true);
  assert.strictEqual(mod.validate(cfg).ok, true);
});

check('public manifest does not expose bearer secret by default', () => {
  const cfg = mod.build({ profile: 'vps', publicBaseUrl: 'https://gsk.example', token: 'super-secret-token' });
  const publicCfg = mod.publicManifest(cfg);
  assert.strictEqual(publicCfg.auth.bearerPresent, true);
  assert.strictEqual(publicCfg.auth.token, undefined);
  const js = mod.renderJavaScript(cfg);
  assert.ok(js.indexOf('super-secret-token') === -1, 'secret leaked into public JS');
});

check('inject sets browser globals on target object', () => {
  const target = {};
  const cfg = mod.build({ profile: 'docker', publicBaseUrl: 'https://engine.example.com', token: 'tok' });
  const res = mod.inject(target, cfg);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(target.GSK_ENDPOINT, 'https://engine.example.com');
  assert.strictEqual(target.GSK_WS_ENDPOINT, 'wss://engine.example.com/thoughts');
  assert.strictEqual(target.SANCTUM_WS_ENDPOINT, 'wss://engine.example.com/sanctum');
  assert.strictEqual(target.GSK_API_KEY || '', '');
});

check('rejects product config that points at localhost', () => {
  const cfg = mod.build({ profile: 'docker', publicBaseUrl: 'http://localhost:8080', token: 'tok' });
  const proof = mod.validate(cfg);
  assert.strictEqual(proof.ok, false);
  assert.ok(proof.errors.includes('gsk-must-be-https'));
  assert.ok(proof.errors.includes('product-config-cannot-use-local-or-private-host'));
});

check('registers RuntimeConfigInjection in Genesis registry', () => {
  const G = { moduleRegistry: new Map(), registerModule(name, rec) { this.moduleRegistry.set(name, rec); } };
  mod.install(G);
  assert.ok(G.RuntimeConfigInjection);
  assert.ok(G.moduleRegistry.has('runtime-config-injection'));
});

console.log('\n=== RUNTIME CONFIG INJECTION: ' + passed + ' checks passed ===\n');
