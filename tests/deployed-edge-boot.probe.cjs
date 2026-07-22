// deployed-edge-boot.probe.cjs — real GitHub Pages runtime gate via Edge CDP
// No local server. No Playwright. Usage:
//   node tests/deployed-edge-boot.probe.cjs <url> [screenshot.png]
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const targetUrl = process.argv[2] || 'https://buyasoul-ai.github.io/buyasoul-cpl/';
const screenshotPath = process.argv[3] || path.join(os.tmpdir(), 'genesis-deployed-proof.png');
const target = new URL(targetUrl);

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function pollJson(url, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < end) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error('HTTP ' + response.status);
    } catch (error) { lastError = error; }
    await sleep(150);
  }
  throw lastError || new Error('Timed out waiting for ' + url);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id) {
        const waiter = this.pending.get(msg.id);
        if (!waiter) return;
        this.pending.delete(msg.id);
        if (msg.error) waiter.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else waiter.resolve(msg.result || {});
        return;
      }
      const handlers = this.listeners.get(msg.method) || [];
      handlers.forEach((handler) => handler(msg.params || {}));
    });
  }
  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(handler);
  }
  call(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.socket.close(); } catch (_) {} }
}

async function evaluate(client) {
  const expression = `(() => {
    const canvas = document.querySelector('canvas');
    const overlay = document.getElementById('loader-overlay');
    const interior = window.Genesis && window.Genesis.InteriorRenderer && window.Genesis.InteriorRenderer.summary ? window.Genesis.InteriorRenderer.summary() : null;
    return {
      href: location.href,
      mainEvaluationComplete: !!window.__genesisMainEvaluationComplete,
      firstFrameSeen: !!window.__genesisFirstFrameSeen,
      cplReady: !!window.__cplReady,
      bootReady: !!window.__GENESIS_BOOT_READY,
      bootStatus: window.__genesisBootContract && window.__genesisBootContract.status,
      loaderReleased: !!window.__genesisBackstopReleased,
      loaderHidden: !!(overlay && overlay.classList.contains('hidden')),
      canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
      interior,
      runtimeError: window.__cplErr || null,
      rollbackAttempts: Number(sessionStorage.getItem('genesis:rollback-attempts') || '0') || 0
    };
  })()`;
  const response = await client.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Runtime.evaluate failed');
  return response.result && response.result.value;
}

async function main() {
  assert.ok(fs.existsSync(EDGE), 'Microsoft Edge not found at ' + EDGE);
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'genesis-edge-'));
  const edge = childProcess.spawn(EDGE, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = '';
  edge.stderr.on('data', (chunk) => { browserLog = (browserLog + chunk.toString()).slice(-200000); });

  let client = null;
  try {
    const pages = await pollJson('http://127.0.0.1:' + port + '/json/list');
    const page = pages.find((entry) => entry.type === 'page');
    assert.ok(page && page.webSocketDebuggerUrl, 'Edge page target not found');
    client = new CdpClient(page.webSocketDebuggerUrl);
    await client.open();

    const exceptions = [];
    const consoleRows = [];
    const badResponses = [];
    let targetNavigations = 0;
    client.on('Runtime.exceptionThrown', (event) => {
      const detail = event.exceptionDetails || {};
      exceptions.push((detail.exception && detail.exception.description) || detail.text || 'runtime exception');
    });
    client.on('Runtime.consoleAPICalled', (event) => {
      const text = (event.args || []).map((arg) => arg.value != null ? String(arg.value) : (arg.description || '')).join(' ');
      consoleRows.push({ type: event.type, text });
    });
    client.on('Network.responseReceived', (event) => {
      const response = event.response || {};
      if (Number(response.status) >= 400) badResponses.push({ status: response.status, url: response.url });
    });
    client.on('Page.frameNavigated', (event) => {
      const frame = event.frame || {};
      if (!frame.parentId && frame.url && frame.url.startsWith(target.origin + target.pathname)) targetNavigations++;
    });

    await Promise.all([
      client.call('Runtime.enable'),
      client.call('Page.enable'),
      client.call('Network.enable'),
      client.call('Log.enable')
    ]);
    await client.call('Page.navigate', { url: targetUrl });

    let state = null;
    const deadline = Date.now() + 45000;
    let readyAt = 0;
    while (Date.now() < deadline) {
      await sleep(1000);
      try { state = await evaluate(client); } catch (_) { continue; }
      if (state && state.bootReady && state.firstFrameSeen && state.cplReady && state.loaderReleased) {
        if (!readyAt) readyAt = Date.now();
        if (Date.now() - readyAt >= 4000) break;
      }
    }

    const screenshot = await client.call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const fatalConsole = consoleRows.filter((row) => /Cannot access .* before initialization|Genesis Rollback|Genesis Runtime Error|Timed out before visible readiness/i.test(row.text));
    const sameOriginBad = badResponses.filter((row) => {
      try { return new URL(row.url).origin === target.origin; } catch (_) { return false; }
    });
    const assetBad = badResponses.filter((row) => /\/assets\//.test(row.url));

    console.log('\n=== DEPLOYED EDGE BOOT PROBE ===');
    console.log(JSON.stringify({ state, targetNavigations, exceptions, fatalConsole, sameOriginBad, assetBad, screenshotPath }, null, 2));

    assert.ok(state, 'No runtime state captured');
    assert.strictEqual(state.mainEvaluationComplete, true, 'main module evaluation did not complete');
    assert.strictEqual(state.firstFrameSeen, true, 'no successful rendered frame');
    assert.strictEqual(state.cplReady, true, 'CPL readiness did not resolve');
    assert.strictEqual(state.bootReady, true, 'Genesis boot contract did not resolve');
    assert.strictEqual(state.loaderReleased, true, 'loader was not released');
    assert.strictEqual(state.loaderHidden, true, 'opaque loader remains visible');
    assert.ok(state.canvas && state.canvas.width > 0 && state.canvas.height > 0, 'render canvas missing or zero-sized');
    assert.ok(state.interior && state.interior.attached && state.interior.markers >= 3, 'interior renderer/door markers not attached');
    assert.strictEqual(state.rollbackAttempts, 0, 'rollback navigation occurred');
    assert.ok(targetNavigations <= 1, 'page reloaded during boot: ' + targetNavigations);
    assert.deepStrictEqual(exceptions, [], 'runtime exceptions occurred');
    assert.deepStrictEqual(fatalConsole, [], 'fatal console diagnostics occurred');
    assert.deepStrictEqual(sameOriginBad, [], 'same-origin HTTP failures occurred');
    assert.deepStrictEqual(assetBad, [], 'asset HTTP failures occurred');
    assert.ok(fs.statSync(screenshotPath).size > 10000, 'screenshot proof is unexpectedly small');
    console.log('\n=== DEPLOYED EDGE BOOT: PASS ===\n');
  } catch (error) {
    console.error('\n=== DEPLOYED EDGE BOOT: FAIL ===');
    console.error(error && error.stack ? error.stack : error);
    if (browserLog) console.error('\n--- Edge stderr tail ---\n' + browserLog.slice(-12000));
    process.exitCode = 1;
  } finally {
    if (client) client.close();
    try { edge.kill(); } catch (_) {}
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
  }
}

main();
