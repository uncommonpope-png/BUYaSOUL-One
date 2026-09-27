import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 7787;
const MAX_NAME = 32;
const MAX_TEXT = 500;
const HISTORY = 200;
const MAX_CONNECTIONS = 500;

const wss = new WebSocketServer({ port: PORT, maxPayload: 4096 });

const history = [];
let seq = 0;

function pushIntoHistory(entry) {
  history.push(entry);
  if (history.length > HISTORY) history.shift();
}

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  let alive = 0;
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
      alive++;
    }
  }
  return alive;
}

function clean(s, max) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

wss.on('listening', () => {
  console.log(`FamilyChat listening on ws://0.0.0.0:${PORT}`);
});

wss.on('connection', (socket, req) => {
  if (wss.clients.size > MAX_CONNECTIONS) {
    socket.close(1013, 'House full. Try again shortly.');
    return;
  }
  const remote = req.socket.remoteAddress || 'unknown';
  const id = ++seq;
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });

  socket.send(JSON.stringify({ type: 'hello', id, history: history.slice(-50) }));
  broadcast({ type: 'system', text: 'A soul has entered the room.' });

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || msg.type !== 'msg') return;
    const name = clean(msg.name, MAX_NAME) || 'Soul';
    const text = clean(msg.text, MAX_TEXT);
    if (!text) return;
    const entry = { type: 'msg', id: ++seq, name, text, t: Date.now() };
    pushIntoHistory(entry);
    broadcast(entry);
  });

  socket.on('close', () => {
    broadcast({ type: 'system', text: 'A soul has left the room.' });
  });

  socket.on('error', () => {});
});

const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});