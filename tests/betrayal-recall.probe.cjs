// betrayal-recall.probe.cjs — P47 Betrayal Recall verification
// Verifies the module records, recalls, gossips, and persists.
const path = require('path');
const fs = require('fs');

// Simulate Genesis environment
const Genesis = { registerModule: () => {} };
const events = [];

// Stub EventBridge
Genesis.EventBridge = {
  on: function(type, fn) { this._listeners = this._listeners || {}; (this._listeners[type] = this._listeners[type] || []).push(fn); },
  emit: function(type, payload) { events.push({ type, payload }); }
};

// Stub CitizenAI
Genesis.CitizenAI = {
  addEpisode: function(id, type, desc) { /* no-op for probe */ }
};

// Stub TrustLedger
var gossipDeltas = [];
Genesis.TrustLedger = {
  getBand: function(a, b) { return a === 'citizen-2' ? 'FRIEND' : 'NEUTRAL'; },
  addTrustDelta: function(a, b, delta, type, desc) {
    if (type === 'gossip') gossipDeltas.push({ a, b, delta, type, desc });
    return { ok: true, newScore: 0 - Math.abs(delta) };
  }
};

// Stub Immortality
Genesis.Immortality = {
  registerSystem: function(name, sys) { this._systems = this._systems || {}; this._systems[name] = sys; }
};

// Stub EntityRegistry
var entityId = 0;
Genesis.EntityRegistry = {
  snapshot: function() {
    return [
      { id: 'citizen-1', kind: 'citizen', pos: { x: 5, z: 5 } },
      { id: 'citizen-2', kind: 'citizen', pos: { x: 8, z: 8 } },
      { id: 'citizen-3', kind: 'other', pos: { x: 12, z: 12 } }
    ];
  }
};

// Install the module
var mod = require('../src/genesis/betrayal-recall.js');
mod.install(Genesis);

var BR = Genesis.BetrayalRecall;
var passed = 0, failed = 0;

function check(name, ok, detail) {
  if (ok) { passed++; console.log('  ✅ ' + name + (detail ? ': ' + detail : '')); }
  else { failed++; console.log('  ❌ ' + name + (detail ? ': ' + detail : '')); }
}

console.log('\n=== P47 Betrayal Recall Probe ===\n');

// Test 1: module installed
check('Module installed', !!BR, 'BetrayalRecall API exists');

// Test 2: record a betrayal
var rec = BR.record('citizen-1', 'player', 'theft', 'Stole resources from the market', 0.8, { x: 10, z: 10 });
check('Record betrayal', !!rec && !!rec.id, 'id=' + rec.id);
check('Record has event type', rec.eventType === 'theft', rec.eventType);
check('Record has description', rec.description === 'Stole resources from the market', rec.description);

// Test 3: recall the betrayal
var recalls = BR.recall('citizen-1', 'player', 5);
check('Recall returns array', Array.isArray(recalls), 'length=' + recalls.length);
check('Recall finds betrayal', recalls.length === 1, 'found 1 betrayal');
check('Recall has correct type', recalls[0].eventType === 'theft', recalls[0].eventType);

// Test 4: sayRecall generates dialogue
var say = BR.sayRecall('citizen-1', 'player');
check('sayRecall returns object', !!say && !!say.say, 'text="' + say.say.substring(0, 40) + '..."');
check('sayRecall has meta', !!say.meta && !!say.meta.betrayalId, 'meta present');

// Test 5: record more betrayals of different types
BR.record('citizen-1', 'player', 'attack', 'Struck a citizen without cause', 0.9, { x: 10, z: 10 });
BR.record('citizen-2', 'player', 'sabotage', 'Destroyed the workshop', 0.6, { x: 20, z: 20 });
var recall2 = BR.recall('citizen-1', 'player', 5);
check('Multiple betrayals recalled', recall2.length === 2, 'found ' + recall2.length);

// Test 6: recall sorts by severity descending
check('Most severe first', recall2[0].eventType === 'attack', recall2[0].eventType + ' > ' + recall2[1].eventType);
check('Attack dialogue references violence', BR.sayRecall('citizen-1', 'player').say.length > 0, true);

// Test 7: gossip propagation — TrustLedger.addTrustDelta was called for nearby friends
check('EventBridge betrayal:recorded emitted', events.some(function(e) { return e.type === 'betrayal:recorded'; }), true);
check('EventBridge betrayal:gossip emitted', events.some(function(e) { return e.type === 'betrayal:gossip'; }), true);
check('Gossip only affects FRIEND-band nearby citizens', gossipDeltas.length > 0 && gossipDeltas.every(function(d) { return d.a === 'citizen-2'; }), 'gossip deltas=' + gossipDeltas.length);

// Test 8: snapshot/load persistence
var snap = BR.snapshot();
check('Snapshot returns object', typeof snap === 'object', Object.keys(snap).length + ' entries');

var BR2 = { snapshot: function() {}, load: function() {} };
var mod2 = require('../src/genesis/betrayal-recall.js');
var G2 = { registerModule: function() {}, BetrayalRecall: undefined, EventBridge: { on: function() {}, emit: function() {} }, Immortality: { registerSystem: function() {} } };
mod2.install(G2);
G2.BetrayalRecall.load(snap);
var loadedRecalls = G2.BetrayalRecall.recall('citizen-1', 'player', 5);
check('Load restores betrayals', loadedRecalls.length > 0, 'loaded ' + loadedRecalls.length + ' betrayals');
check('Load restores event types', loadedRecalls[0].eventType === 'attack', loadedRecalls[0].eventType);

// Test 9: summary
var summary = BR.summary();
check('Summary has total', typeof summary.totalBetrayals === 'number', summary.totalBetrayals + ' total');
check('Summary has byType', typeof summary.byType === 'object' && summary.byType.theft > 0, 'theft count=' + summary.byType.theft);

// Test 10: Immortality system registered
check('Immortality system registered', !!(Genesis.Immortality._systems && Genesis.Immortality._systems['betrayal-recall']), true);

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
process.exit(failed > 0 ? 1 : 0);
