// Discord Copilot Bot — Production Grade (Cached + Health)
// Uses Bot Config API (NO direct Supabase access)

require("dotenv").config();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const https = require("https");
const { Client, GatewayIntentBits, Events } = require("discord.js");


/* ===========================
   HTTPS AGENT (TLS FIX)
=========================== */
const httpsAgent = new https.Agent({
  rejectUnauthorized: true,
});

/* ===========================
   ENV
=========================== */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AI_API_KEY = process.env.AI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const BOT_API_URL = process.env.BOT_API_URL;

if (!DISCORD_TOKEN || !BOT_API_URL) {
  throw new Error("❌ Missing critical bot environment variables");
}

if (!AI_API_KEY) {
  console.warn("⚠️ AI_API_KEY not found at startup, AI calls will fail");
}


/* ===========================
   CACHE
=========================== */
const CACHE = {
  instructions: "",
  allowedChannels: [],
  memory: null,
  lastFetch: 0,
};

const CACHE_TTL = 30 * 1000;

/* ===========================
   BOT HEALTH METRICS
=========================== */
const HEALTH = {
  lastPing: null,
  lastMessage: null,
  errorCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errorTrend: {},
  wsHeartbeat: null,
  isOnline: false,
};

/* ===========================
   DISCORD CLIENT
=========================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});


/* ===========================
   ERROR TRACKER
=========================== */
function registerError(err) {
  HEALTH.errorCount++;
  const bucket = new Date().toISOString().slice(0, 13);
  HEALTH.errorTrend[bucket] = (HEALTH.errorTrend[bucket] || 0) + 1;
  console.error("❌ Error:", err.message);
}

/* ===========================
   BOT CONFIG (CACHED)
=========================== */
async function loadBotConfig() {
  const now = Date.now();

  if (CACHE.lastFetch && now - CACHE.lastFetch < CACHE_TTL) {
    HEALTH.cacheHits++;
    return CACHE;
  }

  HEALTH.cacheMisses++;

  const res = await fetch(`${BOT_API_URL}?action=config`, {
    agent: httpsAgent,
  });

  if (!res.ok) throw new Error("Failed to fetch bot config");

  const json = await res.json();

  CACHE.instructions = json.instructions;
  CACHE.allowedChannels = json.allowedChannels;
  CACHE.memory = json.memory;
  CACHE.lastFetch = now;

  return CACHE;
}

/* ===========================
   MEMORY UPDATE
=========================== */
async function updateMemory(summary, messageCount) {
  try {
    await fetch(`${BOT_API_URL}?action=update-memory`, {
      agent: httpsAgent,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        message_count: messageCount,
      }),
    });

    CACHE.memory = { summary, message_count: messageCount };
  } catch (err) {
    registerError(err);
    console.error("⚠️ Failed to update memory:", err.message);
  }
}




/* ===========================
   HEALTH REPORTER
=========================== */
async function reportHealth(isOnline) {
    console.log("📡 Sending health ping", {
  lastPing: HEALTH.lastPing,
  lastMessage: HEALTH.lastMessage,
});

  try {
    await fetch(`${BOT_API_URL}?action=health`, {
      agent: httpsAgent,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_ping: HEALTH.lastPing,
        last_message: HEALTH.lastMessage,
        error_count: HEALTH.errorCount,
        cache_age_seconds: CACHE.lastFetch
          ? Math.floor((Date.now() - CACHE.lastFetch) / 1000)
          : null,
        cache_hits: HEALTH.cacheHits,
        cache_misses: HEALTH.cacheMisses,
        is_online: isOnline,
      }),
    });
  } catch (err) {
    console.error("⚠️ Health report failed:", err.message);
  }
}

/* ===========================
   AI PROVIDER
=========================== */
async function callAI(systemPrompt, userMessage, memory) {
  const messages = [
    { role: "system", content: systemPrompt },
    ...(memory ? [{ role: "assistant", content: `Context: ${memory}` }] : []),
    { role: "user", content: userMessage },
  ];

  if (AI_PROVIDER === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AI_API_KEY}`,
      {
        agent: httpsAgent,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: "user",
            parts: [{ text: m.content }],
          })),
        }),
      }
    );

    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t generate a response."
    );
  }

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

/* ===========================
   MESSAGE HANDLER
=========================== */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log("MESSAGE RECEIVED:", {
    content: message.content,
    channel: message.channelId,
    author: message.author.username
  });

  if (message.content.toLowerCase().includes("hello")) {
    await message.reply("👋 Hello! Bot is alive.");
    return;
  }

  try {
    let config;
    try {
      config = await loadBotConfig();
    } catch (err) {
      registerError(err);
      config = {
        instructions: "You are a helpful Discord bot.",
        allowedChannels: [],
        memory: null,
      };
    }

    const isMentioned = message.mentions.has(client.user);
    const isAllowedChannel = config.allowedChannels.includes(message.channel.id);

    if (!isMentioned && !isAllowedChannel) return;

    const content = message.content.replace(/<@!?\d+>/g, "").trim();
    if (!content) return;

    await message.channel.sendTyping();

    const reply = await callAI(
      config.instructions,
      content,
      config.memory?.summary
    );

    await message.reply(
      reply.length > 2000 ? reply.slice(0, 1990) + "…" : reply
    );

    HEALTH.lastMessage = new Date().toISOString();

    const newCount = (config.memory?.message_count || 0) + 1;
    const newSummary = `${config.memory?.summary || ""}
[${new Date().toISOString()}] User: ${content.slice(0, 120)}`.slice(-2000);

    await updateMemory(newSummary, newCount);
  } catch (err) {
    registerError(err);
    await message.reply("⚠️ Something went wrong. Try again.");
  }
});

/* ===========================
   READY
=========================== */
client.once(Events.ClientReady, (c) => {
  HEALTH.lastPing = new Date(Date.now()).toISOString();
  HEALTH.isOnline = true;
  console.log(`✅ Bot online as ${c.user.tag}`);
});

/* ===========================
   WS HEARTBEAT
=========================== */
client.ws.on("HEARTBEAT", () => {
  HEALTH.wsHeartbeat = new Date().toISOString();
});

/* ===========================
   PERIODIC HEALTH REPORT
=========================== */
setInterval(() => {
  HEALTH.lastPing = new Date(Date.now()).toISOString();
  reportHealth(true);
}, 60 * 1000);

/* ===========================
   SHUTDOWN HANDLING
=========================== */
process.on("SIGINT", async () => {
  await reportHealth(false);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await reportHealth(false);
  process.exit(0);
});

/* ===========================
   LOGIN
=========================== */
client.login(process.env.DISCORD_TOKEN);

