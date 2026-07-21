// next-ten.probe.cjs — Godmode next 10 verification
// Run: node tests/next-ten.probe.cjs
'use strict';

const assert = require('assert');
const path = require('path');

function fakeGenesis() {
  return {
    moduleRegistry: new Map(),
    registerModule(name, record) { this.moduleRegistry.set(name, record); }
  };
}

function install(file, G) {
  const mod = require(path.join(__dirname, '..', 'src', 'genesis', file));
  if (mod && typeof mod.install === 'function') mod.install(G);
  return mod;
}

function installAll() {
  const G = fakeGenesis();
  G.Immortality = require(path.join(__dirname, '..', 'src', 'genesis', 'immortality.js'));
  install('runtime-manifest.js', G);
  install('agent-route-table.js', G);
  install('transport-adapter.js', G);
  install('event-bridge.js', G);
  install('auth-provider.js', G);
  install('deployment-profile.js', G);
  install('engine-health.js', G);
  install('sanctum-adapter.js', G);
  install('consequence-audit.js', G);
  install('litmus-pass.js', G);
  install('citizen-reflect-loop.js', G);
  install('affordance-model.js', G);
  install('grounding-kg.js', G);
  install('skill-tree.js', G);
  return G;
}

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

console.log('\n=== GODMODE NEXT TEN PROBE ===\n');

check('P38/P142 consequence audit detects missing and satisfied reactions', () => {
  const G = installAll();
  G.ConsequenceAudit.clear();
  G.EventBridge.emit('agent:gather', { id: 'citizen-1' });
  let r = G.ConsequenceAudit.audit();
  assert.strictEqual(r.ok, false, 'missing reaction should fail');
  G.EventBridge.emit('agent:react', { id: 'citizen-1' });
  r = G.ConsequenceAudit.audit();
  assert.strictEqual(r.ok, true, 'reaction should satisfy audit');
});

check('P51 litmus pass verifies exact days-later state', () => {
  const G = installAll();
  const old = Date.now() - (2 * G.LitmusPass.DAY_MS);
  const save = G.LitmusPass.mark('days-later', { self: { id: 'gsk' }, world: [{ id: 'ent-1', kind: 'light' }] }, { at: old });
  const proof = G.LitmusPass.verify(save, null, { now: Date.now(), minAgeMs: G.LitmusPass.DAY_MS });
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.expectedHash, proof.actualHash);
});

check('P14/P176 engine health proves agent route table', () => {
  const G = installAll();
  G.AuthProvider.setToken('secret-token');
  G.DeploymentProfile.set('vps', { endpoints: { gsk: 'https://engine.example/gsk', thoughts: 'wss://engine.example/thoughts', sanctum: 'wss://engine.example/sanctum' }, auth: { provider: 'bearer', token: 'secret-token' } });
  G.AgentRouteTable.installFromManifest(G.RuntimeManifest.current());
  G.TransportAdapter.installFromRouteTable();
  const proof = G.EngineHealth.proveRoutes();
  assert.strictEqual(proof.ok, true);
  assert.strictEqual(proof.productReady, true);
});

check('P55/P111 auth provider signs HTTP headers and WS URLs', () => {
  const G = installAll();
  G.AuthProvider.setToken('abc123');
  assert.strictEqual(G.AuthProvider.headers().Authorization, 'Bearer abc123');
  assert.ok(G.AuthProvider.signUrl('wss://engine.example/sanctum').indexOf('token=abc123') !== -1);
  assert.strictEqual(G.AuthProvider.verifyBearer('Bearer abc123').ok, true);
});

check('P56/P112 deployment profile refreshes runtime manifest', () => {
  const G = installAll();
  const res = G.DeploymentProfile.set('docker', { endpoints: { gsk: 'https://d.example/gsk', thoughts: 'wss://d.example/thoughts', sanctum: 'wss://d.example/sanctum' }, auth: { provider: 'bearer', token: 't' } });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(G.RuntimeManifest.current().profile, 'docker');
  assert.strictEqual(G.AgentRouteTable.resolveEndpoint('agent://gsk', 'mcp'), 'https://d.example/gsk');
});

check('P54/P110/P86/P153 sanctum adapter resolves signed portable endpoint', () => {
  const G = installAll();
  G.AuthProvider.setToken('tok');
  G.DeploymentProfile.set('vps', { endpoints: { gsk: 'https://g.example/gsk', thoughts: 'wss://g.example/thoughts', sanctum: 'wss://g.example/sanctum' }, auth: { provider: 'bearer', token: 'tok' } });
  const s = G.SanctumAdapter.summary();
  assert.strictEqual(s.endpoint, 'wss://g.example/sanctum');
  assert.strictEqual(s.signed, true);
  assert.strictEqual(G.SanctumAdapter.join('agent://gsk').ok, true);
});

check('P82/P148 citizen reflect loop records reflections from events', () => {
  const G = installAll();
  G.EventBridge.emit('agent:plan', { id: 'citizen-1', behavior: 'gather', band: 'NEUTRAL' });
  G.EventBridge.emit('agent:react', { id: 'citizen-1', behavior: 'gather', band: 'FRIEND' });
  assert.ok(G.CitizenReflectLoop.list('citizen-1').length >= 2);
  assert.ok(G.CitizenReflectLoop.last('citizen-1').note.indexOf('Reacted') === 0);
});

check('P83/P149 affordance model scores action sets', () => {
  const G = installAll();
  G.TrustLedger = { getBand() { return 'FRIEND'; } };
  const actions = G.AffordanceModel.forEntity({ id: 'citizen-1', kind: 'citizen' }, { actor: 'agent://gsk', target: 'player' });
  assert.ok(actions.some(a => a.id === 'talk'));
  assert.strictEqual(G.AffordanceModel.best({ id: 'res-1', kind: 'resource' }, { actor: 'agent://gsk' }).id, 'gather');
});

check('P84/P150 grounding KG validates commands against world state', () => {
  const G = installAll();
  G.EntityRegistry = { snapshot() { return [{ id: 'ent-1', kind: 'light', tags: ['gsk'] }]; } };
  G.GroundingKG.refreshFromRegistry();
  assert.strictEqual(G.GroundingKG.validateCommand({ op: 'move', id: 'ent-1' }).ok, true);
  assert.strictEqual(G.GroundingKG.validateCommand({ op: 'move', id: 'missing' }).ok, false);
  assert.strictEqual(G.GroundingKG.groundText('the light ent-1 exists').ok, true);
});

check('P95/P157 skill tree unlocks from engine events and recommends next', () => {
  const G = installAll();
  G.EventBridge.emit('agent:plan', { id: 'citizen-1' });
  assert.strictEqual(G.SkillTree.isUnlocked('observe-world'), true);
  G.EventBridge.emit('agent:react', { id: 'citizen-1' });
  G.EventBridge.emit('agent:react', { id: 'citizen-1' });
  assert.strictEqual(G.SkillTree.isUnlocked('citizen-reflection'), true);
  const rec = G.SkillTree.recommend();
  assert.ok(rec === null || typeof rec.id === 'string');
});

check('all next-ten modules register in Genesis registry', () => {
  const G = installAll();
  ['consequence-audit', 'litmus-pass', 'auth-provider', 'deployment-profile', 'sanctum-adapter', 'citizen-reflect-loop', 'affordance-model', 'grounding-kg', 'skill-tree'].forEach(name => assert.ok(G.moduleRegistry.has(name), name + ' not registered'));
});

console.log('\n=== GODMODE NEXT TEN: ' + passed + ' checks passed ===\n');
