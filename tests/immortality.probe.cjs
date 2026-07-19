// immortality.js probe — Step 5 (NEVER DIES): two-surface serialization + integrity + boot reload.
// Surface A = GSK SELF (host-provided). Surface B = WORLD (EntityRegistry snapshot).
// Acceptance = the litmus test's survival gate: 1000 reloads keep integrity; 1 corruption is rejected.
//
// Run: node tests/immortality.probe.cjs
'use strict';
const assert = require('assert');
const path = require('path');
const Imm = require(path.join(__dirname, '..', 'src', 'genesis', 'immortality.js'));

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ok - ' + label); }

console.log('[immortality] Step 5 (NEVER DIES)');

// 1. Snapshot + validate + load roundtrip (both surfaces intact).
check('snapshot+validate+load roundtrip (Surface A self + Surface B world)', () => {
  const self = { bedrock:{ id:'ik_1' }, distilled:['a'], transcripts:['t1'], narrative:'I am GSK' };
  const world = [{ id:'ent_1', kind:'angel', owner:'agent://gsk' }];
  const save = Imm.snapshot({ self, world });
  assert.strictEqual(Imm.validate(save).ok, true, 'fresh save valid');
  const r = Imm.load(save);
  assert.strictEqual(r.ok, true, 'load ok');
  assert.strictEqual(r.state.world.length, 1, 'world restored');
  assert.strictEqual(r.state.self.bedrock.id, 'ik_1', 'self restored');
});

// 2. Corruption rejected, falls back to last-known-good.
check('corruption rejected, falls back to last-good', () => {
  const good = Imm.snapshot({ self:{ bedrock:{ id:'ik_1' } }, world:[] });
  const tampered = Imm.snapshot({ self:{ bedrock:{ id:'ik_1' } }, world:[] });
  tampered.world = [{ id:'hacker' }]; // mutate payload, leave stale checksum
  const r = Imm.load(tampered, good);
  assert.strictEqual(r.ok, true, 'load should succeed via fallback');
  assert.strictEqual(r.fromLastGood, true, 'must report last-good fallback');
  assert.strictEqual(r.state.world.length, 0, 'last-good world used');
});

// 3. 1000 reloads keep integrity (the litmus test's survival gate).
check('1000 reloads keep integrity', () => {
  let lastGood = Imm.snapshot({ self:{ bedrock:{ id:'ik_1' } }, world:[] });
  for (let i = 0; i < 1000; i++) {
    const save = Imm.snapshot({ self:{ bedrock:{ id:'ik_1' }, distilled:['n'+i] }, world:[{ id:'e'+i, kind:'angel', owner:'agent://gsk' }] });
    const v = Imm.validate(save);
    assert.strictEqual(v.ok, true, 'save ' + i + ' invalid');
    const r = Imm.load(save, lastGood);
    assert.strictEqual(r.ok, true, 'load ' + i + ' failed');
    lastGood = save;
  }
});

console.log('[immortality] PASS: ' + passed + ' checks green');
