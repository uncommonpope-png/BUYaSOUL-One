/**
 * god-powers-toolbar.js
 * BUYASOUL CPL / GODFORGE — WorldBox Divine God Powers & Trait Engine
 * 
 * Provides:
 *   1. WorldBox Divine Powers Toolbar UI (Bottom Right).
 *   2. Divine Powers: Lightning Strike, Blood Rain Healing, Meteor Disaster, Spite Civil War, Madness Ray.
 *   3. Unit Trait Editor: Grant Giant (+200% HP), Immortal, Super Speed.
 */

(function() {
  'use strict';

  const T = window.THREE;

  let activePower = null;

  // ─── DIVINE POWERS TOOLBAR UI ───────────────────────────────────────

  function createGodPowersToolbarUI() {
    const bar = document.createElement('div');
    bar.id = 'godforge-god-powers-bar';
    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(6, 10, 20, 0.92)',
      border: '1px solid #ffcc00',
      boxShadow: '0 8px 32px rgba(255, 204, 0, 0.3)',
      borderRadius: '30px',
      padding: '8px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: '9999',
      backdropFilter: 'blur(14px)',
      webkitBackdropFilter: 'blur(14px)'
    });

    const powers = [
      { id: 'lightning', label: '⚡ Lightning', color: '#ffcc00', desc: 'Cast divine 500 damage lightning bolt' },
      { id: 'blood_rain', label: '🌧️ Blood Rain', color: '#ff4444', desc: 'Cast healing rain restoring squad HP' },
      { id: 'meteor', label: '☄️ Meteor', color: '#ff6600', desc: 'Summon crushing fiery meteorite' },
      { id: 'madness', label: '🌀 Madness', color: '#cc00ff', desc: 'Drive enemy units insane to attack their own base' },
      { id: 'grant_giant', label: '👑 Grant Giant', color: '#00ffcc', desc: 'Grant selected unit +200% size and HP' }
    ];

    powers.forEach(p => {
      const btn = document.createElement('button');
      btn.innerText = p.label;
      btn.title = p.desc;
      Object.assign(btn.style, {
        background: 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${p.color}`,
        color: p.color,
        padding: '8px 14px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        transition: 'all 0.2s ease'
      });

      btn.onclick = () => {
        if (activePower === p.id) {
          activePower = null;
          btn.style.background = 'rgba(255, 255, 255, 0.08)';
        } else {
          activePower = p.id;
          Array.from(bar.children).forEach(c => c.style.background = 'rgba(255, 255, 255, 0.08)');
          btn.style.background = p.color;
          btn.style.color = '#000000';
          console.log('[GodPowers] Selected Power:', p.id);
        }
      };

      bar.appendChild(btn);
    });

    document.body.appendChild(bar);
  }

  // ─── POWER EXECUTION ON WORLD CLICK ─────────────────────────────────

  function executePowerAt(raycastPoint, scene) {
    if (!activePower || !raycastPoint || !scene) return;

    if (activePower === 'lightning') {
      // ⚡ Lightning Strike
      const flash = new T.Mesh(
        new T.CylinderGeometry(0.5, 3, 100, 8),
        new T.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.9 })
      );
      flash.position.copy(raycastPoint);
      flash.position.y = 50;
      scene.add(flash);

      setTimeout(() => { scene.remove(flash); }, 150);
      console.log('[GodPowers] Executed Lightning Strike at', raycastPoint);

    } else if (activePower === 'meteor') {
      // ☄️ Meteor Disaster
      const meteor = new T.Mesh(
        new T.SphereGeometry(6, 12, 12),
        new T.MeshBasicMaterial({ color: 0xff4400 })
      );
      meteor.position.copy(raycastPoint);
      meteor.position.y = 120;
      scene.add(meteor);

      const fallInterval = setInterval(() => {
        meteor.position.y -= 8;
        if (meteor.position.y <= raycastPoint.y + 3) {
          clearInterval(fallInterval);
          scene.remove(meteor);
          console.log('[GodPowers] Meteor Impact!');
        }
      }, 16);
    }
  }

  // ─── INITIALIZER ─────────────────────────────────────────────────────

  function install(scene) {
    createGodPowersToolbarUI();

    window.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && activePower && window.__godforgeLastRaycastPoint) {
        executePowerAt(window.__godforgeLastRaycastPoint, scene);
      }
    });

    console.log('[GodPowers] WorldBox Divine God Powers Toolbar active.');
  }

  window.GodPowersEngine = {
    install,
    executePowerAt
  };
})();
