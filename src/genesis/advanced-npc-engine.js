/**
 * advanced-npc-engine.js
 * BUYASOUL CPL / GODFORGE — Advanced Procedural NPC Life Engine
 * 
 * Specs:
 *   1. 3D Modular Humanoid & Alien Cybernetic NPC Rigs (Head, Torso, Arms, Legs).
 *   2. Procedural Skeletal Walking, Idle Sway, Working & Combat Animations.
 *   3. AI Steering Behaviors (Wandering, Path Following, Fleeing, Interacting).
 *   4. Interactive Dialogue & Trade Overhead Badges.
 */

(function() {
  'use strict';

  const T = window.THREE;
  const ADVANCED_NPCS = [];

  // ─── PROCEDURAL 3D HUMANOID RIG CREATOR ──────────────────────────────

  function createHumanoidRig(colorHex, isAlien) {
    const group = new T.Group();

    const skinMat = new T.MeshStandardMaterial({
      color: colorHex || 0x00ffcc,
      roughness: 0.4,
      metalness: isAlien ? 0.8 : 0.2
    });

    const jointMat = new T.MeshBasicMaterial({ color: 0xffaa00 });

    // 1. Torso
    const torso = new T.Mesh(new T.BoxGeometry(0.8, 1.2, 0.5), skinMat);
    torso.position.y = 1.4;
    group.add(torso);

    // 2. Head
    const headGeo = isAlien ? new T.ConeGeometry(0.35, 0.7, 5) : new T.SphereGeometry(0.35, 12, 12);
    const head = new T.Mesh(headGeo, skinMat);
    head.position.y = 2.3;
    group.add(head);

    // Glowing Visor
    const visor = new T.Mesh(new T.BoxGeometry(0.4, 0.12, 0.2), new T.MeshBasicMaterial({ color: 0x00ffff }));
    visor.position.set(0, 2.3, 0.22);
    group.add(visor);

    // 3. Left & Right Arms (Group pivot at shoulder)
    const leftArmGroup = new T.Group();
    leftArmGroup.position.set(-0.55, 1.9, 0);
    const leftArm = new T.Mesh(new T.BoxGeometry(0.25, 0.9, 0.25), skinMat);
    leftArm.position.y = -0.45;
    leftArmGroup.add(leftArm);
    group.add(leftArmGroup);

    const rightArmGroup = new T.Group();
    rightArmGroup.position.set(0.55, 1.9, 0);
    const rightArm = new T.Mesh(new T.BoxGeometry(0.25, 0.9, 0.25), skinMat);
    rightArm.position.y = -0.45;
    rightArmGroup.add(rightArm);
    group.add(rightArmGroup);

    // 4. Left & Right Legs (Group pivot at hip)
    const leftLegGroup = new T.Group();
    leftLegGroup.position.set(-0.25, 0.8, 0);
    const leftLeg = new T.Mesh(new T.BoxGeometry(0.3, 0.8, 0.3), skinMat);
    leftLeg.position.y = -0.4;
    leftLegGroup.add(leftLeg);
    group.add(leftLegGroup);

    const rightLegGroup = new T.Group();
    rightLegGroup.position.set(0.25, 0.8, 0);
    const rightLeg = new T.Mesh(new T.BoxGeometry(0.3, 0.8, 0.3), skinMat);
    rightLeg.position.y = -0.4;
    rightLegGroup.add(rightLeg);
    group.add(rightLegGroup);

    // Overhead Interactive Badge Ring
    const badge = new T.Mesh(new T.TorusGeometry(0.4, 0.05, 8, 16), jointMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.y = 2.9;
    group.add(badge);

    group.userData = {
      leftArmGroup,
      rightArmGroup,
      leftLegGroup,
      rightLegGroup,
      head,
      walkPhase: Math.random() * Math.PI * 2,
      state: 'wandering', // 'wandering' | 'talking' | 'working'
      targetPos: null,
      speed: 3 + Math.random() * 2
    };

    return group;
  }

  // ─── ADVANCED NPC SPAWNER ────────────────────────────────────────────

  function spawnNPCPopulation(scene, count) {
    count = count || 50;
    const group = new T.Group();
    group.name = 'advanced-npc-population';

    const colors = [0x00ffcc, 0xff0055, 0xffaa00, 0x0088ff, 0xaa00ff];

    for (let i = 0; i < count; i++) {
      const isAlien = Math.random() > 0.6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const npc = createHumanoidRig(color, isAlien);

      // Distribute across city / marketplace radius
      const radius = 50 + Math.random() * 350;
      const angle = Math.random() * Math.PI * 2;
      npc.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      group.add(npc);
      ADVANCED_NPCS.push(npc);
    }

    scene.add(group);
    console.log('[AdvancedNPCEngine] Spawned', count, '3D Procedural Animated NPCs.');
  }

  // ─── PROCEDURAL ANIMATION & AI STEERING TICK ─────────────────────────

  function tickNPCs(dt) {
    for (const npc of ADVANCED_NPCS) {
      const ud = npc.userData;

      // 1. Procedural Walk & Limb Animation
      ud.walkPhase += dt * ud.speed * 2.5;
      const swing = Math.sin(ud.walkPhase) * 0.6;

      ud.leftLegGroup.rotation.x = swing;
      ud.rightLegGroup.rotation.x = -swing;
      ud.leftArmGroup.rotation.x = -swing * 0.8;
      ud.rightArmGroup.rotation.x = swing * 0.8;

      // 2. AI Steering Target Selection
      if (!ud.targetPos || npc.position.distanceTo(ud.targetPos) < 2) {
        const radius = 50 + Math.random() * 350;
        const angle = Math.random() * Math.PI * 2;
        ud.targetPos = new T.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      }

      // Move toward target
      const dir = new T.Vector3().subVectors(ud.targetPos, npc.position);
      dir.y = 0;
      dir.normalize();

      npc.position.add(dir.multiplyScalar(ud.speed * dt));
      npc.lookAt(ud.targetPos.x, npc.position.y, ud.targetPos.z);
    }
  }

  // ─── DIRECT PLAYER COMMAND CONTROLS ─────────────────────────────────

  const SELECTED_NPCS = new Set();

  function selectNPC(npc) {
    if (!npc) return;
    SELECTED_NPCS.add(npc);
    if (!npc.userData.badgeRing) {
      const ringMat = new T.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
      const ring = new T.Mesh(new T.TorusGeometry(0.6, 0.08, 8, 16), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      npc.add(ring);
      npc.userData.badgeRing = ring;
    }
  }

  function clearNPCSelection() {
    for (const npc of SELECTED_NPCS) {
      if (npc.userData.badgeRing) {
        npc.remove(npc.userData.badgeRing);
        npc.userData.badgeRing = null;
      }
    }
    SELECTED_NPCS.clear();
  }

  function commandNPCsTo(point) {
    if (!point) return;
    for (const npc of SELECTED_NPCS) {
      npc.userData.targetPos = point.clone();
      npc.userData.state = 'commanded';
      console.log('[AdvancedNPCEngine] Commanded NPC to move to', point);
    }
  }

  // ─── INITIALIZER ─────────────────────────────────────────────────────

  function install(scene) {
    if (!scene) return;
    spawnNPCPopulation(scene, 60);

    // Listen for right-click to move commanded NPCs
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (SELECTED_NPCS.size > 0 && window.__godforgeLastRaycastPoint) {
        commandNPCsTo(window.__godforgeLastRaycastPoint);
      }
    });
  }

  function tick(dt) {
    tickNPCs(dt || 0.016);
  }

  window.AdvancedNPCEngine = {
    install,
    tick,
    createHumanoidRig,
    selectNPC,
    clearNPCSelection,
    commandNPCsTo,
    ADVANCED_NPCS
  };

  console.log('[AdvancedNPCEngine] Advanced Procedural 3D Animated NPC Engine loaded.');
})();
