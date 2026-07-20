'use strict';
const { chromium } = require('playwright');

async function boot(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!(window.Genesis && window.Genesis.bootReady), { timeout: 30000 });
  await page.evaluate(() => window.Genesis.bootReady);
  await page.waitForFunction(() => !!(window.__phaseTools && window.__GENESIS_BOOT_READY === true), { timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = `http://127.0.0.1:8088/index.html?phaseBatch=${Date.now()}`;

  await boot(page, url);

  const p18 = await page.evaluate(() => {
    const G = window.Genesis;
    const before = G.EntityRegistry.count();
    const ok = window.__phaseTools.issueWorldCommand('spawn', { entity: 'soul', archetype: 'visitor', theme: 'creative' });
    G.EngineScheduler.run({ dt: 0.016, time: 0, serial: 1, scene: G.scene, camera: G.camera, renderer: G.renderer, surfaceActive: true, hubActive: true });
    const intents = G.EntityRegistry.queryByTag('ui-intent');
    return { ok, before, after: G.EntityRegistry.count(), intents: intents.length, latest: intents.length ? intents[intents.length - 1] : null };
  });

  const p33 = await page.evaluate(() => {
    window.__phaseTools.onQuestComplete('scribe');
    const saved = JSON.parse(localStorage.getItem('cpl-world-state-v2') || 'null');
    const rec = window.Genesis.EntityRegistry.get('quest-consequence:scribe');
    return {
      questComplete: !!(saved && saved.quests && saved.quests.scribe),
      consequenceSaved: !!(saved && saved.questConsequences && saved.questConsequences.scribe),
      consequenceEntity: !!rec,
      entityMeta: rec && rec.meta ? rec.meta : null
    };
  });

  const resumeSeed = await page.evaluate(() => {
    window.__phaseTools.travelToRealm('builder');
    window.__phaseTools.setPlayerState({ position: { x: -17, y: -11998, z: 42 }, yaw: 0.75, floorY: -12000, flying: false, grounded: true, cameraMode: 'npc' });
    window.__phaseTools.saveWorldState();
    return {
      realm: window.__phaseTools.currentRealm(),
      pos: window.__phaseTools.playerState().position,
      yaw: window.__phaseTools.playerState().yaw
    };
  });

  await boot(page, url + '&reload=1');
  await page.waitForFunction(() => window.__phaseTools && window.__phaseTools.currentRealm() === 'builder', { timeout: 8000 });

  const p43 = await page.evaluate(() => ({
    realm: window.__phaseTools.currentRealm(),
    pos: window.__phaseTools.playerState().position,
    yaw: window.__phaseTools.playerState().yaw,
    resume: JSON.parse(localStorage.getItem('cpl-world-state-v2') || 'null').resume
  }));

  const p65 = await page.evaluate(() => {
    const before = window.__witnessRecorder.all().length;
    window.dispatchEvent(new CustomEvent('genesis:agent:entity-built', { detail: { owner: 'agent://gsk', kind: 'proof-tower', id: 'proof-tower-1' } }));
    const latest = window.__witnessRecorder.latest();
    const saved = JSON.parse(localStorage.getItem('cpl-world-state-v2') || 'null');
    return {
      before,
      after: window.__witnessRecorder.all().length,
      latest,
      savedCount: saved && saved.witnessPacks ? saved.witnessPacks.length : 0
    };
  });

  const report = {
    ok: true,
    checks: {
      p18: !!(p18.ok && p18.after > p18.before && p18.intents > 0),
      p33: !!(p33.questComplete && p33.consequenceSaved && p33.consequenceEntity),
      p43: !!(p43.realm === 'builder' && Math.abs(p43.pos.x - resumeSeed.pos.x) < 0.001 && Math.abs(p43.pos.z - resumeSeed.pos.z) < 0.001 && Math.abs(p43.yaw - resumeSeed.yaw) < 0.001),
      p65: !!(p65.after === p65.before + 1 && p65.latest && p65.latest.id === 'proof-tower-1' && p65.savedCount >= p65.after)
    },
    details: { p18, p33, p43, p65 }
  };
  report.ok = Object.values(report.checks).every(Boolean);

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
