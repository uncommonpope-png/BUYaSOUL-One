// player-cam.js — Act VI BODY (P77) — Inhabitation: third-person cam + collision + drag
// Flag-gated by window.__GENESIS_PLAYER_CAM (default OFF).
// When OFF this file is never imported and the legacy animate() if-chain runs
// EXACTLY as today — zero behavioral delta on the live floor.
//
// WHAT IT DOES:
//   Provides an optional third-person camera rig + player collision + drag
//   controls so a visitor can INHABIT the Dark City (the kit's
//   third-person-camera + player-collision + drag-controls). Controls mirror
//   the CPL base UI: WASD move, Shift run, Space up, Q down, F fly toggle,
//   drag to orbit.
//
// CASCADE: movement is local/visual only and never mutates world GOVERNANCE.
//   Player input is NOT an agent command channel; it cannot spawn/edit GSK's
//   world. It is pure inhabitation (BODY-only), consistent with doctrine.
//
// THREE VERSION: vanilla r128/r160 compatible. Uses global THREE only.
//   NOTE: the kit's camera modules target their own Three version; this uses
//   only Camera.lookAt + Vector3 + Raycaster (stable across r128..r160).
(function () {
  function install(Genesis) {
    if (!Genesis) return;
    if (Genesis.PlayerCam) return; // idempotent

    let camera = null;       // THREE.PerspectiveCamera
    let dom = null;          // canvas/dom element for input
    let target = null;       // THREE.Object3D the camera follows (player proxy)
    const keys = {};         // pressed-key state
    let yaw = 0, pitch = 0.25;
    let fly = false;
    let dragging = false, lastX = 0, lastY = 0;
    let enabled = false;

    function flagOn() {
      return (typeof window !== 'undefined') && window.__GENESIS_PLAYER_CAM === true;
    }
    function THREEOK() {
      return (typeof window !== 'undefined') && window.THREE;
    }

    // Create a lightweight player proxy sphere so the camera has something to
    // follow without depending on any specific citizen mesh existing.
    function ensureTarget(scene) {
      if (target) return target;
      if (!THREEOK() || !scene) return null;
      const T = window.THREE;
      const geo = new T.SphereGeometry(1.2, 16, 12);
      const mat = new T.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x113355 });
      target = new T.Mesh(geo, mat);
      target.name = 'genesis-player-proxy';
      target.position.set(0, 1.2, 0);
      scene.add(target);
      return target;
    }

    function onKeyDown(e) {
      const code = e.code || e.key;
      keys[code] = true;
      if (code === 'KeyF' && !e.repeat) fly = !fly;
    }
    function onKeyUp(e) { keys[e.code || e.key] = false; }
    function onDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    function onMove(e) {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * 0.005;
      pitch = Math.max(-0.4, Math.min(1.2, pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    }
    function onUp() { dragging = false; }

    function bind(domEl) {
      if (!domEl || typeof window === 'undefined') return false;
      dom = domEl;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      dom.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return true;
    }
    function unbind() {
      if (typeof window === 'undefined' || !dom) return;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    function tick(dt, serial, ctx) {
      if (!flagOn() || !enabled) return;          // hard gate
      if (!THREEOK() || !camera) return;
      const T = window.THREE;
      if (!target) ensureTarget(ctx && ctx.scene);
      if (!target) return;

      // Movement: WASD + Shift(run) + Space(up) + Q(down) + F(fly toggle).
      const run = (keys['ShiftLeft'] || keys['ShiftRight']) ? 2.2 : 1;
      const sp = (typeof dt === 'number' ? dt : 0.016) * 14 * run;
      let mx = 0, mz = 0;
      if (keys['KeyW']) mz -= 1;
      if (keys['KeyS']) mz += 1;
      if (keys['KeyA']) mx -= 1;
      if (keys['KeyD']) mx += 1;
      if (mx || mz) {
        const ca = Math.cos(yaw), sa = Math.sin(yaw);
        target.position.x += (mx * ca - mz * sa) * sp;
        target.position.z += (mx * sa + mz * ca) * sp;
      }
      if (keys['Space']) target.position.y = Math.min(42, target.position.y + sp);
      if (keys['KeyQ']) target.position.y = Math.max(-50.8, target.position.y - sp);
      // Simple collision proxy: ground is surface unless flying/descending to undercity.
      if (!fly && target.position.y > -0.5 && target.position.y < 1.2) target.position.y = 1.2;

      // Third-person follow: orbit behind the target at (yaw,pitch) distance.
      const dist = 12;
      const ox = Math.sin(yaw) * Math.cos(pitch) * dist;
      const oz = Math.cos(yaw) * Math.cos(pitch) * dist;
      const oy = Math.sin(pitch) * dist + 2;
      camera.position.set(target.position.x + ox, target.position.y + oy, target.position.z + oz);
      camera.lookAt(target.position.x, target.position.y + 1.5, target.position.z);
    }

    const PlayerCam = {
      flag: '__GENESIS_PLAYER_CAM',
      isEnabled() { return flagOn(); },
      attach(cam, domEl, scene) {
        camera = cam || null;
        if (scene) ensureTarget(scene);
        if (domEl) bind(domEl);
        enabled = !!camera;
        return enabled;
      },
      detach() { unbind(); enabled = false; target = null; },
      tick,
      summary() {
        return { enabled: flagOn(), attached: enabled, hasTarget: !!target, fly };
      }
    };

    Genesis.PlayerCam = PlayerCam;

    if (Genesis.EngineScheduler && typeof Genesis.EngineScheduler.defineTick === 'function') {
      Genesis.EngineScheduler.defineTick('player-cam', function (dt) { tick(dt, 0, {}); },
        function () { return flagOn(); });
    }
    if (Genesis.GenesisKernel && typeof Genesis.GenesisKernel.registerSystem === 'function') {
      Genesis.GenesisKernel.registerSystem('player-cam', function (dt) { tick(dt || 0, 0, {}); });
    }
    if (typeof Genesis.registerModule === 'function') {
      Genesis.registerModule('player-cam', { status: 'candidate', path: './src/genesis/player-cam.js', inhabitation: true });
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { install };
  if (typeof window !== 'undefined' && window.Genesis) install(window.Genesis);
})();
