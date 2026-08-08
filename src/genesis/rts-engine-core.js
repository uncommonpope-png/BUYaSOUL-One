/**
 * rts-engine-core.js
 * BUYASOUL CPL / GODFORGE — Core RTS Mechanics Engine
 * 
 * Provides:
 *   1. EntityManager: Tracking all units, buildings, and destructibles.
 *   2. CombatEngine: Health, damage, death events, and basic combat loops.
 *   3. CollisionEngine: Basic 2D (X/Z) spatial awareness and overlap prevention.
 */

(function() {
  'use strict';

  // --- ENTITY SYSTEM ---

  let entityIdCounter = 0;
  const ENTITIES = new Map();
  let SCENE_REF = null;

  class GameEntity {
    constructor(mesh, type, faction, maxHp, radius) {
      this.id = ++entityIdCounter;
      this.mesh = mesh; // THREE.Object3D
      this.type = type; // 'unit' or 'building'
      this.faction = faction; // 'imperium', 'voidCovenant', 'bioHive', 'neutral'
      
      this.maxHp = maxHp;
      this.hp = maxHp;
      this.radius = radius || 1.0;
      
      this.isDead = false;
      
      // Combat stats
      this.attackRange = (type === 'unit') ? 5 : 0;
      this.attackDamage = (type === 'unit') ? 10 : 0;
      this.attackCooldown = 1.0; // Seconds
      this.currentCooldown = 0;
      this.targetId = null;

      // State
      this.state = 'idle'; // 'idle', 'moving', 'attacking', 'harvesting', 'returning'
      this.targetPos = null;
      this.speed = (type === 'unit') ? (3 + Math.random() * 2) : 0;

      // Town Hall (drop-off) flag — Phase 5: harvesters only return here
      this.isTownHall = false;
      
      // Economy
      this.carryAmount = 0;
      this.maxCarry = 15;

      // Attach back-reference
      if (this.mesh) {
        this.mesh.userData.entityId = this.id;
      }
      
      // Asymmetric Factions: Apply Protoss Shields
      if (this.faction === 'voidCovenant' && window.StarCraftAsymmetricEngine) {
        this.shieldData = window.StarCraftAsymmetricEngine.applyProtossShield(this.mesh, this.maxHp);
      }
    }

    takeDamage(amount) {
      if (this.isDead) return;
      
      // Asymmetric Factions: Protoss Shield Intercept
      if (this.shieldData && this.shieldData.shield > 0) {
        if (amount > this.shieldData.shield) {
           amount -= this.shieldData.shield;
           this.shieldData.shield = 0;
           this.shieldData.shieldMesh.material.opacity = 0;
           this.shieldData.rechargeTimer = 0;
        } else {
           this.shieldData.shield -= amount;
           this.shieldData.rechargeTimer = 0; // reset recharge
           this.shieldData.shieldMesh.material.opacity = 0.1 + (this.shieldData.shield / this.shieldData.maxShield) * 0.3;
           return; // All damage absorbed
        }
      }

      this.hp -= amount;
      
      // Visual feedback (flash red)
      if (this.mesh) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive) {
            const original = child.material.emissive.getHex();
            child.material.emissive.setHex(0xff0000);
            setTimeout(() => {
              if (child && child.material) child.material.emissive.setHex(original);
            }, 150);
          }
        });
      }

      if (this.hp <= 0) {
        this.die();
      }
    }

    die() {
      this.isDead = true;
      this.hp = 0;
      console.log(`[RTSEngine] Entity ${this.id} (${this.type}) died.`);
      
      if (this.mesh && this.mesh.parent) {
        // Simple death animation: sink into ground
        const startY = this.mesh.position.y;
        let t = 0;
        const sinkInterval = setInterval(() => {
          t += 0.05;
          if (this.mesh) {
            this.mesh.position.y -= 0.1;
            this.mesh.scale.setScalar(Math.max(0.01, 1 - t));
          }
          if (t >= 1) {
            clearInterval(sinkInterval);
            if (this.mesh && this.mesh.parent) {
               this.mesh.parent.remove(this.mesh);
            }
          }
        }, 16);
      }

      ENTITIES.delete(this.id);
    }
  }

  function registerEntity(mesh, type, faction, maxHp, radius) {
    const ent = new GameEntity(mesh, type, faction, maxHp, radius);
    ENTITIES.set(ent.id, ent);
    return ent;
  }

  function getEntity(id) {
    return ENTITIES.get(id);
  }

  function getEntitiesInRadius(position, radius) {
    const found = [];
    for (const ent of ENTITIES.values()) {
      if (ent.isDead || !ent.mesh) continue;
      const dx = ent.mesh.position.x - position.x;
      const dz = ent.mesh.position.z - position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= radius * radius) {
        found.push(ent);
      }
    }
    return found;
  }

  // --- PROJECTILES ---
  const PROJECTILES = [];

  function spawnProjectile(startPos, targetPos, color = 0x00ffcc) {
    if (!SCENE_REF) return;
    const T = window.THREE;
    if (!T) return;
    
    // Create a laser beam cylinder
    const geo = new T.CylinderGeometry(0.2, 0.2, 4, 4);
    geo.translate(0, 2, 0); // Origin at base
    geo.rotateX(Math.PI / 2); // Point along Z
    
    const mat = new T.MeshBasicMaterial({ color: color });
    const mesh = new T.Mesh(geo, mat);
    
    // Start at attacker's height + a little offset
    mesh.position.copy(startPos);
    mesh.position.y += 2; 
    
    // Point at target
    const targetOffset = targetPos.clone();
    targetOffset.y += 2;
    mesh.lookAt(targetOffset);
    
    SCENE_REF.add(mesh);
    
    PROJECTILES.push({
      mesh: mesh,
      target: targetOffset,
      speed: 80, // fast
      life: 1.0 // safety timeout
    });
  }

  function tickProjectiles(dt) {
    const T = window.THREE;
    if (!T) return;
    for (let i = PROJECTILES.length - 1; i >= 0; i--) {
      const p = PROJECTILES[i];
      p.life -= dt;
      
      const dir = new T.Vector3().subVectors(p.target, p.mesh.position);
      const dist = dir.length();
      
      if (dist < 2 || p.life <= 0) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        PROJECTILES.splice(i, 1);
      } else {
        dir.normalize();
        p.mesh.position.add(dir.multiplyScalar(p.speed * dt));
      }
    }
  }

  // --- COMBAT & MOVEMENT LOOP ---

  function tickEntities(dt) {
    const T = window.THREE;
    if (!T) return;
    // Spatial partitioning would be better, but O(N^2) is fine for small N
    const allEnts = Array.from(ENTITIES.values());

    for (let i = 0; i < allEnts.length; i++) {
      const ent = allEnts[i];
      if (ent.isDead || !ent.mesh) continue;

      // 1. Cooldowns
      if (ent.currentCooldown > 0) {
        ent.currentCooldown -= dt;
      }

      // 1.5. Turret Auto-Defense (Phase 7)
      if (ent.type === 'building') {
        if (ent.isTurret) {
          // Scan for nearest enemy unit in attack range
          let nearestEnemy = null;
          let minDist = ent.attackRange || 20;
          for (let j = 0; j < allEnts.length; j++) {
            const other = allEnts[j];
            if (other.isDead || other.type !== 'unit') continue;
            if (other.faction === ent.faction) continue; // skip friendly
            
            const d = ent.mesh.position.distanceTo(other.mesh.position);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = other;
            }
          }
          if (nearestEnemy) {
            ent.mesh.lookAt(nearestEnemy.mesh.position.x, ent.mesh.position.y, nearestEnemy.mesh.position.z);
            if (ent.currentCooldown <= 0) {
              nearestEnemy.takeDamage(ent.attackDamage || 15);
              ent.currentCooldown = ent.attackCooldown || 1.0;
              spawnProjectile(ent.mesh.position, nearestEnemy.mesh.position, 0x00ffff);
            }
          }
        }
        continue; // Skip unit logic for buildings
      }

      // 2. AUTO-AGGRO: idle units scan for nearby enemies and auto-attack
      if (ent.type === 'unit' && ent.state === 'idle' && !ent.targetId && !ent.targetPos) {
        const aggroRange = ent.aggroRange || 15;
        let nearestEnemy = null;
        let minAggroDist = aggroRange;
        for (let j = 0; j < allEnts.length; j++) {
          const other = allEnts[j];
          if (other.id === ent.id || other.isDead || !other.mesh) continue;
          if (other.faction === ent.faction || other.faction === 'neutral') continue;
          if (other.type !== 'unit' && other.type !== 'building') continue;
          const d = ent.mesh.position.distanceTo(other.mesh.position);
          if (d < minAggroDist) {
            minAggroDist = d;
            nearestEnemy = other;
          }
        }
        if (nearestEnemy) {
          ent.targetId = nearestEnemy.id;
          ent.state = 'moving';
        }
      }

      // 2. State Machine: Attacking or Harvesting
      if (ent.targetId) {
        const target = getEntity(ent.targetId);
        if (!target || target.isDead) {
          ent.targetId = null;
          ent.state = 'idle';
        } else {
          const dist = ent.mesh.position.distanceTo(target.mesh.position);
          
          if (target.type === 'resource') {
             // Harvesting Logic
             if (dist <= ent.attackRange + ent.radius + target.radius + 2) {
                ent.state = 'harvesting';
                if (ent.currentCooldown <= 0) {
                   const amount = Math.min(5, target.resourceAmount);
                   target.resourceAmount -= amount;
                   ent.carryAmount += amount;
                   ent.currentCooldown = ent.attackCooldown; // mining time
                   
                   if (target.resourceAmount <= 0) target.die();
                   
                   if (ent.carryAmount >= ent.maxCarry) {
                      // Full! Return to the nearest TOWN HALL (isTownHall === true)
                      ent.state = 'returning';
                      ent.targetId = null;
                      let nearest = null;
                      let minDist = Infinity;
                      for (const other of ENTITIES.values()) {
                         if (other.type === 'building' && !other.isDead && other.isTownHall && (other.faction === ent.faction || other.faction === 'neutral')) {
                            const d = ent.mesh.position.distanceTo(other.mesh.position);
                            if (d < minDist) { minDist = d; nearest = other; }
                         }
                      }
                      if (nearest) {
                         ent.targetId = nearest.id;
                      }
                   }
                }
             } else {
                ent.state = 'moving';
                ent.targetPos = target.mesh.position.clone();
             }
          } else if (ent.state === 'returning' && target.type === 'building') {
             // Returning resources to base
             if (dist <= 15 + ent.radius + target.radius) { // dropoff range
                if (window.RTSEconomySystem) {
                   window.RTSEconomySystem.addResource('profit', ent.carryAmount);
                }
                ent.carryAmount = 0;
                ent.state = 'idle';
                ent.targetId = null; // Wait for next command or auto-seek? Just idle for now.
             } else {
                ent.state = 'moving';
                ent.targetPos = target.mesh.position.clone();
             }
          } else {
             // Combat Logic
             if (dist <= ent.attackRange + ent.radius + target.radius) {
               ent.state = 'attacking';
               // Attack!
               if (ent.currentCooldown <= 0) {
                 target.takeDamage(ent.attackDamage);
                 ent.currentCooldown = ent.attackCooldown;
                 
                 // Spawn laser projectile
                 const color = (ent.faction === 'imperium') ? 0xff4400 : (ent.faction === 'voidCovenant' ? 0x00ffff : 0x00ff00);
                 spawnProjectile(ent.mesh.position, target.mesh.position, color);
               }
             } else {
               // Move into range
               ent.state = 'moving';
               ent.targetPos = target.mesh.position.clone();
             }
          }
        }
      }

      // 3. Movement — with A* waypoint following (Phase 5)
      if (ent.state === 'moving' && ent.targetPos) {
        const dir = new T.Vector3().subVectors(ent.targetPos, ent.mesh.position);
        dir.y = 0; // Keep on 2D plane
        const distToTarget = dir.length();
        
        // Request A* path on first move toward a new target
        if (window.RTSNavGrid && (!ent._navTarget || ent._navTarget.distanceTo(ent.targetPos) > 2)) {
          ent._navTarget = ent.targetPos.clone();
          ent._navWaypoints = window.RTSNavGrid.findPath(
            ent.mesh.position.x, ent.mesh.position.z,
            ent.targetPos.x, ent.targetPos.z
          );
          ent._navWPIndex = 0;
        }
        
        let moveSpeed = ent.speed;
        // Asymmetric Factions: Zerg Bio-Creep Speed Boost
        if (ent.faction === 'bioHive' && window.StarCraftAsymmetricEngine && window.StarCraftAsymmetricEngine.isOnCreep(ent.mesh.position)) {
           moveSpeed *= 1.3;
        }
        
        if (distToTarget > 0.5) {
          let steerDir = dir.clone().normalize();
          
          // A* waypoint following (Phase 5)
          if (ent._navWaypoints && ent._navWPIndex < ent._navWaypoints.length) {
            const wp = ent._navWaypoints[ent._navWPIndex];
            const wpVec = new T.Vector3(wp.x, ent.mesh.position.y, wp.z);
            const wpDist = ent.mesh.position.distanceTo(wpVec);
            if (wpDist < 2) {
              ent._navWPIndex++;
            }
            if (ent._navWPIndex < ent._navWaypoints.length) {
              const nextWP = ent._navWaypoints[ent._navWPIndex];
              steerDir = new T.Vector3(nextWP.x - ent.mesh.position.x, 0, nextWP.z - ent.mesh.position.z).normalize();
            }
          } else {
            // Fallback: Obstacle Avoidance (Steering)
            let avoidForce = new T.Vector3(0, 0, 0);
            for (let j = 0; j < allEnts.length; j++) {
              const other = allEnts[j];
              if (other.id === ent.id || other.isDead || !other.mesh || other.type !== 'building') continue;
              
              const toOther = new T.Vector3().subVectors(other.mesh.position, ent.mesh.position);
              toOther.y = 0;
              const distToOther = toOther.length();
              
              const detectionRadius = other.radius + 10;
              if (distToOther < detectionRadius) {
                 toOther.normalize();
                 const dot = steerDir.dot(toOther);
                 if (dot > 0) {
                   const right = new T.Vector3(-steerDir.z, 0, steerDir.x);
                   const avoidSign = (toOther.dot(right) > 0) ? -1 : 1;
                   avoidForce.add(right.multiplyScalar(avoidSign * dot * (1.5)));
                 }
              }
            }
            
            steerDir.add(avoidForce).normalize();
          }
          
          ent.mesh.position.add(steerDir.multiplyScalar(moveSpeed * dt));
          ent.mesh.lookAt(ent.mesh.position.x + steerDir.x, ent.mesh.position.y, ent.mesh.position.z + steerDir.z);
        } else {
          ent.state = 'idle';
          ent.targetPos = null;
          ent._navTarget = null;
          ent._navWaypoints = null;
          ent._navWPIndex = 0;
        }
      }

      // 4. Basic Collision (Push apart overlapping units)
      if (ent.type === 'unit') {
        for (let j = 0; j < allEnts.length; j++) {
          if (i === j) continue;
          const other = allEnts[j];
          if (other.isDead || !other.mesh) continue;

          const dx = ent.mesh.position.x - other.mesh.position.x;
          const dz = ent.mesh.position.z - other.mesh.position.z;
          const distSq = dx * dx + dz * dz;
          const minD = ent.radius + other.radius;

          if (distSq > 0 && distSq < minD * minD) {
            const dist = Math.sqrt(distSq);
            const overlap = minD - dist;
            
            // Push ent away (if both are units, push both half. If other is building, push ent full)
            const pushFactor = (other.type === 'building') ? 1.0 : 0.5;
            
            ent.mesh.position.x += (dx / dist) * overlap * pushFactor;
            ent.mesh.position.z += (dz / dist) * overlap * pushFactor;
          }
        }
      }
    }
  }

  // --- INITIALIZER ---

  // --- PASSIVE ECONOMY DRIP ---
  // Gives the player a slow trickle of all resources so HUD numbers visibly change
  let _passiveTimer = 0;
  function tickPassiveIncome(dt) {
    if (!window.RTSEconomySystem) return;
    _passiveTimer += dt;
    if (_passiveTimer >= 5.0) { // Every 5 seconds
      _passiveTimer = 0;
      // Count alive player buildings for income scaling
      let playerBuildings = 0;
      for (const ent of ENTITIES.values()) {
        if (!ent.isDead && ent.type === 'building' && ent.faction === 'voidCovenant') playerBuildings++;
      }
      const base = 3 + playerBuildings * 2;
      window.RTSEconomySystem.addResource('profit', base);
      window.RTSEconomySystem.addResource('aether', 1);
    }
  }

  function install(scene) {
    if (!scene) {
      console.warn('[RTSEngineCore] No scene provided to install()');
      return;
    }
    SCENE_REF = scene;
    console.log('[RTSEngineCore] Installed. Entities ready.');
  }

  function tick(dt) {
    tickEntities(dt || 0.016);
    tickProjectiles(dt || 0.016);
    tickPassiveIncome(dt || 0.016);
  }

  window.RTSEngineCore = {
    install,
    tick,
    registerEntity,
    getEntity,
    getEntitiesInRadius,
    ENTITIES
  };
})();
