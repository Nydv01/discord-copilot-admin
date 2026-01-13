🤖 Discord Copilot Admin Dashboard

Production-Grade Admin Panel & Discord Bot Control System

A full-stack, admin-controlled system to configure, monitor, and operate an AI-powered Discord Copilot bot with real-time health monitoring, safe fallbacks, and manual recovery procedures.

📌 What This Project Solves

This system separates bot logic from bot configuration, allowing:

Zero redeploys for instruction changes

Safe admin-only controls

Real-time health & uptime visibility

Manual recovery if anything breaks

Clear debugging paths (no guessing)

🧠 High-Level Architecture
┌─────────────┐
│ Admin UI    │  (React + Vite)
│ Dashboard   │
└──────┬──────┘
       │ Supabase Client (Anon Key)
       ▼
┌─────────────┐
│ Supabase DB │
│ + Auth      │
└──────┬──────┘
       │ Service Role
       ▼
┌─────────────┐
│ Edge Func   │  bot-api
│ (Deno)      │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│ Discord Bot │  (Node.js)
│ discord.js  │
└─────────────┘

✨ Core Features
🔐 Admin Authentication

Email/password login using Supabase Auth

Admin-only access enforced at UI + DB level

Non-admins cannot access dashboard routes

🧠 System Instructions (Live)

Modify AI personality, tone, rules

Changes apply instantly to the bot

No restart or redeploy required

📢 Channel Allowlist

Bot only responds in approved Discord channels

Prevents spam & accidental replies

Channels stored in DB (safe + auditable)

🧾 Conversation Memory Control

Rolling summary memory

View current memory

Reset memory manually anytime

🤖 Discord Bot Health Monitoring

Last heartbeat timestamp

Last user message timestamp

Error count tracking

Cache freshness

Confidence score

Discord WebSocket status

🧱 Tech Stack
Frontend

React + Vite

TypeScript

Tailwind CSS

shadcn/ui

React Router

TanStack Query

Backend

Supabase (Auth, Database)

Supabase Edge Functions (Deno)

Bot

Node.js

discord.js

OpenAI / Gemini (provider-agnostic)

HTTPS polling + caching

📂 Project Structure
src/
├─ pages/
│  ├─ Login.tsx
│  ├─ Dashboard.tsx
│  └─ NotFound.tsx
├─ components/
│  └─ dashboard/
│     ├─ BotHealthPanel.tsx
│     ├─ SystemInstructionsPanel.tsx
│     ├─ ChannelAllowlistPanel.tsx
│     └─ MemoryControlPanel.tsx
├─ hooks/
│  ├─ useAuth.tsx
│  └─ use-toast.ts
├─ integrations/
│  └─ supabase/
│     └─ client.ts
├─ lib/
│  └─ utils.ts
└─ main.tsx

supabase/
└─ functions/
   └─ bot-api/
      └─ index.ts

⚙️ Environment Variables
Frontend (.env)
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_ANON_KEY>

Discord Bot (.env)
DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
AI_API_KEY=<OPENAI_OR_GEMINI_KEY>
AI_PROVIDER=openai
BOT_API_URL=https://<project-id>.supabase.co/functions/v1/bot-api

🖥️ Local Development (Admin Dashboard)
bun install
bun run dev


Runs at:

http://localhost:8080

🤖 Discord Bot – Local Run
cd discord-bot
node index.js


Expected output:

✅ Bot online as mybot#1234
📡 Sending health ping { lastPing: ..., lastMessage: ... }

🧪 Health System – How It REALLY Works
Backend (Edge Function)

Bot sends POST /bot-api?action=health

Data updates a single fixed row in bot_health

No inserts → only updates

Prevents duplicate key crashes

Frontend (Dashboard)

Status is computed using three signals:

Signal	Purpose
is_online	Bot explicitly says it's alive
last_ping	Timestamp freshness
Time delta	Detect stale bot
Status Logic (Authoritative)
if (health?.is_online === true && ping < 2min) → online
if (health?.is_online === true && ping < 5min) → degraded
else → offline

🚨 Why Bot Sometimes Shows Offline (IMPORTANT)
Common Causes

Bot running locally

Dashboard sees last ping from hours ago

Edge function not deployed

BOT_API_URL incorrect

Bot crashed silently

Health row missing

🛠️ Manual Recovery Procedures (CRITICAL)
1️⃣ Verify Edge Function is Live
supabase functions deploy bot-api

2️⃣ Check Bot Health Row Exists

Run in Supabase SQL Editor:

select * from bot_health;


If empty, insert once:

insert into bot_health (id)
values ('00000000-0000-0000-0000-000000000000');


⚠️ NEVER insert twice

3️⃣ Force Manual Health Update (Test)
curl -X POST "https://<project-id>.supabase.co/functions/v1/bot-api?action=health" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "last_ping": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "last_message": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "error_count": 0,
    "cache_age_seconds": 5,
    "is_online": true
  }'

🧯 If UI Crashes (Null Errors)
Root Rule

Any async data MUST be optional (?.)

Example fix:

health?.is_online === true


Never:

health.is_online

🧠 Admin Flow (End-to-End)

Admin logs in

Dashboard loads

Bot health fetched

Instructions edited

Bot auto-syncs config

Health pings every 60s

UI refreshes every 30s

🔐 Security Model
Layer	Protection
UI	Admin auth
DB	RLS
Bot	Service role
API	Edge Function
Tokens	Never exposed
🛣️ Roadmap (Planned)

Multi-admin roles

Bot uptime history

Incident timeline

Alerting (email / Discord)

RAG (PDF ingestion)

Usage analytics



🚀 PRODUCTION DEPLOYMENT GUIDE
Discord Copilot Bot + Admin Dashboard + Supabase + Railway

This guide covers everything:

Frontend deployment

Discord bot deployment on Railway

Environment variables

Health checks

Restart & recovery

Common failure cases

🧩 WHAT GETS DEPLOYED WHERE
Part	Platform
Admin Dashboard (React)	Vercel / Netlify (or Railway)
Supabase DB + Auth	Supabase
Supabase Edge Functions	Supabase
Discord Bot	Railway
1️⃣ DEPLOY SUPABASE (ONE-TIME SETUP)

You already mostly did this, but for completeness:

Install Supabase CLI
npm install -g supabase


Login:

supabase login


Link project:

supabase link --project-ref elhftjjsaueyxubmtqzs


Deploy Edge Function:

supabase functions deploy bot-api


✅ Done. Supabase backend is live.

2️⃣ DEPLOY ADMIN DASHBOARD (FRONTEND)
Option A: Vercel (Recommended)
Steps

Push repo to GitHub

Go to https://vercel.com

Import repository

Set environment variables:

VITE_SUPABASE_URL=https://elhftjjsaueyxubmtqzs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY


Build command:

bun install && bun run build


Output directory:

dist


Click Deploy

Option B: Netlify (Alternative)

Build command:

bun install && bun run build


Publish directory:

dist


✅ Admin dashboard is now live
Example:

https://discord-copilot-admin.vercel.app

3️⃣ PREPARE DISCORD BOT FOR RAILWAY
Required Files in discord-bot/
✅ package.json
{
  "name": "discord-copilot-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.15.3",
    "dotenv": "^17.2.3",
    "@supabase/supabase-js": "^2.48.1",
    "node-fetch": "^3.3.2"
  }
}

✅ index.js (Entry Point)

Make sure it contains:

client.login(process.env.DISCORD_TOKEN);


And health pings every 60s:

setInterval(sendHealthPing, 60_000);

4️⃣ DEPLOY DISCORD BOT ON RAILWAY (IMPORTANT)
Step-by-step
1. Go to Railway

https://railway.app

Login → New Project

2. Choose:
Deploy from GitHub repo


Select your repository.

3. Select Service Root

⚠️ IMPORTANT

If your bot is inside a folder:

discord-bot/


Set Root Directory:

discord-bot

4. Railway Environment Variables (CRITICAL)

Go to Variables tab and add:

DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
AI_API_KEY=YOUR_OPENAI_OR_GEMINI_KEY
AI_PROVIDER=openai

BOT_API_URL=https://elhftjjsaueyxubmtqzs.supabase.co/functions/v1/bot-api
SUPABASE_URL=https://elhftjjsaueyxubmtqzs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY


🚨 DO NOT use anon key here
Always service role key for the bot.

5. Start Command

Railway auto-detects:

npm start


Which runs:

node index.js

6. Deploy 🚀

Click Deploy

5️⃣ VERIFY BOT IS ACTUALLY RUNNING
Railway Logs

You should see:

✅ Bot online as mybot#7384
📡 Sending health ping

Supabase bot_health Table

Run:

select * from bot_health;


You should see:

last_ping updating every minute

is_online = true

Admin Dashboard

Bot Health panel should show:

🟢 Online
Discord WS Healthy
Heartbeat: < 60s ago

6️⃣ WHY BOT SHOWED OFFLINE EARLIER (POST-MORTEM)

This happened because:

Cause	Explanation
Local bot	Dashboard expects cloud bot
Stale timestamp	Last ping older than 5 min
Edge function not deployed	Health updates ignored
JWT error	Wrong Authorization header
Missing is_online	UI fallback marked offline

Now fixed because:

Railway runs bot 24/7

Health pings are continuous

UI trusts backend state

7️⃣ WHAT IF BOT GOES OFFLINE IN FUTURE?
🔁 Manual Recovery Checklist
1. Check Railway logs
Crash? Token revoked? API error?

2. Restart bot

Railway → Service → Restart

3. Force health ping
curl -X POST "https://<project-id>.supabase.co/functions/v1/bot-api?action=health" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"is_online": true}'

4. Check DB row exists
select * from bot_health;

8️⃣ RAILWAY BEST PRACTICES (IMPORTANT)

✅ Enable Auto-Restart
✅ Enable Crash Restart
❌ Do NOT scale to zero
❌ Do NOT expose service role key to frontend