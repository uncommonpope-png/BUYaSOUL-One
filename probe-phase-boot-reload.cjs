const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

  const url = `http://127.0.0.1:8088/index.html?phaseProbe=${Date.now()}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Boot is async (ES module imports + fallback installer). Wait for the core
  // spine to actually install before asserting, so the gate reflects real boot
  // rather than a race.
  try {
    await page.waitForFunction(
      () => !!(window.Genesis && window.Genesis.AgentGateway && window.GenesisImmortality && window.Genesis.ResourcePool && window.Genesis.ReactionRules && window.Genesis.EntityRegistry && window.Genesis.EngineScheduler && window.Genesis.EngineScheduler.summary && window.Genesis.EngineScheduler.summary().tickCount >= 7),
      { timeout: 25000 }
    );
  } catch (e) {
    // fall through; the report will surface exactly what is missing
  }

  const report = await page.evaluate(() => {
    const G = window.Genesis || {};
    const result = { checks: {}, details: {} };
    function pass(name, value, detail) { result.checks[name] = !!value; if (detail !== undefined) result.details[name] = detail; }

    const registry = G.EntityRegistry;
    const gateway = G.AgentGateway;
    const immortality = window.GenesisImmortality;

    pass('genesisPresent', !!G);
    pass('schedulerRunning', !!(G.EngineScheduler && G.EngineScheduler.summary && G.EngineScheduler.summary().tickCount >= 7), G.EngineScheduler && G.EngineScheduler.summary && G.EngineScheduler.summary());
    pass('edgeCityBuilt', !!(G.ProceduralCity && G.ProceduralCity.blockCount && G.ProceduralCity.blockCount() >= 200), G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary());
    pass('citizensVisible', !!(G.CitizenAI && G.CitizenAI.summary && G.CitizenAI.summary().citizenCount >= 2), G.CitizenAI && G.CitizenAI.summary && G.CitizenAI.summary());

    if (G.WorldReaction && G.WorldReaction.observeMood) {
      G.WorldReaction.observeMood('anger');
      const preset = G.WorldReaction.currentPreset();
      pass('moodWorldSwap', preset && preset.particles === 'fire' && preset.shader === 'lava', preset);
    } else pass('moodWorldSwap', false, 'missing WorldReaction');

    let spawnApplied = false;
    if (gateway && gateway.dispatch && G.EngineScheduler && registry) {
      gateway.dispatch({ op: 'spawn', kind: 'phase-probe', tags: ['phase-probe'], owner: 'agent://gsk', pos: { x: 230, y: -52, z: 0 }, cost: 0 });
      G.EngineScheduler.run({ dt: 0.016, scene: G.scene, camera: G.camera, renderer: G.renderer, hubActive: true, surfaceActive: true });
      spawnApplied = registry.find('phase-probe').length > 0;
    }
    pass('commandChannelSpawn', spawnApplied, registry && registry.find ? registry.find('phase-probe') : null);

    let save = null;
    if (immortality && gateway && gateway.worldSnapshot) {
      save = immortality.snapshot({ self: { phaseProbe: true }, world: gateway.worldSnapshot() });
      localStorage.setItem('phase-probe-save', JSON.stringify(save));
      pass('snapshotWritten', !!save && !!save.checksum && Array.isArray(save.world), { worldCount: save.world && save.world.length, checksum: save.checksum });
    } else pass('snapshotWritten', false, 'missing immortality or gateway snapshot');

    if (save && registry && immortality) {
      const probe = registry.find('phase-probe')[0];
      if (probe && probe.id) registry.unregister(probe.id);
      pass('probeRemovedBeforeRestore', registry.find('phase-probe').length === 0);
      const loaded = immortality.load(save, null);
      pass('saveLoadReadable', loaded.ok, loaded);
      if (loaded.ok && loaded.state && Array.isArray(loaded.state.world)) {
        for (const e of loaded.state.world) {
          if (e && e.id && !registry.has(e.id)) registry.register(null, { id: e.id, kind: e.kind, owner: e.owner, tags: e.tags || [] });
        }
      }
      pass('worldRestoredFromSave', registry.find('phase-probe').length > 0, registry.find('phase-probe'));
      pass('cityStillBootedAfterRestore', !!(G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary().built), G.ProceduralCity && G.ProceduralCity.summary && G.ProceduralCity.summary());
    }
    return result;
  });

  const expected = [
    'genesisPresent', 'schedulerRunning', 'edgeCityBuilt', 'citizensVisible',
    'moodWorldSwap', 'commandChannelSpawn', 'snapshotWritten',
    'probeRemovedBeforeRestore', 'saveLoadReadable', 'worldRestoredFromSave', 'cityStillBootedAfterRestore'
  ];
  const failed = expected.filter((k) => !report.checks[k]);
  const output = { ok: failed.length === 0, failed, report, actLogs: logs.filter((l) => l.includes('Act VI')).slice(-20) };
  console.log(JSON.stringify(output, null, 2));
  await browser.close();
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
