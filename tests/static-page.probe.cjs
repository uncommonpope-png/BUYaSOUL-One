// static-page.probe.cjs — GitHub Pages static boot ultra-review guard
// Run: node tests/static-page.probe.cjs
'use strict';

const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const SERVICE_WORKER = path.join(ROOT, 'service-worker.js');

let passed = 0;
function check(label, fn) { fn(); passed++; console.log('  ✅ ' + label); }

function syntaxCheckModuleSource(source, label) {
  const r = cp.spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, label + ' syntax failed:\n' + (r.stderr || r.stdout));
}

function extractMainModule(html) {
  const imp = html.indexOf('import * as THREE');
  assert.ok(imp >= 0, 'main module import not found');
  const start = html.lastIndexOf('>', imp) + 1;
  const end = html.indexOf('</script>', imp);
  assert.ok(start > 0 && end > start, 'main module script bounds not found');
  return html.slice(start, end);
}

function collectLocalRefs(html) {
  const refs = new Set(['./cpl-config.js']);
  const patterns = [
    /from\s+['"](\.\/[^'"]+)['"]/g,
    /import\(\s*['"](\.\/[^'"]+)['"]\s*\)/g,
    /<script[^>]+src=['"](\.\/[^'"]+)['"]/g
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html))) refs.add(m[1]);
  }
  return refs;
}

function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

console.log('\n=== STATIC PAGE ULTRA REVIEW PROBE ===\n');

const html = fs.readFileSync(INDEX, 'utf8');
const mainModule = extractMainModule(html);

check('main inline module parses as JavaScript module', () => {
  syntaxCheckModuleSource(mainModule, 'index.html main inline module');
});

check('all src/genesis modules parse as JavaScript modules', () => {
  const files = walkJs(path.join(ROOT, 'src', 'genesis'));
  assert.ok(files.length >= 70, 'unexpectedly few genesis modules: ' + files.length);
  for (const file of files) syntaxCheckModuleSource(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file));
});

check('all local static JS refs in index.html exist on disk', () => {
  const missing = [];
  for (const ref of collectLocalRefs(html)) {
    const clean = ref.split('?')[0].replace(/^\.\//, '');
    if (!fs.existsSync(path.join(ROOT, clean))) missing.push(ref);
  }
  assert.deepStrictEqual(missing, []);
});

check('boot constants are declared before boot contract use', () => {
  const decl = mainModule.indexOf("const BOOT_FAILURE_TIMEOUT = 15000");
  const use = mainModule.indexOf('}, BOOT_FAILURE_TIMEOUT);');
  assert.ok(decl >= 0, 'BOOT_FAILURE_TIMEOUT declaration missing');
  assert.ok(use >= 0, 'BOOT_FAILURE_TIMEOUT use missing');
  assert.ok(decl < use, 'BOOT_FAILURE_TIMEOUT used before declaration');
  assert.strictEqual((mainModule.match(/const BOOT_FAILURE_TIMEOUT/g) || []).length, 1, 'duplicate BOOT_FAILURE_TIMEOUT declaration');
  assert.strictEqual((mainModule.match(/const GENESIS_SAVE_KEY/g) || []).length, 1, 'duplicate GENESIS_SAVE_KEY declaration');
  assert.strictEqual((mainModule.match(/const GENESIS_LAST_GOOD_KEY/g) || []).length, 1, 'duplicate GENESIS_LAST_GOOD_KEY declaration');
});

check('moduleReady helper exists before collectDetail uses it', () => {
  const helper = mainModule.indexOf('function moduleReady(');
  const use = mainModule.indexOf("kernel: moduleReady('__GENESIS_KERNEL'");
  assert.ok(helper >= 0, 'moduleReady helper missing');
  assert.ok(use >= 0, 'moduleReady use missing');
  assert.ok(helper < use, 'moduleReady helper appears after use');
});

check('resume capture cannot cross player or realm lexical dead zones', () => {
  const playerDecl = mainModule.indexOf('let playerNPC = null;');
  const proofInstall = mainModule.indexOf('installNPCScalePass(window.Genesis');
  const captureGuard = mainModule.indexOf('if (!resumeCaptureReady || !playerNPC || !playerNPC.position) return null;');
  const realmFn = mainModule.indexOf('function currentRealm()');
  const captureReady = mainModule.indexOf('resumeCaptureReady = true;');
  assert.ok(playerDecl >= 0 && playerDecl < proofInstall, 'playerNPC must initialize before synchronous proof installers');
  assert.ok(captureGuard >= 0, 'captureResumeState readiness guard missing');
  assert.ok(realmFn >= 0 && captureReady > realmFn, 'resume capture enabled before realm/chamber state is initialized');
  assert.strictEqual((mainModule.match(/let playerNPC/g) || []).length, 1, 'playerNPC must have one lexical declaration');
});

check('premium slice build runs after facade cache initialization', () => {
  const cache = mainModule.indexOf('const facadeTextureCache = {};');
  const trigger = mainModule.indexOf('Genesis.PremiumSlice.build();');
  assert.ok(cache >= 0 && trigger > cache, 'PremiumSlice.build crosses facadeTextureCache TDZ');
});

check('boot readiness requires completed evaluation and a visible frame', () => {
  assert.ok(mainModule.includes('detail.runtime.mainEvaluationComplete && detail.runtime.firstFrameSeen && detail.runtime.cplReady'), 'boot contract lacks visible runtime gate');
  assert.ok(mainModule.includes('window.__genesisMainEvaluationComplete = true;'), 'main evaluation completion marker missing');
  assert.ok(!mainModule.includes("window.applyGenesisRollback('Boot Ready Timeout'"), 'boot timeout must not trigger destructive rollback');
});

check('fresh profile and runtime errors do not trigger destructive rollback', () => {
  assert.ok(mainModule.includes('if (!currentSaveRaw && !lastGoodRaw)'), 'fresh-profile no-save guard missing');
  assert.ok(!mainModule.includes("window.applyGenesisRollback('Unhandled JavaScript Error'"), 'generic JavaScript errors still trigger rollback');
  assert.ok(!mainModule.includes("window.applyGenesisRollback('Unhandled Promise Rejection'"), 'generic promise errors still trigger rollback');
  assert.ok(mainModule.includes('Current save validates; preserving it'), 'valid current save is not explicitly preserved');
});

check('pending loader release flushes on first visible frame', () => {
  assert.ok(html.includes('if (window.__genesisPendingLoaderReleaseReason && !window.__genesisBackstopReleased)'), 'first-frame pending release still depends on stale cplReady state');
});

check('cpl ready state dispatches cpl:ready event through helper', () => {
  assert.ok(mainModule.includes('function markCplReady(reason)'), 'markCplReady helper missing');
  assert.ok(mainModule.includes("markCplReady('critical-manager:onLoad')"), 'critical manager does not call markCplReady');
  assert.ok(mainModule.includes("markCplReady('first-frame-backstop')"), 'first-frame fallback does not call markCplReady');
  const directAssignments = (mainModule.match(/window\.__cplReady\s*=\s*true/g) || []).length;
  assert.strictEqual(directAssignments, 1, 'only markCplReady should directly assign __cplReady');
});

check('missing local NPC rig GLBs are not requested by default', () => {
  assert.ok(mainModule.includes("window.__GENESIS_NPC_RIG = (typeof window.__GENESIS_NPC_RIG === 'boolean') ? window.__GENESIS_NPC_RIG : false"), 'NPC rig flag does not default false');
  assert.ok(mainModule.includes('if (window.__GENESIS_NPC_RIG === true)'), 'NPC rig GLBs not gated by explicit true');
});

check('code-only publish routes media to the production asset origin', () => {
  assert.ok(mainModule.includes("https://uncommonpope-png.github.io/cosmic-pyramid-library/"), 'production asset origin missing');
  assert.ok(mainModule.includes('criticalManager.setURLModifier(resolveGenesisAssetUrl)'), 'critical assets do not use asset resolver');
  assert.ok(mainModule.includes('loadingManager.setURLModifier(resolveGenesisAssetUrl)'), 'lazy assets do not use asset resolver');
  assert.ok(mainModule.includes("fetch(resolveGenesisAssetUrl('assets/assets.json'))"), 'asset catalog bypasses asset resolver');
  assert.ok(mainModule.includes('video.src = resolveGenesisAssetUrl(vidUrl)'), 'billboard videos bypass asset resolver');
});

check('service worker never returns undefined or caches cross-origin soul traffic', () => {
  const sw = fs.readFileSync(SERVICE_WORKER, 'utf8');
  syntaxCheckModuleSource(sw, 'service-worker.js');
  assert.ok(sw.includes('url.origin !== self.location.origin'), 'service worker does not bypass cross-origin requests');
  assert.ok(sw.includes("url.pathname.includes('/gsk/mcp/')"), 'service worker does not bypass prefixed GSK API routes');
  assert.ok(sw.includes("new Response('Offline', { status: 503"), 'offline cache miss can resolve without a Response');
  assert.ok(sw.includes("const CACHE = 'cpl-v17'"), 'service-worker cache version was not rotated');
});

check('rollback reload loop has attempt cap', () => {
  assert.ok(mainModule.includes('genesis:rollback-attempts'), 'rollback attempt cap missing');
  assert.ok(mainModule.includes('Max reload attempts reached'), 'rollback max-attempt hold missing');
});

console.log('\n=== STATIC PAGE ULTRA REVIEW: ' + passed + ' checks passed ===\n');
