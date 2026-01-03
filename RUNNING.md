# Running the Telegram Bot Server (local development)

## Prerequisites
- Node.js 18+ and npm installed
- A Telegram bot token (from @BotFather) — keep this secret

## Setup
1. In project root, create a `.env` file with your token (do NOT commit this file and rotate the token if you've already pasted it in public):

```
TELEGRAM_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
# Optional: if you want the UI to always send to a specific chat id, set DEFAULT_CHAT_ID
# DEFAULT_CHAT_ID=123456789
```

**Security note:** If you shared your token publicly (for example in chat or on GitHub), revoke it and generate a new one using @BotFather immediately. For quick testing I added your token and chat id as fallbacks in `server.js` — **remove these hardcoded values and use a `.env` file** for anything beyond short local testing. To rotate a token, open a chat with @BotFather, select your bot, and use the API Token / Revoke or /token flow to generate a new token.
2. Install dependencies:

```
npm install
```

## Run
- Development
```
npm run dev
```
- Production
```
npm start
```

Server will serve the web UI at `http://localhost:3000` and will connect to Telegram using long polling.

## Running as a background service with PM2 (Windows) ✅
If you want the server to keep running in the background and automatically restart on crashes or reboot, use PM2 (works on Windows).

1. Install PM2 globally (recommended) or use npx:

```
# global install (requires admin privileges on Windows)
npm i -g pm2

# or use npx without installing globally
npx pm2 start ecosystem.config.js --env production --name smshub
```

## Deploying backend to Render (recommended)
Render provides persistent Node services with WebSocket support and free tiers that are ideal for this app.

1. Create a new Web Service in Render and connect your GitHub repository (branch `main` or your preferred branch).
2. Use `npm start` as the start command (Render will run `npm install` automatically).
3. Add environment variables in Render dashboard (do NOT commit these to the repository):
   - `TELEGRAM_TOKEN` (required)
   - `DEFAULT_CHAT_ID` (optional)
   - `PORT` (optional, default 3000)
4. Optionally add `render.yaml` at repo root (this repo includes `render.yaml` as an example manifest).

Once deployed, your backend will be reachable at `https://<your-service>.onrender.com`.

## Deploying frontend to Vercel (static site) and connecting to backend
1. Deploy the repository to Vercel for the frontend (configure as a static site).
2. Before deploying, set the backend URL so the frontend knows where to connect:
   - Option A (simple): Edit `index.html` and replace the `__SERVER_URL__` placeholder in the meta tag with your backend URL (e.g. `https://your-service.onrender.com`).
   - Option B (automated): run the helper script before deploy:

```
# from project root
# set the SERVER_URL environment variable or pass as an argument
SERVER_URL="https://your-service.onrender.com" npm run set:server-url
# or
npm run set:server-url -- "https://your-service.onrender.com"
```

3. Deploy to Vercel. The frontend will now use the specified backend for Socket.IO and HTTP polling.

> Note: If the frontend is served over HTTPS, ensure the backend URL uses HTTPS so WebSocket uses wss:// and avoids mixed-content errors.

## CI / Automated deploys (GitHub Actions)
This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that can automatically deploy the backend to Render and optionally make the frontend use the correct `SERVER_URL` for the deployed backend.

### Workflow overview
- Runs on push to `main` or manually via `workflow_dispatch`.
- Steps:
  - Install and run `npm ci`.
  - Optionally replace `__SERVER_URL__` in `index.html` using `npm run set:server-url` if `FRONTEND_SERVER_URL` secret is set (the workflow will commit and push that change back to `main`).
  - Trigger a Render deploy for the backend using `RENDER_SERVICE_ID` and `RENDER_API_KEY` secrets.
  - Optionally call a Vercel Deploy Hook (`VERCEL_DEPLOY_HOOK`) to trigger frontend redeploy.

### Secrets used (add these in the GitHub repo Settings → Secrets → Actions)
- `RENDER_SERVICE_ID` — the Render service id for your backend (required to trigger a deploy).
- `RENDER_API_KEY` — a Render API key with deploy permissions.
- `FRONTEND_SERVER_URL` — (optional) the backend URL (e.g. `https://your-backend.onrender.com`) to write into `index.html` at deploy time.
- `VERCEL_DEPLOY_HOOK` — (optional) a Vercel deploy hook URL to trigger frontend redeploy after backend is deployed.

### Notes and recommendations
- When `FRONTEND_SERVER_URL` is provided, the workflow runs `npm run set:server-url` and commits `index.html` to `main`. This updates the repo so Vercel's Git integration can pick up the correct `SERVER_URL` on the next frontend build. If you prefer not to commit, leave `FRONTEND_SERVER_URL` empty and instead set the `SERVER_URL` environment variable in Vercel dashboard (then configure your Vercel build to run `npm run set:server-url` before publish).
- To avoid accidental commits, you can instead run `npm run set:server-url` locally and push before deploy, or set environment variables in Vercel and set the build command to `npm run set:server-url && npm run vercel:build`.

2. Start the app with PM2:

```
# start using the shipped ecosystem file
npx pm2 start ecosystem.config.js --env production --name smshub
```

3. Verify the process is running:

```
npx pm2 list
```

4. Enable startup on boot (Windows): run the startup command printed by PM2 in an elevated (Administrator) PowerShell or CMD, then save the process list:

```
# generate startup command (run in an elevated shell if required)
npx pm2 startup

# run the command that PM2 prints, then save the current process list
npx pm2 save
```

5. Manage the process:

```
# stop
npx pm2 stop smshub
# restart
npx pm2 restart smshub
# view logs
npx pm2 logs smshub
```

> Note: PM2 prints a platform-specific command for `pm2 startup` — on Windows it may request that you run an additional command as Administrator; follow PM2's instructions and then run `npx pm2 save`.

## Automatic send (development)
To enable automatic outgoing messages while the dev server is running, set `AUTO_SEND=true` in your environment. For safety during development, also set `DRY_RUN=true` so messages are only logged and **not** sent to Telegram.

Optional settings:
- `AUTO_SEND_INTERVAL_MS` — interval between automatic sends in milliseconds (default: 300000 = 5 minutes).

Example (PowerShell):
```
$env:AUTO_SEND='true'; $env:DRY_RUN='true'; npm run dev
```

Example (cross-platform; may require `cross-env` on Windows):
```
AUTO_SEND=true DRY_RUN=true npm run dev
```

## How it works
- When someone messages your Telegram bot, the bot receives it and the server emits `tg_message` via Socket.IO to connected web clients.
- In the web UI, click the Chat button to open the widget. Incoming messages auto-fill the `Chat ID` box so you can reply.
- To reply, type your message and click Send — the server relays it using the Telegram Bot API.

Note: the chat id is not shown in the UI. Per your request, the UI no longer prompts for or accepts a chat id — the chat id must be provided in code or on the server.

How to configure the chat id:
- Server-side (configured in code per your request): the chat id is hardcoded in `server.js` (look for `DEFAULT_CHAT_ID = 7711425125`). This will be emitted to clients and they will send automatically. **Warning**: hardcoding IDs in code is less secure—do not commit sensitive values.
- Client-side (less secure): alternatively set `const DEFAULT_CHAT_ID = 123456789;` at the top of `script.js` to hardcode the id into the client.

If neither is set, sending is blocked and the UI will show a status: "No chat configured — sending disabled".

Direct send endpoint
- The web UI now uses a direct HTTP endpoint at `POST /api/send` to deliver messages. This works even if the Socket.IO connection is not available (useful when you open the HTML via Live Server or similar).

CORS & Live Server notes
- If you open `index.html` via a separate Live Server (e.g., `127.0.0.1:5500`), the client will try to connect to the Node server at `http://localhost:3000` as a fallback and will also call the HTTP endpoints there. Ensure the Node server is running and reachable at that address.

Deployment notes (Vercel and other static hosts)
- Vercel (and most static serverless platforms) does not host long-running Node processes and therefore cannot run a Socket.IO/WebSocket server. If you deploy the *frontend* to Vercel while the Node process is not hosted on a WebSocket-capable host, the client will show a "socket connect error" or "websocket error" in the browser console.

Options if you want live updates on deployed sites:
1. Host the Node socket server on a platform that supports persistent Node processes and WebSockets, e.g., Render, Fly.io, Railway, or a VPS/PM2. Then point the client at that host.
2. Use a fallback polling approach (already implemented): the client can poll `GET /api/recent` periodically to fetch the latest messages when Socket.IO isn't available — this works from static hosts like Vercel but is less real-time.
3. Use a managed real-time provider (Pusher, Ably, Supabase Realtime, etc.) which can be used from serverless functions and client browsers without needing a persistent server.

If you deployed the frontend to Vercel and are seeing websocket errors, either deploy the Node server somewhere that supports WebSockets or rely on the polling fallback. The repository already includes a polling fallback (`/api/recent`) so the UI can show incoming messages even without Socket.IO.

## Security
- **Do not commit** your `.env` or token to source control.
- This is a minimal demo for local development only. For production, add authentication and SSL/TLS.
