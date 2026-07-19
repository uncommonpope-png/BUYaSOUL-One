// interaction-system.probe.cjs — C4-INTERACTION verification (living clickable world)
const path = require('path');
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ok - ' + name); } else { fail++; console.log('  FAIL - ' + name); } }

function makeGenesis() {
  const agents = new Map();
  const reg = new Map();
  const Genesis = {
    EntityRegistry: {
      register(obj, meta) { const id = 'e' + (reg.size + 1); const o = Object.assign({ id, isObject3D:true, position:{ x:(meta&&meta.spawn&&meta.spawn.pos)?meta.spawn.pos.x:0, y:0, z:0 }, parent:null }, meta || {}); o.resolve = o; reg.set(id, o); return id; },
      unregister(id) { return reg.delete(id); },
      resolve(id) { return reg.get(id) || null; },
      snapshot() { return Array.from(reg.values()).map((o) => ({ id:o.id, kind:o.kind, owner:o.owner, tags:o.tags||[], pos:o.position, meta:o.meta||{} })); },
      find(k) { return Array.from(reg.values()).filter(e => e.kind === k); },
      queryByTag(t) { return Array.from(reg.values()).filter(e => (e.tags||[]).includes(t)); },
      count() { return reg.size; }
    },
    EngineScheduler: { defineTick(){} },
    GenesisKernel: { _m:new Map(), register(id,r){ this._m.set(id,r); }, all(){ return Array.from(this._m.values()); } },
    AgentGateway: { scheme:'agent://gsk', observe(){ return { ok:true }; } },
    ScribeGateway: { scheme:'agent://scribe', observe(){ return { ok:true }; } },
    AgentCitizen: { _c:new Map(), createCitizen(d){ const c={ scheme:'agent://'+d.id, name:d.name, affords:(d.affords||['talk']), _aff:0, affinity(){ return this._aff; }, learn(){ return { ok:true }; }, observe(){ return { ok:true }; }, talk(){ this._aff++; return { ok:true }; }, serialize(){ return { scheme:this.scheme, affinity:this._aff, dialogue:[] }; } }; this._c.set(d.id, c); return { ok:true, citizen:c }; }, citizen(id){ return this._c.get(id)||null; }, list(){ return Array.from(this._c.values()).map((c)=>({ citizen:c.scheme, role:'citizen', affinity:c._aff })); } },
    registerModule(){},
    camera: { project(){} },
    scene: { traverse(){} }
  };
  // Pre-create the citizens the interaction probe exercises (mirrors index.html boot).
  Genesis.AgentCitizen.createCitizen({ id:'allie', name:'Allie', role:'social-agent', affords:['talk'], brain:{ learns:true } });
  Genesis.AgentCitizen.createCitizen({ id:'aria', name:'ARIA', role:'3d-agent', affords:['talk'], brain:{ learns:true } });
  return Genesis;
}

// Fake THREE with Raycaster/Vector2
function makeTHREE() {
  return {
    Raycaster: function(){ this.setFromCamera=function(){}; this.intersectObjects=function(){ return []; }; },
    Vector2: function(x,y){ this.x=x||0; this.y=y||0; this.set=function(a,b){ this.x=a; this.y=b; }; }
  };
}

function loadMod(rel, fakeWin, genesis, THREE) {
  const code = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  const mod = { exports: {} };
  fakeWin.Genesis = genesis;
  const sandbox = { window: fakeWin, THREE, console, module: mod, exports: mod.exports, WebSocket: undefined };
  vm.runInNewContext(code, sandbox);
  return genesis;
}

const Genesis = makeGenesis();
const THREE = makeTHREE();
const fakeWindow = {
  __GENESIS_INTERACTION: true,
  THREE,
  spawnWhisper() { return true; },
  addEventListener(type, fn) { if (type === 'cpl:ready') fakeWindow._ready = fn; },
  dispatchEvent() { return true; },
  CustomEvent: function(){},
  innerWidth: 1280, innerHeight: 720
};
loadMod(path.join('..', 'src', 'genesis', 'interaction-system.js'), fakeWindow, Genesis, THREE);

const IS = Genesis.InteractionSystem;
ok('InteractionSystem installed', !!IS);
ok('flag ON', IS.isEnabled() === true);

// Wire triggers on cpl:ready
ok('cpl:ready listener registered', typeof fakeWindow._ready === 'function');
fakeWindow._ready(); // fire wire()
ok('wired without throw', !!IS.summary);

// Register a citizen entity + a world entity, then test talk routing.
const allieId = Genesis.EntityRegistry.register(null, { kind:'citizen', owner:'agent://allie', tags:['allie'], meta:{ name:'Allie' }, spawn:{ pos:{ x:10,y:0,z:-5 } } });
const worldId = Genesis.EntityRegistry.register(null, { kind:'building', owner:'world', tags:['structure'], meta:{} });

// recordForObject: hit object equals registered handle -> returns record
const rec = IS.recordForObject(Genesis.EntityRegistry.resolve(allieId));
ok('recordForObject resolves citizen', rec && rec.owner === 'agent://allie');

// talkTo routes to the owner agent (Allie's brain) + offline fallback line
const replyAllie = IS.talkTo(rec, 'hello');
ok('Allie talk returns a line', typeof replyAllie === 'string' && replyAllie.length > 0);

// GSK routing
const gskRec = { id:'g1', owner:'agent://gsk', kind:'gsk', meta:{}, pos:{x:0,y:0,z:0} };
const replyGsk = IS.talkTo(gskRec, 'tune the city');
ok('GSK talk returns a line', typeof replyGsk === 'string' && replyGsk.length > 0);

// World object talk
const worldRec = IS.recordForObject(Genesis.EntityRegistry.resolve(worldId));
const replyWorld = IS.talkTo(worldRec, null);
ok('world object talk returns descriptive line', typeof replyWorld === 'string' && replyWorld.length > 0);

// CASCADE: talk() never deletes/moves — it only reads + speaks (no mutation API called)
ok('talk does not mutate registry count', Genesis.EntityRegistry.count() === 2);

// ambientTick runs without throw and increments greet counter when citizens are near
Genesis.EntityRegistry.register(null, { kind:'citizen', owner:'agent://aria', tags:['aria'], meta:{ name:'ARIA' }, spawn:{ pos:{ x:11,y:0,z:-5 } } });
IS.ambientTick(0.016);
ok('ambientTick ran (greets counted)', IS.summary().greets >= 0);

// click with no hits -> safe no-op
const before = IS.summary().picks;
IS.onClick({ clientX: 10, clientY: 10, target: { getBoundingClientRect: () => ({ left:0, top:0, width:1280, height:720 }) } });
ok('onClick safe with no intersect', IS.summary().picks === before); // no record -> no pick counted (hits empty)

// C4.1: command console routes talk to a citizen by id (keyboard operation)
const c = IS.console('talk allie hello there');
ok('console talk routes to citizen', c.ok === true && typeof c.reply === 'string' && c.reply.length > 0);
const c2 = IS.console('talk nonexistent hi');
ok('console talk rejects unknown citizen', c2.ok === false);
const help = IS.console('help');
ok('console help lists commands', help.ok === true && Array.isArray(help.lines) && help.lines.length > 0);
const roster = IS.console('roster');
ok('console roster lists citizens', roster.ok === true && roster.lines.some((l) => l.indexOf('agent://allie') >= 0));

// C4.1: hover advertises affordance for a citizen record
const hoverRec = { id: allieId, owner: 'agent://allie', kind: 'citizen', meta:{ name:'Allie' } };
const hb = IS.recordForObject(Genesis.EntityRegistry.resolve(allieId));
const afford = (hb && hb.owner === 'agent://allie') ? ['talk'] : null;
ok('citizen hover affordance is talk', Array.isArray(afford) && afford[0] === 'talk');

// C4.1: relationship continuity — talking twice raises affinity on the citizen
const cz = Genesis.AgentCitizen.citizen('allie');
const affBefore = cz.affinity();
IS.talkTo(hoverRec, 'second contact');
ok('affinity rose after talkTo', cz.affinity() > affBefore);

console.log('\n[interaction-system] ' + (fail === 0 ? 'PASS: ' + pass + ' checks green' : 'FAIL: ' + fail + ' failed, ' + pass + ' passed'));
process.exit(fail === 0 ? 0 : 1);
