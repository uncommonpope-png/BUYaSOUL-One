# AGENTS.md — buyasoul-cpl-fresh

## Project
- **Repo:** `C:\Users\uncom\Desktop\buyasoul-cpl-fresh`
- **GitHub:** `https://github.com/buyasoul-ai/buyasoul-cpl.git` (branch: `publish`)
- **GitHub Pages (3D world):** `https://buyasoul-ai.github.io/buyasoul-cpl/`
- **Local server (2D map + API):** `http://localhost:3457/`
- **Stack:** Three.js r128, vanilla JS, Node.js http

---

## CRITICAL RULES
1. **NEVER place anything inside 0–360u** (NO-BUILD ZONE / CPL Territory)
2. **NEVER touch `index.html`** (CPL city code)
3. Lost Mechanics ring = 360–600u, Lost Worlds ring = 600–3000u
4. Coordinates must match between `void-map.html` WORLDS and `void-population.js` WORLD_COORDINATES
5. Always check the map at `http://localhost:3457/` before placing new content
6. **3D world = GitHub Pages** — changes to `void-population.js` must be committed and pushed to `origin/publish`
7. **2D map = local server** — `void-map.html` runs on `http://localhost:3457/` via `node server.js`
8. Old port 3456 has a stuck process (can't kill). Always use 3457.
9. When the user says they can't see the 3D world, they mean GitHub Pages — push changes live

---

## Coordinate System
| Range | Zone | Content |
|-------|------|---------|
| 0–360u | NO-BUILD | ABSOLUTELY NOTHING |
| 360–600u | Lost Mechanics Ring | 3 LM cities + New City |
| 600–3000u | Lost Worlds Ring | 10 Worlds |
| 3000–5000u | Outer Void | Subtle/dark elements |
| 5000–8000u | Deep Void | Bright/large structures |
| 8000u+ | Far Void | Any scale |

## All 14 Coordinates
```
LM I:   Physics Gate   (-490,   0,   59)   494u
LM II:  Arena Core     (-360,   0,  -21)   361u
LM III: Soul Home      (-218,   0, -288)   361u
 0: Neon Citadel    ( 2090,  39.6,  221)  2102u — combat
 1: Shadow Forge    ( 2301,  19.1,  632)  2386u — crafting
 2: Crystal Nexus   (  400,   0,    400)   566u — trading
 3: Void Empire     (  -23, -27.3, 1409)  1409u — exploration
 4: Ember Sanctum   ( -976, -22.6,  510)  1101u — breeding
 5: Frost Wilds     ( -589,   0,   -118)   601u — governance
 6: Storm Hub       (-2211, -14.1, -567)  2282u — economy
 7: Soul Arena      (-1048,  -8.8,-2792)  2982u — building
 8: Cosmic Garden   ( 1553,  17.3,-2135)  2640u — conversation
 9: Phantom Spire   ( 1152,  32.5, -561)  1282u — districts
13: New City        (  313,   0,    179)   361u — cplclone (LM bible randomized)
```

---

## Lost Mechanics Archetypes (12-Type Bible)

| Type | Color | Quest |
|------|-------|-------|
| physics | `#aa66ff` | Master Momentum Fields |
| gacha | `#ff66cc` | Complete a full collection |
| evolve | `#66ff88` | Evolve to Apex Form |
| typeadv | `#ff8844` | Master all 12 types |
| arena | `#ff3355` | Defeat the Pantheon Champion |
| idle | `#00ffaa` | 24-hour automation |
| prestige | `#ffdd00` | Ascend 3 times |
| pantheon | `#4488ff` | Gain favor with all 12 Deities |
| soulhome | `#ffaa00` | Build perfect sanctuary |
| persona | `#00ffcc` | Create a perfect companion |
| economy | `#00ffaa` | Trigger PLT market boom |
| achievement | `#ff7722` | Complete all 12 Lost Mechanics |

Denizen names per type: see `void-population.js` lines 96–119

---

## File Map
| File | Role | Where it runs |
|------|------|---------------|
| `index.html` | 3D Mystical Library | GitHub Pages (DO NOT EDIT) |
| `src/genesis/void-population.js` | 3D world builder — all 14 worlds | GitHub Pages |
| `void-map.html` | Interactive 2D coordinate map + task editor | Local server |
| `void-tasks-live.json` | Server-persisted task store | Local server |
| `server.js` | HTTP server with `/api/tasks` GET/POST/DELETE | Local server |
| `VOID-COORDINATES.md` | Coordinate reference | doc |
| `VOID-EXPLORATION.md` | Full journal with everything | doc |
| `AGENTS.md` | This file — agent workflow guide | doc |

---

## THE WORKFLOW (process a task from map to live)

This is the exact process used to build the New City. Follow it every time.

### Step 1: User places a task on the 2D map
- User opens `http://localhost:3457/` in their browser
- Clicks on the map → editor opens with coordinates pre-filled
- Fills in name + description → clicks Save
- Task is saved to `void-tasks-live.json` via `POST /api/tasks`

### Step 2: Agent reads the task
- Read `void-tasks-live.json` (or `curl.exe http://localhost:3457/api/tasks`)
- Understand the name, position (x, y, z), and description
- **Verify the position is outside 0–360u no-build zone**
- Example: `(313, 0, 179)` → dist = sqrt(313² + 179²) ≈ 361u ✅

### Step 3: Agent confirms understanding with user
- State the task name, position, and what the user wants
- Get confirmation before building

### Step 4: Agent builds into void-population.js
- **If it's a new world** (not replacing an existing one):
  1. Increment `WORLD_COUNT` (line 10)
  2. Add position to `WORLD_COORDINATES` (around line 37)
  3. Add config to `WORLD_CONFIG` (around line 54)
  4. Add type to `TYPES` array (around line 57)
  5. Add type color to `TYPE_COLORS` (around line 59)
  6. Add type quest to `TYPE_QUESTS` (around line 70)
  7. Add denizen names to `TYPE_DENIZEN_NAMES` (around line 95)
  8. If it needs a custom builder (like `createCPLCloneCity`), add the function before `populate`
  9. In the populate loop (around line 955), add a conditional: `type === 'cplclone' ? createCPLCloneCity(pos, rng) : createCitySkeleton(pos, type, rng)`
- **If it replaces or modifies an existing world**: update the relevant entry in WORLD_COORDINATES and WORLD_CONFIG

### Step 5: Update the 2D map (void-map.html)
- Add the new world to the `WORLDS` array (around line 141) with its type, position, distance, angle
- Add the type color to `TYPE_COLORS` (around line 143)
- This ensures the marker appears on the 2D map

### Step 6: Commit and push to GitHub Pages
```bash
git add src/genesis/void-population.js void-map.html
git commit -m "Describe what was built and where"
git push origin publish
```
- Only `void-population.js` and `void-map.html` are needed for the live site
- The 3D world updates on GitHub Pages after ~1-2 minutes
- The 2D map updates immediately on the local server (restart if needed)

### Step 7: Verify the deployment
- The 3D world at `https://buyasoul-ai.github.io/buyasoul-cpl/` should have the new content
- The 2D map at `http://localhost:3457/` should show the new marker
- Tell the user it's live

---

## CPL Clone City Template (created following this workflow)

When the user asks for a "CPL clone randomized by LM bible":

1. Add a `createCPLCloneCity(pos, rng)` function — builds a CPL-inspired city with:
   - 4 districts each themed by a random LM archetype (physics, gacha, evolve, etc.)
   - 7x7 road grid (like CPL)
   - Procedural buildings in 4 shapes: box, cylinder, tapered ziggurat, stacked
   - Window glow strips, caps, antenna spires
   - 2 outer rings of support buildings
   - Central beacon beam with orb, halo, point light
   - Ambient particles + atmosphere dome
2. Add it as world #14 (index 13) in the populate loop

---

## How the Map + Task System Works
- **Open** `http://localhost:3457/` → click on map → editor opens with coords pre-filled
- **Save** → syncs to `void-tasks-live.json` via `POST /api/tasks`
- **Read tasks** → check `void-tasks-live.json` or `GET /api/tasks`
- **Data flow:** save → localStorage + POST /api/tasks | load → localStorage + GET /api/tasks
- **Agent reads** `void-tasks-live.json` directly or via the API

---

## Current Tasks (from void-tasks-live.json)
- **new city** at (313, 0, 179) ~361u — clone of CPL randomized using LM bible ✅ BUILT + PUSHED
