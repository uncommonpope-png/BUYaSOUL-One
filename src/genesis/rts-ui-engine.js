/**
 * rts-ui-engine.js
 * BUYASOUL CPL / GODFORGE — RTS UI Engine
 * 
 * Provides:
 *   1. 3D Health bars above all registered entities.
 *   (Drag selection box moved to rts-input-router.js — single input path.)
 */

(function() {
  'use strict';

  const T = window.THREE;
  let SCENE = null;
  let CAMERA = null;

  // --- HEALTH BARS ---
  
  const HEALTH_BAR_GEO = new T.PlaneGeometry(2, 0.3);
  const MAT_BG = new T.MeshBasicMaterial({ color: 0x330000, side: T.DoubleSide, depthTest: false });
  const MAT_FG = new T.MeshBasicMaterial({ color: 0x00ff00, side: T.DoubleSide, depthTest: false });

  function ensureHealthBar(ent) {
    if (!ent.mesh) return;
    if (ent.healthBarGroup) return;

    const group = new T.Group();
    
    const bg = new T.Mesh(HEALTH_BAR_GEO, MAT_BG);
    bg.position.z = -0.01;
    
    const fg = new T.Mesh(HEALTH_BAR_GEO, MAT_FG.clone());
    
    group.add(bg);
    group.add(fg);
    group.position.y = ent.radius + 3; // Above the unit
    
    ent.mesh.add(group);
    ent.healthBarGroup = group;
    ent.healthBarFg = fg;
  }

  function updateHealthBars() {
    if (!window.RTSEngineCore || !CAMERA) return;

    for (const ent of window.RTSEngineCore.ENTITIES.values()) {
      if (ent.isDead) continue;
      if (ent.type === 'resource') continue; // No health bar for crystals
      
      ensureHealthBar(ent);
      
      if (ent.healthBarGroup) {
        // Billboard to camera
        ent.healthBarGroup.quaternion.copy(CAMERA.quaternion);
        
        // Update scale based on HP
        const hpPct = Math.max(0, ent.hp / ent.maxHp);
        ent.healthBarFg.scale.x = hpPct;
        ent.healthBarFg.position.x = -1 * (1 - hpPct); // anchor left
        
        // Color gradient
        if (hpPct > 0.5) ent.healthBarFg.material.color.setHex(0x00ff00);
        else if (hpPct > 0.25) ent.healthBarFg.material.color.setHex(0xffff00);
        else ent.healthBarFg.material.color.setHex(0xff0000);
      }
    }
  }

  // --- (Drag selection moved to rts-input-router.js — this module only does health bars) ---

  function install(scene, camera) {
    SCENE = scene;
    CAMERA = camera;
    console.log('[RTS UI] UI Engine Installed (Health Bars).');
  }

  function tick(dt) {
    updateHealthBars();
  }

  window.RTSUIEngine = {
    install,
    tick
  };

})();
