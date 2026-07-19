// reaction-rules.js — SOUL-GUN: World Reaction Layer (Consequence / Brazie)
// Brazie's test: a mechanic is real only if it creates CONSEQUENCE. GSK's
// {op:spawn} with no reaction = fluff (VFX only). This gun adds the REACTION
// LAYER: when an agent acts, the world notices, other entities' Dynamics shift,
// and the agent's next observe() reflects it. This is what makes "alive in the
// world" actually pass the litmus test.
//
// Offline-safe: if no rules registered, evaluate() returns [] (no-op). The
// ENGINE decides reactions (rule-driven), never the agent — so the soul cannot
// script the world's response (CASCADE of consequence).
(function () {
  function install(Genesis) {
    if (!Genesis) return;
    if (Genesis.ReactionRules) return; // idempotent

    const rules = []; // { id, when(ctx), effect(ctx) }

    // ctx = { world, actor, entity, Registry }
    // when(ctx) -> bool (does this rule fire for this event?)
    // effect(ctx) -> mutates world + returns describe object (for witness)
    function addRule(id, whenFn, effectFn) {
      if (typeof whenFn !== 'function' || typeof effectFn !== 'function') return false;
      rules.push({ id: typeof id === 'string' ? id : ('rule' + rules.length), when: whenFn, effect: effectFn });
      return true;
    }

    // Evaluate all rules against an actor's just-applied entity. Returns the list
    // of effects that fired (so the engine can apply + witness them).
    // ONLY touches entities the rule itself is allowed to (engine-owned mutation);
    // it must NOT delete/move protected (non-actor) seed entities — same CASCADE
    // boundary as the command gate.
    function evaluate(world, actor, entity) {
      if (!Array.isArray(world)) return [];
      const Registry = (Genesis && Genesis.EntityRegistry) ? Genesis.EntityRegistry : null;
      const fired = [];
      for (const rule of rules) {
        let hit = false;
        try { hit = rule.when({ world, actor, entity, Registry }); } catch (_) { hit = false; }
        if (!hit) continue;
        let desc = null;
        try { desc = rule.effect({ world, actor, entity, Registry }); } catch (_) { desc = null; }
        if (desc) fired.push({ rule: rule.id, desc });
      }
      return fired;
    }

    const ReactionRules = { addRule, evaluate, rules: () => rules.slice(), _rules: rules };
    if (typeof module !== 'undefined' && module.exports) module.exports = ReactionRules;
    if (typeof window !== 'undefined') window.GenesisReactionRules = ReactionRules;
    Genesis.ReactionRules = ReactionRules;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { install };
  if (typeof window !== 'undefined' && window.Genesis) install(window.Genesis);
})();
