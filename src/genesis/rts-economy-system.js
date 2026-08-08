/**
 * rts-economy-system.js
 * BUYASOUL CPL / GODFORGE — RTS Economy & Resource Nodes
 *
 * Provides:
 *   1. PLT Crystal node generation.
 *   2. Global Resource State (Profit, Love, Tax, Aether).
 *   3. Live event hooks: love rises on builds, tax rises on units spawned.
 */

(function() {
  'use strict';

  // Global Economy State
  const RESOURCES = {
    profit: 500,
    love: 100,
    tax: 0,
    aether: 50
  };

  function addResource(type, amount) {
    if (RESOURCES[type] !== undefined) {
      RESOURCES[type] += amount;

      // Update legacy #plt-value if present
      const pltTicker = document.getElementById('plt-value');
      if (pltTicker && type === 'profit') {
        pltTicker.innerText = Math.floor(RESOURCES.profit).toString();
      }
    }
  }

  function spendResource(type, amount) {
    if (RESOURCES[type] >= amount) {
      RESOURCES[type] -= amount;
      return true;
    }
    return false;
  }

  // --- RESOURCE NODE GENERATOR ---

  const NODE_MESHES = [];

  function spawnCrystalNodes(scene, count) {
    const T = window.THREE;
    if (!T) return;
    count = count || 20;
    const group = new T.Group();
    group.name = 'rts-resource-nodes';

    const crystalGeo = new T.ConeGeometry(1.5, 4, 6);
    const crystalMat = new T.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x004433,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    });

    for (let i = 0; i < count; i++) {
      const cluster = new T.Group();

      // Spawn 3-5 crystals in a cluster
      const numCrystals = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numCrystals; j++) {
        const mesh = new T.Mesh(crystalGeo, crystalMat);
        mesh.position.set(
          (Math.random() - 0.5) * 3,
          2 + (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 3
        );
        mesh.rotation.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * 0.5
        );
        cluster.add(mesh);
      }

      // Distribute randomly across playable area (excluding deep void)
      const radius = 100 + Math.random() * 800;
      const angle = Math.random() * Math.PI * 2;
      cluster.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      group.add(cluster);
      NODE_MESHES.push(cluster);

      // Register as a resource in RTSEngineCore with 1000 capacity
      if (window.RTSEngineCore) {
        const ent = window.RTSEngineCore.registerEntity(cluster, 'resource', 'neutral', 1000, 3.0);
        ent.resourceType = 'profit';
        ent.resourceAmount = 1000;
      }
    }

    scene.add(group);
    console.log('[RTSEconomy] Spawned', count, 'Crystal Nodes.');
  }

  function tick(dt) {
    // Pulse animation + scale crystals based on remaining resource
    const t = performance.now() * 0.002;
    for (const cluster of NODE_MESHES) {
      if (cluster.parent) {
        cluster.position.y = Math.sin(t + cluster.position.x) * 0.5;
        if (window.RTSEngineCore && cluster.userData.entityId) {
          const ent = window.RTSEngineCore.getEntity(cluster.userData.entityId);
          if (ent) {
            const scale = Math.max(0.1, ent.resourceAmount / 1000);
            cluster.scale.setScalar(scale);
          }
        }
      }
    }
  }

  function install(scene) {
    if (!scene) return;
    spawnCrystalNodes(scene, 30);

    // Love rises when player builds — construction creates community
    window.addEventListener('rts:build', function(e) {
      const buildDefs = { barracks: 20, turret: 5, wall: 8, refinery: 15 };
      const gain = (e.detail && buildDefs[e.detail.defId]) || 10;
      addResource('love', gain);
    });

    // Tax rises per unit deployed — a larger army incurs upkeep
    window.addEventListener('rts:unit-spawned', function() {
      addResource('tax', 5);
    });

    console.log('[RTSEconomy] RTS Economy System Active.');
  }

  window.RTSEconomySystem = {
    install,
    tick,
    RESOURCES,
    addResource,
    spendResource
  };

})();
