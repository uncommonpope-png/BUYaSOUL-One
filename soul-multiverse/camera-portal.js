// soul-multiverse/camera-portal.js
// Integration Point: Camera Zoom → Galaxy Map → World Transition
// Mirrors No Man's Sky pattern: zoom out = galaxy map, click world = load

const ZOOM_THRESHOLD = 500 // Distance from surface triggers galaxy map

let galaxyMapActive = false
let currentUniverse = null

function activateGalaxyMap(Genesis) {
  if (galaxyMapActive) return
  
  galaxyMapActive = true
  
  const container = document.createElement('div')
  container.id = 'galaxy-map'
  container.style.cssText = `
    position: fixed;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, #0a0a1a, #000);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 300;
    pointer-events: auto;
  `
  
  container.innerHTML = `
    <h2 style="color: #66ffff; font-family: Georgia, serif; margin-bottom: 20px;">🌌 GALAXY MAP</h2>
    <div id="starfield" style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;"></div>
    <button id="back-btn" style="
      margin-top: 20px;
      padding: 10px 20px;
      background: rgba(255,180,60,0.8);
      border: none;
      border-radius: 20px;
      color: #000;
      font-family: Georgia, serif;
      cursor: pointer;
    ">RETURN TO SURFACE</button>
  `
  
  document.body.appendChild(container)
  populateStarfield(Genesis)
  
  document.getElementById('back-btn').addEventListener('click', () => {
    returnToSurface(Genesis)
  })
}

function populateStarfield(Genesis) {
  const container = document.getElementById('starfield')
  if (!container) return
  
  const seeds = [
    { id: 'prime', name: 'Prime Universe', seed: 'default' },
    { id: 'crystal-drift', name: 'Crystal Drift', seed: 'treasure-vii-seed' },
    { id: 'soul-versa', name: 'Soul Verse', seed: 'weave-seed' },
    { id: 'underworld', name: 'Underworld Nexus', seed: 'undercity-seed' },
    { id: 'random-1', name: '? : ?', seed: Math.random().toString(36).substring(7) },
    { id: 'random-2', name: '? : ?', seed: Math.random().toString(36).substring(7) }
  ]
  
  seeds.forEach((s, index) => {
    const star = document.createElement('button')
    star.style.cssText = `
      width: 140px;
      padding: 15px;
      background: radial-gradient(circle, #1a1a4a, #0a0a2a);
      border: 1px solid rgba(102,255,255,0.3);
      border-radius: 12px;
      color: #bff;
      font-family: Georgia, serif;
      font-size: 13px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    `
    star.innerHTML = s.seed.includes('treasure') 
      ? `<div style="color: #ffd700; font-weight: bold;">${s.name}</div>`
      : `<div style="color: #88aaff;">${s.name}</div>`
    
    star.addEventListener('mouseenter', () => {
      star.style.transform = 'scale(1.05)'
      star.style.boxShadow = '0 0 20px rgba(102,255,255,0.5)'
    })
    star.addEventListener('mouseleave', () => {
      star.style.transform = 'scale(1)'
      star.style.boxShadow = 'none'
    })
    star.addEventListener('click', async () => {
      const universe = await selectDestination(s.seed)
      if (universe) {
        spawnNewWorld(Genesis, universe)
      }
    })
    
    container.appendChild(star)
  })
}

function destroyGalaxyMap() {
  document.querySelectorAll('#galaxy-map').forEach(el => el.remove())
}

function returnToSurface(Genesis) {
  galaxyMapActive = false
  destroyGalaxyMap()
}

async function selectDestination(seed) {
  if (!seed) {
    currentUniverse = {
      id: 'prime',
      name: 'Prime Universe',
      seed: 'default',
      pltCoefficients: { profit: 1, love: 1, tax: 1 }
    }
    return currentUniverse
  }
  
  const universeId = `universe-${Date.now()}-${Math.random().toString(36).substring(7)}`
  const pltCoeffs = {
    profit: 0.7 + Math.random() * 0.6,
    love: 0.5 + Math.random() * 0.5,
    tax: 0.1 + Math.random() * 0.3
  }
  
  currentUniverse = {
    id: universeId,
    name: `Seed Universe (${seed.substring(0, 8)}...)`,
    seed,
    pltCoefficients: pltCoeffs,
    bornAt: Date.now()
  }
  
  return currentUniverse
}

function spawnNewWorld(Genesis, universe) {
  galaxyMapActive = false
  destroyGalaxyMap()
  console.log(`[CameraPortal] Spawning world from seed: ${universe.seed}`)
  return { seed: universe.seed, spawned: true }
}

function checkZoomTransition(camera) {
  if (!camera || !camera.position) return false
  
  const distance = Math.abs(camera.position.y)
  if (distance > ZOOM_THRESHOLD && !galaxyMapActive) {
    // Will be activated when zoom detection is wired in
  }
  
  return galaxyMapActive
}

export function createCameraPortal(Genesis) {
  if (!Genesis) return null
  if (Genesis.CameraPortal) return

  Genesis.CameraPortal = {
    isGalaxyMapActive() { return galaxyMapActive },
    getCurrentUniverse() { return currentUniverse },
    activateGalaxyMap() { activateGalaxyMap(Genesis) },
    returnToSurface() { returnToSurface(Genesis) },
    checkZoomTransition,
    ZOOM_THRESHOLD
  }

  return Genesis.CameraPortal
}