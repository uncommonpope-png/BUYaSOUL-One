// resource-pool.js — SOUL-GUN: Central Constraint Gate (MDA mechanics)
// The Elden Ring lesson made spatial: ONE shared energy pool gates an agent's
// world-actions. GSK (and every citizen) decides the AMOUNT; the ENGINE owns the
// pool + spend. This is what turns "can act" into "acts under real scarcity" —
// the Dynamics that make a soul feel alive (not omnipotent).
//
// Offline-safe: if the pool is never registered, spend()/regen() are harmless
// no-ops and commands stay cost-free (backward compatible when the gun is OFF).
(function () {
  function install(Genesis) {
    if (!Genesis) return;
    if (Genesis.ResourcePool) return; // idempotent

    const DEFAULT_MAX = 100;
    const DEFAULT_REGEN = 1; // per regen() call (EngineScheduler tick)
    const pools = new Map(); // owner (agent://id) -> { energy, max, regen }

    function ensure(owner, max, regen) {
      if (typeof owner !== 'string' || !owner) return null;
      if (!pools.has(owner)) {
        pools.set(owner, {
          energy: (typeof max === 'number' && max > 0) ? max : DEFAULT_MAX,
          max: (typeof max === 'number' && max > 0) ? max : DEFAULT_MAX,
          regen: (typeof regen === 'number' && regen >= 0) ? regen : DEFAULT_REGEN
        });
      }
      return pools.get(owner);
    }

    // CASCADE: spend only what exists. Never negative. Rejects (returns false)
    // instead of allowing an over-draw — the agent must pace (the article's law).
    function spend(owner, amount) {
      const p = ensure(owner);
      if (!p) return false;
      const n = (typeof amount === 'number' && amount >= 0) ? amount : 0;
      if (n > p.energy) return false; // insufficient -> rejected, no mutation
      p.energy -= n;
      return true;
    }

    // Passive recovery (stamina regen), driven once per EngineScheduler tick.
    function regen(owner) {
      const p = ensure(owner);
      if (!p) return;
      p.energy = Math.min(p.max, p.energy + p.regen);
    }

    // Regenerate every pool (called once per global tick by the engine).
    function regenAll() {
      for (const p of pools.values()) p.energy = Math.min(p.max, p.energy + p.regen);
    }

    function get(owner) {
      const p = pools.get(owner);
      return p ? { energy: p.energy, max: p.max, regen: p.regen } : null;
    }

    // Surface B (Step 5 immortality): serialize pool state so energy persists
    // across reloads — GSK wakes mid-stamina, not full.
    function snapshot() {
      const out = {};
      for (const [k, p] of pools) out[k] = { energy: p.energy, max: p.max, regen: p.regen };
      return out;
    }
    function load(state) {
      if (!state || typeof state !== 'object') return false;
      for (const k of Object.keys(state)) {
        const s = state[k];
        if (s && typeof s.energy === 'number') pools.set(k, { energy: s.energy, max: s.max || DEFAULT_MAX, regen: (typeof s.regen === 'number') ? s.regen : DEFAULT_REGEN });
      }
      return true;
    }

    const ResourcePool = { ensure, spend, regen, regenAll, get, snapshot, load, _pools: pools };
    if (typeof module !== 'undefined' && module.exports) module.exports = ResourcePool;
    if (typeof window !== 'undefined') window.GenesisResourcePool = ResourcePool;
    Genesis.ResourcePool = ResourcePool;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { install };
  if (typeof window !== 'undefined' && window.Genesis) install(window.Genesis);
})();
