// AgentGateway — Layer D (M9 precursor) + Step 1 proper (the BODY).
// Hosts GSK as an in-engine agent. GSK = the brain (sovereign core);
// this = the body that receives him. GSK stays the brain; this adds the HOST.
// Flag-gated by window.__GENESIS_AGENT_GATEWAY. When OFF, this file is
// never imported (index.html guarded import) — ZERO delta on the live floor.
// When ON (Step 1: flag flipped ON in index.html): registers agent://gsk,
// opens a WS to window.GSK_WS_ENDPOINT (GSK thought-stream :3002), and
//   IN  — observe(): exposes EntityRegistry world-state so GSK's actions are grounded;
//   OUT — dispatch(): GSK -> agent://gsk -> EngineScheduler tick applies
//         spawn/move/delete entity commands to the world (the body ACTS);
//   panels — ingests thoughts into the existing #gsk-panel (window.__thoughtStream).
// EngineScheduler drives health + reconnect + command-drain. Fully OFFLINE-SAFE:
// no WS global / no endpoint / no panel => degraded buffer, never a throw.
// Does NOT port GSK, does NOT touch production CPL, does NOT push.
(function () {
  function install(Genesis) {
    if (!Genesis) return;
    if (Genesis.AgentGateway) return; // idempotent

    const FLAG = '__GENESIS_AGENT_GATEWAY';
    const AGENT_SCHEME = 'agent://gsk';
    const DEFAULT_WS = 'ws://localhost:3002';
    const BUFFER_CAP = 256;
    const RECONNECT_DELAY = 2000;

    let ws = null;
    let status = 'idle';          // idle | connecting | connected | offline | error
    let endpoint = '';
    let lastError = null;
    let reconnectAt = 0;
    let received = 0;
    let piped = 0;
    const buffer = [];            // offline backlog (capped)
    const agents = new Map();     // agent:// id -> record (always addressable)

    // Step 1 (the body): GSK's OUT channel. He issues commands; the
    // EngineScheduler tick drains + applies them to the world. The body ACTS.
    const commandQueue = [];
    const MAX_QUEUE = 64;
    const lastResults = [];
    let applied = 0;

    function resolveEndpoint() {
      try {
        if (typeof window !== 'undefined' && window.GSK_WS_ENDPOINT) return window.GSK_WS_ENDPOINT;
      } catch (_) {}
      return DEFAULT_WS;
    }

    // Pipe one thought into the existing panel. Robust chain so we never assume
    // the panel's exact API: ingest() -> push() -> addThought() -> DOM event.
    function panelPush(thought) {
      try {
        if (typeof window !== 'undefined' && window.__thoughtStream) {
          const ts = window.__thoughtStream;
          if (typeof ts.ingest === 'function') { ts.ingest(thought); piped++; return true; }
          if (typeof ts.push === 'function') { ts.push(thought); piped++; return true; }
          if (typeof ts.addThought === 'function') { ts.addThought(thought); piped++; return true; }
        }
      } catch (_) {}
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function'
            && typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent('genesis:agent:thought', { detail: thought }));
        }
      } catch (_) {}
      return false;
    }

    // Normalize + buffer + pipe an incoming frame.
    function ingest(raw) {
      let thought = raw;
      if (typeof raw === 'string') {
        try { thought = JSON.parse(raw); } catch (_) { thought = { text: raw }; }
      }
      if (!thought || typeof thought !== 'object') thought = { text: String(raw) };
      if (typeof thought.ts !== 'number') thought.ts = Date.now();
      received++;
      if (buffer.length < BUFFER_CAP) buffer.push(thought);
      panelPush(thought);
      return thought;
    }

    // Offline-safe WS connect. No WebSocket global / no endpoint => offline, no throw.
    function connect() {
      if (typeof WebSocket === 'undefined') { status = 'offline'; return false; }
      endpoint = resolveEndpoint();
      if (!endpoint) { status = 'offline'; return false; }
      try {
        status = 'connecting';
        ws = new WebSocket(endpoint);
        ws.onopen = () => { status = 'connected'; reconnectAt = 0; };
        ws.onmessage = (ev) => {
          try {
            let msg = ev && ev.data;
            if (typeof msg === 'string') { try { msg = JSON.parse(msg); } catch (_) { msg = { text: msg }; } }
            if (msg && typeof msg === 'object' && typeof msg.op === 'string') {
              Gateway.dispatch(msg); // command-shaped -> OUT channel -> engine applies
            } else {
              ingest(ev && ev.data); // thought-shaped -> panel
            }
          } catch (_) {}
        };
        ws.onerror = () => { status = 'error'; lastError = 'ws-error'; };
        ws.onclose = () => {
          status = (status === 'connected') ? 'offline' : status;
          ws = null;
          reconnectAt = Date.now() + RECONNECT_DELAY;
        };
        return true;
      } catch (e) {
        status = 'error';
        lastError = (e && e.message) || 'connect-failed';
        return false;
      }
    }

    function disconnect() {
      try { if (ws) { ws.close(); ws = null; } } catch (_) {}
      status = 'idle';
    }

    // Step 1 OUT channel: apply ONE command to the world via the engine
    // (EntityRegistry + engine systems). Extensible vocabulary:
    //   { op:'spawn', kind, owner, tags, pos }  -> register entity
    //   { op:'move', id, pos }               -> set entity position
    //   { op:'delete', id }                  -> unregister entity
    function applyCommand(cmd) {
      if (!cmd || typeof cmd !== 'object') return { ok:false, error:'bad-command' };
      const Registry = (Genesis && Genesis.EntityRegistry) ? Genesis.EntityRegistry : null;
      if (!Registry) return { ok:false, error:'no-registry' };
      try {
        if (cmd.op === 'spawn') {
          const id = Registry.register(cmd.obj || null, {
            kind: cmd.kind || 'agent-entity',
            owner: cmd.owner || AGENT_SCHEME,
            tags: cmd.tags || ['gsk-controlled'],
            meta: cmd.meta || {}
          });
          if (cmd.pos && Registry.resolve && Registry.resolve(id)) {
            const o = Registry.resolve(id);
            if (o && o.position && cmd.pos) o.position.set(cmd.pos.x||0, cmd.pos.y||0, cmd.pos.z||0);
          }
          return { ok:true, op:'spawn', id };
        }
        if (cmd.op === 'move') {
          const o = Registry.resolve && Registry.resolve(cmd.id);
          if (!o) return { ok:false, error:'no-entity:' + cmd.id };
          if (o.position && cmd.pos) o.position.set(cmd.pos.x||0, cmd.pos.y||0, cmd.pos.z||0);
          return { ok:true, op:'move', id: cmd.id };
        }
        if (cmd.op === 'delete') {
          const ok = (typeof Registry.unregister === 'function') ? Registry.unregister(cmd.id) : false;
          return { ok, op:'delete', id: cmd.id };
        }
        return { ok:false, error:'unknown-op:' + (cmd.op||'?') };
      } catch (e) {
        return { ok:false, error:(e&&e.message)||'apply-failed' };
      }
    }

    // GSK -> agent://gsk -> EngineScheduler applies world change (the OUT channel).
    function dispatch(cmd) {
      if (!cmd) return { ok:false, error:'empty' };
      if (commandQueue.length >= MAX_QUEUE) commandQueue.shift();
      commandQueue.push(cmd);
      return { ok:true, queued: commandQueue.length };
    }

    // Step 1 IN channel: ground GSK's actions by exposing world perception.
    function observe() {
      try {
        const Registry = (Genesis && Genesis.EntityRegistry) ? Genesis.EntityRegistry : null;
        if (!Registry || typeof Registry.snapshot !== 'function') return { ok:false, entities:[] };
        return { ok:true, count: Registry.count(), entities: Registry.snapshot() };
      } catch (e) {
        return { ok:false, error:(e&&e.message)||'observe-failed' };
      }
    }

    // EngineScheduler tick: health + reconnect + DRAIN GSK's command queue
    // (the "body acts" — EngineScheduler applies his world changes).
    function drainTick() {
      if (status === 'offline' || status === 'error') {
        if (reconnectAt && Date.now() >= reconnectAt) { reconnectAt = 0; connect(); }
      }
      let ran = 0, errs = 0;
      while (commandQueue.length) {
        const cmd = commandQueue.shift();
        const r = applyCommand(cmd);
        if (r.ok) { ran++; applied++; } else { errs++; }
        if (lastResults.length >= 32) lastResults.shift();
        lastResults.push(r);
      }
      return { status, received, piped, queued: commandQueue.length, applied: ran, errors: errs };
    }
    // Public alias kept for backward-compat with probe.
    function tick() { return drainTick(); }

    const Gateway = {
      scheme: AGENT_SCHEME,
      get agentId() { return AGENT_SCHEME; },
      isEnabled() {
        try { return (typeof window !== 'undefined' && window[FLAG] === true); }
        catch (_) { return false; }
      },
      connect,
      disconnect,
      ingest,
      dispatch,
      observe,
      worldState() { return observe(); },
      tick,
      // Register agent://gsk on the Kernel so external agents / the multiplayer
      // milestone can address GSK by a stable id.
      registerAgent() {
        const record = {
          status: 'active', registeredAt: Date.now(),
          agent: AGENT_SCHEME, endpoint: resolveEndpoint()
        };
        agents.set(AGENT_SCHEME, record); // local, always addressable
        try {
          if (Genesis.GenesisKernel && typeof Genesis.GenesisKernel.register === 'function') {
            Genesis.GenesisKernel.register(AGENT_SCHEME, record);
          }
        } catch (_) {}
        return AGENT_SCHEME;
      },
      hasAgent(id) { return agents.has(id); },
      agents() { return Array.from(agents.keys()); },
      latest() { return buffer.length ? buffer[buffer.length - 1] : null; },
      buffer() { return buffer.slice(); },
      summary() {
        return {
          enabled: this.isEnabled(),
          agent: AGENT_SCHEME,
          agentCount: agents.size,
          status,
          endpoint,
          received,
          piped,
          buffered: buffer.length,
          queued: commandQueue.length,
          applied,
          worldCount: (Genesis && Genesis.EntityRegistry && typeof Genesis.EntityRegistry.count === 'function') ? Genesis.EntityRegistry.count() : 0,
          offline: (status === 'offline' || status === 'error'),
          lastError
        };
      }
    };

    Genesis.AgentGateway = Gateway;

    // Register the agent + drive per-frame health + command-drain via EngineScheduler.
    try { Gateway.registerAgent(); } catch (_) {}
    try {
      if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
        Genesis.EngineScheduler.defineTick('agent-gateway', drainTick, () => Gateway.isEnabled());
      }
    } catch (_) {}

    // Auto-connect only when enabled + a WS global exists (browser, flag ON).
    if (Gateway.isEnabled() && typeof WebSocket !== 'undefined') connect();

    if (typeof Genesis.registerModule === 'function') {
      Genesis.registerModule('agent-gateway', { status: 'validated', path: './src/genesis/agent-gateway.js' });
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { install };
  if (typeof window !== 'undefined' && window.Genesis) install(window.Genesis);
})();

