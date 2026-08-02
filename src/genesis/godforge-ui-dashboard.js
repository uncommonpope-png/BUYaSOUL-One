/**
 * godforge-ui-dashboard.js
 * BUYASOUL CPL / GODFORGE — Premium Cyberpunk UI Design System & Live Dashboard
 * 
 * Provides:
 *   1. Glassmorphism Design System (CSS tokens, neon glow, Outfit typography)
 *   2. Top Bar PLT Economy Ticker (Profit, Love, Tax live counts)
 *   3. RTS War Room Dashboard Modal (Fleet Status, Resource Extraction, War Alerts)
 *   4. Diegetic UI Floating Badges
 */

(function() {
  'use strict';

  // ─── INJECT GOOGLE FONTS & GLASSMORPHISM STYLES ─────────────────────

  function injectDesignSystem() {
    if (document.getElementById('godforge-ui-styles')) return;

    // Load Google Font 'Outfit'
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.id = 'godforge-ui-styles';
    style.textContent = `
      :root {
        --gf-bg-glass: rgba(6, 10, 20, 0.82);
        --gf-bg-card: rgba(12, 18, 34, 0.90);
        --gf-border-cyan: rgba(0, 255, 204, 0.35);
        --gf-border-gold: rgba(255, 204, 0, 0.35);
        --gf-neon-cyan: #00ffcc;
        --gf-neon-amber: #ffaa00;
        --gf-neon-magenta: #ff0077;
        --gf-neon-gold: #ffd700;
        --gf-font-main: 'Outfit', -apple-system, sans-serif;
        --gf-font-mono: 'JetBrains Mono', monospace;
      }

      /* Top Bar Live Ticker */
      #gf-top-bar {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 20px;
        background: var(--gf-bg-glass);
        border: 1px solid var(--gf-border-cyan);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 255, 204, 0.15);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        padding: 8px 24px;
        border-radius: 40px;
        z-index: 100;
        font-family: var(--gf-font-main);
        pointer-events: auto;
        animation: gfFadeDown 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .gf-stat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .gf-stat-val {
        font-family: var(--gf-font-mono);
        font-weight: 700;
        font-size: 14px;
      }

      .gf-badge-plt {
        background: linear-gradient(135deg, rgba(255, 204, 0, 0.2), rgba(255, 102, 0, 0.2));
        border: 1px solid var(--gf-neon-gold);
        color: var(--gf-neon-gold);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
      }

      /* War Room Trigger Button */
      #gf-warroom-btn {
        background: linear-gradient(135deg, rgba(0, 255, 204, 0.2), rgba(0, 150, 255, 0.2));
        border: 1px solid var(--gf-neon-cyan);
        color: #ffffff;
        padding: 6px 16px;
        border-radius: 20px;
        font-family: var(--gf-font-main);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.25s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      #gf-warroom-btn:hover {
        background: linear-gradient(135deg, rgba(0, 255, 204, 0.4), rgba(0, 150, 255, 0.4));
        box-shadow: 0 0 20px rgba(0, 255, 204, 0.5);
        transform: translateY(-1px);
      }

      /* War Room Dashboard Modal */
      #gf-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(2, 4, 10, 0.85);
        backdrop-filter: blur(10px);
        z-index: 200;
        display: none;
        align-items: center;
        justify-content: center;
        animation: gfFadeIn 0.3s ease;
      }

      #gf-modal-overlay.active {
        display: flex;
      }

      .gf-dashboard-card {
        width: 860px;
        max-width: 92vw;
        height: 560px;
        max-height: 85vh;
        background: var(--gf-bg-card);
        border: 1px solid var(--gf-border-cyan);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 204, 0.15);
        padding: 28px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: var(--gf-font-main);
        color: #ffffff;
        overflow-y: auto;
      }

      .gf-dash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 16px;
      }

      .gf-dash-title {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--gf-neon-cyan);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .gf-dash-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      .gf-widget {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .gf-widget-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #88aacc;
      }

      .gf-widget-val {
        font-size: 24px;
        font-weight: 700;
        font-family: var(--gf-font-mono);
      }

      /* Keyframes */
      @keyframes gfFadeDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      @keyframes gfFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── TOP BAR TICKER COMPONENT ───────────────────────────────────────

  function createTopBar() {
    if (document.getElementById('gf-top-bar')) return;

    // Top bar is now driven by rts-ui-core.js — this module only handles the War Room modal.
    // If rts-ui-core is not installed, create a minimal fallback:
    if (!window.RTSUICore) {
      const bar = document.createElement('div');
      bar.id = 'gf-top-bar';
      Object.assign(bar.style, {
        position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '20px',
        background: 'rgba(6, 10, 20, 0.82)', border: '1px solid rgba(0, 255, 204, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(14px)',
        padding: '8px 24px', borderRadius: '40px', zIndex: '100',
        fontFamily: 'var(--gf-font-main)', pointerEvents: 'auto'
      });
      bar.innerHTML = [
        '<span class="gf-badge-plt">PLT CORE</span>',
        '<div class="gf-stat-item" style="color:#ffd700;"><span>💰 PROFIT:</span><span class="gf-stat-val" id="gf-val-profit">0</span></div>',
        '<div class="gf-stat-item" style="color:#ff66cc;"><span>🌸 LOVE:</span><span class="gf-stat-val" id="gf-val-love">0</span></div>',
        '<div class="gf-stat-item" style="color:#00ffcc;"><span>⚖️ TAX:</span><span class="gf-stat-val" id="gf-val-tax">0</span></div>',
        '<div style="width:1px;height:18px;background:rgba(255,255,255,.15);"></div>',
        '<button id="gf-warroom-btn" onclick="window.toggleGodforgeWarRoom()"><span>⚔️ WAR ROOM</span></button>'
      ].join('');
      document.body.appendChild(bar);
    } else {
      // rts-ui-core already created the top bar — just add the WAR ROOM button
      const hud = document.getElementById('rts-economy-hud');
      if (hud && !document.getElementById('gf-warroom-btn')) {
        const btn = document.createElement('button');
        btn.id = 'gf-warroom-btn';
        btn.innerHTML = '<span>⚔️ WAR ROOM</span>';
        Object.assign(btn.style, {
          background: 'linear-gradient(135deg, rgba(0,255,204,.2), rgba(0,150,255,.2))',
          border: '1px solid #00ffcc', color: '#ffffff', padding: '6px 16px',
          borderRadius: '20px', fontFamily: 'Outfit, sans-serif', fontSize: '12px',
          fontWeight: '700', letterSpacing: '1px', cursor: 'pointer'
        });
        btn.onclick = function() {
          if (window.toggleGodforgeWarRoom) window.toggleGodforgeWarRoom();
          else if (window.GodforgeUI) window.GodforgeUI.toggleWarRoom && window.GodforgeUI.toggleWarRoom();
        };
        hud.appendChild(btn);
      }
    }
  }

  // ─── WAR ROOM DASHBOARD MODAL ───────────────────────────────────────

  function createWarRoomModal() {
    if (document.getElementById('gf-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'gf-modal-overlay';
    overlay.innerHTML = `
      <div class="gf-dashboard-card">
        <div class="gf-dash-header">
          <div class="gf-dash-title">
            <span>🛡️</span>
            <span>GODFORGE STRATEGIC WAR ROOM</span>
          </div>
          <button style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;" onclick="window.toggleGodforgeWarRoom()">✕</button>
        </div>

        <div class="gf-dash-grid">
          <div class="gf-widget">
            <div class="gf-widget-title">Active Warships</div>
            <div class="gf-widget-val" style="color:#00ffcc;">42</div>
            <div style="font-size:11px;color:#00ffccaa;">+4 Line Frigates in queue</div>
          </div>
          <div class="gf-widget">
            <div class="gf-widget-title">Sovereign Realms</div>
            <div class="gf-widget-val" style="color:#ffd700;">21 / 21</div>
            <div style="font-size:11px;color:#ffd700aa;">All systems online</div>
          </div>
          <div class="gf-widget">
            <div class="gf-widget-title">RTS Combat Status</div>
            <div class="gf-widget-val" style="color:#ff0077;">ENGAGED</div>
            <div style="font-size:11px;color:#ff0077aa;">Shattered Front warzone</div>
          </div>
        </div>

        <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#ffcc44;margin-top:10px;">TACTICAL OPERATIONS</div>
        <div style="display:flex;gap:12px;">
          <button style="flex:1;padding:12px;background:rgba(0,255,204,0.1);border:1px solid #00ffcc;color:#00ffcc;border-radius:12px;cursor:pointer;font-weight:700;" onclick="window.__voidJumpPos(900,20,300);window.toggleGodforgeWarRoom();">
            ⚔️ Deploy Fleet to Shattered Front
          </button>
          <button style="flex:1;padding:12px;background:rgba(255,204,0,0.1);border:1px solid #ffcc00;color:#ffcc00;border-radius:12px;cursor:pointer;font-weight:700;" onclick="window.__voidJumpPos(-400,20,-900);window.toggleGodforgeWarRoom();">
            🛍️ Visit Sovereign Marketplace
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    window.toggleGodforgeWarRoom = function() {
      const modal = document.getElementById('gf-modal-overlay');
      if (modal) {
        modal.classList.toggle('active');
      }
    };
  }

  // ─── INITIALIZATION ─────────────────────────────────────────────────

  function init() {
    injectDesignSystem();
    createTopBar();
    createWarRoomModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GodforgeUI = {
    init
  };
})();
