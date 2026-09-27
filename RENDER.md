# FamilyChat — The Room the Pope Owns

An owned WebSocket family room. No rented walls, no billing platform.

- `server.mjs` — the room's brain. WebSocket server, in-memory history (last 200),
  names/text pages sanitized, ping/heartbeat, 500-connection cap, port `7787`.
- `chat.html` — the client, lives one folder up and talks to `chatServer` in
  `family-config.js`. If the server is asleep it shows the family cards (Telegram,
  Discussions, Journal, Repos) instead of breaking.
- `test-client.mjs`, `tunnel-test.mjs` — protocol roundtrip tests.
  Run with `node <file>.mjs [ws://url]` after `npm install`.

## Running it (quick tunnel — lives while your PC is on)

```
cd soul-economy/chat
npm install
node server.mjs                                # listens on 7787
cloudflared tunnel --url http://localhost:7787 --no-autoupdate
```

cloudflared prints a `https://xxxx.trycloudflare.com` URL. Copy it into
`family-config.js` as `chatServer: "wss://xxxx.trycloudflare.com"` (just the host,
no path) and the Rooms page is live. NOTE: the quick-tunnel hostname changes every
restart — update family-config.js each time you bring it back up.

## The sleeping house (permanent, free, needs no PC)

Render.com free tier runs `server.mjs` 24/7. Then `chatServer` becomes a stable
`wss://<render-app>.onrender.com` and you only set the config once.

1. Push this `chat/` folder to its own GitHub repo (e.g. `uncommonpope-png/family-chat`).
2. In Render: *New → Web Service → connect the repo → name it → build `npm install`,
   start `node server.mjs`*.
3. Copy the app URL into `family-config.js`: `chatServer: "wss://<name>.onrender.com"`.

No monthly bill for either option. When nobody can connect, `chat.html` degrades
to the always-awake community cards — the family channels never sleep.