const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({
        headless: true,
        args: ['--enable-webgl', '--ignore-gpu-blocklist']
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    let scriptCount = 0;
    page.on('framenavigated', async (frame) => {
        if (frame === page.mainFrame()) {
            scriptCount = await page.evaluate(() => {
                return Array.from(document.scripts).map(s => s.src || 'INLINE').length;
            });
        }
    });

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Unexpected token') || text.includes('ReferenceError') || msg.type() === 'error') {
            console.log('[CONSOLE]', msg.type(), text, JSON.stringify(msg.location()));
        }
    });

    page.on('pageerror', err => {
        console.log('[PAGEERROR]', err.message);
        console.log('[STACK]', err.stack);
    });

    await page.goto('http://localhost:3457/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    const state = await page.evaluate(() => {
        const loadedScripts = Array.from(document.scripts).map(s => {
            const src = s.src || 'INLINE';
            const ok = s.getAttribute('data-loaded');
            return { src: src.split('/').pop(), type: s.type || 'js', loaded: !!ok };
        });
        return {
            loadedScripts,
            totalScripts: loadedScripts.length,
            RTSEngineCore: !!window.RTSEngineCore,
            entitiesCount: window.RTSEngineCore?.ENTITIES?.size || 0,
            cityRendered: !!document.querySelector('canvas')
        };
    });

    console.log('STATE:', JSON.stringify(state, null, 2));

    await page.screenshot({ path: path.join(__dirname, 'play-test-screenshot.png') });
    await browser.close();
})();
