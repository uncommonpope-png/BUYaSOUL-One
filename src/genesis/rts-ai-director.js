/**
 * rts-ai-director.js
 * BUYASOUL CPL / GODFORGE — RTS Enemy AI Director
 * 
 * Centralized brain for enemy factions:
 * 1. Macro: Passively generates resources and spawns new units at Home Bases.
 * 2. Squad Tactics: Groups idle units into Strike Teams.
 * 3. Combat: Sends Strike Teams to attack the player's base.
 */

(function() {
  'use strict';

  const T = window.THREE;
  let SCENE_REF = null;

  // Faction Definitions
  const FACTIONS = {
    bioHive: {
      homeBase: new T.Vector3(1200, 0, -500), // Bioluminescent Hive
      resources: 0,
      spawnCost: 100,
      squadSizeThreshold: 5,
      idleUnits: new Set(),
      squads: []
    },
    imperium: {
      homeBase: new T.Vector3(-800, 0, -600), // Iron Foundry
      resources: 0,
      spawnCost: 150,
      squadSizeThreshold: 4,
      idleUnits: new Set(),
      squads: []
    }
  };

  const PLAYER_FACTION = 'voidCovenant';
  const PLAYER_HOME = new T.Vector3(900, 0, 300); // Shattered Front

  function spawnAIUnit(factionId) {
    if (!SCENE_REF || !window.AdvancedNPCEngine || !window.RTSEngineCore) return;
    
    const factionData = FACTIONS[factionId];
    const isAlien = (factionId === 'bioHive');
    const color = isAlien ? 0xaa00ff : 0xff0055;
    
    // Create unit mesh using existing AdvancedNPCEngine rig
    const mesh = window.AdvancedNPCEngine.createHumanoidRig(color, isAlien);
    
    // Spawn around home base
    const spawnRadius = 30 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    mesh.position.set(
      factionData.homeBase.x + Math.cos(angle) * spawnRadius,
      0,
      factionData.homeBase.z + Math.sin(angle) * spawnRadius
    );
    
    SCENE_REF.add(mesh);
    
    // Register to core
    const hp = isAlien ? 80 : 120;
    const ent = window.RTSEngineCore.registerEntity(mesh, 'unit', factionId, hp, 1.2);
    
    // Add to idle pool
    factionData.idleUnits.add(ent.id);
    
    console.log(`[AIDirector] Spawned ${factionId} unit ${ent.id}`);
  }

  function tickAI(dt) {
    if (!window.RTSEngineCore) return;

    for (const factionId of Object.keys(FACTIONS)) {
      const faction = FACTIONS[factionId];
      
      // 1. Passive Income & Spawning
      faction.resources += 20 * dt; // 20 resources per second
      if (faction.resources >= faction.spawnCost) {
        faction.resources -= faction.spawnCost;
        spawnAIUnit(factionId);
      }

      // Clean up dead units from idle pool
      for (const entId of faction.idleUnits) {
        const ent = window.RTSEngineCore.getEntity(entId);
        if (!ent || ent.isDead) {
          faction.idleUnits.delete(entId);
        }
      }

      // 2. Form Squads
      if (faction.idleUnits.size >= faction.squadSizeThreshold) {
        const squad = Array.from(faction.idleUnits);
        faction.squads.push(squad);
        faction.idleUnits.clear();
        
        console.log(`[AIDirector] ${factionId} formed a Strike Squad of ${squad.length} units!`);
        
        // 3. Issue Attack Orders
        // Target is the player's home base
        for (const entId of squad) {
          const ent = window.RTSEngineCore.getEntity(entId);
          if (ent && !ent.isDead) {
            // Jitter the target slightly so they don't all stack
            const jitterX = (Math.random() - 0.5) * 40;
            const jitterZ = (Math.random() - 0.5) * 40;
            ent.targetPos = new T.Vector3(PLAYER_HOME.x + jitterX, 0, PLAYER_HOME.z + jitterZ);
            ent.state = 'moving';
            ent.targetId = null;
          }
        }
      }
      
      // Cleanup dead squads
      faction.squads = faction.squads.filter(squad => {
        let aliveCount = 0;
        for (const entId of squad) {
          const ent = window.RTSEngineCore.getEntity(entId);
          if (ent && !ent.isDead) aliveCount++;
        }
        return aliveCount > 0; // Keep squad if at least 1 member is alive
      });
    }
  }

  function install(scene) {
    if (!scene) return;
    SCENE_REF = scene;
    console.log('[AIDirector] Enemy AI Director initialized.');
  }

  window.RTSAIDirector = {
    install,
    tick: tickAI
  };
})();
