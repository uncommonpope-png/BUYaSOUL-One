import WebSocket from 'ws';

const PORT = process.env.PORT || 7787;
const url = `ws://127.0.0.1:${PORT}`;

async function main() {
  const ws = new WebSocket(url);
  const results = [];
  const ok = (name) => results.push(name);

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
    ws.on('open', () => { clearTimeout(t); resolve(); });
    ws.on('error', (e) => { clearTimeout(t); reject(e); });
  });

  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'hello') {
      if (Array.isArray(m.history)) ok('hello+history');
      ws.send(JSON.stringify({ type: 'msg', name: 'Scribe Tester', text: 'hello from the test' }));
    } else if (m.type === 'msg' && m.text === 'hello from the test') {
      ok('echo broadcast received');
      ws.close();
    } else if (m.type === 'system') {
      ok('system message (' + m.text.toLowerCase().split(' ')[0] + ')');
    }
  });

  await new Promise((resolve) => { ws.on('close', resolve); });
  console.log(results.map((r) => 'PASS ' + r).join('\n'));
  console.log(results.length >= 2 ? 'CHAT TEST PASSED' : 'CHAT TEST FAILED');
  process.exit(results.length >= 2 ? 0 : 1);
}

main().catch((e) => { console.log('FAIL ' + e.message); process.exit(1); });