// Discord Copilot Bot — STABLE MINIMAL VERSION (DEBUG SAFE)

require("dotenv").config();
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const https = require("https");
const { Client, GatewayIntentBits, Events } = require("discord.js");

/* ===========================
   HTTPS AGENT
=========================== */
const httpsAgent = new https.Agent({ rejectUnauthorized: true });

/* ===========================
   ENV
=========================== */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BOT_API_URL = process.env.BOT_API_URL;

if (!DISCORD_TOKEN || !BOT_API_URL) {
  throw new Error("❌ Missing DISCORD_TOKEN or BOT_API_URL");
}

/* ===========================
   DISCORD CLIENT
=========================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* ===========================
   BOT CONFIG (SAFE)
=========================== */
async function loadBotConfig() {
  try {
    const res = await fetch(`${BOT_API_URL}?action=config`, {
      agent: httpsAgent,
      timeout: 5000,
    });

    if (!res.ok) throw new Error(`Config API ${res.status}`);

    const json = await res.json();

    return {
      instructions: json.instructions || "You are a helpful Discord bot.",
      allowedChannels: json.allowedChannels || [],
      memory: json.memory || null,
    };
  } catch (err) {
    console.error("⚠️ Config fetch failed, using fallback");
    return {
      instructions: "You are a helpful Discord bot.",
      allowedChannels: [],
      memory: null,
    };
  }
}

/* ===========================
   MESSAGE HANDLER (ONLY ONE)
=========================== */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log("MESSAGE:", message.content);

  // 🔥 HARD TEST — MUST ALWAYS WORK
  if (message.content.toLowerCase().includes("hello")) {
    await message.reply("👋 Hello! Bot is alive.");
    return;
  }

  const config = await loadBotConfig();

  const isMentioned = message.mentions.has(client.user);
  const isAllowedChannel = config.allowedChannels.includes(message.channelId);

  if (!isMentioned && !isAllowedChannel) return;

  const content = message.content.replace(/<@!?\d+>/g, "").trim();
  if (!content) return;

  await message.reply("🤖 I received your message and config works.");
});

/* ===========================
   READY
=========================== */
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot online as ${c.user.tag}`);
});

/* ===========================
   LOGIN
=========================== */
client.login(DISCORD_TOKEN);
