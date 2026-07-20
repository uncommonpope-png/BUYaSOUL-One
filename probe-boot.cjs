const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + e.message));

  await page.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000); // let boot hook + city gen run

  const state = await page.evaluate(() => {
    const G = window.Genesis || {};
    const out = { hasGenesis: !!window.Genesis };
    try {
      out.entityCount = G.EntityRegistry && G.EntityRegistry.count ? G.EntityRegistry.count() : 'n/a';
      out.entityKinds = G.EntityRegistry && G.EntityRegistry.summary ? G.EntityRegistry.summary() : 'n/a';
      out.cityBlocks = G.ProceduralCity && G.ProceduralCity.blockCount ? G.ProceduralCity.blockCount() : 'n/a';
      out.citySummary = G.ProceduralCity && G.ProceduralCity.summary ? G.ProceduralCity.summary() : 'n/a';
      out.citizenSummary = G.CitizenAI && G.CitizenAI.summary ? G.CitizenAI.summary() : 'n/a';
      out.worldPreset = G.WorldReaction && G.WorldReaction.currentPreset ? G.WorldReaction.currentPreset() : 'n/a';
      out.playerCam = G.PlayerCam && G.PlayerCam.summary ? G.PlayerCam.summary() : 'n/a';
      out.moduleList = G.listModules ? G.listModules() : (G.summary ? G.summary() : 'n/a');
    } catch (e) { out.probeError = e.message; }
    return out;
  });

  console.log('=== GENESIS LIVE STATE ===');
  console.log(JSON.stringify(state, null, 2));
  console.log('=== CONSOLE / ERRORS (' + logs.length + ') ===');
  console.log(logs.slice(-40).join('\n'));

  await browser.close();
})().catch(e => { console.error('SCRIPT FAIL:', e.message); process.exit(1); });
