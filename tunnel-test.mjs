import WebSocket from 'ws';

const url = process.argv[2] || 'wss://cooperative-base-aerial-minolta.trycloudflare.com';

const passed = [];
const ok = (n) => passed.push(n);

const ws = new WebSocket(url);
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('connect timeout')), 10000);
  ws.on('open', () => { clearTimeout(t); resolve(); });
  ws.on('error', reject);
});
ok('connected through public tunnel');

ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'hello') {
    ok('hello+history over tunnel');
    ws.send(JSON.stringify({ type: 'msg', name: 'Tunnel Test', text: 'hello from the public street' }));
  } else if (m.type === 'msg' && m.text === 'hello from the public street') {
    ok('echo roundtrip over tunnel');
    ws.close();
  }
});

await new Promise((resolve) => ws.on('close', resolve));
console.log(passed.map((p) => 'PASS ' + p).join('\n'));
console.log(passed.length >= 3 ? 'TUNNEL WS TEST PASSED' : 'TUNNEL WS TEST FAILED');
process.exit(passed.length >= 3 ? 0 : 1);