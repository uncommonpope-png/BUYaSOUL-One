/**
 * rts-order-executor.js
 * BUYASOUL CPL / GODFORGE — Order Executor (RTS-3)
 *
 * Consumes the per-unit command queue (unit.orders[]) written by the
 * OrderGenerator / bridge. Writes INTENT into engine-core fields
 * (targetPos / targetId / state), lets engine-core drive movement,
 * combat and harvesting, then watches for COMPLETION and advances
 * the queue. imperios `_pasoCola()` pattern.
 *
 * Contract with engine-core (rts-engine-core.js):
 *   - state 'moving'  + targetPos  → A* waypoint movement
 *   - targetId → resource → harvest/return/deposit loop
 *   - targetId → enemy   → chase + attack
 *   - state 'idle' + no target + !_noAggro → auto-aggro
 *
 * Order types: move, attack, harvest, repair, hold, patrol.
 * Queue semantics: head order is active; shift() on completion.
 */

(function() {
  'use strict';

  const ARRIVE_DIST = 1.5;     // move order completion radius
  const REPAIR_RANGE = 2.5;    // repair engagement range
  const REPAIR_RATE = 20;      // hp per second
  const DEPOSIT_REGRAB = true; // harvester re-grabs node after deposit (AoE loop)

  class RTSOrderExecutor {
    constructor(ctx) {
      this.ctx = ctx;
      this.entities = (ctx && ctx.entities) || window.RTSEngineCore?.ENTITIES || new Map();
    }

    tick(dt) {
      if (dt <= 0) return;
      for (const ent of this.entities.values()) {
        if (ent.type !== 'unit' || ent.isDead || !ent.orders || ent.orders.length === 0) continue;
        // Process until head order is in-progress (not immediately completed),
        // so a finished order advances the queue the same frame.
        let guard = 0;
        while (ent.orders.length > 0 && guard++ < 8) {
          const before = ent.orders.length;
          this._processHead(ent, dt);
          if (ent.orders.length === before) break; // head in progress
        }
      }
    }

    _processHead(ent, dt) {
      const order = ent.orders[0];
      switch (order.type) {
        case 'move':    this._move(ent, order); break;
        case 'attack':  this._attack(ent, order); break;
        case 'harvest': this._harvest(ent, order); break;
        case 'repair':  this._repair(ent, order, dt); break;
        case 'hold':    this._hold(ent, order); break;
        case 'patrol':  this._patrol(ent, order); break;
        default: this._done(ent);
      }
    }

    /** Pop head order, resume normal (auto-aggro allowed) idle. */
    _done(ent) {
      ent.orders.shift();
      ent._noAggro = false;
      ent.state = 'idle';
      ent.targetId = null;
      ent.targetPos = null;
    }

    /** Move to destination, pop on arrival. */
    _move(ent, order) {
      if (!order._started) {
        order._started = true;
        ent.state = 'moving';
        ent.targetPos = order.destination.clone();
        ent._navTarget = null; // force fresh A* path
      }
      const d = ent.mesh.position.distanceTo(order.destination);
      if (d <= ARRIVE_DIST) this._done(ent);
    }

    /** Chase + attack target. Pop when dead or gone. */
    _attack(ent, order) {
      const target = this.entities.get(order.targetId);
      if (!target || target.isDead) { this._done(ent); return; }
      ent.targetId = order.targetId; // engine-core drives chase + damage
      ent._noAggro = true;           // don't let auto-aggro override
    }

    /** Mine node, return to town hall, deposit, re-grab (loop). */
    _harvest(ent, order) {
      const node = this.entities.get(order.targetId);
      if (!node || node.isDead) { this._done(ent); return; }
      // Engine-core handles gather → return → deposit. After deposit it goes
      // idle with targetId=null — re-grab the node to continue mining.
      if (!ent.targetId) {
        ent.targetId = order.targetId;
        if (ent.state !== 'returning') ent.state = 'moving';
      }
      ent._noAggro = true;
    }

    /** Walk to damaged friendly building, repair until full. */
    _repair(ent, order, dt) {
      const b = this.entities.get(order.targetId);
      if (!b || b.isDead || b.hp >= b.maxHp) { this._done(ent); return; }
      ent._noAggro = true;
      const d = ent.mesh.position.distanceTo(b.mesh.position);
      if (d <= REPAIR_RANGE) {
        ent.state = 'repairing';
        ent.targetId = null;
        ent.targetPos = null;
        b.hp = Math.min(b.maxHp, b.hp + REPAIR_RATE * dt);
        if (b.hp >= b.maxHp) this._done(ent);
      } else {
        ent.state = 'moving';
        ent.targetPos = b.mesh.position.clone();
        ent._navTarget = null;
      }
    }

    /** Stand ground: suppress auto-aggro, clear targets. */
    _hold(ent, order) {
      ent._noAggro = true;
      ent.targetId = null;
      ent.targetPos = null;
      ent.state = 'idle';
    }

    /** Two-point patrol between order origin and patrolStart. */
    _patrol(ent, order) {
      if (order._origin === undefined) {
        order._origin = ent.mesh.position.clone();
        order._goingBack = false;
      }
      ent._noAggro = true;
      // Flip FIRST, then target the new direction's point (so arrival turns
      // around immediately instead of this frame still heading to old target).
      const d = ent.mesh.position.distanceTo(order._goingBack ? order._origin : order.patrolStart);
      if (d <= ARRIVE_DIST) order._goingBack = !order._goingBack;
      const target = order._goingBack ? order._origin : order.patrolStart;
      ent.state = 'moving';
      ent.targetPos = target.clone();
    }
  }

  // Small non-breaking engine-core guard: honor _noAggro on hold/patrol/etc.
  // Applied lazily so rts-engine-core.js stays untouched.
  function installNoAggroGuard() {
    const core = window.RTSEngineCore;
    if (!core || core._noAggroGuardInstalled) return;
    core._noAggroGuardInstalled = true;
    // engine-core reads this flag in its auto-aggro condition — we can't patch
    // the file, so the executor re-clears targets every tick for hold/patrol
    // units instead (already done in _hold/_patrol via _noAggro semantics).
  }

  window.RTSOrderExecutor = RTSOrderExecutor;
  window.__RTS_ORDER_ARRIVE = ARRIVE_DIST;
})();