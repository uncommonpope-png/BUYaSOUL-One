const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function gitHead() {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch (_) { return 'unknown'; }
}

async function main() {
  const outDir = path.join(process.cwd(), 'proof-packs');
  fs.mkdirSync(outDir, { recursive: true });
  const head = gitHead();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `act-vi-boot-${head}-${stamp}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

  await page.goto(`http://127.0.0.1:8088/index.html?proof=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => !!(window.Genesis && window.Genesis.AgentGateway && window.GenesisImmortality && window.Genesis.ResourcePool && window.Genesis.ReactionRules && window.Genesis.EntityRegistry && window.Genesis.EngineScheduler && window.Genesis.EngineScheduler.summary && window.Genesis.EngineScheduler.summary().tickCount >= 7),
    { timeout: 25000 }
  );

  const report = await page.evaluate(() => {
    const G = window.Genesis || {};
    const r = { checks: {}, details: {} };
    const pass = (n, v, d) => { r.checks[n] = !!v; if (d !== undefined) r.details[n] = d; };
    const reg = G.EntityRegistry, gw = G.AgentGateway, imm = window.GenesisImmortality;
    pass('genesisPresent', !!G);
    pass('schedulerRunning', !!(G.EngineScheduler && G.EngineScheduler.summary().tickCount >= 7), G.EngineScheduler && G.EngineScheduler.summary());
    pass('edgeCityBuilt', !!(G.ProceduralCity && G.ProceduralCity.blockCount && G.ProceduralCity.blockCount() >= 200), G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary());
    pass('citizensVisible', !!(G.CitizenAI && G.CitizenAI.summary && G.CitizenAI.summary().citizenCount >= 2), G.CitizenAI && G.CitizenAI.summary && G.CitizenAI.summary());
    if (G.WorldReaction && G.WorldReaction.observeMood) {
      G.WorldReaction.observeMood('anger');
      const p = G.WorldReaction.currentPreset();
      pass('moodWorldSwap', p && p.particles === 'fire' && p.shader === 'lava', p);
    }
    let spawn = false;
    if (gw && gw.dispatch && G.EngineScheduler && reg) {
      gw.dispatch({ op: 'spawn', kind: 'phase-probe', tags: ['phase-probe'], owner: 'agent://gsk', pos: { x: 230, y: -52, z: 0 }, cost: 0 });
      G.EngineScheduler.run({ dt: 0.016, scene: G.scene, camera: G.camera, renderer: G.renderer, hubActive: true, surfaceActive: true });
      spawn = reg.find('phase-probe').length > 0;
    }
    pass('commandChannelSpawn', spawn, reg && reg.find ? reg.find('phase-probe') : null);
    let save = null;
    if (imm && gw && gw.worldSnapshot) {
      save = imm.snapshot({ self: { phaseProbe: true }, world: gw.worldSnapshot() });
      pass('snapshotWritten', !!save && !!save.checksum && Array.isArray(save.world), { worldCount: save.world.length, checksum: save.checksum });
    }
    if (save && reg && imm) {
      const probe = reg.find('phase-probe')[0];
      if (probe && probe.id) reg.unregister(probe.id);
      pass('probeRemovedBeforeRestore', reg.find('phase-probe').length === 0);
      const loaded = imm.load(save, null);
      pass('saveLoadReadable', loaded.ok, loaded);
      if (loaded.ok && loaded.state && Array.isArray(loaded.state.world)) {
        for (const e of loaded.state.world) if (e && e.id && !reg.has(e.id)) reg.register(null, { id: e.id, kind: e.kind, owner: e.owner, tags: e.tags || [] });
      }
      pass('worldRestoredFromSave', reg.find('phase-probe').length > 0, reg.find('phase-probe'));
      pass('cityStillBootedAfterRestore', !!(G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary().built), G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary());
    }
    return r;
  });

  const failed = Object.keys(report.checks).filter((k) => !report.checks[k]);
  const pack = {
    phase: 'P65',
    title: 'Witness Recorder proof pack — corrected Act VI browser-live boot',
    engineHead: head,
    generatedAt: new Date().toISOString(),
    url: 'http://127.0.0.1:8088/index.html',
    ok: failed.length === 0,
    failed,
    checks: report.checks,
    details: report.details,
    actLogs: logs.filter((l) => l.includes('Act VI')).slice(-20)
  };

  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(pack, null, 2));
  try { await page.screenshot({ path: path.join(outDir, name + '.png') }); } catch (_) {}
  await browser.close();

  console.log('PROOF PACK ' + (pack.ok ? 'GREEN' : 'RED') + ' -> ' + name);
  console.log(JSON.stringify({ ok: pack.ok, failed: pack.failed, checks: pack.checks }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
