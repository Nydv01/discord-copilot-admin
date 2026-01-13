// Discord Copilot Bot — FINAL PRODUCTION VERSION
// Safe • Stable • Railway-ready • Admin-controlled

require("dotenv").config();
const https = require("https");
const { Client, GatewayIntentBits, Events } = require("discord.js");

// --------------------
// ENV
// --------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BOT_API_URL = process.env.BOT_API_URL;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";

if (!DISCORD_TOKEN || !BOT_API_URL) {
  throw new Error("❌ DISCORD_TOKEN or BOT_API_URL missing");
}

// --------------------
// HTTPS AGENT
// --------------------
const httpsAgent = new https.Agent({ rejectUnauthorized: true });

// --------------------
// DISCORD CLIENT
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --------------------
// CACHE
// --------------------
const CACHE = {
  instructions: "You are a helpful Discord assistant.",
  allowedChannels: [],
  memory: null,
  lastFetch: 0,
};

const CACHE_TTL = 30_000;

// --------------------
// HEALTH
// --------------------
const HEALTH = {
  lastPing: null,
  lastMessage: null,
  errorCount: 0,
};

// --------------------
// UTIL
// --------------------
function logError(err) {
  HEALTH.errorCount++;
  console.error("❌", err.message || err);
}

// --------------------
// LOAD CONFIG (SAFE)
// --------------------
async function loadBotConfig() {
  const now = Date.now();

  if (CACHE.lastFetch && now - CACHE.lastFetch < CACHE_TTL) {
    return CACHE;
  }

  try {
    const res = await fetch(`${BOT_API_URL}?action=config`, {
      agent: httpsAgent,
    });

    if (!res.ok) throw new Error(`Config API ${res.status}`);

    const json = await res.json();

    CACHE.instructions =
      json.instructions || "You are a helpful Discord assistant.";
    CACHE.allowedChannels = json.allowedChannels || [];
    CACHE.memory = json.memory || null;
    CACHE.lastFetch = now;

    return CACHE;
  } catch (err) {
    logError(err);
    return CACHE; // fallback (never crash)
  }
}

// --------------------
// UPDATE MEMORY (SAFE)
// --------------------
async function updateMemory(summary, count) {
  try {
    await fetch(`${BOT_API_URL}?action=update-memory`, {
      agent: httpsAgent,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        message_count: count,
      }),
    });
  } catch (err) {
    logError(err);
  }
}

// --------------------
// HEALTH REPORT
// --------------------
async function reportHealth(isOnline) {
  try {
    await fetch(`${BOT_API_URL}?action=health`, {
      agent: httpsAgent,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_ping: HEALTH.lastPing,
        last_message: HEALTH.lastMessage,
        error_count: HEALTH.errorCount,
        is_online: isOnline,
      }),
    });
  } catch {
    // never crash
  }
}

// --------------------
// AI CALL (SAFE)
// --------------------
async function callAI(systemPrompt, userMessage, memory) {
  if (!AI_API_KEY) {
    return "⚠️ AI is not configured yet.";
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...(memory ? [{ role: "assistant", content: memory.summary }] : []),
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    agent: httpsAgent,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
    }),
  });

  const data = await res.json();
  return (
    data.choices?.[0]?.message?.content ||
    "Sorry, I couldn’t generate a response."
  );
}

// --------------------
// MESSAGE HANDLER (ONLY ONE)
// --------------------
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  HEALTH.lastMessage = new Date().toISOString();

  // Simple sanity test
  if (message.content.toLowerCase() === "hello") {
    await message.reply("👋 Hello! I am alive.");
    return;
  }

  const config = await loadBotConfig();

  const isMentioned = message.mentions.has(client.user);
  const isAllowed = config.allowedChannels.includes(message.channel.id);

  if (!isMentioned && !isAllowed) return;

  const content = message.content.replace(/<@!?\d+>/g, "").trim();
  if (!content) return;

  try {
    await message.channel.sendTyping();

    const reply = await callAI(
      config.instructions,
      content,
      config.memory
    );

    await message.reply(reply.slice(0, 2000));

    const newCount = (config.memory?.message_count || 0) + 1;
    const newSummary = `${config.memory?.summary || ""}
[${new Date().toISOString()}] ${content.slice(0, 150)}`.slice(-2000);

    await updateMemory(newSummary, newCount);
  } catch (err) {
    logError(err);
    await message.reply("⚠️ Something went wrong.");
  }
});

// --------------------
// READY
// --------------------
client.once(Events.ClientReady, (c) => {
  HEALTH.lastPing = new Date().toISOString();
  console.log(`✅ Bot online as ${c.user.tag}`);
});

// --------------------
// HEARTBEAT
// --------------------
setInterval(() => {
  HEALTH.lastPing = new Date().toISOString();
  reportHealth(true);
}, 60_000);

// --------------------
// SHUTDOWN
// --------------------
process.on("SIGINT", async () => {
  await reportHealth(false);
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await reportHealth(false);
  process.exit(0);
});

// --------------------
// LOGIN
// --------------------
client.login(DISCORD_TOKEN);
