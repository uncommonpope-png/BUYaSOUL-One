/**
 * rts-production-system.js
 * BUYASOUL CPL / GODFORGE — Unit Training & Production Panel
 *
 * Implements:
 *   1. Elegant glassmorphism floating bottom-center production overlay.
 *   2. Training queue logic for selected player-built buildings (Barracks).
 *   3. Spawning trained units at the building's rally point under voidCovenant.
 */

(function() {
  'use strict';

  let SCENE = null;
  let panelEl = null;
  let selectedBuildingId = null;

  // Training queues per building: buildingId -> { queue: [], activeProgress: 0, activeTime: 0 }
  const QUEUES = new Map();

  const UNIT_TEMPLATES = {
    scout: {
      name: 'Scout Drone',
      cost: 100,
      time: 3, // seconds
      color: 0x00ffcc,
      hp: 80,
      desc: 'Fast light scout unit'
    },
    marine: {
      name: 'Void Raider',
      cost: 150,
      time: 5,
      color: 0xaa00ff,
      hp: 120,
      desc: 'Medium assault combat unit'
    }
  };

  function createProductionPanel() {
    if (panelEl) return;
    panelEl = document.createElement('div');
    panelEl.id = 'rts-production-panel';
    Object.assign(panelEl.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%) translateY(120%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '420px',
      background: 'var(--gf-bg-glass)',
      border: '1px solid var(--gf-border-cyan)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 204, 0.15)',
      borderRadius: '16px',
      padding: '16px',
      zIndex: '120',
      fontFamily: 'var(--gf-font-main)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      color: '#ffffff',
      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      pointerEvents: 'auto'
    });
    document.body.appendChild(panelEl);
  }

  function showPanel(buildingId) {
    selectedBuildingId = buildingId;
    updatePanelUI();
    if (panelEl) {
      panelEl.style.transform = 'translateX(-50%) translateY(0%)';
    }
  }

  function hidePanel() {
    selectedBuildingId = null;
    if (panelEl) {
      panelEl.style.transform = 'translateX(-50%) translateY(120%)';
    }
  }

  function updatePanelUI() {
    if (!panelEl || !selectedBuildingId) return;

    const ent = window.RTSEngineCore ? window.RTSEngineCore.getEntity(selectedBuildingId) : null;
    if (!ent) { hidePanel(); return; }

    const isBarracks = ent.mesh && ent.mesh.userData && ent.isPlayerBuilt; // player-built barracks
    if (!isBarracks) { hidePanel(); return; }

    let qData = QUEUES.get(selectedBuildingId);
    if (!qData) {
      qData = { queue: [], activeProgress: 0, activeTime: 0 };
      QUEUES.set(selectedBuildingId, qData);
    }

    const queueHtml = qData.queue.map(u => `<span style="background:rgba(0,255,204,0.15); border: 1px solid rgba(0,255,204,0.4); padding: 2px 6px; border-radius: 4px; font-size:11px;">${UNIT_TEMPLATES[u].name}</span>`).join(' ');

    let activeHTML = '';
    if (qData.queue.length > 0) {
      const activeUnit = UNIT_TEMPLATES[qData.queue[0]];
      const pct = (qData.activeProgress / activeUnit.time) * 100;
      activeHTML = `
        <div style="margin-top: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#aaa;">
            <span>Training: ${activeUnit.name}</span>
            <span>${Math.round(pct)}%</span>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:#00ffcc; box-shadow:0 0 8px #00ffcc; transition: width 0.1s linear;"></div>
          </div>
        </div>
      `;
    }

    panelEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <span style="font-weight: 700; color: #00ffcc; letter-spacing: 0.5px;">⚔️ BARRACKS PRODUCTION</span>
        <button id="rts-prod-close" style="background:none; border:none; color:#ff3355; cursor:pointer; font-size:16px; font-weight:700;">×</button>
      </div>
      <div style="font-size:12px; color:#aaa; margin: 4px 0;">Train units to defend the Grand Tower.</div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
        ${Object.entries(UNIT_TEMPLATES).map(([id, def]) => `
          <button class="prod-btn" data-unit="${id}" style="background:rgba(255,255,255,0.04); border:1px solid rgba(0,255,204,0.3); color:#fff; border-radius:10px; padding:8px; cursor:pointer; text-align:left; transition:all 0.2s;">
            <div style="font-weight:600; font-size:13px; color:#00ffcc;">${def.name}</div>
            <div style="font-size:10px; color:#888; margin: 2px 0;">${def.desc}</div>
            <div style="font-size:11px; color:#ffd700; font-weight:700; margin-top:4px;">💰 ${def.cost} PLT</div>
          </button>
        `).join('')}
      </div>

      ${activeHTML}
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; align-items:center;">
        <span style="font-size:11px; color:#888;">Queue:</span>
        ${queueHtml || '<span style="font-size:11px; color:#666;">Empty</span>'}
      </div>
    `;

    // Add event listeners
    document.getElementById('rts-prod-close').onclick = hidePanel;
    panelEl.querySelectorAll('.prod-btn').forEach(btn => {
      btn.onclick = () => {
        const unitId = btn.dataset.unit;
        enqueueUnit(unitId);
      };
    });
  }

  function enqueueUnit(unitId) {
    const def = UNIT_TEMPLATES[unitId];
    if (!def) return;

    if (window.RTSEconomySystem && window.RTSEconomySystem.spendResource) {
      if (!window.RTSEconomySystem.spendResource('profit', def.cost)) {
        console.warn('[RTS Production] Not enough resources!');
        return;
      }
    }

    const qData = QUEUES.get(selectedBuildingId);
    if (qData) {
      qData.queue.push(unitId);
      updatePanelUI();
    }
  }

  function spawnTrainedUnit(buildingId, unitId) {
    if (!SCENE || !window.AdvancedNPCEngine || !window.RTSEngineCore) return;

    const building = window.RTSEngineCore.getEntity(buildingId);
    if (!building || !building.mesh) return;

    const def = UNIT_TEMPLATES[unitId];
    const mesh = window.AdvancedNPCEngine.createHumanoidRig(def.color, false);
    
    // Spawn offset slightly from the building footprint
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = building.radius + 6;
    mesh.position.set(
      building.mesh.position.x + Math.cos(spawnAngle) * spawnDist,
      0,
      building.mesh.position.z + Math.sin(spawnAngle) * spawnDist
    );

    SCENE.add(mesh);

    // Register unit with player faction voidCovenant
    const ent = window.RTSEngineCore.registerEntity(mesh, 'unit', 'voidCovenant', def.hp, 1.2);
    ent.speed = 4.5;
    
    // Set default waypoint to step away from building
    const T = window.THREE;
    if (T) {
      ent.targetPos = new T.Vector3(
        mesh.position.x + Math.cos(spawnAngle) * 5,
        0,
        mesh.position.z + Math.sin(spawnAngle) * 5
      );
    }
    ent.state = 'moving';
    
    window.dispatchEvent(new CustomEvent('rts:unit-spawned', { detail: { unitId } }));

    console.log(`[RTS Production] Trained and spawned ${def.name} for player.`);
  }

  function tick(dt) {
    // Process training queues
    for (const [buildingId, qData] of QUEUES.entries()) {
      const bEnt = window.RTSEngineCore ? window.RTSEngineCore.getEntity(buildingId) : null;
      if (!bEnt || bEnt.isDead) {
        QUEUES.delete(buildingId);
        if (selectedBuildingId === buildingId) hidePanel();
        continue;
      }

      if (qData.queue.length > 0) {
        const activeUnitId = qData.queue[0];
        const activeUnit = UNIT_TEMPLATES[activeUnitId];
        
        qData.activeProgress += dt;
        if (selectedBuildingId === buildingId) {
          updatePanelUI();
        }

        if (qData.activeProgress >= activeUnit.time) {
          qData.queue.shift();
          qData.activeProgress = 0;
          spawnTrainedUnit(buildingId, activeUnitId);
          if (selectedBuildingId === buildingId) {
            updatePanelUI();
          }
        }
      }
    }
  }

  function install(scene) {
    SCENE = scene;
    createProductionPanel();

    // Hook selection updates to toggle production menu
    window.addEventListener('rts:building-selected', (e) => {
      if (e.detail && e.detail.buildingId) {
        showPanel(e.detail.buildingId);
      } else {
        hidePanel();
      }
    });

    console.log('[RTS Production System] Ready.');
  }

  window.RTSProductionSystem = {
    install,
    tick,
    showPanel,
    hidePanel
  };

})();
