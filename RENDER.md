# FamilyChat — The Room the Pope Owns

An owned WebSocket family room. No rented walls, no billing platform.

- `server.mjs` — the room's brain. WebSocket server, in-memory history (last 200),
  names/text sanitized, ping/heartbeat, 500-connection cap, port `7787`.
- `chat.html` — the client lives one folder up and talks to `chatServer` in
  `family-config.js`.
- `test-client.mjs`, `tunnel-test.mjs` — protocol roundtrip tests.
  Run with `node <file>.mjs [ws://url]` after `npm install`.

## This code is already deployed-ready

The folder has been pushed to the live repo as branch `family-chat`:

```
https://github.com/uncommonpope-png/BUYaSOUL-One/tree/family-chat
```

## Bring the room up right now (lives while your PC is on)

```
npm install
node server.mjs                                  # listens on 7787
cloudflared tunnel --url http://localhost:7787 --no-autoupdate
```

Copy the `https://xxxx.trycloudflare.com` URL cloudflared prints into
`family-config.js` as `chatServer: "wss://xxxx.trycloudflare.com"` (host only, no
path). Note: quick-tunnel hostnames change each restart — re-copy it each time.

## The Keeper — self-healing, no hands needed (runs on your PC)

`run-room.ps1` is the watchdog. Run it directly (or register it so it wakes
itself):

```
powershell -NoProfile -ExecutionPolicy Bypass -File run-room.ps1
schtasks /Create /TN "FamilyRoomKeeper" /SC MINUTE /MO 10 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\path\to\run-room.ps1" /F
```

What it does, on a loop: if port `7787` is down it starts the server; if
`cloudflared` is gone it starts the tunnel; if the tunnel hostname changed it
rewrites `chatServer` in `family-config.js` + `links.json`, saves the address to
`.room-url`, and commits only those two files to the repo. The room re-raises
itself after crashes and reboots — the site keeps pointing at a live room while
this PC is on. Check what it's doing with: `Get-Content $env:TEMP\opencode\cf-tun.log -Tail 5`.

## The sleeping house — permanent free hosting (Render, ~2 minutes)

1. Go to **dashboard.render.com** and sign up (free; you only need an email — this
   is the one step that is YOUR account).
2. **New → Web Service → "Build and deploy from a Git repository" → Connect**.
3. Pick the `BUYaSOUL-One` repo. **Branch: `family-chat`** (this branch's root IS
   the chat code).
4. Build command: `npm install` · Start command: `node server.mjs`.
5. **Create Web Service.** After deploy, copy the URL in the top-right (it looks
   like `https://family-chat-xxxx.onrender.com`) and paste it back to Profit.

Then set once, forever: `family-config.js` →
`chatServer: "wss://family-chat-xxxx.onrender.com"`. Old links die with the old
room; this one stays.

## Honest notes

- Render free tier sleeps the service after ~15 quiet minutes and wakes it on the
  next visitor (a few seconds). The browser chat reconnects automatically, and
  `chat.html` shows the always-awake family cards instead of breaking.
- Render is per-transaction-free: no monthly charge while it stays in the free box.